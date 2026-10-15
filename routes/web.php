<?php

use App\Http\Controllers\AnggotaController;
use App\Http\Controllers\HunianController;
use App\Http\Controllers\PenghunianController;
use App\Http\Controllers\RiwayatPindahHunianController;
use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::resource('hunian', HunianController::class)
        ->except(['create', 'edit', 'show']);

    Route::resource('unit', UnitController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    // Endpoint pencarian untuk dropdown (harus sebelum resource penghunian)
    Route::get('penghunian/options/anggota', [PenghunianController::class, 'anggotaOptions'])
        ->name('penghunian.options.anggota');
    Route::get('penghunian/options/hunian', [PenghunianController::class, 'hunianOptions'])
        ->name('penghunian.options.hunian');

    Route::resource('penghunian', PenghunianController::class)
        ->except(['create', 'show', 'edit']);

    Route::resource('anggota', AnggotaController::class)
        ->except(['create', 'show', 'edit'])
        ->parameters(['anggota' => 'anggota']);

    // riwayat pindah
    Route::get('riwayat-pindah/options/penghunian', [RiwayatPindahHunianController::class, 'penghunianOptions'])
        ->name('riwayat-pindah.options.penghunian');
    Route::get('riwayat-pindah/options/hunian', [RiwayatPindahHunianController::class, 'hunianOptions'])
        ->name('riwayat-pindah.options.hunian');

    Route::resource('riwayat-pindah', RiwayatPindahHunianController::class)
        ->only(['index', 'store', 'destroy']);
});

require __DIR__ . '/settings.php';
