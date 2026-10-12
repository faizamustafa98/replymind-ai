"use client";

import { useEffect, useState } from "react";

/**
 * Mirrors the original component's `this.reduce` check: honors
 * prefers-reduced-motion so every animation hook can skip straight to its
 * settled end state instead of playing.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
