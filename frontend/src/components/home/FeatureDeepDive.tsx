import { Reveal } from "@/src/components/ui/Reveal";
import { WhatsAppIcon, EmailIcon, WebsiteIcon, SendIcon } from "@/src/components/icons";

const inboxRows = [
  { icon: <WhatsAppIcon width={14} height={14} strokeWidth="1.8" />, bg: "var(--color-teal)", name: "Amina · WhatsApp", preview: "Do you deliver on Sundays?", time: "2m" },
  { icon: <EmailIcon width={14} height={14} strokeWidth="1.8" />, bg: "var(--color-coral)", name: "Bilal · Email", preview: "Price for screen repair?", time: "6m" },
  { icon: <WebsiteIcon width={14} height={14} strokeWidth="1.8" />, bg: "var(--color-amber)", name: "Website visitor", preview: "Are you open right now?", time: "just now" },
];

export function FeatureDeepDive() {
  return (
    <section className="bg-surface px-6 py-24">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-[72px]">
        {/* Row A — Unified Inbox */}
        <div className="grid items-center gap-14 max-[900px]:grid-cols-1 min-[901px]:grid-cols-2">
          <Reveal className="relative overflow-hidden rounded-[28px] border border-border bg-white p-[18px] shadow-[0_20px_50px_rgba(14,19,32,.08)]">
            <div className="flex flex-col gap-2.5">
              {inboxRows.map((row) => (
                <div key={row.name} className="flex items-center gap-2.5 rounded-[14px] bg-surface p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: row.bg }}>
                    {row.icon}
                  </span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold">{row.name}</div>
                    <div className="text-xs text-text-secondary">{row.preview}</div>
                  </div>
                  <span className="text-[10px] text-text-muted">{row.time}</span>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-white/90 backdrop-blur-[2px]" />
          </Reveal>
          <Reveal>
            <span className="text-xs font-medium uppercase tracking-[.08em] text-coral">Unified Inbox</span>
            <h3 className="my-3 font-display text-[30px] font-semibold leading-[1.2] text-ink">
              One inbox for all your channels
            </h3>
            <p className="m-0 text-base leading-[1.65] text-text-secondary">
              WhatsApp messages, emails, and website chats all land in the same list, sorted by time.
              No tabs. No juggling apps.
            </p>
          </Reveal>
        </div>

        {/* Row B — AI Drafts */}
        <div className="grid items-center gap-14 max-[900px]:grid-cols-1 min-[901px]:grid-cols-2">
          <Reveal className="order-2 max-[900px]:order-1">
            <span className="text-xs font-medium uppercase tracking-[.08em] text-coral">AI Drafts</span>
            <h3 className="my-3 font-display text-[30px] font-semibold leading-[1.2] text-ink">
              AI drafts. You decide.
            </h3>
            <p className="m-0 text-base leading-[1.65] text-text-secondary">
              For every message, ReplyMind generates a suggested reply based on your uploaded
              documents. It&apos;s clearly marked as a draft — never sent automatically unless you
              turn that on. Send it in one tap, edit a word, or write your own.
            </p>
          </Reveal>
          <Reveal className="relative order-1 overflow-hidden rounded-[28px] border border-border bg-white p-5 shadow-[0_20px_50px_rgba(74,82,201,.12)] max-[900px]:order-0">
            <div className="mb-3 flex items-start gap-2.5 rounded-[14px] bg-surface p-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-teal text-white">
                <WhatsAppIcon width={14} height={14} strokeWidth="1.8" />
              </span>
              <div>
                <div className="text-xs font-semibold">Customer · WhatsApp</div>
                <div className="text-[13px] text-text-secondary">Do you deliver on Sundays?</div>
              </div>
            </div>
            <div
              className="rounded-[14px] border p-3.5"
              style={{ borderColor: "rgba(30,34,148,.28)", background: "linear-gradient(180deg,rgba(238,240,216,.7),#fff)" }}
            >
              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-2.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                <span className="text-[10px] font-semibold text-white">Draft · grounded in your docs</span>
              </div>
              <p className="m-0 mb-3 text-[13px] leading-relaxed text-text-primary">
                Yes — we deliver every Sunday, 10am to 6pm. Orders placed before 4pm arrive the same day.
              </p>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-teal px-3.5 py-2 text-xs font-semibold text-white">
                  <SendIcon width={13} height={13} /> Send
                </button>
                <button className="rounded-[10px] border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text-primary">
                  Edit
                </button>
                <button className="rounded-[10px] px-3 py-2 text-xs font-semibold text-text-muted">Ignore</button>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-white/90 backdrop-blur-[2px]" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
