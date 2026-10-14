<?php

use App\Http\Controllers\AnggotaController;
use App\Http\Controllers\HunianController;
use App\Http\Controllers\PenghunianController;
use App\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::resource('hunian', HunianController::class)
        ->except(['create', 'edit', 'show']);

    Route::resource('unit', UnitController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::resource('penghunian', PenghunianController::class)
        ->except(['create', 'show', 'edit']);

    Route::resource('anggota', AnggotaController::class)
        ->except(['create', 'show', 'edit']);
});

require __DIR__ . '/settings.php';
