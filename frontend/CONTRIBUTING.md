# Contributing

Read [ARCHITECTURE.md](ARCHITECTURE.md) first — it explains *why* things are
organized this way, which this doc assumes.

## Setup

```bash
npm install
npm run dev
```

Before opening a PR:

```bash
npm run typecheck
npm run lint
npm run build
```

## Ground rules

- **This is a landing page, not the product.** Don't add auth, API routes,
  or a database "to make it real" — that's out of scope (see
  [ARCHITECTURE.md#scope](ARCHITECTURE.md#scope)). If you want to build the
  actual product, that's a new project.
- **Colors go through tokens, never raw hex.** If you're adding a color that
  isn't one of the existing `--color-*` variables in
  `src/app/globals.css`, add it there and to `tailwind.config.ts` in the
  same PR, then reference it by name (`text-text-secondary`, `bg-primary`,
  ...). A stray `#1e2294` in a component is a review comment waiting to
  happen.
- **Match the original design before improvising.** `design/ReplyMind.dc.html`
  is the source of truth for copy, spacing, and behavior. If something looks
  off, check that file before guessing — search it for the relevant
  `data-*` attribute or class-free style string.
- **Don't refactor the animated sections into `useState` re-renders.**
  `Hero.tsx`, `HowItWorks.tsx`, and `ScatteredVsUnified.tsx` use direct
  ref/DOM manipulation on purpose — see
  [ARCHITECTURE.md#porting-the-animations](ARCHITECTURE.md#porting-the-animations).
  If you touch the timing in one of these, manually verify the full
  animation cycle in a browser (they run over several seconds), not just
  that it compiles.
- **Respect `prefers-reduced-motion`.** Every animated section reads
  `useReducedMotion()` and should have a sensible "settled" state when it's
  true — don't add a new animation without one.

## Adding a new section

1. Add a component under `src/components/sections/`, named after the section
   (match the original design's own section, if there is one).
2. Pull any copy/lists into `src/lib/data/` as a typed export rather than
   inlining arrays of strings in the component — see `faqs.ts` or
   `pricing.ts` for the pattern.
3. Wrap scroll-triggered fade-ins with the existing `<Reveal>` component
   (`src/components/ui/Reveal.tsx`) instead of writing a new
   `IntersectionObserver` — it already matches the original's timing
   (`opacity 0→1`, `translateY(16px)→0`, threshold `0.12`).
4. Import and place it in `src/app/page.tsx`, in the position it should
   appear.

## Adding a new icon

Add it to `src/components/icons.tsx` alongside the others rather than
inlining an `<svg>` in a section component — path data in the original
design is reused across multiple sections (e.g. the WhatsApp/Email/Website
glyphs appear in the hero, How It Works, and the live demo), and a shared
icon file keeps those in sync if the design ever updates.

## Reporting a mismatch with the original design

If you spot a visual or behavioral difference from `design/ReplyMind.dc.html`
that isn't documented in [ARCHITECTURE.md#known-gaps-vs-the-original-design](ARCHITECTURE.md#known-gaps-vs-the-original-design),
it's a bug — open an issue or PR referencing the specific line(s) in the
`.dc.html` file so it's easy to verify.
