<?php

namespace App\Http\Controllers;

use App\Models\Anggota;
use App\Models\Hunian;
use App\Models\Penghunian;
use App\Models\RiwayatPindahHunian;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RiwayatPindahHunianController extends Controller
{
    /**
     * Nilai status_operasional hunian yang TIDAK boleh ditempati.
     * Sesuaikan dengan nilai yang dipakai di aplikasi Anda.
     */
    private const HUNIAN_TIDAK_TERSEDIA = ['perbaikan'];

    private const OPTION_LIMIT = 20;

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $dari = $request->query('dari');
        $sampai = $request->query('sampai');

        $riwayat = RiwayatPindahHunian::query()
            ->with([
                'anggota:id,nama_lengkap,nrp',
                'hunianLama:id,unit_id,kode_hunian,nama_hunian,status_operasional',
                'hunianLama.unit:id,nama_unit',
                'hunianBaru:id,unit_id,kode_hunian,nama_hunian,status_operasional',
                'hunianBaru.unit:id,nama_unit',
                'pemroses:id,name',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $like = "%{$search}%";

                $query->where(function ($where) use ($like) {
                    $where
                        ->whereHas('anggota', fn($q) => $q
                            ->where('nama_lengkap', 'like', $like)
                            ->orWhere('nrp', 'like', $like))
                        ->orWhereHas('hunianLama', fn($q) => $q
                            ->where('kode_hunian', 'like', $like)
                            ->orWhere('nama_hunian', 'like', $like))
                        ->orWhereHas('hunianBaru', fn($q) => $q
                            ->where('kode_hunian', 'like', $like)
                            ->orWhere('nama_hunian', 'like', $like));
                });
            })
            ->when($dari, fn($query) => $query->whereDate('tanggal_pindah', '>=', $dari))
            ->when($sampai, fn($query) => $query->whereDate('tanggal_pindah', '<=', $sampai))
            ->orderByDesc('tanggal_pindah')
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString();

        $now = Carbon::now();

        return Inertia::render('riwayat-pindah/index', [
            'riwayat' => $riwayat,
            'stats' => [
                'total' => RiwayatPindahHunian::count(),
                'bulan_ini' => RiwayatPindahHunian::whereBetween('tanggal_pindah', [
                    $now->copy()->startOfMonth()->toDateString(),
                    $now->copy()->endOfMonth()->toDateString(),
                ])->count(),
                'tahun_ini' => RiwayatPindahHunian::whereYear('tanggal_pindah', $now->year)->count(),
            ],
            'penghunianOptions' => $this->penghunianAktifQuery('')->get(),
            'hunianOptions' => $this->hunianTersediaQuery('')->get(),
            'filters' => [
                'search' => $search,
                'dari' => $dari ?? '',
                'sampai' => $sampai ?? '',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'penghunian_id' => ['required', 'integer'],
            'hunian_baru_id' => ['required', 'integer', 'exists:hunian,id'],
            'tanggal_pindah' => ['required', 'date'],
            'alasan_pindah' => ['nullable', 'string', 'max:2000'],
            'keterangan' => ['nullable', 'string', 'max:2000'],
        ], [], [
            'penghunian_id' => 'anggota',
            'hunian_baru_id' => 'hunian baru',
            'tanggal_pindah' => 'tanggal pindah',
            'alasan_pindah' => 'alasan pindah',
        ]);

        DB::transaction(function () use ($data, $request) {
            $penghunian = Penghunian::query()
                ->whereKey($data['penghunian_id'])
                ->where('status', 'aktif')
                ->lockForUpdate()
                ->first();

            if (! $penghunian) {
                throw ValidationException::withMessages([
                    'penghunian_id' => 'Penghunian aktif untuk anggota ini tidak ditemukan.',
                ]);
            }

            $hunianBaruId = (int) $data['hunian_baru_id'];
            $hunianLamaId = (int) $penghunian->hunian_id;

            if ($hunianBaruId === $hunianLamaId) {
                throw ValidationException::withMessages([
                    'hunian_baru_id' => 'Hunian baru harus berbeda dari hunian saat ini.',
                ]);
            }

            $hunianBaru = Hunian::query()
                ->whereKey($hunianBaruId)
                ->lockForUpdate()
                ->first();

            if (! $hunianBaru || in_array($hunianBaru->status_operasional, self::HUNIAN_TIDAK_TERSEDIA, true)) {
                throw ValidationException::withMessages([
                    'hunian_baru_id' => 'Hunian baru sedang tidak dapat ditempati.',
                ]);
            }

            $sudahDihuni = Penghunian::query()
                ->where('hunian_id', $hunianBaruId)
                ->where('status', 'aktif')
                ->lockForUpdate()
                ->exists();

            if ($sudahDihuni) {
                throw ValidationException::withMessages([
                    'hunian_baru_id' => 'Hunian baru sudah dihuni anggota lain.',
                ]);
            }

            $tanggalPindah = Carbon::parse($data['tanggal_pindah'])->startOfDay();
            $tanggalMulai = Carbon::parse($penghunian->tanggal_mulai)->startOfDay();

            if ($tanggalPindah->lt($tanggalMulai)) {
                throw ValidationException::withMessages([
                    'tanggal_pindah' => 'Tanggal pindah tidak boleh sebelum tanggal mulai penghunian ('
                        . $tanggalMulai->format('d/m/Y') . ').',
                ]);
            }

            RiwayatPindahHunian::create([
                'anggota_id' => $penghunian->anggota_id,
                'penghunian_id' => $penghunian->id,
                'hunian_lama_id' => $hunianLamaId,
                'hunian_baru_id' => $hunianBaruId,
                'tanggal_pindah' => $tanggalPindah->toDateString(),
                'alasan_pindah' => $data['alasan_pindah'] ?? null,
                'keterangan' => $data['keterangan'] ?? null,
                'diproses_oleh' => $request->user()?->id,
            ]);

            // Pindahkan penghunian aktif ke hunian baru.
            $penghunian->hunian_id = $hunianBaruId;
            $penghunian->save();

            // Jika aplikasi Anda mengubah status_operasional hunian saat
            // dihuni/dikosongkan, lakukan juga di sini untuk hunian lama & baru.
        });

        return redirect()
            ->route('riwayat-pindah.index')
            ->with('success', 'Perpindahan hunian berhasil dicatat.');
    }

    /** Pencarian anggota yang sedang menghuni (untuk dropdown). */
    public function penghunianOptions(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        return response()->json($this->penghunianAktifQuery($q)->get());
    }

    /** Pencarian hunian yang tersedia (untuk dropdown). */
    public function hunianOptions(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        return response()->json($this->hunianTersediaQuery($q)->get());
    }

    private function penghunianAktifQuery(string $q)
    {
        return Penghunian::query()
            ->select(['id', 'anggota_id', 'hunian_id', 'tanggal_mulai', 'tanggal_selesai'])
            ->with([
                'anggota:id,nama_lengkap,nrp',
                'hunian:id,unit_id,kode_hunian,nama_hunian,status_operasional',
                'hunian.unit:id,nama_unit',
            ])
            ->where('status', 'aktif')
            ->when($q !== '', function ($query) use ($q) {
                $like = "%{$q}%";

                $query->where(function ($where) use ($like) {
                    $where
                        ->whereHas('anggota', fn($a) => $a
                            ->where('nama_lengkap', 'like', $like)
                            ->orWhere('nrp', 'like', $like))
                        ->orWhereHas('hunian', fn($h) => $h
                            ->where('kode_hunian', 'like', $like)
                            ->orWhere('nama_hunian', 'like', $like));
                });
            })
            ->orderBy(
                Anggota::query()
                    ->select('nama_lengkap')
                    ->whereColumn('anggota.id', 'penghunian.anggota_id')
                    ->limit(1)
            )
            ->limit(self::OPTION_LIMIT);
    }

    private function hunianTersediaQuery(string $q)
    {
        return Hunian::query()
            ->select(['id', 'unit_id', 'kode_hunian', 'nama_hunian', 'status_operasional'])
            ->with('unit:id,nama_unit')
            ->whereNotIn('status_operasional', self::HUNIAN_TIDAK_TERSEDIA)
            ->whereNotIn(
                'id',
                Penghunian::query()->where('status', 'aktif')->select('hunian_id')
            )
            ->when($q !== '', function ($query) use ($q) {
                $like = "%{$q}%";

                $query->where(function ($where) use ($like) {
                    $where->where('kode_hunian', 'like', $like)
                        ->orWhere('nama_hunian', 'like', $like);
                });
            })
            ->orderBy('kode_hunian')
            ->limit(self::OPTION_LIMIT);
    }
}
