# ReplyMind — Marketing Site

A Next.js clone of the ReplyMind landing page, rebuilt from a Claude design
export (`design/ReplyMind.dc.html`) into a real, maintainable web app.

ReplyMind (the fictional product this page markets) is an AI-assisted inbox
that unifies WhatsApp, Email, and Website chat, drafts grounded replies from
a business's own documents, and waits for a human to approve before sending
anything.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**, themed with the original design's exact color tokens
- No backend — this is a static marketing page. See [ARCHITECTURE.md](ARCHITECTURE.md#scope) for what that means and doesn't mean.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run typecheck` | `tsc --noEmit` |

## Where things live

```
src/
  app/            Next.js App Router entry (layout, page, global CSS)
  components/
    layout/       Navbar, Footer — appear on every page
    sections/     One component per landing-page section, in page order
    ui/           Small shared primitives (Reveal)
    icons.tsx     Inline SVG icon set, ported from the original design
  hooks/          useScrollNav, useReducedMotion
  lib/data/       Copy and content as typed data (faqs, pricing, scenarios, ...)
design/           The original Claude design export — reference only, not built
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the reasoning behind this layout,
the color-token system, and how the animations were ported. See
[CONTRIBUTING.md](CONTRIBUTING.md) before making changes.
