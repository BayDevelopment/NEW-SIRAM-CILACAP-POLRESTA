<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dashboard extends Model
{
    /**
     * Model ini digunakan sebagai service query ringkasan dashboard.
     * Tidak menggunakan tabel dashboard khusus.
     */
    public $timestamps = false;

    protected $guarded = [];

    /**
     * Statistik umum sistem hunian.
     */
    public static function statistik(): array
    {
        return [
            'total_unit' => Unit::count(),
            'total_hunian' => Hunian::count(),
            'total_anggota' => Anggota::count(),
            'total_penghunian_aktif' => Penghunian::query()
                ->where('status', Penghunian::STATUS_AKTIF)
                ->count(),
        ];
    }
}
