"use client";
import { useRouter } from "next/navigation";

// Quick action lands on the Documents view — that's where the knowledge base lives.
const ACTIONS = [
    { icon: "upload_file", label: "Upload Knowledge Base", desc: "Update AI with new docs", view: "documents" },
];

export default function QuickActions({ onNavigate }) {
    const router = useRouter();

    const go = (view) => {
        router.push(`/dashboard?view=${view}`);
        onNavigate?.(view);
    };

    return (<div className="flex flex-col flex-1 min-h-0">
      <h3 className="text-base font-medium mb-md">Quick Actions</h3>
      <div className="flex flex-col gap-md flex-1">
        {ACTIONS.map((a) => (<button
          key={a.label}
          onClick={() => go(a.view)}
          className="glass-card flex flex-1 items-center gap-md p-md rounded-2xl text-left hover:border-primary/50 transition-all group w-full"
        >
          <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 bg-primary-container/20 text-primary group-hover:bg-primary group-hover:text-white">
            <span className="material-symbols-outlined group-hover:scale-110">{a.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{a.label}</p>
            <p className="text-sm text-on-surface-variant opacity-70 truncate">{a.desc}</p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant/40 transition-transform group-hover:translate-x-1 group-hover:text-primary">chevron_right</span>
        </button>))}
        <div className="glass-card p-md rounded-2xl bg-primary-container/10 overflow-hidden relative group cursor-default hover:bg-primary-container/20 transition-all flex-[1.4]">
          <div className="relative z-10">
            <h4 className="text-sm font-medium text-primary mb-xs">Pro Tip</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">Try enabling &apos;Auto-Reply&apos; for your Website channel to reduce manual drafting by 60%.</p>
          </div>
          <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-primary/10 text-[100px] transition-transform group-hover:scale-110 group-hover:rotate-12" style={{ fontVariationSettings: "'FILL' 1" }}>tips_and_updates</span>
        </div>
      </div>
    </div>);
}
