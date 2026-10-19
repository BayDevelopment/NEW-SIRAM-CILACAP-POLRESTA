<?php

use App\Http\Controllers\AnggotaController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DokumenPenghunianController;
use App\Http\Controllers\HunianController;
use App\Http\Controllers\MaintenanceHunianController;
use App\Http\Controllers\PenghunianController;
use App\Http\Controllers\RiwayatPindahHunianController;
use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Halaman Utama
|--------------------------------------------------------------------------
*/

Route::redirect('/', '/login')->name('home');

/*
|--------------------------------------------------------------------------
| Routes Pengguna Terautentikasi
|--------------------------------------------------------------------------
|
| Semua route berikut memerlukan autentikasi dan email terverifikasi.
| Hak akses selanjutnya diatur berdasarkan role pengguna.
|
*/

Route::middleware(['auth', 'verified'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Dashboard
    |--------------------------------------------------------------------------
    | Superadmin dan anggota.
    */

    Route::middleware('role:superadmin,anggota')
        ->get('/dashboard', DashboardController::class)
        ->name('dashboard');

    /*
    |--------------------------------------------------------------------------
    | Data Unit / Satuan
    |--------------------------------------------------------------------------
    | Khusus superadmin.
    */

    Route::middleware('role:superadmin')->group(function () {
        Route::resource('unit', UnitController::class)
            ->only(['index', 'store', 'update', 'destroy']);
    });

    /*
    |--------------------------------------------------------------------------
    | Data Hunian
    |--------------------------------------------------------------------------
    | Index:
    | - Superadmin dapat melihat semua unit.
    | - Anggota hanya boleh melihat unitnya sendiri melalui scope/controller.
    |
    | Mutasi:
    | - Store, update, destroy hanya superadmin.
    */

    Route::middleware('role:superadmin,anggota')->group(function () {
        Route::get('hunian', [HunianController::class, 'index'])
            ->name('hunian.index');
    });

    Route::middleware('role:superadmin')->group(function () {
        Route::resource('hunian', HunianController::class)
            ->only(['store', 'update', 'destroy']);
    });

    /*
    |--------------------------------------------------------------------------
    | Data Anggota
    |--------------------------------------------------------------------------
    | Seluruh operasi Data Anggota khusus superadmin.
    */

    Route::middleware('role:superadmin')->group(function () {
        Route::resource('anggota', AnggotaController::class)
            ->except(['create', 'show', 'edit']);
    });

    /*
    |--------------------------------------------------------------------------
    | Data Penghunian
    |--------------------------------------------------------------------------
    | Superadmin dan anggota.
    |
    | Batasan data per unit tetap wajib diterapkan oleh global scope,
    | validasi, dan PenghunianController.
    */

    Route::middleware('role:superadmin,anggota')->group(function () {
        /*
         * Endpoint pencarian anggota untuk dropdown Penghunian.
         */
        Route::get(
            'penghunian/options/anggota',
            [PenghunianController::class, 'optionsAnggota']
        )->name('penghunian.options.anggota');

        /*
         * Endpoint pencarian hunian untuk dropdown Penghunian.
         */
        Route::get(
            'penghunian/options/hunian',
            [PenghunianController::class, 'optionsHunian']
        )->name('penghunian.options.hunian');

        /*
         * Route yang dihasilkan:
         * GET     /penghunian
         * POST    /penghunian
         * PUT     /penghunian/{penghunian}
         * PATCH   /penghunian/{penghunian}
         * DELETE  /penghunian/{penghunian}
         */
        Route::resource('penghunian', PenghunianController::class)
            ->except(['create', 'show', 'edit']);
    });

    /*
    |--------------------------------------------------------------------------
    | Riwayat Pindah Hunian
    |--------------------------------------------------------------------------
    | Khusus superadmin.
    */

    Route::middleware('role:superadmin')->group(function () {
        Route::get(
            'riwayat-pindah/options/penghunian',
            [RiwayatPindahHunianController::class, 'penghunianOptions']
        )->name('riwayat-pindah.options.penghunian');

        Route::get(
            'riwayat-pindah/options/hunian',
            [RiwayatPindahHunianController::class, 'hunianOptions']
        )->name('riwayat-pindah.options.hunian');

        Route::resource(
            'riwayat-pindah',
            RiwayatPindahHunianController::class
        )->only(['index', 'store', 'destroy']);
    });

    /*
    |--------------------------------------------------------------------------
    | Data Pemeliharaan
    |--------------------------------------------------------------------------
    | Superadmin dan anggota.
    |
    | Anggota hanya boleh mengakses data pemeliharaan yang berada
    | dalam kewenangan unitnya. Pastikan controller dan global scope
    | memeriksa akses untuk index, store, update, dan destroy.
    */

    Route::middleware('role:superadmin,anggota')->group(function () {
        Route::resource(
            'pemeliharaan',
            MaintenanceHunianController::class
        )->except(['create', 'show', 'edit']);
    });

    /*
    |--------------------------------------------------------------------------
    | Dokumen Penghunian
    |--------------------------------------------------------------------------
    | Khusus superadmin.
    */

    Route::middleware('role:superadmin')->group(function () {
        Route::resource('dokumen', DokumenPenghunianController::class)
            ->except(['create', 'show', 'edit']);

        Route::get(
            '/dokumen/{dokumen}/download',
            [DokumenPenghunianController::class, 'download']
        )->name('dokumen.download');
    });
});

/*
|--------------------------------------------------------------------------
| Pengaturan Akun
|--------------------------------------------------------------------------
*/

require __DIR__ . '/settings.php';
