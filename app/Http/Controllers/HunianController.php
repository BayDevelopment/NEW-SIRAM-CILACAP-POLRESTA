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
     * Hanya Superadmin (Polresta) yang boleh mengelola hunian.
     * Anggota (Polsek) hanya boleh melihat.
     */
    private function ensureSuperadmin(Request $request): void
    {
        abort_if(
            $request->user()?->role !== 'superadmin',
            403,
            'Anda hanya memiliki akses melihat data hunian.'
        );
    }

    /**
     * Unit yang boleh dilihat user.
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
     * Aturan validasi store dan update.
     * kode_hunian sengaja tidak ada: dibuat otomatis oleh sistem.
     */
    private function baseRules(): array
    {
        return [
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id')],

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
        ];
    }

    /**
     * Menampilkan data hunian (Superadmin dan Anggota).
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

        // Statistik keseluruhan (tidak ikut filter dan pagination).
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
                'total' => (int) $stats->sum(),
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
            'can' => [
                'manage' => $request->user()->role === 'superadmin',
            ],
        ]);
    }

    /**
     * Menyimpan hunian baru (khusus Superadmin).
     * kode_hunian dibuat otomatis oleh event creating di model Hunian.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->ensureSuperadmin($request);

        $validated = $request->validate($this->baseRules());

        // Hunian baru hanya boleh tersedia atau tidak layak:
        // - perbaikan / kondisi rusak lewat laporan Pemeliharaan.
        // - dihuni lewat data Penghunian.
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

        if ($validated['status_operasional'] === 'dihuni') {
            throw ValidationException::withMessages([
                'status_operasional' =>
                'Hunian baru tidak dapat langsung berstatus dihuni. Buat data penghunian setelah hunian tersimpan.',
            ]);
        }

        Hunian::create($validated);

        return to_route('hunian.index')
            ->with('success', 'Data hunian berhasil ditambahkan.');
    }

    /**
     * Memperbarui data hunian (khusus Superadmin).
     */
    public function update(
        Request $request,
        Hunian $hunian
    ): RedirectResponse {
        $this->ensureSuperadmin($request);

        $validated = $request->validate($this->baseRules());

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
                    ->where('status', Penghunian::STATUS_AKTIF)
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
     * Menghapus data hunian (khusus Superadmin).
     */
    public function destroy(
        Request $request,
        Hunian $hunian
    ): RedirectResponse {
        $this->ensureSuperadmin($request);

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
            ->where('status', Penghunian::STATUS_AKTIF)
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
