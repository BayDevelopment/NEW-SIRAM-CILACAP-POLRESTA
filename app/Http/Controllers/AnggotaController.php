<?php

namespace App\Http\Controllers;

use App\Models\Anggota;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AnggotaController extends Controller
{
    /* ------------------------------------------------------------------
     | INDEX
     * ---------------------------------------------------------------- */

    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $unitId = $request->input('unit_id', '');
        $status = $request->input('status', '');

        $anggota = Anggota::query()
            ->with([
                'user:id,name,email',
                'unit:id,nama_unit',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('nama_lengkap', 'like', "%{$search}%")
                        ->orWhere('nrp', 'like', "%{$search}%")
                        ->orWhere('pangkat', 'like', "%{$search}%")
                        ->orWhere('jabatan', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when(
                $unitId !== ''
                    && filter_var($unitId, FILTER_VALIDATE_INT) !== false
                    && (int) $unitId > 0,
                fn($query) => $query->where('unit_id', (int) $unitId)
            )
            ->when(
                in_array($status, ['aktif', 'nonaktif'], true),
                fn($query) => $query->where(
                    'is_active',
                    $status === 'aktif'
                )
            )
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        $stats = [
            'total' => Anggota::count(),
            'aktif' => Anggota::where('is_active', true)->count(),
            'nonaktif' => Anggota::where('is_active', false)->count(),
            'terhubung' => Anggota::whereNotNull('user_id')->count(),
        ];

        return Inertia::render('anggota/index', [
            'anggota' => $anggota,
            'stats' => $stats,

            'unitOptions' => Unit::query()
                ->orderBy('nama_unit')
                ->get(['id', 'nama_unit']),

            'filters' => [
                'search' => $search,
                'unit_id' => $unitId,
                'status' => $status,
            ],
        ]);
    }

    /* ------------------------------------------------------------------
     | STORE
     * ---------------------------------------------------------------- */

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(
            $this->rules(),
            [],
            $this->attributes()
        );

        Anggota::create($data);

        return back()->with(
            'success',
            'Data anggota berhasil ditambahkan.'
        );
    }

    /* ------------------------------------------------------------------
     | UPDATE
     * ---------------------------------------------------------------- */

    public function update(
        Request $request,
        Anggota $anggota
    ): RedirectResponse {
        $data = $request->validate(
            $this->rules($anggota),
            [],
            $this->attributes()
        );

        $anggota->update($data);

        return back()->with(
            'success',
            'Data anggota berhasil diperbarui.'
        );
    }

    /* ------------------------------------------------------------------
     | DESTROY (SOFT DELETE)
     * ---------------------------------------------------------------- */

    public function destroy(Anggota $anggota): RedirectResponse
    {
        $anggota->delete();

        return back()->with(
            'success',
            'Data anggota berhasil dihapus.'
        );
    }

    /* ------------------------------------------------------------------
     | VALIDATION
     * ---------------------------------------------------------------- */

    private function rules(?Anggota $anggota = null): array
    {
        return [
            'user_id' => [
                'nullable',
                'integer',
                'exists:users,id',
                Rule::unique('anggota', 'user_id')
                    ->ignore($anggota?->id),
            ],

            'unit_id' => [
                'required',
                'integer',
                'exists:units,id',
            ],

            'nrp' => [
                'required',
                'string',
                'max:30',
                Rule::unique('anggota', 'nrp')
                    ->ignore($anggota?->id),
            ],

            'nama_lengkap' => [
                'required',
                'string',
                'max:150',
            ],

            'pangkat' => [
                'nullable',
                'string',
                'max:100',
            ],

            'jabatan' => [
                'nullable',
                'string',
                'max:150',
            ],

            'jenis_kelamin' => [
                'required',
                Rule::in(['L', 'P']),
            ],

            'tempat_lahir' => [
                'nullable',
                'string',
                'max:100',
            ],

            'tanggal_lahir' => [
                'nullable',
                'date',
                'before_or_equal:today',
            ],

            'no_hp' => [
                'nullable',
                'string',
                'max:30',
            ],

            'email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'alamat' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'is_active' => [
                'required',
                'boolean',
            ],
        ];
    }

    /* ------------------------------------------------------------------
     | VALIDATION ATTRIBUTES
     * ---------------------------------------------------------------- */

    private function attributes(): array
    {
        return [
            'user_id' => 'akun pengguna',
            'unit_id' => 'unit / satuan',
            'nrp' => 'NRP',
            'nama_lengkap' => 'nama lengkap',
            'pangkat' => 'pangkat',
            'jabatan' => 'jabatan',
            'jenis_kelamin' => 'jenis kelamin',
            'tempat_lahir' => 'tempat lahir',
            'tanggal_lahir' => 'tanggal lahir',
            'no_hp' => 'nomor HP',
            'email' => 'email',
            'alamat' => 'alamat',
            'is_active' => 'status keaktifan',
        ];
    }
}
