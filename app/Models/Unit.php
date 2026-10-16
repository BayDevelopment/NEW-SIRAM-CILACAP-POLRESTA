<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'parent_id',
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
            'parent_id' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Isi kode_unit otomatis saat data dibuat.
     */
    protected static function booted(): void
    {
        static::creating(function (Unit $unit): void {
            if (blank($unit->kode_unit)) {
                $unit->kode_unit = static::generateKode(
                    $unit->tipe_unit
                );
            }
        });

        static::saving(function (Unit $unit): void {
            // Polresta merupakan unit induk.
            if ($unit->tipe_unit === 'polresta') {
                $unit->parent_id = null;
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

    /* ------------------------------------------------------------------
    | RELASI HIERARKI UNIT
    |-------------------------------------------------------------------*/

    /**
     * Unit induk, misalnya Polresta dari suatu Polsek.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Unit-unit anak di bawah unit ini.
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * Polsek yang berada di bawah Polresta ini.
     */
    public function polseks(): HasMany
    {
        return $this->children()
            ->where('tipe_unit', 'polsek');
    }

    /* ------------------------------------------------------------------
    | RELASI DATA TERKAIT
    |-------------------------------------------------------------------*/

    /**
     * Hunian yang terdaftar pada unit ini.
     */
    public function hunian(): HasMany
    {
        return $this->hasMany(Hunian::class, 'unit_id');
    }

    /**
     * Pengguna yang terdaftar pada unit ini.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'unit_id');
    }

    /**
     * Anggota yang terdaftar pada unit ini.
     */
    public function anggota(): HasMany
    {
        return $this->hasMany(Anggota::class, 'unit_id');
    }
}
