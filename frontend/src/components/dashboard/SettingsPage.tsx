"use client";

import { useState } from "react";
import EmailChannelCard from "@/src/components/channels/EmailChannelCard";
import WhatsAppChannelCard from "@/src/components/channels/WhatsAppChannelCard";

const DRAFT_OPTIONS = [
  { value: "most", label: "Most of them" },
  { value: "average", label: "Average amount" },
  { value: "less", label: "Very less" },
];

const AUTO_SEND_OPTIONS = [
  { value: "everything", label: "Send everything" },
  { value: "safe", label: "Send mostly safe replies" },
  { value: "exact", label: "Only send exact matches" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${checked ? "bg-primary" : "bg-surface-container-highest"}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const [lang, setLang] = useState("en");
  const [drafting, setDrafting] = useState(true);
  const [draftFreq, setDraftFreq] = useState("average");
  const [autoReply, setAutoReply] = useState(true);
  const [autoSend, setAutoSend] = useState("safe");
  const [autoReplyError, setAutoReplyError] = useState("");
  const [saved, setSaved] = useState(false);

  // Drafting drives auto-reply: off turns auto-reply off, on brings it back.
  const handleDraftingToggle = (v: boolean) => {
    setAutoReplyError("");
    setDrafting(v);
    setAutoReply(v);
  };

  const handleAutoReplyToggle = (v: boolean) => {
    if (!drafting) {
      setAutoReplyError(
        "Auto-reply can't be turned on while AI drafting is off — enable drafting above first."
      );
      return;
    }
    setAutoReplyError("");
    setAutoReply(v);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="overflow-y-auto flex-1 px-6 md:px-10 pb-6 md:pb-10 pt-6 custom-scrollbar">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-medium text-text-primary">Settings</h2>
          <p className="text-sm text-text-secondary mt-1">
            Configure how the AI responds across your channels.
          </p>
        </div>

        {/* Language & Region */}
        <section className="glass-card p-6 flex flex-col gap-5 !rounded-2xl hover:!translate-y-0">
          <div>
            <h3 className="text-base font-medium text-text-primary">Language & Region</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Set the primary language the AI uses when replying.
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-secondary uppercase tracking-[0.06em] mb-1.5">
              Primary Language
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2.5 transition-all"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Drafting Behavior */}
        <section className="glass-card p-6 flex flex-col gap-5 !rounded-2xl hover:!translate-y-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-medium text-text-primary">Drafting Behavior</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Control how often the AI generates reply drafts. Turning drafting off also disables Auto-Reply.
              </p>
            </div>
            <Toggle checked={drafting} onChange={handleDraftingToggle} />
          </div>
          {drafting && (
            <div className="grid gap-2 p-1 bg-surface rounded-xl border border-border"
              style={{ gridTemplateColumns: `repeat(${DRAFT_OPTIONS.length}, 1fr)` }}
            >
              {DRAFT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraftFreq(opt.value)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-all text-center ${
                    draftFreq === opt.value
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white border border-border/30 text-text-secondary hover:bg-surface"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Channels */}
        <EmailChannelCard />
        <WhatsAppChannelCard />

        {/* Auto-Reply */}
        <section className="glass-card p-6 flex flex-col gap-5 !rounded-2xl hover:!translate-y-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-medium text-text-primary">Auto-Reply</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Allow the AI to automatically send responses when confidence is high.
              </p>
            </div>
            <Toggle checked={autoReply} onChange={handleAutoReplyToggle} />
          </div>

          {autoReplyError && (
            <div className="flex items-start gap-2 rounded-xl bg-error-container/60 px-4 py-3 text-xs text-error">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              {autoReplyError}
            </div>
          )}

          {autoReply && (
            <div className="flex flex-col gap-3 pl-4 border-l-2 border-primary/20">
              <p className="text-sm font-medium text-text-primary">
                When should the AI send without review?
              </p>
              <div className="grid gap-2 p-1 bg-surface rounded-xl border border-border"
                style={{ gridTemplateColumns: `repeat(${AUTO_SEND_OPTIONS.length}, 1fr)` }}
              >
                {AUTO_SEND_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAutoSend(opt.value)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-all text-center ${
                      autoSend === opt.value
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white border border-border/30 text-text-secondary hover:bg-surface"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Save */}
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
          >
            {saved ? (
              <>
                <span className="material-symbols-outlined text-[16px]">check</span> Saved
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
}
