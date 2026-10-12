"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/src/components/ui/Reveal";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { pricingPlans } from "@/src/lib/data/pricing";
import { CheckIcon, ClockIcon } from "@/src/components/icons";

// Side cards start shifted a full card-width toward the center card (using a
// percentage transform, which is relative to the card's own box — so this
// holds regardless of actual rendered width) and slightly rotated/scaled
// down, like a fanned stack; the center card just settles from a light
// scale/fade. All three animate out to their grid slot the first time this
// section scrolls into view, then stay put (the reveal does not replay).
const HIDDEN_TRANSFORM = ["translateX(100%) rotate(-7deg) scale(.92)", "scale(.96)", "translateX(-100%) rotate(7deg) scale(.92)"];
const REVEAL_DELAY_MS = [90, 0, 90];

// Same border color on all three cards — the center (Pro) plan's own violet —
// no per-card fill anymore, just plain cards with a consistent thin border.
const BORDER_COLOR = "#4a52c9";

export function Pricing() {
  const reduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (reduced) {
      setInView(true);
      return;
    }
    const el = gridRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        // Reveal once: the first time the grid enters view, play the animation
        // and stop observing so it never replays on later scrolls.
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section id="pricing" className="relative bg-surface bg-gradient-mesh-bg px-6 py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-surface to-transparent" />
      <div className="relative mx-auto max-w-[1180px]">
        <Reveal className="mx-auto max-w-[660px] text-center">
          <span className="text-xs font-medium uppercase tracking-[.08em] text-coral">Pricing</span>
          <h2 className="m-0 mb-2 mt-3 font-display text-[38px] font-semibold leading-[1.15] text-ink">
            Simple pricing. No agents, no seats, no surprises.
          </h2>
          <p className="m-0 text-base text-text-secondary">One flat price per business. Not per person.</p>
        </Reveal>

        <div
          ref={gridRef}
          className="mt-12 grid items-stretch gap-[22px] max-[900px]:grid-cols-1 min-[901px]:grid-cols-3"
        >
          {pricingPlans.map((plan, i) => (
            <div
              key={plan.name}
              className="flex flex-col rounded-[20px] bg-white p-[30px] shadow-[0_1px_3px_rgba(14,19,32,.06)]"
              style={{
                border: `1.5px solid ${BORDER_COLOR}`,
                transform: inView ? "none" : HIDDEN_TRANSFORM[i],
                opacity: inView ? 1 : 0,
                pointerEvents: inView ? "auto" : "none",
                transition: `transform .8s cubic-bezier(.22,1,.36,1) ${REVEAL_DELAY_MS[i]}ms, opacity .6s ease ${REVEAL_DELAY_MS[i]}ms`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-secondary">{plan.name}</span>
                {plan.featured && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[.04em]"
                    style={{ background: "var(--color-primary-light)", color: BORDER_COLOR }}
                  >
                    Most Popular
                  </span>
                )}
              </div>

              <div className="my-2.5 flex items-baseline gap-1">
                <span className="font-display text-[40px] font-semibold text-text-primary">{plan.price}</span>
                <span className="text-[15px] text-text-muted">{plan.period}</span>
              </div>
              <div className="text-[13px] text-text-muted">{plan.billingNote}</div>

              <Link
                href={plan.href}
                className="my-[22px] block rounded-[14px] bg-ink p-3 text-center text-sm font-semibold text-white no-underline transition-transform hover:-translate-y-px"
              >
                {plan.cta}
              </Link>

              <div className="flex flex-col gap-[11px]">
                {plan.features.map((f) => (
                  <div key={f.label} className="flex items-start gap-[9px] text-sm text-text-secondary">
                    <span className="mt-0.5 flex-none" style={{ color: f.included ? BORDER_COLOR : "var(--color-text-muted)" }}>
                      {f.included ? <CheckIcon width={15} height={15} /> : <ClockIcon width={15} height={15} strokeWidth="1.8" />}
                    </span>
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Reveal as="p" className="mt-[26px] text-center text-[13px] text-text-muted">
          All prices are per business, not per seat.
        </Reveal>
      </div>
    </section>
  );
}
