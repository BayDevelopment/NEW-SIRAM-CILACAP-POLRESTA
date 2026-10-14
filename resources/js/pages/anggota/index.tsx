import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
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
    UserRound,
    Users,
    X,
    AlertTriangle,
    Building2,
    UserCheck,
    UserX,
    Mail,
    Phone,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

/* ============================================================================
 | TYPE
 * ========================================================================== */

type Unit = {
    id: number;
    nama_unit: string;
};

type UserAccount = {
    id: number;
    name: string;
    email?: string | null;
};

type Anggota = {
    id: number;
    user_id: number | null;
    unit_id: number;
    nrp: string;
    nama_lengkap: string;
    pangkat: string | null;
    jabatan: string | null;
    jenis_kelamin: "L" | "P";
    tempat_lahir: string | null;
    tanggal_lahir: string | null;
    no_hp: string | null;
    email: string | null;
    alamat: string | null;
    is_active: boolean;
    user?: UserAccount | null;
    unit?: Unit | null;
    created_at: string;
    updated_at: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedAnggota = {
    data: Anggota[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
};

type Filters = {
    search: string;
    unit_id: string | number;
    status: string;
};

type Stats = {
    total: number;
    aktif: number;
    nonaktif: number;
    terhubung: number;
};

type Flash = {
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
};

type PageProps = {
    anggota: PaginatedAnggota;
    stats: Stats;
    unitOptions: Unit[];
    filters: Filters;
    flash?: Flash;
};

type AnggotaForm = {
    unit_id: string;
    nrp: string;
    nama_lengkap: string;
    pangkat: string;
    jabatan: string;
    jenis_kelamin: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    no_hp: string;
    email: string;
    alamat: string;
    is_active: boolean;
};

type ModalState =
    | { type: "create" }
    | { type: "edit"; item: Anggota }
    | { type: "show"; item: Anggota }
    | { type: "delete"; item: Anggota }
    | null;

/* ============================================================================
 | CONSTANT
 * ========================================================================== */

const EMPTY_FORM: AnggotaForm = {
    unit_id: "",
    nrp: "",
    nama_lengkap: "",
    pangkat: "",
    jabatan: "",
    jenis_kelamin: "L",
    tempat_lahir: "",
    tanggal_lahir: "",
    no_hp: "",
    email: "",
    alamat: "",
    is_active: true,
};

const inputBase =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#0f2f5f] focus:outline-none focus:ring-2 focus:ring-[#0f2f5f]/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800";

const selectBase =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#0f2f5f] focus:outline-none focus:ring-2 focus:ring-[#0f2f5f]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

const textareaBase =
    "w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#0f2f5f] focus:outline-none focus:ring-2 focus:ring-[#0f2f5f]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

/* ============================================================================
 | HELPER
 * ========================================================================== */

function toStr(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

function genderLabel(value: string): string {
    return value === "L" ? "Laki-laki" : value === "P" ? "Perempuan" : "-";
}

function formatDate(value: string | null | undefined): string {
    if (!value) {
        return "-";
    }

    const date = new Date(`${value.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
}

function formatDateTime(value: string | null | undefined): string {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function statusClass(active: boolean): string {
    return active
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
        : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
}

function toFormData(item: Anggota): AnggotaForm {
    return {
        unit_id: toStr(item.unit_id),
        nrp: item.nrp,
        nama_lengkap: item.nama_lengkap,
        pangkat: toStr(item.pangkat),
        jabatan: toStr(item.jabatan),
        jenis_kelamin: item.jenis_kelamin,
        tempat_lahir: toStr(item.tempat_lahir),
        tanggal_lahir: item.tanggal_lahir
            ? item.tanggal_lahir.slice(0, 10)
            : "",
        no_hp: toStr(item.no_hp),
        email: toStr(item.email),
        alamat: toStr(item.alamat),
        is_active: Boolean(item.is_active),
    };
}

/* ============================================================================
 | SMALL COMPONENT
 * ========================================================================== */

function Field({
    label,
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
                {label}
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
    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Tutup modal"
                className="absolute inset-0 cursor-default bg-slate-950/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`relative z-10 max-h-[92vh] w-full ${width} overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900`}
            >
                <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-700">
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
                        aria-label="Tutup"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-[calc(92vh-80px)] overflow-y-auto p-5 sm:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

/* ============================================================================
 | PAGE
 * ========================================================================== */

export default function AnggotaIndex() {
    const { anggota, stats, unitOptions, filters, flash } =
        usePage<PageProps>().props;

    const [modal, setModal] = useState<ModalState>(null);
    const [search, setSearch] = useState(filters.search ?? "");
    const [unitFilter, setUnitFilter] = useState(toStr(filters.unit_id ?? ""));
    const [statusFilter, setStatusFilter] = useState(filters.status ?? "");
    const [deleting, setDeleting] = useState(false);

    const form = useForm<AnggotaForm>(EMPTY_FORM);

    /* ------------------------------------------------------------------------
     | FLASH TOAST
     * ---------------------------------------------------------------------- */

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
        if (flash?.warning) toast.warning(flash.warning);
        if (flash?.info) toast.info(flash.info);
    }, [flash]);

    /* ------------------------------------------------------------------------
     | MODAL
     * ---------------------------------------------------------------------- */

    const closeModal = () => {
        setModal(null);
        form.reset();
        form.clearErrors();
    };

    const openCreate = () => {
        form.reset();
        form.clearErrors();

        form.setData({
            ...EMPTY_FORM,
            unit_id: unitOptions.length ? String(unitOptions[0].id) : "",
        });

        setModal({ type: "create" });
    };

    const openEdit = (item: Anggota) => {
        form.clearErrors();
        form.setData(toFormData(item));
        setModal({ type: "edit", item });
    };

    const openShow = (item: Anggota) => {
        setModal({ type: "show", item });
    };

    const openDelete = (item: Anggota) => {
        setModal({ type: "delete", item });
    };

    /* ------------------------------------------------------------------------
     | SUBMIT
     * ---------------------------------------------------------------------- */

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (modal?.type === "create") {
            form.post("/anggota", {
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });

            return;
        }

        if (modal?.type === "edit") {
            form.put(`/anggota/${modal.item.id}`, {
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        }
    };

    /* ------------------------------------------------------------------------
     | DELETE
     * ---------------------------------------------------------------------- */

    const deleteAnggota = () => {
        if (modal?.type !== "delete") {
            return;
        }

        setDeleting(true);

        router.delete(`/anggota/${modal.item.id}`, {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onFinish: () => setDeleting(false),
        });
    };

    /* ------------------------------------------------------------------------
     | FILTER
     * ---------------------------------------------------------------------- */

    const applyFilter = () => {
        router.get(
            "/anggota",
            {
                search: search || undefined,
                unit_id: unitFilter || undefined,
                status: statusFilter || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const resetFilter = () => {
        setSearch("");
        setUnitFilter("");
        setStatusFilter("");

        router.get(
            "/anggota",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const activeFilters = Boolean(search || unitFilter || statusFilter);

    return (
        <>
            <Head title="Data Anggota" />
            <div className="siram-stagger relative flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6 lg:p-8">
                {/* DECORATIVE BACKGROUND */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/5 blur-3xl"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-24 top-[28rem] h-64 w-64 rounded-full bg-amber-400/5 blur-3xl"
                />
                {/* HEADER */}
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#0f2f5f] dark:text-blue-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
                            Manajemen Data
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                            Data Anggota
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                            Kelola identitas, unit penugasan, informasi kontak,
                            dan status keaktifan anggota.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openCreate}
                        disabled={unitOptions.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#153d77] focus:outline-none focus:ring-2 focus:ring-[#0f2f5f]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-950"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah Anggota
                    </button>
                </div>
                {unitOptions.length === 0 && (
                    <div className="relative flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p>
                            Belum ada data unit / satuan. Tambahkan unit
                            terlebih dahulu sebelum membuat anggota baru.
                        </p>
                    </div>
                )}
                {/* STATISTICS */}
                <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Total Anggota"
                        value={stats.total}
                        description="Data anggota terdaftar"
                        icon={Users}
                        iconClass="bg-blue-50 text-[#0f2f5f] dark:bg-blue-500/10 dark:text-blue-400"
                    />

                    <StatCard
                        title="Anggota Aktif"
                        value={stats.aktif}
                        description="Status keanggotaan aktif"
                        icon={UserCheck}
                        iconClass="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    />

                    <StatCard
                        title="Anggota Nonaktif"
                        value={stats.nonaktif}
                        description="Status keanggotaan nonaktif"
                        icon={UserX}
                        iconClass="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                    />

                    <StatCard
                        title="Terhubung Akun"
                        value={stats.terhubung}
                        description="Memiliki akun pengguna"
                        icon={UserRound}
                        iconClass="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    />
                </div>
                {/* FILTERS */}
                <div className="relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f2f5f]/5 text-[#0f2f5f] dark:bg-blue-500/10 dark:text-blue-400">
                                <Filter className="h-4 w-4" />
                            </div>

                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Filter Data
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Cari dan saring daftar anggota.
                                </p>
                            </div>
                        </div>

                        {activeFilters && (
                            <button
                                type="button"
                                onClick={resetFilter}
                                className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-slate-500 transition hover:text-[#0f2f5f] sm:self-auto dark:text-slate-400 dark:hover:text-white"
                            >
                                <X className="h-3.5 w-3.5" />
                                Reset filter
                            </button>
                        )}
                    </div>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            applyFilter();
                        }}
                        className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_minmax(180px,1fr)_minmax(160px,1fr)_auto]"
                    >
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Cari nama, NRP, pangkat..."
                                className={`${inputBase} pl-9`}
                            />
                        </div>

                        <select
                            value={unitFilter}
                            onChange={(event) =>
                                setUnitFilter(event.target.value)
                            }
                            className={selectBase}
                            aria-label="Filter unit"
                        >
                            <option value="">Semua unit / satuan</option>
                            {unitOptions.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.nama_unit}
                                </option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            className={selectBase}
                            aria-label="Filter status anggota"
                        >
                            <option value="">Semua status</option>
                            <option value="aktif">Aktif</option>
                            <option value="nonaktif">Nonaktif</option>
                        </select>

                        <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#153d77]"
                        >
                            <Search className="h-4 w-4" />
                            Terapkan
                        </button>
                    </form>
                </div>
                {/* TABLE */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800">
                        <div>
                            <h2 className="font-bold text-slate-900 dark:text-white">
                                Daftar Anggota
                            </h2>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Informasi anggota dan unit penugasannya.
                            </p>
                        </div>

                        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <Users className="h-3.5 w-3.5" />
                            {anggota.total.toLocaleString("id-ID")} data
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-4">Anggota</th>
                                    <th className="px-5 py-4">NRP</th>
                                    <th className="px-5 py-4">Unit / Satuan</th>
                                    <th className="px-5 py-4">
                                        Pangkat / Jabatan
                                    </th>
                                    <th className="px-5 py-4">Kontak</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {anggota.data.length > 0 ? (
                                    anggota.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f2f5f]/5 text-[#0f2f5f] dark:bg-blue-500/10 dark:text-blue-400">
                                                        <UserRound className="h-5 w-5" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900 dark:text-white">
                                                            {item.nama_lengkap}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                            {genderLabel(
                                                                item.jenis_kelamin,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    {item.nrp}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-start gap-2">
                                                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                                    <span className="text-slate-700 dark:text-slate-300">
                                                        {item.unit?.nama_unit ??
                                                            "-"}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                                    {item.pangkat || "-"}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    {item.jabatan || "-"}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="space-y-1.5">
                                                    {item.email ? (
                                                        <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                            <span className="max-w-[180px] truncate">
                                                                {item.email}
                                                            </span>
                                                        </p>
                                                    ) : null}

                                                    {item.no_hp ? (
                                                        <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                            {item.no_hp}
                                                        </p>
                                                    ) : null}

                                                    {!item.email &&
                                                        !item.no_hp && (
                                                            <span className="text-xs text-slate-400">
                                                                Tidak ada kontak
                                                            </span>
                                                        )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item.is_active)}`}
                                                >
                                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                                    {item.is_active
                                                        ? "Aktif"
                                                        : "Nonaktif"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <ActionButton
                                                        title="Lihat detail"
                                                        onClick={() =>
                                                            openShow(item)
                                                        }
                                                        className="text-slate-500 hover:bg-blue-50 hover:text-[#0f2f5f] dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </ActionButton>

                                                    <ActionButton
                                                        title="Edit anggota"
                                                        onClick={() =>
                                                            openEdit(item)
                                                        }
                                                        className="text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </ActionButton>

                                                    <ActionButton
                                                        title="Hapus anggota"
                                                        onClick={() =>
                                                            openDelete(item)
                                                        }
                                                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </ActionButton>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-16 text-center"
                                        >
                                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                                                <Users className="h-7 w-7" />
                                            </div>

                                            <h3 className="mt-4 font-semibold text-slate-800 dark:text-white">
                                                Data anggota tidak ditemukan
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                {activeFilters
                                                    ? "Coba ubah kata kunci atau reset filter."
                                                    : "Belum ada anggota yang terdaftar."}
                                            </p>

                                            {activeFilters && (
                                                <button
                                                    type="button"
                                                    onClick={resetFilter}
                                                    className="mt-4 text-sm font-semibold text-[#0f2f5f] hover:underline dark:text-blue-400"
                                                >
                                                    Reset filter
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}

                    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Menampilkan{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {anggota.from ?? 0}
                            </span>{" "}
                            –{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {anggota.to ?? 0}
                            </span>{" "}
                            dari{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {anggota.total}
                            </span>{" "}
                            anggota
                        </p>

                        <div className="flex flex-wrap items-center gap-1">
                            {anggota.links.map((link, index) => {
                                const isPrevious =
                                    index === 0 ||
                                    link.label
                                        .toLowerCase()
                                        .includes("previous");
                                const isNext =
                                    index === anggota.links.length - 1 ||
                                    link.label.toLowerCase().includes("next");

                                const isArrow =
                                    link.label.includes("laquo") ||
                                    link.label.includes("raquo") ||
                                    link.label.includes("&lt;") ||
                                    link.label.includes("&gt;");

                                const label = isPrevious ? (
                                    <ChevronLeft className="h-4 w-4" />
                                ) : isNext ? (
                                    <ChevronRight className="h-4 w-4" />
                                ) : (
                                    <span
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                );

                                return (
                                    <button
                                        key={`${index}-${link.label}`}
                                        type="button"
                                        disabled={!link.url || link.active}
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
                                        aria-label={
                                            isPrevious
                                                ? "Halaman sebelumnya"
                                                : isNext
                                                  ? "Halaman berikutnya"
                                                  : `Halaman ${link.label}`
                                        }
                                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition ${
                                            link.active
                                                ? "bg-[#0f2f5f] text-white"
                                                : "border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        {isArrow ? label : label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            {/* CREATE / EDIT MODAL */}
            <Modal
                open={modal?.type === "create" || modal?.type === "edit"}
                title={
                    modal?.type === "edit"
                        ? "Edit Data Anggota"
                        : "Tambah Anggota"
                }
                description="Lengkapi identitas dan informasi anggota sesuai data yang tersedia."
                onClose={closeModal}
            >
                <form onSubmit={submit} className="space-y-6">
                    <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <UserRound className="h-4 w-4 text-[#0f2f5f] dark:text-blue-400" />
                            Identitas Anggota
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="NRP" required error={form.errors.nrp}>
                                <input
                                    value={form.data.nrp}
                                    onChange={(event) =>
                                        form.setData("nrp", event.target.value)
                                    }
                                    className={inputBase}
                                    placeholder="Masukkan NRP"
                                    maxLength={30}
                                    required
                                />
                            </Field>

                            <Field
                                label="Nama Lengkap"
                                required
                                error={form.errors.nama_lengkap}
                            >
                                <input
                                    value={form.data.nama_lengkap}
                                    onChange={(event) =>
                                        form.setData(
                                            "nama_lengkap",
                                            event.target.value,
                                        )
                                    }
                                    className={inputBase}
                                    placeholder="Nama lengkap anggota"
                                    maxLength={150}
                                    required
                                />
                            </Field>

                            <Field
                                label="Unit / Satuan"
                                required
                                error={form.errors.unit_id}
                            >
                                <select
                                    value={form.data.unit_id}
                                    onChange={(event) =>
                                        form.setData(
                                            "unit_id",
                                            event.target.value,
                                        )
                                    }
                                    className={selectBase}
                                    required
                                >
                                    <option value="">Pilih unit</option>
                                    {unitOptions.map((unit) => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.nama_unit}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                label="Jenis Kelamin"
                                required
                                error={form.errors.jenis_kelamin}
                            >
                                <select
                                    value={form.data.jenis_kelamin}
                                    onChange={(event) =>
                                        form.setData(
                                            "jenis_kelamin",
                                            event.target.value,
                                        )
                                    }
                                    className={selectBase}
                                    required
                                >
                                    <option value="L">Laki-laki</option>
                                    <option value="P">Perempuan</option>
                                </select>
                            </Field>

                            <Field label="Pangkat" error={form.errors.pangkat}>
                                <input
                                    value={form.data.pangkat}
                                    onChange={(event) =>
                                        form.setData(
                                            "pangkat",
                                            event.target.value,
                                        )
                                    }
                                    className={inputBase}
                                    placeholder="Masukkan pangkat"
                                    maxLength={100}
                                />
                            </Field>

                            <Field label="Jabatan" error={form.errors.jabatan}>
                                <input
                                    value={form.data.jabatan}
                                    onChange={(event) =>
                                        form.setData(
                                            "jabatan",
                                            event.target.value,
                                        )
                                    }
                                    className={inputBase}
                                    placeholder="Masukkan jabatan"
                                    maxLength={150}
                                />
                            </Field>
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <UserRound className="h-4 w-4 text-[#0f2f5f] dark:text-blue-400" />
                            Data Pribadi
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field
                                label="Tempat Lahir"
                                error={form.errors.tempat_lahir}
                            >
                                <input
                                    value={form.data.tempat_lahir}
                                    onChange={(event) =>
                                        form.setData(
                                            "tempat_lahir",
                                            event.target.value,
                                        )
                                    }
                                    className={inputBase}
                                    placeholder="Kota tempat lahir"
                                    maxLength={100}
                                />
                            </Field>

                            <Field
                                label="Tanggal Lahir"
                                error={form.errors.tanggal_lahir}
                            >
                                <input
                                    type="date"
                                    value={form.data.tanggal_lahir}
                                    onChange={(event) =>
                                        form.setData(
                                            "tanggal_lahir",
                                            event.target.value,
                                        )
                                    }
                                    className={inputBase}
                                    max={new Date().toISOString().slice(0, 10)}
                                />
                            </Field>
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <Phone className="h-4 w-4 text-[#0f2f5f] dark:text-blue-400" />
                            Informasi Kontak
                        </h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Nomor HP" error={form.errors.no_hp}>
                                <input
                                    type="tel"
                                    value={form.data.no_hp}
                                    onChange={(event) =>
                                        form.setData(
                                            "no_hp",
                                            event.target.value,
                                        )
                                    }
                                    className={inputBase}
                                    placeholder="Contoh: 08123456789"
                                    maxLength={30}
                                />
                            </Field>

                            <Field label="Email" error={form.errors.email}>
                                <input
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) =>
                                        form.setData(
                                            "email",
                                            event.target.value,
                                        )
                                    }
                                    className={inputBase}
                                    placeholder="nama@email.com"
                                    maxLength={255}
                                />
                            </Field>

                            <div className="sm:col-span-2">
                                <Field
                                    label="Alamat"
                                    error={form.errors.alamat}
                                >
                                    <textarea
                                        value={form.data.alamat}
                                        onChange={(event) =>
                                            form.setData(
                                                "alamat",
                                                event.target.value,
                                            )
                                        }
                                        className={textareaBase}
                                        rows={3}
                                        maxLength={5000}
                                        placeholder="Alamat lengkap anggota"
                                    />
                                </Field>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(event) =>
                                    form.setData(
                                        "is_active",
                                        event.target.checked,
                                    )
                                }
                                className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#0f2f5f]"
                            />

                            <span>
                                <span className="block text-sm font-semibold text-slate-800 dark:text-white">
                                    Anggota aktif
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    Nonaktifkan jika anggota sudah tidak
                                    berstatus aktif. Perubahan ini tidak
                                    menghapus data anggota.
                                </span>
                            </span>
                        </label>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-700">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#153d77] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {form.processing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            {form.processing
                                ? "Menyimpan..."
                                : modal?.type === "edit"
                                  ? "Simpan Perubahan"
                                  : "Simpan Anggota"}
                        </button>
                    </div>
                </form>
            </Modal>
            {/* DETAIL MODAL */}
            <Modal
                open={modal?.type === "show"}
                title="Detail Anggota"
                description="Informasi lengkap anggota yang terdaftar."
                onClose={closeModal}
            >
                {modal?.type === "show" && (
                    <div className="space-y-5">
                        <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center dark:bg-slate-800/60">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0f2f5f] text-white">
                                <UserRound className="h-8 w-8" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {modal.item.nama_lengkap}
                                </h3>

                                <p className="mt-1 font-mono text-sm text-slate-500 dark:text-slate-400">
                                    NRP: {modal.item.nrp}
                                </p>

                                <span
                                    className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(modal.item.is_active)}`}
                                >
                                    {modal.item.is_active
                                        ? "Aktif"
                                        : "Nonaktif"}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <DetailItem
                                label="Unit / Satuan"
                                value={modal.item.unit?.nama_unit}
                            />
                            <DetailItem
                                label="Jenis Kelamin"
                                value={genderLabel(modal.item.jenis_kelamin)}
                            />
                            <DetailItem
                                label="Pangkat"
                                value={modal.item.pangkat}
                            />
                            <DetailItem
                                label="Jabatan"
                                value={modal.item.jabatan}
                            />
                            <DetailItem
                                label="Tempat Lahir"
                                value={modal.item.tempat_lahir}
                            />
                            <DetailItem
                                label="Tanggal Lahir"
                                value={formatDate(modal.item.tanggal_lahir)}
                            />
                            <DetailItem
                                label="Nomor HP"
                                value={modal.item.no_hp}
                            />
                            <DetailItem
                                label="Email"
                                value={modal.item.email}
                            />
                            <DetailItem
                                label="Akun Pengguna"
                                value={
                                    modal.item.user
                                        ? `${modal.item.user.name} (#${modal.item.user.id})`
                                        : modal.item.user_id
                                          ? `ID akun: ${modal.item.user_id}`
                                          : "Belum terhubung"
                                }
                            />
                            <DetailItem
                                label="Terdaftar"
                                value={formatDateTime(modal.item.created_at)}
                            />

                            <div className="sm:col-span-2">
                                <DetailItem
                                    label="Alamat"
                                    value={modal.item.alamat}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-700">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Tutup
                            </button>

                            <button
                                type="button"
                                onClick={() => openEdit(modal.item)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#153d77]"
                            >
                                <Edit3 className="h-4 w-4" />
                                Edit Anggota
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            {/* DELETE CONFIRMATION */}
            <Modal
                open={modal?.type === "delete"}
                title="Hapus Anggota"
                description="Konfirmasi penghapusan data anggota."
                onClose={closeModal}
                width="max-w-lg"
            >
                {modal?.type === "delete" && (
                    <div className="space-y-5">
                        <div className="flex gap-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                                <AlertTriangle className="h-5 w-5" />
                            </div>

                            <div>
                                <h3 className="font-semibold text-red-800 dark:text-red-300">
                                    Hapus data anggota ini?
                                </h3>

                                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300/80">
                                    Anggota{" "}
                                    <strong>{modal.item.nama_lengkap}</strong>{" "}
                                    dengan NRP <strong>{modal.item.nrp}</strong>{" "}
                                    akan dihapus dari daftar aktif. Data
                                    menggunakan soft delete sehingga tidak
                                    langsung dihapus permanen.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={deleting}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={deleteAnggota}
                                disabled={deleting}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {deleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                {deleting ? "Menghapus..." : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}

/* ============================================================================
 | STAT CARD
 * ========================================================================== */

function StatCard({
    title,
    value,
    description,
    icon: Icon,
    iconClass,
}: {
    title: string;
    value: number;
    description: string;
    icon: typeof Users;
    iconClass: string;
}) {
    return (
        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {title}
                    </p>

                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {value.toLocaleString("id-ID")}
                    </p>
                </div>

                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition group-hover:scale-105 ${iconClass}`}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </div>
    );
}

/* ============================================================================
 | ACTION BUTTON
 * ========================================================================== */

function ActionButton({
    title,
    onClick,
    className,
    children,
}: {
    title: string;
    onClick: () => void;
    className: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${className}`}
        >
            {children}
        </button>
    );
}

/* ============================================================================
 | DETAIL ITEM
 * ========================================================================== */

function DetailItem({
    label,
    value,
}: {
    label: string;
    value?: string | null;
}) {
    return (
        <div className="min-w-0 rounded-xl border border-slate-200/80 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label}
            </p>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-slate-900 dark:text-white">
                {value || "-"}
            </p>
        </div>
    );
}
