"use client";

import { useEffect, useState } from "react";
import { useAppReady } from "@/src/hooks/useAppReady";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";

const SLIDE_DURATION_MS = 700;
const POST_FILL_PAUSE_MS = 250;
// Set once the splash has played, so it only ever runs on the app's actual
// first load in this browser tab — navigating back to "/" afterwards (e.g.
// via the logo/back link) shouldn't replay a multi-second splash.
const SEEN_KEY = "replymind_splash_seen";
// Matches useAppReady's MIN_DURATION_MS — the bar starts filling the instant
// this mounts (not when `ready` flips) and takes exactly this long to reach
// 100%, so it visually finishes filling right around when the page actually
// becomes ready, instead of only starting to fill at that point.
const FILL_DURATION_MS = 7000;

// line-height 1.22 (not 1) matters here specifically: the fill span is
// clipped with `clip-path: inset()`, which is bounded by the span's own
// box — at line-height:1 this font's descenders ("p", "y") render a
// couple of percent taller than the box itself, overflowing past its
// bottom edge. Content that overflows past the clipped box's edge can
// never be revealed by inset() (it has no "bottom: negative" to extend
// into), so those descender tips stayed permanently unfilled no matter
// how far the rise progressed. The extra line-height gives the box enough
// headroom that the full glyph ink — including descenders — sits inside
// [0%, 100%] of it.
const LOGO_TEXT_STYLE: React.CSSProperties = {
  fontSize: "clamp(64px, 15vw, 220px)",
  lineHeight: 1.22,
  letterSpacing: "-.03em",
};

/**
 * Landing-page-only splash: a plain beige cover (same `bg-bg` as the page
 * itself) with a big centered "ReplyMind" wordmark that fills from the
 * bottom up like water rising in a glass, in sync with actual page load.
 * It only lives on the homepage (mounted from `app/page.tsx`, not the root
 * layout) because its whole job is to mask the landing page's own content
 * settling (fonts, Hero's layout measurements, etc.); other pages don't
 * need it.
 *
 * Sequence: the fill rises over FILL_DURATION_MS starting at mount → once
 * full *and* the page is actually ready, hold briefly so the full fill
 * registers → then the whole cover slides up and away, revealing the
 * landing page underneath. The slide never starts before the fill is full.
 */
export function PageLoader() {
  const ready = useAppReady();
  const reduced = useReducedMotion();
  const [filled, setFilled] = useState(false);
  const [sliding, setSliding] = useState(false);
  // Skip straight past the splash if it already played once this session —
  // sessionStorage read lazily in the initializer so it only ever runs
  // client-side, never during SSR.
  const [gone, setGone] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(SEEN_KEY) === "1"
  );

  // Start the fill immediately on mount.
  useEffect(() => {
    if (gone) return;
    if (reduced) {
      setFilled(true);
      return;
    }
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, [reduced, gone]);

  // Only slide away once the page is ready — this fires no earlier than
  // FILL_DURATION_MS after mount, by which point the bar is already full.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setSliding(true), reduced ? 0 : POST_FILL_PAUSE_MS);
    return () => clearTimeout(t);
  }, [ready, reduced]);

  useEffect(() => {
    if (!sliding) return;
    const t = setTimeout(() => {
      sessionStorage.setItem(SEEN_KEY, "1");
      setGone(true);
    }, reduced ? 0 : SLIDE_DURATION_MS);
    return () => clearTimeout(t);
  }, [sliding, reduced]);

  useEffect(() => {
    document.documentElement.style.overflow = gone ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [gone]);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] bg-bg"
      style={{
        transform: sliding && !reduced ? "translateY(-100%)" : "translateY(0)",
        opacity: sliding && reduced ? 0 : 1,
        transition: reduced ? "opacity .25s ease" : `transform ${SLIDE_DURATION_MS}ms cubic-bezier(.65,0,.35,1)`,
        pointerEvents: sliding ? "none" : "auto",
      }}
    >
      <div className="flex h-full w-full items-center justify-center">
        {/* CSS Grid, not absolute+inset:0: both spans are placed in the same
            grid cell (grid-area 1/1) so each is sized by its OWN text
            content at the SAME font metrics, rather than one being
            stretched to an approximated parent box — that mismatch is what
            was cutting off the "p"/"y" descenders before. `clip-path`
            (not a background-image transition — that one doesn't animate
            smoothly in Chrome, it jumps straight to the end state) drives
            the rise on the fill span only, leaving the outline span
            untouched and always fully visible. */}
        <div className="relative grid select-none font-display font-bold" style={LOGO_TEXT_STYLE}>
          {/* Hollow outline — always visible, never filled */}
          <span
            aria-hidden
            style={{
              gridArea: "1 / 1",
              WebkitTextStroke: "2px var(--color-ink)",
              color: "transparent",
            }}
          >
            ReplyMind
          </span>

          {/* Solid copy: background-clip:text (not text-stroke) so thin
              strokes like the "l"s and "p"'s bowl render identically to
              round letters. The diagonal stripe layer drifts via the
              always-on `water-flow-x` keyframe (globals.css) for a
              moving-water shimmer; the rise itself is a separate
              `clip-path` transition so the two don't fight over the same
              CSS property. */}
          <span
            aria-hidden
            style={{
              gridArea: "1 / 1",
              color: "transparent",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              backgroundImage:
                "linear-gradient(var(--color-primary), var(--color-primary)), repeating-linear-gradient(70deg, rgba(255,255,255,.45) 0 6px, transparent 6px 22px)",
              backgroundSize: "100% 100%, 44px 100%",
              backgroundRepeat: "no-repeat, repeat-x",
              clipPath: filled ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)",
              transition: reduced ? "none" : `clip-path ${FILL_DURATION_MS}ms ease-out`,
              animation: reduced ? "none" : "water-flow-x 1.6s linear infinite",
            }}
          >
            ReplyMind
          </span>

          <div className="absolute -bottom-6 right-0 font-mono text-xs font-semibold uppercase tracking-[.14em] text-ink/70">
            Loading…
          </div>
        </div>
      </div>
    </div>
  );
}
