"use client";
import { useState, useEffect, useRef } from "react";
import ChatMessage from "@/src/components/dashboard/ChatMessage";
import AiDraftFooter from "@/src/components/dashboard/AiDraftFooter";
import { sendMessageReply } from "@/src/lib/api/messages";

export default function ChatDetail({ chat, onBack, starred = false, onToggleStar = () => {}, onReject = null, onUnreject = null, loading = false, error = "", onSent = () => {} }) {
    const [messages, setMessages] = useState(chat.messages);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");
    const [actionBusy, setActionBusy] = useState(false);
    const bottomRef = useRef(null);

    // Reject/unreject remove the conversation from the current view, which
    // unmounts this component — the busy flag just guards against a double
    // click while the request is in flight.
    const runAction = async (fn) => {
        if (!fn || actionBusy) return;
        setActionBusy(true);
        try {
            await fn();
        } finally {
            setActionBusy(false);
        }
    };

    useEffect(() => {
        setMessages(chat.messages);
    }, [chat.id, chat.messages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Actually delivers the reply through the tenant's connected email
    // account (see message_service.py) — status distinguishes an approved
    // AI draft from a freely-typed reply, both replying to the customer's
    // own last message (chat.replyToMessageId).
    const handleSend = async (text, status) => {
        if (!text.trim() || !chat.replyToMessageId || sending) return;
        setSending(true);
        setSendError("");
        try {
            await sendMessageReply(chat.replyToMessageId, text.trim(), status);
            const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            setMessages((prev) => [
                ...prev,
                { id: `local-${Date.now()}`, from: "me", text: text.trim(), time: now },
            ]);
            onSent();
        } catch (err) {
            setSendError(err.message ?? "Failed to send reply.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white w-full">
            {/* Header */}
            <header className="h-16 flex items-center justify-between gap-2 px-3 sm:px-gutter border-b border-outline-variant/30 bg-white/80 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2 sm:gap-md min-w-0">
                    <button onClick={onBack} className="p-xs hover:bg-surface-container-high rounded-full shrink-0 group">
                        <span className="material-symbols-outlined text-primary group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    </button>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-primary/20 transition-transform hover:scale-110 cursor-pointer shrink-0">
                        <img alt={chat.name} className="w-full h-full object-cover" src={chat.avatar} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-medium text-on-surface truncate">{chat.name}</h3>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-body-sm text-on-surface-variant truncate">{chat.email}</span>
                            <span className="hidden sm:inline px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-medium shrink-0">{chat.channel}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-sm shrink-0">
                    <button
                        onClick={onToggleStar}
                        title={starred ? "Unstar conversation" : "Star conversation"}
                        className="p-sm hover:bg-surface-container-high rounded-full transition-all group"
                    >
                        <span
                            className={`material-symbols-outlined transition-all group-hover:scale-110 ${starred ? "text-amber-400" : "group-hover:text-amber-400"}`}
                            style={starred ? { fontVariationSettings: "'FILL' 1" } : {}}
                        >
                            star
                        </span>
                    </button>
                    {onReject && (
                        <button
                            onClick={() => runAction(onReject)}
                            disabled={actionBusy}
                            title="Reject — move to Rejected"
                            className="p-sm hover:bg-error-container/60 rounded-full transition-all group disabled:opacity-40"
                        >
                            <span className="material-symbols-outlined group-hover:scale-110 group-hover:text-error">block</span>
                        </button>
                    )}
                    {onUnreject && (
                        <button
                            onClick={() => runAction(onUnreject)}
                            disabled={actionBusy}
                            title="Move back to Inbox"
                            className="p-sm hover:bg-surface-container-high rounded-full transition-all group disabled:opacity-40"
                        >
                            <span className="material-symbols-outlined group-hover:scale-110 group-hover:text-primary">move_to_inbox</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-gutter space-y-lg custom-scrollbar bg-surface-bright/30">
                <div className="flex justify-center my-md">
                    <span className="px-md py-xs bg-surface-variant/50 text-[11px] font-medium text-on-surface-variant rounded-full uppercase tracking-widest">
                        October 24, 2023
                    </span>
                </div>
                {loading && (
                    <p className="text-center text-xs text-on-surface-variant/60">Loading messages…</p>
                )}
                {error && (
                    <p className="text-center text-xs text-error">{error}</p>
                )}
                {!loading && messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Footer */}
            <AiDraftFooter
                draft={chat.draft}
                onSend={handleSend}
                sending={sending}
                error={sendError}
                disabled={!chat.replyToMessageId}
            />
        </div>
    );
}
