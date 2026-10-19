<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Silakan login terlebih dahulu.');
        }

        // Akun nonaktif di-logout.
        if ($user->status_akun !== 'active') {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()
                ->route('login')
                ->withErrors(['email' => 'Akun Anda tidak aktif.']);
        }

        if (empty($user->role) || ! in_array($user->role, $roles, true)) {
            abort(403, 'Anda tidak memiliki akses ke halaman ini.');
        }

        // Anggota (Polsek) wajib terhubung ke satuan.
        if ($user->role === 'anggota' && ! $user->unit_id) {
            abort(403, 'Akun Anda belum terhubung ke satuan.');
        }

        return $next($request);
    }
}
