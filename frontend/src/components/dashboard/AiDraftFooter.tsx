"use client";
import { useState } from "react";

export default function AiDraftFooter({ draft, onSend, sending = false, error = "", disabled = false }) {
    const [draftText, setDraftText] = useState(draft || "");
    const [dismissed, setDismissed] = useState(false);
    const [inputText, setInputText] = useState("");

    const showDraft = draft && !dismissed;

    const sendDraft = () => {
        if (!draftText.trim() || sending) return;
        onSend?.(draftText, "approved_sent");
    };

    const sendInput = () => {
        if (!inputText.trim() || sending) return;
        onSend?.(inputText, "manually_sent");
        setInputText("");
    };

    const handleInputKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendInput();
        }
    };

    return (
        <div className="px-gutter pb-gutter pt-sm bg-white/40 backdrop-blur-md shrink-0 border-t border-outline-variant/10">
            {showDraft && (
                <div className="flex flex-col items-end mb-3">
                    <div className="w-full max-w-[70%]">
                        <div className="flex items-center gap-1 mb-1.5 justify-end">
                            <span
                                className="material-symbols-outlined text-[14px] text-primary/50"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                auto_awesome
                            </span>
                            <span className="text-[11px] text-primary/50 font-medium">AI draft · click to edit</span>
                        </div>

                        <textarea
                            value={draftText}
                            onChange={(e) => setDraftText(e.target.value)}
                            disabled={sending}
                            rows={3}
                            className="w-full bg-primary-container text-on-primary-container rounded-tl-2xl rounded-bl-2xl rounded-br-2xl p-3 text-sm leading-relaxed resize-none border border-dashed border-primary/40 hover:border-primary/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-text disabled:opacity-60"
                        />

                        <div className="flex items-center justify-between mt-1.5">
                            <button
                                onClick={() => setDismissed(true)}
                                disabled={sending}
                                className="p-1.5 rounded-full hover:bg-red-50 text-on-surface-variant/40 hover:text-red-400 transition-colors disabled:opacity-40"
                                title="Dismiss draft"
                            >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                            <button
                                onClick={sendDraft}
                                disabled={sending || disabled}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary rounded-full text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[16px]">send</span>
                                {sending ? "Sending…" : "Send"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <p className="text-xs text-error mb-2 text-right">{error}</p>
            )}

            {disabled && (
                <p className="text-xs text-on-surface-variant/60 mb-2 text-right">
                    No customer message left to reply to in this conversation.
                </p>
            )}

            <div className="flex items-center gap-2">
                <div className="flex-1 bg-surface-container-low rounded-full px-4 py-2.5 border border-outline-variant/30 flex items-center focus-within:ring-2 focus-within:ring-primary/40 transition-all">
                    <input
                        className="bg-transparent border-none focus:outline-none w-full text-sm placeholder:text-on-surface-variant/50 disabled:opacity-60"
                        placeholder="Write a message…"
                        type="text"
                        value={inputText}
                        disabled={sending || disabled}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                    />
                </div>
                <button
                    onClick={sendInput}
                    disabled={sending || disabled}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-on-primary hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20 shrink-0 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[20px]">{sending ? "sync" : "send"}</span>
                </button>
            </div>
        </div>
    );
}
