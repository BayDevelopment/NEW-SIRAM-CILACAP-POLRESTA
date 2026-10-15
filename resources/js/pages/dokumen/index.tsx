import { Head, router, useForm } from "@inertiajs/react";
import {
    ArrowDownToLine,
    FileText,
    FileUp,
    Filter,
    Pencil,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    X,
    Files,
    ClipboardList,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

type JenisDokumen =
    | "surat_permohonan"
    | "surat_penempatan"
    | "surat_persetujuan"
    | "berita_acara"
    | "dokumen_lainnya";

interface Hunian {
    id: number;
    kode_hunian?: string | null;
    nama_hunian?: string | null;
}

interface Anggota {
    id: number;
    nama_lengkap?: string | null;
    nama?: string | null;
    nrp?: string | null;
}

interface Penghunian {
    id: number;
    hunian?: Hunian | null;
    anggota?: Anggota | null;
}

interface Dokumen {
    id: number;
    penghunian_id: number;
    jenis_dokumen: JenisDokumen;
    nama_dokumen: string;
    file_path: string;
    file_type: string | null;
    file_size: number | null;
    created_at: string;
    updated_at: string;
    penghunian?: Penghunian | null;
}

interface PenghunianOption {
    id: number;
    label: string;
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

interface Filters {
    search: string;
    jenis_dokumen: string;
    penghunian_id: string | number;
}

interface Stats {
    total: number;
    surat_permohonan: number;
    surat_penempatan: number;
    berita_acara: number;
}

interface Props {
    dokumen: Paginated<Dokumen>;
    penghunianOptions: PenghunianOption[];
    stats: Stats;
    filters: Filters;
    jenisDokumen: JenisDokumen[];
}

const JENIS_LABEL: Record<JenisDokumen, string> = {
    surat_permohonan: "Surat Permohonan",
    surat_penempatan: "Surat Penempatan",
    surat_persetujuan: "Surat Persetujuan",
    berita_acara: "Berita Acara",
    dokumen_lainnya: "Dokumen Lainnya",
};

const EMPTY_FORM = {
    penghunian_id: "",
    jenis_dokumen: "surat_permohonan" as JenisDokumen,
    nama_dokumen: "",
    file: null as File | null,
};

const DOKUMEN_ANIMATION_STYLES = `
@keyframes pg-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes pg-fade-in-up {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes pg-pop-in {
    from {
        opacity: 0;
        transform: translateY(12px) scale(0.97);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.pg-fade-in {
    animation: pg-fade-in 200ms ease-out both;
}

.pg-fade-in-up {
    animation: pg-fade-in-up 350ms ease-out both;
}

.pg-pop-in {
    animation: pg-pop-in 250ms ease-out both;
}

.pg-stagger > * {
    animation: pg-fade-in-up 350ms ease-out both;
}

.pg-stagger > *:nth-child(1) { animation-delay: 50ms; }
.pg-stagger > *:nth-child(2) { animation-delay: 100ms; }
.pg-stagger > *:nth-child(3) { animation-delay: 150ms; }
.pg-stagger > *:nth-child(4) { animation-delay: 200ms; }

@media (prefers-reduced-motion: reduce) {
    .pg-fade-in,
    .pg-fade-in-up,
    .pg-pop-in,
    .pg-stagger > * {
        animation: none !important;
    }
}
`;

function formatDate(value: string): string {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function formatBytes(bytes: number | null): string {
    if (!bytes || bytes < 1024) return `${bytes ?? 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(path: string): string {
    return path.split(".").pop()?.toUpperCase() || "FILE";
}

function getPenghunianLabel(item: Dokumen): string {
    const penghunian = item.penghunian;
    const anggota =
        penghunian?.anggota?.nama_lengkap ??
        penghunian?.anggota?.nama ??
        "Anggota tidak tersedia";
    const hunian =
        penghunian?.hunian?.kode_hunian ??
        penghunian?.hunian?.nama_hunian ??
        `Penghunian #${item.penghunian_id}`;

    return `${anggota} — ${hunian}`;
}

function StatCard({
    title,
    value,
    icon: Icon,
    description,
}: {
    title: string;
    value: number;
    icon: typeof Files;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {title}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {value.toLocaleString("id-ID")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-[#0f2f5f] dark:bg-blue-950/50 dark:text-blue-300">
                    <Icon size={22} />
                </div>
            </div>
        </div>
    );
}

export default function DokumenIndex({
    dokumen,
    penghunianOptions,
    stats,
    filters,
    jenisDokumen,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [jenisFilter, setJenisFilter] = useState(filters.jenis_dokumen ?? "");
    const [penghunianFilter, setPenghunianFilter] = useState(
        String(filters.penghunian_id ?? ""),
    );
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Dokumen | null>(null);

    const form = useForm<{
        penghunian_id: string;
        jenis_dokumen: JenisDokumen;
        nama_dokumen: string;
        file: File | null;
    }>({ ...EMPTY_FORM });

    useEffect(() => {
        setSearch(filters.search ?? "");
        setJenisFilter(filters.jenis_dokumen ?? "");
        setPenghunianFilter(String(filters.penghunian_id ?? ""));
    }, [filters.search, filters.jenis_dokumen, filters.penghunian_id]);

    useEffect(() => {
        if (!modalOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setModalOpen(false);
                setEditing(null);
                form.clearErrors();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [modalOpen]);

    const applyFilters = (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();

        router.get(
            "/dokumen",
            {
                search,
                jenis_dokumen: jenisFilter,
                penghunian_id: penghunianFilter,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const resetFilters = () => {
        setSearch("");
        setJenisFilter("");
        setPenghunianFilter("");

        router.get(
            "/dokumen",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const openCreateModal = () => {
        setEditing(null);
        form.reset();
        form.clearErrors();
        form.setData({ ...EMPTY_FORM });
        setModalOpen(true);
    };

    const openEditModal = (item: Dokumen) => {
        setEditing(item);
        form.clearErrors();
        form.setData({
            penghunian_id: String(item.penghunian_id),
            jenis_dokumen: item.jenis_dokumen,
            nama_dokumen: item.nama_dokumen,
            file: null,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        form.clearErrors();
    };

    const submitForm = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (editing) {
            router.post(
                `/dokumen/${editing.id}`,
                {
                    penghunian_id: form.data.penghunian_id,
                    jenis_dokumen: form.data.jenis_dokumen,
                    nama_dokumen: form.data.nama_dokumen,
                    file: form.data.file,
                    _method: "put",
                },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        closeModal();
                        toast.success("Dokumen berhasil diperbarui.");
                    },
                    onError: (errors) => {
                        Object.entries(errors).forEach(([key, message]) => {
                            form.setError(
                                key as keyof typeof form.data,
                                String(message),
                            );
                        });
                    },
                },
            );

            return;
        }

        form.post("/dokumen", {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                toast.success("Dokumen berhasil diunggah.");
            },
        });
    };

    const deleteDokumen = (item: Dokumen) => {
        if (
            !window.confirm(
                `Hapus dokumen "${item.nama_dokumen}"? File yang terkait juga akan dihapus.`,
            )
        ) {
            return;
        }

        router.delete(`/dokumen/${item.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success("Dokumen berhasil dihapus."),
        });
    };

    const downloadUrl = (item: Dokumen) => `/dokumen/${item.id}/download`;

    return (
        <>
            <Head title="Dokumen Penghunian" />

            <style>{DOKUMEN_ANIMATION_STYLES}</style>

            <div className="pg-fade-in min-h-screen space-y-6 bg-slate-50/80 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
                {/* Header */}
                <div className="pg-fade-in-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f2f5f] via-[#174477] to-[#245b83] p-6 text-white shadow-lg sm:p-8">
                    <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

                    <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
                        <div>
                            <div className="mb-3 flex items-center gap-2 text-sm text-blue-100">
                                <ClipboardList size={16} />
                                <span>Administrasi Hunian</span>
                                <span className="text-blue-300">/</span>
                                <span>Dokumen</span>
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                Dokumen Penghunian
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                                Kelola arsip surat permohonan, penempatan,
                                persetujuan, dan berita acara penghunian dalam
                                satu tempat.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 py-3 text-sm font-semibold text-[#172b4d] shadow-md transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-white/80"
                        >
                            <Plus size={18} />
                            Unggah Dokumen
                        </button>
                    </div>
                </div>

                {/* Statistics */}
                <div className="pg-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Total Dokumen"
                        value={stats.total}
                        icon={Files}
                        description="Seluruh arsip tersimpan"
                    />
                    <StatCard
                        title="Surat Permohonan"
                        value={stats.surat_permohonan}
                        icon={FileText}
                        description="Dokumen pengajuan hunian"
                    />
                    <StatCard
                        title="Surat Penempatan"
                        value={stats.surat_penempatan}
                        icon={ShieldCheck}
                        description="Dokumen penetapan hunian"
                    />
                    <StatCard
                        title="Berita Acara"
                        value={stats.berita_acara}
                        icon={ClipboardList}
                        description="Dokumen serah terima"
                    />
                </div>

                {/* Filters */}
                <div className="pg-fade-in-up rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
                    <form onSubmit={applyFilters}>
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                            <Filter
                                size={17}
                                className="text-[#0f2f5f] dark:text-blue-300"
                            />
                            Filter Dokumen
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1.4fr_auto]">
                            <div className="relative">
                                <Search
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Cari nama dokumen, anggota, hunian..."
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
                                />
                            </div>

                            <select
                                value={jenisFilter}
                                onChange={(event) =>
                                    setJenisFilter(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            >
                                <option value="">Semua jenis dokumen</option>
                                {jenisDokumen.map((jenis) => (
                                    <option key={jenis} value={jenis}>
                                        {JENIS_LABEL[jenis]}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={penghunianFilter}
                                onChange={(event) =>
                                    setPenghunianFilter(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            >
                                <option value="">Semua data penghunian</option>
                                {penghunianOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174477]"
                                >
                                    <Search size={16} />
                                    Cari
                                </button>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    title="Reset filter"
                                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Table */}
                <div className="pg-fade-in-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                        <div>
                            <h2 className="font-bold text-slate-900 dark:text-white">
                                Daftar Dokumen
                            </h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Arsip dokumen yang terhubung dengan data
                                penghunian.
                            </p>
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {dokumen.total.toLocaleString("id-ID")} dokumen
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[950px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">
                                        Dokumen
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                        Jenis
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                        Data Penghunian
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                        File
                                    </th>
                                    <th className="px-5 py-4 font-semibold">
                                        Tanggal Upload
                                    </th>
                                    <th className="px-5 py-4 text-right font-semibold">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {dokumen.data.length > 0 ? (
                                    dokumen.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0f2f5f] dark:bg-blue-950/50 dark:text-blue-300">
                                                        <FileText size={21} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="max-w-[260px] truncate font-semibold text-slate-800 dark:text-slate-100">
                                                            {item.nama_dokumen}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            ID dokumen #
                                                            {item.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                    {
                                                        JENIS_LABEL[
                                                            item.jenis_dokumen
                                                        ]
                                                    }
                                                </span>
                                            </td>

                                            <td className="max-w-[260px] px-5 py-4">
                                                <p className="font-medium text-slate-700 dark:text-slate-200">
                                                    {getPenghunianLabel(item)}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Penghunian #
                                                    {item.penghunian_id}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                                        {getFileExtension(
                                                            item.file_path,
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {formatBytes(
                                                            item.file_size,
                                                        )}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">
                                                {formatDate(item.created_at)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <a
                                                        href={downloadUrl(item)}
                                                        title="Unduh dokumen"
                                                        className="rounded-lg p-2 text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/50"
                                                    >
                                                        <ArrowDownToLine
                                                            size={17}
                                                        />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(item)
                                                        }
                                                        title="Edit dokumen"
                                                        className="rounded-lg p-2 text-amber-700 transition hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                                                    >
                                                        <Pencil size={17} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deleteDokumen(item)
                                                        }
                                                        title="Hapus dokumen"
                                                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-5 py-16 text-center"
                                        >
                                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                                                <Files size={27} />
                                            </div>
                                            <p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">
                                                Belum ada dokumen
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Unggah dokumen baru atau ubah
                                                filter pencarian.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={openCreateModal}
                                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0f2f5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#174477]"
                                            >
                                                <Plus size={16} />
                                                Unggah Dokumen
                                            </button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {dokumen.last_page > 1 && (
                        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Menampilkan {dokumen.from ?? 0}–
                                {dokumen.to ?? 0} dari {dokumen.total} dokumen
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {dokumen.links.map((link, index) => (
                                    <button
                                        key={`${link.label}-${index}`}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() => {
                                            if (link.url) {
                                                router.visit(link.url, {
                                                    preserveScroll: true,
                                                    preserveState: true,
                                                });
                                            }
                                        }}
                                        className={`min-w-9 rounded-lg px-3 py-2 text-sm transition ${
                                            link.active
                                                ? "bg-[#0f2f5f] font-semibold text-white"
                                                : "border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                        }`}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Upload / Edit modal */}
                {modalOpen && (
                    <div
                        className="pg-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) {
                                closeModal();
                            }
                        }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="dokumen-modal-title"
                            className="pg-pop-in my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                        >
                            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
                                <div>
                                    <h2
                                        id="dokumen-modal-title"
                                        className="text-lg font-bold text-slate-900 dark:text-white"
                                    >
                                        {editing
                                            ? "Edit Dokumen"
                                            : "Unggah Dokumen"}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        {editing
                                            ? "Perbarui informasi atau ganti file dokumen."
                                            : "Lengkapi informasi dan pilih file yang akan diarsipkan."}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    aria-label="Tutup modal"
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={submitForm}>
                                <div className="space-y-5 p-5 sm:p-6">
                                    <div>
                                        <label
                                            htmlFor="penghunian_id"
                                            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                                        >
                                            Data Penghunian{" "}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </label>
                                        <select
                                            id="penghunian_id"
                                            required
                                            value={form.data.penghunian_id}
                                            onChange={(event) =>
                                                form.setData(
                                                    "penghunian_id",
                                                    event.target.value,
                                                )
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                        >
                                            <option value="">
                                                Pilih data penghunian
                                            </option>
                                            {penghunianOptions.map((option) => (
                                                <option
                                                    key={option.id}
                                                    value={option.id}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        {form.errors.penghunian_id && (
                                            <p className="mt-1.5 text-xs text-red-600">
                                                {form.errors.penghunian_id}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor="jenis_dokumen"
                                                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                                            >
                                                Jenis Dokumen{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </label>
                                            <select
                                                id="jenis_dokumen"
                                                value={form.data.jenis_dokumen}
                                                onChange={(event) =>
                                                    form.setData(
                                                        "jenis_dokumen",
                                                        event.target
                                                            .value as JenisDokumen,
                                                    )
                                                }
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                            >
                                                {jenisDokumen.map((jenis) => (
                                                    <option
                                                        key={jenis}
                                                        value={jenis}
                                                    >
                                                        {JENIS_LABEL[jenis]}
                                                    </option>
                                                ))}
                                            </select>
                                            {form.errors.jenis_dokumen && (
                                                <p className="mt-1.5 text-xs text-red-600">
                                                    {form.errors.jenis_dokumen}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="nama_dokumen"
                                                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                                            >
                                                Nama Dokumen{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                id="nama_dokumen"
                                                type="text"
                                                required
                                                maxLength={200}
                                                value={form.data.nama_dokumen}
                                                onChange={(event) =>
                                                    form.setData(
                                                        "nama_dokumen",
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Contoh: Surat Penempatan Anggota"
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                            />
                                            {form.errors.nama_dokumen && (
                                                <p className="mt-1.5 text-xs text-red-600">
                                                    {form.errors.nama_dokumen}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="file"
                                            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                                        >
                                            File Dokumen{" "}
                                            {!editing && (
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            )}
                                        </label>

                                        <label
                                            htmlFor="file"
                                            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
                                        >
                                            <div className="rounded-xl bg-white p-3 text-[#0f2f5f] shadow-sm dark:bg-slate-800 dark:text-blue-300">
                                                <FileUp size={25} />
                                            </div>
                                            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                {form.data.file
                                                    ? form.data.file.name
                                                    : "Klik untuk memilih file"}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                PDF, JPG, JPEG, atau PNG ·
                                                Maksimal 10 MB
                                            </p>
                                            {editing && (
                                                <p className="mt-2 text-xs text-slate-500">
                                                    Kosongkan jika tidak ingin
                                                    mengganti file.
                                                </p>
                                            )}
                                            <input
                                                id="file"
                                                type="file"
                                                required={!editing}
                                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                                className="sr-only"
                                                onChange={(event) =>
                                                    form.setData(
                                                        "file",
                                                        event.target
                                                            .files?.[0] ?? null,
                                                    )
                                                }
                                            />
                                        </label>

                                        {form.errors.file && (
                                            <p className="mt-1.5 text-xs text-red-600">
                                                {form.errors.file}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                                        <ShieldCheck
                                            size={17}
                                            className="mt-0.5 shrink-0"
                                        />
                                        <p>
                                            Pastikan dokumen sesuai dengan data
                                            penghunian yang dipilih. File hanya
                                            menerima format yang diizinkan dan
                                            dibatasi maksimal 10 MB.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-slate-800 dark:bg-slate-950/50">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2f5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174477] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <FileUp size={16} />
                                        {form.processing
                                            ? "Menyimpan..."
                                            : editing
                                              ? "Simpan Perubahan"
                                              : "Unggah Dokumen"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
