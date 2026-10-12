"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const NAV_ITEMS = [
    { id: "inbox", icon: "inbox", label: "Inbox" },
    { id: "rejected", icon: "block", label: "Rejected" },
    { id: "documents", icon: "description", label: "Documents" },
    { id: "analytics", icon: "analytics", label: "Analytics" },
    { id: "billing", icon: "receipt_long", label: "Billing & Plan" },
    { id: "settings", icon: "settings", label: "Settings" },
];

const ROUTE_ITEMS = ["inbox", "rejected"];

function isRouteItem(id) {
    return ROUTE_ITEMS.includes(id);
}

function getHref(id) {
    return `/${id}`;
}

export default function Sidebar({ view, onViewChange = (v: string) => {}, mobileOpen = false, onClose = () => {} }) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const go = (id) => {
        if (isRouteItem(id)) {
            router.push(getHref(id));
        } else {
            router.push(`/dashboard?view=${id}`);
            onViewChange?.(id);
        }
        // On mobile the sidebar is an overlay — close it after navigating.
        onClose?.();
    };

    return (
        <>
            {/* Backdrop — only on mobile, only while the drawer is open */}
            <div
                onClick={onClose}
                className={`fixed inset-0 top-16 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
                    mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
            />

            <aside
                className={`flex flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 max-w-[85vw] z-40 shrink-0 bg-gradient-to-b from-[#191c85] via-primary to-[#262b9e] text-white transition-transform duration-300 ease-out lg:translate-x-0 ${
                    mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
                }`}
            >
            {/* subtle top sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-white/[0.04]" />

            {/* Mobile-only close button */}
            <button
                onClick={onClose}
                aria-label="Close menu"
                className="lg:hidden absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
            >
                <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <nav className="relative flex-1 px-3 py-5 space-y-1 overflow-y-auto">
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Workspace</p>
                {NAV_ITEMS.map((item) => {
                    const isRoute = isRouteItem(item.id);
                    const urlView = searchParams.get("view") || "analytics";
                    // The view prop is the source of truth when the dashboard
                    // provides it — falling back to the URL only when absent
                    // keeps e.g. Billing from staying lit after moving to Profile.
                    const active = isRoute
                        ? pathname === getHref(item.id)
                        : pathname === "/dashboard" && (view ? view === item.id : urlView === item.id);
                    return (
                        <button
                            key={item.id}
                            onClick={() => go(item.id)}
                            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                                active
                                    ? "bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                    : "text-white/60 hover:text-white hover:bg-white/[0.07]"
                            }`}
                        >
                            {/* active indicator */}
                            <span
                                className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-cyan transition-all duration-200 ${
                                    active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                                }`}
                            />
                            <span className="material-symbols-outlined text-[21px]" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                {item.icon}
                            </span>
                            <span className={`text-sm ${active ? "font-semibold" : "font-normal"}`}>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Bottom — help card */}
            <div className="relative px-3 pb-5">
                <button
                    onClick={() => go("help")}
                    className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-left transition-all duration-200 hover:bg-white/[0.12] hover:border-white/20 group"
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan/25 text-white transition-transform group-hover:scale-105">
                        <span className="material-symbols-outlined text-[20px]">contact_support</span>
                    </span>
                    <span className="min-w-0">
                        <span className="block text-sm font-medium text-white">Help Center</span>
                        <span className="block text-[11px] text-white/45 truncate">Talk to the ReplyMind team</span>
                    </span>
                </button>
            </div>
            </aside>
        </>
    );
}
