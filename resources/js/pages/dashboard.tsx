import { Head } from "@inertiajs/react";
import {
    Building2,
    CheckCircle2,
    Clock3,
    Home,
    Users,
    Wrench,
    ArrowUpRight,
    UserRound,
} from "lucide-react";

import { dashboard } from "@/routes";

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard - SIRAM" />

            <div className="siram-stagger flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* =====================================================
                    HEADER
                ====================================================== */}
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <div className="mb-1 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#d4af37]" />

                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f2f5f] dark:text-blue-300">
                                    SIRAM POLRESTA CILACAP
                                </span>
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-[#0f2f5f] dark:text-white md:text-3xl">
                                Dashboard
                            </h1>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Selamat datang di Sistem Informasi Rumah Dinas,
                                Asrama, Mes & Apartemen.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-[#0f2f5f]/10 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f2f5f] text-white">
                                <UserRound className="h-4 w-4" />
                            </div>

                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Status Sistem
                                </p>

                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />

                                    <span className="text-sm font-semibold text-[#0f2f5f] dark:text-white">
                                        Sistem Aktif
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* =====================================================
                    STATISTICS
                ====================================================== */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {/* Total Hunian */}
                    <div className="group relative overflow-hidden rounded-2xl border border-sidebar-border/70 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-sidebar-border dark:bg-slate-900">
                        <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-[#0f2f5f]/5" />

                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Total Hunian
                                </p>

                                <h2 className="mt-2 text-3xl font-bold text-[#0f2f5f] dark:text-white">
                                    128
                                </h2>

                                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                    <Building2 className="h-3.5 w-3.5" />
                                    Seluruh data hunian
                                </p>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f2f5f] text-white shadow-sm">
                                <Building2 className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    {/* Hunian Terisi */}
                    <div className="group relative overflow-hidden rounded-2xl border border-sidebar-border/70 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-sidebar-border dark:bg-slate-900">
                        <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/5" />

                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Hunian Terisi
                                </p>

                                <h2 className="mt-2 text-3xl font-bold text-[#0f2f5f] dark:text-white">
                                    86
                                </h2>

                                <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Sedang dihuni
                                </p>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                <Home className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    {/* Hunian Tersedia */}
                    <div className="group relative overflow-hidden rounded-2xl border border-sidebar-border/70 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-sidebar-border dark:bg-slate-900">
                        <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-[#d4af37]/10" />

                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Hunian Tersedia
                                </p>

                                <h2 className="mt-2 text-3xl font-bold text-[#0f2f5f] dark:text-white">
                                    42
                                </h2>

                                <p className="mt-2 flex items-center gap-1 text-xs text-[#9b7b13] dark:text-[#d4af37]">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Belum ditempati
                                </p>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d4af37] text-white shadow-sm">
                                <Home className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    {/* Total Penghuni */}
                    <div className="group relative overflow-hidden rounded-2xl border border-sidebar-border/70 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-sidebar-border dark:bg-slate-900">
                        <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-blue-500/5" />

                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Total Penghuni
                                </p>

                                <h2 className="mt-2 text-3xl font-bold text-[#0f2f5f] dark:text-white">
                                    94
                                </h2>

                                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                    Penghuni aktif
                                </p>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* =====================================================
                    CONTENT GRID
                ====================================================== */}
                <div className="grid gap-6 xl:grid-cols-3">
                    {/* =================================================
                        KONDISI HUNIAN
                    ================================================== */}
                    <div className="rounded-2xl border border-sidebar-border/70 bg-white shadow-sm dark:border-sidebar-border dark:bg-slate-900 xl:col-span-2">
                        <div className="flex items-center justify-between border-b border-sidebar-border/70 px-5 py-4 dark:border-sidebar-border">
                            <div>
                                <h3 className="font-semibold text-[#0f2f5f] dark:text-white">
                                    Kondisi Hunian
                                </h3>

                                <p className="mt-1 text-xs text-muted-foreground">
                                    Rekap kondisi seluruh hunian yang terdaftar
                                </p>
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f2f5f]/5 text-[#0f2f5f] dark:bg-white/5 dark:text-white">
                                <Building2 className="h-4 w-4" />
                            </div>
                        </div>

                        <div className="space-y-6 p-5">
                            {/* Baik */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                                        <span className="text-sm font-medium">
                                            Baik
                                        </span>
                                    </div>

                                    <span className="text-sm font-semibold">
                                        98
                                    </span>
                                </div>

                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-emerald-500"
                                        style={{ width: "77%" }}
                                    />
                                </div>
                            </div>

                            {/* Rusak Ringan */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-[#d4af37]" />

                                        <span className="text-sm font-medium">
                                            Rusak Ringan
                                        </span>
                                    </div>

                                    <span className="text-sm font-semibold">
                                        21
                                    </span>
                                </div>

                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-[#d4af37]"
                                        style={{ width: "16%" }}
                                    />
                                </div>
                            </div>

                            {/* Rusak Berat */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

                                        <span className="text-sm font-medium">
                                            Rusak Berat
                                        </span>
                                    </div>

                                    <span className="text-sm font-semibold">
                                        9
                                    </span>
                                </div>

                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-red-500"
                                        style={{ width: "7%" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =================================================
                        AKTIVITAS
                    ================================================== */}
                    <div className="rounded-2xl border border-sidebar-border/70 bg-white shadow-sm dark:border-sidebar-border dark:bg-slate-900">
                        <div className="flex items-center justify-between border-b border-sidebar-border/70 px-5 py-4 dark:border-sidebar-border">
                            <div>
                                <h3 className="font-semibold text-[#0f2f5f] dark:text-white">
                                    Aktivitas Terbaru
                                </h3>

                                <p className="mt-1 text-xs text-muted-foreground">
                                    Aktivitas terbaru dalam sistem
                                </p>
                            </div>

                            <Clock3 className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                            <div className="flex gap-3 p-4">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                    <Home className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        Penghunian baru ditambahkan
                                    </p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Rumah Dinas A-012
                                    </p>

                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        10 menit yang lalu
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 p-4">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d4af37]/10 text-[#9b7b13] dark:text-[#d4af37]">
                                    <ArrowUpRight className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        Perpindahan penghuni
                                    </p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Dari Rumah A-005 ke Rumah B-002
                                    </p>

                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        1 jam yang lalu
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 p-4">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
                                    <Wrench className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        Pemeliharaan hunian
                                    </p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Rumah Dinas C-004
                                    </p>

                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        3 jam yang lalu
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* =====================================================
                    PENGHUNIAN TERBARU
                ====================================================== */}
                <div className="rounded-2xl border border-sidebar-border/70 bg-white shadow-sm dark:border-sidebar-border dark:bg-slate-900">
                    <div className="flex flex-col justify-between gap-3 border-b border-sidebar-border/70 px-5 py-4 dark:border-sidebar-border md:flex-row md:items-center">
                        <div>
                            <h3 className="font-semibold text-[#0f2f5f] dark:text-white">
                                Penghunian Terbaru
                            </h3>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Data penghuni yang terakhir ditempatkan pada
                                hunian
                            </p>
                        </div>

                        <button
                            type="button"
                            className="inline-flex items-center gap-1 text-sm font-medium text-[#0f2f5f] transition-colors hover:text-[#d4af37] dark:text-blue-300"
                        >
                            Lihat semua
                            <ArrowUpRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-sm">
                            <thead>
                                <tr className="border-b border-sidebar-border/70 text-left dark:border-sidebar-border">
                                    <th className="px-5 py-3 font-medium text-muted-foreground">
                                        Penghuni
                                    </th>

                                    <th className="px-5 py-3 font-medium text-muted-foreground">
                                        Hunian
                                    </th>

                                    <th className="px-5 py-3 font-medium text-muted-foreground">
                                        Unit
                                    </th>

                                    <th className="px-5 py-3 font-medium text-muted-foreground">
                                        Tanggal Mulai
                                    </th>

                                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                                        Status
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr className="border-b border-sidebar-border/50 last:border-0 dark:border-sidebar-border/50">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f2f5f] text-xs font-semibold text-white">
                                                BA
                                            </div>

                                            <div>
                                                <p className="font-medium">
                                                    Bripka Ahmad
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    NRP 87012345
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        Rumah Dinas A-012
                                    </td>

                                    <td className="px-5 py-4">
                                        Polresta Cilacap
                                    </td>

                                    <td className="px-5 py-4 text-muted-foreground">
                                        10 Oktober 2026
                                    </td>

                                    <td className="px-5 py-4 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Aktif
                                        </span>
                                    </td>
                                </tr>

                                <tr className="border-b border-sidebar-border/50 last:border-0 dark:border-sidebar-border/50">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f2f5f] text-xs font-semibold text-white">
                                                BS
                                            </div>

                                            <div>
                                                <p className="font-medium">
                                                    Briptu Budi Santoso
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    NRP 91023456
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        Mes Polsek Selatan
                                    </td>

                                    <td className="px-5 py-4">
                                        Polsek Cilacap Selatan
                                    </td>

                                    <td className="px-5 py-4 text-muted-foreground">
                                        08 Oktober 2026
                                    </td>

                                    <td className="px-5 py-4 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Aktif
                                        </span>
                                    </td>
                                </tr>

                                <tr>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f2f5f] text-xs font-semibold text-white">
                                                CR
                                            </div>

                                            <div>
                                                <p className="font-medium">
                                                    Aipda Candra
                                                </p>

                                                <p className="text-xs text-muted-foreground">
                                                    NRP 92034567
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        Apartemen B-07
                                    </td>

                                    <td className="px-5 py-4">
                                        Polresta Cilacap
                                    </td>

                                    <td className="px-5 py-4 text-muted-foreground">
                                        05 Oktober 2026
                                    </td>

                                    <td className="px-5 py-4 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Aktif
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: "Dashboard",
            href: dashboard(),
        },
    ],
};
