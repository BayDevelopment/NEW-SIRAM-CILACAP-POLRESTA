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

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Dashboard
    |--------------------------------------------------------------------------
    | Superadmin dan Anggota.
    */
    Route::middleware('role:superadmin,anggota')
        ->get('/dashboard', DashboardController::class)
        ->name('dashboard');

    /*
    |--------------------------------------------------------------------------
    | Data Unit / Satuan
    |--------------------------------------------------------------------------
    | Khusus Superadmin.
    */
    Route::middleware('role:superadmin')->group(function () {
        Route::resource('unit', UnitController::class)
            ->only(['index', 'store', 'update', 'destroy']);
    });

    /*
    |--------------------------------------------------------------------------
    | Data Hunian
    |--------------------------------------------------------------------------
    | Superadmin dan Anggota.
    | Pembatasan data berdasarkan unit wajib dilakukan di controller.
    */
    Route::middleware('role:superadmin,anggota')->group(function () {
        Route::resource('hunian', HunianController::class)
            ->except(['create', 'edit', 'show']);
    });

    /*
    |--------------------------------------------------------------------------
    | Data Anggota
    |--------------------------------------------------------------------------
    | Khusus Superadmin.
    */
    Route::middleware('role:superadmin')->group(function () {
        Route::resource('anggota', AnggotaController::class)
            ->except(['create', 'show', 'edit']);
    });

    /*
    |--------------------------------------------------------------------------
    | Data Penghunian
    |--------------------------------------------------------------------------
    | Superadmin dan Anggota.
    */
    Route::middleware('role:superadmin,anggota')->group(function () {
        Route::get(
            'penghunian/options/anggota',
            [PenghunianController::class, 'optionsAnggota']
        )->name('penghunian.options.anggota');

        Route::get(
            'penghunian/options/hunian',
            [PenghunianController::class, 'optionsHunian']
        )->name('penghunian.options.hunian');

        Route::resource('penghunian', PenghunianController::class)
            ->except(['create', 'show', 'edit']);
    });

    /*
    |--------------------------------------------------------------------------
    | Riwayat Pindah Hunian
    |--------------------------------------------------------------------------
    | Khusus Superadmin.
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
    | Superadmin dan Anggota.
    */
    Route::middleware('role:superadmin,anggota')->group(function () {
        Route::resource('pemeliharaan', MaintenanceHunianController::class)
            ->except(['create', 'show', 'edit']);
    });

    /*
    |--------------------------------------------------------------------------
    | Dokumen Penghunian
    |--------------------------------------------------------------------------
    | Khusus Superadmin.
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

require __DIR__ . '/settings.php';
