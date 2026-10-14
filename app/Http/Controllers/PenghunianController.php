<?php

namespace App\Http\Controllers;

use App\Models\Anggota;
use App\Models\Hunian;
use App\Models\Penghunian;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PenghunianController extends Controller
{
    /* ------------------------------------------------------------------
     | INDEX
     * ---------------------------------------------------------------- */

    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $status = (string) $request->input('status', '');

        $penghunian = Penghunian::query()
            ->with([
                'anggota:id,nama,nrp',
                'hunian:id,unit_id,kode_hunian,nama_hunian',
                'hunian.unit:id,nama_unit',
                'penyetuju:id,name',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->whereHas('anggota', function ($q) use ($search) {
                            $q->where('nama', 'like', "%{$search}%")
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

        return Inertia::render('penghunian/index', [
            'penghunian' => $penghunian,

            'stats' => [
                'total' => (int) $counts->sum(),
                'aktif' => (int) ($counts[Penghunian::STATUS_AKTIF] ?? 0),
                'selesai' => (int) ($counts[Penghunian::STATUS_SELESAI] ?? 0),
                'dibatalkan' => (int) ($counts[Penghunian::STATUS_DIBATALKAN] ?? 0),
            ],

            'anggotaOptions' => Anggota::query()
                ->orderBy('nama')
                ->get(['id', 'nama', 'nrp']),

            'hunianOptions' => Hunian::query()
                ->with('unit:id,nama_unit')
                ->whereIn('status_operasional', ['tersedia', 'dihuni'])
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
        ]);
    }

    /* ------------------------------------------------------------------
     | STORE
     * ---------------------------------------------------------------- */

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules(), [], $this->attributes());

        DB::transaction(function () use ($request, $data) {
            $this->ensureNoConflict($data);

            if ($request->hasFile('dokumen_perjanjian')) {
                $data['dokumen_perjanjian'] = $request
                    ->file('dokumen_perjanjian')
                    ->store('penghunian/dokumen', 'public');
            } else {
                unset($data['dokumen_perjanjian']);
            }

            if ($data['status'] === Penghunian::STATUS_AKTIF) {
                $data['disetujui_oleh'] = $request->user()?->id;
                $data['disetujui_at'] = now();
            }

            $penghunian = Penghunian::create($data);

            $this->syncHunianStatus($penghunian->hunian_id);
        });

        return back()->with('success', 'Data penghunian berhasil ditambahkan.');
    }

    /* ------------------------------------------------------------------
     | UPDATE
     * ---------------------------------------------------------------- */

    public function update(Request $request, Penghunian $penghunian): RedirectResponse
    {
        $data = $request->validate($this->rules(), [], $this->attributes());

        DB::transaction(function () use ($request, $penghunian, $data) {
            $this->ensureNoConflict($data, $penghunian);

            $oldHunianId = $penghunian->hunian_id;

            if ($request->hasFile('dokumen_perjanjian')) {
                if ($penghunian->dokumen_perjanjian) {
                    Storage::disk('public')->delete($penghunian->dokumen_perjanjian);
                }

                $data['dokumen_perjanjian'] = $request
                    ->file('dokumen_perjanjian')
                    ->store('penghunian/dokumen', 'public');
            } else {
                unset($data['dokumen_perjanjian']);
            }

            if (
                $data['status'] === Penghunian::STATUS_AKTIF
                && $penghunian->disetujui_at === null
            ) {
                $data['disetujui_oleh'] = $request->user()?->id;
                $data['disetujui_at'] = now();
            }

            $penghunian->update($data);

            foreach (array_unique([$oldHunianId, (int) $penghunian->hunian_id]) as $id) {
                $this->syncHunianStatus($id);
            }
        });

        return back()->with('success', 'Data penghunian berhasil diperbarui.');
    }

    /* ------------------------------------------------------------------
     | DESTROY (soft delete)
     * ---------------------------------------------------------------- */

    public function destroy(Penghunian $penghunian): RedirectResponse
    {
        DB::transaction(function () use ($penghunian) {
            $hunianId = $penghunian->hunian_id;

            $penghunian->delete();

            $this->syncHunianStatus($hunianId);
        });

        return back()->with('success', 'Data penghunian berhasil dihapus.');
    }

    /* ------------------------------------------------------------------
     | HELPERS
     * ---------------------------------------------------------------- */

    private function rules(): array
    {
        return [
            'anggota_id' => ['required', 'integer', 'exists:anggota,id'],
            'hunian_id' => ['required', 'integer', 'exists:hunian,id'],
            'tanggal_mulai' => ['required', 'date'],
            'tanggal_selesai' => ['required', 'date', 'after_or_equal:tanggal_mulai'],
            'status' => ['required', Rule::in(Penghunian::STATUS)],
            'alasan_penghunian' => ['nullable', 'string', 'max:2000'],
            'keterangan' => ['nullable', 'string', 'max:2000'],
            'dokumen_perjanjian' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
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

    /**
     * Pastikan satu anggota / satu hunian tidak punya dua penghunian aktif,
     * dan hunian yang dipilih memang layak dihuni.
     */
    private function ensureNoConflict(array $data, ?Penghunian $current = null): void
    {
        if ($data['status'] !== Penghunian::STATUS_AKTIF) {
            return;
        }

        $anggotaAktif = Penghunian::query()
            ->where('anggota_id', $data['anggota_id'])
            ->where('status', Penghunian::STATUS_AKTIF)
            ->when($current, fn($q) => $q->whereKeyNot($current->id))
            ->exists();

        if ($anggotaAktif) {
            throw ValidationException::withMessages([
                'anggota_id' => 'Anggota ini masih memiliki penghunian aktif.',
            ]);
        }

        $hunianAktif = Penghunian::query()
            ->where('hunian_id', $data['hunian_id'])
            ->where('status', Penghunian::STATUS_AKTIF)
            ->when($current, fn($q) => $q->whereKeyNot($current->id))
            ->exists();

        if ($hunianAktif) {
            throw ValidationException::withMessages([
                'hunian_id' => 'Hunian ini sedang dihuni (masih ada penghunian aktif).',
            ]);
        }

        $hunian = Hunian::query()
            ->whereKey($data['hunian_id'])
            ->lockForUpdate()
            ->first();

        if ($hunian && in_array($hunian->status_operasional, ['perbaikan', 'tidak_layak'], true)) {
            $label = $hunian->status_operasional === 'perbaikan'
                ? 'dalam perbaikan'
                : 'tidak layak huni';

            throw ValidationException::withMessages([
                'hunian_id' => "Hunian ini {$label} sehingga tidak dapat dihuni.",
            ]);
        }
    }

    /**
     * Sinkronkan status_operasional hunian dengan penghunian aktif.
     * Status "perbaikan" dan "tidak_layak" tidak pernah ditimpa.
     */
    private function syncHunianStatus(int $hunianId): void
    {
        $hunian = Hunian::query()->find($hunianId);

        if (! $hunian) {
            return;
        }

        $adaAktif = Penghunian::query()
            ->where('hunian_id', $hunianId)
            ->where('status', Penghunian::STATUS_AKTIF)
            ->exists();

        if ($adaAktif && $hunian->status_operasional === 'tersedia') {
            Hunian::query()->whereKey($hunianId)->update(['status_operasional' => 'dihuni']);
        }

        if (! $adaAktif && $hunian->status_operasional === 'dihuni') {
            Hunian::query()->whereKey($hunianId)->update(['status_operasional' => 'tersedia']);
        }
    }
}
