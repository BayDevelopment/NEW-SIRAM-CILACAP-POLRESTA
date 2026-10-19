import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Edit3,
    Eye,
    Filter,
    Loader2,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

/* ============================================================================
   TYPE
============================================================================ */

type Unit = { id: number; nama_unit: string };

type Hunian = {
    id: number;
    unit_id: number;
    kode_hunian: string;
    jenis_hunian: "rumah_dinas" | "mes" | "apartemen";
    nama_hunian: string;
    alamat: string;
    blok: string | null;
    nomor: string | null;
    lantai: number | null;
    jumlah_kamar: number;
    luas_bangunan: string | null;
    luas_tanah: string | null;
    kondisi: "baik" | "rusak_ringan" | "rusak_berat";
    status_operasional: "tersedia" | "dihuni" | "perbaikan" | "tidak_layak";
    keterangan: string | null;
    unit?: Unit;
    created_at: string;
};

type PaginationLink = { url: string | null; label: string; active: boolean };

type PaginatedHunian = {
    data: Hunian[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
};

type Filters = {
    search: string;
    jenis_hunian: string;
    kondisi: string;
    status_operasional: string;
};

type Stats = {
    total: number;
    tersedia: number;
    dihuni: number;
    perbaikan: number;
};

type Flash = {
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
};

type AuthUser = {
    role?: string | { name?: string } | null;
    unit_id?: number | null;
} | null;

type PageProps = {
    hunian: PaginatedHunian;
    units: Unit[];
    stats: Stats;
    filters: Filters;
    can: { manage: boolean };
    flash?: Flash;
    auth?: { user?: AuthUser };
    errors?: Record<string, string>;
};

type HunianForm = {
    unit_id: string;
    kode_hunian: string;
    jenis_hunian: string;
    nama_hunian: string;
    alamat: string;
    blok: string;
    nomor: string;
    lantai: string;
    jumlah_kamar: string;
    luas_bangunan: string;
    luas_tanah: string;
    kondisi: string;
    status_operasional: string;
    keterangan: string;
};

type ModalState =
    | { type: "create" }
    | { type: "edit"; item: Hunian }
    | { type: "show"; item: Hunian }
    | { type: "delete"; item: Hunian }
    | null;

/* ============================================================================
   CONSTANT
============================================================================ */

const EMPTY_FORM: HunianForm = {
    unit_id: "",
    kode_hunian: "",
    jenis_hunian: "rumah_dinas",
    nama_hunian: "",
    alamat: "",
    blok: "",
    nomor: "",
    lantai: "",
    jumlah_kamar: "1",
    luas_bangunan: "",
    luas_tanah: "",
    kondisi: "baik",
    status_operasional: "tersedia",
    keterangan: "",
};

const JENIS: Record<string, string> = {
    rumah_dinas: "Rumah Dinas",
    mes: "Mes / Asrama",
    apartemen: "Apartemen",
};

const KONDISI: Record<string, string> = {
    baik: "Baik",
    rusak_ringan: "Rusak Ringan",
    rusak_berat: "Rusak Berat",
};

const STATUS: Record<string, string> = {
    tersedia: "Tersedia",
    dihuni: "Dihuni",
    perbaikan: "Perbaikan",
    tidak_layak: "Tidak Layak",
};

// Hunian baru: kerusakan dan perbaikan dicatat lewat menu Pemeliharaan,
// status dihuni ditentukan lewat menu Penghunian.
const KONDISI_BARU: Record<string, string> = {
    baik: KONDISI.baik,
};

const STATUS_BARU: Record<string, string> = {
    tersedia: STATUS.tersedia,
    tidak_layak: STATUS.tidak_layak,
};

const inputBase =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#0f2f5f] focus:outline-none focus:ring-2 focus:ring-[#0f2f5f]/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800";

const selectBase =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#0f2f5f] focus:outline-none focus:ring-2 focus:ring-[#0f2f5f]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

const textareaBase =
    "w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#0f2f5f] focus:outline-none focus:ring-2 focus:ring-[#0f2f5f]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

const th =
    "px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500";

/* ============================================================================
   HELPER
============================================================================ */

const toStr = (value: unknown): string =>
    value === null || value === undefined ? "" : String(value);

const label = (map: Record<string, string>, value: string): string =>
    map[value] ?? value;

function kondisiClass(value: string): string {
    if (value === "baik") {
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    }

    if (value === "rusak_ringan") {
        return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
    }

    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
}

function statusClass(value: string): string {
    if (value === "tersedia") {
        return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
    }

    if (value === "dihuni") {
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    }

    if (value === "perbaikan") {
        return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
    }

    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
}

function toFormData(item: Hunian): HunianForm {
    return {
        unit_id: toStr(item.unit_id),
        kode_hunian: item.kode_hunian,
        jenis_hunian: item.jenis_hunian,
        nama_hunian: item.nama_hunian,
        alamat: item.alamat,
        blok: toStr(item.blok),
        nomor: toStr(item.nomor),
        lantai: toStr(item.lantai),
        jumlah_kamar: toStr(item.jumlah_kamar || 1),
        luas_bangunan: toStr(item.luas_bangunan),
        luas_tanah: toStr(item.luas_tanah),
        kondisi: item.kondisi,
        status_operasional: item.status_operasional,
        keterangan: toStr(item.keterangan),
    };
}

function Options({ map }: { map: Record<string, string> }) {
    return (
        <>
            {Object.entries(map).map(([value, text]) => (
                <option key={value} value={value}>
                    {text}
                </option>
            ))}
        </>
    );
}

/* ============================================================================
   SMALL COMPONENT
============================================================================ */

function Field({
    label: text,
    required = false,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {text}
                {required && <span className="ml-1 text-red-500">*</span>}
            </label>

            {children}

            {error && (
                <p className="text-xs font-medium text-red-500">{error}</p>
            )}
        </div>
    );
}

function Modal({
    open,
    title,
    description,
    children,
    onClose,
    width = "max-w-4xl",
}: {
    open: boolean;
    title: string;
    description?: string;
    children: ReactNode;
    onClose: () => void;
    width?: string;
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                className={`relative z-10 max-h-[92vh] w-full ${width} overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900`}
            >
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {title}
                        </h2>

                        {description && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {description}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-[calc(92vh-80px)] overflow-y-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: number;
    icon: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {title}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                        {value}
                    </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f2f5f]/10 text-[#0f2f5f] dark:bg-[#d4af37]/10 dark:text-[#d4af37]">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function ActionButton({
    children,
    title,
    onClick,
    danger = false,
}: {
    children: ReactNode;
    title: string;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`rounded-lg p-2 transition ${
                danger
                    ? "text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    : "text-slate-500 hover:bg-[#0f2f5f]/10 hover:text-[#0f2f5f] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
        >
            {children}
        </button>
    );
}

function DetailItem({ label: text, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {text}
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                {value}
            </p>
        </div>
    );
}

/* ============================================================================
   PAGE
============================================================================ */

export default function HunianIndex() {
    const { hunian, units, stats, filters, can, flash, auth } =
        usePage<PageProps>().props;

    /* ------------------------------------------------------------------------
       ROLE
       - superadmin : melihat semua unit, boleh tambah / ubah / hapus
       - anggota    : hanya melihat hunian satuannya sendiri
       Keamanan sebenarnya ada di routes dan controller.
    ------------------------------------------------------------------------ */

    const rawRole = auth?.user?.role;
    const role = typeof rawRole === "string" ? rawRole : (rawRole?.name ?? "");

    const isSuperadmin = role === "superadmin";
    const isAnggota = role === "anggota";

    const canManage = can?.manage === true;

    const [modal, setModal] = useState<ModalState>(null);

    const [search, setSearch] = useState(filters.search ?? "");
    const [jenisFilter, setJenisFilter] = useState(filters.jenis_hunian ?? "");
    const [kondisiFilter, setKondisiFilter] = useState(filters.kondisi ?? "");
    const [statusFilter, setStatusFilter] = useState(
        filters.status_operasional ?? "",
    );

    const [deleting, setDeleting] = useState(false);

    const form = useForm<HunianForm>(EMPTY_FORM);

    const isCreate = modal?.type === "create";

    /* ------------------------------------------------------------------------
       FLASH TOAST
    ------------------------------------------------------------------------ */

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.warning) toast.warning(flash.warning);
        if (flash?.info) toast.info(flash.info);
    }, [flash]);

    /* ------------------------------------------------------------------------
       MODAL
    ------------------------------------------------------------------------ */

    const closeModal = () => {
        setModal(null);
        form.reset();
        form.clearErrors();
    };

    const openCreate = () => {
        if (!canManage) return;

        form.reset();
        form.clearErrors();

        form.setData({
            ...EMPTY_FORM,
            unit_id: units.length > 0 ? String(units[0].id) : "",
        });

        setModal({ type: "create" });
    };

    const openEdit = (item: Hunian) => {
        if (!canManage) return;

        form.clearErrors();
        form.setData(toFormData(item));
        setModal({ type: "edit", item });
    };

    const openShow = (item: Hunian) => setModal({ type: "show", item });

    const openDelete = (item: Hunian) => {
        if (!canManage) return;

        setModal({ type: "delete", item });
    };

    /* ------------------------------------------------------------------------
       SUBMIT
    ------------------------------------------------------------------------ */

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canManage) return;

        // kode_hunian dibuat otomatis dan tidak boleh diubah.
        form.transform((data) => {
            const { kode_hunian: _kode, ...rest } = data;

            return rest as HunianForm;
        });

        if (modal?.type === "create") {
            form.post("/hunian", {
                preserveScroll: true,
                onSuccess: closeModal,
            });

            return;
        }

        if (modal?.type === "edit") {
            form.put(`/hunian/${modal.item.id}`, {
                preserveScroll: true,
                onSuccess: closeModal,
            });
        }
    };

    /* ------------------------------------------------------------------------
       DELETE
    ------------------------------------------------------------------------ */

    const deleteHunian = () => {
        if (!canManage || modal?.type !== "delete") return;

        setDeleting(true);

        router.delete(`/hunian/${modal.item.id}`, {
            preserveScroll: true,
            onSuccess: closeModal,
            onError: (errors) => {
                const first = Object.values(errors)[0];

                if (first) toast.error(first);

                closeModal();
            },
            onFinish: () => setDeleting(false),
        });
    };

    /* ------------------------------------------------------------------------
       FILTER
    ------------------------------------------------------------------------ */

    const applyFilter = () => {
        router.get(
            "/hunian",
            {
                search: search || undefined,
                jenis_hunian: jenisFilter || undefined,
                kondisi: kondisiFilter || undefined,
                status_operasional: statusFilter || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const resetFilter = () => {
        setSearch("");
        setJenisFilter("");
        setKondisiFilter("");
        setStatusFilter("");

        router.get(
            "/hunian",
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    /* ------------------------------------------------------------------------
       RENDER
    ------------------------------------------------------------------------ */

    return (
        <>
            <Head title="Data Hunian" />

            <div className="siram-stagger flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* HEADER */}

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Building2 className="h-4 w-4" />
                            <span>Data Master</span>
                            <span>/</span>
                            <span className="font-medium text-[#0f2f5f] dark:text-white">
                                Hunian
                            </span>
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Data Hunian
                        </h1>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {isAnggota
                                ? "Lihat data hunian pada satuan Anda."
                                : "Kelola data rumah dinas, mes/asrama, dan apartemen."}
                        </p>
                    </div>

                    {canManage && (
                        <button
                            type="button"
                            onClick={openCreate}
                            disabled={units.length === 0}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b254a] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" />
                            Tambah Hunian
                        </button>
                    )}
                </div>

                {/* INFO JIKA BELUM ADA UNIT */}

                {units.length === 0 && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

                        <div>
                            <p className="font-semibold">
                                Belum ada unit aktif
                            </p>

                            <p className="mt-1 text-sm">
                                {isAnggota
                                    ? "Satuan Anda tidak aktif atau belum tersedia. Hubungi Polresta."
                                    : "Tambahkan unit terlebih dahulu sebelum menambahkan data hunian."}
                            </p>
                        </div>
                    </div>
                )}

                {/* STAT */}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Hunian"
                        value={stats.total}
                        icon={<Building2 className="h-5 w-5" />}
                    />

                    <StatCard
                        title="Tersedia"
                        value={stats.tersedia}
                        icon={<CheckCircle2 className="h-5 w-5" />}
                    />

                    <StatCard
                        title="Dihuni"
                        value={stats.dihuni}
                        icon={<Building2 className="h-5 w-5" />}
                    />

                    <StatCard
                        title="Perbaikan"
                        value={stats.perbaikan}
                        icon={<AlertTriangle className="h-5 w-5" />}
                    />
                </div>

                {/* FILTER */}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 flex items-center gap-2">
                        <Filter className="h-4 w-4 text-[#d4af37]" />

                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                            Filter Data
                        </h2>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") applyFilter();
                                }}
                                placeholder="Cari kode, nama, alamat..."
                                className={`${inputBase} pl-9`}
                            />
                        </div>

                        <select
                            value={jenisFilter}
                            onChange={(event) =>
                                setJenisFilter(event.target.value)
                            }
                            className={selectBase}
                        >
                            <option value="">Semua Jenis</option>
                            <Options map={JENIS} />
                        </select>

                        <select
                            value={kondisiFilter}
                            onChange={(event) =>
                                setKondisiFilter(event.target.value)
                            }
                            className={selectBase}
                        >
                            <option value="">Semua Kondisi</option>
                            <Options map={KONDISI} />
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            className={selectBase}
                        >
                            <option value="">Semua Status</option>
                            <Options map={STATUS} />
                        </select>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={resetFilter}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Reset
                        </button>

                        <button
                            type="button"
                            onClick={applyFilter}
                            className="rounded-xl bg-[#0f2f5f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b254a]"
                        >
                            Terapkan
                        </button>
                    </div>
                </div>

                {/* TABLE */}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                                    <th className={th}>Hunian</th>
                                    {isSuperadmin && (
                                        <th className={th}>Unit</th>
                                    )}
                                    <th className={th}>Jenis</th>
                                    <th className={th}>Kondisi</th>
                                    <th className={th}>Status</th>
                                    <th className={`${th} text-right`}>Aksi</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {hunian.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={isSuperadmin ? 6 : 5}
                                            className="px-5 py-12 text-center"
                                        >
                                            <Building2 className="mx-auto h-10 w-10 text-slate-300" />

                                            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                                                Belum ada data hunian
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                {canManage
                                                    ? "Silakan tambahkan data hunian."
                                                    : "Belum ada data hunian pada satuan Anda."}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    hunian.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-bold text-[#0f2f5f] dark:text-white">
                                                    {item.kode_hunian}
                                                </p>

                                                <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                                                    {item.nama_hunian}
                                                </p>

                                                <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                                                    {item.alamat}
                                                </p>
                                            </td>

                                            {isSuperadmin && (
                                                <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                                                    {item.unit?.nama_unit ??
                                                        "-"}
                                                </td>
                                            )}

                                            <td className="px-5 py-4">
                                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    {label(
                                                        JENIS,
                                                        item.jenis_hunian,
                                                    )}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${kondisiClass(item.kondisi)}`}
                                                >
                                                    {label(
                                                        KONDISI,
                                                        item.kondisi,
                                                    )}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass(item.status_operasional)}`}
                                                >
                                                    {label(
                                                        STATUS,
                                                        item.status_operasional,
                                                    )}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-1">
                                                    <ActionButton
                                                        title="Detail"
                                                        onClick={() =>
                                                            openShow(item)
                                                        }
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </ActionButton>

                                                    {canManage && (
                                                        <>
                                                            <ActionButton
                                                                title="Edit"
                                                                onClick={() =>
                                                                    openEdit(
                                                                        item,
                                                                    )
                                                                }
                                                            >
                                                                <Edit3 className="h-4 w-4" />
                                                            </ActionButton>

                                                            <ActionButton
                                                                title="Hapus"
                                                                danger
                                                                onClick={() =>
                                                                    openDelete(
                                                                        item,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </ActionButton>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}

                    {hunian.last_page > 1 && (
                        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                            <p className="text-sm text-slate-500">
                                Menampilkan{" "}
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {hunian.from ?? 0}
                                </span>{" "}
                                sampai{" "}
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {hunian.to ?? 0}
                                </span>{" "}
                                dari{" "}
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {hunian.total}
                                </span>{" "}
                                data
                            </p>

                            <div className="flex items-center gap-1">
                                {hunian.links.map((link, index) => {
                                    const isPrevious = index === 0;
                                    const isNext =
                                        index === hunian.links.length - 1;

                                    return (
                                        <button
                                            key={`${link.label}-${index}`}
                                            type="button"
                                            disabled={!link.url}
                                            onClick={() => {
                                                if (link.url) {
                                                    router.get(
                                                        link.url,
                                                        {},
                                                        {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                        },
                                                    );
                                                }
                                            }}
                                            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition ${
                                                link.active
                                                    ? "bg-[#0f2f5f] text-white"
                                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                            } ${!link.url ? "cursor-not-allowed opacity-40" : ""}`}
                                        >
                                            {isPrevious ? (
                                                <ChevronLeft className="h-4 w-4" />
                                            ) : isNext ? (
                                                <ChevronRight className="h-4 w-4" />
                                            ) : (
                                                <span
                                                    dangerouslySetInnerHTML={{
                                                        __html: link.label,
                                                    }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL CREATE / EDIT (khusus superadmin) */}

            <Modal
                open={
                    canManage &&
                    (modal?.type === "create" || modal?.type === "edit")
                }
                title={
                    modal?.type === "edit"
                        ? "Edit Data Hunian"
                        : "Tambah Hunian"
                }
                description={
                    modal?.type === "edit"
                        ? "Perbarui informasi data hunian."
                        : "Masukkan data hunian baru."
                }
                onClose={closeModal}
            >
                <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            label="Unit"
                            required
                            error={form.errors.unit_id}
                        >
                            <select
                                value={form.data.unit_id}
                                onChange={(event) =>
                                    form.setData("unit_id", event.target.value)
                                }
                                className={selectBase}
                            >
                                <option value="">Pilih Unit</option>

                                {units.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                        {unit.nama_unit}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Kode Hunian">
                            <div className="flex h-[42px] items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-3 dark:border-slate-700 dark:bg-slate-800">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {modal?.type === "edit"
                                        ? form.data.kode_hunian
                                        : "HD-XXX"}
                                </span>

                                <span className="rounded-md bg-[#d4af37]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#a78300] dark:text-[#d4af37]">
                                    Otomatis
                                </span>
                            </div>
                        </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            label="Jenis Hunian"
                            required
                            error={form.errors.jenis_hunian}
                        >
                            <select
                                value={form.data.jenis_hunian}
                                onChange={(event) =>
                                    form.setData(
                                        "jenis_hunian",
                                        event.target.value,
                                    )
                                }
                                className={selectBase}
                            >
                                <Options map={JENIS} />
                            </select>
                        </Field>

                        <Field
                            label="Nama Hunian"
                            required
                            error={form.errors.nama_hunian}
                        >
                            <input
                                type="text"
                                value={form.data.nama_hunian}
                                onChange={(event) =>
                                    form.setData(
                                        "nama_hunian",
                                        event.target.value,
                                    )
                                }
                                placeholder="Contoh: Rumah Dinas Kapolresta"
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <Field label="Alamat" required error={form.errors.alamat}>
                        <textarea
                            rows={3}
                            value={form.data.alamat}
                            onChange={(event) =>
                                form.setData("alamat", event.target.value)
                            }
                            placeholder="Masukkan alamat lengkap hunian"
                            className={textareaBase}
                        />
                    </Field>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Blok" error={form.errors.blok}>
                            <input
                                type="text"
                                value={form.data.blok}
                                onChange={(event) =>
                                    form.setData("blok", event.target.value)
                                }
                                placeholder="Contoh: A"
                                className={inputBase}
                            />
                        </Field>

                        <Field label="Nomor" error={form.errors.nomor}>
                            <input
                                type="text"
                                value={form.data.nomor}
                                onChange={(event) =>
                                    form.setData("nomor", event.target.value)
                                }
                                placeholder="Contoh: 01"
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Lantai" error={form.errors.lantai}>
                            <input
                                type="number"
                                min="0"
                                value={form.data.lantai}
                                onChange={(event) =>
                                    form.setData("lantai", event.target.value)
                                }
                                placeholder="Contoh: 1"
                                className={inputBase}
                            />
                        </Field>

                        <Field
                            label="Jumlah Kamar"
                            required
                            error={form.errors.jumlah_kamar}
                        >
                            <input
                                type="number"
                                min="1"
                                value={form.data.jumlah_kamar}
                                onChange={(event) =>
                                    form.setData(
                                        "jumlah_kamar",
                                        event.target.value,
                                    )
                                }
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            label="Luas Bangunan (m²)"
                            error={form.errors.luas_bangunan}
                        >
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.luas_bangunan}
                                onChange={(event) =>
                                    form.setData(
                                        "luas_bangunan",
                                        event.target.value,
                                    )
                                }
                                placeholder="Contoh: 72"
                                className={inputBase}
                            />
                        </Field>

                        <Field
                            label="Luas Tanah (m²)"
                            error={form.errors.luas_tanah}
                        >
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.luas_tanah}
                                onChange={(event) =>
                                    form.setData(
                                        "luas_tanah",
                                        event.target.value,
                                    )
                                }
                                placeholder="Contoh: 120"
                                className={inputBase}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Field
                            label="Kondisi"
                            required
                            error={form.errors.kondisi}
                        >
                            <select
                                value={form.data.kondisi}
                                onChange={(event) =>
                                    form.setData("kondisi", event.target.value)
                                }
                                className={selectBase}
                            >
                                <Options
                                    map={isCreate ? KONDISI_BARU : KONDISI}
                                />
                            </select>
                        </Field>

                        <Field
                            label="Status Operasional"
                            required
                            error={form.errors.status_operasional}
                        >
                            <select
                                value={form.data.status_operasional}
                                onChange={(event) =>
                                    form.setData(
                                        "status_operasional",
                                        event.target.value,
                                    )
                                }
                                className={selectBase}
                            >
                                <Options
                                    map={isCreate ? STATUS_BARU : STATUS}
                                />
                            </select>
                        </Field>
                    </div>

                    {isCreate && (
                        <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Kerusakan dicatat melalui menu Pemeliharaan, dan
                            status Dihuni diatur otomatis melalui menu
                            Penghunian.
                        </p>
                    )}

                    <Field label="Keterangan" error={form.errors.keterangan}>
                        <textarea
                            rows={3}
                            value={form.data.keterangan}
                            onChange={(event) =>
                                form.setData("keterangan", event.target.value)
                            }
                            placeholder="Keterangan tambahan jika diperlukan"
                            className={textareaBase}
                        />
                    </Field>

                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={form.processing}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#0f2f5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b254a] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {form.processing && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}

                            {modal?.type === "edit"
                                ? "Simpan Perubahan"
                                : "Simpan Hunian"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL DETAIL */}

            <Modal
                open={modal?.type === "show"}
                title="Detail Hunian"
                description="Informasi lengkap data hunian."
                onClose={closeModal}
                width="max-w-3xl"
            >
                {modal?.type === "show" && (
                    <div className="space-y-5">
                        <div className="rounded-2xl bg-[#0f2f5f] p-5 text-white">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                                        {modal.item.kode_hunian}
                                    </p>

                                    <h3 className="mt-1 text-xl font-bold">
                                        {modal.item.nama_hunian}
                                    </h3>

                                    <p className="mt-1 text-sm text-white/70">
                                        {modal.item.unit?.nama_unit ?? "-"}
                                    </p>
                                </div>

                                <Building2 className="h-8 w-8 text-[#d4af37]" />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailItem
                                label="Jenis Hunian"
                                value={label(JENIS, modal.item.jenis_hunian)}
                            />
                            <DetailItem
                                label="Unit"
                                value={modal.item.unit?.nama_unit ?? "-"}
                            />
                            <DetailItem
                                label="Blok"
                                value={modal.item.blok ?? "-"}
                            />
                            <DetailItem
                                label="Nomor"
                                value={modal.item.nomor ?? "-"}
                            />
                            <DetailItem
                                label="Lantai"
                                value={
                                    modal.item.lantai !== null
                                        ? String(modal.item.lantai)
                                        : "-"
                                }
                            />
                            <DetailItem
                                label="Jumlah Kamar"
                                value={`${modal.item.jumlah_kamar} kamar`}
                            />
                            <DetailItem
                                label="Luas Bangunan"
                                value={
                                    modal.item.luas_bangunan
                                        ? `${modal.item.luas_bangunan} m²`
                                        : "-"
                                }
                            />
                            <DetailItem
                                label="Luas Tanah"
                                value={
                                    modal.item.luas_tanah
                                        ? `${modal.item.luas_tanah} m²`
                                        : "-"
                                }
                            />
                            <DetailItem
                                label="Kondisi"
                                value={label(KONDISI, modal.item.kondisi)}
                            />
                            <DetailItem
                                label="Status Operasional"
                                value={label(
                                    STATUS,
                                    modal.item.status_operasional,
                                )}
                            />

                            <div className="sm:col-span-2">
                                <DetailItem
                                    label="Alamat"
                                    value={modal.item.alamat}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <DetailItem
                                    label="Keterangan"
                                    value={modal.item.keterangan || "-"}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-xl bg-[#0f2f5f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b254a]"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL DELETE (khusus superadmin) */}

            <Modal
                open={canManage && modal?.type === "delete"}
                title="Hapus Data Hunian"
                description="Tindakan ini akan menghapus data hunian."
                onClose={closeModal}
                width="max-w-md"
            >
                {modal?.type === "delete" && (
                    <div className="space-y-5">
                        <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 dark:bg-red-500/10">
                            <Trash2 className="mt-0.5 h-5 w-5 text-red-500" />

                            <div>
                                <p className="font-semibold text-red-700 dark:text-red-400">
                                    Yakin ingin menghapus data ini?
                                </p>

                                <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80">
                                    Data{" "}
                                    <strong>{modal.item.kode_hunian}</strong> -{" "}
                                    <strong>{modal.item.nama_hunian}</strong>{" "}
                                    akan dihapus.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={deleting}
                                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={deleteHunian}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {deleting && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                Hapus
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
