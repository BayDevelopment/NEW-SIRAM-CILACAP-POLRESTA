<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hunian', function (Blueprint $table) {
            $table->id();

            $table->foreignId('unit_id')
                ->constrained('units')
                ->restrictOnDelete();

            $table->string('kode_hunian', 50)->unique();

            $table->enum('jenis_hunian', [
                'rumah_dinas',
                'mes',
                'apartemen',
            ]);

            $table->string('nama_hunian', 150);

            $table->string('alamat');

            $table->string('blok', 50)->nullable();
            $table->string('nomor', 50)->nullable();

            $table->unsignedInteger('lantai')->nullable();
            $table->unsignedInteger('jumlah_kamar')->default(1);

            $table->decimal('luas_bangunan', 10, 2)->nullable();
            $table->decimal('luas_tanah', 10, 2)->nullable();

            $table->enum('kondisi', [
                'baik',
                'rusak_ringan',
                'rusak_berat',
            ])->default('baik');

            $table->enum('status_operasional', [
                'tersedia',
                'dihuni',
                'perbaikan',
                'tidak_layak',
            ])->default('tersedia');

            $table->text('keterangan')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index([
                'unit_id',
                'jenis_hunian',
                'kondisi',
            ]);

            $table->index([
                'status_operasional',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hunian');
    }
};
