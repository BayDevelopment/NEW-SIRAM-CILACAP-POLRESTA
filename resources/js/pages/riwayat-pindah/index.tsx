import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    ArrowRight,
    ArrowRightLeft,
    Building2,
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Eye,
    Plus,
    Search,
    Trash2,
    UserRound,
    X,
} from "lucide-react";
import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type KeyboardEvent,
    type ReactNode,
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

type Anggota = {
    id: number;
    nama_lengkap: string;
    nrp: string | null;
};

type Unit = {
    id: number;
    nama_unit: string;
};

type Hunian = {
    id: number;
    unit_id: number;
    kode_hunian: string;
    nama_hunian: string;
    status_operasional: string;
    unit?: Unit | null;
};

type PenghunianOption = {
    id: number;
    anggota_id: number;
    hunian_id: number;
    tanggal_mulai: string;
    tanggal_selesai: string;
    anggota?: Anggota | null;
    hunian?: Hunian | null;
};

type RiwayatPindah = {
    id: number;
    anggota_id: number;
    penghunian_id: number | null;
    hunian_lama_id: number;
    hunian_baru_id: number;
    tanggal_pindah: string;
    alasan_pindah: string | null;
    keterangan: string | null;
    created_at?: string;
    can_rollback?: boolean;
    anggota?: Anggota | null;
    hunian_lama?: Hunian | null;
    hunian_baru?: Hunian | null;
    pemroses?: { id: number; name: string } | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLink[];
    from: number | null;
    to: number | null;
};

type Stats = {
    total: number;
    bulan_ini: number;
    tahun_ini: number;
};

type Filters = {
    search: string;
    dari: string;
    sampai: string;
};

type PageProps = {
    riwayat: Paginated<RiwayatPindah>;
    stats: Stats;
    penghunianOptions: PenghunianOption[];
    hunianOptions: Hunian[];
    filters: Filters;
    flash?: {
        success?: string;
        error?: string;
    };
};

type FormDataPindah = {
    penghunian_id: string;
    hunian_baru_id: string;
    tanggal_pindah: string;
    alasan_pindah: string;
    keterangan: string;
};

type ModalState =
    | { type: "create" }
    | { type: "detail"; item: RiwayatPindah }
    | { type: "delete"; item: RiwayatPindah }
    | null;

const EMPTY_FORM: FormDataPindah = {
    penghunian_id: "",
    hunian_baru_id: "",
    tanggal_pindah: "",
    alasan_pindah: "",
    keterangan: "",
};

const cardClass =
    "rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0f2f5f] focus:ring-2 focus:ring-[#0f2f5f]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800";

/* =========================================================
 | HELPERS
 ========================================================= */

function formatDate(value?: string | null): string {
    if (!value) return "—";

    const date = new Date(`${value.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

function formatDateTime(value?: string | null): string {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function hunianLabel(hunian?: Hunian | null): string {
    if (!hunian) return "—";

    return `${hunian.kode_hunian} — ${hunian.nama_hunian}${
        hunian.unit?.nama_unit ? ` (${hunian.unit.nama_unit})` : ""
    }`;
}

/* =========================================================
 | ACTION BUTTON
 ========================================================= */

function ActionButton({
    children,
    onClick,
    variant = "default",
    disabled = false,
    title,
}: {
    children: ReactNode;
    onClick: () => void;
    variant?: "default" | "primary" | "danger";
    disabled?: boolean;
    title?: string;
}) {
    const variants = {
        default:
            "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
        primary: "bg-[#0f2f5f] text-white hover:bg-[#163f79]",
        danger: "border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30",
    };

    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}
        >
            {children}
        </button>
    );
}

/* =========================================================
 | FORM FIELD
 ========================================================= */

function FormField({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                {label}
                {required && <span className="ml-1 text-rose-500">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
    );
}

/* =========================================================
 | EMPTY OPTION NOTICE
 ========================================================= */

function EmptyOptionNotice({ type }: { type: "anggota" | "hunian" }) {
    const isAnggota = type === "anggota";

    return (
        <div className="pg-fade-in rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
                {isAnggota
                    ? "Tidak ada anggota yang sedang menghuni. Perpindahan hanya bisa dilakukan untuk penghunian yang berstatus aktif."
                    : "Tidak ada hunian kosong yang tersedia sebagai tujuan pindah. Hunian yang sudah dihuni atau sedang diperbaiki tidak ditampilkan."}
            </p>

            <Link
                href={isAnggota ? "/penghunian" : "/hunian"}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f2f5f] underline underline-offset-4 hover:text-[#d4af37] dark:text-amber-300"
            >
                {isAnggota ? (
                    <UserRound className="size-4" />
                ) : (
                    <Building2 className="size-4" />
                )}
                {isAnggota ? "Kelola data penghunian" : "Kelola data hunian"}
            </Link>
        </div>
    );
}

/* =========================================================
 | SEARCHABLE SELECT
 ========================================================= */

function SearchableSelect<T extends { id: number }>({
    endpoint,
    initialItems,
    onSelect,
    getLabel,
    placeholder,
    disabled = false,
}: {
    endpoint: string;
    initialItems: T[];
    onSelect: (item: T) => void;
    getLabel: (item: T) => string;
    placeholder: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<T[]>(initialItems);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [current, setCurrent] = useState<T | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const handler = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);

        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        if (query.trim() === "") {
            setItems(initialItems);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);

        const timer = setTimeout(async () => {
            try {
                const response = await fetch(
                    `${endpoint}?q=${encodeURIComponent(query.trim())}`,
                    {
                        signal: controller.signal,
                        credentials: "same-origin",
                        headers: {
                            Accept: "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                        },
                    },
                );

                if (!response.ok) throw new Error("Gagal memuat data");

                const result = (await response.json()) as T[];

                if (!controller.signal.aborted) {
                    setItems(result);
                    setActiveIndex(0);
                }
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    toast.error("Gagal memuat data pencarian.");
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, open, endpoint, initialItems]);

    function choose(item: T) {
        setCurrent(item);
        onSelect(item);
        setOpen(false);
        setQuery("");
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) =>
                Math.min(index + 1, Math.max(items.length - 1, 0)),
            );
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (items[activeIndex]) choose(items[activeIndex]);
        } else if (event.key === "Escape") {
            event.stopPropagation();
            setOpen(false);
        }
    }

    return (
        <div ref={wrapperRef} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    setOpen((value) => !value);
                    setActiveIndex(0);
                }}
                className={`${inputClass} flex items-center justify-between gap-2 text-left`}
                aria-expanded={open}
            >
                <span className={`truncate ${current ? "" : "text-slate-400"}`}>
                    {current ? getLabel(current) : placeholder}
                </span>
                <ChevronDown className="size-4 shrink-0 text-slate-400" />
            </button>

            {open && (
                <div className="pg-fade-in absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <div className="relative border-b border-slate-100 p-2 dark:border-slate-800">
                        <Search className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ketik untuk mencari..."
                            className={`${inputClass} pl-9`}
                        />
                    </div>

                    <ul className="max-h-56 overflow-y-auto p-1">
                        {loading ? (
                            <li className="px-3 py-3 text-sm text-slate-500">
                                Memuat...
                            </li>
                        ) : items.length === 0 ? (
                            <li className="px-3 py-3 text-sm text-slate-500">
                                Data tidak ditemukan
                            </li>
                        ) : (
                            items.map((item, index) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onMouseEnter={() =>
                                            setActiveIndex(index)
                                        }
                                        onClick={() => choose(item)}
                                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                                            index === activeIndex
                                                ? "bg-blue-50 text-[#0f2f5f] dark:bg-blue-950/40 dark:text-blue-200"
                                                : "text-slate-700 dark:text-slate-200"
                                        } ${current?.id === item.id ? "font-semibold" : ""}`}
                                    >
                                        {getLabel(item)}
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* =========================================================
 | PAGINATION
 ========================================================= */

function Pagination<T>({ data }: { data: Paginated<T> }) {
    if (data.last_page <= 1) return null;

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
                Menampilkan {data.from ?? 0}–{data.to ?? 0} dari {data.total}{" "}
                data
            </p>

            <div className="flex flex-wrap items-center gap-1">
                {data.links.map((link, index) => {
                    const isPrevious =
                        link.label.toLowerCase().includes("previous") ||
                        link.label.includes("Sebelumnya") ||
                        link.label.includes("laquo");

                    const isNext =
                        link.label.toLowerCase().includes("next") ||
                        link.label.includes("Berikutnya") ||
                        link.label.includes("raquo");

                    const label = link.label
                        .replace(/&laquo;|&raquo;|&#039;|&amp;/g, "")
                        .replace(/<[^>]*>/g, "")
                        .trim();

                    return (
                        <button
                            key={`${link.label}-${index}`}
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
                            className={`inline-flex size-9 items-center justify-center rounded-lg text-xs font-semibold transition ${
                                link.active
                                    ? "bg-[#0f2f5f] text-white"
                                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                            } disabled:cursor-not-allowed disabled:opacity-40`}
                            aria-label={
                                isPrevious
                                    ? "Halaman sebelumnya"
                                    : isNext
                                      ? "Halaman berikutnya"
                                      : `Halaman ${label}`
                            }
                        >
                            {isPrevious ? (
                                <ChevronLeft className="size-4" />
                            ) : isNext ? (
                                <ChevronRight className="size-4" />
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
 | DETAIL ITEM
 ========================================================= */

function DetailItem({ label, value }: { label: string; value?: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <div className="break-words text-sm font-medium text-slate-800 dark:text-slate-100">
                {value || "—"}
            </div>
        </div>
    );
}

/* =========================================================
 | STAT CARD DENGAN STAGGER
 ========================================================= */

function StatCard({
    title,
    value,
    description,
    icon: Icon,
    accent,
    delay = 0,
}: {
    title: string;
    value: number;
    description: string;
    icon: typeof ClipboardList;
    accent: string;
    delay?: number;
}) {
    return (
        <div
            className={`${cardClass} pg-fade-in-up p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {title}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {value.toLocaleString("id-ID")}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{description}</p>
                </div>
                <div className={`rounded-xl p-3 ${accent}`}>
                    <Icon className="size-5" />
                </div>
            </div>
        </div>
    );
}

/* =========================================================
 | HALAMAN UTAMA
 ========================================================= */

export default function RiwayatPindahIndex() {
    const { riwayat, stats, penghunianOptions, hunianOptions, filters, flash } =
        usePage<PageProps>().props;

    const [modal, setModal] = useState<ModalState>(null);
    const [search, setSearch] = useState(filters.search ?? "");
    const [dari, setDari] = useState(filters.dari ?? "");
    const [sampai, setSampai] = useState(filters.sampai ?? "");
    const [formKey, setFormKey] = useState(0);

    const [selectedPenghunian, setSelectedPenghunian] =
        useState<PenghunianOption | null>(null);

    const form = useForm<FormDataPindah>({ ...EMPTY_FORM });
    const [deleting, setDeleting] = useState(false);

    const isCreating = modal?.type === "create";
    const canCreate = penghunianOptions.length > 0 && hunianOptions.length > 0;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash?.success, flash?.error]);

    useEffect(() => {
        if (!modal) return;

        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") {
                setModal(null);
                form.clearErrors();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [modal]);

    function openCreate() {
        if (!canCreate) {
            toast.error(
                "Belum ada anggota menghuni atau hunian tujuan yang tersedia.",
            );
            return;
        }

        form.reset();
        form.clearErrors();
        form.setData({ ...EMPTY_FORM });
        setSelectedPenghunian(null);
        setFormKey((key) => key + 1);
        setModal({ type: "create" });
    }

    function closeModal() {
        setModal(null);
        form.clearErrors();
    }

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (form.processing) return;

        if (!form.data.penghunian_id || !form.data.hunian_baru_id) {
            toast.error("Pilih anggota dan hunian tujuan terlebih dahulu.");
            return;
        }

        form.post("/riwayat-pindah", {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                form.reset();
                setSelectedPenghunian(null);
            },
        });
    }

    function applyFilters(next: Partial<Filters> = {}) {
        const merged = { search, dari, sampai, ...next };

        router.get(
            "/riwayat-pindah",
            {
                search: merged.search || undefined,
                dari: merged.dari || undefined,
                sampai: merged.sampai || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    function resetFilters() {
        setSearch("");
        setDari("");
        setSampai("");

        router.get(
            "/riwayat-pindah",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    function deleteItem(item: RiwayatPindah) {
        if (deleting) return;

        router.delete(`/riwayat-pindah/${item.id}`, {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => {
                setDeleting(false);
                setModal(null);
            },
        });
    }

    const hasActiveFilter = Boolean(search || dari || sampai);

    return (
        <>
            <Head title="Riwayat Pindah Hunian" />

            <style>{ANIMATION_CSS}</style>

            <div className="pg-fade-in-up min-h-screen space-y-6 bg-slate-50/70 p-4 dark:bg-slate-900/30 sm:p-6 lg:p-8">
                {/* HEADER */}
                <div
                    className="pg-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    style={{ animationDelay: "30ms" }}
                >
                    <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-[#0f2f5f] p-3 text-white shadow-sm">
                            <ArrowRightLeft className="size-6" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Riwayat Pindah Hunian
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                                Catat dan telusuri perpindahan anggota dari satu
                                hunian ke hunian lain.
                            </p>
                        </div>
                    </div>

                    <ActionButton
                        variant="primary"
                        onClick={openCreate}
                        disabled={!canCreate}
                        title={
                            !canCreate
                                ? "Belum ada anggota menghuni atau hunian tujuan yang tersedia"
                                : undefined
                        }
                    >
                        <Plus className="size-4" />
                        Proses Pindah
                    </ActionButton>
                </div>

                {/* PERINGATAN */}
                {!canCreate && (
                    <div
                        className={`${cardClass} pg-fade-in space-y-3 border-amber-200 p-4 dark:border-amber-900`}
                    >
                        <div className="flex items-start gap-3">
                            <ClipboardList className="mt-0.5 size-5 shrink-0 text-amber-600" />

                            <div>
                                <h2 className="font-semibold text-slate-900 dark:text-white">
                                    Perpindahan belum bisa diproses
                                </h2>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Dibutuhkan anggota dengan penghunian aktif
                                    dan hunian kosong sebagai tujuan.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            {penghunianOptions.length === 0 && (
                                <EmptyOptionNotice type="anggota" />
                            )}
                            {hunianOptions.length === 0 && (
                                <EmptyOptionNotice type="hunian" />
                            )}
                        </div>
                    </div>
                )}

                {/* STATISTIK */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        title="Total Perpindahan"
                        value={stats.total}
                        description="Seluruh catatan"
                        icon={ClipboardList}
                        accent="bg-blue-50 text-[#0f2f5f] dark:bg-blue-950/40 dark:text-blue-300"
                        delay={0}
                    />
                    <StatCard
                        title="Bulan Ini"
                        value={stats.bulan_ini}
                        description="Perpindahan bulan berjalan"
                        icon={CalendarDays}
                        accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        delay={70}
                    />
                    <StatCard
                        title="Tahun Ini"
                        value={stats.tahun_ini}
                        description="Perpindahan tahun berjalan"
                        icon={ArrowRightLeft}
                        accent="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        delay={140}
                    />
                </div>

                {/* TABEL RIWAYAT */}
                <section
                    className={`${cardClass} pg-fade-in-up overflow-hidden`}
                    style={{ animationDelay: "100ms" }}
                >
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h2 className="font-semibold text-slate-900 dark:text-white">
                                Daftar Riwayat
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Cari berdasarkan anggota, NRP, atau hunian lama
                                dan baru.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            applyFilters();
                                        }
                                    }}
                                    placeholder="Cari riwayat..."
                                    className={`${inputClass} min-w-0 pl-9 lg:w-64`}
                                />
                            </div>

                            <input
                                type="date"
                                value={dari}
                                max={sampai || undefined}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setDari(value);
                                    applyFilters({ dari: value });
                                }}
                                className={`${inputClass} lg:w-40`}
                                aria-label="Dari tanggal"
                            />

                            <input
                                type="date"
                                value={sampai}
                                min={dari || undefined}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setSampai(value);
                                    applyFilters({ sampai: value });
                                }}
                                className={`${inputClass} lg:w-40`}
                                aria-label="Sampai tanggal"
                            />

                            <ActionButton onClick={() => applyFilters()}>
                                <Search className="size-4" />
                                Cari
                            </ActionButton>

                            {hasActiveFilter && (
                                <ActionButton onClick={resetFilters}>
                                    <X className="size-4" />
                                    Reset
                                </ActionButton>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left text-sm">
                            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-4">Anggota</th>
                                    <th className="px-5 py-4">Perpindahan</th>
                                    <th className="px-5 py-4">Tanggal</th>
                                    <th className="px-5 py-4">Alasan</th>
                                    <th className="px-5 py-4">Diproses oleh</th>
                                    <th className="px-5 py-4 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {riwayat.data.length === 0 ? (
                                    <tr className="pg-fade-in">
                                        <td
                                            colSpan={6}
                                            className="px-5 py-16 text-center"
                                        >
                                            <div className="mx-auto flex max-w-sm flex-col items-center">
                                                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                                                    <ArrowRightLeft className="size-7 text-slate-400" />
                                                </div>

                                                <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                                                    {hasActiveFilter
                                                        ? "Riwayat tidak ditemukan"
                                                        : "Belum ada riwayat pindah"}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {hasActiveFilter
                                                        ? "Coba ubah kata kunci atau rentang tanggal."
                                                        : "Perpindahan hunian yang diproses akan tercatat di sini."}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    riwayat.data.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className="pg-fade-in transition hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
                                            style={{
                                                animationDelay: `${Math.min(index, 10) * 30}ms`,
                                            }}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0f2f5f] dark:bg-blue-950/50 dark:text-blue-300">
                                                        <UserRound className="size-5" />
                                                    </div>

                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                                                            {item.anggota
                                                                ?.nama_lengkap ??
                                                                "Anggota tidak ditemukan"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            NRP:{" "}
                                                            {item.anggota
                                                                ?.nrp ?? "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                                                            {item.hunian_lama
                                                                ?.kode_hunian ??
                                                                "—"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {item.hunian_lama
                                                                ?.nama_hunian ??
                                                                "Hunian tidak ditemukan"}
                                                        </p>
                                                    </div>

                                                    <ArrowRight className="size-4 shrink-0 text-slate-400" />

                                                    <div>
                                                        <p className="font-semibold text-[#0f2f5f] dark:text-blue-300">
                                                            {item.hunian_baru
                                                                ?.kode_hunian ??
                                                                "—"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {item.hunian_baru
                                                                ?.nama_hunian ??
                                                                "Hunian tidak ditemukan"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-slate-700 dark:text-slate-200">
                                                {formatDate(
                                                    item.tanggal_pindah,
                                                )}
                                            </td>

                                            <td className="max-w-[240px] px-5 py-4">
                                                <p className="line-clamp-2 text-slate-600 dark:text-slate-300">
                                                    {item.alasan_pindah || "—"}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                                {item.pemroses?.name ?? "—"}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        title="Detail"
                                                        onClick={() =>
                                                            setModal({
                                                                type: "detail",
                                                                item,
                                                            })
                                                        }
                                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-[#0f2f5f] dark:hover:bg-blue-950/40"
                                                    >
                                                        <Eye className="size-4" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title={
                                                            item.can_rollback
                                                                ? "Hapus & rollback"
                                                                : "Tidak dapat dihapus: bukan riwayat terbaru, atau penghunian sudah berubah"
                                                        }
                                                        disabled={
                                                            !item.can_rollback
                                                        }
                                                        onClick={() =>
                                                            setModal({
                                                                type: "delete",
                                                                item,
                                                            })
                                                        }
                                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 dark:hover:bg-rose-950/40"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination data={riwayat} />
                </section>
            </div>

            {/* =================================================
                MODAL CREATE
            ================================================= */}

            {isCreating && (
                <div
                    className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeModal();
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pindah-modal-title"
                        className="pg-pop-in my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                            <div>
                                <h2
                                    id="pindah-modal-title"
                                    className="text-lg font-bold text-slate-900 dark:text-white"
                                >
                                    Proses Pindah Hunian
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Pilih anggota, hunian tujuan, dan tanggal
                                    pindah.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                                aria-label="Tutup modal"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={submitForm} className="space-y-5 p-5">
                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <FormField
                                        label="Anggota (penghunian aktif)"
                                        required
                                        error={form.errors.penghunian_id}
                                    >
                                        <SearchableSelect<PenghunianOption>
                                            key={`penghunian-${formKey}`}
                                            endpoint="/riwayat-pindah/options/penghunian"
                                            initialItems={penghunianOptions}
                                            onSelect={(item) => {
                                                setSelectedPenghunian(item);
                                                form.setData(
                                                    "penghunian_id",
                                                    String(item.id),
                                                );
                                            }}
                                            getLabel={(item) =>
                                                `${item.anggota?.nama_lengkap ?? "—"}${
                                                    item.anggota?.nrp
                                                        ? ` — ${item.anggota.nrp}`
                                                        : ""
                                                } · ${item.hunian?.kode_hunian ?? "—"}`
                                            }
                                            placeholder="Pilih anggota"
                                            disabled={form.processing}
                                        />
                                    </FormField>

                                    {selectedPenghunian && (
                                        <div className="pg-fade-in mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
                                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                Hunian saat ini
                                            </p>
                                            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
                                                {hunianLabel(
                                                    selectedPenghunian.hunian,
                                                )}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Mulai menghuni:{" "}
                                                {formatDate(
                                                    selectedPenghunian.tanggal_mulai,
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <FormField
                                        label="Hunian Tujuan"
                                        required
                                        error={form.errors.hunian_baru_id}
                                    >
                                        <SearchableSelect<Hunian>
                                            key={`hunian-${formKey}`}
                                            endpoint="/riwayat-pindah/options/hunian"
                                            initialItems={hunianOptions}
                                            onSelect={(item) =>
                                                form.setData(
                                                    "hunian_baru_id",
                                                    String(item.id),
                                                )
                                            }
                                            getLabel={hunianLabel}
                                            placeholder="Pilih hunian tujuan"
                                            disabled={form.processing}
                                        />
                                    </FormField>
                                </div>

                                <FormField
                                    label="Tanggal Pindah"
                                    required
                                    error={form.errors.tanggal_pindah}
                                >
                                    <input
                                        type="date"
                                        min={
                                            selectedPenghunian?.tanggal_mulai?.slice(
                                                0,
                                                10,
                                            ) || undefined
                                        }
                                        value={form.data.tanggal_pindah}
                                        onChange={(event) =>
                                            form.setData(
                                                "tanggal_pindah",
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                        required
                                    />
                                </FormField>

                                <div className="md:col-span-2">
                                    <FormField
                                        label="Alasan Pindah"
                                        error={form.errors.alasan_pindah}
                                    >
                                        <textarea
                                            rows={3}
                                            maxLength={2000}
                                            value={form.data.alasan_pindah}
                                            onChange={(event) =>
                                                form.setData(
                                                    "alasan_pindah",
                                                    event.target.value,
                                                )
                                            }
                                            className={inputClass}
                                            placeholder="Masukkan alasan pindah..."
                                        />
                                    </FormField>
                                </div>

                                <div className="md:col-span-2">
                                    <FormField
                                        label="Keterangan"
                                        error={form.errors.keterangan}
                                    >
                                        <textarea
                                            rows={3}
                                            maxLength={2000}
                                            value={form.data.keterangan}
                                            onChange={(event) =>
                                                form.setData(
                                                    "keterangan",
                                                    event.target.value,
                                                )
                                            }
                                            className={inputClass}
                                            placeholder="Keterangan tambahan (opsional)"
                                        />
                                    </FormField>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
                                <ActionButton
                                    onClick={closeModal}
                                    disabled={form.processing}
                                >
                                    Batal
                                </ActionButton>

                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163f79] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {form.processing
                                        ? "Menyimpan..."
                                        : "Simpan Perpindahan"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* =================================================
                MODAL DETAIL
            ================================================= */}

            {modal?.type === "detail" && (
                <div
                    className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeModal();
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="detail-pindah-title"
                        className={`${cardClass} pg-pop-in my-auto w-full max-w-2xl overflow-hidden`}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                            <div>
                                <h2
                                    id="detail-pindah-title"
                                    className="text-lg font-bold text-slate-900 dark:text-white"
                                >
                                    Detail Perpindahan
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Informasi lengkap riwayat pindah hunian.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                aria-label="Tutup modal"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            <DetailItem
                                label="Nama Anggota"
                                value={modal.item.anggota?.nama_lengkap}
                            />
                            <DetailItem
                                label="NRP"
                                value={modal.item.anggota?.nrp}
                            />
                            <DetailItem
                                label="Hunian Lama"
                                value={hunianLabel(modal.item.hunian_lama)}
                            />
                            <DetailItem
                                label="Hunian Baru"
                                value={hunianLabel(modal.item.hunian_baru)}
                            />
                            <DetailItem
                                label="Tanggal Pindah"
                                value={formatDate(modal.item.tanggal_pindah)}
                            />
                            <DetailItem
                                label="Diproses Oleh"
                                value={modal.item.pemroses?.name}
                            />
                            <DetailItem
                                label="Dicatat Pada"
                                value={formatDateTime(modal.item.created_at)}
                            />

                            <div className="sm:col-span-2">
                                <DetailItem
                                    label="Alasan Pindah"
                                    value={modal.item.alasan_pindah}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <DetailItem
                                    label="Keterangan"
                                    value={modal.item.keterangan}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-slate-100 p-5 dark:border-slate-800">
                            <ActionButton onClick={closeModal}>
                                Tutup
                            </ActionButton>
                        </div>
                    </section>
                </div>
            )}

            {/* =================================================
                MODAL HAPUS / ROLLBACK
            ================================================= */}

            {modal?.type === "delete" && (
                <div
                    className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !deleting) {
                            closeModal();
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-pindah-title"
                        className={`${cardClass} pg-pop-in w-full max-w-md p-6`}
                    >
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40">
                            <Trash2 className="size-6" />
                        </div>

                        <h2
                            id="delete-pindah-title"
                            className="mt-4 text-center text-lg font-bold text-slate-900 dark:text-white"
                        >
                            Hapus Riwayat &amp; Rollback?
                        </h2>

                        <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
                            <strong>
                                {modal.item.anggota?.nama_lengkap ?? "Anggota"}
                            </strong>{" "}
                            akan dikembalikan dari hunian{" "}
                            <strong>
                                {modal.item.hunian_baru?.kode_hunian ?? "—"}
                            </strong>{" "}
                            ke hunian{" "}
                            <strong>
                                {modal.item.hunian_lama?.kode_hunian ?? "—"}
                            </strong>
                            , dan catatan riwayat ini dihapus.
                        </p>

                        <p className="mt-2 text-center text-xs text-slate-400">
                            Rollback ditolak jika hunian lama sudah dihuni
                            anggota lain atau sedang diperbaiki.
                        </p>

                        <div className="mt-6 flex justify-center gap-2">
                            <ActionButton
                                onClick={closeModal}
                                disabled={deleting}
                            >
                                Batal
                            </ActionButton>

                            <ActionButton
                                variant="danger"
                                onClick={() => deleteItem(modal.item)}
                                disabled={deleting}
                            >
                                <Trash2 className="size-4" />
                                {deleting ? "Memproses..." : "Ya, hapus"}
                            </ActionButton>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}
