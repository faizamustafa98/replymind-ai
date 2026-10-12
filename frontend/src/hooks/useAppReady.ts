"use client";

import { useEffect, useState } from "react";

const MIN_DURATION_MS = 7000;

/**
 * Gates the loading screen: becomes true once fonts + all page resources
 * have finished loading AND a minimum display duration has elapsed. The
 * minimum (~7s) gives the landing page — Hero's layout measurements, images,
 * fonts — time to fully settle behind the splash before it's revealed. The
 * Promise.race below caps the wait at this same bound so a hung
 * font/subresource can never leave the splash up indefinitely.
 */
export function useAppReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const start = Date.now();

    const fontsReady = "fonts" in document ? document.fonts.ready : Promise.resolve();
    const windowLoaded =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));

    // Resource loading is best-effort only: a single external stylesheet/font
    // that hangs (slow or blocked host — Fontshare, Google Fonts) would leave
    // the `load` event permanently unfired, so Promise.all would never resolve
    // and the splash would never dismiss (and, worse, the "seen" flag would
    // never be written, trapping every subsequent refresh too). Racing the
    // wait against MIN_DURATION_MS guarantees `ready` always flips — by which
    // point the fill has finished anyway, so the UX is unchanged on a healthy
    // load and simply no longer hangs on a broken one.
    const settled = Promise.all([fontsReady, windowLoaded]);
    const capped = Promise.race([
      settled,
      new Promise<void>((resolve) => setTimeout(resolve, MIN_DURATION_MS)),
    ]);

    capped.then(() => {
      if (!mounted) return;
      const remaining = Math.max(0, MIN_DURATION_MS - (Date.now() - start));
      setTimeout(() => {
        if (mounted) setReady(true);
      }, remaining);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return ready;
}
