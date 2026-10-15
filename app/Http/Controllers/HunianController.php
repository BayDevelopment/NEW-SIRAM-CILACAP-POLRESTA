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
     * Menampilkan data hunian.
     */
    public function index(Request $request): Response
    {
        $hunian = Hunian::query()
            ->with('unit:id,nama_unit')
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
            ->orderBy('nama_unit')
            ->get();

        return Inertia::render('hunian/index', [
            'hunian' => $hunian,
            'units' => $units,
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
        $validated = $request->validate([
            'unit_id' => [
                'required',
                'integer',
                Rule::exists('units', 'id'),
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
        $validated = $request->validate([
            'unit_id' => [
                'required',
                'integer',
                Rule::exists('units', 'id'),
            ],

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

        DB::transaction(function () use ($validated, $hunian) {
            $current = Hunian::query()
                ->whereKey($hunian->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Cari semua laporan pemeliharaan yang masih aktif.
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

                // Pastikan data lama yang mungkin belum sinkron
                // mengikuti laporan pemeliharaan aktif.
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
                // Tanpa laporan aktif, kondisi rusak tetap tidak boleh
                // ditandai tersedia atau dihuni.
                $kondisiBaru = $validated['kondisi'];
                $statusBaru = $validated['status_operasional'];

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

                // Status perbaikan tidak boleh dipilih jika kondisi
                // sudah baik dan tidak ada laporan aktif.
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
    public function destroy(Hunian $hunian): RedirectResponse
    {
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
