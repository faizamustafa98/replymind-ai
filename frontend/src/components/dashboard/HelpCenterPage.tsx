"use client";
import { useState } from "react";

/**
 * Help Center — direct lines to the four ReplyMind team members.
 * Custom SVG avatars indicate gender (blue for male, pink for female), cards
 * animate in with a stagger and lift on hover. Phone numbers are tap-to-call
 * (tel:) and one-click copyable.
 */

const MALE = { ring: "#4a52c9", soft: "#e4e5f6", skin: "#f3c9a5", hair: "#2b2e3a", symbol: "male" };
const FEMALE = { ring: "#ec4899", soft: "#fce7f3", skin: "#f6d1b2", hair: "#5b3a29", symbol: "female" };

const TEAM = [
    { name: "Zayyam Siddiqui", role: "Full-stack & AI", phone: "+92 300 1234501", gender: "male" },
    { name: "Ahmad", role: "Frontend & Design", phone: "+92 300 1234502", gender: "male" },
    { name: "Emaim", role: "Backend & Integrations", phone: "+92 300 1234503", gender: "female" },
    { name: "Faiza", role: "Product & QA", phone: "+92 300 1234504", gender: "female" },
];

function Avatar({ gender }) {
    const g = gender === "female" ? FEMALE : MALE;
    return (
        <svg viewBox="0 0 96 96" className="h-20 w-20" aria-hidden="true">
            {/* backdrop disc */}
            <circle cx="48" cy="48" r="46" fill={g.soft} />
            <circle cx="48" cy="48" r="46" fill="none" stroke={g.ring} strokeWidth="3" />
            {gender === "female" ? (
                <>
                    {/* long hair behind */}
                    <path d="M48 18c-15 0-23 11-23 24 0 10-2 20-5 25 8 4 13 4 17 3l1-13h20l1 13c4 1 9 1 17-3-3-5-5-15-5-25 0-13-8-24-23-24Z" fill={g.hair} />
                    {/* face */}
                    <circle cx="48" cy="42" r="14" fill={g.skin} />
                    {/* fringe */}
                    <path d="M34 40c0-10 6-17 14-17s14 7 14 17c-3-6-8-9-14-9s-11 3-14 9Z" fill={g.hair} />
                    {/* shoulders */}
                    <path d="M24 84c3-14 12-20 24-20s21 6 24 20" fill={g.ring} />
                </>
            ) : (
                <>
                    {/* face */}
                    <circle cx="48" cy="41" r="14" fill={g.skin} />
                    {/* short hair */}
                    <path d="M34 38c0-9 6-16 14-16s14 7 14 16c-2-5-4-7-6-8-1 2-9 4-16 2-2 1-5 3-6 6Z" fill={g.hair} />
                    {/* shoulders */}
                    <path d="M24 84c3-14 12-20 24-20s21 6 24 20" fill={g.ring} />
                </>
            )}
        </svg>
    );
}

function GenderBadge({ gender }) {
    const female = gender === "female";
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                female ? "bg-pink-500/10 text-pink-500" : "bg-primary/10 text-primary"
            }`}
        >
            <span className="material-symbols-outlined text-[14px]">{female ? "female" : "male"}</span>
            {female ? "Female" : "Male"}
        </span>
    );
}

function TeamCard({ member, index }) {
    const [copied, setCopied] = useState(false);
    const g = member.gender === "female" ? FEMALE : MALE;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(member.phone);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch { /* clipboard unavailable — the number is still visible */ }
    };

    return (
        <div
            className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-outline-variant/40 bg-gradient-to-br from-white to-primary/[0.04] p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-20px_rgba(30,34,148,0.35)] animate-rm-slidein"
            style={{ animationDelay: `${index * 110}ms` }}
        >
            {/* hover glow tinted per gender */}
            <div
                className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25"
                style={{ background: g.ring }}
            />

            <div className="transition-transform duration-300 group-hover:scale-105">
                <Avatar gender={member.gender} />
            </div>

            <div>
                <h3 className="text-base font-bold text-on-surface font-display">{member.name}</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">{member.role}</p>
            </div>

            <GenderBadge gender={member.gender} />

            <div className="mt-1 flex w-full items-center justify-center gap-2">
                <a
                    href={`tel:${member.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-white shadow-md shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
                >
                    <span className="material-symbols-outlined text-[15px]">call</span>
                    {member.phone}
                </a>
                <button
                    onClick={copy}
                    title="Copy number"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 text-on-surface-variant transition-all hover:border-primary hover:text-primary active:scale-90"
                >
                    <span className="material-symbols-outlined text-[15px]">{copied ? "check" : "content_copy"}</span>
                </button>
            </div>
        </div>
    );
}

export default function HelpCenterPage() {
    return (
        <div className="overflow-y-auto flex-1 px-gutter md:px-xl py-lg custom-scrollbar">
            <div className="max-w-5xl mx-auto flex flex-col gap-lg">
                <section>
                    <h2 className="text-2xl font-medium text-on-surface">Help Center</h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                        Stuck somewhere? Call any of us directly — we&apos;re happy to help.
                    </p>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
                    {TEAM.map((m, i) => (
                        <TeamCard key={m.name} member={m} index={i} />
                    ))}
                </div>

                {/* Extra help strip */}
                <div className="glass-card flex items-center gap-4 rounded-2xl p-md">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white">
                        <span className="material-symbols-outlined">mail</span>
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface">Prefer email?</p>
                        <p className="text-xs text-on-surface-variant truncate">
                            Write to <a href="mailto:replymindai806@gmail.com" className="font-medium text-primary hover:underline">replymindai806@gmail.com</a> — we reply within a few hours.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
