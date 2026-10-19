<?php

namespace App\Models\Scopes;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class UnitViaHunianScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        /** @var User|null $user */
        $user = Auth::user();

        // Query CLI diperbolehkan berjalan tanpa sesi autentikasi.
        if ($user === null) {
            if (! app()->runningInConsole()) {
                $builder->whereRaw('1 = 0');
            }

            return;
        }

        // Superadmin dapat melihat penghunian semua unit.
        if ($user->isSuperadmin()) {
            return;
        }

        // Role yang tidak dikenal dan anggota tanpa unit ditolak.
        if (
            $user->role !== 'anggota'
            || $user->unit_id === null
        ) {
            $builder->whereRaw('1 = 0');

            return;
        }

        $unitId = (int) $user->unit_id;

        /*
         * Penghunian harus terhubung dengan hunian dari unit pengguna.
         */
        $builder->whereHas(
            'hunian',
            function (Builder $query) use ($unitId): void {
                $query->where(
                    $query->getModel()->qualifyColumn('unit_id'),
                    $unitId
                );
            }
        );

        /*
         * Pastikan anggota yang terkait juga berasal dari unit pengguna.
         * Ini mencegah record dengan relasi anggota dan hunian yang
         * berbeda unit muncul di halaman penghunian.
         */
        $builder->whereHas(
            'anggota',
            function (Builder $query) use ($unitId): void {
                $query->where(
                    $query->getModel()->qualifyColumn('unit_id'),
                    $unitId
                );
            }
        );
    }
}
