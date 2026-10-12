import type { RefObject } from "react";
import { personaTrack } from "@/src/lib/data/personas";
import { WhatsAppIcon, ZapIcon, SendIcon } from "@/src/components/icons";

// Canvas size Hero.tsx scales down to fit the viewport — kept as exported
// constants so the two files can't drift out of sync with each other.
export const JOURNEY_WIDTH = 1528;
export const JOURNEY_HEIGHT = 376;

/**
 * Pure presentational markup for the "journey" graphic: the persona
 * carousel, the drawing connector line, three stage pills, and three stage
 * cards. All animation state is applied imperatively by the parent (Hero)
 * via refs — this component just renders the `data-*` hooks it targets.
 */
export function JourneyGraphic({ lineRef }: { lineRef: RefObject<SVGPathElement> }) {
  return (
    <div style={{ position: "relative", width: JOURNEY_WIDTH, height: JOURNEY_HEIGHT }}>
      <svg
        viewBox={`0 0 ${JOURNEY_WIDTH} ${JOURNEY_HEIGHT}`}
        width={JOURNEY_WIDTH}
        height={JOURNEY_HEIGHT}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <defs>
          <linearGradient id="jgrad" gradientUnits="userSpaceOnUse" x1="250" y1="48" x2="1518" y2="48">
            <stop offset="0" stopColor="#1e2294" />
            <stop offset="1" stopColor="#8b90de" />
          </linearGradient>
        </defs>
        <path d="M250,48 L1518,48" fill="none" stroke="#83837d" strokeWidth="1.5" opacity=".4" />
        <path
          ref={lineRef}
          d="M250,48 L1518,48"
          fill="none"
          stroke="url(#jgrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0"
          style={{ filter: "drop-shadow(0 0 5px rgba(30,34,148,.4))" }}
        />
      </svg>

      <div style={{ position: "absolute", left: 0, top: 28, width: 250, height: 120, overflow: "hidden" }}>
        <div data-jpersona-track style={{ transition: "transform .5s cubic-bezier(.22,1,.36,1)" }}>
          {personaTrack.map((p, i) => (
            <div
              key={i}
              data-jprow
              style={{ display: "flex", alignItems: "center", gap: 9, height: 40, transition: "opacity .4s ease", opacity: i === 0 ? 1 : 0.38 }}
            >
              <span
                data-javatar
                style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? "#1e2294" : "#83837d", flex: "none", transition: "background .4s ease" }}
              />
              <div>
                <div
                  data-jp-title
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)", fontWeight: 700, fontSize: 11.5, letterSpacing: ".03em",
                    whiteSpace: "nowrap", transition: "color .4s ease",
                    color: i === 0 ? "var(--color-text-primary)" : "var(--color-text-muted)",
                  }}
                >
                  {p.title}
                </div>
                <div
                  data-jp-sub
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)", fontSize: 10.5, letterSpacing: ".02em", marginTop: 2,
                    whiteSpace: "nowrap", transition: "color .4s ease",
                    color: i === 0 ? "var(--color-text-secondary)" : "var(--color-text-muted)",
                  }}
                >
                  {p.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <JourneyPill left={664} label="MESSAGE IN" />
      <JourneyPill left={1016} label="AI DRAFTS" />
      <JourneyPill left={1393} label="READY TO SEND" />

      <MessageInCard />
      <AiDraftsCard />
      <ReadyToSendCard />
    </div>
  );
}

function JourneyPill({ left, label }: { left: number; label: string }) {
  return (
    <div
      data-jpill
      style={{
        position: "absolute", left, top: 37, transform: "translateX(-50%)", display: "inline-flex", alignItems: "center",
        gap: 5, padding: "5px 11px", borderRadius: 999, background: "rgba(255,255,255,.75)", border: "1px solid var(--color-border)",
        boxShadow: "0 1px 2px rgba(0,0,0,.04)", whiteSpace: "nowrap", zIndex: 3, transition: "all .35s ease",
      }}
    >
      <span data-jpill-ic style={{ display: "inline-flex", color: "var(--color-text-muted)", transition: "color .3s" }}>
        <ZapIcon width={11} height={11} strokeWidth="2" />
      </span>
      <span data-jpill-tx style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 9.5, fontWeight: 600, letterSpacing: ".05em", color: "var(--color-text-muted)", transition: "color .3s" }}>
        {label}
      </span>
    </div>
  );
}

function MessageInCard() {
  return (
    <div
      data-jcard
      style={{
        position: "absolute", left: 564, top: 62, width: 200, height: 120, borderRadius: 16, border: "1px solid var(--color-border)",
        background: "rgba(255,255,255,.5)", overflow: "hidden", transition: "border-color .4s,box-shadow .4s",
      }}
    >
      <div data-jicon style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", opacity: 0.45, transition: "opacity .5s ease" }}>
        <WhatsAppIcon width={24} height={24} strokeWidth="1.5" />
      </div>
      <div data-jcontent style={{ position: "relative", zIndex: 1, height: "100%", opacity: 0, filter: "blur(10px)", transform: "translateY(5px)", transition: "opacity .5s cubic-bezier(.22,1,.36,1),filter .5s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ height: "100%", background: "#fff", padding: 12, display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: "#1e2294", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "none" }}>
              <WhatsAppIcon width={14} height={14} />
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-text-primary)" }}>WhatsApp</span>
            <span style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--color-text-muted)" }}>now</span>
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.45, color: "var(--color-text-secondary)" }}>&ldquo;Do you deliver on Sundays?&rdquo;</div>
          <div style={{ marginTop: "auto", fontSize: 9.5, color: "var(--color-text-muted)" }}>New customer · Karachi</div>
        </div>
      </div>
    </div>
  );
}

function AiDraftsCard() {
  return (
    <div
      data-jcard
      style={{
        position: "absolute", left: 792, top: 62, width: 448, height: 294, borderRadius: 18, border: "1px solid var(--color-border)",
        background: "rgba(255,255,255,.5)", overflow: "hidden", transition: "border-color .4s,box-shadow .4s",
      }}
    >
      <div data-jicon style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", opacity: 0.45, transition: "opacity .5s ease" }}>
        <SendIcon width={38} height={38} strokeWidth="1.4" />
      </div>
      <div data-jcontent style={{ position: "relative", zIndex: 1, height: "100%", opacity: 0, filter: "blur(10px)", transform: "translateY(5px)", transition: "opacity .5s cubic-bezier(.22,1,.36,1),filter .5s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ height: "100%", background: "#fff", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, padding: "4px 13px", borderRadius: 999, background: "var(--gradient-brand)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: ".03em" }}>DRAFT · GROUNDED IN YOUR DOCS</span>
          </div>
          <div style={{ padding: "12px 15px", borderRadius: 12, background: "var(--color-surface)", fontSize: 13, lineHeight: 1.5, color: "var(--color-text-secondary)" }}>
            &ldquo;Do you deliver on Sundays? I need it before the weekend.&rdquo;
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.6, color: "var(--color-text-primary)" }}>
            Yes — we deliver every Sunday, 10am–6pm. Orders placed before 4pm arrive the same day.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--color-text-muted)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#8b90de", flex: "none" }} />
            Grounded in FAQ.pdf · Delivery.pdf
          </div>
          <div style={{ marginTop: "auto", display: "flex", gap: 9 }}>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--color-teal)", border: "none", padding: "10px 17px", borderRadius: 10, cursor: "pointer" }}>
              <SendIcon width={13} height={13} /> Send
            </button>
            <button style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", background: "var(--color-surface)", border: "1px solid var(--color-border)", padding: "10px 16px", borderRadius: 10, cursor: "pointer" }}>
              Edit
            </button>
            <button style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", background: "transparent", border: "none", padding: "10px 13px", borderRadius: 10, cursor: "pointer" }}>
              Ignore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadyToSendCard() {
  return (
    <div
      data-jcard
      style={{
        position: "absolute", left: 1268, top: 62, width: 250, height: 165, borderRadius: 16, border: "1px solid var(--color-border)",
        background: "rgba(255,255,255,.5)", overflow: "hidden", transition: "border-color .4s,box-shadow .4s",
      }}
    >
      <div data-jicon style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", opacity: 0.45, transition: "opacity .5s ease" }}>
        <SendIcon width={26} height={26} strokeWidth="1.4" />
      </div>
      <div data-jcontent style={{ position: "relative", zIndex: 1, height: "100%", opacity: 0, filter: "blur(10px)", transform: "translateY(5px)", transition: "opacity .5s cubic-bezier(.22,1,.36,1),filter .5s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ height: "100%", background: "#fff", padding: 13, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>Reply ready to send</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", borderRadius: 9, background: "var(--color-surface)" }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, background: "#1e2294", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flex: "none" }}>
              <WhatsAppIcon width={12} height={12} />
            </span>
            <span style={{ fontSize: 10.5, color: "var(--color-text-secondary)" }}>WhatsApp · Amina R.</span>
          </div>
          <button style={{ marginTop: "auto", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: "#fff", background: "var(--color-primary)", border: "none", padding: 9, borderRadius: 9, cursor: "pointer" }}>
            <SendIcon width={11} height={11} /> Send reply
          </button>
          <div style={{ textAlign: "center", fontSize: 9.5, color: "var(--color-text-muted)" }}>Sent in one tap · just now</div>
        </div>
      </div>
    </div>
  );
}
