<?php

namespace App\Models\Scopes;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class UnitScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        /** @var User|null $user */
        $user = Auth::user();

        /*
         * Dalam proses CLI, seperti Artisan atau seeder, autentikasi
         * biasanya tidak tersedia. Biarkan query CLI berjalan normal.
         *
         * Pada request web tanpa autentikasi, jangan tampilkan data.
         * Route aplikasi tetap wajib memakai middleware auth.
         */
        if ($user === null) {
            if (! app()->runningInConsole()) {
                $builder->whereRaw('1 = 0');
            }

            return;
        }

        // Superadmin memiliki akses lintas unit.
        if ($user->isSuperadmin()) {
            return;
        }

        /*
         * Hanya role anggota yang diperbolehkan menggunakan cakupan unit.
         * Role lain atau anggota tanpa unit harus gagal secara aman.
         */
        if (
            $user->role !== 'anggota'
            || $user->unit_id === null
        ) {
            $builder->whereRaw('1 = 0');

            return;
        }

        // Batasi data pada unit milik anggota yang sedang login.
        $builder->where(
            $model->qualifyColumn('unit_id'),
            (int) $user->unit_id
        );
    }
}
