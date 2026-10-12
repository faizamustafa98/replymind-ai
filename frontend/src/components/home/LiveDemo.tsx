"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { scenarios } from "@/src/lib/data/scenarios";
import { channelIcon, ArrowRightIcon, SendIcon, WhatsAppIcon, EmailIcon, WebsiteIcon } from "@/src/components/icons";

type Phase = "in" | "drafting" | "typing" | "actions";

/**
 * "See it in action" — cycles through the three demo scenarios (WhatsApp,
 * Email, Website), each going through in → drafting → typing (character by
 * character) → actions, then advancing to the next scenario. Ports the
 * original `runCycle`/`startTyping`/`afterType` state machine onto React
 * state instead of direct `setState` calls, since this piece has no DOM
 * measurement needs like the Hero/HowItWorks timelines do.
 */
export function LiveDemo() {
  const reduced = useReducedMotion();
  const [demoIdx, setDemoIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("in");
  const [typed, setTyped] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const typer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const scenario = scenarios[demoIdx];

    if (reduced) {
      setPhase("actions");
      setTyped(scenario.draft.length);
      return;
    }

    const t = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

    setPhase("in");
    setTyped(0);

    t(() => setPhase("drafting"), 1100);
    t(() => {
      setPhase("typing");
      let n = 0;
      typer.current = setInterval(() => {
        n += 1;
        if (n >= scenario.draft.length) {
          if (typer.current) clearInterval(typer.current);
          setTyped(scenario.draft.length);
          setPhase("actions");
          t(() => setDemoIdx((i) => (i + 1) % scenarios.length), 3400);
          return;
        }
        setTyped(n);
      }, 24);
    }, 2300);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      if (typer.current) clearInterval(typer.current);
    };
    // demoIdx is the only thing that should restart this cycle; reduced is stable per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoIdx, reduced]);

  const scenario = scenarios[demoIdx];
  const showCard = true;
  const showDrafting = phase === "drafting";
  const showDraft = phase === "typing" || phase === "actions";
  const showActions = phase === "actions";
  const draftText = reduced ? scenario.draft : scenario.draft.slice(0, typed);

  return (
    <section id="demo" className="border-t border-border bg-surface px-6 py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-14 max-[900px]:grid-cols-1 min-[901px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border-glass bg-surface-glass px-3.5 py-[7px] shadow-[0_1px_3px_rgba(14,19,32,.06)] backdrop-blur-[12px]">
            <span className="h-2 w-2 rounded-full bg-cyan" />
            <span className="text-xs font-medium uppercase tracking-[.08em] text-text-secondary">AI-Assisted Inbox</span>
          </div>
          <h2 className="mt-[22px] font-display text-[38px] font-semibold leading-[1.16] tracking-[-.02em] text-text-primary">
            Every customer message. One inbox.{" "}
            <span className="bg-gradient-brand bg-clip-text text-transparent">AI drafts — you decide.</span>
          </h2>
          <p className="mt-[22px] max-w-[520px] text-lg leading-[1.65] text-text-secondary">
            ReplyMind pulls your WhatsApp, Email, and Website messages into one place, writes a reply
            draft for each, and waits for your tap. Replies go out faster. Nothing goes out without you.
          </p>
          <div className="mt-[30px] flex flex-wrap gap-3.5">
            <a
              href="#pricing"
              className="inline-flex items-center rounded-[14px] bg-gradient-brand px-[26px] py-[15px] text-base font-semibold text-white no-underline shadow-[0_20px_50px_rgba(30,34,148,.28)] transition-transform hover:-translate-y-px"
            >
              Start Free — No Card Needed
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-[14px] border border-border bg-white/70 px-[22px] py-[15px] text-base font-semibold text-text-primary no-underline transition-colors hover:border-primary hover:text-primary"
            >
              See How It Works
              <ArrowRightIcon width={18} height={18} strokeWidth="1.8" />
            </a>
          </div>
          <p className="mt-[22px] text-[13px] text-text-muted">
            Free forever for 100 replies/month · No credit card · Setup in 10 minutes.
          </p>
        </div>

        <div className="relative">
          <FloatBadge className="left-[-8px] top-[-14px] animate-rm-floatA" icon={<WhatsAppIcon width={15} height={15} strokeWidth="1.8" />} color="text-teal" label="WhatsApp" />
          <FloatBadge className="right-3.5 top-[-8px] animate-rm-floatB" icon={<EmailIcon width={15} height={15} strokeWidth="1.8" />} color="text-coral" label="Email" />
          <FloatBadge className="bottom-11 right-[-6px] animate-rm-floatC" icon={<WebsiteIcon width={15} height={15} strokeWidth="1.8" />} color="text-amber" label="Website" />

          <div className="relative overflow-hidden rounded-[28px] border border-border-glass bg-white/[.72] p-[18px] shadow-[0_20px_50px_rgba(30,34,148,.18)] backdrop-blur-[16px] backdrop-saturate-[1.4]">
            <div className="flex items-center justify-between px-1.5 pb-3.5 pt-1">
              <div className="flex items-center gap-2">
                <span className="h-[9px] w-[9px] rounded-full bg-gradient-brand" />
                <span className="text-[13px] font-semibold text-text-primary">Unified Inbox</span>
              </div>
              <span className="text-[11px] font-medium text-text-muted">Live</span>
            </div>

            <div className="relative h-[385px]">
              <div className="flex flex-col gap-2.5 opacity-50">
                <div className="flex items-start gap-2.5 rounded-[14px] border border-border bg-white p-3">
                  <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-primary-light text-[12px] font-bold text-primary">
                    SK
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">Sana · Email</div>
                    <div className="text-xs text-text-secondary">Thanks, that worked!</div>
                  </div>
                </div>
              </div>

              {showCard && (
                <div className="mt-2.5 animate-rm-slidein">
                  <div className="flex items-start gap-2.5 rounded-[14px] border border-border bg-white p-3 shadow-[0_8px_24px_rgba(14,19,32,.08)]">
                    <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-white" style={{ background: scenario.color }}>
                      {channelIcon(scenario.key, { width: 15, height: 15, strokeWidth: "1.8" })}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text-primary">Customer · {scenario.channel}</div>
                      <div className="mt-0.5 text-[13px] text-text-secondary">{scenario.text}</div>
                    </div>
                  </div>

                  {showDrafting && (
                    <div className="ml-10 mt-2.5 inline-flex items-center gap-[9px] rounded-xl bg-primary-light px-3.5 py-2.5">
                      <span className="h-1.5 w-1.5 animate-rm-dot rounded-full bg-primary" />
                      <span className="h-1.5 w-1.5 animate-rm-dot rounded-full bg-violet [animation-delay:.2s]" />
                      <span className="h-1.5 w-1.5 animate-rm-dot rounded-full bg-cyan [animation-delay:.4s]" />
                      <span className="text-xs font-semibold text-primary">AI drafting…</span>
                    </div>
                  )}

                  {showDraft && (
                    <div
                      className="ml-10 mt-2.5 rounded-[14px] border p-3.5"
                      style={{ borderColor: "rgba(30,34,148,.28)", background: "linear-gradient(180deg,rgba(238,240,216,.7),rgba(255,255,255,.9))" }}
                    >
                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-2.5 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        <span className="text-[10px] font-semibold tracking-[.03em] text-white">Draft · grounded in your docs</span>
                      </div>
                      <div className="text-[13px] leading-[1.55] text-text-primary">
                        {draftText}
                        {phase === "typing" && (
                          <span className="animate-rm-dot font-normal text-primary">▍</span>
                        )}
                      </div>
                    </div>
                  )}

                  {showActions && (
                    <div className="ml-10 mt-3 flex gap-2">
                      <button className="inline-flex animate-rm-pulse items-center gap-1.5 rounded-[10px] bg-teal px-3.5 py-2 text-xs font-semibold text-white">
                        <SendIcon width={13} height={13} /> Send
                      </button>
                      <button className="rounded-[10px] border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text-primary">
                        Edit
                      </button>
                      <button className="rounded-[10px] px-3 py-2 text-xs font-semibold text-text-muted">Ignore</button>
                    </div>
                  )}
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-white/0 to-[#f7f8fc]/95" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatBadge({
  className,
  icon,
  color,
  label,
}: {
  className: string;
  icon: React.ReactNode;
  color: string;
  label: string;
}) {
  return (
    <div
      className={`absolute z-[3] inline-flex items-center gap-[7px] rounded-full border border-border bg-white px-[13px] py-[7px] shadow-[0_8px_24px_rgba(14,19,32,.10)] ${className}`}
    >
      <span className={`inline-flex ${color}`}>{icon}</span>
      <span className="text-xs font-semibold text-text-primary">{label}</span>
    </div>
  );
}
