<?php

use App\Http\Controllers\AnggotaController;
use App\Http\Controllers\DokumenPenghunianController;
use App\Http\Controllers\HunianController;
use App\Http\Controllers\MaintenanceHunianController;
use App\Http\Controllers\PemeliharaanController;
use App\Http\Controllers\PenghunianController;
use App\Http\Controllers\RiwayatPindahHunianController;
use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    /*
    |--------------------------------------------------------------------------
    | Data Unit / Satuan
    |--------------------------------------------------------------------------
    */
    Route::resource('unit', UnitController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    /*
    |--------------------------------------------------------------------------
    | Data Hunian
    |--------------------------------------------------------------------------
    */
    Route::resource('hunian', HunianController::class)
        ->except(['create', 'edit', 'show']);

    /*
    |--------------------------------------------------------------------------
    | Data Anggota
    |--------------------------------------------------------------------------
    */
    Route::resource('anggota', AnggotaController::class)
        ->except(['create', 'show', 'edit'])
        ->parameters(['anggota' => 'anggota']);

    /*
    |--------------------------------------------------------------------------
    | Data Penghunian
    |--------------------------------------------------------------------------
    */
    Route::get(
        'penghunian/options/anggota',
        [PenghunianController::class, 'anggotaOptions']
    )->name('penghunian.options.anggota');

    Route::get(
        'penghunian/options/hunian',
        [PenghunianController::class, 'hunianOptions']
    )->name('penghunian.options.hunian');

    Route::resource('penghunian', PenghunianController::class)
        ->except(['create', 'show', 'edit']);

    /*
    |--------------------------------------------------------------------------
    | Riwayat Pindah Hunian
    |--------------------------------------------------------------------------
    */
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

    /*
    |--------------------------------------------------------------------------
    | Data Pemeliharaan
    |--------------------------------------------------------------------------
    */
    Route::resource('pemeliharaan', MaintenanceHunianController::class)
        ->except(['create', 'show', 'edit']);

    /*
    |--------------------------------------------------------------------------
    | Dokumen
    |--------------------------------------------------------------------------
    */
    Route::resource('dokumen', DokumenPenghunianController::class)
        ->except(['create', 'show', 'edit']);

    Route::get(
        '/dokumen/{dokumen}/download',
        [DokumenPenghunianController::class, 'download']
    )->name('dokumen.download');
});

require __DIR__ . '/settings.php';
