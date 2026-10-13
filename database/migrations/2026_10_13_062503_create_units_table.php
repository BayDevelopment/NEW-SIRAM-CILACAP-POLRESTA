<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();

            $table->string('kode_unit', 30)->unique();
            $table->string('nama_unit', 150);

            $table->enum('tipe_unit', [
                'polresta',
                'polsek',
                'bagian',
                'satuan',
            ]);

            $table->string('alamat')->nullable();
            $table->string('telepon', 30)->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index(['tipe_unit', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
