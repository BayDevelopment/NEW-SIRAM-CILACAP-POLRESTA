<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Batasi akses berdasarkan role pengguna.
     */
    public function handle(
        Request $request,
        Closure $next,
        string ...$roles
    ): Response {
        $user = $request->user();

        // Pengguna wajib login.
        if (! $user) {
            abort(401, 'Silakan login terlebih dahulu.');
        }

        // Akun yang tidak memiliki role yang sesuai ditolak.
        if (
            empty($user->role) ||
            ! in_array($user->role, $roles, true)
        ) {
            abort(403, 'Anda tidak memiliki akses ke halaman ini.');
        }

        // Admin Polsek wajib terhubung ke satuan.
        if (
            $user->role === 'admin_polsek' &&
            ! $user->unit_id
        ) {
            abort(403, 'Akun Anda belum terhubung ke satuan.');
        }

        return $next($request);
    }
}
