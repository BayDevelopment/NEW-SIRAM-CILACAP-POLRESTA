<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    use HasFactory;

    protected $table = 'units';

    /**
     * Tipe unit dan prefix kodenya.
     */
    public const TIPE_PREFIX = [
        'polresta' => 'PRS',
        'polsek' => 'PSK',
        'bagian' => 'BAG',
        'satuan' => 'SAT',
    ];

    protected $fillable = [
        'kode_unit',
        'nama_unit',
        'tipe_unit',
        'alamat',
        'telepon',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Isi kode_unit otomatis saat data dibuat.
     */
    protected static function booted(): void
    {
        static::creating(function (Unit $unit) {
            if (blank($unit->kode_unit)) {
                $unit->kode_unit = static::generateKode($unit->tipe_unit);
            }
        });
    }

    /**
     * Buat kode berikutnya, contoh: SAT-001, PSK-012.
     */
    public static function generateKode(string $tipe): string
    {
        $prefix = self::TIPE_PREFIX[$tipe] ?? 'UNT';

        $terakhir = static::query()
            ->where('kode_unit', 'like', $prefix . '-%')
            ->orderByRaw('LENGTH(kode_unit) DESC')
            ->orderByDesc('kode_unit')
            ->value('kode_unit');

        $nomor = $terakhir
            ? ((int) substr($terakhir, strlen($prefix) + 1)) + 1
            : 1;

        return sprintf('%s-%03d', $prefix, $nomor);
    }

    public function hunian(): HasMany
    {
        return $this->hasMany(Hunian::class);
    }
}
