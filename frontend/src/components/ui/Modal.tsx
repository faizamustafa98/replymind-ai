"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const MODAL_WIDTHS = {
  sm: "28rem",
  md: "34rem",
  lg: "42rem",
};

// Shared modal shell. Portals to <body> so `fixed` positioning can never be
// trapped by a transformed / filtered ancestor (glass-card, animations), which
// previously squeezed dialogs and broke their alignment.
export default function Modal({
  onClose,
  size = "md",
  children,
}: {
  onClose: () => void;
  size?: keyof typeof MODAL_WIDTHS;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `min(calc(100vw - 2rem), ${MODAL_WIDTHS[size]})`,
          maxHeight: "calc(100dvh - 2rem)",
        }}
        className="rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-2xl overflow-y-auto custom-scrollbar animate-rm-slidein"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
