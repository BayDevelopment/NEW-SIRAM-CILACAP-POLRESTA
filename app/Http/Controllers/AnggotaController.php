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
    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    */

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'unit_id' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', Rule::in(['aktif', 'nonaktif'])],
        ]);

        $search = trim($filters['search'] ?? '');
        $unitId = $filters['unit_id'] ?? '';
        $status = $filters['status'] ?? '';

        $anggota = Anggota::query()
            ->with([
                'user:id,name,email',
                'unit:id,nama_unit',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $keyword = '%' . $search . '%';

                    $q->where('nama_lengkap', 'like', $keyword)
                        ->orWhere('nrp', 'like', $keyword)
                        ->orWhere('pangkat', 'like', $keyword)
                        ->orWhere('jabatan', 'like', $keyword)
                        ->orWhere('email', 'like', $keyword);
                });
            })
            ->when(
                $unitId !== '',
                fn($query) => $query->where('unit_id', $unitId)
            )
            ->when(
                $status !== '',
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

    /*
    |--------------------------------------------------------------------------
    | STORE
    |--------------------------------------------------------------------------
    */

    public function store(Request $request): RedirectResponse
    {
        $this->normalizeInput($request);

        $data = $request->validate(
            $this->rules(),
            $this->messages(),
            $this->attributes()
        );

        Anggota::create($data);

        return back()->with(
            'success',
            'Data anggota berhasil ditambahkan.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    public function update(
        Request $request,
        Anggota $anggota
    ): RedirectResponse {
        $this->normalizeInput($request);

        $data = $request->validate(
            $this->rules($anggota),
            $this->messages(),
            $this->attributes()
        );

        $anggota->update($data);

        return back()->with(
            'success',
            'Data anggota berhasil diperbarui.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DESTROY (SOFT DELETE)
    |--------------------------------------------------------------------------
    */

    public function destroy(Anggota $anggota): RedirectResponse
    {
        if (
            $anggota->penghunian()
            ->where('status', 'aktif')
            ->exists()
        ) {
            return back()->with(
                'error',
                'Anggota tidak dapat dihapus karena masih memiliki penghunian aktif.'
            );
        }

        $anggota->delete();

        return back()->with(
            'success',
            'Data anggota berhasil dihapus.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | INPUT NORMALIZATION
    |--------------------------------------------------------------------------
    */

    private function normalizeInput(Request $request): void
    {
        $fields = [
            'nrp',
            'nama_lengkap',
            'pangkat',
            'jabatan',
            'tempat_lahir',
            'no_hp',
            'alamat',
        ];

        foreach ($fields as $field) {
            $value = $request->input($field);

            if (is_string($value)) {
                $value = trim($value);

                $request->merge([
                    $field => $value === '' ? null : $value,
                ]);
            }
        }

        // No HP: buang spasi/tanda baca, samakan +62 / 62 menjadi 0
        $noHp = $request->input('no_hp');

        if (is_string($noHp)) {
            $noHp = preg_replace('/[\s\-\.\(\)]+/', '', $noHp);

            if (str_starts_with($noHp, '+62')) {
                $noHp = '0' . substr($noHp, 3);
            } elseif (str_starts_with($noHp, '62')) {
                $noHp = '0' . substr($noHp, 2);
            }

            $request->merge([
                'no_hp' => $noHp === '' ? null : $noHp,
            ]);
        }

        $email = $request->input('email');

        if (is_string($email)) {
            $email = mb_strtolower(trim($email));

            $request->merge([
                'email' => $email === '' ? null : $email,
            ]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATION RULES
    |--------------------------------------------------------------------------
    */

    private function uniqueRule(string $column, ?Anggota $anggota = null)
    {
        return Rule::unique('anggota', $column)
            ->ignore(
                $anggota?->getKey(),
                $anggota?->getKeyName() ?? 'id'
            );
    }

    private function rules(?Anggota $anggota = null): array
    {
        return [
            'user_id' => [
                'nullable',
                'integer',
                'min:1',
                'exists:users,id',
                $this->uniqueRule('user_id', $anggota),
            ],

            'unit_id' => [
                'required',
                'integer',
                'min:1',
                'exists:units,id',
            ],

            'nrp' => [
                'required',
                'string',
                'max:30',
                'regex:/^[A-Za-z0-9\/.-]+$/',
                $this->uniqueRule('nrp', $anggota),
            ],

            'nama_lengkap' => [
                'required',
                'string',
                'max:150',
                $this->uniqueRule('nama_lengkap', $anggota),
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
                'regex:/^[0-9]{8,15}$/',
                $this->uniqueRule('no_hp', $anggota),
            ],

            'email' => [
                'nullable',
                'email:rfc',
                'max:255',
                $this->uniqueRule('email', $anggota),
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

    /*
    |--------------------------------------------------------------------------
    | VALIDATION MESSAGES
    |--------------------------------------------------------------------------
    */

    private function messages(): array
    {
        return [
            'required' => ':attribute wajib diisi.',
            'integer' => ':attribute harus berupa angka bulat.',
            'min' => ':attribute minimal :min.',
            'string' => ':attribute harus berupa teks.',
            'max' => ':attribute maksimal :max karakter.',
            'exists' => ':attribute yang dipilih tidak ditemukan.',
            'unique' => ':attribute sudah digunakan oleh anggota lain.',
            'email' => 'Format :attribute tidak valid.',
            'date' => 'Format :attribute tidak valid.',
            'before_or_equal' => ':attribute tidak boleh melebihi hari ini.',
            'in' => 'Pilihan :attribute tidak valid.',
            'boolean' => ':attribute harus berupa status yang valid.',
            'regex' => 'Format :attribute tidak valid.',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATION ATTRIBUTES
    |--------------------------------------------------------------------------
    */

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
            'search' => 'pencarian',
            'status' => 'status anggota',
        ];
    }
}
