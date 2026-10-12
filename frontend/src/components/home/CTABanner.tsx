"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";

const SPACING = 36; // matches the dot-grid spacing used elsewhere (ScatteredVsUnified)
const TRAIL_LEN = 8;
const MAX_AGE = 30; // frames a lit dot/connector survives once the pointer moves on (~.5s @60fps)

interface GridDot {
  x: number;
  y: number;
}

interface TrailNode extends GridDot {
  age: number;
}

/**
 * Full-bleed CTA band, flush against the footer below it (no card, no
 * rounded corners, no side margins — same dark background color as the
 * footer so the two read as one continuous block).
 *
 * The dot grid is real SVG circles, not a CSS background-image, because the
 * hover effect needs actual dot coordinates to snap to: as the pointer
 * moves, it finds the *nearest existing grid dot*, and connects the last
 * ~8 visited dots to each other with straight segments — it does not draw
 * a freehand line at raw cursor coordinates. Older dots/segments in that
 * trail age out and fade after the pointer moves on.
 */
export function CTABanner() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const [grid, setGrid] = useState<GridDot[]>([]);
  const [visible, setVisible] = useState(false);

  // Entrance fade, scoped to this section (same pattern as <Reveal>, done
  // locally because the pointer/grid logic below also needs a raw ref to
  // the section element).
  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = sectionRef.current;
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
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  // Build the dot grid to fill the section, recomputed on resize.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const build = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const cols = Math.ceil(w / SPACING) + 1;
      const rows = Math.ceil(h / SPACING) + 1;
      const dots: GridDot[] = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          dots.push({ x: i * SPACING + SPACING / 2, y: j * SPACING + SPACING / 2 });
        }
      }
      setGrid(dots);
    };
    build();
    window.addEventListener("resize", build, { passive: true });
    return () => window.removeEventListener("resize", build);
  }, []);

  // Pointer-driven trail: snap to nearest grid dot, connect the last few
  // visited dots, fade with age.
  useEffect(() => {
    if (reduced) return;
    const el = sectionRef.current;
    if (!el || grid.length === 0) return;
    const sectionEl = el;

    let trail: TrailNode[] = [];
    let raf = 0;
    let running = false;

    function nearestDot(x: number, y: number): GridDot {
      let best = grid[0];
      let bestD = Infinity;
      for (const d of grid) {
        const dx = d.x - x;
        const dy = d.y - y;
        const dist = dx * dx + dy * dy;
        if (dist < bestD) { bestD = dist; best = d; }
      }
      return best;
    }

    function render() {
      trail.forEach((p) => { p.age += 1; });
      trail = trail.filter((p) => p.age <= MAX_AGE);

      dotRefs.current.forEach((dot, i) => {
        const p = trail[i];
        if (!dot) return;
        if (!p) { dot.style.opacity = "0"; return; }
        const life = Math.max(0, 1 - p.age / MAX_AGE);
        dot.setAttribute("cx", String(p.x));
        dot.setAttribute("cy", String(p.y));
        dot.setAttribute("r", String(2 + life * 3));
        dot.style.opacity = String(life);
      });

      lineRefs.current.forEach((line, i) => {
        const a = trail[i];
        const b = trail[i + 1];
        if (!line) return;
        if (!a || !b) { line.style.opacity = "0"; return; }
        const life = Math.max(0, 1 - a.age / MAX_AGE);
        line.setAttribute("x1", String(a.x));
        line.setAttribute("y1", String(a.y));
        line.setAttribute("x2", String(b.x));
        line.setAttribute("y2", String(b.y));
        line.style.opacity = String(life * 0.8);
      });

      if (trail.length > 0) {
        raf = requestAnimationFrame(render);
      } else {
        running = false;
      }
    }

    function ensureLoop() {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(render);
      }
    }

    function onMove(e: PointerEvent) {
      const r = sectionEl.getBoundingClientRect();
      const dot = nearestDot(e.clientX - r.left, e.clientY - r.top);
      if (trail[0]?.x === dot.x && trail[0]?.y === dot.y) return; // still in the same cell
      trail.unshift({ ...dot, age: 0 });
      if (trail.length > TRAIL_LEN) trail.length = TRAIL_LEN;
      ensureLoop();
    }

    sectionEl.addEventListener("pointermove", onMove);
    return () => {
      sectionEl.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced, grid]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-ink px-6 py-24 text-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(16px)",
        transition: "opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <div
        className="pointer-events-none absolute -bottom-[140px] -right-24 z-0 h-[440px] w-[440px] rounded-full opacity-[.28] blur-[50px]"
        style={{ background: "var(--gradient-brand)" }}
      />

      <svg ref={svgRef} className="pointer-events-none absolute inset-0 z-[1]" width="100%" height="100%">
        {grid.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={2} fill="#fff" opacity={0.16} />
        ))}
        {Array.from({ length: TRAIL_LEN - 1 }).map((_, i) => (
          <line
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            stroke="#fff"
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0}
          />
        ))}
        {Array.from({ length: TRAIL_LEN }).map((_, i) => (
          <circle
            key={i}
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            r={0}
            fill="#fff"
            opacity={0}
          />
        ))}
      </svg>

      <div className="relative z-[2] mx-auto max-w-[1180px]">
        <h2 className="m-0 mb-3 font-display text-[38px] font-semibold leading-[1.15] text-white">
          Start replying faster today.
        </h2>
        <p className="m-0 mb-7 text-base text-text-on-dark-muted">
          Free to start. No credit card. Setup in under 10 minutes.
        </p>
        <Link
          href="/register"
          className="inline-flex rounded-[14px] bg-white px-7 py-[15px] text-base font-semibold text-ink no-underline shadow-[0_8px_24px_rgba(0,0,0,.25)] transition-transform hover:-translate-y-px"
        >
          Create Your Free Account
        </Link>
      </div>
    </section>
  );
}
