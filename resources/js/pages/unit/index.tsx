import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Edit3,
    Eye,
    Filter,
    Loader2,
    Plus,
    Power,
    Search,
    Trash2,
    Users,
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

type UnitType = "polresta" | "polsek" | "bagian" | "satuan";

type Unit = {
    id: number;
    kode_unit: string;
    nama_unit: string;
    tipe_unit: UnitType;
    alamat: string | null;
    telepon: string | null;
    is_active: boolean;
    hunian_count: number;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedUnits = {
    data: Unit[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
};

type Filters = {
    search: string;
    tipe_unit: string;
    status: string;
};

type Flash = {
    success?: string | null;
    error?: string | null;
    warning?: string | null;
    info?: string | null;
};

type PageProps = {
    units: PaginatedUnits;
    filters: Filters;
    flash?: Flash;
};

type UnitForm = {
    nama_unit: string;
    tipe_unit: UnitType;
    alamat: string;
    telepon: string;
    is_active: boolean;
};

type ModalState =
    | { type: "create" }
    | { type: "edit"; item: Unit }
    | { type: "show"; item: Unit }
    | { type: "delete"; item: Unit }
    | null;

/* ============================================================================
   CONSTANT
============================================================================ */

const TYPE_OPTIONS: { value: UnitType; label: string; prefix: string }[] = [
    { value: "polresta", label: "Polresta", prefix: "PRS" },
    { value: "polsek", label: "Polsek", prefix: "PSK" },
    { value: "bagian", label: "Bagian", prefix: "BAG" },
    { value: "satuan", label: "Satuan", prefix: "SAT" },
];

const EMPTY_FORM: UnitForm = {
    nama_unit: "",
    tipe_unit: "polresta",
    alamat: "",
    telepon: "",
    is_active: true,
};

const cardClass =
    "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

/* ============================================================================
   HELPER
============================================================================ */

function getTypeLabel(type: UnitType): string {
    return TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

function getPrefix(type: UnitType): string {
    return TYPE_OPTIONS.find((item) => item.value === type)?.prefix ?? "UNT";
}

function toFormData(item: Unit): UnitForm {
    return {
        nama_unit: item.nama_unit,
        tipe_unit: item.tipe_unit,
        alamat: item.alamat ?? "",
        telepon: item.telepon ?? "",
        is_active: item.is_active,
    };
}

/* ============================================================================
   PAGE
============================================================================ */

export default function UnitIndex() {
    const { units, filters, flash } = usePage<PageProps>().props;

    const [modal, setModal] = useState<ModalState>(null);
    const [deleting, setDeleting] = useState(false);

    const [search, setSearch] = useState(filters?.search ?? "");
    const [tipeFilter, setTipeFilter] = useState(filters?.tipe_unit ?? "");
    const [statusFilter, setStatusFilter] = useState(filters?.status ?? "");

    const form = useForm<UnitForm>(EMPTY_FORM);

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
       STAT
    ------------------------------------------------------------------------ */

    const stats = useMemo(() => {
        const aktif = units.data.filter((item) => item.is_active).length;
        const nonaktif = units.data.length - aktif;
        const hunian = units.data.reduce(
            (total, item) => total + (item.hunian_count ?? 0),
            0,
        );

        return { aktif, nonaktif, hunian };
    }, [units.data]);

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
        form.setData({ ...EMPTY_FORM });

        setModal({ type: "create" });
    };

    const openEdit = (item: Unit) => {
        form.clearErrors();
        form.setData(toFormData(item));

        setModal({ type: "edit", item });
    };

    const openShow = (item: Unit) => {
        setModal({ type: "show", item });
    };

    const openDelete = (item: Unit) => {
        setModal({ type: "delete", item });
    };

    /* ------------------------------------------------------------------------
       SUBMIT
    ------------------------------------------------------------------------ */

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (modal?.type === "create") {
            form.post("/unit", {
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });

            return;
        }

        if (modal?.type === "edit") {
            form.put(`/unit/${modal.item.id}`, {
                preserveScroll: true,
                onSuccess: () => closeModal(),
            });
        }
    };

    /* ------------------------------------------------------------------------
       DELETE
    ------------------------------------------------------------------------ */

    const deleteUnit = () => {
        if (modal?.type !== "delete") {
            return;
        }

        setDeleting(true);

        router.delete(`/unit/${modal.item.id}`, {
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
            "/unit",
            {
                search: search || undefined,
                tipe_unit: tipeFilter || undefined,
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
        setTipeFilter("");
        setStatusFilter("");

        router.get(
            "/unit",
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
            <Head title="Unit / Satuan" />

            <div className="siram-stagger flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* HEADER */}

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Building2 className="h-4 w-4" />

                            <span>Data Master</span>

                            <span>/</span>

                            <span className="font-medium text-[#0f2f5f] dark:text-white">
                                Unit
                            </span>
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Data Unit / Satuan
                        </h1>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Kelola data Polresta, Polsek, bagian, dan satuan.
                        </p>
                    </div>

                    <CrudButton onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Tambah Unit
                    </CrudButton>
                </div>

                {/* STAT */}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Unit"
                        value={units.total}
                        icon={<Building2 className="h-5 w-5" />}
                    />

                    <StatCard
                        title="Unit Aktif"
                        value={stats.aktif}
                        icon={<CheckCircle2 className="h-5 w-5" />}
                    />

                    <StatCard
                        title="Unit Nonaktif"
                        value={stats.nonaktif}
                        icon={<Power className="h-5 w-5" />}
                    />

                    <StatCard
                        title="Total Hunian"
                        value={stats.hunian}
                        icon={<Users className="h-5 w-5" />}
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
                        <div className="relative lg:col-span-2">
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
                                placeholder="Cari kode, nama, alamat..."
                                className="pl-9"
                            />
                        </div>

                        <FormSelect
                            value={tipeFilter}
                            onChange={(event) =>
                                setTipeFilter(event.target.value)
                            }
                        >
                            <option value="">Semua Tipe</option>

                            {TYPE_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </FormSelect>

                        <FormSelect
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                        >
                            <option value="">Semua Status</option>
                            <option value="aktif">Aktif</option>
                            <option value="nonaktif">Nonaktif</option>
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
                        <table className="w-full min-w-[900px] text-left">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                                    <Th>Unit</Th>
                                    <Th>Tipe</Th>
                                    <Th>Alamat</Th>
                                    <Th>Hunian</Th>
                                    <Th>Status</Th>
                                    <Th align="right">Aksi</Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {units.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-5 py-12 text-center"
                                        >
                                            <Building2 className="mx-auto h-10 w-10 text-slate-300" />

                                            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                                                Belum ada data unit
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Silakan tambahkan data unit.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    units.data.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-bold text-[#0f2f5f] dark:text-white">
                                                    {item.kode_unit}
                                                </p>

                                                <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                                                    {item.nama_unit}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    {getTypeLabel(
                                                        item.tipe_unit,
                                                    )}
                                                </span>
                                            </td>

                                            <td className="max-w-xs px-5 py-4">
                                                <p className="truncate text-sm text-slate-700 dark:text-slate-300">
                                                    {item.alamat || "-"}
                                                </p>

                                                {item.telepon && (
                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                        {item.telepon}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    {item.hunian_count}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                                        item.is_active
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                                    }`}
                                                >
                                                    {item.is_active
                                                        ? "Aktif"
                                                        : "Nonaktif"}
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

                    <Pagination data={units} />
                </div>
            </div>

            {/* =================================================================
                MODAL CREATE / EDIT
            ================================================================= */}

            <CrudModal
                open={isFormOpen}
                title={
                    modal?.type === "edit" ? "Edit Data Unit" : "Tambah Unit"
                }
                description={
                    modal?.type === "edit"
                        ? "Perbarui informasi data unit."
                        : "Masukkan data unit baru."
                }
                onClose={closeModal}
                width="xl"
            >
                <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField label="Kode Unit">
                            <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-100 px-3.5 dark:border-slate-700 dark:bg-slate-800">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {modal?.type === "edit"
                                        ? modal.item.kode_unit
                                        : `${getPrefix(form.data.tipe_unit)}-XXX`}
                                </span>

                                <span className="rounded-md bg-[#d4af37]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#a78300] dark:text-[#d4af37]">
                                    Otomatis
                                </span>
                            </div>
                        </FormField>

                        <FormField
                            label="Tipe Unit"
                            required
                            error={form.errors.tipe_unit}
                        >
                            <FormSelect
                                value={form.data.tipe_unit}
                                error={Boolean(form.errors.tipe_unit)}
                                onChange={(event) =>
                                    form.setData(
                                        "tipe_unit",
                                        event.target.value as UnitType,
                                    )
                                }
                            >
                                {TYPE_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </FormSelect>
                        </FormField>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            label="Nama Unit"
                            required
                            error={form.errors.nama_unit}
                        >
                            <FormInput
                                type="text"
                                value={form.data.nama_unit}
                                error={Boolean(form.errors.nama_unit)}
                                onChange={(event) =>
                                    form.setData(
                                        "nama_unit",
                                        event.target.value,
                                    )
                                }
                                placeholder="Contoh: Polsek Cilacap Selatan"
                            />
                        </FormField>

                        <FormField label="Telepon" error={form.errors.telepon}>
                            <FormInput
                                type="text"
                                value={form.data.telepon}
                                error={Boolean(form.errors.telepon)}
                                onChange={(event) =>
                                    form.setData("telepon", event.target.value)
                                }
                                placeholder="Contoh: 0282-123456"
                            />
                        </FormField>
                    </div>

                    <FormField label="Alamat" error={form.errors.alamat}>
                        <FormTextarea
                            rows={3}
                            value={form.data.alamat}
                            error={Boolean(form.errors.alamat)}
                            onChange={(event) =>
                                form.setData("alamat", event.target.value)
                            }
                            placeholder="Masukkan alamat lengkap unit"
                        />
                    </FormField>

                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                    form.data.is_active
                                        ? "bg-emerald-50 text-emerald-600"
                                        : "bg-slate-100 text-slate-400"
                                }`}
                            >
                                <Power className="h-5 w-5" />
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {form.data.is_active
                                        ? "Unit Aktif"
                                        : "Unit Nonaktif"}
                                </p>

                                <p className="text-xs text-slate-400">
                                    {form.data.is_active
                                        ? "Unit dapat digunakan dalam sistem."
                                        : "Unit tidak aktif digunakan."}
                                </p>
                            </div>
                        </div>

                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(event) =>
                                form.setData("is_active", event.target.checked)
                            }
                            className="h-5 w-5 rounded border-slate-300 text-[#0f2f5f] focus:ring-[#0f2f5f]"
                        />
                    </label>

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
                                : "Simpan Unit"}
                        </CrudButton>
                    </div>
                </form>
            </CrudModal>

            {/* =================================================================
                MODAL DETAIL
            ================================================================= */}

            <CrudModal
                open={modal?.type === "show"}
                title="Detail Unit"
                description="Informasi lengkap data unit."
                onClose={closeModal}
                width="lg"
            >
                {modal?.type === "show" && (
                    <div className="space-y-5">
                        <div className="rounded-2xl bg-[#0f2f5f] p-5 text-white">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                                        {modal.item.kode_unit}
                                    </p>

                                    <h3 className="mt-1 text-xl font-bold">
                                        {modal.item.nama_unit}
                                    </h3>

                                    <p className="mt-1 text-sm text-white/70">
                                        {getTypeLabel(modal.item.tipe_unit)}
                                    </p>
                                </div>

                                <Building2 className="h-8 w-8 text-[#d4af37]" />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailItem
                                label="Tipe Unit"
                                value={getTypeLabel(modal.item.tipe_unit)}
                            />

                            <DetailItem
                                label="Status"
                                value={
                                    modal.item.is_active ? "Aktif" : "Nonaktif"
                                }
                            />

                            <DetailItem
                                label="Telepon"
                                value={modal.item.telepon || "-"}
                            />

                            <DetailItem
                                label="Jumlah Hunian"
                                value={`${modal.item.hunian_count} hunian`}
                            />

                            <DetailItem
                                label="Alamat"
                                value={modal.item.alamat || "-"}
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
                title="Hapus Data Unit"
                description="Tindakan ini akan menghapus data unit."
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
                                    Data <strong>{modal.item.kode_unit}</strong>{" "}
                                    - <strong>{modal.item.nama_unit}</strong>{" "}
                                    akan dihapus. Jika unit sudah memiliki
                                    hunian, sistem akan menolak penghapusan.
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
                                onClick={deleteUnit}
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

function Pagination({ data }: { data: PaginatedUnits }) {
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
