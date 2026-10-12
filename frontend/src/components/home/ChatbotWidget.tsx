"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { ChatIcon, CloseIcon, SendIcon } from "@/src/components/icons";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm the ReplyMind assistant. Ask me about pricing, features, or how the AI drafting works.",
};

const FALLBACK_ERROR =
  "Sorry, something went wrong reaching the assistant. Please try again in a moment.";

/**
 * Floating, public Q&A widget for the landing page. Calls the backend's
 * unauthenticated /api/public/chat endpoint, which answers only from
 * ReplyMind's own product docs (see replymind-backend/docs/public_kb/) and
 * streams the reply back token-by-token.
 */
export function ChatbotWidget() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [messages, reduced]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || isStreaming) return;

    setMessages((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let draft = "";
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          draft += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: draft };
            return next;
          });
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: FALLBACK_ERROR };
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="ReplyMind assistant chat"
          className="flex h-[480px] w-[340px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-[24px] border border-border-glass bg-white/[.94] shadow-[0_20px_50px_rgba(30,34,148,.22)] backdrop-blur-[16px]"
          style={{ animation: reduced ? undefined : "rm-slidein .3s cubic-bezier(.22,1,.36,1) both" }}
        >
          <div className="flex items-center justify-between border-b border-border bg-gradient-brand px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white/80" />
              <span className="text-sm font-semibold text-white">ReplyMind Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <CloseIcon width={16} height={16} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "max-w-[85%] rounded-[14px] px-3.5 py-2.5 text-[13px] leading-[1.5]",
                  message.role === "user"
                    ? "ml-auto bg-gradient-brand text-white"
                    : "mr-auto border border-border bg-white text-text-primary"
                )}
              >
                {message.content || (
                  <span className="inline-flex items-center gap-[6px]">
                    <span className="h-1.5 w-1.5 animate-rm-dot rounded-full bg-primary" />
                    <span className="h-1.5 w-1.5 animate-rm-dot rounded-full bg-violet [animation-delay:.2s]" />
                    <span className="h-1.5 w-1.5 animate-rm-dot rounded-full bg-cyan [animation-delay:.4s]" />
                  </span>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about pricing, features, setup…"
              disabled={isStreaming}
              maxLength={500}
              className="h-10 flex-1 rounded-full border border-border bg-surface px-4 text-[13px] text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              aria-label="Send"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-brand text-white transition-transform hover:-translate-y-px disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <SendIcon width={15} height={15} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close ReplyMind assistant" : "Chat with the ReplyMind assistant"}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-white shadow-[0_20px_50px_rgba(30,34,148,.28)] transition-transform hover:-translate-y-0.5"
      >
        {open ? <CloseIcon width={22} height={22} /> : <ChatIcon width={22} height={22} />}
      </button>
    </div>
  );
}
