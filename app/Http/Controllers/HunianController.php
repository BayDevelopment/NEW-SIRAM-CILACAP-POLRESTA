<?php

namespace App\Http\Controllers;

use App\Models\Hunian;
use App\Models\MaintenanceHunian;
use App\Models\Penghunian;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class HunianController extends Controller
{
    private const STATUS_MAINTENANCE_AKTIF = [
        'dilaporkan',
        'diproses',
    ];

    /**
     * Unit yang boleh diakses user.
     * - superadmin : null (semua unit)
     * - anggota    : unit_id miliknya (wajib terhubung ke unit)
     */
    private function scopedUnitId(Request $request): ?int
    {
        $user = $request->user();

        if ($user->role === 'superadmin') {
            return null;
        }

        abort_if(
            ! $user->unit_id,
            403,
            'Akun Anda belum terhubung ke satuan.'
        );

        return (int) $user->unit_id;
    }

    /**
     * Pastikan hunian berada pada unit yang boleh diakses user.
     */
    private function authorizeUnit(Request $request, Hunian $hunian): void
    {
        $unitId = $this->scopedUnitId($request);

        abort_if(
            $unitId !== null && (int) $hunian->unit_id !== $unitId,
            403,
            'Anda tidak memiliki akses ke hunian satuan lain.'
        );
    }

    /**
     * Aturan validasi unit_id.
     */
    private function unitRule(): array
    {
        return [
            'required',
            'integer',
            Rule::exists('units', 'id'),
        ];
    }

    /**
     * Menampilkan data hunian.
     */
    public function index(Request $request): Response
    {
        $unitId = $this->scopedUnitId($request);

        $hunian = Hunian::query()
            ->with('unit:id,nama_unit')
            ->when(
                $unitId,
                fn($query) => $query->where('unit_id', $unitId)
            )
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim($request->string('search')->toString());

                $query->where(function ($q) use ($search) {
                    $q->where('kode_hunian', 'like', "%{$search}%")
                        ->orWhere('nama_hunian', 'like', "%{$search}%")
                        ->orWhere('alamat', 'like', "%{$search}%")
                        ->orWhere('blok', 'like', "%{$search}%")
                        ->orWhere('nomor', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('jenis_hunian'), function ($query) use ($request) {
                $query->where(
                    'jenis_hunian',
                    $request->string('jenis_hunian')->toString()
                );
            })
            ->when($request->filled('kondisi'), function ($query) use ($request) {
                $query->where(
                    'kondisi',
                    $request->string('kondisi')->toString()
                );
            })
            ->when($request->filled('status_operasional'), function ($query) use ($request) {
                $query->where(
                    'status_operasional',
                    $request->string('status_operasional')->toString()
                );
            })
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        $units = Unit::query()
            ->select('id', 'nama_unit')
            ->where('is_active', true)
            ->when(
                $unitId,
                fn($query) => $query->whereKey($unitId)
            )
            ->orderBy('nama_unit')
            ->get();

        // Statistik keseluruhan (bukan hanya halaman aktif).
        $stats = Hunian::query()
            ->when(
                $unitId,
                fn($query) => $query->where('unit_id', $unitId)
            )
            ->selectRaw('status_operasional, COUNT(*) as total')
            ->groupBy('status_operasional')
            ->pluck('total', 'status_operasional');

        return Inertia::render('hunian/index', [
            'hunian' => $hunian,
            'units' => $units,
            'stats' => [
                'tersedia' => (int) ($stats['tersedia'] ?? 0),
                'dihuni' => (int) ($stats['dihuni'] ?? 0),
                'perbaikan' => (int) ($stats['perbaikan'] ?? 0),
            ],
            'filters' => [
                'search' => $request->input('search', ''),
                'jenis_hunian' => $request->input('jenis_hunian', ''),
                'kondisi' => $request->input('kondisi', ''),
                'status_operasional' => $request->input(
                    'status_operasional',
                    ''
                ),
            ],
        ]);
    }

    /**
     * Menyimpan hunian baru.
     */
    public function store(Request $request): RedirectResponse
    {
        $unitId = $this->scopedUnitId($request);

        $validated = $request->validate([
            'unit_id' => $this->unitRule(),

            'jenis_hunian' => [
                'required',
                Rule::in(['rumah_dinas', 'mes', 'apartemen']),
            ],

            'nama_hunian' => ['required', 'string', 'max:150'],
            'alamat' => ['required', 'string', 'max:255'],
            'blok' => ['nullable', 'string', 'max:50'],
            'nomor' => ['nullable', 'string', 'max:50'],
            'lantai' => ['nullable', 'integer', 'min:0'],
            'jumlah_kamar' => ['required', 'integer', 'min:1'],
            'luas_bangunan' => ['nullable', 'numeric', 'min:0'],
            'luas_tanah' => ['nullable', 'numeric', 'min:0'],

            'kondisi' => [
                'required',
                Rule::in(['baik', 'rusak_ringan', 'rusak_berat']),
            ],

            'status_operasional' => [
                'required',
                Rule::in([
                    'tersedia',
                    'dihuni',
                    'perbaikan',
                    'tidak_layak',
                ]),
            ],

            'keterangan' => ['nullable', 'string'],
        ]);

        // Anggota: unit selalu dipaksa mengikuti akun.
        if ($unitId !== null) {
            $validated['unit_id'] = $unitId;
        }

        // Jangan membuat hunian baru dengan status perbaikan
        // atau kondisi rusak tanpa laporan pemeliharaan.
        if (
            $validated['status_operasional'] === 'perbaikan'
            || in_array(
                $validated['kondisi'],
                ['rusak_ringan', 'rusak_berat'],
                true
            )
        ) {
            throw ValidationException::withMessages([
                'status_operasional' =>
                'Hunian baru tidak dapat dibuat dalam kondisi rusak atau sedang diperbaiki. Buat data hunian terlebih dahulu, lalu catat kerusakan melalui Pemeliharaan.',
            ]);
        }

        Hunian::create($validated);

        return to_route('hunian.index')
            ->with('success', 'Data hunian berhasil ditambahkan.');
    }

    /**
     * Memperbarui data hunian.
     */
    public function update(
        Request $request,
        Hunian $hunian
    ): RedirectResponse {
        $this->authorizeUnit($request, $hunian);

        $unitId = $this->scopedUnitId($request);

        $validated = $request->validate([
            'unit_id' => $this->unitRule(),

            'kode_hunian' => [
                'required',
                'string',
                'max:50',
                Rule::unique('hunian', 'kode_hunian')->ignore($hunian->id),
            ],

            'jenis_hunian' => [
                'required',
                Rule::in(['rumah_dinas', 'mes', 'apartemen']),
            ],

            'nama_hunian' => ['required', 'string', 'max:150'],
            'alamat' => ['required', 'string', 'max:255'],
            'blok' => ['nullable', 'string', 'max:50'],
            'nomor' => ['nullable', 'string', 'max:50'],
            'lantai' => ['nullable', 'integer', 'min:0'],
            'jumlah_kamar' => ['required', 'integer', 'min:1'],
            'luas_bangunan' => ['nullable', 'numeric', 'min:0'],
            'luas_tanah' => ['nullable', 'numeric', 'min:0'],

            'kondisi' => [
                'required',
                Rule::in(['baik', 'rusak_ringan', 'rusak_berat']),
            ],

            'status_operasional' => [
                'required',
                Rule::in([
                    'tersedia',
                    'dihuni',
                    'perbaikan',
                    'tidak_layak',
                ]),
            ],

            'keterangan' => ['nullable', 'string'],
        ]);

        // Anggota tidak boleh memindahkan hunian ke satuan lain.
        if ($unitId !== null) {
            $validated['unit_id'] = $unitId;
        }

        DB::transaction(function () use ($validated, $hunian) {
            $current = Hunian::query()
                ->whereKey($hunian->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Cari laporan pemeliharaan aktif (prioritas kerusakan berat).
            $maintenanceAktif = MaintenanceHunian::query()
                ->where('hunian_id', $current->id)
                ->whereIn('status', self::STATUS_MAINTENANCE_AKTIF)
                ->orderByRaw("
                    CASE
                        WHEN jenis_kerusakan = 'berat' THEN 0
                        ELSE 1
                    END
                ")
                ->orderBy('id')
                ->first();

            if ($maintenanceAktif) {
                $kondisiSeharusnya =
                    $maintenanceAktif->jenis_kerusakan === 'berat'
                    ? 'rusak_berat'
                    : 'rusak_ringan';

                // Sinkronkan data lama yang belum sesuai laporan aktif.
                if (
                    $current->status_operasional !== 'perbaikan'
                    || $current->kondisi !== $kondisiSeharusnya
                ) {
                    $current->kondisi = $kondisiSeharusnya;
                    $current->status_operasional = 'perbaikan';
                    $current->save();
                }

                // Tolak perubahan manual pada kondisi dan status.
                if (
                    $validated['kondisi'] !== $kondisiSeharusnya
                    || $validated['status_operasional'] !== 'perbaikan'
                ) {
                    throw ValidationException::withMessages([
                        'status_operasional' =>
                        'Kondisi dan status operasional terkunci selama pemeliharaan berstatus dilaporkan atau diproses. Selesaikan atau batalkan laporan pemeliharaan terlebih dahulu.',
                    ]);
                }
            } else {
                $kondisiBaru = $validated['kondisi'];
                $statusBaru = $validated['status_operasional'];

                // Kondisi rusak harus berstatus perbaikan.
                if (
                    in_array(
                        $kondisiBaru,
                        ['rusak_ringan', 'rusak_berat'],
                        true
                    )
                    && $statusBaru !== 'perbaikan'
                ) {
                    throw ValidationException::withMessages([
                        'status_operasional' =>
                        'Hunian yang masih rusak harus tetap berstatus perbaikan.',
                    ]);
                }

                // Perbaikan tanpa laporan aktif tidak valid jika kondisi baik.
                if (
                    $kondisiBaru === 'baik'
                    && $statusBaru === 'perbaikan'
                ) {
                    throw ValidationException::withMessages([
                        'status_operasional' =>
                        'Tidak ada laporan pemeliharaan aktif. Pilih status tersedia, dihuni, atau tidak layak.',
                    ]);
                }

                // Jangan tandai tersedia jika masih ada penghunian aktif.
                if (
                    $statusBaru === 'tersedia'
                    && Penghunian::query()
                    ->where('hunian_id', $current->id)
                    ->where('status', 'aktif')
                    ->exists()
                ) {
                    throw ValidationException::withMessages([
                        'status_operasional' =>
                        'Hunian masih memiliki penghunian aktif dan tidak dapat diubah menjadi tersedia.',
                    ]);
                }
            }

            $current->update($validated);
        });

        return to_route('hunian.index')
            ->with('success', 'Data hunian berhasil diperbarui.');
    }

    /**
     * Menghapus data hunian.
     */
    public function destroy(
        Request $request,
        Hunian $hunian
    ): RedirectResponse {
        $this->authorizeUnit($request, $hunian);

        $sedangPemeliharaan = MaintenanceHunian::query()
            ->where('hunian_id', $hunian->id)
            ->whereIn('status', self::STATUS_MAINTENANCE_AKTIF)
            ->exists();

        if ($sedangPemeliharaan) {
            throw ValidationException::withMessages([
                'hunian' =>
                'Hunian tidak dapat dihapus selama pemeliharaan masih aktif.',
            ]);
        }

        if (
            Penghunian::query()
            ->where('hunian_id', $hunian->id)
            ->where('status', 'aktif')
            ->exists()
        ) {
            throw ValidationException::withMessages([
                'hunian' =>
                'Hunian tidak dapat dihapus selama masih memiliki penghunian aktif.',
            ]);
        }

        $hunian->delete();

        return to_route('hunian.index')
            ->with('success', 'Data hunian berhasil dihapus.');
    }
}
