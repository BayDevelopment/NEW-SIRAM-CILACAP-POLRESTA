import { usePage } from "@inertiajs/react";
import * as React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import type { AppVariant } from "@/types";

type Props = React.ComponentProps<"main"> & {
    variant?: AppVariant;
};

export function AppContent({ variant = "sidebar", children, ...props }: Props) {
    // Pakai pathname (tanpa query) supaya animasi hanya jalan saat pindah halaman,
    // bukan saat filter / pagination berubah.
    const { url } = usePage();
    const pathname = url.split("?")[0];

    const content = (
        <div key={pathname} className="siram-page-enter flex flex-1 flex-col">
            {children}
        </div>
    );

    if (variant === "sidebar") {
        return <SidebarInset {...props}>{content}</SidebarInset>;
    }

    return (
        <main
            className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl"
            {...props}
        >
            {content}
        </main>
    );
}
