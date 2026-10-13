<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penghunian', function (Blueprint $table) {
            $table->id();

            $table->foreignId('anggota_id')
                ->constrained('anggota')
                ->restrictOnDelete();

            $table->foreignId('hunian_id')
                ->constrained('hunian')
                ->restrictOnDelete();

            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');

            $table->enum('status', [
                'aktif',
                'selesai',
                'dibatalkan',
            ])->default('aktif');

            $table->text('alasan_penghunian')->nullable();
            $table->text('keterangan')->nullable();

            $table->string('dokumen_perjanjian')->nullable();

            $table->foreignId('disetujui_oleh')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('disetujui_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index([
                'anggota_id',
                'status',
            ]);

            $table->index([
                'hunian_id',
                'status',
            ]);

            $table->index([
                'tanggal_mulai',
                'tanggal_selesai',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penghunian');
    }
};
