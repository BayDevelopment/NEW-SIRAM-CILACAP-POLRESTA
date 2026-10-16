<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Anggota extends Model
{
    use SoftDeletes;

    protected $table = 'anggota';

    protected $fillable = [
        'user_id',
        'unit_id',
        'nrp',
        'nama_lengkap',
        'pangkat',
        'jabatan',
        'jenis_kelamin',
        'tempat_lahir',
        'tanggal_lahir',
        'no_hp',
        'email',
        'alamat',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'unit_id' => 'integer',
            'tanggal_lahir' => 'date:Y-m-d',
            'is_active' => 'boolean',
        ];
    }

    /* ------------------------------------------------------------------
    | RELATIONS
    |-------------------------------------------------------------------*/

    /**
     * Akun pengguna yang terhubung dengan anggota.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Unit atau satuan tempat anggota terdaftar.
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    /**
     * Riwayat penghunian milik anggota.
     */
    public function penghunian(): HasMany
    {
        return $this->hasMany(Penghunian::class, 'anggota_id');
    }
}
