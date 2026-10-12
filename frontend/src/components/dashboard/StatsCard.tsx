/**
 * Compact KPI tile: gradient icon chip, headline value, delta badge and a tiny
 * sparkline. `spark` is a list of numbers rendered as a normalised polyline.
 */
function Sparkline({ points, stroke }: { points?: number[]; stroke: string }) {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = 100 / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(28 - ((p - min) / span) * 24).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-3 h-8 w-full">
      <path d={d} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StatsCard({
  icon,
  label,
  value,
  change,
  trend = "up",
  spark,
  stroke = "var(--color-primary)",
}: {
  icon: string;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
  spark?: number[];
  stroke?: string;
}) {
  const positive = trend === "up";
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-outline-variant/40 bg-gradient-to-br from-white to-primary/[0.04] p-md shadow-[0_1px_2px_rgba(30,34,148,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(30,34,148,0.28)]">
      {/* soft corner glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-brand opacity-[0.06] blur-2xl transition-opacity group-hover:opacity-[0.12]" />

      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-md shadow-primary/20">
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        {change && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
              positive ? "bg-emerald-500/10 text-emerald-600" : "bg-error/10 text-error"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{positive ? "trending_up" : "trending_down"}</span>
            {change}
          </span>
        )}
      </div>

      <div className="mt-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant/70">{label}</p>
        <h3 className="mt-0.5 text-[28px] font-bold leading-tight tracking-tight text-on-surface">{value}</h3>
      </div>

      <Sparkline points={spark} stroke={stroke} />
    </div>
  );
}
