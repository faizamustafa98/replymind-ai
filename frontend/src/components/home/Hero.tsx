"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { JourneyGraphic, JOURNEY_WIDTH } from "./hero/JourneyGraphic";
import { HeroDemoCard } from "./hero/HeroDemoCard";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { ArrowRightIcon } from "@/src/components/icons";

/**
 * Hero header: the "journey" animation and the headline both live inside a
 * single JOURNEY_WIDTH-px-wide block (`innerRef`) that's uniformly scaled
 * down to fit the viewport (`scaleJourney`), exactly like the original
 * `data-hero-inner`.
 * This component owns that scaling effect plus the journey timeline
 * (persona carousel → drawing line → stage cards), since both need direct
 * refs into the same DOM subtree.
 */
export function Hero() {
  const reduced = useReducedMotion();
  const [entered, setEntered] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (reduced) {
      setEntered(true);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  useEffect(() => {
    const header = headerRef.current;
    const inner = innerRef.current;
    const journey = journeyRef.current;
    if (!header || !inner || !journey) return;

    const q = <T extends Element>(sel: string) => journey.querySelectorAll<T>(sel);
    const rows = Array.from(q<HTMLDivElement>("[data-jprow]"));
    const cardEls = Array.from(q<HTMLDivElement>("[data-jcard]"));
    const pillEls = Array.from(q<HTMLDivElement>("[data-jpill]"));
    const cards = [0, 1, 2].map((i) => {
      const c = cardEls[i];
      return { c, ct: c?.querySelector<HTMLDivElement>("[data-jcontent]"), ic: c?.querySelector<HTMLDivElement>("[data-jicon]") };
    });
    const pills = [0, 1, 2].map((i) => {
      const p = pillEls[i];
      return { p, ic: p?.querySelector<HTMLSpanElement>("[data-jpill-ic]"), tx: p?.querySelector<HTMLSpanElement>("[data-jpill-tx]") };
    });
    const track = journey.querySelector<HTMLDivElement>("[data-jpersona-track]");

    let jTimers: ReturnType<typeof setTimeout>[] = [];
    const jt = (fn: () => void, ms: number) => jTimers.push(setTimeout(fn, ms));
    const clearJ = () => { jTimers.forEach(clearTimeout); jTimers = []; };

    function setActivePersona(active: number) {
      if (track) {
        track.style.transition = active === 0 ? "none" : "transform .5s cubic-bezier(.22,1,.36,1)";
        track.style.transform = `translateY(-${active * 40}px)`;
      }
      rows.forEach((el, k) => {
        const on = k === active;
        el.style.opacity = on ? "1" : ".38";
        const dot = el.querySelector<HTMLElement>("[data-javatar]");
        if (dot) dot.style.background = on ? "#1e2294" : "#83837d";
        const title = el.querySelector<HTMLElement>("[data-jp-title]");
        const sub = el.querySelector<HTMLElement>("[data-jp-sub]");
        if (title) title.style.color = on ? "var(--color-text-primary)" : "var(--color-text-muted)";
        if (sub) sub.style.color = on ? "var(--color-text-secondary)" : "var(--color-text-muted)";
      });
    }

    function resetStage(i: number) {
      const { c, ct, ic } = cards[i];
      if (ct) {
        ct.style.transition = "opacity .5s cubic-bezier(.22,1,.36,1),filter .5s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1)";
        ct.style.opacity = "0"; ct.style.filter = "blur(12px)"; ct.style.transform = "translateY(6px)";
      }
      if (ic) { ic.style.transition = "opacity .5s ease"; ic.style.opacity = ".45"; }
      if (c) { c.style.borderColor = "var(--color-border)"; c.style.boxShadow = "none"; }
      const { p, ic: pic, tx } = pills[i];
      if (pic) pic.style.color = "var(--color-text-muted)";
      if (tx) tx.style.color = "var(--color-text-muted)";
      if (p) { p.style.borderColor = "var(--color-border)"; p.style.background = "rgba(255,255,255,.7)"; p.style.boxShadow = "0 1px 2px rgba(0,0,0,.04)"; }
    }

    function activateStage(i: number) {
      const { c, ct, ic } = cards[i];
      if (ic) ic.style.opacity = "0";
      if (ct) { ct.style.opacity = "1"; ct.style.filter = "blur(0px)"; ct.style.transform = "none"; }
      if (c) { c.style.borderColor = "rgba(30,34,148,.5)"; c.style.boxShadow = "0 14px 32px rgba(30,34,148,.13)"; }
      const { p, ic: pic, tx } = pills[i];
      if (pic) pic.style.color = "#1e2294";
      if (tx) tx.style.color = "#1e2294";
      if (p) { p.style.borderColor = "rgba(30,34,148,.4)"; p.style.background = "#fff"; p.style.boxShadow = "0 6px 18px rgba(30,34,148,.16)"; }
    }

    function deactivateStage(i: number) {
      const { c, ct, ic } = cards[i];
      if (ct) { ct.style.transition = "opacity .45s ease,filter .45s ease,transform .45s ease"; ct.style.opacity = "0"; ct.style.filter = "blur(10px)"; ct.style.transform = "translateY(4px)"; }
      if (ic) { ic.style.transition = "opacity .45s ease .1s"; ic.style.opacity = ".45"; }
      if (c) { c.style.transition = "border-color .45s ease,box-shadow .45s ease"; c.style.borderColor = "var(--color-border)"; c.style.boxShadow = "none"; }
      const { p, ic: pic, tx } = pills[i];
      if (pic) pic.style.color = "var(--color-text-muted)";
      if (tx) tx.style.color = "var(--color-text-muted)";
      if (p) { p.style.borderColor = "var(--color-border)"; p.style.background = "rgba(255,255,255,.7)"; p.style.boxShadow = "0 1px 2px rgba(0,0,0,.04)"; }
    }

    let jIdx = 0;
    function jStep() {
      clearJ();
      const i = jIdx;
      const path = lineRef.current;
      if (!path) return;
      setActivePersona(i);
      [0, 1, 2].forEach((k) => resetStage(k));

      const L = path.getTotalLength();
      path.style.transition = "none";
      path.style.strokeDasharray = String(L);
      path.style.strokeDashoffset = String(L);
      path.style.opacity = "1";
      void path.getBoundingClientRect();
      path.style.transition = "stroke-dashoffset 4600ms cubic-bezier(.45,0,.3,1)";
      path.style.strokeDashoffset = "0";

      jt(() => activateStage(0), 1500);
      jt(() => activateStage(1), 2750);
      jt(() => activateStage(2), 4000);

      jt(() => {
        path.style.transition = "stroke-dashoffset 2000ms cubic-bezier(.45,0,.3,1)";
        path.style.strokeDashoffset = String(-L);
        setActivePersona((i + 1) % 3);
      }, 5600);
      jt(() => deactivateStage(2), 5750);
      jt(() => deactivateStage(1), 6550);
      jt(() => deactivateStage(0), 7350);
      jt(() => {
        path.style.transition = "opacity .3s ease";
        path.style.opacity = "0";
        jIdx = (i + 1) % 3;
        jt(() => jStep(), 500);
      }, 7700);
    }

    function scaleJourney() {
      // header/inner are checked non-null once above; nested closures (this
      // function is called from setTimeout/resize listeners) don't retain
      // that narrowing, so re-assert it here.
      const h = header!;
      const inn = inner!;

      // Below lg (<1024px, phones + tablets like iPad): the 1528px journey block
      // can't scale down far enough without shrinking the headline to nothing, so
      // the decorative graphic is hidden (max-lg:hidden) and the headline/CTA flow
      // at natural full width — the headline grows to fill the freed-up space.
      if (window.innerWidth < 1024) {
        inn.style.transform = "none";
        inn.style.marginLeft = "0px";
        inn.style.width = "100%";
        h.style.minHeight = "";
        h.style.paddingTop = "";
        h.style.paddingBottom = "";
        return;
      }
      inn.style.width = JOURNEY_WIDTH + "px";

      const nav = document.querySelector<HTMLElement>("nav");
      const navH = nav ? nav.offsetHeight : 116;
      const topPad = navH + 10;
      const bottomPad = 20;
      h.style.paddingTop = topPad + "px";
      h.style.paddingBottom = bottomPad + "px";

      inn.style.transform = "scale(1)";
      inn.style.marginLeft = "0px";
      const naturalH = inn.offsetHeight;
      const contentWidth = h.clientWidth - 48;
      const availHeight = window.innerHeight - topPad - bottomPad;

      const widthScale = contentWidth / JOURNEY_WIDTH;
      const heightScale = availHeight / naturalH;
      const s = Math.max(0.4, Math.min(1, widthScale, heightScale));

      inn.style.transform = `scale(${s})`;
      const leftover = contentWidth - JOURNEY_WIDTH * s;
      inn.style.marginLeft = Math.max(0, leftover / 2) + "px";
      h.style.minHeight = topPad + naturalH * s + bottomPad + "px";
    }

    if (reduced) {
      setActivePersona(0);
      const path = lineRef.current;
      if (path) { path.style.opacity = "1"; path.style.strokeDasharray = "none"; path.style.strokeDashoffset = "0"; }
      [0, 1, 2].forEach((i) => activateStage(i));
    } else {
      jStep();
    }

    scaleJourney();
    const raf = requestAnimationFrame(scaleJourney);
    const timeout = setTimeout(scaleJourney, 350);
    window.addEventListener("resize", scaleJourney, { passive: true });

    return () => {
      clearJ();
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
      window.removeEventListener("resize", scaleJourney);
    };
  }, [reduced]);

  const introStyle = (i: number): React.CSSProperties => ({
    opacity: entered ? 1 : 0,
    transform: entered ? "none" : "translateY(26px)",
    transition: reduced
      ? undefined
      : `opacity .56s cubic-bezier(.22,1,.36,1) ${120 + i * 90}ms, transform .56s cubic-bezier(.22,1,.36,1) ${120 + i * 90}ms`,
  });

  return (
    <header
      id="top"
      ref={headerRef}
      className="relative flex min-h-screen flex-col justify-start overflow-visible bg-bg px-6 max-lg:pt-28"
    >
      <div ref={innerRef} style={{ width: JOURNEY_WIDTH, maxWidth: "none", margin: 0, transformOrigin: "top left" }}>
        <div ref={journeyRef} className="max-lg:hidden">
          <JourneyGraphic lineRef={lineRef} />
        </div>

        <div style={{ marginTop: 26 }} className="flex items-center justify-between gap-10">
          <div className="translate-x-[20px]">
            <h1
              data-jhead
              style={introStyle(0)}
              className="m-0 max-w-[680px] font-display text-[58px] font-semibold leading-[1.04] tracking-[-.03em] text-text-primary"
            >
              Replies that
              <br />
              <span className="bg-gradient-brand bg-clip-text text-transparent">write themselves.</span>
            </h1>
            <p
              style={introStyle(1)}
              className="mt-[22px] max-w-[560px] text-lg leading-relaxed text-text-secondary"
            >
              ReplyMind connects to your business email inbox, reads incoming customer messages,
              and drafts a grounded reply the moment one lands — you approve it, or let it send
              automatically once you trust it.
            </p>
            <div style={introStyle(2)} className="mt-7 flex flex-wrap gap-3.5">
              <Link
                href="/register"
                className="inline-flex items-center rounded-[14px] bg-gradient-brand px-[26px] py-[15px] text-base font-semibold text-white no-underline shadow-[0_20px_50px_rgba(30,34,148,.28)] transition-transform hover:-translate-y-px"
              >
                Start Free
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-[14px] border border-border bg-white/60 px-[22px] py-[15px] text-base font-semibold text-text-primary no-underline transition-colors hover:border-primary hover:text-primary"
              >
                See it in action
                <ArrowRightIcon width={18} height={18} strokeWidth="1.8" />
              </a>
            </div>
          </div>

          <div style={introStyle(3)} className="max-xl:hidden">
            <HeroDemoCard />
          </div>
        </div>
      </div>
    </header>
  );
}
