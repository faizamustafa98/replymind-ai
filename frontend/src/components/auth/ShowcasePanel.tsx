/**
 * Decorative right-hand panel for the auth pages.
 * The BACKGROUND colour layers (a dark navy shape up top, a periwinkle shape at
 * the bottom) deliberately break out past the panel's top / bottom edges, while
 * the cards + channel badges sit centered *inside* the panel — mirroring the
 * reference mock, themed to ReplyMind and its navy → violet brand palette.
 * Server component — purely presentational, no interactivity.
 */
export default function ShowcasePanel() {
  return (
    <section className="relative hidden lg:block w-[46%] shrink-0">
      {/* Colour layers — clipped left/right to the panel edges, but left open
          top & bottom (via clip-path inset) so the shapes break out vertically
          without ever bleeding sideways into the form. */}
      <div
        className="absolute inset-0"
        style={{ clipPath: "inset(-140px 0px -140px 0px round 0 2rem 2rem 0)" }}
      >
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-brand" />
        {/* Dark navy shape — pokes out the TOP edge */}
        <div className="absolute -top-10 left-4 h-44 w-[80%] -rotate-[14deg] rounded-[2.5rem] bg-primary" />
        {/* Periwinkle shapes — poke out the BOTTOM edge */}
        <div className="absolute -bottom-12 right-0 h-[58%] w-[92%] rotate-[10deg] rounded-[3rem] bg-cyan" />
        <div className="absolute -bottom-14 left-0 h-40 w-1/2 rotate-[16deg] rounded-[2.5rem] bg-cyan/70" />
      </div>

      {/* ── Cards + badges, centered INSIDE the panel ── */}
      <div className="absolute inset-0 z-10">
        {/* Inbox stat card */}
        <div className="absolute left-8 top-[12%] w-56 rounded-3xl bg-white p-5 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.5)] animate-rm-floatA">
          <p className="text-xs font-medium text-text-secondary">Inbox</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-2xl font-bold tracking-tight text-text-primary font-display">1,284</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
              45
            </span>
          </div>
          <svg viewBox="0 0 180 56" fill="none" className="mt-3 w-full">
            <path
              d="M2 40 C 20 40, 24 14, 42 14 S 64 42, 82 42 S 104 12, 122 12 S 144 40, 162 30 L 178 24"
              stroke="var(--color-primary)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M2 48 C 22 48, 26 30, 44 30 S 66 50, 84 50 S 106 28, 124 28 S 146 48, 164 42 L 178 40"
              stroke="var(--color-amber)"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.85"
            />
          </svg>
        </div>

        {/* Instagram badge */}
        <div className="absolute right-8 top-[15%] flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)] animate-rm-floatB">
          <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
            <defs>
              <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#FEDA75" />
                <stop offset="0.4" stopColor="#FA7E1E" />
                <stop offset="0.7" stopColor="#D62976" />
                <stop offset="1" stopColor="#962FBF" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)" />
            <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
            <circle cx="17.2" cy="6.8" r="1.2" fill="#fff" />
          </svg>
        </div>

        {/* WhatsApp badge (replaces TikTok) */}
        <div className="absolute right-14 top-[40%] flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)] animate-rm-floatC">
          <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
            <path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.05L2 22l5.1-1.34A10 10 0 1 0 12 2Z" />
            <path
              fill="#fff"
              d="M8.4 7.1c-.2-.45-.4-.46-.6-.47h-.5a1 1 0 0 0-.72.34 3 3 0 0 0-.94 2.23c0 1.32.96 2.6 1.1 2.78.13.18 1.87 2.99 4.62 4.07 2.29.9 2.76.72 3.26.68.5-.05 1.6-.66 1.83-1.29.22-.63.22-1.17.16-1.28-.07-.11-.25-.18-.52-.31-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.87-.86 1.05-.16.18-.32.2-.59.07a7.4 7.4 0 0 1-2.18-1.35 8.2 8.2 0 0 1-1.51-1.88c-.16-.27 0-.42.12-.55.12-.12.27-.32.4-.48.14-.16.18-.27.28-.45.09-.18.04-.34-.02-.48-.07-.13-.6-1.45-.82-1.98Z"
            />
          </svg>
        </div>

        {/* Your-data card */}
        <div className="absolute bottom-[10%] left-8 right-8 rounded-3xl bg-white p-5 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.5)]">
          <div className="flex items-start justify-between">
            <div className="h-1.5 w-10 rounded-full bg-gradient-brand" />
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
              <path
                d="M15.5 8.5a4 4 0 1 0-3.9 5l1.4 1.4v2h2v2h3v-3l-3.9-3.9a4 4 0 0 0 1.4-3.5Z"
                stroke="var(--color-primary)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="13" cy="9" r="1.2" fill="var(--color-primary)" />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-bold text-text-primary font-display">Your data, your rules</h3>
          <p className="mt-1 text-sm leading-snug text-text-secondary">
            Your conversations belong to you — end-to-end encryption keeps every reply private.
          </p>
        </div>
      </div>
    </section>
  );
}
