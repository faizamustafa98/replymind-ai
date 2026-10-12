"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/src/lib/actions/auth";
import { useTenantStore } from "@/src/store/useTenantStore";
import {
  connectWhatsApp,
  disconnectWhatsApp,
  fetchWhatsAppStatus,
} from "@/src/lib/api/tenant";
import {
  fetchEmailConnectionStatus,
  disconnectEmailAccount,
  getGmailConnectUrl,
  type EmailConnectionStatus,
} from "@/src/lib/api/email";
import { createClient } from "@/src/lib/supabase/client";
import { initialsAvatar } from "@/src/lib/utils/avatar";

const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "clothing", label: "Clothing" },
  { value: "clinic", label: "Clinic" },
  { value: "salon", label: "Salon" },
  { value: "freelancer", label: "Freelancer" },
  { value: "retail", label: "Retail" },
  { value: "gym", label: "Gym" },
  { value: "real_estate", label: "Real Estate" },
  { value: "law_firm", label: "Law Firm" },
  { value: "school", label: "School" },
  { value: "hotel", label: "Hotel" },
  { value: "other", label: "Other" },
];

const PERSONAS = [
  { value: "professional", label: "Professional", desc: "Formal, precise, business-focused" },
  { value: "casual", label: "Casual", desc: "Relaxed, conversational" },
  { value: "friendly", label: "Friendly", desc: "Warm, approachable, upbeat" },
];

const PLAN_LABELS: Record<string, string> = { free: "Free", pro: "Pro", enterprise: "Enterprise" };
const PLAN_COLORS: Record<string, string> = {
  free: "bg-surface-container-high text-on-surface-variant",
  pro: "bg-primary-container/30 text-primary",
  enterprise: "bg-secondary-container text-on-secondary-container",
};

function SegmentedGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className={`grid gap-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant/40`} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)} className={`py-2 px-2 rounded-lg text-xs font-medium transition-all text-center ${value === opt.value ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${checked ? "bg-primary" : "bg-surface-container-highest"}`}>
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function SectionCard({ title, description, children }: { title: React.ReactNode; description?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6 flex flex-col gap-5 !rounded-2xl hover:!translate-y-0">
      <div>
        <h3 className="text-base font-medium text-on-surface">{title}</h3>
        {description && <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em] mb-1.5">{children}</label>;
}

const inputCls = "w-full rounded-xl border border-outline-variant/50 bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary px-3 py-2.5 transition-all";

function SaveButton({ saved, saving = false, disabled = false, onClick }: { saved: boolean; saving?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end pt-1">
      <button onClick={onClick} disabled={saving || disabled} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20 disabled:opacity-50">
        {saved ? (<><span className="material-symbols-outlined text-[16px]">check</span> Saved</>) : saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function useSaved() {
  const [saved, setSaved] = useState(false);
  const trigger = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return [saved, trigger] as const;
}

export default function ProfilePage() {
  const router = useRouter();
  const tenant = useTenantStore();

  const [biz, setBiz] = useState({ business_name: "", business_type: "" });
  const [ai, setAi] = useState({ bot_persona: "professional" });
  const [conf, setConf] = useState({ enabled: true, draft_frequency: "average", auto_reply_enabled: true, auto_send_threshold: "safe" });
  const [autoReplyError, setAutoReplyError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const [coreBiz, setCoreBiz] = useState({ operating_hours: "", location: "", delivery_options: "" });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [emailStatus, setEmailStatus] = useState<EmailConnectionStatus>({ status: "disconnected", connected_at: null, email: null });
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [waStatus, setWaStatus] = useState<{ status: "connected" | "disconnected"; phone_number: string | null; connected_at: string | null }>({ status: "disconnected", phone_number: null, connected_at: null });
  const [waLoading, setWaLoading] = useState(true);
  const [waBusy, setWaBusy] = useState(false);
  const [waError, setWaError] = useState("");
  const [waPhoneInput, setWaPhoneInput] = useState("");
  const [showWaInput, setShowWaInput] = useState(false);

  const [coreSaved, triggerCoreSave] = useSaved();
  const [bizSaved, triggerBizSave] = useSaved();
  const [aiSaved, triggerAiSave] = useSaved();
  const [confSaved, triggerConfSave] = useSaved();

  useEffect(() => {
    tenant.fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tenant.loaded) {
      setBiz({ business_name: tenant.businessName, business_type: tenant.businessType });
      setAi({ bot_persona: tenant.botPersona });
      setCoreBiz({
        operating_hours: tenant.businessProfile.operatingHours,
        location: tenant.businessProfile.location,
        delivery_options: tenant.businessProfile.deliveryOptions,
      });
    }
  }, [tenant.loaded, tenant.businessName, tenant.businessType, tenant.botPersona, tenant.businessProfile]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const url = session?.user?.user_metadata?.avatar_url;
      if (url) setAvatarUrl(url);
    });
  }, []);

  useEffect(() => {
    fetchEmailConnectionStatus()
      .then(setEmailStatus)
      .catch((err) => setEmailError(err.message))
      .finally(() => setEmailLoading(false));
  }, []);

  useEffect(() => {
    fetchWhatsAppStatus()
      .then(setWaStatus)
      .catch((err) => setWaError(err.message))
      .finally(() => setWaLoading(false));
  }, []);

  const handleBizSave = async () => {
    try {
      await tenant.saveBizDetails(biz.business_name, biz.business_type);
      triggerBizSave();
    } catch (err: any) {
      /* store handles error state */
    }
  };

  const handleCoreSave = async () => {
    try {
      await tenant.saveCoreInfo(coreBiz);
      triggerCoreSave();
    } catch (err: any) {
      /* store handles error state */
    }
  };

  const handleConfidenceToggle = (v: boolean) => {
    setAutoReplyError("");
    setConf({ ...conf, enabled: v, auto_reply_enabled: v });
  };

  const handleAutoReplyToggle = (v: boolean) => {
    if (!conf.enabled) {
      setAutoReplyError("Auto-reply can't be turned on while Confidence & Autonomy is off — the AI needs drafting enabled to send replies. Turn the toggle above on first.");
      return;
    }
    setAutoReplyError("");
    setConf({ ...conf, auto_reply_enabled: v });
  };

  const handleEmailConnect = async () => {
    setEmailBusy(true);
    setEmailError("");
    try {
      window.location.href = await getGmailConnectUrl();
    } catch (err: any) {
      setEmailError(err.message ?? "Failed to start Gmail connection.");
      setEmailBusy(false);
    }
  };

  const handleEmailDisconnect = async () => {
    setEmailBusy(true);
    setEmailError("");
    try {
      setEmailStatus(await disconnectEmailAccount());
    } catch (err: any) {
      setEmailError(err.message ?? "Failed to disconnect email.");
    } finally {
      setEmailBusy(false);
    }
  };

  const handleWaConnect = async () => {
    if (!waPhoneInput.trim()) return;
    setWaBusy(true);
    setWaError("");
    try {
      await connectWhatsApp(waPhoneInput.trim());
      setWaStatus({ status: "connected", phone_number: waPhoneInput.trim(), connected_at: new Date().toISOString() });
      setShowWaInput(false);
      setWaPhoneInput("");
    } catch (err: any) {
      setWaError(err.message ?? "Failed to connect WhatsApp.");
    } finally {
      setWaBusy(false);
    }
  };

  const handleWaDisconnect = async () => {
    setWaBusy(true);
    setWaError("");
    try {
      await disconnectWhatsApp();
      setWaStatus({ status: "disconnected", phone_number: null, connected_at: null });
    } catch (err: any) {
      setWaError(err.message ?? "Failed to disconnect WhatsApp.");
    } finally {
      setWaBusy(false);
    }
  };

  const fallbackAvatar = initialsAvatar(tenant.businessName || "U");

  return (
    <div className="overflow-y-auto flex-1 px-gutter md:px-xl pb-gutter md:pb-xl pt-lg custom-scrollbar">
      <div className="max-w-2xl mx-auto flex flex-col gap-lg">
        {/* Page heading + avatar */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-primary-fixed overflow-hidden shadow-md bg-surface-container-high">
              {avatarUrl ? (
                <img alt="Profile" className="w-full h-full object-cover" src={avatarUrl} />
              ) : (
                <img alt="Profile" className="w-full h-full object-cover" src={fallbackAvatar} />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-medium text-on-surface leading-tight truncate">
              {tenant.businessName || "Loading…"}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${PLAN_COLORS[tenant.planTier] ?? PLAN_COLORS.free}`}>
                {PLAN_LABELS[tenant.planTier] ?? "Free"}
              </span>
              {tenant.createdAt && (
                <span className="text-xs text-on-surface-variant/60">
                  Member since {new Date(tenant.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
          <button type="button" disabled={loggingOut} onClick={async () => { setLoggingOut(true); await signOut(); router.push("/"); }} className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border border-outline-variant/50 text-sm font-medium text-on-surface-variant hover:border-error hover:text-error hover:bg-error-container/40 active:scale-95 transition-all disabled:opacity-60">
            <span className={`material-symbols-outlined text-[18px] ${loggingOut ? "animate-spin" : ""}`}>{loggingOut ? "progress_activity" : "logout"}</span>
            <span className="hidden sm:inline">{loggingOut ? "Logging out…" : "Log out"}</span>
          </button>
        </div>

        {tenant.error && (
          <div className="flex items-start gap-2 rounded-xl bg-error-container px-4 py-3 text-sm text-error">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span className="min-w-0">{tenant.error}</span>
          </div>
        )}

        {/* ── Business Details ── */}
        <SectionCard title="Business Details" description="Your public-facing business information.">
          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel>Business Name</FieldLabel>
              <input type="text" className={inputCls} value={biz.business_name} onChange={(e) => setBiz({ ...biz, business_name: e.target.value })} placeholder="Your business name" />
            </div>
            <div>
              <FieldLabel>Business Type</FieldLabel>
              <select className={inputCls} value={biz.business_type} onChange={(e) => setBiz({ ...biz, business_type: e.target.value })}>
                {BUSINESS_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
            </div>
          </div>
          <SaveButton saved={bizSaved} onClick={handleBizSave} />
        </SectionCard>

        {/* ── Core Business Information ── */}
        <SectionCard title="Core Business Information" description="Static details the AI references instantly — shared with your Knowledge Base and collected during onboarding.">
          <div className="flex flex-col gap-4">
            <div>
              <FieldLabel>Operating Hours</FieldLabel>
              <textarea rows={2} disabled={tenant.loading} className={`${inputCls} resize-none disabled:opacity-50`} value={coreBiz.operating_hours} onChange={(e) => setCoreBiz({ ...coreBiz, operating_hours: e.target.value })} placeholder="e.g. Mon–Fri: 9 AM – 6 PM" />
            </div>
            <div>
              <FieldLabel>Business Location</FieldLabel>
              <input type="text" disabled={tenant.loading} className={`${inputCls} disabled:opacity-50`} value={coreBiz.location} onChange={(e) => setCoreBiz({ ...coreBiz, location: e.target.value })} placeholder="e.g. 123 Main Street, Lahore" />
            </div>
            <div>
              <FieldLabel>Delivery Options &amp; Rates</FieldLabel>
              <textarea rows={2} disabled={tenant.loading} className={`${inputCls} resize-none disabled:opacity-50`} value={coreBiz.delivery_options} onChange={(e) => setCoreBiz({ ...coreBiz, delivery_options: e.target.value })} placeholder="e.g. Free delivery on orders over $50" />
            </div>
          </div>
          <SaveButton saved={coreSaved} saving={tenant.loading} disabled={tenant.loading} onClick={handleCoreSave} />
        </SectionCard>

        {/* ── AI Configuration ── */}
        <SectionCard title="AI Configuration" description="Control how the AI behaves when replying on your behalf.">
          <div className="flex flex-col gap-5">
            <div>
              <FieldLabel>Bot Persona</FieldLabel>
              <div className="flex flex-col gap-2">
                {PERSONAS.map((p) => (
                  <label key={p.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${ai.bot_persona === p.value ? "border-primary bg-primary/5" : "border-outline-variant/40 hover:bg-surface-container-low"}`}>
                    <input type="radio" name="bot_persona" value={p.value} checked={ai.bot_persona === p.value} onChange={() => setAi({ ...ai, bot_persona: p.value })} className="accent-primary" />
                    <div>
                      <p className={`text-sm font-medium ${ai.bot_persona === p.value ? "text-primary" : "text-on-surface"}`}>{p.label}</p>
                      <p className="text-xs text-on-surface-variant">{p.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <SaveButton saved={aiSaved} onClick={triggerAiSave} />
        </SectionCard>

        {/* ── Confidence & Autonomy ── */}
        <SectionCard title={<span className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[20px]">tune</span>Confidence &amp; Autonomy</span>} description="Control how often the AI drafts answers and when it can send them automatically.">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-on-surface mb-0.5">Enable AI Drafting</p>
                <p className="text-xs text-on-surface-variant">Let the AI read your knowledge documents and draft answers. Turning this off also disables Auto-Reply.</p>
              </div>
              <Toggle checked={conf.enabled} onChange={handleConfidenceToggle} />
            </div>
            {conf.enabled && (
              <div className="flex flex-col gap-3 pl-4 border-l-2 border-primary-fixed-dim">
                <div>
                  <p className="text-sm font-medium text-on-surface mb-0.5">How often should the AI draft an answer?</p>
                  <p className="text-xs text-on-surface-variant">Choose how active the AI should be when reading your uploaded knowledge documents.</p>
                </div>
                <SegmentedGroup options={[{ value: "most", label: "Most of them" }, { value: "average", label: "Average amount" }, { value: "less", label: "Very less" }]} value={conf.draft_frequency} onChange={(v) => setConf({ ...conf, draft_frequency: v })} />
              </div>
            )}
            <div className="h-px bg-outline-variant/40 w-full" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-on-surface mb-0.5">Auto-Reply</p>
                <p className="text-xs text-on-surface-variant">Allow the AI to automatically send responses without manual review when confidence is high.</p>
              </div>
              <Toggle checked={conf.auto_reply_enabled} onChange={handleAutoReplyToggle} />
            </div>
            {autoReplyError && (
              <div className="flex items-start gap-2 rounded-xl bg-error-container/60 px-4 py-3 text-xs text-error animate-rm-slidein">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                {autoReplyError}
              </div>
            )}
            {conf.auto_reply_enabled && (
              <div className="flex flex-col gap-3 pl-4 border-l-2 border-primary-fixed-dim">
                <div>
                  <p className="text-sm font-medium text-on-surface mb-0.5">When should the AI automatically send without your review?</p>
                  <p className="text-xs text-on-surface-variant">Control the strictness of automatic messaging when confidence is high.</p>
                </div>
                <SegmentedGroup options={[{ value: "everything", label: "Send everything" }, { value: "safe", label: "Send mostly safe replies" }, { value: "exact", label: "Only send exact matches" }]} value={conf.auto_send_threshold} onChange={(v) => setConf({ ...conf, auto_send_threshold: v })} />
              </div>
            )}
          </div>
          <SaveButton saved={confSaved} onClick={triggerConfSave} />
        </SectionCard>

        {/* ── Channel Connections ── */}
        <SectionCard title="Channel Connections" description="Manage the platforms where your customers message you.">
          <div className="flex flex-col gap-3">
            {/* Email */}
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${emailStatus.status === "connected" ? "border-primary/30 bg-primary/5" : "border-outline-variant/40 bg-surface-container-low"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${emailStatus.status === "connected" ? "bg-primary/10" : "bg-surface-container-high"}`}>
                <span className={`material-symbols-outlined text-[22px] ${emailStatus.status === "connected" ? "text-primary" : "text-on-surface-variant"}`}>mail</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface">Email</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {emailLoading ? "Checking…" : emailStatus.status === "connected" ? emailStatus.email ?? "Connected" : "Not connected"}
                </p>
                {emailStatus.status === "connected" && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>circle</span>
                    Connected
                  </span>
                )}
              </div>
              {emailStatus.status === "connected" ? (
                <button onClick={handleEmailDisconnect} disabled={emailBusy} className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container hover:text-error transition-all disabled:opacity-50">
                  {emailBusy ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : (
                <button onClick={handleEmailConnect} disabled={emailBusy} className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-50">
                  {emailBusy ? "Redirecting…" : "Connect"}
                </button>
              )}
            </div>
            {emailError && (
              <div className="ml-14 flex items-start gap-2 rounded-xl bg-error-container/60 px-3 py-2 text-xs text-error">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                {emailError}
              </div>
            )}

            {/* WhatsApp */}
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${waStatus.status === "connected" ? "border-primary/30 bg-primary/5" : "border-outline-variant/40 bg-surface-container-low"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${waStatus.status === "connected" ? "bg-primary/10" : "bg-surface-container-high"}`}>
                <span className={`material-symbols-outlined text-[22px] ${waStatus.status === "connected" ? "text-primary" : "text-on-surface-variant"}`}>chat</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface">WhatsApp</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {waLoading ? "Checking…" : waStatus.status === "connected" ? waStatus.phone_number ?? "Connected" : "Not connected"}
                </p>
                {waStatus.status === "connected" && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>circle</span>
                    Connected
                  </span>
                )}
              </div>
              {waStatus.status === "connected" ? (
                <button onClick={handleWaDisconnect} disabled={waBusy} className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container hover:text-error transition-all disabled:opacity-50">
                  {waBusy ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : (
                <button onClick={() => setShowWaInput(!showWaInput)} disabled={waBusy} className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-50">
                  Connect
                </button>
              )}
            </div>

            {showWaInput && waStatus.status === "disconnected" && (
              <div className="ml-14 flex flex-col gap-2 pl-4 border-l-2 border-primary-fixed-dim">
                <div>
                  <FieldLabel>Phone Number</FieldLabel>
                  <div className="flex gap-2">
                    <input type="tel" className={inputCls} value={waPhoneInput} onChange={(e) => setWaPhoneInput(e.target.value)} placeholder="+1 234 567 8901" />
                    <button onClick={handleWaConnect} disabled={waBusy || !waPhoneInput.trim()} className="shrink-0 text-xs font-medium px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-all disabled:opacity-50">
                      {waBusy ? "Connecting…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {waError && (
              <div className="ml-14 flex items-start gap-2 rounded-xl bg-error-container/60 px-3 py-2 text-xs text-error">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                {waError}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Account Status (read-only) ── */}
        <SectionCard title="Account Status" description="Read-only overview of your account setup.">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Onboarding", done: tenant.loaded },
              { label: "Profile", done: tenant.loaded && !!tenant.businessName },
              { label: "Documents", done: tenant.loaded },
            ].map(({ label, done }) => (
              <div key={label} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border ${done ? "border-primary/20 bg-primary/5" : "border-outline-variant/30 bg-surface-container-low"}`}>
                <span className={`material-symbols-outlined text-[22px] ${done ? "text-primary" : "text-on-surface-variant/40"}`} style={{ fontVariationSettings: "'FILL' 1" }}>{done ? "check_circle" : "radio_button_unchecked"}</span>
                <p className={`text-xs font-medium ${done ? "text-primary" : "text-on-surface-variant/50"}`}>{label}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="pb-xl" />
      </div>
    </div>
  );
}
