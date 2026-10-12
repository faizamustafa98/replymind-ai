import { WhatsAppIcon, EmailIcon, WebsiteIcon, SendIcon } from "@/src/components/icons";

/**
 * Static glass "AI is drafting" snapshot that fills the empty right side of
 * the hero row, beside the headline. Unlike the animated journey timeline
 * above it (JourneyGraphic) or the full cycling demo further down the page
 * (LiveDemo), this one is a single frozen moment — no timers, no phases —
 * so it reads instantly instead of asking the visitor to wait for a cycle.
 */
export function HeroDemoCard() {
  return (
    <div className="relative w-[440px] flex-none">
      <FloatBadge className="left-[-40vh] top-[-14px] animate-rm-floatA" icon={<WhatsAppIcon width={14} height={14} strokeWidth="1.8" />} label="WhatsApp" />
      <FloatBadge className="right-3.5 top-[-12px] animate-rm-floatB -translate-x-60" icon={<EmailIcon width={14} height={14} strokeWidth="1.8" />} label="Email" />
      <FloatBadge className="bottom-[-10px] right-[-14px] animate-rm-floatC -translate-x-60" icon={<WebsiteIcon width={14} height={14} strokeWidth="1.8" />} label="Website" />

      <div className="relative overflow-hidden rounded-[28px] border border-border-glass bg-white/[.55] p-5 -translate-x-75 shadow-[0_24px_60px_rgba(30,34,148,.16)] backdrop-blur-[20px] backdrop-saturate-[1.6]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent"
        />

        <div className="relative flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gradient-brand" />
            <span className="text-[13px] font-semibold text-text-primary">AI Assistant</span>
          </div>
          <span className="text-[11px] font-medium text-text-muted">Drafting now</span>
        </div>

        <div className="relative flex items-start gap-2.5 rounded-[14px] border border-border bg-white p-3">
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-primary-light text-primary">
            <WhatsAppIcon width={15} height={15} strokeWidth="1.8" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-text-primary">Amina R. · WhatsApp</div>
            <div className="mt-0.5 text-[13px] text-text-secondary">&ldquo;Do you deliver on Sundays?&rdquo;</div>
          </div>
        </div>

        <div
          className="relative ml-10 mt-2.5 rounded-[14px] border p-3.5"
          style={{ borderColor: "rgba(30,34,148,.28)", background: "linear-gradient(180deg,rgba(238,240,216,.7),rgba(255,255,255,.9))" }}
        >
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-2.5 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span className="text-[10px] font-semibold tracking-[.03em] text-white">Draft · grounded in your docs</span>
          </div>
          <div className="text-[13px] leading-[1.55] text-text-primary">
            Yes — we deliver every Sunday, 10am–6pm. Orders placed before 4pm arrive the same day.
          </div>
        </div>

        <div className="relative ml-10 mt-3 flex gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-teal px-3.5 py-2 text-xs font-semibold text-white">
            <SendIcon width={13} height={13} /> Send
          </button>
          <button className="rounded-[10px] border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text-primary">
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function FloatBadge({ className, icon, label }: { className: string; icon: React.ReactNode; label: string }) {
  return (
    <div
      className={`absolute z-[3] inline-flex items-center gap-[7px] rounded-full border border-border bg-white px-[13px] py-[7px] shadow-[0_8px_24px_rgba(14,19,32,.10)] ${className}`}
    >
      <span className="inline-flex text-primary">{icon}</span>
      <span className="text-xs font-semibold text-text-primary">{label}</span>
    </div>
  );
}
