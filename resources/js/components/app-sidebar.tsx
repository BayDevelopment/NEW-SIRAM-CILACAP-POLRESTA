import { Link, usePage } from "@inertiajs/react";
import {
    ArrowLeftRight,
    Building2,
    FileText,
    Home,
    Landmark,
    LayoutGrid,
    UserRound,
    Wrench,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

import { dashboard } from "@/routes";
import type { NavItem } from "@/types";

type SidebarPageProps = {
    auth?: {
        user?: {
            role?: string | { name?: string } | null;
        } | null;
    };
};

const mainNavItems: NavItem[] = [
    {
        title: "Dashboard",
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: "Unit / Satuan",
        href: "/unit",
        icon: Landmark,
    },
    {
        title: "Hunian",
        href: "/hunian",
        icon: Building2,
    },
    {
        title: "Anggota",
        href: "/anggota",
        icon: UserRound,
    },
    {
        title: "Penghunian",
        href: "/penghunian",
        icon: Home,
    },
    {
        title: "Riwayat Pindah",
        href: "/riwayat-pindah",
        icon: ArrowLeftRight,
    },
    {
        title: "Pemeliharaan",
        href: "/pemeliharaan",
        icon: Wrench,
    },
    {
        title: "Dokumen",
        href: "/dokumen",
        icon: FileText,
    },
];

const anggotaAllowedMenus = [
    "Dashboard",
    "Hunian",
    "Penghunian",
    "Pemeliharaan",
];

export function AppSidebar() {
    const page = usePage();
    const props = page.props as typeof page.props & SidebarPageProps;

    const rawRole = props.auth?.user?.role;

    const role = typeof rawRole === "string" ? rawRole : (rawRole?.name ?? "");

    const isSuperadmin = role === "superadmin";
    const isAnggota = role === "anggota";

    // Terapkan prinsip fail-closed:
    // hanya role yang dikenal yang mendapatkan menu aplikasi.
    const visibleNavItems = mainNavItems.filter((item) => {
        if (isSuperadmin) {
            return true;
        }

        if (isAnggota) {
            return anggotaAllowedMenus.includes(item.title);
        }

        return false;
    });

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="
                [&_[data-sidebar=sidebar]]:border-r
                [&_[data-sidebar=sidebar]]:border-[#0f2f5f]/10
                [&_[data-sidebar=sidebar]]:bg-white
                dark:[&_[data-sidebar=sidebar]]:bg-slate-950
            "
        >
            <SidebarHeader className="border-b border-[#0f2f5f]/10 dark:border-white/10">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            tooltip="SIRAM MANAGEMENT - POLRESTA CILACAP"
                            className="
                                h-auto min-h-14 rounded-xl px-2 py-2
                                transition-all duration-200
                                hover:bg-[#0f2f5f]/5
                                dark:hover:bg-white/5
                            "
                        >
                            <Link href={dashboard()} prefetch>
                                <img
                                    src="/logo-polresta-cilacap-fiks.png"
                                    alt="Logo Polresta Cilacap"
                                    className="size-10 shrink-0 object-contain"
                                />

                                <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                                    <span className="truncate text-sm font-bold tracking-wide text-[#0f2f5f] dark:text-white">
                                        SIRAM MANAGEMENT
                                    </span>

                                    <span className="truncate text-xs font-normal text-slate-500 dark:text-slate-400">
                                        POLRESTA CILACAP
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-2 py-3">
                <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground group-data-[collapsible=icon]:hidden">
                    Menu Utama
                </div>

                <div
                    className="
                        [&_[data-sidebar=menu-button]]:rounded-xl
                        [&_[data-sidebar=menu-button]]:transition-all
                        [&_[data-sidebar=menu-button]]:duration-200
                        [&_[data-sidebar=menu-button]]:hover:bg-[#0f2f5f]/5
                        [&_[data-sidebar=menu-button]]:hover:text-[#0f2f5f]
                        [&_[data-sidebar=menu-button]]:hover:[&>svg]:text-[#d4af37]
                        dark:[&_[data-sidebar=menu-button]]:hover:bg-white/5
                        dark:[&_[data-sidebar=menu-button]]:hover:text-white
                        [&_[data-sidebar=menu-button][data-active=true]]:bg-[#0f2f5f]
                        [&_[data-sidebar=menu-button][data-active=true]]:text-white
                        [&_[data-sidebar=menu-button][data-active=true]]:shadow-sm
                        [&_[data-sidebar=menu-button][data-active=true]_svg]:text-[#d4af37]
                        dark:[&_[data-sidebar=menu-button][data-active=true]]:bg-[#0f2f5f]
                        dark:[&_[data-sidebar=menu-button][data-active=true]]:text-white
                        dark:[&_[data-sidebar=menu-button][data-active=true]_svg]:text-[#d4af37]
                    "
                >
                    <NavMain items={visibleNavItems} />
                </div>
            </SidebarContent>

            <SidebarFooter className="border-t border-[#0f2f5f]/10 pt-2 dark:border-white/10">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
