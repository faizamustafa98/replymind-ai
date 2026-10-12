"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/src/components/dashboard/Sidebar";
import Header from "@/src/components/dashboard/Header";
import StatsGrid from "@/src/components/dashboard/StatsGrid";
import BarChart from "@/src/components/dashboard/BarChart";
import MessagesTrendChart from "@/src/components/dashboard/MessagesTrendChart";
import QuickActions from "@/src/components/dashboard/QuickActions";
import ChatDetail from "@/src/components/dashboard/ChatDetail";
import DocumentsPage from "@/src/components/dashboard/DocumentsPage";
import ProfilePage from "@/src/components/dashboard/ProfilePage";
import BillingPage from "@/src/components/dashboard/BillingPage";
import SettingsPage from "@/src/components/dashboard/SettingsPage";
import HelpCenterPage from "@/src/components/dashboard/HelpCenterPage";

export default function Dashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [view, setView] = useState(() => searchParams.get("view") || "analytics");
    const [selectedChat, setSelectedChat] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const v = searchParams.get("view");
        if (v) setView(v);
    }, [searchParams]);

    return (
        <div className="flex h-screen w-full bg-surface">
            {/* Fixed full-width header */}
            {/* Push the URL too so the sidebar highlight follows the actual view */}
            <Header onProfileClick={() => router.push("/dashboard?view=profile")} onMenuClick={() => setMenuOpen(true)} />

            <Sidebar view={view} onViewChange={setView} mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />

            {/* pt-16 offsets the fixed header height; ml only from lg where the sidebar is docked */}
            <main className="flex-1 lg:ml-64 pt-16 h-screen overflow-hidden relative flex flex-col min-w-0">
                {view === "analytics" && (
                    <div className="overflow-y-auto flex-1 px-gutter md:px-xl py-lg">
                        <div className="max-w-[1600px] mx-auto flex flex-col gap-lg">
                            <section className="shrink-0">
                                <h2 className="text-2xl font-medium text-on-surface mb-xs">Analytics</h2>
                                <p className="text-sm text-on-surface-variant">Overview of your AI messaging performance.</p>
                            </section>
                            <StatsGrid />
                            <div className="flex flex-col xl:flex-row gap-lg w-full items-stretch">
                                <section className="xl:w-2/3 flex">
                                    <MessagesTrendChart />
                                </section>
                                <section className="xl:w-1/3 flex flex-col">
                                    <QuickActions onNavigate={setView} />
                                </section>
                            </div>
                            <BarChart />
                        </div>
                    </div>
                )}

                {view === "documents" && <DocumentsPage />}

                {view === "profile" && <ProfilePage />}

                {view === "billing" && <BillingPage />}

                {view === "settings" && <SettingsPage />}

                {view === "help" && <HelpCenterPage />}

                {view === "detail" && selectedChat && (
                    <div className="flex-1 overflow-hidden">
                        <ChatDetail chat={selectedChat} onBack={() => setView("analytics")} />
                    </div>
                )}
            </main>
        </div>
    );
}
