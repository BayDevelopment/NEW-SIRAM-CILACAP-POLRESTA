<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dokumen_penghunian', function (Blueprint $table) {
            $table->id();

            $table->foreignId('penghunian_id')
                ->constrained('penghunian')
                ->cascadeOnDelete();

            $table->enum('jenis_dokumen', [
                'surat_permohonan',
                'surat_penempatan',
                'surat_persetujuan',
                'berita_acara',
                'dokumen_lainnya',
            ]);

            $table->string('nama_dokumen', 200);
            $table->string('file_path');

            $table->string('file_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();

            $table->timestamps();

            $table->index([
                'penghunian_id',
                'jenis_dokumen',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dokumen_penghunian');
    }
};
