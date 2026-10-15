<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class DokumenPenghunian extends Model
{
    protected $table = 'dokumen_penghunian';

    protected $fillable = [
        'penghunian_id',
        'jenis_dokumen',
        'nama_dokumen',
        'file_path',
        'file_type',
        'file_size',
    ];

    protected function casts(): array
    {
        return [
            'penghunian_id' => 'integer',
            'file_size' => 'integer',
        ];
    }

    public function penghunian(): BelongsTo
    {
        return $this->belongsTo(Penghunian::class, 'penghunian_id');
    }

    public function getFileUrlAttribute(): string
    {
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        return $disk->url($this->file_path);
    }

    public function getUkuranFileAttribute(): string
    {
        $bytes = (int) ($this->file_size ?? 0);

        if ($bytes < 1024) {
            return $bytes . ' B';
        }

        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 2) . ' KB';
        }

        return round($bytes / (1024 * 1024), 2) . ' MB';
    }
}
