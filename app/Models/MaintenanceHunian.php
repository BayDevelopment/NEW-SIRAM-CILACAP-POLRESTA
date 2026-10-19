<?php

namespace App\Models;

use App\Models\Scopes\UnitViaHunianScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[ScopedBy([UnitViaHunianScope::class])]
class MaintenanceHunian extends Model
{
    protected $table = 'maintenance_hunian';

    protected $fillable = [
        'hunian_id',
        'jenis_kerusakan',
        'judul',
        'deskripsi',
        'tanggal_laporan',
        'tanggal_mulai',
        'tanggal_selesai',
        'estimasi_biaya',
        'realisasi_biaya',
        'status',
        'keterangan',
        'dilaporkan_oleh',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_laporan' => 'date',
            'tanggal_mulai' => 'date',
            'tanggal_selesai' => 'date',
            'estimasi_biaya' => 'decimal:2',
            'realisasi_biaya' => 'decimal:2',
        ];
    }

    public function hunian(): BelongsTo
    {
        return $this->belongsTo(Hunian::class, 'hunian_id');
    }

    public function pelapor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dilaporkan_oleh');
    }
}
