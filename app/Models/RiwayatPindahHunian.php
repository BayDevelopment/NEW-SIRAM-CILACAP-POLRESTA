<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiwayatPindahHunian extends Model
{
    protected $table = 'riwayat_pindah_hunian';

    protected $fillable = [
        'anggota_id',
        'penghunian_id',
        'hunian_lama_id',
        'hunian_baru_id',
        'tanggal_pindah',
        'alasan_pindah',
        'keterangan',
        'diproses_oleh',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_pindah' => 'date:Y-m-d',
        ];
    }

    public function anggota(): BelongsTo
    {
        return $this->belongsTo(Anggota::class, 'anggota_id');
    }

    public function penghunian(): BelongsTo
    {
        return $this->belongsTo(Penghunian::class, 'penghunian_id');
    }

    public function hunianLama(): BelongsTo
    {
        return $this->belongsTo(Hunian::class, 'hunian_lama_id');
    }

    public function hunianBaru(): BelongsTo
    {
        return $this->belongsTo(Hunian::class, 'hunian_baru_id');
    }

    public function pemroses(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diproses_oleh');
    }
}
