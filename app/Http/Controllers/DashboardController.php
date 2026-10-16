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

        $isSuperadmin = $user->role === 'superadmin';

        // Gunakan tanggal kalender, bukan waktu saat ini.
        $hariIni = Carbon::today();
        $batas30Hari = $hariIni->copy()->addDays(30);
        $tanggalHariIni = $hariIni->toDateString();
        $tanggalBatas30Hari = $batas30Hari->toDateString();

        // Batasi data berdasarkan unit pengguna.
        $scopeUnit = function (Builder $query) use ($user, $isSuperadmin) {
            if (! $isSuperadmin) {
                $query->where('unit_id', $user->unit_id);
            }

            return $query;
        };

        $hunianQuery = Hunian::query();
        $scopeUnit($hunianQuery);

        $anggotaQuery = Anggota::query();
        $scopeUnit($anggotaQuery);

        // Hanya penghunian berstatus aktif yang ditampilkan.
        $penghunianQuery = Penghunian::query()
            ->with([
                'anggota:id,nama_lengkap,nrp,pangkat,jabatan,unit_id',
                'hunian:id,unit_id,kode_hunian,nama_hunian,jenis_hunian,alamat',
            ])
            ->where('status', Penghunian::STATUS_AKTIF);

        if (! $isSuperadmin) {
            $penghunianQuery->whereHas('hunian', function (Builder $query) use ($user) {
                $query->where('unit_id', $user->unit_id);
            });
        }

        // Daftar penghunian aktif terbaru.
        $penghunianAktif = (clone $penghunianQuery)
            ->latest('tanggal_mulai')
            ->limit(8)
            ->get()
            ->map(function (Penghunian $penghunian) use ($hariIni) {
                // Normalisasi ke tanggal kalender agar tidak terpengaruh jam.
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

        // Statistik hunian.
        $totalHunian = (clone $hunianQuery)->count();

        $hunianTersedia = (clone $hunianQuery)
            ->where('status_operasional', 'tersedia')
            ->count();

        $hunianDihuni = (clone $hunianQuery)
            ->where('status_operasional', 'dihuni')
            ->count();

        $hunianPerbaikan = (clone $hunianQuery)
            ->where('status_operasional', 'perbaikan')
            ->count();

        // Statistik penghunian dan anggota.
        $totalPenghunianAktif = (clone $penghunianQuery)->count();

        $totalAnggotaAktif = (clone $anggotaQuery)
            ->where('is_active', true)
            ->count();

        // Berakhir hari ini sampai dengan 30 hari ke depan.
        $penghunianAkanBerakhir = (clone $penghunianQuery)
            ->whereNotNull('tanggal_selesai')
            ->whereDate('tanggal_selesai', '>=', $tanggalHariIni)
            ->whereDate('tanggal_selesai', '<=', $tanggalBatas30Hari)
            ->count();

        // Tanggal berakhir sudah lewat, tetapi status masih aktif.
        $penghunianLewatTanggal = (clone $penghunianQuery)
            ->whereNotNull('tanggal_selesai')
            ->whereDate('tanggal_selesai', '<', $tanggalHariIni)
            ->count();

        // Statistik unit.
        $unitQuery = Unit::query();

        if (! $isSuperadmin) {
            $unitQuery->whereKey($user->unit_id);
        }

        return Inertia::render('dashboard', [
            'userRole' => $user->role,
            'unitPengguna' => $user->unit_id,

            'unit' => $user->unit ? [
                'id' => $user->unit->id,
                'kode_unit' => $user->unit->kode_unit,
                'nama_unit' => $user->unit->nama_unit,
                'tipe_unit' => $user->unit->tipe_unit,
            ] : null,

            'stats' => [
                'total_unit' => $isSuperadmin
                    ? Unit::count()
                    : (clone $unitQuery)->count(),

                'total_hunian' => $totalHunian,
                'hunian_tersedia' => $hunianTersedia,
                'hunian_dihuni' => $hunianDihuni,
                'hunian_perbaikan' => $hunianPerbaikan,
                'total_anggota_aktif' => $totalAnggotaAktif,
                'total_penghunian_aktif' => $totalPenghunianAktif,
                'penghunian_akan_berakhir' => $penghunianAkanBerakhir,
                'penghunian_lewat_tanggal' => $penghunianLewatTanggal,
            ],

            'penghunianAktif' => $penghunianAktif,
        ]);
    }
}
