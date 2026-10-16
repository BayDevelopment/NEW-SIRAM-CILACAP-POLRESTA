import { Head, Link } from "@inertiajs/react";
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    Building2,
    CalendarClock,
    CheckCircle2,
    Clock3,
    Home,
    Landmark,
    Users,
    UserRound,
} from "lucide-react";

import { dashboard } from "@/routes";

type DashboardStats = {
    total_unit: number;
    total_hunian: number;
    hunian_tersedia: number;
    hunian_dihuni: number;
    hunian_perbaikan: number;
    total_anggota_aktif: number;
    total_penghunian_aktif: number;
    penghunian_akan_berakhir: number;
    penghunian_lewat_tanggal: number;
};

type DashboardUnit = {
    id: number;
    kode_unit: string;
    nama_unit: string;
    tipe_unit: string;
    parent?: {
        id: number;
        kode_unit: string;
        nama_unit: string;
        tipe_unit: string;
    } | null;
};

type PenghunianAktif = {
    id: number;
    status: string;
    tanggal_mulai: string | null;
    tanggal_selesai: string | null;
    sisa_hari: number | null;
    anggota: {
        id: number;
        nama_lengkap: string;
        nrp: string | null;
        pangkat: string | null;
        jabatan: string | null;
    } | null;
    hunian: {
        id: number;
        kode_hunian: string;
        nama_hunian: string | null;
        jenis_hunian: string;
        alamat: string | null;
    } | null;
};

type DashboardProps = {
    userRole: "superadmin" | "anggota";
    unitPengguna: number | null;
    unit: DashboardUnit | null;
    stats: DashboardStats;
    penghunianAktif: PenghunianAktif[];
};

const numberFormat = new Intl.NumberFormat("id-ID");

function formatNumber(value: number): string {
    return numberFormat.format(value ?? 0);
}

function formatTanggal(value: string | null): string {
    if (!value) return "Tidak ditentukan";

    const date = new Date(`${value.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
}

function getInitials(name: string | null | undefined): string {
    if (!name?.trim()) return "??";

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function getJenisHunian(jenis: string): string {
    const labels: Record<string, string> = {
        rumah_dinas: "Rumah Dinas",
        mes: "Mes",
        apartemen: "Apartemen",
    };

    return labels[jenis] ?? jenis.replaceAll("_", " ");
}

function getSisaWaktu(sisaHari: number | null): {
    label: string;
    className: string;
} {
    if (sisaHari === null) {
        return {
            label: "Tanpa batas tanggal",
            className:
                "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        };
    }

    if (sisaHari < 0) {
        return {
            label: `Lewat ${Math.abs(sisaHari)} hari`,
            className:
                "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        };
    }

    if (sisaHari === 0) {
        return {
            label: "Berakhir hari ini",
            className:
                "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        };
    }

    if (sisaHari <= 30) {
        return {
            label: `${sisaHari} hari lagi`,
            className:
                "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        };
    }

    return {
        label: `${sisaHari} hari lagi`,
        className:
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
}

function StatCard({
    title,
    value,
    description,
    icon: Icon,
    iconClass,
    decorationClass,
}: {
    title: string;
    value: number;
    description: string;
    icon: typeof Building2;
    iconClass: string;
    decorationClass: string;
}) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-sidebar-border/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-sidebar-border dark:bg-slate-900">
            <div
                className={`absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full ${decorationClass}`}
            />

            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">
                        {title}
                    </p>

                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0f2f5f] dark:text-white">
                        {formatNumber(value)}
                    </h2>

                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {description}
                    </p>
                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${iconClass}`}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard({
    userRole,
    unitPengguna,
    unit,
    stats,
    penghunianAktif,
}: DashboardProps) {
    const isSuperadmin = userRole === "superadmin";

    const roleLabel = isSuperadmin ? "Superadmin" : "Anggota";

    const unitLabel = isSuperadmin
        ? "Seluruh satuan"
        : unit
          ? unit.parent
              ? `${unit.nama_unit} · ${unit.parent.nama_unit}`
              : unit.nama_unit
          : unitPengguna
            ? "Unit tidak ditemukan"
            : "Unit belum ditetapkan";

    const cards = [
        {
            title: "Total Hunian",
            value: stats.total_hunian,
            description: "Hunian terdaftar",
            icon: Building2,
            iconClass: "bg-[#0f2f5f]",
            decorationClass: "bg-[#0f2f5f]/5",
        },
        {
            title: "Hunian Dihuni",
            value: stats.hunian_dihuni,
            description: "Status operasional dihuni",
            icon: Home,
            iconClass: "bg-emerald-600",
            decorationClass: "bg-emerald-500/5",
        },
        {
            title: "Hunian Tersedia",
            value: stats.hunian_tersedia,
            description: "Status operasional tersedia",
            icon: CheckCircle2,
            iconClass: "bg-[#d4af37]",
            decorationClass: "bg-[#d4af37]/10",
        },
        {
            title: "Penghunian Aktif",
            value: stats.total_penghunian_aktif,
            description: "Penempatan berstatus aktif",
            icon: Users,
            iconClass: "bg-blue-700",
            decorationClass: "bg-blue-500/5",
        },
    ];

    return (
        <>
            <Head title="Dashboard - SIRAM" />

            <div className="siram-stagger flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* HEADER */}
                <section className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
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
                            {isSuperadmin
                                ? "Pantau data hunian dan penghunian seluruh satuan."
                                : "Pantau data hunian dan penempatan di satuan Anda."}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-[#0f2f5f]/10 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2f5f] text-white">
                            {isSuperadmin ? (
                                <Landmark className="h-5 w-5" />
                            ) : (
                                <UserRound className="h-5 w-5" />
                            )}
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                                Role Pengguna
                            </p>

                            <p className="font-semibold text-[#0f2f5f] dark:text-white">
                                {roleLabel}
                            </p>

                            <p className="max-w-56 truncate text-xs text-muted-foreground">
                                {unitLabel}
                            </p>
                        </div>

                        <span className="ml-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                    </div>
                </section>

                {/* STATISTICS */}
                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[#0f2f5f] dark:text-white">
                            Ringkasan Sistem
                        </h2>

                        <span className="text-xs text-muted-foreground">
                            Data aktual
                        </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {cards.map((card) => (
                            <StatCard key={card.title} {...card} />
                        ))}
                    </div>
                </section>

                {/* SECONDARY STATISTICS */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-slate-900">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            <Users className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-muted-foreground">
                                Anggota Aktif
                            </p>
                            <p className="text-xl font-bold text-[#0f2f5f] dark:text-white">
                                {formatNumber(stats.total_anggota_aktif)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-slate-900">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2f5f]/5 text-[#0f2f5f] dark:bg-white/5 dark:text-blue-300">
                            <Landmark className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-muted-foreground">
                                {isSuperadmin ? "Total Unit" : "Unit Anda"}
                            </p>
                            <p className="text-xl font-bold text-[#0f2f5f] dark:text-white">
                                {formatNumber(stats.total_unit)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-slate-900">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            <CalendarClock className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-muted-foreground">
                                Berakhir dalam 30 Hari
                            </p>
                            <p className="text-xl font-bold text-[#0f2f5f] dark:text-white">
                                {formatNumber(stats.penghunian_akan_berakhir)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-slate-900">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                            <AlertTriangle className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-muted-foreground">
                                Lewat Tanggal Selesai
                            </p>
                            <p className="text-xl font-bold text-[#0f2f5f] dark:text-white">
                                {formatNumber(stats.penghunian_lewat_tanggal)}
                            </p>
                        </div>
                    </div>
                </section>

                {/* STATUS OPERASIONAL */}
                <section className="rounded-2xl border border-sidebar-border/70 bg-white shadow-sm dark:border-sidebar-border dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-sidebar-border/70 px-5 py-4 dark:border-sidebar-border">
                        <div>
                            <h2 className="font-semibold text-[#0f2f5f] dark:text-white">
                                Status Operasional Hunian
                            </h2>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Ringkasan ketersediaan dan pemeliharaan hunian
                            </p>
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f2f5f]/5 text-[#0f2f5f] dark:bg-white/5 dark:text-white">
                            <Building2 className="h-4 w-4" />
                        </div>
                    </div>

                    <div className="grid gap-5 p-5 md:grid-cols-3">
                        {[
                            {
                                label: "Tersedia",
                                value: stats.hunian_tersedia,
                                color: "bg-emerald-500",
                                text: "text-emerald-600 dark:text-emerald-400",
                            },
                            {
                                label: "Dihuni",
                                value: stats.hunian_dihuni,
                                color: "bg-blue-600",
                                text: "text-blue-700 dark:text-blue-300",
                            },
                            {
                                label: "Perbaikan",
                                value: stats.hunian_perbaikan,
                                color: "bg-amber-500",
                                text: "text-amber-700 dark:text-amber-400",
                            },
                        ].map((item) => {
                            const percentage =
                                stats.total_hunian > 0
                                    ? Math.min(
                                          100,
                                          (item.value / stats.total_hunian) *
                                              100,
                                      )
                                    : 0;

                            return (
                                <div key={item.label}>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`h-2.5 w-2.5 rounded-full ${item.color}`}
                                            />
                                            <span className="text-sm font-medium">
                                                {item.label}
                                            </span>
                                        </div>

                                        <span
                                            className={`text-sm font-semibold ${item.text}`}
                                        >
                                            {formatNumber(item.value)}
                                        </span>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                                            style={{
                                                width: `${percentage}%`,
                                            }}
                                        />
                                    </div>

                                    <p className="mt-1.5 text-right text-xs text-muted-foreground">
                                        {percentage.toFixed(1)}% dari total
                                        hunian
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ALERTS */}
                {(stats.penghunian_akan_berakhir > 0 ||
                    stats.penghunian_lewat_tanggal > 0) && (
                    <section className="grid gap-4 md:grid-cols-2">
                        {stats.penghunian_akan_berakhir > 0 && (
                            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                                <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />

                                <div>
                                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                        Penempatan akan berakhir
                                    </p>

                                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                                        Ada{" "}
                                        <strong>
                                            {formatNumber(
                                                stats.penghunian_akan_berakhir,
                                            )}
                                        </strong>{" "}
                                        penghunian yang tanggal selesainya
                                        berada dalam 30 hari ke depan.
                                    </p>
                                </div>
                            </div>
                        )}

                        {stats.penghunian_lewat_tanggal > 0 && (
                            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-900/60 dark:bg-red-950/20">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />

                                <div>
                                    <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                                        Perlu pemeriksaan penempatan
                                    </p>

                                    <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                                        Ada{" "}
                                        <strong>
                                            {formatNumber(
                                                stats.penghunian_lewat_tanggal,
                                            )}
                                        </strong>{" "}
                                        penghunian aktif yang melewati tanggal
                                        selesai. Status hunian tidak diubah
                                        otomatis.
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* PENGHUNIAN TERBARU */}
                <section className="overflow-hidden rounded-2xl border border-sidebar-border/70 bg-white shadow-sm dark:border-sidebar-border dark:bg-slate-900">
                    <div className="flex flex-col justify-between gap-3 border-b border-sidebar-border/70 px-5 py-4 dark:border-sidebar-border md:flex-row md:items-center">
                        <div>
                            <h2 className="font-semibold text-[#0f2f5f] dark:text-white">
                                Penghunian Aktif Terbaru
                            </h2>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Daftar penempatan terbaru beserta tanggal
                                berakhirnya
                            </p>
                        </div>

                        <Link
                            href="/penghunian"
                            className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-[#0f2f5f]/15 px-3 py-2 text-sm font-medium text-[#0f2f5f] transition-colors hover:bg-[#0f2f5f]/5 dark:border-white/10 dark:text-blue-300 dark:hover:bg-white/5 md:self-auto"
                        >
                            Lihat semua
                            <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {penghunianAktif.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f2f5f]/5 text-[#0f2f5f] dark:bg-white/5 dark:text-blue-300">
                                <Home className="h-7 w-7" />
                            </div>

                            <h3 className="mt-4 font-semibold text-[#0f2f5f] dark:text-white">
                                Belum ada penghunian aktif
                            </h3>

                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                Data penempatan yang berstatus aktif akan
                                ditampilkan di bagian ini.
                            </p>

                            <Link
                                href="/penghunian"
                                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0f2f5f] hover:text-[#d4af37] dark:text-blue-300"
                            >
                                Kelola penghunian
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-sm">
                                <thead>
                                    <tr className="border-b border-sidebar-border/70 bg-slate-50/70 text-left dark:border-sidebar-border dark:bg-slate-950/40">
                                        <th className="px-5 py-3 font-medium text-muted-foreground">
                                            Penghuni
                                        </th>

                                        <th className="px-5 py-3 font-medium text-muted-foreground">
                                            Hunian
                                        </th>

                                        <th className="px-5 py-3 font-medium text-muted-foreground">
                                            Tanggal Mulai
                                        </th>

                                        <th className="px-5 py-3 font-medium text-muted-foreground">
                                            Tanggal Selesai
                                        </th>

                                        <th className="px-5 py-3 font-medium text-muted-foreground">
                                            Sisa Waktu
                                        </th>

                                        <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                                            Status
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-sidebar-border/50 dark:divide-sidebar-border/50">
                                    {penghunianAktif.map((item) => {
                                        const waktu = getSisaWaktu(
                                            item.sisa_hari,
                                        );

                                        const lewatTanggal =
                                            item.sisa_hari !== null &&
                                            item.sisa_hari < 0;

                                        return (
                                            <tr
                                                key={item.id}
                                                className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f2f5f] text-xs font-bold text-white">
                                                            {getInitials(
                                                                item.anggota
                                                                    ?.nama_lengkap,
                                                            )}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-800 dark:text-white">
                                                                {item.anggota
                                                                    ?.nama_lengkap ??
                                                                    "Anggota tidak ditemukan"}
                                                            </p>

                                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                                {item.anggota
                                                                    ?.nrp
                                                                    ? `NRP ${item.anggota.nrp}`
                                                                    : "NRP tidak tersedia"}
                                                            </p>

                                                            {item.anggota
                                                                ?.pangkat && (
                                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                                    {
                                                                        item
                                                                            .anggota
                                                                            .pangkat
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                                        {item.hunian
                                                            ?.nama_hunian ||
                                                            item.hunian
                                                                ?.kode_hunian ||
                                                            "Hunian tidak ditemukan"}
                                                    </p>

                                                    {item.hunian && (
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {
                                                                item.hunian
                                                                    .kode_hunian
                                                            }{" "}
                                                            ·{" "}
                                                            {getJenisHunian(
                                                                item.hunian
                                                                    .jenis_hunian,
                                                            )}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                                                    {formatTanggal(
                                                        item.tanggal_mulai,
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                                                    {formatTanggal(
                                                        item.tanggal_selesai,
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${waktu.className}`}
                                                    >
                                                        {lewatTanggal ? (
                                                            <ArrowDownRight className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Clock3 className="h-3.5 w-3.5" />
                                                        )}
                                                        {waktu.label}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                        Aktif
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {penghunianAktif.length > 0 && (
                        <div className="flex flex-col justify-between gap-2 border-t border-sidebar-border/70 px-5 py-3 text-xs text-muted-foreground dark:border-sidebar-border sm:flex-row sm:items-center">
                            <span>
                                Menampilkan {penghunianAktif.length} penghunian
                                aktif terbaru.
                            </span>

                            <Link
                                href="/penghunian"
                                className="inline-flex items-center gap-1 font-medium text-[#0f2f5f] hover:text-[#d4af37] dark:text-blue-300"
                            >
                                Buka data penghunian
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </section>
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
