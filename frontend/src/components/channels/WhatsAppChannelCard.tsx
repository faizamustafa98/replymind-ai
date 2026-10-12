"use client";
import { useEffect, useState } from "react";
import {
  connectWhatsApp,
  disconnectWhatsApp,
  fetchWhatsAppStatus,
} from "@/src/lib/api/tenant";

export default function WhatsAppChannelCard() {
  const [status, setStatus] = useState<"connected" | "disconnected">("disconnected");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    fetchWhatsAppStatus()
      .then((s) => {
        setStatus(s.status);
        setPhoneNumber(s.phone_number);
      })
      .catch((err) => setError(err.message ?? "Failed to load WhatsApp status."))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    if (!phoneInput.trim()) return;
    setBusy(true);
    setError("");
    try {
      await connectWhatsApp(phoneInput.trim());
      setStatus("connected");
      setPhoneNumber(phoneInput.trim());
      setShowInput(false);
      setPhoneInput("");
    } catch (err: any) {
      setError(err.message ?? "Failed to connect WhatsApp.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError("");
    try {
      await disconnectWhatsApp();
      setStatus("disconnected");
      setPhoneNumber(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to disconnect WhatsApp.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-card p-6 flex flex-col gap-4 !rounded-2xl hover:!translate-y-0">
      <div>
        <h3 className="text-base font-medium text-text-primary">WhatsApp</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Connect a WhatsApp Business number so customers can message you directly.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Checking connection…</p>
      ) : status === "connected" ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <span>
              Connected — <span className="font-medium">{phoneNumber}</span>
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="text-sm text-error hover:underline disabled:opacity-50 shrink-0"
          >
            {busy ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {showInput ? (
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+1 234 567 8901"
                className="flex-1 rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2.5 transition-all"
              />
              <button
                onClick={handleConnect}
                disabled={busy || !phoneInput.trim()}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
              >
                {busy ? "Connecting…" : "Save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              disabled={busy}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 w-fit"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              Connect WhatsApp
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-error-container/60 px-3 py-2 text-xs text-error">
          <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
          {error}
        </div>
      )}
    </section>
  );
}
