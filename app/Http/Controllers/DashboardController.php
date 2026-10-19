<?php

namespace App\Http\Controllers;

use App\Models\Anggota;
use App\Models\Hunian;
use App\Models\Penghunian;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $isSuperadmin = $user->isSuperadmin();

        // Gunakan tanggal kalender, bukan waktu saat ini.
        $hariIni = Carbon::today();
        $tanggalHariIni = $hariIni->toDateString();
        $tanggalBatas30Hari = $hariIni->copy()->addDays(30)->toDateString();

        // Batasi data berdasarkan unit pengguna (Polsek hanya satuannya sendiri).
        $scopeUnit = function (Builder $query) use ($user, $isSuperadmin): Builder {
            if (! $isSuperadmin) {
                $query->where('unit_id', $user->unit_id);
            }

            return $query;
        };

        $hunianQuery = $scopeUnit(Hunian::query());
        $anggotaQuery = $scopeUnit(Anggota::query());
        $unitQuery = Unit::query();

        if (! $isSuperadmin) {
            $unitQuery->whereKey($user->unit_id);
        }

        // Hanya penghunian berstatus aktif.
        $penghunianQuery = Penghunian::query()
            ->where('status', Penghunian::STATUS_AKTIF);

        if (! $isSuperadmin) {
            $penghunianQuery->whereHas('hunian', function (Builder $query) use ($user) {
                $query->where('unit_id', $user->unit_id);
            });
        }

        // Daftar penghunian aktif terbaru.
        $penghunianAktif = (clone $penghunianQuery)
            ->with([
                'anggota:id,nama_lengkap,nrp,pangkat,jabatan,unit_id',
                'hunian:id,unit_id,kode_hunian,nama_hunian,jenis_hunian,alamat',
            ])
            ->latest('tanggal_mulai')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(function (Penghunian $penghunian) use ($hariIni) {
                $tanggalMulai = $penghunian->tanggal_mulai
                    ? Carbon::parse($penghunian->tanggal_mulai)->startOfDay()
                    : null;

                $tanggalSelesai = $penghunian->tanggal_selesai
                    ? Carbon::parse($penghunian->tanggal_selesai)->startOfDay()
                    : null;

                // Positif = belum berakhir; nol = hari ini; negatif = lewat.
                $sisaHari = $tanggalSelesai
                    ? (int) $hariIni->diffInDays($tanggalSelesai, false)
                    : null;

                return [
                    'id' => $penghunian->id,
                    'status' => $penghunian->status,
                    'tanggal_mulai' => $tanggalMulai?->toDateString(),
                    'tanggal_selesai' => $tanggalSelesai?->toDateString(),
                    'sisa_hari' => $sisaHari,

                    'anggota' => $penghunian->anggota ? [
                        'id' => $penghunian->anggota->id,
                        'nama_lengkap' => $penghunian->anggota->nama_lengkap,
                        'nrp' => $penghunian->anggota->nrp,
                        'pangkat' => $penghunian->anggota->pangkat,
                        'jabatan' => $penghunian->anggota->jabatan,
                    ] : null,

                    'hunian' => $penghunian->hunian ? [
                        'id' => $penghunian->hunian->id,
                        'kode_hunian' => $penghunian->hunian->kode_hunian,
                        'nama_hunian' => $penghunian->hunian->nama_hunian,
                        'jenis_hunian' => $penghunian->hunian->jenis_hunian,
                        'alamat' => $penghunian->hunian->alamat,
                    ] : null,
                ];
            });

        // Unit pengguna beserta induknya (Polresta) untuk label di header.
        $unitPengguna = $user->unit;
        $unitPengguna?->loadMissing('parent:id,kode_unit,nama_unit,tipe_unit');

        return Inertia::render('dashboard', [
            'userRole' => $user->role,
            'unitPengguna' => $user->unit_id,

            'unit' => $unitPengguna ? [
                'id' => $unitPengguna->id,
                'kode_unit' => $unitPengguna->kode_unit,
                'nama_unit' => $unitPengguna->nama_unit,
                'tipe_unit' => $unitPengguna->tipe_unit,
                'parent' => $unitPengguna->parent ? [
                    'id' => $unitPengguna->parent->id,
                    'kode_unit' => $unitPengguna->parent->kode_unit,
                    'nama_unit' => $unitPengguna->parent->nama_unit,
                    'tipe_unit' => $unitPengguna->parent->tipe_unit,
                ] : null,
            ] : null,

            'stats' => [
                'total_unit' => (clone $unitQuery)->count(),

                'total_hunian' => (clone $hunianQuery)->count(),
                'hunian_tersedia' => (clone $hunianQuery)
                    ->where('status_operasional', 'tersedia')->count(),
                'hunian_dihuni' => (clone $hunianQuery)
                    ->where('status_operasional', 'dihuni')->count(),
                'hunian_perbaikan' => (clone $hunianQuery)
                    ->where('status_operasional', 'perbaikan')->count(),

                'total_anggota_aktif' => (clone $anggotaQuery)
                    ->where('is_active', true)->count(),

                'total_penghunian_aktif' => (clone $penghunianQuery)->count(),

                // Berakhir hari ini sampai 30 hari ke depan.
                'penghunian_akan_berakhir' => (clone $penghunianQuery)
                    ->whereNotNull('tanggal_selesai')
                    ->whereDate('tanggal_selesai', '>=', $tanggalHariIni)
                    ->whereDate('tanggal_selesai', '<=', $tanggalBatas30Hari)
                    ->count(),

                // Sudah lewat tanggal selesai, tetapi status masih aktif.
                'penghunian_lewat_tanggal' => (clone $penghunianQuery)
                    ->whereNotNull('tanggal_selesai')
                    ->whereDate('tanggal_selesai', '<', $tanggalHariIni)
                    ->count(),
            ],

            'penghunianAktif' => $penghunianAktif,
        ]);
    }
}
