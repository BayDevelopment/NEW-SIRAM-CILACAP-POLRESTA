import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Banknote,
    CalendarDays,
    CheckCircle2,
    Clock,
    Eye,
    FileText,
    Hammer,
    Home,
    LoaderCircle,
    Pencil,
    Plus,
    Search,
    Trash2,
    Wrench,
    X,
} from "lucide-react";
import {
    type FormEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useState,
} from "react";
import { toast } from "sonner";

/* =========================================================
 | ANIMASI HALAMAN
 ========================================================= */

const ANIMATION_CSS = `
@keyframes pg-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes pg-fade-in-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
}
@keyframes pg-pop-in {
    from { opacity: 0; transform: translateY(12px) scale(.97); }
    to { opacity: 1; transform: none; }
}
.pg-fade-in {
    animation: pg-fade-in 200ms ease-out both;
}
.pg-fade-in-up {
    animation: pg-fade-in-up 350ms ease-out both;
}
.pg-pop-in {
    animation: pg-pop-in 220ms cubic-bezier(.16, 1, .3, 1) both;
}
@media (prefers-reduced-motion: reduce) {
    .pg-fade-in,
    .pg-fade-in-up,
    .pg-pop-in {
        animation: none !important;
        transition: none !important;
    }
}
`;

/* =========================================================
 | TYPES
 ========================================================= */

type StatusPemeliharaan = "dilaporkan" | "diproses" | "selesai" | "ditolak";
type JenisKerusakan = "ringan" | "berat";
type ModalType = "form" | "detail" | "delete" | null;

interface AuthUser {
    id: number;
    name?: string;
    role?: string;
    unit_id?: number | null;
}

interface HunianOption {
    id: number;
    kode_hunian: string;
    nama_hunian?: string | null;
    nomor_hunian?: string | null;
}

interface Maintenance {
    id: number;
    hunian_id: number;
    hunian?: HunianOption | null;
    jenis_kerusakan: JenisKerusakan | string;
    judul: string;
    deskripsi: string;
    tanggal_laporan: string;
    tanggal_mulai?: string | null;
    tanggal_selesai?: string | null;
    estimasi_biaya?: number | string | null;
    realisasi_biaya?: number | string | null;
    status: StatusPemeliharaan | string;
    keterangan?: string | null;
    pelapor?: { id: number; name: string } | null;
    created_at?: string | null;
    updated_at?: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface MaintenanceStats {
    total: number;
    dilaporkan: number;
    diproses: number;
    selesai: number;
}

interface PageProps {
    [key: string]: unknown;

    auth?: {
        user?: AuthUser | null;
    } | null;

    pemeliharaan: Paginated<Maintenance>;
    hunianOptions: HunianOption[];
    stats: MaintenanceStats;

    filters?: {
        search?: string;
        status?: string;
        jenis_kerusakan?: string;
        hunian_id?: string | number;
    };

    flash?: {
        success?: string;
        error?: string;
    };
}

interface FormData {
    hunian_id: string;
    jenis_kerusakan: string;
    judul: string;
    deskripsi: string;
    tanggal_laporan: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    estimasi_biaya: string;
    realisasi_biaya: string;
    status: string;
    keterangan: string;
}

/* =========================================================
 | HELPERS
 ========================================================= */

const getToday = (): string => {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("-");
};

const createEmptyForm = (): FormData => ({
    hunian_id: "",
    jenis_kerusakan: "ringan",
    judul: "",
    deskripsi: "",
    tanggal_laporan: getToday(),
    tanggal_mulai: "",
    tanggal_selesai: "",
    estimasi_biaya: "",
    realisasi_biaya: "",
    status: "dilaporkan",
    keterangan: "",
});

const formatDate = (value?: string | null): string => {
    if (!value) return "—";

    const date = new Date(`${value.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
};

const formatCurrency = (value?: number | string | null): string => {
    if (value === null || value === undefined || value === "") return "—";

    const amount = Number(value);

    if (!Number.isFinite(amount)) return "—";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const statusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        dilaporkan: "Dilaporkan",
        diproses: "Diproses",
        selesai: "Selesai",
        ditolak: "Ditolak",
    };

    return labels[status] ?? status;
};

const statusClass = (status: string): string => {
    const classes: Record<string, string> = {
        dilaporkan:
            "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
        diproses:
            "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
        selesai:
            "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
        ditolak:
            "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
    };

    return (
        classes[status] ??
        "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
    );
};

const damageLabel = (value: string): string => {
    const labels: Record<string, string> = {
        ringan: "Ringan",
        berat: "Berat",
    };

    return labels[value] ?? value;
};

const damageClass = (value: string): string => {
    const classes: Record<string, string> = {
        ringan: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        berat: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    };

    return (
        classes[value] ??
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
    );
};

const getHunianName = (hunian?: HunianOption | null): string => {
    if (!hunian) return "—";

    return (
        hunian.nama_hunian || hunian.nomor_hunian || hunian.kode_hunian || "—"
    );
};

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0f2f5f] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900";

const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200";

const cardClass =
    "rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

/* =========================================================
 | REUSABLE COMPONENTS
 ========================================================= */

function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(status)}`}
        >
            {statusLabel(status)}
        </span>
    );
}

function Modal({
    title,
    description,
    onClose,
    children,
    size = "max-w-3xl",
}: {
    title: string;
    description?: string;
    onClose: () => void;
    children: ReactNode;
    size?: string;
}) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`pg-pop-in my-auto max-h-[92vh] w-full ${size} overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900`}
            >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-700 dark:bg-slate-900">
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
                        aria-label="Tutup modal"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <X size={19} />
                    </button>
                </div>

                {children}
            </section>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    color,
    bg,
    delay = 0,
}: {
    label: string;
    value: number;
    icon: typeof FileText;
    color: string;
    bg: string;
    delay?: number;
}) {
    return (
        <div
            className={`${cardClass} pg-fade-in-up p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {label}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {Number(value ?? 0).toLocaleString("id-ID")}
                    </p>
                </div>

                <div className={`rounded-xl p-3 ${bg} ${color}`}>
                    <Icon size={23} />
                </div>
            </div>
        </div>
    );
}

function Pagination<T>({ data }: { data: Paginated<T> }) {
    if (data.last_page <= 1) return null;

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan {data.from ?? 0}–{data.to ?? 0} dari{" "}
                {data.total.toLocaleString("id-ID")} data
            </p>

            <div className="flex flex-wrap items-center gap-1">
                {data.links.map((link, index) => {
                    const label = link.label
                        .replace(/&laquo;/g, "«")
                        .replace(/&raquo;/g, "»")
                        .replace(/&amp;/g, "&")
                        .replace(/&#039;/g, "'")
                        .replace(/&quot;/g, '"')
                        .replace(/<[^>]*>/g, "")
                        .trim();

                    const isPrevious =
                        label.toLowerCase().includes("previous") ||
                        label.toLowerCase().includes("sebelumnya") ||
                        label.includes("«");

                    const isNext =
                        label.toLowerCase().includes("next") ||
                        label.toLowerCase().includes("berikutnya") ||
                        label.includes("»");

                    return (
                        <button
                            key={`${link.label}-${index}`}
                            type="button"
                            disabled={!link.url || link.active}
                            onClick={() => {
                                if (link.url) {
                                    router.visit(link.url, {
                                        preserveScroll: true,
                                        preserveState: true,
                                    });
                                }
                            }}
                            aria-label={
                                isPrevious
                                    ? "Halaman sebelumnya"
                                    : isNext
                                      ? "Halaman berikutnya"
                                      : `Halaman ${label}`
                            }
                            className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${
                                link.active
                                    ? "border-[#0f2f5f] bg-[#0f2f5f] text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                            } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                            {isPrevious ? (
                                <ArrowLeft size={15} />
                            ) : isNext ? (
                                <ArrowRight size={15} />
                            ) : (
                                label
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* =========================================================
 | MAIN PAGE
 ========================================================= */

export default function Index() {
    const {
        auth,
        pemeliharaan,
        hunianOptions = [],
        stats,
        filters = {},
        flash,
    } = usePage<PageProps>().props;

    /**
     * Hak akses frontend:
     * - superadmin: melihat dan mengelola data.
     * - anggota: hanya melihat data dan detail.
     *
     * Validasi backend tetap wajib diterapkan di controller.
     */
    const isSuperadmin = auth?.user?.role === "superadmin";

    const [modal, setModal] = useState<ModalType>(null);
    const [selected, setSelected] = useState<Maintenance | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [search, setSearch] = useState(filters.search ?? "");
    const [statusFilter, setStatusFilter] = useState(filters.status ?? "");
    const [jenisFilter, setJenisFilter] = useState(
        filters.jenis_kerusakan ?? "",
    );
    const [hunianFilter, setHunianFilter] = useState(
        String(filters.hunian_id ?? ""),
    );

    const form = useForm<FormData>(createEmptyForm());

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    const applyFilters = (overrides: Record<string, string> = {}) => {
        const query: Record<string, string> = {
            search,
            status: statusFilter,
            jenis_kerusakan: jenisFilter,
            hunian_id: hunianFilter,
            ...overrides,
        };

        const filteredQuery = Object.fromEntries(
            Object.entries(query).filter(([, value]) => value.trim() !== ""),
        );

        router.get("/pemeliharaan", filteredQuery, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("");
        setJenisFilter("");
        setHunianFilter("");

        router.get(
            "/pemeliharaan",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const openCreate = () => {
        if (!isSuperadmin) {
            toast.error("Anda tidak memiliki izin untuk menambah data.");
            return;
        }

        setSelected(null);
        form.clearErrors();
        form.setData(createEmptyForm());
        setModal("form");
    };

    const openEdit = (item: Maintenance) => {
        if (!isSuperadmin) {
            toast.error("Anda tidak memiliki izin untuk mengedit data.");
            return;
        }

        const data: FormData = {
            hunian_id: String(item.hunian_id),
            jenis_kerusakan: item.jenis_kerusakan,
            judul: item.judul,
            deskripsi: item.deskripsi,
            tanggal_laporan: item.tanggal_laporan?.slice(0, 10) ?? "",
            tanggal_mulai: item.tanggal_mulai?.slice(0, 10) ?? "",
            tanggal_selesai: item.tanggal_selesai?.slice(0, 10) ?? "",
            estimasi_biaya:
                item.estimasi_biaya == null ? "" : String(item.estimasi_biaya),
            realisasi_biaya:
                item.realisasi_biaya == null
                    ? ""
                    : String(item.realisasi_biaya),
            status: item.status,
            keterangan: item.keterangan ?? "",
        };

        setSelected(item);
        form.clearErrors();
        form.setData(data);
        setModal("form");
    };

    const closeModal = useCallback(() => {
        if (form.processing || deleting) return;

        setModal(null);
        setSelected(null);
        form.clearErrors();
    }, [form, deleting]);

    const submitForm = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!isSuperadmin) {
            toast.error("Anda tidak memiliki izin untuk menyimpan data.");
            setModal(null);
            setSelected(null);
            return;
        }

        if (form.processing) return;

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setModal(null);
                setSelected(null);
                form.clearErrors();
                form.setData(createEmptyForm());
            },
            onError: () => {
                toast.error("Periksa kembali data yang Anda masukkan.");
            },
        };

        if (selected) {
            form.put(`/pemeliharaan/${selected.id}`, options);
        } else {
            form.post("/pemeliharaan", options);
        }
    };

    const openDelete = (item: Maintenance) => {
        if (!isSuperadmin) {
            toast.error("Anda tidak memiliki izin untuk menghapus data.");
            return;
        }

        setSelected(item);
        setModal("delete");
    };

    const deleteItem = () => {
        if (!isSuperadmin) {
            toast.error("Anda tidak memiliki izin untuk menghapus data.");
            setModal(null);
            setSelected(null);
            return;
        }

        if (!selected || deleting) return;

        router.delete(`/pemeliharaan/${selected.id}`, {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onSuccess: () => {
                setModal(null);
                setSelected(null);
            },
            onError: () => {
                toast.error("Data pemeliharaan gagal dihapus.");
            },
            onFinish: () => {
                setDeleting(false);
            },
        });
    };

    const openDetail = (item: Maintenance) => {
        setSelected(item);
        setModal("detail");
    };

    const hasActiveFilter = Boolean(
        search || statusFilter || jenisFilter || hunianFilter,
    );

    const statsData = [
        {
            label: "Total Pemeliharaan",
            value: stats?.total ?? 0,
            icon: FileText,
            color: "text-[#0f2f5f] dark:text-blue-300",
            bg: "bg-blue-50 dark:bg-blue-950/40",
        },
        {
            label: "Dilaporkan",
            value: stats?.dilaporkan ?? 0,
            icon: AlertCircle,
            color: "text-amber-600 dark:text-amber-300",
            bg: "bg-amber-50 dark:bg-amber-950/40",
        },
        {
            label: "Sedang Diproses",
            value: stats?.diproses ?? 0,
            icon: Clock,
            color: "text-blue-600 dark:text-blue-300",
            bg: "bg-blue-50 dark:bg-blue-950/40",
        },
        {
            label: "Selesai",
            value: stats?.selesai ?? 0,
            icon: CheckCircle2,
            color: "text-emerald-600 dark:text-emerald-300",
            bg: "bg-emerald-50 dark:bg-emerald-950/40",
        },
    ];

    return (
        <>
            <Head title="Data Pemeliharaan" />
            <style>{ANIMATION_CSS}</style>

            <div className="pg-fade-in-up min-h-screen space-y-6 bg-slate-50/70 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
                {/* HEADER */}
                <header
                    className="pg-fade-in-up relative overflow-hidden rounded-2xl bg-[#0f2f5f] p-6 text-white shadow-lg sm:p-8"
                    style={{ animationDelay: "30ms" }}
                >
                    <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-[#d4af37]/20 blur-3xl" />

                    <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                        <div>
                            <div className="mb-3 flex items-center gap-2 text-sm text-blue-100">
                                <Wrench size={16} />
                                <span>Manajemen Hunian</span>
                                <ArrowRight size={14} />
                                <span>Pemeliharaan</span>
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                Data Pemeliharaan
                            </h1>

                            <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
                                Kelola laporan kerusakan, proses perbaikan, dan
                                biaya pemeliharaan hunian secara terpusat.
                            </p>
                        </div>

                        {/* Tambah hanya untuk superadmin */}
                        {isSuperadmin && (
                            <button
                                type="button"
                                onClick={openCreate}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 py-3 text-sm font-bold text-[#0f2f5f] shadow-md transition hover:bg-amber-300 focus:outline-none focus:ring-4 focus:ring-amber-200/40"
                            >
                                <Plus size={18} />
                                Tambah Pemeliharaan
                            </button>
                        )}
                    </div>
                </header>

                {/* STATISTIK */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statsData.map((item, index) => (
                        <StatCard
                            key={item.label}
                            {...item}
                            delay={index * 70}
                        />
                    ))}
                </section>

                {/* FILTER */}
                <section
                    className={`${cardClass} pg-fade-in-up p-5`}
                    style={{ animationDelay: "100ms" }}
                >
                    <div className="mb-4 flex items-center gap-2">
                        <Search
                            size={18}
                            className="text-[#0f2f5f] dark:text-blue-300"
                        />
                        <h2 className="font-bold text-slate-800 dark:text-white">
                            Filter Data
                        </h2>
                    </div>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            applyFilters();
                        }}
                        className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
                    >
                        <div className="relative xl:col-span-2">
                            <Search
                                size={17}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Cari judul atau deskripsi..."
                                className={`${inputClass} pl-10`}
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            className={inputClass}
                            aria-label="Filter status"
                        >
                            <option value="">Semua Status</option>
                            <option value="dilaporkan">Dilaporkan</option>
                            <option value="diproses">Diproses</option>
                            <option value="selesai">Selesai</option>
                            <option value="ditolak">Ditolak</option>
                        </select>

                        <select
                            value={jenisFilter}
                            onChange={(event) =>
                                setJenisFilter(event.target.value)
                            }
                            className={inputClass}
                            aria-label="Filter tingkat kerusakan"
                        >
                            <option value="">Semua Kerusakan</option>
                            <option value="ringan">Ringan</option>
                            <option value="berat">Berat</option>
                        </select>

                        <select
                            value={hunianFilter}
                            onChange={(event) =>
                                setHunianFilter(event.target.value)
                            }
                            className={inputClass}
                            aria-label="Filter hunian"
                        >
                            <option value="">Semua Hunian</option>
                            {hunianOptions.map((hunian) => (
                                <option key={hunian.id} value={hunian.id}>
                                    {getHunianName(hunian)}
                                </option>
                            ))}
                        </select>

                        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163f79]"
                            >
                                <Search size={16} />
                                Terapkan Filter
                            </button>

                            {hasActiveFilter && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    <X size={16} />
                                    Reset
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                {/* TABEL */}
                <section
                    className={`${cardClass} pg-fade-in-up overflow-hidden`}
                    style={{ animationDelay: "160ms" }}
                >
                    <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900 dark:text-white">
                                Daftar Pemeliharaan
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Data laporan dan perbaikan hunian.
                            </p>
                        </div>

                        <span className="inline-flex w-fit items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#0f2f5f] dark:bg-blue-950/50 dark:text-blue-300">
                            {(pemeliharaan?.total ?? 0).toLocaleString("id-ID")}{" "}
                            data
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                                <tr>
                                    {[
                                        "No.",
                                        "Laporan",
                                        "Hunian",
                                        "Kerusakan",
                                        "Tanggal Laporan",
                                        "Estimasi Biaya",
                                        "Status",
                                        "Aksi",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className={`px-5 py-4 font-semibold ${heading === "Aksi" ? "text-right" : ""}`}
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {(pemeliharaan?.data ?? []).length > 0 ? (
                                    pemeliharaan.data.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className="pg-fade-in transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                                            style={{
                                                animationDelay: `${Math.min(index, 10) * 30}ms`,
                                            }}
                                        >
                                            <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                                                {((pemeliharaan.current_page ??
                                                    1) -
                                                    1) *
                                                    (pemeliharaan.per_page ??
                                                        10) +
                                                    index +
                                                    1}
                                            </td>

                                            <td className="max-w-xs px-5 py-4">
                                                <p className="font-semibold text-slate-800 dark:text-white">
                                                    {item.judul}
                                                </p>
                                                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                                    {item.deskripsi}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="rounded-lg bg-blue-50 p-2 text-[#0f2f5f] dark:bg-blue-950/50 dark:text-blue-300">
                                                        <Home size={16} />
                                                    </div>
                                                    <span className="font-medium text-slate-700 dark:text-slate-200">
                                                        {getHunianName(
                                                            item.hunian,
                                                        )}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${damageClass(item.jenis_kerusakan)}`}
                                                >
                                                    {damageLabel(
                                                        item.jenis_kerusakan,
                                                    )}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">
                                                {formatDate(
                                                    item.tanggal_laporan,
                                                )}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700 dark:text-slate-200">
                                                {formatCurrency(
                                                    item.estimasi_biaya,
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge
                                                    status={item.status}
                                                />
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Detail tersedia untuk semua role */}
                                                    <button
                                                        type="button"
                                                        title="Lihat detail"
                                                        aria-label="Lihat detail"
                                                        onClick={() =>
                                                            openDetail(item)
                                                        }
                                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300"
                                                    >
                                                        <Eye size={17} />
                                                    </button>

                                                    {/* Edit dan hapus hanya untuk superadmin */}
                                                    {isSuperadmin && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                title="Edit data"
                                                                aria-label="Edit data"
                                                                onClick={() =>
                                                                    openEdit(
                                                                        item,
                                                                    )
                                                                }
                                                                className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                                            >
                                                                <Pencil
                                                                    size={17}
                                                                />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                title="Hapus data"
                                                                aria-label="Hapus data"
                                                                onClick={() =>
                                                                    openDelete(
                                                                        item,
                                                                    )
                                                                }
                                                                className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                            >
                                                                <Trash2
                                                                    size={17}
                                                                />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="pg-fade-in">
                                        <td
                                            colSpan={8}
                                            className="px-5 py-16 text-center"
                                        >
                                            <div className="mx-auto flex max-w-sm flex-col items-center">
                                                <div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-400 dark:bg-slate-800">
                                                    <FileText size={30} />
                                                </div>

                                                <p className="font-semibold text-slate-700 dark:text-slate-200">
                                                    {hasActiveFilter
                                                        ? "Data tidak ditemukan"
                                                        : "Belum ada data pemeliharaan"}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                    {hasActiveFilter
                                                        ? "Coba ubah filter atau kata kunci pencarian."
                                                        : "Belum ada laporan pemeliharaan yang dapat ditampilkan."}
                                                </p>

                                                {/* Tambah data kosong hanya untuk superadmin */}
                                                {!hasActiveFilter &&
                                                    isSuperadmin && (
                                                        <button
                                                            type="button"
                                                            onClick={openCreate}
                                                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0f2f5f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163f79]"
                                                        >
                                                            <Plus size={16} />
                                                            Tambah Data
                                                        </button>
                                                    )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination data={pemeliharaan} />
                </section>
            </div>

            {/* =================================================
                MODAL CREATE / EDIT
                HANYA SUPERADMIN
            ================================================= */}

            {isSuperadmin && modal === "form" && (
                <Modal
                    title={
                        selected ? "Edit Pemeliharaan" : "Tambah Pemeliharaan"
                    }
                    description={
                        selected
                            ? "Perbarui informasi laporan dan pemeliharaan hunian."
                            : "Lengkapi informasi laporan pemeliharaan hunian."
                    }
                    onClose={closeModal}
                >
                    <form onSubmit={submitForm}>
                        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="hunian_id"
                                        className={labelClass}
                                    >
                                        Hunian{" "}
                                        <span className="text-rose-500">*</span>
                                    </label>

                                    <select
                                        id="hunian_id"
                                        value={form.data.hunian_id}
                                        onChange={(event) =>
                                            form.setData(
                                                "hunian_id",
                                                event.target.value,
                                            )
                                        }
                                        required
                                        disabled={form.processing}
                                        className={inputClass}
                                    >
                                        <option value="">Pilih hunian</option>
                                        {hunianOptions.map((hunian) => (
                                            <option
                                                key={hunian.id}
                                                value={hunian.id}
                                            >
                                                {getHunianName(hunian)}
                                            </option>
                                        ))}
                                    </select>

                                    {form.errors.hunian_id && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.hunian_id}
                                        </p>
                                    )}

                                    {hunianOptions.length === 0 && (
                                        <p className="mt-1 text-xs text-amber-600">
                                            Belum ada pilihan hunian. Tambahkan
                                            data hunian terlebih dahulu.
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="judul"
                                        className={labelClass}
                                    >
                                        Judul Laporan{" "}
                                        <span className="text-rose-500">*</span>
                                    </label>

                                    <input
                                        id="judul"
                                        type="text"
                                        value={form.data.judul}
                                        onChange={(event) =>
                                            form.setData(
                                                "judul",
                                                event.target.value,
                                            )
                                        }
                                        required
                                        maxLength={255}
                                        disabled={form.processing}
                                        placeholder="Contoh: Kerusakan atap rumah dinas"
                                        className={inputClass}
                                    />

                                    {form.errors.judul && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.judul}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="jenis_kerusakan"
                                        className={labelClass}
                                    >
                                        Tingkat Kerusakan{" "}
                                        <span className="text-rose-500">*</span>
                                    </label>

                                    <select
                                        id="jenis_kerusakan"
                                        value={form.data.jenis_kerusakan}
                                        onChange={(event) =>
                                            form.setData(
                                                "jenis_kerusakan",
                                                event.target.value,
                                            )
                                        }
                                        required
                                        disabled={form.processing}
                                        className={inputClass}
                                    >
                                        <option value="ringan">Ringan</option>
                                        <option value="berat">Berat</option>
                                    </select>

                                    {form.errors.jenis_kerusakan && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.jenis_kerusakan}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="status"
                                        className={labelClass}
                                    >
                                        Status{" "}
                                        <span className="text-rose-500">*</span>
                                    </label>

                                    <select
                                        id="status"
                                        value={form.data.status}
                                        onChange={(event) =>
                                            form.setData(
                                                "status",
                                                event.target.value,
                                            )
                                        }
                                        required
                                        disabled={form.processing}
                                        className={inputClass}
                                    >
                                        <option value="dilaporkan">
                                            Dilaporkan
                                        </option>
                                        <option value="diproses">
                                            Diproses
                                        </option>
                                        <option value="selesai">Selesai</option>
                                        <option value="ditolak">Ditolak</option>
                                    </select>

                                    {form.errors.status && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.status}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="deskripsi"
                                        className={labelClass}
                                    >
                                        Deskripsi{" "}
                                        <span className="text-rose-500">*</span>
                                    </label>

                                    <textarea
                                        id="deskripsi"
                                        value={form.data.deskripsi}
                                        onChange={(event) =>
                                            form.setData(
                                                "deskripsi",
                                                event.target.value,
                                            )
                                        }
                                        required
                                        rows={4}
                                        disabled={form.processing}
                                        placeholder="Jelaskan kerusakan atau pekerjaan yang diperlukan..."
                                        className={`${inputClass} resize-y`}
                                    />

                                    {form.errors.deskripsi && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.deskripsi}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="tanggal_laporan"
                                        className={labelClass}
                                    >
                                        Tanggal Laporan{" "}
                                        <span className="text-rose-500">*</span>
                                    </label>

                                    <input
                                        id="tanggal_laporan"
                                        type="date"
                                        value={form.data.tanggal_laporan}
                                        onChange={(event) =>
                                            form.setData(
                                                "tanggal_laporan",
                                                event.target.value,
                                            )
                                        }
                                        required
                                        disabled={form.processing}
                                        className={inputClass}
                                    />

                                    {form.errors.tanggal_laporan && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.tanggal_laporan}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="tanggal_mulai"
                                        className={labelClass}
                                    >
                                        Tanggal Mulai
                                    </label>

                                    <input
                                        id="tanggal_mulai"
                                        type="date"
                                        value={form.data.tanggal_mulai}
                                        onChange={(event) =>
                                            form.setData(
                                                "tanggal_mulai",
                                                event.target.value,
                                            )
                                        }
                                        disabled={form.processing}
                                        className={inputClass}
                                    />

                                    {form.errors.tanggal_mulai && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.tanggal_mulai}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="tanggal_selesai"
                                        className={labelClass}
                                    >
                                        Tanggal Selesai
                                    </label>

                                    <input
                                        id="tanggal_selesai"
                                        type="date"
                                        value={form.data.tanggal_selesai}
                                        onChange={(event) =>
                                            form.setData(
                                                "tanggal_selesai",
                                                event.target.value,
                                            )
                                        }
                                        disabled={form.processing}
                                        className={inputClass}
                                    />

                                    {form.errors.tanggal_selesai && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.tanggal_selesai}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="estimasi_biaya"
                                        className={labelClass}
                                    >
                                        Estimasi Biaya (Rp)
                                    </label>

                                    <input
                                        id="estimasi_biaya"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={form.data.estimasi_biaya}
                                        onChange={(event) =>
                                            form.setData(
                                                "estimasi_biaya",
                                                event.target.value,
                                            )
                                        }
                                        disabled={form.processing}
                                        placeholder="0"
                                        className={inputClass}
                                    />

                                    {form.errors.estimasi_biaya && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.estimasi_biaya}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="realisasi_biaya"
                                        className={labelClass}
                                    >
                                        Realisasi Biaya (Rp)
                                    </label>

                                    <input
                                        id="realisasi_biaya"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={form.data.realisasi_biaya}
                                        onChange={(event) =>
                                            form.setData(
                                                "realisasi_biaya",
                                                event.target.value,
                                            )
                                        }
                                        disabled={form.processing}
                                        placeholder="0"
                                        className={inputClass}
                                    />

                                    {form.errors.realisasi_biaya && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.realisasi_biaya}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="keterangan"
                                        className={labelClass}
                                    >
                                        Keterangan Tambahan
                                    </label>

                                    <textarea
                                        id="keterangan"
                                        value={form.data.keterangan}
                                        onChange={(event) =>
                                            form.setData(
                                                "keterangan",
                                                event.target.value,
                                            )
                                        }
                                        rows={3}
                                        disabled={form.processing}
                                        placeholder="Catatan tambahan jika diperlukan..."
                                        className={`${inputClass} resize-y`}
                                    />

                                    {form.errors.keterangan && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {form.errors.keterangan}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={form.processing}
                                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    form.processing ||
                                    hunianOptions.length === 0
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163f79] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {form.processing ? (
                                    <>
                                        <LoaderCircle
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} />
                                        {selected
                                            ? "Simpan Perubahan"
                                            : "Simpan Data"}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* =================================================
                MODAL DETAIL
                DAPAT DIAKSES SUPERADMIN DAN ANGGOTA
            ================================================= */}

            {modal === "detail" && selected && (
                <Modal
                    title="Detail Pemeliharaan"
                    description="Informasi lengkap laporan pemeliharaan hunian."
                    onClose={closeModal}
                >
                    <div className="space-y-6 px-6 py-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Judul Laporan
                                </p>
                                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                                    {selected.judul}
                                </h3>
                            </div>

                            <StatusBadge status={selected.status} />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {[
                                {
                                    label: "Hunian",
                                    value: getHunianName(selected.hunian),
                                    icon: Home,
                                },
                                {
                                    label: "Tingkat Kerusakan",
                                    value: damageLabel(
                                        selected.jenis_kerusakan,
                                    ),
                                    icon: Hammer,
                                },
                                {
                                    label: "Tanggal Laporan",
                                    value: formatDate(selected.tanggal_laporan),
                                    icon: CalendarDays,
                                },
                                {
                                    label: "Estimasi Biaya",
                                    value: formatCurrency(
                                        selected.estimasi_biaya,
                                    ),
                                    icon: Banknote,
                                },
                                {
                                    label: "Tanggal Mulai",
                                    value: formatDate(selected.tanggal_mulai),
                                    icon: CalendarDays,
                                },
                                {
                                    label: "Tanggal Selesai",
                                    value: formatDate(selected.tanggal_selesai),
                                    icon: CheckCircle2,
                                },
                                {
                                    label: "Realisasi Biaya",
                                    value: formatCurrency(
                                        selected.realisasi_biaya,
                                    ),
                                    icon: Banknote,
                                },
                                {
                                    label: "Pelapor",
                                    value: selected.pelapor?.name ?? "—",
                                    icon: FileText,
                                },
                            ].map((detail, index) => {
                                const Icon = detail.icon;

                                return (
                                    <div
                                        key={detail.label}
                                        className="pg-fade-in-up rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                                        style={{
                                            animationDelay: `${index * 40}ms`,
                                        }}
                                    >
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <Icon size={16} />
                                            {detail.label}
                                        </div>

                                        <p className="mt-2 break-words font-semibold text-slate-800 dark:text-white">
                                            {detail.value}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        <div>
                            <h4 className="mb-2 text-sm font-bold text-slate-800 dark:text-white">
                                Deskripsi Kerusakan
                            </h4>

                            <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {selected.deskripsi || "—"}
                            </p>
                        </div>

                        <div>
                            <h4 className="mb-2 text-sm font-bold text-slate-800 dark:text-white">
                                Keterangan Tambahan
                            </h4>

                            <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {selected.keterangan || "—"}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Tutup
                        </button>

                        {/* Tombol edit di detail hanya untuk superadmin */}
                        {isSuperadmin && (
                            <button
                                type="button"
                                onClick={() => openEdit(selected)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163f79]"
                            >
                                <Pencil size={16} />
                                Edit Data
                            </button>
                        )}
                    </div>
                </Modal>
            )}

            {/* =================================================
                MODAL DELETE
                HANYA SUPERADMIN
            ================================================= */}

            {isSuperadmin && modal === "delete" && selected && (
                <Modal
                    title="Hapus Pemeliharaan"
                    description="Konfirmasi penghapusan data pemeliharaan."
                    onClose={closeModal}
                    size="max-w-lg"
                >
                    <div className="px-6 py-6">
                        <div className="flex items-start gap-4">
                            <div className="shrink-0 rounded-xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/40">
                                <Trash2 size={24} />
                            </div>

                            <div>
                                <p className="font-semibold text-slate-800 dark:text-white">
                                    Yakin ingin menghapus data ini?
                                </p>

                                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                                    Data laporan{" "}
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                        &quot;{selected.judul}&quot;
                                    </span>{" "}
                                    akan dihapus. Tindakan ini tidak dapat
                                    dibatalkan.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={deleting}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Batal
                        </button>

                        <button
                            type="button"
                            onClick={deleteItem}
                            disabled={deleting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {deleting ? (
                                <>
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                    Menghapus...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} />
                                    Ya, Hapus
                                </>
                            )}
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
}
