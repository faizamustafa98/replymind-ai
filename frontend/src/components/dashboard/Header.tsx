"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { initialsAvatar } from "@/src/lib/utils/avatar";

export default function Header({ onProfileClick, onMenuClick }) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
            const url = session?.user?.user_metadata?.avatar_url;
            if (url) setAvatarUrl(url);
        });
    }, []);
    return (
        <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 sm:px-6 bg-white/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm">
            {/* Left — hamburger (mobile) + logo */}
            <div className="flex items-center gap-2 min-w-0">
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        aria-label="Open menu"
                        className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    >
                        <span className="material-symbols-outlined text-[24px]">menu</span>
                    </button>
                )}
                <Link href="/" className="flex items-center gap-sm min-w-0">
                    <img src="/logo-mark.svg" alt="ReplyMind" className="h-10 w-10 shrink-0 transition-transform hover:scale-110" />
                    <div className="min-w-0">
                        <h1 className="text-[18px] font-medium text-primary tracking-tight leading-none truncate">ReplyMind</h1>
                        <p className="hidden sm:block text-[10px] uppercase tracking-widest text-on-surface-variant/60 mt-0.5">Business Intelligence</p>
                    </div>
                </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-md">
                <div className="relative group/avatar">
                    <button
                        onClick={onProfileClick}
                        className="w-10 h-10 rounded-full border-2 border-primary-fixed overflow-hidden hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                        <img
                            alt="Profile"
                            className="w-full h-full object-cover"
                            src={avatarUrl ?? initialsAvatar("U")}
                        />
                    </button>
                    <span className="pointer-events-none absolute -bottom-8 right-0 bg-on-surface text-surface-container-lowest text-xs font-medium px-2 py-1 rounded-lg opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap shadow-md">
                        Profile
                    </span>
                </div>
            </div>
        </header>
    );
}
