"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { footerLinks } from "@/src/lib/data/footer";

const WORDMARK = "ReplyMind";

export function Footer() {
  return (
    <footer className="flex min-h-[80vh] flex-col overflow-hidden bg-ink">
      <div className="flex flex-1 items-center">
        <AnimatedWordmark text={WORDMARK} />
      </div>

      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-start justify-between gap-8 px-6 pb-10">
        <div>
          <p className="m-0 text-[13px] text-text-muted">© 2026 ReplyMind. All rights reserved.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {footerLinks.map((link, i) => (
            <a
              key={`${link.label}-${i}`}
              href={link.href}
              className="text-sm text-text-on-dark no-underline"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/**
 * Big scroll-reveal wordmark, à la Auxia's footer. Each letter sits inside
 * its own `overflow-hidden` mask box the height of one line, starting
 * pushed down a full box-height below its resting spot — so it's clipped
 * out of view entirely, not just faded. As the footer scrolls up from
 * beneath the CTA band, letters slide upward into their mask one by one
 * (staggered left to right), reading as the logo emerging from under the
 * section above rather than fading in place.
 */
function AnimatedWordmark({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0, rootMargin: "0px 0px -1% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className="w-full select-none px-6 text-center"
      aria-hidden
    >
      <div
        className="font-display font-bold text-text-on-dark"
        style={{ fontSize: "clamp(72px, 18vw, 280px)", lineHeight: 1.1, letterSpacing: "-.03em" }}
      >
        {text.split("").map((ch, i) => (
          <span key={i} className="inline-block overflow-hidden align-bottom" style={{ height: "1.1em" }}>
            <span
              className="inline-block"
              style={{
                transform: visible ? "translateY(0)" : "translateY(100%)",
                transition: `transform .7s cubic-bezier(.22,1,.36,1) ${i * 45}ms`,
              }}
            >
              {ch}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
