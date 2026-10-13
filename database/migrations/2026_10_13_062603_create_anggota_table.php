<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anggota', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->unique()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('unit_id')
                ->constrained('units')
                ->restrictOnDelete();

            $table->string('nrp', 30)->unique();
            $table->string('nama_lengkap', 150);

            $table->string('pangkat', 100)->nullable();
            $table->string('jabatan', 150)->nullable();

            $table->enum('jenis_kelamin', [
                'L',
                'P',
            ]);

            $table->string('tempat_lahir', 100)->nullable();
            $table->date('tanggal_lahir')->nullable();

            $table->string('no_hp', 30)->nullable();
            $table->string('email')->nullable();

            $table->text('alamat')->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['unit_id', 'is_active']);
            $table->index(['nama_lengkap']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anggota');
    }
};
