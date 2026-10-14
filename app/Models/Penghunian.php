<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Penghunian extends Model
{
    use SoftDeletes;

    protected $table = 'penghunian';

    public const STATUS_AKTIF = 'aktif';
    public const STATUS_SELESAI = 'selesai';
    public const STATUS_DIBATALKAN = 'dibatalkan';

    public const STATUS = [
        self::STATUS_AKTIF,
        self::STATUS_SELESAI,
        self::STATUS_DIBATALKAN,
    ];

    protected $fillable = [
        'anggota_id',
        'hunian_id',
        'tanggal_mulai',
        'tanggal_selesai',
        'status',
        'alasan_penghunian',
        'keterangan',
        'dokumen_perjanjian',
        'disetujui_oleh',
        'disetujui_at',
    ];

    protected $appends = ['dokumen_url'];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'date:Y-m-d',
            'tanggal_selesai' => 'date:Y-m-d',
            'disetujui_at' => 'datetime',
        ];
    }

    /* ------------------------------------------------------------------
     | RELATIONS
     * ---------------------------------------------------------------- */

    public function anggota(): BelongsTo
    {
        return $this->belongsTo(Anggota::class, 'anggota_id');
    }

    public function hunian(): BelongsTo
    {
        return $this->belongsTo(Hunian::class, 'hunian_id');
    }

    public function penyetuju(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disetujui_oleh');
    }

    /* ------------------------------------------------------------------
     | ACCESSORS
     * ---------------------------------------------------------------- */

    /**
     * URL dokumen perjanjian (butuh: php artisan storage:link).
     */
    protected function dokumenUrl(): Attribute
    {
        return Attribute::get(
            fn() => $this->dokumen_perjanjian
                ? asset('storage/' . $this->dokumen_perjanjian)
                : null
        );
    }
}
