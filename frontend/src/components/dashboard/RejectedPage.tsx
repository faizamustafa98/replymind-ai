"use client";
import { useEffect, useState } from "react";
import ConversationsView from "@/src/components/dashboard/ConversationsView";
import { fetchRejectedConversations } from "@/src/lib/api/conversations";
import { useInboxStore } from "@/src/store/useInboxStore";

const BANNER = (
    <div className="px-6 py-2 bg-surface-container-low border-b border-outline-variant/30 flex items-center gap-2 text-xs text-on-surface-variant shrink-0">
        <span className="material-symbols-outlined text-[16px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
            info
        </span>
        These messages were not identified as questions by the AI (<code className="font-medium text-on-surface">is_question = false</code>) and were skipped for drafting.
    </div>
);

export default function RejectedPage() {
    const cached = useInboxStore((s) => s.rejected);
    const isFresh = useInboxStore((s) => s.isListFresh("rejected"));
    const setRejected = useInboxStore((s) => s.setRejected);

    const [conversations, setConversations] = useState(cached?.data ?? []);
    const [loading, setLoading] = useState(cached === null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isFresh) return;
        fetchRejectedConversations()
            .then((data) => {
                setConversations(data);
                setRejected(data);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFresh]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-surface text-on-surface-variant text-sm">
                Loading conversations…
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-surface text-error text-sm">
                {error}
            </div>
        );
    }

    return (
        <ConversationsView
            view="rejected"
            heading="Rejected"
            conversations={conversations}
            emptyIcon="block"
            banner={BANNER}
        />
    );
}
