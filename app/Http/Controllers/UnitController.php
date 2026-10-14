<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $tipe = (string) $request->input('tipe_unit', '');
        $status = (string) $request->input('status', ''); // aktif | nonaktif

        $units = Unit::query()
            ->withCount('hunian')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('kode_unit', 'like', "%{$search}%")
                        ->orWhere('nama_unit', 'like', "%{$search}%")
                        ->orWhere('alamat', 'like', "%{$search}%")
                        ->orWhere('telepon', 'like', "%{$search}%");
                });
            })
            ->when($tipe !== '', fn($query) => $query->where('tipe_unit', $tipe))
            ->when($status !== '', fn($query) => $query->where('is_active', $status === 'aktif'))
            ->orderBy('nama_unit')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('unit/index', [
            'units' => $units,
            'filters' => [
                'search' => $search,
                'tipe_unit' => $tipe,
                'status' => $status,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Unit::create($request->validate($this->rules()));

        return back()->with('success', 'Unit berhasil ditambahkan.');
    }

    public function update(Request $request, Unit $unit): RedirectResponse
    {
        $unit->update($request->validate($this->rules()));

        return back()->with('success', 'Unit berhasil diperbarui.');
    }

    public function destroy(Unit $unit): RedirectResponse
    {
        // hunian.unit_id memakai restrictOnDelete, jadi hunian yang sudah
        // dihapus (soft delete) pun masih menahan unit ini.
        if ($unit->hunian()->withTrashed()->exists()) {
            return back()->with(
                'error',
                'Unit tidak dapat dihapus karena sudah memiliki data hunian. Nonaktifkan unit jika tidak digunakan lagi.'
            );
        }

        $unit->delete();

        return back()->with('success', 'Unit berhasil dihapus.');
    }

    /**
     * Aturan validasi sesuai migration `units`.
     * kode_unit dibuat otomatis oleh model, jadi tidak divalidasi di sini.
     */
    private function rules(): array
    {
        return [
            'nama_unit' => ['required', 'string', 'max:150'],
            'tipe_unit' => ['required', Rule::in(array_keys(Unit::TIPE_PREFIX))],
            'alamat' => ['nullable', 'string', 'max:255'],
            'telepon' => ['nullable', 'string', 'max:30'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
