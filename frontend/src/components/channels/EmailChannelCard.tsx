"use client";
import { useEffect, useState } from "react";
import {
  disconnectEmailAccount,
  fetchEmailConnectionStatus,
  getGmailConnectUrl,
  type EmailConnectionStatus,
} from "@/src/lib/api/email";

export default function EmailChannelCard() {
  const [status, setStatus] = useState<EmailConnectionStatus>({ status: "disconnected", connected_at: null, email: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Runs on every mount, including the hard navigation back from Google's
  // OAuth consent screen — no special handling needed for that redirect.
  useEffect(() => {
    fetchEmailConnectionStatus()
      .then(setStatus)
      .catch((err) => setError(err.message ?? "Failed to load email connection status."))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    setBusy(true);
    setError("");
    try {
      window.location.href = await getGmailConnectUrl();
    } catch (err: any) {
      setError(err.message ?? "Failed to start Gmail connection.");
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError("");
    try {
      setStatus(await disconnectEmailAccount());
    } catch (err: any) {
      setError(err.message ?? "Failed to disconnect email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-card p-6 flex flex-col gap-4 !rounded-2xl hover:!translate-y-0">
      <div>
        <h3 className="text-base font-medium text-text-primary">Email</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Connect Gmail so customer messages land in your inbox and replies go out from your real address.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted">Checking connection…</p>
      ) : status.status === "connected" ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <span>
              Connected — <span className="font-medium">{status.email}</span>
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
          {status.status === "error" && (
            <p className="text-xs text-error">Gmail access expired or was revoked — reconnect to keep replies going out.</p>
          )}
          <button
            onClick={handleConnect}
            disabled={busy}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 w-fit"
          >
            <span className="material-symbols-outlined text-[18px]">mail</span>
            {busy ? "Redirecting…" : "Connect Gmail"}
          </button>
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
