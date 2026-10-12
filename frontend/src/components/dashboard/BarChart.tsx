/**
 * Magnitude-by-category: inbound messages split by channel. Each bar carries its
 * channel's own brand colour, an icon chip and an always-visible value label, so
 * identity never relies on colour alone.
 */
const CHANNELS = [
    { label: "Email", icon: "mail", color: "var(--color-channel-email)", height: 60, value: "1.2k" },
    { label: "Website", icon: "language", color: "var(--color-channel-website)", height: 85, value: "1.8k" },
    { label: "WhatsApp", icon: "chat", color: "var(--color-channel-whatsapp)", height: 45, value: "856" },
];

const GRID_LINES = [25, 50, 75, 100];

export default function BarChart() {
    return (
      <div className="glass-card flex flex-col rounded-2xl p-lg">
        <div className="mb-lg flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-on-surface">Messages by channel</h3>
            <p className="text-body-sm text-on-surface-variant">Where your conversations come from</p>
          </div>
          <select className="cursor-pointer rounded-full border border-outline-variant/60 bg-white/60 px-md py-xs text-label-md text-on-surface-variant backdrop-blur-sm transition-colors hover:bg-white">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </div>

        {/* Bars */}
        <div className="relative flex h-52 items-end justify-around gap-md">
          {GRID_LINES.map((pct) => (
            <div
              key={pct}
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-outline-variant/25"
              style={{ bottom: `${pct * 0.94}%` }}
            />
          ))}
          {CHANNELS.map((ch, i) => (
            <div key={ch.label} className="group z-10 flex h-full w-full flex-col items-center justify-end gap-2">
              <span className="text-sm font-bold text-on-surface transition-transform group-hover:-translate-y-0.5">{ch.value}</span>
              <div
                className="w-full max-w-[60px] origin-bottom rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                style={{ height: `${ch.height}%`, background: `linear-gradient(180deg, ${ch.color}, color-mix(in srgb, ${ch.color} 78%, #000))`, animation: `barGrow 0.6s ease-out ${i * 0.08}s both` }}
              />
            </div>
          ))}
        </div>

        {/* Channel legend row (icon chip + label) */}
        <div className="mt-md flex justify-around gap-md border-t border-outline-variant/30 pt-md">
          {CHANNELS.map((ch) => (
            <div key={ch.label} className="flex w-full flex-col items-center gap-1.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: ch.color }}>
                <span className="material-symbols-outlined text-[18px]">{ch.icon}</span>
              </span>
              <span className="text-label-md font-medium text-on-surface-variant">{ch.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
}
