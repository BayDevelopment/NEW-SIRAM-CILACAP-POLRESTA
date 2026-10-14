import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    Ban,
    CalendarCheck,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Edit3,
    Eye,
    FileText,
    Filter,
    Loader2,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";
import { toast } from "sonner";

import {
    CrudButton,
    CrudModal,
    FormField,
    FormInput,
    FormSelect,
    FormTextarea,
} from "@/components/crud-ui";

/* ============================================================================
   TYPE
============================================================================ */

type Status = "aktif" | "selesai" | "dibatalkan";

type Anggota = {
    id: number;
    nama: string;
    nrp: string | null;
};

type HunianOption = {
    id: number;
    kode_hunian: string;
    nama_hunian: string;
    status_operasional: string;
    unit?: { id?: number; nama_unit: string } | null;
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
    dokumen_url: string | null;
    disetujui_at: string | null;
    anggota?: Anggota | null;
    hunian?: {
        id: number;
        kode_hunian: string;
        nama_hunian: string;
        unit?: { nama_unit: string } | null;
    } | null;
    penyetuju?: { id: number; name: string } | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedPenghunian = {
    data: Penghunian[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
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

type Flash = {
    success?: string | null;
    error?: string | null;
    warning?: string | null;
    info?: string | null;
};

type PageProps = {
    penghunian: PaginatedPenghunian;
    stats: Stats;
    anggotaOptions: Anggota[];
    hunianOptions: HunianOption[];
    filters: Filters;
    flash?: Flash;
};

type PenghunianForm = {
    anggota_id: string;
    hunian_id: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    status: Status;
    alasan_penghunian: string;
    keterangan: string;
    dokumen_perjanjian: File | null;
};

type ModalState =
    | { type: "create" }
    | { type: "edit"; item: Penghunian }
    | { type: "show"; item: Penghunian }
    | { type: "delete"; item: Penghunian }
    | null;

/* ============================================================================
   CONSTANT
============================================================================ */

const STATUS_OPTIONS: { value: Status; label: string }[] = [
    { value: "aktif", label: "Aktif" },
    { value: "selesai", label: "Selesai" },
    { value: "dibatalkan", label: "Dibatalkan" },
];

const EMPTY_FORM: PenghunianForm = {
    anggota_id: "",
    hunian_id: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    status: "aktif",
    alasan_penghunian: "",
    keterangan: "",
    dokumen_perjanjian: null,
};

const cardClass =
    "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

/* ============================================================================
   HELPER
============================================================================ */

function statusLabel(value: Status): string {
    return STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function statusClass(value: Status): string {
    if (value === "aktif") {
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    }

    if (value === "selesai") {
        return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
    }

    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
}

function todayLocal(): string {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${d.getFullYear()}-${month}-${day}`;
}

function formatDate(value: string | null | undefined): string {
    if (!value) {
        return "-";
    }

    const date = new Date(`${value.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDateTime(value: string | null | undefined): string {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function toFormData(item: Penghunian): PenghunianForm {
    return {
        anggota_id: String(item.anggota_id),
        hunian_id: String(item.hunian_id),
        tanggal_mulai: item.tanggal_mulai?.slice(0, 10) ?? "",
        tanggal_selesai: item.tanggal_selesai?.slice(0, 10) ?? "",
        status: item.status,
        alasan_penghunian: item.alasan_penghunian ?? "",
        keterangan: item.keterangan ?? "",
        dokumen_perjanjian: null,
    };
}

/* ============================================================================
   PAGE
============================================================================ */

export default function PenghunianIndex() {
    const { penghunian, stats, anggotaOptions, hunianOptions, filters, flash } =
        usePage<PageProps>().props;

    const [modal, setModal] = useState<ModalState>(null);
    const [deleting, setDeleting] = useState(false);

    const [search, setSearch] = useState(filters?.search ?? "");
    const [statusFilter, setStatusFilter] = useState(filters?.status ?? "");

    const form = useForm<PenghunianForm>(EMPTY_FORM);

    /* ------------------------------------------------------------------------
       FLASH TOAST
    ------------------------------------------------------------------------ */

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }

        if (flash?.error) {
            toast.error(flash.error);
        }

        if (flash?.warning) {
            toast.warning(flash.warning);
        }

        if (flash?.info) {
            toast.info(flash.info);
        }
    }, [flash]);

    /* ------------------------------------------------------------------------
       PILIHAN HUNIAN
       - status "aktif": hanya hunian tersedia (+ hunian milik data yang diedit)
       - status lain   : semua hunian
    ------------------------------------------------------------------------ */

    const editingItem = modal?.type === "edit" ? modal.item : null;

    const hunianChoices = useMemo(() => {
        const currentId = editingItem ? String(editingItem.hunian_id) : "";

        const list = hunianOptions.filter(
            (item) =>
                form.data.status !== "aktif" ||
                item.status_operasional === "tersedia" ||
                String(item.id) === currentId,
        );

        if (
            editingItem?.hunian &&
            !list.some((item) => item.id === editingItem.hunian_id)
        ) {
            list.push({
                id: editingItem.hunian_id,
                kode_hunian: editingItem.hunian.kode_hunian,
                nama_hunian: editingItem.hunian.nama_hunian,
                status_operasional: "",
                unit: editingItem.hunian.unit ?? null,
            });
        }

        return list;
    }, [hunianOptions, form.data.status, editingItem]);

    /* ------------------------------------------------------------------------
       MODAL
    ------------------------------------------------------------------------ */

    const closeModal = () => {
        setModal(null);
        form.reset();
        form.clearErrors();
    };

    const openCreate = () => {
        form.clearErrors();
        form.setData({ ...EMPTY_FORM, tanggal_mulai: todayLocal() });

        setModal({ type: "create" });
    };

    const openEdit = (item: Penghunian) => {
        form.clearErrors();
        form.setData(toFormData(item));

        setModal({ type: "edit", item });
    };

    const openShow = (item: Penghunian) => {
        setModal({ type: "show", item });
    };

    const openDelete = (item: Penghunian) => {
        setModal({ type: "delete", item });
    };

    /* ------------------------------------------------------------------------
       SUBMIT
       Upload file memakai multipart. Untuk edit, PUT dikirim lewat POST
       dengan _method=put (PUT tidak mendukung multipart di PHP).
    ------------------------------------------------------------------------ */

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (modal?.type === "create") {
            form.transform((data) => data);

            form.post("/penghunian", {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });

            return;
        }

        if (modal?.type === "edit") {
            form.transform((data) => ({ ...data, _method: "put" }));

            form.post(`/penghunian/${modal.item.id}`, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        }
    };

    /* ------------------------------------------------------------------------
       DELETE
    ------------------------------------------------------------------------ */

    const deletePenghunian = () => {
        if (modal?.type !== "delete") {
            return;
        }

        setDeleting(true);

        router.delete(`/penghunian/${modal.item.id}`, {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onFinish: () => setDeleting(false),
        });
    };

    /* ------------------------------------------------------------------------
       FILTER
    ------------------------------------------------------------------------ */

    const applyFilter = () => {
        router.get(
            "/penghunian",
            {
                search: search || undefined,
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
        setStatusFilter("");

        router.get(
            "/penghunian",
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    /* ------------------------------------------------------------------------
       RENDER
    ------------------------------------------------------------------------ */

    const isFormOpen = modal?.type === "create" || modal?.type === "edit";

    return (
        <>
            <Head title="Data Penghunian" />

            <div className="siram-stagger flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* HEADER */}

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <ClipboardList className="h-4 w-4" />

                            <span>Data Master</span>

                            <span>/</span>

                            <span className="font-medium text-[#0f2f5f] dark:text-white">
                                Penghunian
                            </span>
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Data Penghunian
                        </h1>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Kelola penempatan anggota pada rumah dinas, mes, dan
                            apartemen.
                        </p>
                    </div>

                    <CrudButton onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Tambah Penghunian
                    </CrudButton>
                </div>

                {/* STAT */}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Penghunian"
                        value={stats.total}
                        icon={<ClipboardList className="h-5 w-5" />}
                    />

                    <StatCard
                        title="Aktif"
                        value={stats.aktif}
                        icon={<CheckCircle2 className="h-5 w-5" />}
                    />

                    <StatCard
                        title="Selesai"
                        value={stats.selesai}
                        icon={<CalendarCheck className="h-5 w-5" />}
                    />

                    <StatCard
                        title="Dibatalkan"
                        value={stats.dibatalkan}
                        icon={<Ban className="h-5 w-5" />}
                    />
                </div>

                {/* FILTER */}

                <div className={`${cardClass} p-4`}>
                    <div className="mb-4 flex items-center gap-2">
                        <Filter className="h-4 w-4 text-[#d4af37]" />

                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                            Filter Data
                        </h2>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="relative lg:col-span-3">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <FormInput
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        applyFilter();
                                    }
                                }}
                                placeholder="Cari nama, NRP, kode hunian..."
                                className="pl-9"
                            />
                        </div>

                        <FormSelect
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                        >
                            <option value="">Semua Status</option>

                            {STATUS_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </FormSelect>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                        <CrudButton variant="secondary" onClick={resetFilter}>
                            Reset
                        </CrudButton>

                        <CrudButton onClick={applyFilter}>Terapkan</CrudButton>
                    </div>
                </div>

                {/* TABLE */}

                <div className={`${cardClass} overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                                    <Th>Penghuni</Th>
                                    <Th>Hunian</Th>
                                    <Th>Periode</Th>
                                    <Th>Status</Th>
                                    <Th align="right">Aksi</Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {penghunian.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-5 py-12 text-center"
                                        >
                                            <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />

                                            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                                                Belum ada data penghunian
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Silakan tambahkan data
                                                penghunian.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    penghunian.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-bold text-[#0f2f5f] dark:text-white">
                                                    {item.anggota?.nama ?? "-"}
                                                </p>

                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    NRP{" "}
                                                    {item.anggota?.nrp ?? "-"}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                                    {item.hunian?.nama_hunian ??
                                                        "-"}
                                                </p>

                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {item.hunian?.kode_hunian ??
                                                        "-"}
                                                    {item.hunian?.unit
                                                        ?.nama_unit
                                                        ? ` • ${item.hunian.unit.nama_unit}`
                                                        : ""}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                                    {formatDate(
                                                        item.tanggal_mulai,
                                                    )}
                                                </p>

                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    s/d{" "}
                                                    {formatDate(
                                                        item.tanggal_selesai,
                                                    )}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass(
                                                        item.status,
                                                    )}`}
                                                >
                                                    {statusLabel(item.status)}
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

                                                    <ActionButton
                                                        title="Edit"
                                                        onClick={() =>
                                                            openEdit(item)
                                                        }
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </ActionButton>

                                                    <ActionButton
                                                        title="Hapus"
                                                        danger
                                                        onClick={() =>
                                                            openDelete(item)
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </ActionButton>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination data={penghunian} />
                </div>
            </div>

            {/* =================================================================
                MODAL CREATE / EDIT
            ================================================================= */}

            <CrudModal
                open={isFormOpen}
                title={
                    modal?.type === "edit"
                        ? "Edit Data Penghunian"
                        : "Tambah Penghunian"
                }
                description={
                    modal?.type === "edit"
                        ? "Perbarui informasi penghunian."
                        : "Masukkan data penghunian baru."
                }
                onClose={closeModal}
                width="xl"
            >
                <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            label="Anggota"
                            required
                            error={form.errors.anggota_id}
                        >
                            <FormSelect
                                value={form.data.anggota_id}
                                error={Boolean(form.errors.anggota_id)}
                                onChange={(event) =>
                                    form.setData(
                                        "anggota_id",
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Pilih Anggota</option>

                                {anggotaOptions.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nama}
                                        {item.nrp ? ` - NRP ${item.nrp}` : ""}
                                    </option>
                                ))}
                            </FormSelect>
                        </FormField>

                        <FormField
                            label="Hunian"
                            required
                            error={form.errors.hunian_id}
                            hint={
                                form.data.status === "aktif"
                                    ? "Hanya hunian berstatus tersedia yang ditampilkan."
                                    : undefined
                            }
                        >
                            <FormSelect
                                value={form.data.hunian_id}
                                error={Boolean(form.errors.hunian_id)}
                                onChange={(event) =>
                                    form.setData(
                                        "hunian_id",
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Pilih Hunian</option>

                                {hunianChoices.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.kode_hunian} - {item.nama_hunian}
                                        {item.unit?.nama_unit
                                            ? ` (${item.unit.nama_unit})`
                                            : ""}
                                    </option>
                                ))}
                            </FormSelect>
                        </FormField>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            label="Tanggal Mulai"
                            required
                            error={form.errors.tanggal_mulai}
                        >
                            <FormInput
                                type="date"
                                value={form.data.tanggal_mulai}
                                error={Boolean(form.errors.tanggal_mulai)}
                                onChange={(event) =>
                                    form.setData(
                                        "tanggal_mulai",
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>

                        <FormField
                            label="Tanggal Selesai"
                            required
                            error={form.errors.tanggal_selesai}
                        >
                            <FormInput
                                type="date"
                                min={form.data.tanggal_mulai || undefined}
                                value={form.data.tanggal_selesai}
                                error={Boolean(form.errors.tanggal_selesai)}
                                onChange={(event) =>
                                    form.setData(
                                        "tanggal_selesai",
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            label="Status"
                            required
                            error={form.errors.status}
                        >
                            <FormSelect
                                value={form.data.status}
                                error={Boolean(form.errors.status)}
                                onChange={(event) =>
                                    form.setData(
                                        "status",
                                        event.target.value as Status,
                                    )
                                }
                            >
                                {STATUS_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </FormSelect>
                        </FormField>

                        <FormField
                            label="Dokumen Perjanjian"
                            error={form.errors.dokumen_perjanjian}
                            hint={
                                editingItem?.dokumen_url
                                    ? "PDF/JPG/PNG, maks. 5 MB. Kosongkan jika tidak ingin mengganti dokumen."
                                    : "PDF/JPG/PNG, maks. 5 MB."
                            }
                        >
                            <FormInput
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                error={Boolean(form.errors.dokumen_perjanjian)}
                                onChange={(event) =>
                                    form.setData(
                                        "dokumen_perjanjian",
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                className="cursor-pointer py-1.5 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#0f2f5f]/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#0f2f5f] dark:file:bg-white/10 dark:file:text-white"
                            />
                        </FormField>
                    </div>

                    <FormField
                        label="Alasan Penghunian"
                        error={form.errors.alasan_penghunian}
                    >
                        <FormTextarea
                            rows={3}
                            value={form.data.alasan_penghunian}
                            error={Boolean(form.errors.alasan_penghunian)}
                            onChange={(event) =>
                                form.setData(
                                    "alasan_penghunian",
                                    event.target.value,
                                )
                            }
                            placeholder="Contoh: Mutasi tugas ke Polresta Cilacap"
                        />
                    </FormField>

                    <FormField
                        label="Keterangan"
                        error={form.errors.keterangan}
                    >
                        <FormTextarea
                            rows={3}
                            value={form.data.keterangan}
                            error={Boolean(form.errors.keterangan)}
                            onChange={(event) =>
                                form.setData("keterangan", event.target.value)
                            }
                            placeholder="Keterangan tambahan jika diperlukan"
                        />
                    </FormField>

                    {/* FOOTER */}

                    <div className="flex justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-700">
                        <CrudButton
                            variant="secondary"
                            onClick={closeModal}
                            disabled={form.processing}
                        >
                            Batal
                        </CrudButton>

                        <CrudButton type="submit" disabled={form.processing}>
                            {form.processing && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}

                            {modal?.type === "edit"
                                ? "Simpan Perubahan"
                                : "Simpan Penghunian"}
                        </CrudButton>
                    </div>
                </form>
            </CrudModal>

            {/* =================================================================
                MODAL DETAIL
            ================================================================= */}

            <CrudModal
                open={modal?.type === "show"}
                title="Detail Penghunian"
                description="Informasi lengkap data penghunian."
                onClose={closeModal}
                width="lg"
            >
                {modal?.type === "show" && (
                    <div className="space-y-5">
                        <div className="rounded-2xl bg-[#0f2f5f] p-5 text-white">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                                        NRP {modal.item.anggota?.nrp ?? "-"}
                                    </p>

                                    <h3 className="mt-1 text-xl font-bold">
                                        {modal.item.anggota?.nama ?? "-"}
                                    </h3>

                                    <p className="mt-1 text-sm text-white/70">
                                        {modal.item.hunian?.nama_hunian ?? "-"}
                                    </p>
                                </div>

                                <ClipboardList className="h-8 w-8 text-[#d4af37]" />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailItem
                                label="Kode Hunian"
                                value={modal.item.hunian?.kode_hunian ?? "-"}
                            />

                            <DetailItem
                                label="Unit"
                                value={
                                    modal.item.hunian?.unit?.nama_unit ?? "-"
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
                                label="Status"
                                value={statusLabel(modal.item.status)}
                            />

                            <DetailItem
                                label="Disetujui Oleh"
                                value={modal.item.penyetuju?.name ?? "-"}
                            />

                            <DetailItem
                                label="Disetujui Pada"
                                value={formatDateTime(modal.item.disetujui_at)}
                            />

                            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Dokumen Perjanjian
                                </p>

                                {modal.item.dokumen_url ? (
                                    <a
                                        href={modal.item.dokumen_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#0f2f5f] hover:underline dark:text-blue-300"
                                    >
                                        <FileText className="h-4 w-4" />
                                        Lihat dokumen
                                    </a>
                                ) : (
                                    <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                                        -
                                    </p>
                                )}
                            </div>

                            <DetailItem
                                label="Alasan Penghunian"
                                value={modal.item.alasan_penghunian || "-"}
                                full
                            />

                            <DetailItem
                                label="Keterangan"
                                value={modal.item.keterangan || "-"}
                                full
                            />
                        </div>

                        <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-700">
                            <CrudButton onClick={closeModal}>Tutup</CrudButton>
                        </div>
                    </div>
                )}
            </CrudModal>

            {/* =================================================================
                MODAL DELETE
            ================================================================= */}

            <CrudModal
                open={modal?.type === "delete"}
                title="Hapus Data Penghunian"
                description="Tindakan ini akan menghapus data penghunian."
                onClose={closeModal}
                width="sm"
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
                                    Penghunian{" "}
                                    <strong>
                                        {modal.item.anggota?.nama ?? "-"}
                                    </strong>{" "}
                                    di{" "}
                                    <strong>
                                        {modal.item.hunian?.nama_hunian ?? "-"}
                                    </strong>{" "}
                                    akan dihapus. Jika masih aktif, hunian akan
                                    kembali berstatus tersedia.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <CrudButton
                                variant="secondary"
                                onClick={closeModal}
                                disabled={deleting}
                            >
                                Batal
                            </CrudButton>

                            <CrudButton
                                variant="danger"
                                onClick={deletePenghunian}
                                disabled={deleting}
                            >
                                {deleting && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                Hapus
                            </CrudButton>
                        </div>
                    </div>
                )}
            </CrudModal>
        </>
    );
}

/* ============================================================================
   LOCAL COMPONENT
============================================================================ */

function Th({
    children,
    align = "left",
}: {
    children: ReactNode;
    align?: "left" | "right";
}) {
    return (
        <th
            className={`px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                align === "right" ? "text-right" : "text-left"
            }`}
        >
            {children}
        </th>
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
        <div className={`${cardClass} p-5`}>
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
            aria-label={title}
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

function DetailItem({
    label,
    value,
    full = false,
}: {
    label: string;
    value: string;
    full?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border border-slate-200 p-4 dark:border-slate-700 ${
                full ? "sm:col-span-2" : ""
            }`}
        >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                {value}
            </p>
        </div>
    );
}

function Pagination({ data }: { data: PaginatedPenghunian }) {
    if (data.last_page <= 1) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <p className="text-sm text-slate-500">
                Menampilkan{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {data.from ?? 0}
                </span>{" "}
                sampai{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {data.to ?? 0}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {data.total}
                </span>{" "}
                data
            </p>

            <div className="flex items-center gap-1">
                {data.links.map((link, index) => {
                    const isPrevious = index === 0;
                    const isNext = index === data.links.length - 1;

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
                            } disabled:cursor-not-allowed disabled:opacity-40`}
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
    );
}
