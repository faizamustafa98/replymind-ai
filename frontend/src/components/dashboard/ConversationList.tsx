"use client";
import { useState } from "react";
import ConversationCard from "@/src/components/dashboard/ConversationCard";

export default function ConversationList({
    conversations = [],
    heading = "Conversations",
    onSelectChat,
    emptyIcon = "search_off",
    compact = false,
    selectedId = null,
}) {
    const [query, setQuery] = useState("");

    // Search matches chat names — typing letters narrows to the chats
    // whose name contains them.
    const filtered = conversations.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase())
    );

    const unreadCount = conversations.filter((c) => !c.read).length;

    const padX = compact ? "px-4" : "px-gutter md:px-xl";
    // Full-width inbox caps its content on ultrawide so cards don't stretch
    // edge-to-edge; the compact (two-column) list already sits in a narrow rail.
    const cap = compact ? "" : "max-w-5xl mx-auto";

    return (
        <section className="w-full h-full flex flex-col overflow-hidden">
            <header className={`${padX} ${cap} ${compact ? "pt-4 pb-3 space-y-3" : "pt-gutter pb-md space-y-md"} w-full shrink-0`}>
                <div className="flex items-baseline gap-3">
                    <h2 className={`${compact ? "text-lg" : "text-2xl"} font-medium text-on-surface`}>{heading}</h2>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            {unreadCount} unread
                        </span>
                    )}
                </div>
                <div className={`relative group ${compact ? "" : "max-w-xl"}`}>
                    <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60 group-focus-within:text-primary transition-colors">search</span>
                    <input
                        className="w-full pl-xl pr-md py-sm bg-surface-container-low border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all font-body-sm"
                        placeholder="Search chats..."
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </header>
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${padX} ${cap} pb-xl space-y-xs w-full`}>
                {filtered.length > 0 ? (
                    filtered.map((chat) => (
                        <ConversationCard
                            key={chat.id}
                            chat={chat}
                            onSelect={onSelectChat}
                            active={chat.id === selectedId}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center mt-16 gap-3 text-on-surface-variant/40">
                        <span className="material-symbols-outlined text-4xl">{query ? "search_off" : emptyIcon}</span>
                        <p className="text-sm">No conversations found.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
