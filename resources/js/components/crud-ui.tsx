import { router } from "@inertiajs/react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import type {
    InputHTMLAttributes,
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from "react";

/* ============================================================================
   STYLE TOKENS
============================================================================ */

const fieldBase =
    "w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0f2f5f] focus:ring-2 focus:ring-[#0f2f5f]/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800";

const fieldBorder = (error: boolean) =>
    error
        ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
        : "border-slate-200 dark:border-slate-700";

export const cardClass =
    "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

/* ============================================================================
   MODAL
============================================================================ */

type ModalProps = {
    open: boolean;
    title: string;
    description?: string;
    children: ReactNode;
    onClose: () => void;
    width?: "sm" | "md" | "lg" | "xl";
};

const widthClass = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};

export function CrudModal({
    open,
    title,
    description,
    children,
    onClose,
    width = "lg",
}: ModalProps) {
    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crud-modal-title"
        >
            {/* Overlay */}
            <button
                type="button"
                aria-label="Tutup modal"
                onClick={onClose}
                className="absolute inset-0 cursor-default bg-slate-950/50 backdrop-blur-sm"
            />

            {/* Modal */}
            <div
                className={`relative z-10 flex max-h-[92vh] w-full ${widthClass[width]} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900`}
            >
                {/* Header */}
                <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                    <div className="pr-6">
                        <h2
                            id="crud-modal-title"
                            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
                        >
                            {title}
                        </h2>

                        {description && (
                            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
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

                {/* Content */}
                <div className="min-h-0 overflow-y-auto p-6">{children}</div>
            </div>
        </div>
    );
}

/* ============================================================================
   FORM
============================================================================ */

type FormFieldProps = {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: ReactNode;
    className?: string;
};

export function FormField({
    label,
    required = false,
    error,
    hint,
    children,
    className = "",
}: FormFieldProps) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {label}

                {required && <span className="ml-1 text-red-500">*</span>}
            </label>

            {children}

            {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}

            {error && (
                <p className="text-xs font-medium text-red-500">{error}</p>
            )}
        </div>
    );
}

export function FormInput({
    error = false,
    className = "",
    ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
    return (
        <input
            {...props}
            className={`h-[42px] ${fieldBase} ${fieldBorder(error)} ${className}`}
        />
    );
}

export function FormSelect({
    error = false,
    className = "",
    children,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
    return (
        <select
            {...props}
            className={`h-[42px] ${fieldBase} ${fieldBorder(error)} ${className}`}
        >
            {children}
        </select>
    );
}

export function FormTextarea({
    error = false,
    className = "",
    ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
    return (
        <textarea
            {...props}
            className={`min-h-[96px] resize-none py-2.5 ${fieldBase} ${fieldBorder(error)} ${className}`}
        />
    );
}

/* ============================================================================
   BUTTON
============================================================================ */

type CrudButtonProps = {
    children: ReactNode;
    onClick?: () => void;
    type?: "button" | "submit";
    variant?: "primary" | "secondary" | "danger" | "ghost";
    disabled?: boolean;
    loading?: boolean;
    className?: string;
};

export function CrudButton({
    children,
    onClick,
    type = "button",
    variant = "primary",
    disabled = false,
    loading = false,
    className = "",
}: CrudButtonProps) {
    const variants = {
        primary: "bg-[#0f2f5f] text-white shadow-sm hover:bg-[#0b254a]",
        secondary:
            "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
        danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
        >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}

            {children}
        </button>
    );
}

/* ============================================================================
   PAGE PARTS
============================================================================ */

export function PageHeader({
    icon,
    breadcrumb,
    title,
    description,
    action,
}: {
    icon: ReactNode;
    breadcrumb: string[];
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <div className="mb-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    {icon}

                    {breadcrumb.map((item, index) => {
                        const isLast = index === breadcrumb.length - 1;

                        return (
                            <span key={`${item}-${index}`} className="contents">
                                <span
                                    className={
                                        isLast
                                            ? "font-medium text-[#0f2f5f] dark:text-white"
                                            : ""
                                    }
                                >
                                    {item}
                                </span>

                                {!isLast && <span>/</span>}
                            </span>
                        );
                    })}
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {title}
                </h1>

                {description && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                )}
            </div>

            {action}
        </div>
    );
}

export function StatCard({
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

export function ActionButton({
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

export function DetailItem({
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

export function EmptyState({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description?: string;
}) {
    return (
        <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center text-slate-300">
                {icon}
            </div>

            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                {title}
            </p>

            {description && (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
        </div>
    );
}

export function Th({
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

/* ============================================================================
   PAGINATION
============================================================================ */

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginationData = {
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
};

export function Pagination({ data }: { data: PaginationData }) {
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
