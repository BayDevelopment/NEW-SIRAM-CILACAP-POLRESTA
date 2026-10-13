<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_hunian', function (Blueprint $table) {
            $table->id();

            $table->foreignId('hunian_id')
                ->constrained('hunian')
                ->restrictOnDelete();

            $table->enum('jenis_kerusakan', [
                'ringan',
                'berat',
            ]);

            $table->string('judul', 200);
            $table->text('deskripsi');

            $table->date('tanggal_laporan');
            $table->date('tanggal_mulai')->nullable();
            $table->date('tanggal_selesai')->nullable();

            $table->decimal('estimasi_biaya', 15, 2)->nullable();
            $table->decimal('realisasi_biaya', 15, 2)->nullable();

            $table->enum('status', [
                'dilaporkan',
                'diproses',
                'selesai',
                'dibatalkan',
            ])->default('dilaporkan');

            $table->text('keterangan')->nullable();

            $table->foreignId('dilaporkan_oleh')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index([
                'hunian_id',
                'status',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_hunian');
    }
};
