<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Hunian extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'hunian';

    /**
     * Prefix kode hunian berdasarkan jenis.
     */
    public const KODE_PREFIX = [
        'rumah_dinas' => 'RD',
        'mes' => 'MS',
        'apartemen' => 'AP',
    ];

    protected $fillable = [
        'unit_id',
        'kode_hunian',
        'jenis_hunian',
        'nama_hunian',
        'alamat',
        'blok',
        'nomor',
        'lantai',
        'jumlah_kamar',
        'luas_bangunan',
        'luas_tanah',
        'kondisi',
        'status_operasional',
        'keterangan',
    ];

    protected function casts(): array
    {
        return [
            'unit_id' => 'integer',
            'lantai' => 'integer',
            'jumlah_kamar' => 'integer',
            'luas_bangunan' => 'decimal:2',
            'luas_tanah' => 'decimal:2',
        ];
    }

    /**
     * Isi kode_hunian otomatis saat data dibuat.
     */
    protected static function booted(): void
    {
        static::creating(function (Hunian $hunian) {
            if (blank($hunian->kode_hunian)) {
                $hunian->kode_hunian = static::generateKode($hunian->jenis_hunian);
            }
        });
    }

    /**
     * Buat kode berikutnya, contoh: RD-0001, MS-0012, AP-0003.
     *
     * Data yang sudah dihapus (soft delete) ikut dihitung, karena kolom
     * kode_hunian bersifat unik di database sehingga kodenya tidak boleh dipakai ulang.
     */
    public static function generateKode(string $jenis): string
    {
        $prefix = self::KODE_PREFIX[$jenis] ?? 'HN';

        $terakhir = static::withTrashed()
            ->where('kode_hunian', 'like', $prefix . '-%')
            ->orderByRaw('LENGTH(kode_hunian) DESC')
            ->orderByDesc('kode_hunian')
            ->value('kode_hunian');

        $nomor = $terakhir
            ? ((int) substr($terakhir, strlen($prefix) + 1)) + 1
            : 1;

        return sprintf('%s-%04d', $prefix, $nomor);
    }

    /**
     * Relasi ke Unit / Satuan.
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
