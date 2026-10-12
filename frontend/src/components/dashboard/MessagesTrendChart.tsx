"use client";
import { useState } from "react";

/**
 * Change-over-time area chart of inbound messages vs AI-resolved ones.
 * Two-series categorical palette — violet #4a52c9 + green #16a34a — validated
 * with the dataviz palette checker (all six checks pass on the light surface).
 * Ships the default hover layer for a line/area chart: a crosshair + tooltip.
 */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SERIES = [
  { key: "received", label: "Received", color: "#4a52c9", data: [180, 214, 168, 246, 224, 196, 284] },
  { key: "resolved", label: "AI resolved", color: "#16a34a", data: [150, 182, 141, 206, 197, 170, 258] },
];

const VB_W = 720;
const VB_H = 260;
const PAD = { l: 12, r: 12, t: 18, b: 30 };
const MAX_Y = 320;
const PLOT_W = VB_W - PAD.l - PAD.r;
const PLOT_H = VB_H - PAD.t - PAD.b;

const xAt = (i) => PAD.l + (i / (DAYS.length - 1)) * PLOT_W;
const yAt = (v) => PAD.t + PLOT_H - (v / MAX_Y) * PLOT_H;
const xPct = (i) => (xAt(i) / VB_W) * 100;
const yPct = (v) => (yAt(v) / VB_H) * 100;

function linePath(data) {
  return data.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
}
function areaPath(data) {
  const base = PAD.t + PLOT_H;
  return `${linePath(data)} L ${xAt(data.length - 1).toFixed(1)} ${base} L ${xAt(0).toFixed(1)} ${base} Z`;
}

export default function MessagesTrendChart() {
  const [hover, setHover] = useState(null);
  const gridVals = [0, 80, 160, 240, 320];

  return (
    <div className="glass-card flex flex-1 flex-col rounded-2xl p-lg">
      {/* Header + filter row */}
      <div className="mb-md flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-on-surface">Messages over time</h3>
          <p className="text-body-sm text-on-surface-variant">Inbound volume vs AI-resolved, last 7 days</p>
        </div>
        <select className="cursor-pointer rounded-full border border-outline-variant/60 bg-white/60 px-md py-xs text-label-md text-on-surface-variant backdrop-blur-sm transition-colors hover:bg-white">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
        </select>
      </div>

      {/* Legend */}
      <div className="mb-sm flex items-center gap-4">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-label-md font-medium text-on-surface-variant">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Plot — fixed-height box so the % overlays map exactly to the SVG */}
      <div className="flex-1">
        <div className="relative h-64 w-full">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {/* recessive gridlines */}
          {gridVals.map((v) => (
            <line
              key={v}
              x1={PAD.l}
              x2={VB_W - PAD.r}
              y1={yAt(v)}
              y2={yAt(v)}
              stroke="var(--color-outline-variant)"
              strokeOpacity="0.4"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeDasharray={v === 0 ? "0" : "4 4"}
            />
          ))}

          {/* areas then lines (resolved drawn last, on top) */}
          {SERIES.map((s) => (
            <path key={`a-${s.key}`} d={areaPath(s.data)} fill={`url(#fill-${s.key})`} />
          ))}
          {SERIES.map((s) => (
            <path
              key={`l-${s.key}`}
              d={linePath(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* crosshair on hover (round markers are HTML overlays below, so
              they stay circular under preserveAspectRatio=none) */}
          {hover !== null && (
            <line
              x1={xAt(hover)}
              x2={xAt(hover)}
              y1={PAD.t}
              y2={PAD.t + PLOT_H}
              stroke="var(--color-on-surface)"
              strokeOpacity="0.25"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* round hover markers (HTML, so never distorted) */}
        {hover !== null &&
          SERIES.map((s) => (
            <span
              key={s.key}
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{ left: `${xPct(hover)}%`, top: `${yPct(s.data[hover])}%`, background: s.color }}
            />
          ))}

        {/* hover hit columns */}
        <div className="absolute inset-0 flex" onMouseLeave={() => setHover(null)}>
          {DAYS.map((d, i) => (
            <div key={d} className="flex-1" onMouseEnter={() => setHover(i)} />
          ))}
        </div>

        {/* tooltip */}
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-outline-variant/50 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm"
            style={{ left: `${xPct(hover)}%` }}
          >
            <p className="mb-1 text-label-sm font-semibold text-on-surface">{DAYS[hover]}</p>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-label-md">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-on-surface-variant">{s.label}</span>
                <span className="ml-auto font-semibold text-on-surface">{s.data[hover]}</span>
              </div>
            ))}
          </div>
        )}
        </div>

        {/* x-axis labels (outside the plot box) */}
        <div className="mt-2 flex justify-between px-[1.5%]">
          {DAYS.map((d, i) => (
            <span key={d} className={`text-label-sm ${hover === i ? "font-semibold text-on-surface" : "text-on-surface-variant/60"}`}>{d}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
