"use client";

import { useEffect, useState } from "react";

/** True once the page has scrolled past 40px — drives the navbar's blur/border state. */
export function useScrollNav(): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrolled;
}
