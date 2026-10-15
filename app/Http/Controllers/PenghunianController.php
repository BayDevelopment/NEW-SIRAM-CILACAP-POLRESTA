<?php

namespace App\Http\Controllers;

use App\Models\Anggota;
use App\Models\Hunian;
use App\Models\Penghunian;
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
     * INDEX
     */
    public function index(Request $request): Response
    {
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
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->whereHas('anggota', function ($q) use ($search) {
                            $q->where('nama_lengkap', 'like', "%{$search}%")
                                ->orWhere('nrp', 'like', "%{$search}%");
                        })
                        ->orWhereHas('hunian', function ($q) use ($search) {
                            $q->where('kode_hunian', 'like', "%{$search}%")
                                ->orWhere('nama_hunian', 'like', "%{$search}%");
                        });
                });
            })
            ->when(
                in_array($status, Penghunian::STATUS, true),
                fn($query) => $query->where('status', $status)
            )
            ->latest('tanggal_mulai')
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        $counts = Penghunian::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        /*
         * Anggota yang belum memiliki penghunian aktif.
         * Anggota pada catatan yang sedang diedit tetap ditampilkan.
         */
        $anggotaOptions = Anggota::query()
            ->select(['id', 'nama_lengkap', 'nrp'])
            ->where(function ($query) use ($editingId) {
                $query->whereNotIn(
                    'id',
                    Penghunian::query()
                        ->select('anggota_id')
                        ->where('status', Penghunian::STATUS_AKTIF)
                );

                if ($editingId) {
                    $current = Penghunian::query()->find($editingId);

                    if ($current) {
                        $query->orWhere('id', $current->anggota_id);
                    }
                }
            })
            ->orderBy('nama_lengkap')
            ->get();

        /*
         * Hunian yang bisa dipilih:
         * - status operasional tersedia;
         * - tidak memiliki penghunian aktif lain;
         * - tidak memiliki pemeliharaan yang masih dilaporkan/diproses.
         *
         * Hunian dari catatan yang sedang diedit tetap dimasukkan
         * agar nilai lama tetap terlihat di form edit.
         */
        $hunianOptions = Hunian::query()
            ->with('unit:id,nama_unit')
            ->where(function ($query) use ($editingId) {
                $query->where(function ($q) {
                    $q->where('status_operasional', 'tersedia')
                        ->whereNotIn(
                            'id',
                            Penghunian::query()
                                ->select('hunian_id')
                                ->where('status', Penghunian::STATUS_AKTIF)
                        )
                        ->whereNotIn(
                            'id',
                            DB::table('maintenance_hunian')
                                ->select('hunian_id')
                                ->whereIn('status', ['dilaporkan', 'diproses'])
                        );
                });

                if ($editingId) {
                    $current = Penghunian::query()->find($editingId);

                    if ($current) {
                        $query->orWhere('id', $current->hunian_id);
                    }
                }
            })
            ->orderBy('kode_hunian')
            ->get([
                'id',
                'unit_id',
                'kode_hunian',
                'nama_hunian',
                'status_operasional',
            ]);

        return Inertia::render('penghunian/index', [
            'penghunian' => $penghunian,
            'stats' => [
                'total' => (int) $counts->sum(),
                'aktif' => (int) ($counts[Penghunian::STATUS_AKTIF] ?? 0),
                'selesai' => (int) ($counts[Penghunian::STATUS_SELESAI] ?? 0),
                'dibatalkan' => (int) ($counts[Penghunian::STATUS_DIBATALKAN] ?? 0),
            ],
            'anggotaOptions' => $anggotaOptions,
            'hunianOptions' => $hunianOptions,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    /**
     * STORE
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(
            $this->rules(),
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
        $data = $request->validate(
            $this->rules(),
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
     * DESTROY
     */
    public function destroy(
        Penghunian $penghunian
    ): RedirectResponse {
        $documentPath = $penghunian->dokumen_perjanjian;

        DB::transaction(function () use ($penghunian) {
            $current = Penghunian::query()
                ->whereKey($penghunian->id)
                ->lockForUpdate()
                ->firstOrFail();

            $hunianId = (int) $current->hunian_id;

            $current->delete();

            $this->syncHunianStatus($hunianId);
        });

        if ($documentPath) {
            Storage::disk('public')->delete($documentPath);
        }

        return back()->with(
            'success',
            'Data penghunian berhasil dihapus.'
        );
    }

    /**
     * OPTIONS ANGGOTA UNTUK DROPDOWN PENCARIAN
     */
    public function optionsAnggota(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));

        $items = Anggota::query()
            ->select(['id', 'nama_lengkap', 'nrp'])
            ->whereNotIn(
                'id',
                Penghunian::query()
                    ->select('anggota_id')
                    ->where('status', Penghunian::STATUS_AKTIF)
            )
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
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
     * OPTIONS HUNIAN UNTUK DROPDOWN PENCARIAN
     */
    public function optionsHunian(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));
        $editingId = $request->integer('editing_id');

        $query = Hunian::query()
            ->with('unit:id,nama_unit')
            ->where('status_operasional', 'tersedia')
            ->whereNotIn(
                'id',
                Penghunian::query()
                    ->select('hunian_id')
                    ->where('status', Penghunian::STATUS_AKTIF)
            )
            ->whereNotIn(
                'id',
                DB::table('maintenance_hunian')
                    ->select('hunian_id')
                    ->whereIn('status', ['dilaporkan', 'diproses'])
            );

        /*
         * Saat edit, tetap izinkan hunian yang sudah terhubung
         * dengan catatan saat ini agar pilihan tidak hilang.
         * Pemeriksaan konflik tetap dilakukan saat penyimpanan.
         */
        if ($editingId) {
            $current = Penghunian::query()->find($editingId);

            if ($current) {
                $query->orWhere('id', $current->hunian_id);
            }
        }

        $items = $query
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('kode_hunian', 'like', "%{$search}%")
                        ->orWhere('nama_hunian', 'like', "%{$search}%")
                        ->orWhereHas('unit', function ($unitQuery) use ($search) {
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

    /**
     * VALIDATION RULES
     */
    private function rules(): array
    {
        return [
            'anggota_id' => [
                'required',
                'integer',
                'exists:anggota,id',
            ],
            'hunian_id' => [
                'required',
                'integer',
                'exists:hunian,id',
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

    /**
     * VALIDATION ATTRIBUTE LABELS
     */
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

    /**
     * CONFLICT VALIDATION
     */
    private function ensureNoConflict(
        array $data,
        ?Penghunian $current = null
    ): void {
        if ($data['status'] !== Penghunian::STATUS_AKTIF) {
            return;
        }

        $anggota = Anggota::query()
            ->whereKey($data['anggota_id'])
            ->lockForUpdate()
            ->first();

        if (! $anggota) {
            throw ValidationException::withMessages([
                'anggota_id' => 'Anggota tidak ditemukan.',
            ]);
        }

        $hunian = Hunian::query()
            ->whereKey($data['hunian_id'])
            ->lockForUpdate()
            ->first();

        if (! $hunian) {
            throw ValidationException::withMessages([
                'hunian_id' => 'Hunian tidak ditemukan.',
            ]);
        }

        $anggotaAktif = Penghunian::query()
            ->where('anggota_id', $data['anggota_id'])
            ->where('status', Penghunian::STATUS_AKTIF)
            ->when(
                $current,
                fn($query) => $query->where('id', '!=', $current->id)
            )
            ->exists();

        if ($anggotaAktif) {
            throw ValidationException::withMessages([
                'anggota_id' =>
                'Anggota ini masih memiliki penghunian aktif.',
            ]);
        }

        $hunianAktif = Penghunian::query()
            ->where('hunian_id', $data['hunian_id'])
            ->where('status', Penghunian::STATUS_AKTIF)
            ->when(
                $current,
                fn($query) => $query->where('id', '!=', $current->id)
            )
            ->exists();

        if ($hunianAktif) {
            throw ValidationException::withMessages([
                'hunian_id' =>
                'Hunian ini masih memiliki penghunian aktif.',
            ]);
        }

        $sedangPemeliharaan = DB::table('maintenance_hunian')
            ->where('hunian_id', $hunian->id)
            ->whereIn('status', ['dilaporkan', 'diproses'])
            ->exists();

        if ($sedangPemeliharaan) {
            throw ValidationException::withMessages([
                'hunian_id' =>
                'Hunian sedang dalam proses pemeliharaan dan tidak dapat dipilih.',
            ]);
        }

        if ($hunian->status_operasional !== 'tersedia') {
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
    }

    /**
     * SYNC STATUS HUNIAN
     */
    private function syncHunianStatus(int $hunianId): void
    {
        $hunian = Hunian::query()
            ->whereKey($hunianId)
            ->lockForUpdate()
            ->first();

        if (! $hunian) {
            return;
        }

        /*
         * Jangan menimpa status khusus yang dikelola oleh modul hunian
         * atau pemeliharaan.
         */
        if (in_array(
            $hunian->status_operasional,
            ['perbaikan', 'tidak_layak'],
            true
        )) {
            return;
        }

        $adaAktif = Penghunian::query()
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
