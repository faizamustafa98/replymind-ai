"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatsCard from "@/src/components/dashboard/StatsCard";
import { fetchAnalyticsSummary, AuthExpiredError, BackendUnavailableError } from "@/src/lib/api/analytics";

export default function StatsGrid() {
    const router = useRouter();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(() => {
        setLoading(true);
        setError("");
        fetchAnalyticsSummary()
            .then(setSummary)
            .catch((err) => {
                if (err instanceof AuthExpiredError) {
                    router.push("/login");
                    return;
                }
                setError(
                    err instanceof BackendUnavailableError
                        ? "Couldn't reach the server. Please try again."
                        : err.message
                );
            })
            .finally(() => setLoading(false));
    }, [router]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter w-full">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-[140px] rounded-2xl border border-outline-variant/40 bg-surface-container-low animate-pulse"
                    />
                ))}
            </section>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-outline-variant/40 p-lg text-sm text-on-surface-variant w-full">
                <p className="text-error">{error}</p>
                <button
                    onClick={load}
                    className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!summary) return null;

    return (
        <section className="flex flex-col gap-sm w-full">
            {summary.is_mock && (
                <span className="self-start inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 text-[11px] font-medium text-on-secondary-container">
                    <span className="material-symbols-outlined text-[14px]">science</span>
                    Demo data
                </span>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter w-full">
                <StatsCard
                    icon="forum"
                    label="Total Conversations"
                    value={summary.total_conversations.toLocaleString()}
                />
                <StatsCard
                    icon="hourglass_top"
                    label="Pending Review"
                    value={summary.pending_review_count.toLocaleString()}
                    stroke="var(--color-cyan)"
                />
                <StatsCard
                    icon="task_alt"
                    label="Resolved"
                    value={summary.resolved_count.toLocaleString()}
                    stroke="#16a34a"
                />
                <StatsCard
                    icon="mail"
                    label="Total Messages"
                    value={summary.total_messages.toLocaleString()}
                    stroke="var(--color-violet)"
                />
            </div>
        </section>
    );
}
