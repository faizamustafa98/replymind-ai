"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { Reveal } from "@/src/components/ui/Reveal";

interface StyledSVGEl extends SVGElement {
  __len?: number;
}

/**
 * The dark "messy inbox" vs "unified inbox" comparison: both diagrams draw
 * their lines/polylines in with `stroke-dashoffset` and fade their node
 * markers in, triggered once when the section scrolls into view. Ports the
 * original `setupStuck`.
 */
export function ScatteredVsUnified() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const messyRef = useRef<SVGSVGElement>(null);
  const cleanRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svgs = [messyRef.current, cleanRef.current].filter(Boolean) as SVGSVGElement[];
    if (!svgs.length) return;

    const groups = svgs.map((svg) => {
      const lines = Array.from(svg.querySelectorAll<StyledSVGEl>("line, polyline"));
      const nodes = Array.from(svg.querySelectorAll<StyledSVGEl>("circle, g[transform]"));
      lines.forEach((l) => {
        try {
          l.__len = (l as unknown as SVGGeometryElement).getTotalLength();
        } catch {
          l.__len = 400;
        }
      });
      return { svg, lines, nodes };
    });

    const hide = (g: (typeof groups)[number]) => {
      g.lines.forEach((l) => { l.style.transition = "none"; l.style.strokeDasharray = String(l.__len); l.style.strokeDashoffset = String(l.__len); });
      g.nodes.forEach((n) => { n.style.transition = "none"; n.style.opacity = "0"; });
    };

    if (reduced) {
      groups.forEach((g) => {
        g.lines.forEach((l) => { l.style.strokeDasharray = "none"; l.style.strokeDashoffset = "0"; });
        g.nodes.forEach((n) => { n.style.opacity = "1"; });
      });
      return;
    }

    // Each panel gets its own timers + observer, watching its own <svg> —
    // not the shared parent section — so the clean-panel diagram doesn't
    // fire until the clean panel itself is actually on screen, independent
    // of when the messy panel (higher up) came into view.
    const cleanups = groups.map((g) => {
      let timers: ReturnType<typeof setTimeout>[] = [];
      const st = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
      const clear = () => { timers.forEach(clearTimeout); timers = []; };
      let playing = false;

      const play = () => {
        clear();
        hide(g);
        void g.svg.getBoundingClientRect();
        g.lines.forEach((l, i) => st(() => { l.style.transition = "stroke-dashoffset .7s ease"; l.style.strokeDashoffset = "0"; }, i * 65));
        g.nodes.forEach((n, i) => st(() => { n.style.transition = "opacity .35s ease"; n.style.opacity = "1"; }, 300 + i * 26));
      };

      hide(g);
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { if (!playing) { playing = true; play(); } }
          else { playing = false; clear(); hide(g); }
        });
      }, { threshold: 0.35 });
      io.observe(g.svg);

      return () => { io.disconnect(); clear(); };
    });

    return () => cleanups.forEach((fn) => fn());
  }, [reduced]);

  return (
    <section ref={sectionRef} className="bg-ink px-6 py-24">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-10 grid items-start gap-12 max-[900px]:grid-cols-1 min-[901px]:grid-cols-[1.15fr_1fr]">
          <h2 className="m-0 font-display text-[52px] font-semibold leading-[1.05] tracking-[-.02em] text-[#6f6f69]">
            Replies didn&apos;t get harder.
            <br />
            They got <span className="text-white">scattered.</span>
          </h2>
          <div className="flex max-w-[450px] flex-col gap-4 pt-2">
            <p className="m-0 text-[15px] leading-[1.62] text-[#b3b3ad]">
              Your customers message on WhatsApp, by email, and through your website — but every
              conversation lives somewhere else, and replies slip through the cracks.
            </p>
            <p className="m-0 text-[15px] leading-[1.62] text-[#b3b3ad]">
              ReplyMind pulls every channel into one thread and drafts a grounded reply for each
              message, so nothing gets missed.
            </p>
          </div>
        </div>

        <Reveal className="mb-[18px] rounded-[22px] border border-[#3a3a37] bg-[#282826] px-7 pb-5 pt-6 [background-image:radial-gradient(circle,rgba(255,255,255,.18)_2px,transparent_2.6px)] [background-size:36px_36px]">
          <div className="mb-1.5 text-sm font-medium text-[#9a9a93]">
            Your inbox is a <span className="font-semibold text-[#e0654e]">mess</span>
          </div>
          <MessySvg svgRef={messyRef} />
        </Reveal>

        <Reveal className="rounded-[22px] bg-primary px-7 pb-[22px] pt-[26px] [background-image:radial-gradient(circle,rgba(255,255,255,.24)_2px,transparent_2.6px)] [background-size:36px_36px]">
          <div className="mb-1.5 text-sm font-medium text-white/[.72]">
            Clean it up with <span className="font-bold text-white">ReplyMind</span>
          </div>
          <CleanSvg svgRef={cleanRef} />
        </Reveal>
      </div>
    </section>
  );
}

function MessySvg({ svgRef }: { svgRef: React.RefObject<SVGSVGElement> }) {
  return (
    <svg ref={svgRef} data-stuck-messy viewBox="0 0 780 290" width="100%" style={{ display: "block", overflow: "visible" }} aria-hidden>
      <g stroke="#6a6a64" strokeWidth="1.4" opacity=".85">
        <line x1="80" y1="175" x2="125" y2="205" />
        <line x1="125" y1="205" x2="175" y2="255" />
        <line x1="175" y1="255" x2="290" y2="260" />
        <line x1="290" y1="260" x2="330" y2="235" />
        <line x1="150" y1="95" x2="240" y2="115" />
        <line x1="245" y1="80" x2="240" y2="115" />
        <line x1="245" y1="80" x2="330" y2="235" />
        <line x1="240" y1="115" x2="385" y2="225" />
        <line x1="330" y1="235" x2="385" y2="225" />
        <line x1="150" y1="95" x2="290" y2="260" />
        <line x1="240" y1="115" x2="540" y2="155" />
        <line x1="470" y1="95" x2="385" y2="225" />
        <line x1="470" y1="95" x2="540" y2="155" />
        <line x1="540" y1="155" x2="620" y2="210" />
        <line x1="620" y1="210" x2="685" y2="255" />
        <line x1="540" y1="155" x2="680" y2="150" />
        <line x1="680" y1="150" x2="750" y2="80" />
        <line x1="680" y1="150" x2="685" y2="255" />
        <line x1="80" y1="175" x2="240" y2="115" />
      </g>
      <g fill="#b3b3ad">
        <circle cx="240" cy="115" r="3.6" /><circle cx="125" cy="205" r="3.6" /><circle cx="175" cy="255" r="3.6" />
        <circle cx="290" cy="260" r="3.6" /><circle cx="330" cy="235" r="3.6" /><circle cx="385" cy="225" r="3.6" />
        <circle cx="540" cy="155" r="3.6" /><circle cx="620" cy="210" r="3.6" /><circle cx="685" cy="255" r="3.6" /><circle cx="680" cy="150" r="3.6" />
      </g>
      <g stroke="#d6d6d0" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(150,95)"><rect x="-10" y="-7" width="20" height="14" rx="2" /><path d="M-10,-5 L0,2 L10,-5" /></g>
        <g transform="translate(470,95)"><rect x="-10" y="-7" width="20" height="14" rx="2" /><path d="M-10,-5 L0,2 L10,-5" /></g>
        <g transform="translate(245,80)"><rect x="-9" y="-8" width="18" height="12" rx="1.5" /><path d="M-12,7 L12,7" /></g>
        <g transform="translate(80,175)"><rect x="-6.5" y="-10" width="13" height="20" rx="2.5" /><path d="M-2,6.5 L2,6.5" /></g>
        <g transform="translate(750,80)"><rect x="-6.5" y="-10" width="13" height="20" rx="2.5" /><path d="M-2,6.5 L2,6.5" /></g>
      </g>
      <g stroke="#e5544a" strokeWidth="2.2" strokeLinecap="round">
        <path d="M166,202 L178,214 M178,202 L166,214" />
        <path d="M329,104 L341,116 M341,104 L329,116" />
        <path d="M494,229 L506,241 M506,229 L494,241" />
        <path d="M634,199 L646,211 M646,199 L634,211" />
        <path d="M679,114 L691,126 M691,114 L679,126" />
      </g>
    </svg>
  );
}

function CleanSvg({ svgRef }: { svgRef: React.RefObject<SVGSVGElement> }) {
  return (
    <svg ref={svgRef} data-stuck-clean viewBox="0 0 780 290" width="100%" style={{ display: "block", overflow: "visible" }} aria-hidden>
      <g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".92">
        <polyline points="48,60 150,50 255,64 360,42 460,64 560,52 655,72 738,60" />
        <polyline points="48,145 150,145 255,145 360,163 460,145 560,145 655,163 738,145" />
        <polyline points="48,230 150,230 255,230 360,214 460,230 560,230 655,230 738,230" />
      </g>
      <g fill="#fff">
        <circle cx="255" cy="64" r="4" /><circle cx="460" cy="64" r="4" /><circle cx="655" cy="72" r="4" />
        <circle cx="150" cy="145" r="4" /><circle cx="460" cy="145" r="4" /><circle cx="560" cy="145" r="4" />
        <circle cx="255" cy="230" r="4" /><circle cx="460" cy="230" r="4" /><circle cx="560" cy="230" r="4" />
      </g>
      <g stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(48,60)"><circle cx="0" cy="-4" r="4" /><path d="M-7,9 C-7,2 7,2 7,9" /></g>
        <g transform="translate(48,145)"><circle cx="0" cy="-4" r="4" /><path d="M-7,9 C-7,2 7,2 7,9" /></g>
        <g transform="translate(48,230)"><circle cx="0" cy="-4" r="4" /><path d="M-7,9 C-7,2 7,2 7,9" /></g>
        <g transform="translate(150,50)"><rect x="-6.5" y="-10" width="13" height="20" rx="2.5" /><path d="M-2,6.5 L2,6.5" /></g>
        <g transform="translate(255,145)"><rect x="-6.5" y="-10" width="13" height="20" rx="2.5" /><path d="M-2,6.5 L2,6.5" /></g>
        <g transform="translate(150,230)"><rect x="-9" y="-8" width="18" height="12" rx="1.5" /><path d="M-12,7 L12,7" /></g>
        <g transform="translate(360,42)"><rect x="-10" y="-7" width="20" height="14" rx="2" /><path d="M-10,-5 L0,2 L10,-5" /></g>
        <g transform="translate(360,214)"><rect x="-10" y="-7" width="20" height="14" rx="2" /><path d="M-10,-5 L0,2 L10,-5" /></g>
      </g>
      <g stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(560,52)"><rect x="-9" y="-7" width="18" height="13" rx="3.5" /><path d="M-3,6 L-3,10 L1,6" /></g>
        <g transform="translate(360,163)"><rect x="-9" y="-7" width="18" height="13" rx="3.5" /><path d="M-3,6 L-3,10 L1,6" /></g>
        <g transform="translate(655,163)"><rect x="-9" y="-7" width="18" height="13" rx="3.5" /><path d="M-3,6 L-3,10 L1,6" /></g>
        <g transform="translate(655,230)"><rect x="-9" y="-7" width="18" height="13" rx="3.5" /><path d="M-3,6 L-3,10 L1,6" /></g>
      </g>
      <g fill="#fff">
        <circle cx="556" cy="52" r="1.2" /><circle cx="560" cy="52" r="1.2" /><circle cx="564" cy="52" r="1.2" />
        <circle cx="356" cy="163" r="1.2" /><circle cx="360" cy="163" r="1.2" /><circle cx="364" cy="163" r="1.2" />
        <circle cx="651" cy="163" r="1.2" /><circle cx="655" cy="163" r="1.2" /><circle cx="659" cy="163" r="1.2" />
        <circle cx="651" cy="230" r="1.2" /><circle cx="655" cy="230" r="1.2" /><circle cx="659" cy="230" r="1.2" />
      </g>
      <g>
        <g transform="translate(738,60)"><circle cx="0" cy="0" r="12" fill="#2fbf6b" /><path d="M-5,0 L-1.5,3.5 L5,-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
        <g transform="translate(738,145)"><circle cx="0" cy="0" r="12" fill="#2fbf6b" /><path d="M-5,0 L-1.5,3.5 L5,-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
        <g transform="translate(738,230)"><circle cx="0" cy="0" r="12" fill="#2fbf6b" /><path d="M-5,0 L-1.5,3.5 L5,-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>
      </g>
    </svg>
  );
}
