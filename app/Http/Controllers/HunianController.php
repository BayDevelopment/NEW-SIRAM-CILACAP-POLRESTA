<?php

namespace App\Http\Controllers;

use App\Models\Hunian;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class HunianController extends Controller
{
    /**
     * Menampilkan data hunian.
     */
    public function index(Request $request): Response
    {
        $hunian = Hunian::query()
            ->with('unit:id,nama_unit')

            // Pencarian
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim(
                    $request->string('search')->toString()
                );

                $query->where(function ($q) use ($search) {
                    $q->where('kode_hunian', 'like', "%{$search}%")
                        ->orWhere('nama_hunian', 'like', "%{$search}%")
                        ->orWhere('alamat', 'like', "%{$search}%")
                        ->orWhere('blok', 'like', "%{$search}%")
                        ->orWhere('nomor', 'like', "%{$search}%");
                });
            })

            // Filter jenis hunian
            ->when($request->filled('jenis_hunian'), function ($query) use ($request) {
                $query->where(
                    'jenis_hunian',
                    $request->string('jenis_hunian')->toString()
                );
            })

            // Filter kondisi
            ->when($request->filled('kondisi'), function ($query) use ($request) {
                $query->where(
                    'kondisi',
                    $request->string('kondisi')->toString()
                );
            })

            // Filter status operasional
            ->when($request->filled('status_operasional'), function ($query) use ($request) {
                $query->where(
                    'status_operasional',
                    $request->string('status_operasional')->toString()
                );
            })

            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        // Unit aktif untuk pilihan pada form
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
                'exists:units,id',
            ],

            'jenis_hunian' => [
                'required',
                Rule::in([
                    'rumah_dinas',
                    'mes',
                    'apartemen',
                ]),
            ],

            'nama_hunian' => [
                'required',
                'string',
                'max:150',
            ],

            'alamat' => [
                'required',
                'string',
                'max:255',
            ],

            'blok' => [
                'nullable',
                'string',
                'max:50',
            ],

            'nomor' => [
                'nullable',
                'string',
                'max:50',
            ],

            'lantai' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'jumlah_kamar' => [
                'required',
                'integer',
                'min:1',
            ],

            'luas_bangunan' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'luas_tanah' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'kondisi' => [
                'required',
                Rule::in([
                    'baik',
                    'rusak_ringan',
                    'rusak_berat',
                ]),
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

            'keterangan' => [
                'nullable',
                'string',
            ],
        ]);

        /*
         * kode_hunian TIDAK dibuat di controller.
         *
         * Model Hunian akan otomatis membuat:
         * rumah_dinas -> RD-0001
         * mes         -> MS-0001
         * apartemen   -> AP-0001
         */
        Hunian::create($validated);

        return to_route('hunian.index')
            ->with(
                'success',
                'Data hunian berhasil ditambahkan.'
            );
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
                'exists:units,id',
            ],

            /*
             * Kode hunian tetap dipertahankan.
             * Tidak perlu dibuat ulang ketika edit.
             */
            'kode_hunian' => [
                'required',
                'string',
                'max:50',
                Rule::unique(
                    'hunian',
                    'kode_hunian'
                )->ignore($hunian->id),
            ],

            'jenis_hunian' => [
                'required',
                Rule::in([
                    'rumah_dinas',
                    'mes',
                    'apartemen',
                ]),
            ],

            'nama_hunian' => [
                'required',
                'string',
                'max:150',
            ],

            'alamat' => [
                'required',
                'string',
                'max:255',
            ],

            'blok' => [
                'nullable',
                'string',
                'max:50',
            ],

            'nomor' => [
                'nullable',
                'string',
                'max:50',
            ],

            'lantai' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'jumlah_kamar' => [
                'required',
                'integer',
                'min:1',
            ],

            'luas_bangunan' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'luas_tanah' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'kondisi' => [
                'required',
                Rule::in([
                    'baik',
                    'rusak_ringan',
                    'rusak_berat',
                ]),
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

            'keterangan' => [
                'nullable',
                'string',
            ],
        ]);

        $hunian->update($validated);

        return to_route('hunian.index')
            ->with(
                'success',
                'Data hunian berhasil diperbarui.'
            );
    }

    /**
     * Menghapus data hunian.
     *
     * Menggunakan SoftDeletes.
     */
    public function destroy(Hunian $hunian): RedirectResponse
    {
        $hunian->delete();

        return to_route('hunian.index')
            ->with(
                'success',
                'Data hunian berhasil dihapus.'
            );
    }
}
