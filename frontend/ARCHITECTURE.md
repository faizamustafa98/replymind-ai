# Architecture

## Scope

This repo is the **marketing site only** — the landing page is a faithful
clone of `design/ReplyMind.dc.html`. There is no auth, no database, no real
inbox, and no AI backend. Every "Start Free" / "Send" / "Get Started" control
on the landing page is a static link (mostly `#pricing`, `#top` anchors)
exactly as in the source design. If ReplyMind ever becomes a real product,
that's a separate, much larger project — this one is deliberately just the
front door.

`/login` and `/signup` (`src/app/login`, `src/app/signup`) are static UI
only, same rule: the forms don't submit anywhere (submit buttons are
`type="button"`, not real form submissions) — they exist to show what the
brand's auth screens would look like, not to authenticate anyone. Wiring
them to a real backend is out of scope here for the same reason as above.

## Why Next.js App Router

The original design is a single page with a handful of client-side
interactive widgets (mobile menu, scroll reveals, an animated hero, a live
demo cycler, an FAQ accordion). App Router with the root page as a Server
Component and each interactive section marked `"use client"` gives:

- Zero client JS for content that never changes (copy, layout, most markup)
- Small, individually-testable client islands for the parts that do animate
- A conventional place (`src/app/layout.tsx`) for fonts and global `<head>` tags

## Design tokens

Every color in `design/ReplyMind.dc.html`'s `:root` block is mirrored 1:1 in
two places that must stay in sync:

1. `src/app/globals.css` — the actual CSS variables (`--color-primary`, etc.)
2. `tailwind.config.ts` — Tailwind color names that resolve to those variables
   (`bg-primary`, `text-text-secondary`, `border-border`, ...)

This indirection (Tailwind name → CSS var → hex) exists so a rebrand is a
one-line change in `globals.css`, not a find-and-replace across every
component. The original design already worked this way — its `accentColor`
prop overrode `--color-primary` at the root — so this is preservation, not
a new idea.

Gradients (`--gradient-brand`, `--gradient-mesh-bg`) are multi-stop and
awkward to express as Tailwind theme colors, so they're exposed as
`backgroundImage` utilities (`bg-gradient-brand`) that reference the CSS
variable directly.

**If you need a new color:** add it to `globals.css` first, then add a
matching entry to `tailwind.config.ts`. Don't hardcode a hex value in a
component — grep for the existing token names before assuming one doesn't
exist yet.

## Component layout

```
components/
  layout/     Navbar, Footer — persistent chrome
  sections/   One file per landing-page section, imported by src/app/page.tsx
              in the same order they appear on the page
  ui/         Reveal — the only generic primitive so far
  icons.tsx   All inline SVG icons in one file, exported as small components
```

Section components are intentionally *not* split further than the original
design's own section boundaries (Hero, HowItWorks, ScatteredVsUnified,
FeatureDeepDive, LiveDemo, Pricing, FAQ, CTABanner). That mapping makes it
easy to find "the pricing section" without guessing a folder structure the
original design never had.

## Porting the animations

The original design is a single hand-rolled class (`DCLogic` subclass) that
does direct DOM manipulation (`document.querySelector`, `el.style.x = ...`,
`setTimeout` chains) rather than a typical component-state re-render loop —
it's optimized for one-shot playback, not for React's re-render model.

Rather than force every animation through `useState` (which would mean
re-rendering the whole tree dozens of times a second during, say, the hero's
line-drawing animation), each animated section keeps that same **imperative,
ref-scoped** style, adapted to React lifecycle rules:

- `document.querySelector(...)` (global, breaks with multiple instances) →
  a component-owned `ref`, queried with `ref.current.querySelectorAll(...)`
  (scoped, SSR-safe, cleaned up on unmount)
- A single global `IntersectionObserver` in `componentDidMount` → one
  `IntersectionObserver` per component, created and disconnected inside a
  `useEffect`
- `this.reduce` (checked once at mount) → the `useReducedMotion()` hook,
  which every animated section checks first and uses to jump straight to the
  settled end state

This means `Hero.tsx` and `HowItWorks.tsx` in particular read more like the
original vanilla-JS version than "normal" React — that's intentional. Don't
"fix" them into `useState`-driven re-renders unless you're prepared to also
rebuild the timing (a naive port will drop frames or fire timers out of
order). See inline comments in those two files before touching the
animation logic.

Sections that are purely declarative in the original (Pricing, FAQ,
SocialProof, FeatureDeepDive, CTABanner) are plain React state/props, no
special-casing needed.

## Breakpoints

The original design uses three ad-hoc breakpoints (`960px`, `900px`,
`620px`) rather than a standard scale. Components use Tailwind's arbitrary
breakpoint syntax (`max-[900px]:grid-cols-1`) at the exact same pixel values
instead of coercing everything onto Tailwind's default `sm`/`md`/`lg` scale,
so the responsive behavior matches the source design exactly rather than
approximately.

## Known gaps vs. the original design

- **Testimonials data exists but is unused.** The original component defines
  `this.testimonials` and passes it to `renderVals()`, but no
  `data-testi-grid` markup ever consumes it — it's dead code left over from
  an earlier iteration. `src/lib/data/testimonials.ts` carries the same data
  forward, typed, in case a Testimonials section gets added later. Don't
  assume it's wired up anywhere.
- The animated hero canvas is a fixed 1400×290 layout, scaled to fit via a
  measured `transform: scale()` (see `Hero.tsx`'s `scaleJourney`). This is
  ported as-is from the original; it's deliberately not "responsive" in the
  usual CSS sense because the original wasn't either.
