<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('riwayat_pindah_hunian', function (Blueprint $table) {
            $table->id();

            $table->foreignId('anggota_id')
                ->constrained('anggota')
                ->restrictOnDelete();

            $table->foreignId('penghunian_id')
                ->nullable()
                ->constrained('penghunian')
                ->nullOnDelete();

            $table->foreignId('hunian_lama_id')
                ->constrained('hunian')
                ->restrictOnDelete();

            $table->foreignId('hunian_baru_id')
                ->constrained('hunian')
                ->restrictOnDelete();

            $table->date('tanggal_pindah');

            $table->text('alasan_pindah')->nullable();
            $table->text('keterangan')->nullable();

            $table->foreignId('diproses_oleh')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index([
                'anggota_id',
                'tanggal_pindah',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riwayat_pindah_hunian');
    }
};
