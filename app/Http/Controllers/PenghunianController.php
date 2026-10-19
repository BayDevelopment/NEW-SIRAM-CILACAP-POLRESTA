<?php

namespace App\Http\Controllers;

use App\Models\Anggota;
use App\Models\Hunian;
use App\Models\Penghunian;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PenghunianController extends Controller
{
    /**
     * Hanya superadmin dan anggota yang boleh mengakses Penghunian.
     *
     * Superadmin dapat mengelola semua unit.
     * Anggota harus mempunyai unit_id dan dibatasi scope model.
     */
    private function authorizedUser(Request $request): User
    {
        $user = $request->user();

        abort_unless(
            $user instanceof User,
            401,
            'Silakan login terlebih dahulu.'
        );

        $isSuperadmin = $user->isSuperadmin();
        $isAnggota = $user->role === 'anggota';

        abort_unless(
            $isSuperadmin || $isAnggota,
            403,
            'Anda tidak memiliki izin mengakses modul Penghunian.'
        );

        abort_if(
            $isAnggota && empty($user->unit_id),
            403,
            'Akun anggota belum terhubung ke unit yang berwenang.'
        );

        return $user;
    }

    /**
     * INDEX
     */
    public function index(Request $request): Response
    {
        $user = $this->authorizedUser($request);

        $search = trim((string) $request->input('search', ''));
        $status = (string) $request->input('status', '');
        $editingId = $request->integer('editing_id');

        $penghunian = Penghunian::query()
            ->with([
                'anggota:id,nama_lengkap,nrp',
                'hunian:id,unit_id,kode_hunian,nama_hunian,status_operasional',
                'hunian.unit:id,nama_unit',
                'penyetuju:id,name',
            ])
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $q) use ($search) {
                    $q->whereHas('anggota', function (Builder $anggota) use ($search) {
                        $anggota
                            ->where('nama_lengkap', 'like', "%{$search}%")
                            ->orWhere('nrp', 'like', "%{$search}%");
                    })->orWhereHas('hunian', function (Builder $hunian) use ($search) {
                        $hunian
                            ->where('kode_hunian', 'like', "%{$search}%")
                            ->orWhere('nama_hunian', 'like', "%{$search}%");
                    });
                });
            })
            ->when(
                in_array($status, Penghunian::STATUS, true),
                fn(Builder $query) => $query->where('status', $status)
            )
            ->latest('tanggal_mulai')
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        // Penghitungan menggunakan query Penghunian yang tetap ter-scope.
        $counts = Penghunian::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        // Model tetap harus mengikuti scope agar editing_id tidak membuka
        // opsi catatan dari unit lain.
        $current = $editingId > 0
            ? Penghunian::query()->find($editingId)
            : null;

        return Inertia::render('penghunian/index', [
            'penghunian' => $penghunian,

            'stats' => [
                'total' => (int) $counts->sum(),
                'aktif' => (int) ($counts[Penghunian::STATUS_AKTIF] ?? 0),
                'selesai' => (int) ($counts[Penghunian::STATUS_SELESAI] ?? 0),
                'dibatalkan' => (int) ($counts[Penghunian::STATUS_DIBATALKAN] ?? 0),
            ],

            'anggotaOptions' => $this->anggotaOptionsQuery($current)
                ->orderBy('nama_lengkap')
                ->get(),

            'hunianOptions' => $this->hunianOptionsQuery($current)
                ->orderBy('kode_hunian')
                ->get([
                    'id',
                    'unit_id',
                    'kode_hunian',
                    'nama_hunian',
                    'status_operasional',
                ]),

            'filters' => [
                'search' => $search,
                'status' => $status,
            ],

            'can' => [
                'manage_anggota' => $user->isSuperadmin(),
                'manage_penghunian' => true,
            ],
        ]);
    }

    /**
     * STORE
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorizedUser($request);

        $data = $request->validate(
            $this->rules($request),
            [],
            $this->attributes()
        );

        $documentPath = null;

        try {
            DB::transaction(function () use (
                $request,
                &$data,
                &$documentPath
            ) {
                $this->ensureNoConflict($data);

                if ($request->hasFile('dokumen_perjanjian')) {
                    $documentPath = $request
                        ->file('dokumen_perjanjian')
                        ->store('penghunian/dokumen', 'public');

                    if (! $documentPath) {
                        throw new \RuntimeException(
                            'Dokumen perjanjian gagal disimpan.'
                        );
                    }

                    $data['dokumen_perjanjian'] = $documentPath;
                } else {
                    unset($data['dokumen_perjanjian']);
                }

                if ($data['status'] === Penghunian::STATUS_AKTIF) {
                    $data['disetujui_oleh'] = $request->user()?->id;
                    $data['disetujui_at'] = now();
                } else {
                    $data['disetujui_oleh'] = null;
                    $data['disetujui_at'] = null;
                }

                $penghunian = Penghunian::create($data);

                $this->syncHunianStatus((int) $penghunian->hunian_id);
            });
        } catch (Throwable $exception) {
            if ($documentPath) {
                Storage::disk('public')->delete($documentPath);
            }

            throw $exception;
        }

        return back()->with(
            'success',
            'Data penghunian berhasil ditambahkan.'
        );
    }

    /**
     * UPDATE
     */
    public function update(
        Request $request,
        Penghunian $penghunian
    ): RedirectResponse {
        $this->authorizedUser($request);

        // Query ulang melalui model ter-scope untuk memastikan record
        // memang berada dalam kewenangan user saat ini.
        $penghunian = Penghunian::query()
            ->whereKey($penghunian->getKey())
            ->firstOrFail();

        $data = $request->validate(
            $this->rules($request),
            [],
            $this->attributes()
        );

        $oldDocumentPath = $penghunian->dokumen_perjanjian;
        $newDocumentPath = null;

        try {
            if ($request->hasFile('dokumen_perjanjian')) {
                $newDocumentPath = $request
                    ->file('dokumen_perjanjian')
                    ->store('penghunian/dokumen', 'public');

                if (! $newDocumentPath) {
                    throw ValidationException::withMessages([
                        'dokumen_perjanjian' =>
                        'Dokumen perjanjian gagal diunggah.',
                    ]);
                }

                $data['dokumen_perjanjian'] = $newDocumentPath;
            } else {
                unset($data['dokumen_perjanjian']);
            }

            DB::transaction(function () use (
                $request,
                $penghunian,
                &$data
            ) {
                $current = Penghunian::query()
                    ->whereKey($penghunian->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $oldHunianId = (int) $current->hunian_id;

                $this->ensureNoConflict($data, $current);

                if ($data['status'] === Penghunian::STATUS_AKTIF) {
                    if ($current->disetujui_at === null) {
                        $data['disetujui_oleh'] = $request->user()?->id;
                        $data['disetujui_at'] = now();
                    }
                } else {
                    $data['disetujui_oleh'] = null;
                    $data['disetujui_at'] = null;
                }

                $current->update($data);

                $hunianIds = array_unique([
                    $oldHunianId,
                    (int) $current->hunian_id,
                ]);

                foreach ($hunianIds as $hunianId) {
                    $this->syncHunianStatus($hunianId);
                }
            });
        } catch (Throwable $exception) {
            if ($newDocumentPath) {
                Storage::disk('public')->delete($newDocumentPath);
            }

            throw $exception;
        }

        if (
            $newDocumentPath
            && $oldDocumentPath
            && $oldDocumentPath !== $newDocumentPath
        ) {
            Storage::disk('public')->delete($oldDocumentPath);
        }

        return back()->with(
            'success',
            'Data penghunian berhasil diperbarui.'
        );
    }

    /**
     * DESTROY (soft delete).
     * File dokumen tidak langsung dihapus agar data dapat dipulihkan.
     */
    public function destroy(
        Request $request,
        Penghunian $penghunian
    ): RedirectResponse {
        $this->authorizedUser($request);

        $penghunian = Penghunian::query()
            ->whereKey($penghunian->getKey())
            ->firstOrFail();

        DB::transaction(function () use ($penghunian) {
            $current = Penghunian::query()
                ->whereKey($penghunian->id)
                ->lockForUpdate()
                ->firstOrFail();

            $hunianId = (int) $current->hunian_id;

            $current->delete();

            $this->syncHunianStatus($hunianId);
        });

        return back()->with(
            'success',
            'Data penghunian berhasil dihapus.'
        );
    }

    /**
     * OPTIONS ANGGOTA
     */
    public function optionsAnggota(Request $request): JsonResponse
    {
        $this->authorizedUser($request);

        $search = trim((string) $request->query('q', ''));
        $editingId = $request->integer('editing_id');

        $current = $editingId > 0
            ? Penghunian::query()->find($editingId)
            : null;

        $items = $this->anggotaOptionsQuery($current)
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $q) use ($search) {
                    $q->where('nama_lengkap', 'like', "%{$search}%")
                        ->orWhere('nrp', 'like', "%{$search}%");
                });
            })
            ->orderBy('nama_lengkap')
            ->limit(30)
            ->get();

        return response()->json($items);
    }

    /**
     * OPTIONS HUNIAN
     */
    public function optionsHunian(Request $request): JsonResponse
    {
        $this->authorizedUser($request);

        $search = trim((string) $request->query('q', ''));
        $editingId = $request->integer('editing_id');

        $current = $editingId > 0
            ? Penghunian::query()->find($editingId)
            : null;

        $items = $this->hunianOptionsQuery($current)
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $q) use ($search) {
                    $q->where('kode_hunian', 'like', "%{$search}%")
                        ->orWhere('nama_hunian', 'like', "%{$search}%")
                        ->orWhereHas('unit', function (Builder $unitQuery) use ($search) {
                            $unitQuery->where(
                                'nama_unit',
                                'like',
                                "%{$search}%"
                            );
                        });
                });
            })
            ->orderBy('kode_hunian')
            ->limit(30)
            ->get([
                'id',
                'unit_id',
                'kode_hunian',
                'nama_hunian',
                'status_operasional',
            ]);

        return response()->json($items);
    }

    /* ------------------------------------------------------------------
     | OPTION QUERIES
     * ---------------------------------------------------------------- */

    /**
     * Anggota yang belum memiliki penghunian aktif.
     * Anggota yang sedang terhubung dengan catatan yang diedit tetap
     * dapat dipilih. UnitScope pada Anggota harus sudah aktif.
     */
    private function anggotaOptionsQuery(?Penghunian $current): Builder
    {
        return Anggota::query()
            ->select(['id', 'nama_lengkap', 'nrp'])
            ->where(function (Builder $query) use ($current) {
                $query->whereNotIn(
                    'id',
                    Penghunian::query()
                        ->withoutGlobalScopes()
                        ->select('anggota_id')
                        ->where('status', Penghunian::STATUS_AKTIF)
                        ->whereNull('deleted_at')
                );

                if ($current) {
                    $query->orWhere('id', $current->anggota_id);
                }
            });
    }

    /**
     * Hunian yang tersedia dan tidak mempunyai penghunian aktif
     * atau pemeliharaan aktif. UnitScope pada Hunian harus sudah aktif.
     */
    private function hunianOptionsQuery(?Penghunian $current): Builder
    {
        return Hunian::query()
            ->with('unit:id,nama_unit')
            ->where(function (Builder $query) use ($current) {
                $query->where(function (Builder $q) {
                    $q->where('status_operasional', 'tersedia')
                        ->whereNotIn(
                            'id',
                            Penghunian::query()
                                ->withoutGlobalScopes()
                                ->select('hunian_id')
                                ->where('status', Penghunian::STATUS_AKTIF)
                                ->whereNull('deleted_at')
                        )
                        ->whereNotIn(
                            'id',
                            DB::table('maintenance_hunian')
                                ->select('hunian_id')
                                ->whereIn(
                                    'status',
                                    ['dilaporkan', 'diproses']
                                )
                        );
                });

                if ($current) {
                    $query->orWhere('id', $current->hunian_id);
                }
            });
    }

    /* ------------------------------------------------------------------
     | VALIDATION
     * ---------------------------------------------------------------- */

    /**
     * Rule::exists tidak menerapkan global scope Eloquent, jadi unit
     * diperiksa secara eksplisit. Superadmin dapat mengelola lintas unit;
     * anggota hanya dapat memilih anggota dan hunian dari unitnya.
     */
    private function rules(Request $request): array
    {
        $user = $this->authorizedUser($request);

        $isSuperadmin = $user->isSuperadmin();
        $unitId = $user->unit_id !== null
            ? (int) $user->unit_id
            : null;

        $restrictToUnit = function ($query) use (
            $isSuperadmin,
            $unitId
        ) {
            if ($isSuperadmin) {
                return $query;
            }

            if ($unitId === null) {
                return $query->whereRaw('1 = 0');
            }

            return $query->where('unit_id', $unitId);
        };

        return [
            'anggota_id' => [
                'required',
                'integer',
                Rule::exists('anggota', 'id')->where($restrictToUnit),
            ],

            'hunian_id' => [
                'required',
                'integer',
                Rule::exists('hunian', 'id')->where($restrictToUnit),
            ],

            'tanggal_mulai' => [
                'required',
                'date',
            ],

            'tanggal_selesai' => [
                'required',
                'date',
                'after_or_equal:tanggal_mulai',
            ],

            'status' => [
                'required',
                Rule::in(Penghunian::STATUS),
            ],

            'alasan_penghunian' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'keterangan' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'dokumen_perjanjian' => [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:5120',
            ],
        ];
    }

    private function attributes(): array
    {
        return [
            'anggota_id' => 'anggota',
            'hunian_id' => 'hunian',
            'tanggal_mulai' => 'tanggal mulai',
            'tanggal_selesai' => 'tanggal selesai',
            'alasan_penghunian' => 'alasan penghunian',
            'dokumen_perjanjian' => 'dokumen perjanjian',
        ];
    }

    /* ------------------------------------------------------------------
     | CONFLICT VALIDATION
     * ---------------------------------------------------------------- */

    /**
     * Konflik diperiksa secara global:
     * - satu anggota tidak boleh mempunyai lebih dari satu penghunian aktif;
     * - satu hunian tidak boleh mempunyai lebih dari satu penghunian aktif;
     * - hunian yang sedang dalam pemeliharaan aktif tidak boleh digunakan.
     *
     * withoutGlobalScopes dipakai hanya pada pemeriksaan konflik lintas unit.
     * Soft-deleted records secara eksplisit dikecualikan.
     */
    private function ensureNoConflict(
        array $data,
        ?Penghunian $current = null
    ): void {
        if ($data['status'] !== Penghunian::STATUS_AKTIF) {
            return;
        }

        // Query Eloquent tetap menerapkan unit scope saat memeriksa pilihan.
        $anggota = Anggota::query()
            ->whereKey($data['anggota_id'])
            ->lockForUpdate()
            ->first();

        if (! $anggota) {
            throw ValidationException::withMessages([
                'anggota_id' =>
                'Anggota tidak ditemukan atau berada di luar unit Anda.',
            ]);
        }

        $hunian = Hunian::query()
            ->whereKey($data['hunian_id'])
            ->lockForUpdate()
            ->first();

        if (! $hunian) {
            throw ValidationException::withMessages([
                'hunian_id' =>
                'Hunian tidak ditemukan atau berada di luar unit Anda.',
            ]);
        }

        $anggotaAktif = Penghunian::query()
            ->withoutGlobalScopes()
            ->whereNull('deleted_at')
            ->where('anggota_id', $data['anggota_id'])
            ->where('status', Penghunian::STATUS_AKTIF)
            ->when(
                $current,
                fn(Builder $query) => $query->where(
                    'id',
                    '!=',
                    $current->id
                )
            )
            ->exists();

        if ($anggotaAktif) {
            throw ValidationException::withMessages([
                'anggota_id' =>
                'Anggota ini masih memiliki penghunian aktif lain.',
            ]);
        }

        $hunianAktif = Penghunian::query()
            ->withoutGlobalScopes()
            ->whereNull('deleted_at')
            ->where('hunian_id', $data['hunian_id'])
            ->where('status', Penghunian::STATUS_AKTIF)
            ->when(
                $current,
                fn(Builder $query) => $query->where(
                    'id',
                    '!=',
                    $current->id
                )
            )
            ->exists();

        if ($hunianAktif) {
            throw ValidationException::withMessages([
                'hunian_id' =>
                'Hunian ini masih memiliki penghunian aktif lain.',
            ]);
        }

        $hunianYangSama = $current !== null
            && (int) $current->hunian_id === (int) $hunian->id;

        $sedangPemeliharaan = DB::table('maintenance_hunian')
            ->where('hunian_id', $hunian->id)
            ->whereIn('status', ['dilaporkan', 'diproses'])
            ->exists();

        if ($sedangPemeliharaan) {
            throw ValidationException::withMessages([
                'hunian_id' =>
                'Hunian sedang dalam proses pemeliharaan dan tidak dapat digunakan.',
            ]);
        }

        if (
            ! $hunianYangSama
            && $hunian->status_operasional !== 'tersedia'
        ) {
            $label = match ($hunian->status_operasional) {
                'dihuni' => 'sudah dihuni',
                'perbaikan' => 'sedang dalam perbaikan',
                'tidak_layak' => 'tidak layak huni',
                default => 'tidak tersedia untuk ditempati',
            };

            throw ValidationException::withMessages([
                'hunian_id' =>
                "Hunian ini {$label} sehingga tidak dapat ditempati.",
            ]);
        }

        if (
            $hunianYangSama
            && in_array(
                $hunian->status_operasional,
                ['perbaikan', 'tidak_layak'],
                true
            )
        ) {
            throw ValidationException::withMessages([
                'hunian_id' =>
                'Hunian sedang dalam perbaikan atau tidak layak huni.',
            ]);
        }
    }

    /* ------------------------------------------------------------------
     | SYNC STATUS HUNIAN
     * ---------------------------------------------------------------- */

    private function syncHunianStatus(int $hunianId): void
    {
        $hunian = Hunian::query()
            ->whereKey($hunianId)
            ->lockForUpdate()
            ->first();

        if (! $hunian) {
            return;
        }

        // Jangan menimpa status perbaikan/tidak layak huni.
        if (in_array(
            $hunian->status_operasional,
            ['perbaikan', 'tidak_layak'],
            true
        )) {
            return;
        }

        $adaAktif = Penghunian::query()
            ->withoutGlobalScopes()
            ->whereNull('deleted_at')
            ->where('hunian_id', $hunianId)
            ->where('status', Penghunian::STATUS_AKTIF)
            ->exists();

        $statusBaru = $adaAktif ? 'dihuni' : 'tersedia';

        if ($hunian->status_operasional !== $statusBaru) {
            $hunian->update([
                'status_operasional' => $statusBaru,
            ]);
        }
    }
}
