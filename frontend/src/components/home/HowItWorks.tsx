"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { Reveal } from "@/src/components/ui/Reveal";
import { FileIcon, WhatsAppIcon, EmailIcon, WebsiteIcon, SendIcon, UploadIcon } from "@/src/components/icons";

const steps = [
  { step: "STEP 01", title: "Upload your docs", desc: "Drop in your FAQ, menu, or price list. It becomes the source of truth for every reply." },
  { step: "STEP 02", title: "Connect your channels", desc: "WhatsApp, Email, and website chat all flow into one inbox. No switching apps." },
  { step: "STEP 03", title: "AI drafts the reply", desc: "The moment a message lands, ReplyMind writes a grounded draft from your docs." },
  { step: "STEP 04", title: "Review & send", desc: "Read it, tweak a word, or send in one tap. Nothing goes out without you." },
];

/**
 * Four step cards whose connectors are dot-trail SVG paths built from the
 * live bounding boxes of the cards (desktop only — the connectors don't
 * make sense once the grid collapses to one column on mobile). Ports the
 * original `setupHowFlow`: cards fade in together on scroll-into-view, then
 * ring markers pop and dot trails "connect" the cards one dot at a time.
 */
export function HowItWorks() {
  const reduced = useReducedMotion();
  const flowRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const flow = flowRef.current;
    const svg = svgRef.current;
    if (!flow || !svg) return;

    const stepEls = Array.from(flow.querySelectorAll<HTMLDivElement>("[data-how-step]"));
    const cardEls = Array.from(flow.querySelectorAll<HTMLDivElement>("[data-how-card]"));
    const NS = "http://www.w3.org/2000/svg";
    stepEls.forEach((s) => { s.style.transition = "opacity .55s cubic-bezier(.22,1,.36,1),transform .55s cubic-bezier(.22,1,.36,1)"; });

    let howDotGroups: SVGCircleElement[][] = [];
    let howRings: SVGCircleElement[] = [];
    let howTimers: ReturnType<typeof setTimeout>[] = [];
    let howPlaying = false;
    const ht = (fn: () => void, ms: number) => howTimers.push(setTimeout(fn, ms));
    const clearHow = () => { howTimers.forEach(clearTimeout); howTimers = []; };

    const build = () => {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      howDotGroups = []; howRings = [];
      stepEls.forEach((s) => { s.style.marginTop = ""; });
      const wide = window.innerWidth > 900 && cardEls.length === 4;
      svg.style.display = wide ? "block" : "none";
      if (!wide) return;

      stepEls.forEach((s, i) => { s.style.marginTop = i % 2 === 1 ? "48px" : "0px"; });
      const cr = flow.getBoundingClientRect();
      const R = cardEls.map((c) => {
        const r = c.getBoundingClientRect();
        return { l: r.left - cr.left, t: r.top - cr.top, r: r.right - cr.left, b: r.bottom - cr.top };
      });
      const primary = getComputedStyle(flow).getPropertyValue("--color-primary").trim() || "#1e2294";

      const mkRing = (x: number, y: number) => {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", String(x)); c.setAttribute("cy", String(y)); c.setAttribute("r", "4.5");
        c.setAttribute("fill", "#fff"); c.setAttribute("stroke", primary); c.setAttribute("stroke-width", "2");
        c.style.transformBox = "fill-box"; c.style.transformOrigin = "center";
        c.style.opacity = "0"; c.style.transform = "scale(0)";
        svg.appendChild(c); howRings.push(c);
      };

      const cx = (i: number) => (R[i].l + R[i].r) / 2;
      const tc = (i: number) => ({ x: cx(i), y: R[i].t });
      const bc = (i: number) => ({ x: cx(i), y: R[i].b });
      const conns = [
        { a: tc(0), b: tc(1), dir: -1 },
        { a: bc(1), b: bc(2), dir: 1 },
        { a: tc(2), b: tc(3), dir: -1 },
      ];

      conns.forEach((cn) => {
        const belly = cn.dir < 0 ? Math.min(cn.a.y, cn.b.y) - 42 : Math.max(cn.a.y, cn.b.y) + 28;
        const d = `M${cn.a.x},${cn.a.y} C${cn.a.x},${belly} ${cn.b.x},${belly} ${cn.b.x},${cn.b.y}`;
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", d); path.setAttribute("fill", "none"); path.setAttribute("stroke", "none");
        svg.appendChild(path);
        const total = path.getTotalLength();
        const n = Math.max(5, Math.round(total / 13));
        const dots: SVGCircleElement[] = [];
        for (let i = 1; i < n; i++) {
          const pt = path.getPointAtLength((total * i) / n);
          const dot = document.createElementNS(NS, "circle");
          dot.setAttribute("cx", String(pt.x)); dot.setAttribute("cy", String(pt.y)); dot.setAttribute("r", "2.7");
          dot.setAttribute("fill", primary);
          dot.style.transformBox = "fill-box"; dot.style.transformOrigin = "center";
          dot.style.opacity = "0"; dot.style.transform = "scale(0)";
          svg.appendChild(dot); dots.push(dot);
        }
        mkRing(cn.a.x, cn.a.y); mkRing(cn.b.x, cn.b.y);
        howDotGroups.push(dots);
      });
    };

    const hideAll = () => {
      stepEls.forEach((s) => { s.style.opacity = "0"; s.style.transform = "translateY(22px)"; });
      howDotGroups.forEach((g) => g.forEach((d) => { d.style.transition = "none"; d.style.opacity = "0"; d.style.transform = "scale(0)"; }));
      howRings.forEach((r) => { r.style.transition = "none"; r.style.opacity = "0"; r.style.transform = "scale(0)"; });
    };

    if (reduced) {
      build();
      stepEls.forEach((s) => { s.style.opacity = "1"; s.style.transform = "none"; });
      howDotGroups.forEach((g) => g.forEach((d) => { d.style.opacity = "1"; d.style.transform = "none"; }));
      howRings.forEach((r) => { r.style.opacity = "1"; r.style.transform = "none"; });
      return;
    }

    const play = () => {
      clearHow();
      hideAll();
      void flow.getBoundingClientRect();
      stepEls.forEach((s) => { s.style.opacity = "1"; s.style.transform = "none"; });
      howRings.forEach((r, i) => ht(() => {
        r.style.transition = "opacity .25s ease, transform .3s cubic-bezier(.34,1.6,.5,1)";
        r.style.opacity = "1"; r.style.transform = "scale(1)";
      }, 300 + i * 26));
      let t = 660;
      howDotGroups.forEach((g) => {
        g.forEach((d, i) => ht(() => {
          d.style.transition = "opacity .2s ease, transform .25s cubic-bezier(.34,1.6,.5,1)";
          d.style.opacity = "1"; d.style.transform = "scale(1)";
        }, t + i * 46));
        t += g.length * 46 + 260;
      });
    };

    build();
    hideAll();
    const onResize = () => { const was = howPlaying; build(); if (was) play(); else hideAll(); };
    window.addEventListener("resize", onResize, { passive: true });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { if (!howPlaying) { howPlaying = true; play(); } }
        else { howPlaying = false; clearHow(); hideAll(); }
      });
    }, { threshold: 0.25 });
    io.observe(flow);

    return () => {
      io.disconnect();
      window.removeEventListener("resize", onResize);
      clearHow();
    };
  }, [reduced]);

  return (
    <section id="how" className="bg-surface px-6 py-24">
      <div className="mx-auto max-w-[1180px]">
        <Reveal className="max-w-[640px]">
          <span className="text-xs font-medium uppercase tracking-[.08em] text-coral">How It Works</span>
          <h2 className="m-0 mt-3 font-display text-[38px] font-semibold leading-[1.15] text-ink">
            Go from inbox chaos to one-tap replies
          </h2>
        </Reveal>

        <div
          ref={flowRef}
          className="relative mt-[60px] grid gap-[38px] pb-[54px] pt-[66px] max-[900px]:grid-cols-1 max-[900px]:justify-items-center max-[900px]:gap-[30px] max-[900px]:py-5 min-[901px]:grid-cols-4"
        >
          <svg ref={svgRef} className="pointer-events-none absolute inset-0 z-[3]" width="100%" height="100%" style={{ overflow: "visible" }} />

          {steps.map((s, i) => (
            <div key={s.step} data-how-step className="relative z-[1] min-w-0 max-[900px]:w-full max-[900px]:max-w-[360px]">
              <StepCard index={i} />
              <div className="my-9 font-mono text-[11px] font-semibold tracking-[.08em] text-primary">{s.step}</div>
              <h3 className="m-0 mb-[7px] font-display text-[19px] font-semibold text-text-primary">{s.title}</h3>
              <p className="m-0 text-sm leading-relaxed text-text-secondary">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ index }: { index: number }) {
  return (
    <div
      data-how-card
      className="relative h-[172px] rounded-[20px] border border-border bg-white/[.72] p-4 shadow-[0_10px_30px_rgba(14,19,32,.06)] backdrop-blur-[16px] backdrop-saturate-[1.4]"
    >
      {index === 0 && <UploadDocsMock />}
      {index === 1 && <ConnectChannelsMock />}
      {index === 2 && <AiDraftsMock />}
      {index === 3 && <ReviewSendMock />}
    </div>
  );
}

function UploadDocsMock() {
  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden rounded-xl border border-border bg-white p-[11px]">
      <div className="flex items-center gap-[7px]">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md bg-primary-light text-primary">
          <FileIcon width={12} height={12} strokeWidth="1.8" />
        </span>
        <span className="text-[11px] font-semibold text-text-primary">price-list.pdf</span>
      </div>
      <div className="h-1.5 w-[82%] rounded bg-surface" />
      <div className="h-1.5 w-[64%] rounded bg-surface" />
      <div className="h-1.5 w-[74%] rounded bg-surface" />
      <div className="mt-auto inline-flex self-start items-center gap-[5px] rounded-lg bg-gradient-brand px-2.5 py-[5px] text-[10px] font-semibold text-white">
        <UploadIcon width={11} height={11} />
        Uploaded
      </div>
    </div>
  );
}

function ConnectChannelsMock() {
  const rows = [
    { icon: <WhatsAppIcon width={12} height={12} strokeWidth="1.8" />, bg: "var(--color-teal)", label: "WhatsApp" },
    { icon: <EmailIcon width={12} height={12} strokeWidth="1.8" />, bg: "var(--color-coral)", label: "Email" },
    { icon: <WebsiteIcon width={12} height={12} strokeWidth="1.8" />, bg: "var(--color-amber)", label: "Website" },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 rounded-[10px] border border-border bg-white px-[9px] py-[7px]">
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md text-white" style={{ background: r.bg }}>
            {r.icon}
          </span>
          <span className="text-[11px] font-semibold text-text-primary">{r.label}</span>
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
        </div>
      ))}
    </div>
  );
}

function AiDraftsMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-[9px]">
      <div className="max-w-[80%] self-start rounded-[11px] rounded-bl-[3px] bg-surface px-2.5 py-[7px] text-[11px] text-text-secondary">
        Do you deliver on Sundays?
      </div>
      <div
        className="max-w-[88%] self-end rounded-[11px] rounded-br-[3px] border px-2.5 py-[9px]"
        style={{ borderColor: "rgba(30,34,148,.3)", background: "linear-gradient(180deg,rgba(238,240,216,.75),#fff)" }}
      >
        <div className="mb-1.5 inline-flex items-center gap-[5px] rounded-full bg-gradient-brand px-[7px] py-0.5">
          <span className="h-1 w-1 rounded-full bg-white" />
          <span className="text-[8px] font-semibold tracking-[.04em] text-white">DRAFT</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-[5px] w-[5px] animate-rm-dot rounded-full bg-primary" />
          <span className="h-[5px] w-[5px] animate-rm-dot rounded-full bg-violet [animation-delay:.2s]" />
          <span className="h-[5px] w-[5px] animate-rm-dot rounded-full bg-cyan [animation-delay:.4s]" />
        </div>
      </div>
    </div>
  );
}

function ReviewSendMock() {
  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden rounded-xl border border-border bg-white p-[11px]">
      <div className="text-[11px] leading-relaxed text-text-primary">Yes — we deliver every Sunday, 10am–6pm.</div>
      <div className="mt-auto flex gap-1.5">
        <div className="flex flex-1 animate-rm-pulse items-center justify-center gap-[5px] rounded-[9px] bg-primary p-2 text-[11px] font-semibold text-white">
          <SendIcon width={11} height={11} /> Send
        </div>
        <div className="flex items-center justify-center rounded-[9px] border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-text-secondary">
          Edit
        </div>
      </div>
    </div>
  );
}
