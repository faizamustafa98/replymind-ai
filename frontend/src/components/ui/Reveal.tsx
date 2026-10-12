"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms — matches the original `data-delay` attribute (e.g. pricing cards use 0/70/140). */
  delay?: number;
  className?: string;
  as?: "div" | "p";
}

/**
 * Per-element scroll reveal: fades + slides up 16px the first time it enters
 * the viewport, then stops observing. Reimplements the original's single
 * global `[data-reveal]` IntersectionObserver as a self-contained component
 * so each section owns its own reveal behavior.
 */
export function Reveal({ children, delay = 0, className, as = "div" }: RevealProps) {
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
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const Tag = as;
  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(16px)",
        transition: `opacity .5s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .5s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}
