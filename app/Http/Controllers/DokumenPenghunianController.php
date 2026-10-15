<?php

namespace App\Http\Controllers;

use App\Models\DokumenPenghunian;
use App\Models\Penghunian;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DokumenPenghunianController extends Controller
{
    private const JENIS_DOKUMEN = [
        'surat_permohonan',
        'surat_penempatan',
        'surat_persetujuan',
        'berita_acara',
        'dokumen_lainnya',
    ];

    private const MAX_FILE_SIZE = 10240; // 10 MB

    public function index(Request $request): Response
    {
        $dokumen = DokumenPenghunian::query()
            ->with([
                'penghunian.hunian',
                'penghunian.anggota',
            ])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim($request->string('search')->toString());

                $query->where(function ($q) use ($search) {
                    $q->where('nama_dokumen', 'like', "%{$search}%")
                        ->orWhere('jenis_dokumen', 'like', "%{$search}%")
                        ->orWhereHas('penghunian', function ($penghunian) use ($search) {
                            $penghunian->whereHas('hunian', function ($hunian) use ($search) {
                                $hunian->where('kode_hunian', 'like', "%{$search}%")
                                    ->orWhere('nama_hunian', 'like', "%{$search}%");
                            })->orWhereHas('anggota', function ($anggota) use ($search) {
                                $anggota->where('nama_lengkap', 'like', "%{$search}%")
                                    ->orWhere('nrp', 'like', "%{$search}%");
                            });
                        });
                });
            })
            ->when($request->filled('jenis_dokumen'), function ($query) use ($request) {
                $query->where(
                    'jenis_dokumen',
                    $request->string('jenis_dokumen')->toString()
                );
            })
            ->when($request->filled('penghunian_id'), function ($query) use ($request) {
                $query->where(
                    'penghunian_id',
                    $request->integer('penghunian_id')
                );
            })
            ->latest('id')
            ->paginate(10)
            ->withQueryString();

        $penghunianOptions = Penghunian::query()
            ->with(['hunian', 'anggota'])
            ->latest('id')
            ->get()
            ->map(function (Penghunian $item) {
                $anggota = $item->anggota?->nama_lengkap
                    ?? $item->anggota?->nama
                    ?? 'Anggota tidak tersedia';

                $hunian = $item->hunian?->kode_hunian
                    ?? $item->hunian?->nama_hunian
                    ?? 'Hunian tidak tersedia';

                return [
                    'id' => $item->id,
                    'label' => "{$anggota} — {$hunian} (ID: {$item->id})",
                ];
            })
            ->values();

        $stats = [
            'total' => DokumenPenghunian::count(),
            'surat_permohonan' => DokumenPenghunian::where(
                'jenis_dokumen',
                'surat_permohonan'
            )->count(),
            'surat_penempatan' => DokumenPenghunian::where(
                'jenis_dokumen',
                'surat_penempatan'
            )->count(),
            'berita_acara' => DokumenPenghunian::where(
                'jenis_dokumen',
                'berita_acara'
            )->count(),
        ];

        return Inertia::render('dokumen/index', [
            'dokumen' => $dokumen,
            'penghunianOptions' => $penghunianOptions,
            'stats' => $stats,
            'filters' => [
                'search' => $request->input('search', ''),
                'jenis_dokumen' => $request->input('jenis_dokumen', ''),
                'penghunian_id' => $request->input('penghunian_id', ''),
            ],
            'jenisDokumen' => self::JENIS_DOKUMEN,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'penghunian_id' => [
                'required',
                'integer',
                'exists:penghunian,id',
            ],
            'jenis_dokumen' => [
                'required',
                Rule::in(self::JENIS_DOKUMEN),
            ],
            'nama_dokumen' => [
                'required',
                'string',
                'max:200',
            ],
            'file' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:' . self::MAX_FILE_SIZE,
            ],
        ], [
            'penghunian_id.required' => 'Data penghunian wajib dipilih.',
            'penghunian_id.exists' => 'Data penghunian tidak ditemukan.',
            'jenis_dokumen.required' => 'Jenis dokumen wajib dipilih.',
            'nama_dokumen.required' => 'Nama dokumen wajib diisi.',
            'file.required' => 'File dokumen wajib diunggah.',
            'file.mimes' => 'File harus berformat PDF, JPG, JPEG, atau PNG.',
            'file.max' => 'Ukuran file maksimal 10 MB.',
        ]);

        $file = $request->file('file');
        $path = $file->store('dokumen-penghunian', 'public');

        try {
            DB::transaction(function () use ($validated, $file, $path) {
                DokumenPenghunian::create([
                    'penghunian_id' => $validated['penghunian_id'],
                    'jenis_dokumen' => $validated['jenis_dokumen'],
                    'nama_dokumen' => $validated['nama_dokumen'],
                    'file_path' => $path,
                    'file_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                ]);
            });
        } catch (\Throwable $e) {
            Storage::disk('public')->delete($path);

            throw $e;
        }

        return to_route('dokumen.index')
            ->with('success', 'Dokumen penghunian berhasil diunggah.');
    }

    public function update(Request $request, DokumenPenghunian $dokumen): RedirectResponse
    {
        $validated = $request->validate([
            'penghunian_id' => [
                'required',
                'integer',
                'exists:penghunian,id',
            ],
            'jenis_dokumen' => [
                'required',
                Rule::in(self::JENIS_DOKUMEN),
            ],
            'nama_dokumen' => [
                'required',
                'string',
                'max:200',
            ],
            'file' => [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:' . self::MAX_FILE_SIZE,
            ],
        ], [
            'penghunian_id.required' => 'Data penghunian wajib dipilih.',
            'penghunian_id.exists' => 'Data penghunian tidak ditemukan.',
            'jenis_dokumen.required' => 'Jenis dokumen wajib dipilih.',
            'nama_dokumen.required' => 'Nama dokumen wajib diisi.',
            'file.mimes' => 'File harus berformat PDF, JPG, JPEG, atau PNG.',
            'file.max' => 'Ukuran file maksimal 10 MB.',
        ]);

        $oldPath = $dokumen->file_path;
        $newPath = null;
        $file = $request->file('file');

        if ($file) {
            $newPath = $file->store('dokumen-penghunian', 'public');
        }

        try {
            DB::transaction(function () use ($dokumen, $validated, $file, $newPath) {
                $dokumen->update([
                    'penghunian_id' => $validated['penghunian_id'],
                    'jenis_dokumen' => $validated['jenis_dokumen'],
                    'nama_dokumen' => $validated['nama_dokumen'],
                    ...($file ? [
                        'file_path' => $newPath,
                        'file_type' => $file->getMimeType(),
                        'file_size' => $file->getSize(),
                    ] : []),
                ]);
            });
        } catch (\Throwable $e) {
            if ($newPath) {
                Storage::disk('public')->delete($newPath);
            }

            throw $e;
        }

        if ($newPath && $oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return to_route('dokumen.index')
            ->with('success', 'Dokumen penghunian berhasil diperbarui.');
    }

    public function download(DokumenPenghunian $dokumen): BinaryFileResponse
    {
        $disk = Storage::disk('public');

        abort_unless(
            $disk->exists($dokumen->file_path),
            404,
            'File dokumen tidak ditemukan.'
        );

        $extension = pathinfo(
            $dokumen->file_path,
            PATHINFO_EXTENSION
        );

        $filename = str($dokumen->nama_dokumen)
            ->slug('_')
            ->append($extension ? ".{$extension}" : '')
            ->toString();

        return response()->download(
            $disk->path($dokumen->file_path),
            $filename
        );
    }

    public function destroy(DokumenPenghunian $dokumen): RedirectResponse
    {
        $path = $dokumen->file_path;

        DB::transaction(function () use ($dokumen) {
            $dokumen->delete();
        });

        Storage::disk('public')->delete($path);

        return to_route('dokumen.index')
            ->with('success', 'Dokumen penghunian berhasil dihapus.');
    }
}
