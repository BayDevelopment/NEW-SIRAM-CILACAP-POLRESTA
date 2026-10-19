import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Eye,
    FileText,
    Home,
    Pencil,
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

type Status = "aktif" | "selesai" | "dibatalkan";

type Anggota = {
    id: number;
    nama_lengkap: string;
    nrp: string | null;
};

type Unit = {
    id: number;
    nama_unit: string;
};

type HunianOption = {
    id: number;
    unit_id: number;
    kode_hunian: string;
    nama_hunian: string;
    status_operasional: string;
    unit?: Unit | null;
};

type Penghunian = {
    id: number;
    anggota_id: number;
    hunian_id: number;
    tanggal_mulai: string;
    tanggal_selesai: string;
    status: Status;
    alasan_penghunian: string | null;
    keterangan: string | null;
    dokumen_perjanjian: string | null;
    dokumen_url?: string | null;
    disetujui_at: string | null;
    anggota?: Anggota | null;
    hunian?: HunianOption | null;
    penyetuju?: {
        id: number;
        name: string;
    } | null;
    created_at?: string;
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
    aktif: number;
    selesai: number;
    dibatalkan: number;
};

type Filters = {
    search: string;
    status: string;
};

type PageProps = {
    penghunian: Paginated<Penghunian>;
    stats: Stats;
    anggotaOptions: Anggota[];
    hunianOptions: HunianOption[];
    filters: Filters;
    can: {
        manage_anggota: boolean;
        manage_penghunian: boolean;
    };
    flash?: {
        success?: string;
        error?: string;
    };
};

type FormDataPenghunian = {
    anggota_id: string;
    hunian_id: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    status: Status;
    alasan_penghunian: string;
    keterangan: string;
    dokumen_perjanjian: File | null;
    _method?: "put";
};

type ModalState =
    | { type: "create" }
    | { type: "edit"; item: Penghunian }
    | { type: "detail"; item: Penghunian }
    | { type: "delete"; item: Penghunian }
    | null;

const EMPTY_FORM: FormDataPenghunian = {
    anggota_id: "",
    hunian_id: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    status: "aktif",
    alasan_penghunian: "",
    keterangan: "",
    dokumen_perjanjian: null,
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
    { value: "aktif", label: "Aktif" },
    { value: "selesai", label: "Selesai" },
    { value: "dibatalkan", label: "Dibatalkan" },
];

const cardClass =
    "rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0f2f5f] focus:ring-2 focus:ring-[#0f2f5f]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800";

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
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to { opacity: 1; transform: none; }
}
.pg-fade-in { animation: pg-fade-in 200ms ease-out both; }
.pg-fade-in-up { animation: pg-fade-in-up 350ms ease-out both; }
.pg-pop-in { animation: pg-pop-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both; }
@media (prefers-reduced-motion: reduce) {
    .pg-fade-in, .pg-fade-in-up, .pg-pop-in {
        animation: none !important;
        transition: none !important;
    }
}
`;

function statusLabel(status: Status): string {
    return (
        STATUS_OPTIONS.find((option) => option.value === status)?.label ??
        status
    );
}

function statusClass(status: Status): string {
    switch (status) {
        case "aktif":
            return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300";
        case "selesai":
            return "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300";
        case "dibatalkan":
            return "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300";
    }
}

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

function StatusBadge({ status }: { status: Status }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(status)}`}
        >
            {statusLabel(status)}
        </span>
    );
}

function ActionButton({
    children,
    onClick,
    variant = "default",
    disabled = false,
    title,
}: {
    children: ReactNode;
    onClick: () => void;
    variant?: "default" | "danger" | "primary";
    disabled?: boolean;
    title?: string;
}) {
    const variants = {
        default:
            "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
        danger: "border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30",
        primary: "bg-[#0f2f5f] text-white hover:bg-[#163f79]",
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

function EmptyOptionNotice({
    type,
    canManageAnggota,
}: {
    type: "anggota" | "hunian";
    canManageAnggota: boolean;
}) {
    const isAnggota = type === "anggota";

    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
                {isAnggota
                    ? "Tidak ada anggota yang tersedia untuk penghunian baru. Anggota yang sedang menghuni tidak ditampilkan."
                    : "Tidak ada hunian yang tersedia untuk ditempati. Hunian yang sudah dihuni atau sedang diperbaiki tidak ditampilkan."}
            </p>

            {isAnggota && !canManageAnggota ? (
                <p className="mt-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                    Data anggota hanya dapat dikelola oleh superadmin. Hubungi
                    superadmin untuk menambahkan anggota.
                </p>
            ) : (
                <Link
                    href={isAnggota ? "/anggota" : "/hunian"}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f2f5f] underline underline-offset-4 hover:text-[#d4af37] dark:text-amber-300"
                >
                    {isAnggota ? (
                        <UserRound className="size-4" />
                    ) : (
                        <Building2 className="size-4" />
                    )}
                    {isAnggota ? "Kelola data anggota" : "Kelola data hunian"}
                </Link>
            )}
        </div>
    );
}

function SearchableSelect<T extends { id: number }>({
    endpoint,
    initialItems,
    selected,
    onSelect,
    getLabel,
    placeholder,
    editingId,
    disabled = false,
}: {
    endpoint: string;
    initialItems: T[];
    selected: T | null;
    onSelect: (item: T) => void;
    getLabel: (item: T) => string;
    placeholder: string;
    editingId?: number | null;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<T[]>(initialItems);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [current, setCurrent] = useState<T | null>(selected);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCurrent(selected);
    }, [selected]);

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
                const params = new URLSearchParams({ q: query.trim() });

                if (editingId) {
                    params.set("editing_id", String(editingId));
                }

                const response = await fetch(`${endpoint}?${params}`, {
                    signal: controller.signal,
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                });

                if (!response.ok) {
                    throw new Error("Gagal memuat data");
                }

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
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, open, endpoint, initialItems, editingId]);

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

            if (items[activeIndex]) {
                choose(items[activeIndex]);
            }
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
            >
                <span className={`truncate ${current ? "" : "text-slate-400"}`}>
                    {current ? getLabel(current) : placeholder}
                </span>

                <ChevronDown
                    className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                    }`}
                />
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
                                        } ${
                                            current?.id === item.id
                                                ? "font-semibold"
                                                : ""
                                        }`}
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

function Pagination({ data }: { data: Paginated<Penghunian> }) {
    if (data.last_page <= 1) return null;

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
                Menampilkan {data.from ?? 0}–{data.to ?? 0} dari {data.total}{" "}
                data
            </p>

            <div className="flex flex-wrap items-center gap-1">
                {data.links.map((link, index) => {
                    const label = link.label
                        .replace(/<[^>]*>/g, "")
                        .replace(/&laquo;/g, "«")
                        .replace(/&raquo;/g, "»")
                        .replace(/&amp;/g, "&")
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
    icon: typeof Home;
    accent: string;
    delay?: number;
}) {
    return (
        <div
            style={{ animationDelay: `${delay}ms` }}
            className={`${cardClass} pg-fade-in-up p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
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

export default function PenghunianIndex() {
    const {
        penghunian,
        stats,
        anggotaOptions,
        hunianOptions,
        filters,
        can,
        flash,
    } = usePage<PageProps>().props;

    const canManageAnggota = can?.manage_anggota === true;
    const canManagePenghunian = can?.manage_penghunian === true;

    const [modal, setModal] = useState<ModalState>(null);
    const [search, setSearch] = useState(filters.search ?? "");
    const [statusFilter, setStatusFilter] = useState(filters.status ?? "");
    const [formKey, setFormKey] = useState(0);

    const form = useForm<FormDataPenghunian>({ ...EMPTY_FORM });

    const editingItem = modal?.type === "edit" ? modal.item : null;
    const isFormModal = modal?.type === "create" || modal?.type === "edit";
    const isCreating = modal?.type === "create";

    const canCreate =
        canManagePenghunian &&
        anggotaOptions.length > 0 &&
        hunianOptions.length > 0;

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

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [modal]);

    function openCreate() {
        if (!canManagePenghunian) {
            toast.error("Anda tidak memiliki izin mengelola penghunian.");
            return;
        }

        if (anggotaOptions.length === 0 || hunianOptions.length === 0) {
            toast.error("Belum ada anggota atau hunian yang tersedia.");
            return;
        }

        form.transform((data) => {
            const { _method, ...payload } = data;
            return payload;
        });

        form.reset();
        form.clearErrors();
        form.setData({ ...EMPTY_FORM });

        setFormKey((key) => key + 1);
        setModal({ type: "create" });
    }

    function openEdit(item: Penghunian) {
        if (!canManagePenghunian) {
            toast.error("Anda tidak memiliki izin mengedit penghunian.");
            return;
        }

        form.transform((data) => {
            const { _method, ...payload } = data;
            return payload;
        });

        form.clearErrors();

        form.setData({
            anggota_id: String(item.anggota_id),
            hunian_id: String(item.hunian_id),
            tanggal_mulai: item.tanggal_mulai?.slice(0, 10) ?? "",
            tanggal_selesai: item.tanggal_selesai?.slice(0, 10) ?? "",
            status: item.status,
            alasan_penghunian: item.alasan_penghunian ?? "",
            keterangan: item.keterangan ?? "",
            dokumen_perjanjian: null,
        });

        setFormKey((key) => key + 1);
        setModal({ type: "edit", item });
    }

    function openDelete(item: Penghunian) {
        if (!canManagePenghunian) {
            toast.error("Anda tidak memiliki izin menghapus penghunian.");
            return;
        }

        setModal({ type: "delete", item });
    }

    function closeModal() {
        setModal(null);
        form.clearErrors();
    }

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canManagePenghunian) {
            toast.error("Anda tidak memiliki izin menyimpan penghunian.");
            return;
        }

        if (form.processing) return;

        if (!form.data.anggota_id || !form.data.hunian_id) {
            toast.error("Pilih anggota dan hunian terlebih dahulu.");
            return;
        }

        if (isCreating) {
            form.transform((data) => {
                const { _method, ...payload } = data;
                return payload;
            });

            form.post("/penghunian", {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    closeModal();
                    form.reset();
                },
            });

            return;
        }

        if (modal?.type === "edit") {
            const itemId = modal.item.id;

            form.transform((data) => {
                const { _method, ...payload } = data;

                return {
                    ...payload,
                    _method: "put" as const,
                };
            });

            form.post(`/penghunian/${itemId}`, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    form.transform((data) => {
                        const { _method, ...payload } = data;
                        return payload;
                    });

                    closeModal();
                    form.reset();
                },
            });
        }
    }

    function deleteItem(item: Penghunian) {
        if (!canManagePenghunian) {
            toast.error("Anda tidak memiliki izin menghapus penghunian.");
            return;
        }

        router.delete(`/penghunian/${item.id}`, {
            preserveScroll: true,
            onSuccess: () => setModal(null),
            onError: () => {
                toast.error("Data penghunian gagal dihapus.");
            },
        });
    }

    function applyFilters(nextSearch = search, nextStatus = statusFilter) {
        router.get(
            "/penghunian",
            {
                search: nextSearch || undefined,
                status: nextStatus || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    return (
        <>
            <Head title="Data Penghunian" />
            <style>{ANIMATION_CSS}</style>

            <div className="pg-fade-in-up min-h-screen space-y-6 bg-slate-50/70 p-4 dark:bg-slate-900/30 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-[#0f2f5f] p-3 text-white shadow-sm">
                            <Home className="size-6" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Data Penghunian
                            </h1>

                            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                                Kelola penempatan anggota pada hunian, periode
                                tinggal, status, dan dokumen perjanjian.
                            </p>
                        </div>
                    </div>

                    {canManagePenghunian && (
                        <ActionButton
                            variant="primary"
                            onClick={openCreate}
                            disabled={!canCreate}
                            title={
                                !canCreate
                                    ? "Anggota atau hunian yang tersedia belum ada"
                                    : undefined
                            }
                        >
                            <Plus className="size-4" />
                            Tambah Penghunian
                        </ActionButton>
                    )}
                </div>

                {!canCreate && canManagePenghunian && (
                    <div
                        className={`${cardClass} pg-fade-in space-y-3 border-amber-200 p-4 dark:border-amber-900`}
                    >
                        <div className="flex items-start gap-3">
                            <ClipboardList className="mt-0.5 size-5 shrink-0 text-amber-600" />
                            <div>
                                <h2 className="font-semibold text-slate-900 dark:text-white">
                                    Data belum lengkap
                                </h2>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Penghunian baru hanya dapat dibuat jika
                                    terdapat anggota yang belum menghuni dan
                                    hunian yang masih tersedia.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            {anggotaOptions.length === 0 && (
                                <EmptyOptionNotice
                                    type="anggota"
                                    canManageAnggota={canManageAnggota}
                                />
                            )}

                            {hunianOptions.length === 0 && (
                                <EmptyOptionNotice
                                    type="hunian"
                                    canManageAnggota={canManageAnggota}
                                />
                            )}
                        </div>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Total Penghunian"
                        value={stats.total}
                        description="Seluruh catatan"
                        icon={ClipboardList}
                        accent="bg-blue-50 text-[#0f2f5f] dark:bg-blue-950/40 dark:text-blue-300"
                        delay={0}
                    />

                    <StatCard
                        title="Aktif"
                        value={stats.aktif}
                        description="Sedang berlangsung"
                        icon={CheckCircle2}
                        accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        delay={60}
                    />

                    <StatCard
                        title="Selesai"
                        value={stats.selesai}
                        description="Periode berakhir"
                        icon={CalendarDays}
                        accent="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        delay={120}
                    />

                    <StatCard
                        title="Dibatalkan"
                        value={stats.dibatalkan}
                        description="Penghunian dibatalkan"
                        icon={X}
                        accent="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        delay={180}
                    />
                </div>

                <section className={`${cardClass} overflow-hidden`}>
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="font-semibold text-slate-900 dark:text-white">
                                Daftar Penghunian
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Cari berdasarkan anggota, NRP, kode hunian, atau
                                nama hunian.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
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
                                    placeholder="Cari penghunian..."
                                    className={`${inputClass} min-w-0 pl-9 sm:w-64`}
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(event) => {
                                    setStatusFilter(event.target.value);
                                    applyFilters(search, event.target.value);
                                }}
                                className={`${inputClass} sm:w-40`}
                            >
                                <option value="">Semua status</option>

                                {STATUS_OPTIONS.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <ActionButton onClick={() => applyFilters()}>
                                <Search className="size-4" />
                                Cari
                            </ActionButton>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left text-sm">
                            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-4">Anggota</th>
                                    <th className="px-5 py-4">Hunian</th>
                                    <th className="px-5 py-4">Periode</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4">Dokumen</th>
                                    <th className="px-5 py-4 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {penghunian.data.length === 0 ? (
                                    <tr className="pg-fade-in">
                                        <td
                                            colSpan={6}
                                            className="px-5 py-16 text-center"
                                        >
                                            <div className="mx-auto flex max-w-sm flex-col items-center">
                                                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                                                    <Home className="size-7 text-slate-400" />
                                                </div>

                                                <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                                                    Belum ada data penghunian
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {canManagePenghunian
                                                        ? "Tambahkan penghunian setelah anggota dan hunian tersedia."
                                                        : "Belum ada penghunian pada unit Anda."}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    penghunian.data.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            style={{
                                                animationDelay: `${Math.min(index, 10) * 30}ms`,
                                            }}
                                            className="pg-fade-in transition hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
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
                                                <p className="font-semibold text-slate-800 dark:text-slate-100">
                                                    {item.hunian?.kode_hunian ??
                                                        "—"}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.hunian?.nama_hunian ??
                                                        "Hunian tidak ditemukan"}
                                                </p>

                                                {item.hunian?.unit
                                                    ?.nama_unit && (
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {
                                                            item.hunian.unit
                                                                .nama_unit
                                                        }
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="text-slate-700 dark:text-slate-200">
                                                    {formatDate(
                                                        item.tanggal_mulai,
                                                    )}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    s.d.{" "}
                                                    {formatDate(
                                                        item.tanggal_selesai,
                                                    )}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge
                                                    status={item.status}
                                                />
                                            </td>

                                            <td className="px-5 py-4">
                                                {item.dokumen_url ||
                                                item.dokumen_perjanjian ? (
                                                    <a
                                                        href={
                                                            item.dokumen_url ??
                                                            `/storage/${item.dokumen_perjanjian}`
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 font-medium text-[#0f2f5f] hover:underline dark:text-blue-300"
                                                    >
                                                        <FileText className="size-4" />
                                                        Lihat dokumen
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-400">
                                                        Tidak ada dokumen
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-1.5">
                                                    {/* Detail untuk semua role yang memiliki akses halaman */}
                                                    <button
                                                        type="button"
                                                        title="Detail"
                                                        aria-label="Lihat detail penghunian"
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

                                                    {/* Edit dan hapus berdasarkan izin backend */}
                                                    {canManagePenghunian && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                title="Edit"
                                                                aria-label="Edit penghunian"
                                                                onClick={() =>
                                                                    openEdit(
                                                                        item,
                                                                    )
                                                                }
                                                                className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40"
                                                            >
                                                                <Pencil className="size-4" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                title="Hapus"
                                                                aria-label="Hapus penghunian"
                                                                onClick={() =>
                                                                    openDelete(
                                                                        item,
                                                                    )
                                                                }
                                                                className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
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

                    <Pagination data={penghunian} />
                </section>
            </div>

            {/* MODAL CREATE / EDIT */}
            {canManagePenghunian && isFormModal && (
                <div
                    className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeModal();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="penghunian-modal-title"
                        className="pg-pop-in my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                            <div>
                                <h2
                                    id="penghunian-modal-title"
                                    className="text-lg font-bold text-slate-900 dark:text-white"
                                >
                                    {isCreating
                                        ? "Tambah Penghunian"
                                        : "Edit Penghunian"}
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Lengkapi anggota, hunian, periode, dan
                                    informasi penghunian.
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

                        <form
                            onSubmit={submitForm}
                            encType="multipart/form-data"
                            className="space-y-5 p-5"
                        >
                            <div className="grid gap-5 md:grid-cols-2">
                                <FormField
                                    label="Anggota"
                                    required
                                    error={form.errors.anggota_id}
                                >
                                    <SearchableSelect<Anggota>
                                        key={`anggota-${formKey}`}
                                        endpoint="/penghunian/options/anggota"
                                        initialItems={anggotaOptions}
                                        selected={editingItem?.anggota ?? null}
                                        editingId={editingItem?.id ?? null}
                                        onSelect={(item) =>
                                            form.setData(
                                                "anggota_id",
                                                String(item.id),
                                            )
                                        }
                                        getLabel={(anggota) =>
                                            anggota.nrp
                                                ? `${anggota.nama_lengkap} — ${anggota.nrp}`
                                                : anggota.nama_lengkap
                                        }
                                        placeholder="Pilih anggota"
                                        disabled={form.processing}
                                    />
                                </FormField>

                                <FormField
                                    label="Hunian"
                                    required
                                    error={form.errors.hunian_id}
                                >
                                    <SearchableSelect<HunianOption>
                                        key={`hunian-${formKey}`}
                                        endpoint="/penghunian/options/hunian"
                                        initialItems={hunianOptions}
                                        selected={editingItem?.hunian ?? null}
                                        editingId={editingItem?.id ?? null}
                                        onSelect={(item) =>
                                            form.setData(
                                                "hunian_id",
                                                String(item.id),
                                            )
                                        }
                                        getLabel={(hunian) =>
                                            `${hunian.kode_hunian} — ${hunian.nama_hunian}${
                                                hunian.unit?.nama_unit
                                                    ? ` (${hunian.unit.nama_unit})`
                                                    : ""
                                            }`
                                        }
                                        placeholder="Pilih hunian"
                                        disabled={form.processing}
                                    />
                                </FormField>

                                <FormField
                                    label="Tanggal Mulai"
                                    required
                                    error={form.errors.tanggal_mulai}
                                >
                                    <input
                                        type="date"
                                        value={form.data.tanggal_mulai}
                                        onChange={(event) =>
                                            form.setData(
                                                "tanggal_mulai",
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                        required
                                        disabled={form.processing}
                                    />
                                </FormField>

                                <FormField
                                    label="Tanggal Selesai"
                                    required
                                    error={form.errors.tanggal_selesai}
                                >
                                    <input
                                        type="date"
                                        min={
                                            form.data.tanggal_mulai || undefined
                                        }
                                        value={form.data.tanggal_selesai}
                                        onChange={(event) =>
                                            form.setData(
                                                "tanggal_selesai",
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                        required
                                        disabled={form.processing}
                                    />
                                </FormField>

                                <FormField
                                    label="Status Penghunian"
                                    required
                                    error={form.errors.status}
                                >
                                    <select
                                        value={form.data.status}
                                        onChange={(event) =>
                                            form.setData(
                                                "status",
                                                event.target.value as Status,
                                            )
                                        }
                                        className={inputClass}
                                        required
                                        disabled={form.processing}
                                    >
                                        {STATUS_OPTIONS.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>

                                <FormField
                                    label="Dokumen Perjanjian"
                                    error={form.errors.dokumen_perjanjian}
                                >
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(event) =>
                                            form.setData(
                                                "dokumen_perjanjian",
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                        disabled={form.processing}
                                        className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold dark:file:bg-slate-800`}
                                    />

                                    <p className="text-xs text-slate-400">
                                        PDF, JPG, JPEG, PNG. Maksimal 5 MB.
                                    </p>
                                </FormField>

                                <div className="md:col-span-2">
                                    <FormField
                                        label="Alasan Penghunian"
                                        error={form.errors.alasan_penghunian}
                                    >
                                        <textarea
                                            rows={3}
                                            maxLength={2000}
                                            value={form.data.alasan_penghunian}
                                            onChange={(event) =>
                                                form.setData(
                                                    "alasan_penghunian",
                                                    event.target.value,
                                                )
                                            }
                                            disabled={form.processing}
                                            className={inputClass}
                                            placeholder="Masukkan alasan penghunian..."
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
                                            disabled={form.processing}
                                            className={inputClass}
                                            placeholder="Keterangan tambahan (opsional)"
                                        />
                                    </FormField>
                                </div>
                            </div>

                            {modal?.type === "edit" &&
                                (modal.item.dokumen_url ||
                                    modal.item.dokumen_perjanjian) && (
                                    <a
                                        href={
                                            modal.item.dokumen_url ??
                                            `/storage/${modal.item.dokumen_perjanjian}`
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-[#0f2f5f] hover:underline dark:text-blue-300"
                                    >
                                        <FileText className="size-4" />
                                        Lihat dokumen saat ini
                                    </a>
                                )}

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
                                        : isCreating
                                          ? "Simpan Penghunian"
                                          : "Simpan Perubahan"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* MODAL DETAIL */}
            {modal?.type === "detail" && (
                <div
                    className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeModal();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        className={`${cardClass} pg-pop-in my-auto w-full max-w-2xl overflow-hidden`}
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Detail Penghunian
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Informasi lengkap catatan penghunian.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                aria-label="Tutup detail"
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
                                label="Kode Hunian"
                                value={modal.item.hunian?.kode_hunian}
                            />

                            <DetailItem
                                label="Nama Hunian"
                                value={modal.item.hunian?.nama_hunian}
                            />

                            <DetailItem
                                label="Unit / Satuan"
                                value={modal.item.hunian?.unit?.nama_unit}
                            />

                            <DetailItem
                                label="Status"
                                value={
                                    <StatusBadge status={modal.item.status} />
                                }
                            />

                            <DetailItem
                                label="Tanggal Mulai"
                                value={formatDate(modal.item.tanggal_mulai)}
                            />

                            <DetailItem
                                label="Tanggal Selesai"
                                value={formatDate(modal.item.tanggal_selesai)}
                            />

                            <DetailItem
                                label="Disetujui Oleh"
                                value={modal.item.penyetuju?.name}
                            />

                            <DetailItem
                                label="Tanggal Persetujuan"
                                value={formatDateTime(modal.item.disetujui_at)}
                            />

                            <div className="sm:col-span-2">
                                <DetailItem
                                    label="Alasan Penghunian"
                                    value={modal.item.alasan_penghunian}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <DetailItem
                                    label="Keterangan"
                                    value={modal.item.keterangan}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <DetailItem
                                    label="Dokumen Perjanjian"
                                    value={
                                        modal.item.dokumen_url ||
                                        modal.item.dokumen_perjanjian ? (
                                            <a
                                                href={
                                                    modal.item.dokumen_url ??
                                                    `/storage/${modal.item.dokumen_perjanjian}`
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-[#0f2f5f] hover:underline dark:text-blue-300"
                                            >
                                                <FileText className="size-4" />
                                                Buka dokumen
                                            </a>
                                        ) : (
                                            "Tidak ada dokumen"
                                        )
                                    }
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

            {/* MODAL DELETE */}
            {canManagePenghunian && modal?.type === "delete" && (
                <div
                    className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeModal();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-penghunian-title"
                        className={`${cardClass} pg-pop-in w-full max-w-md p-6`}
                    >
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40">
                            <Trash2 className="size-6" />
                        </div>

                        <h2
                            id="delete-penghunian-title"
                            className="mt-4 text-center text-lg font-bold text-slate-900 dark:text-white"
                        >
                            Hapus Data Penghunian?
                        </h2>

                        <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
                            Data penghunian untuk{" "}
                            <strong>
                                {modal.item.anggota?.nama_lengkap ?? "anggota"}
                            </strong>{" "}
                            pada hunian{" "}
                            <strong>
                                {modal.item.hunian?.kode_hunian ?? "—"}
                            </strong>{" "}
                            akan dihapus dari daftar.
                        </p>

                        <p className="mt-2 text-center text-xs text-slate-400">
                            Data dapat dipulihkan oleh administrator karena
                            memakai soft delete.
                        </p>

                        <div className="mt-6 flex justify-center gap-2">
                            <ActionButton onClick={closeModal}>
                                Batal
                            </ActionButton>

                            <ActionButton
                                variant="danger"
                                onClick={() => deleteItem(modal.item)}
                            >
                                <Trash2 className="size-4" />
                                Ya, hapus
                            </ActionButton>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}
