<?php

namespace App\Http\Controllers;

use App\Models\Hunian;
use App\Models\MaintenanceHunian;
use App\Models\Penghunian;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceHunianController extends Controller
{
    private const STATUS_AKTIF = [
        'dilaporkan',
        'diproses',
    ];

    /**
     * Menampilkan daftar pemeliharaan hunian.
     */
    public function index(Request $request): Response
    {
        $query = MaintenanceHunian::query()
            ->with([
                'hunian:id,kode_hunian',
                'pelapor:id,name',
            ]);

        if ($request->filled('search')) {
            $search = trim($request->string('search')->toString());

            $query->where(function ($q) use ($search) {
                $q->where('judul', 'like', "%{$search}%")
                    ->orWhere('deskripsi', 'like', "%{$search}%")
                    ->orWhereHas('hunian', function ($hunian) use ($search) {
                        $hunian->where(
                            'kode_hunian',
                            'like',
                            "%{$search}%"
                        );
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('jenis_kerusakan')) {
            $query->where(
                'jenis_kerusakan',
                $request->input('jenis_kerusakan')
            );
        }

        if ($request->filled('hunian_id')) {
            $query->where(
                'hunian_id',
                $request->integer('hunian_id')
            );
        }

        $pemeliharaan = $query
            ->latest('tanggal_laporan')
            ->latest('id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn(MaintenanceHunian $item) => [
                'id' => $item->id,
                'hunian_id' => $item->hunian_id,
                'hunian' => $item->hunian ? [
                    'id' => $item->hunian->id,
                    'kode_hunian' => $item->hunian->kode_hunian,
                ] : null,
                'jenis_kerusakan' => $item->jenis_kerusakan,
                'judul' => $item->judul,
                'deskripsi' => $item->deskripsi,
                'tanggal_laporan' => $item->tanggal_laporan?->format('Y-m-d'),
                'tanggal_mulai' => $item->tanggal_mulai?->format('Y-m-d'),
                'tanggal_selesai' => $item->tanggal_selesai?->format('Y-m-d'),
                'estimasi_biaya' => $item->estimasi_biaya,
                'realisasi_biaya' => $item->realisasi_biaya,
                'status' => $item->status,
                'keterangan' => $item->keterangan,
                'pelapor' => $item->pelapor?->name,
                'created_at' => $item->created_at?->toISOString(),
            ]);

        return Inertia::render('pemeliharaan/index', [
            'pemeliharaan' => $pemeliharaan,

            'stats' => [
                'total' => MaintenanceHunian::count(),
                'dilaporkan' => MaintenanceHunian::where(
                    'status',
                    'dilaporkan'
                )->count(),
                'diproses' => MaintenanceHunian::where(
                    'status',
                    'diproses'
                )->count(),
                'selesai' => MaintenanceHunian::where(
                    'status',
                    'selesai'
                )->count(),
                'dibatalkan' => MaintenanceHunian::where(
                    'status',
                    'dibatalkan'
                )->count(),
            ],

            'hunianOptions' => Hunian::query()
                ->select('id', 'kode_hunian')
                ->orderBy('kode_hunian')
                ->get()
                ->map(fn(Hunian $hunian) => [
                    'id' => $hunian->id,
                    'kode_hunian' => $hunian->kode_hunian,
                ]),

            'filters' => $request->only([
                'search',
                'status',
                'jenis_kerusakan',
                'hunian_id',
            ]),
        ]);
    }

    /**
     * Membuat laporan pemeliharaan baru.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateData($request);

        // Setiap laporan baru wajib dimulai dari status dilaporkan.
        $validated['status'] = 'dilaporkan';
        $validated['dilaporkan_oleh'] = $request->user()?->id;

        DB::transaction(function () use ($validated) {
            $hunian = Hunian::query()
                ->whereKey($validated['hunian_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($hunian->status_operasional === 'tidak_layak') {
                throw ValidationException::withMessages([
                    'hunian_id' => 'Hunian tidak layak dan tidak dapat dipilih untuk pemeliharaan biasa.',
                ]);
            }

            MaintenanceHunian::create($validated);

            $this->syncHunianStatus((int) $hunian->id);
        });

        return to_route('pemeliharaan.index')
            ->with('success', 'Laporan pemeliharaan berhasil ditambahkan.');
    }

    /**
     * Memperbarui laporan pemeliharaan.
     */
    public function update(
        Request $request,
        MaintenanceHunian $pemeliharaan
    ): RedirectResponse {
        $validated = $this->validateData($request);

        DB::transaction(function () use (
            $validated,
            $pemeliharaan
        ) {
            $current = MaintenanceHunian::query()
                ->whereKey($pemeliharaan->id)
                ->lockForUpdate()
                ->firstOrFail();

            $oldHunianId = (int) $current->hunian_id;
            $newHunianId = (int) $validated['hunian_id'];

            // Kunci hunian berdasarkan urutan ID untuk mengurangi
            // kemungkinan deadlock saat laporan dipindahkan.
            $hunianIds = array_values(array_unique([
                $oldHunianId,
                $newHunianId,
            ]));

            sort($hunianIds);

            $hunians = Hunian::query()
                ->whereIn('id', $hunianIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if (! $hunians->has($newHunianId)) {
                throw ValidationException::withMessages([
                    'hunian_id' => 'Hunian tidak ditemukan.',
                ]);
            }

            $hunianTujuan = $hunians->get($newHunianId);

            if (
                $newHunianId !== $oldHunianId
                && $hunianTujuan->status_operasional === 'tidak_layak'
            ) {
                throw ValidationException::withMessages([
                    'hunian_id' => 'Hunian tidak layak dan tidak dapat dipilih untuk pemeliharaan biasa.',
                ]);
            }

            $current->update($validated);

            // Sinkronkan hunian lama dan baru jika laporan dipindahkan.
            foreach ($hunianIds as $hunianId) {
                $this->syncHunianStatus($hunianId);
            }
        });

        return to_route('pemeliharaan.index')
            ->with('success', 'Data pemeliharaan berhasil diperbarui.');
    }

    /**
     * Menghapus laporan pemeliharaan.
     *
     * Penghapusan laporan tidak berarti kerusakan sudah diperbaiki.
     */
    public function destroy(
        MaintenanceHunian $pemeliharaan
    ): RedirectResponse {
        DB::transaction(function () use ($pemeliharaan) {
            $current = MaintenanceHunian::query()
                ->whereKey($pemeliharaan->id)
                ->lockForUpdate()
                ->firstOrFail();

            $hunianId = (int) $current->hunian_id;

            Hunian::query()
                ->whereKey($hunianId)
                ->lockForUpdate()
                ->first();

            $current->delete();

            $this->syncHunianStatus($hunianId);
        });

        return to_route('pemeliharaan.index')
            ->with('success', 'Data pemeliharaan berhasil dihapus.');
    }

    /**
     * Sinkronisasi kondisi dan status operasional hunian.
     *
     * Kondisi hunian yang dikelola pemeliharaan hanya:
     * - rusak_ringan
     * - rusak_berat
     *
     * Kondisi rusak tidak otomatis diubah menjadi baik ketika
     * laporan selesai, dibatalkan, atau dihapus.
     */
    private function syncHunianStatus(int $hunianId): void
    {
        $hunian = Hunian::query()
            ->lockForUpdate()
            ->find($hunianId);

        if (! $hunian) {
            return;
        }

        // Hunian yang tidak layak tidak boleh diaktifkan otomatis.
        if ($hunian->status_operasional === 'tidak_layak') {
            return;
        }

        // Cari laporan aktif. Kerusakan berat diprioritaskan.
        $maintenanceAktif = MaintenanceHunian::query()
            ->where('hunian_id', $hunianId)
            ->whereIn('status', self::STATUS_AKTIF)
            ->orderByRaw("
                CASE
                    WHEN jenis_kerusakan = 'berat' THEN 0
                    ELSE 1
                END
            ")
            ->orderBy('id')
            ->first();

        if ($maintenanceAktif) {
            $hunian->kondisi = $maintenanceAktif->jenis_kerusakan === 'berat'
                ? 'rusak_berat'
                : 'rusak_ringan';

            $hunian->status_operasional = 'perbaikan';
            $hunian->save();

            return;
        }

        // Jika tidak ada laporan aktif tetapi hunian masih rusak,
        // jangan otomatis menjadikannya tersedia atau dihuni.
        if (in_array(
            $hunian->kondisi,
            ['rusak_ringan', 'rusak_berat'],
            true
        )) {
            $hunian->status_operasional = 'perbaikan';
            $hunian->save();

            return;
        }

        // Untuk hunian yang tidak tercatat rusak, sinkronkan
        // status berdasarkan penghunian aktif.
        $sedangDihuni = Penghunian::query()
            ->where('hunian_id', $hunianId)
            ->where('status', 'aktif')
            ->exists();

        $hunian->status_operasional = $sedangDihuni
            ? 'dihuni'
            : 'tersedia';

        $hunian->save();
    }

    /**
     * Validasi data laporan pemeliharaan.
     */
    private function validateData(Request $request): array
    {
        return $request->validate([
            'hunian_id' => [
                'required',
                'integer',
                'exists:hunian,id',
            ],

            'jenis_kerusakan' => [
                'required',
                'string',
                Rule::in(['ringan', 'berat']),
            ],

            'judul' => [
                'required',
                'string',
                'max:200',
            ],

            'deskripsi' => [
                'required',
                'string',
            ],

            'tanggal_laporan' => [
                'required',
                'date',
            ],

            'tanggal_mulai' => [
                'nullable',
                'date',
                'after_or_equal:tanggal_laporan',
            ],

            'tanggal_selesai' => [
                'nullable',
                'date',
                'after_or_equal:tanggal_mulai',
                'required_if:status,selesai',
            ],

            'estimasi_biaya' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'realisasi_biaya' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'status' => [
                'required',
                Rule::in([
                    'dilaporkan',
                    'diproses',
                    'selesai',
                    'dibatalkan',
                ]),
            ],

            'keterangan' => [
                'nullable',
                'string',
            ],
        ]);
    }
}
