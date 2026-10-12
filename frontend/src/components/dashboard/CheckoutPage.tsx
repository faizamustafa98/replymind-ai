"use client";
import { useRef, useState } from "react";

/**
 * Checkout — modern payment page with a mouse-driven parallax scene.
 * The whole scene (background orbs + 3D credit card) shifts with the cursor
 * at different depths; the card tilts in 3D and flips to its back when the
 * CVC field is focused.
 *
 * Brand detection follows the real issuer identification (IIN) ranges:
 *  - Visa        → starts with 4
 *  - Mastercard  → 51–55 or 2221–2720
 *  - PayPak      → starts with 220 (1LINK's domestic scheme, outside the
 *                  Mastercard 2-series range)
 * The number must also pass the Luhn checksum and be 16 digits — random
 * digits are rejected. Expiry must be a real future MM/YY and CVC exactly
 * 3 digits.
 */

// ─── Brand logos (inline SVG) ─────────────────────────────────────────────────

function VisaLogo({ className = "" }) {
    return (
        <svg viewBox="0 0 72 24" className={className} aria-label="Visa">
            <text x="0" y="19" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="800" fontStyle="italic" fill="#fff" letterSpacing="1">
                VISA
            </text>
        </svg>
    );
}

function MastercardLogo({ className = "" }) {
    return (
        <svg viewBox="0 0 48 30" className={className} aria-label="Mastercard">
            <circle cx="18" cy="15" r="13" fill="#EB001B" />
            <circle cx="30" cy="15" r="13" fill="#F79E1B" />
            <path d="M24 4.6a13 13 0 0 1 0 20.8 13 13 0 0 1 0-20.8Z" fill="#FF5F00" />
        </svg>
    );
}

function PayPakLogo({ className = "" }) {
    return (
        <svg viewBox="0 0 84 30" className={className} aria-label="PayPak">
            <rect x="0" y="3" width="24" height="24" rx="6" fill="#0e9f4a" />
            <path d="M6 21V9h6.2c2.8 0 4.6 1.6 4.6 4s-1.8 4-4.6 4H9.4v4H6Zm3.4-6.6h2.5c1 0 1.6-.5 1.6-1.4s-.6-1.4-1.6-1.4H9.4v2.8Z" fill="#fff" />
            <text x="28" y="21" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700" fill="#fff">
                PayPak
            </text>
        </svg>
    );
}

const BRANDS = {
    visa: { label: "Visa", Logo: VisaLogo, gradient: "linear-gradient(135deg, #1a1f71 0%, #2b3a9e 55%, #4a52c9 100%)" },
    mastercard: { label: "Mastercard", Logo: MastercardLogo, gradient: "linear-gradient(135deg, #141414 0%, #2d2d2d 55%, #4a4a4a 100%)" },
    paypak: { label: "PayPak", Logo: PayPakLogo, gradient: "linear-gradient(135deg, #06442a 0%, #0b6b3d 55%, #0e9f4a 100%)" },
};

// ─── Validation helpers ───────────────────────────────────────────────────────

export function detectBrand(digits) {
    if (/^4/.test(digits)) return "visa";
    if (/^220/.test(digits)) return "paypak";
    const two = parseInt(digits.slice(0, 2), 10);
    const four = parseInt(digits.slice(0, 4), 10);
    if (two >= 51 && two <= 55) return "mastercard";
    if (digits.length >= 4 && four >= 2221 && four <= 2720) return "mastercard";
    return null;
}

function luhnValid(digits) {
    let sum = 0;
    let dbl = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let d = parseInt(digits[i], 10);
        if (dbl) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
        dbl = !dbl;
    }
    return sum % 10 === 0;
}

function validateNumber(digits) {
    if (!digits) return "Card number is required.";
    const brand = detectBrand(digits);
    if (digits.length >= 4 && !brand) return "Number doesn't match Visa, Mastercard or PayPak.";
    if (digits.length !== 16) return "Card number must be 16 digits.";
    if (!brand) return "Number doesn't match Visa, Mastercard or PayPak.";
    if (!luhnValid(digits)) return "Invalid card number — check the digits.";
    return "";
}

function validateName(name) {
    if (!name.trim()) return "Cardholder name is required.";
    if (!/^[a-zA-Z\s.'-]{3,}$/.test(name.trim())) return "Enter the name as printed on the card.";
    return "";
}

function validateExpiry(exp) {
    if (!/^\d{2}\/\d{2}$/.test(exp)) return "Use MM/YY format.";
    const [mm, yy] = exp.split("/").map((n) => parseInt(n, 10));
    if (mm < 1 || mm > 12) return "Month must be 01–12.";
    const now = new Date();
    const curYY = now.getFullYear() % 100;
    const curMM = now.getMonth() + 1;
    if (yy < curYY || (yy === curYY && mm < curMM)) return "This card has expired.";
    return "";
}

function validateCvc(cvc) {
    if (!/^\d{3}$/.test(cvc)) return "CVC is the 3-digit code on the back.";
    return "";
}

const formatNumber = (digits) => digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();

// Card face display: typed digits + • placeholders, grouped in fours.
const maskNumber = (digits) => digits.padEnd(16, "•").match(/.{1,4}/g).join(" ");

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage({ mode = "upgrade", plan, onDone, onBack }) {
    const wrapRef = useRef(null);
    const [pos, setPos] = useState({ x: 0, y: 0 }); // cursor, normalized −1…1

    const [number, setNumber] = useState("");
    const [name, setName] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvc, setCvc] = useState("");
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [flipped, setFlipped] = useState(false);
    const [phase, setPhase] = useState("form"); // form | processing | success

    const brand = detectBrand(number);
    const BrandLogo = brand ? BRANDS[brand].Logo : null;

    const errors = {
        number: validateNumber(number),
        name: validateName(name),
        expiry: validateExpiry(expiry),
        cvc: validateCvc(cvc),
    };
    const formValid = !errors.number && !errors.name && !errors.expiry && !errors.cvc;

    const handleMove = (e) => {
        const r = wrapRef.current?.getBoundingClientRect();
        if (!r) return;
        setPos({
            x: ((e.clientX - r.left) / r.width) * 2 - 1,
            y: ((e.clientY - r.top) / r.height) * 2 - 1,
        });
    };

    const handleNumber = (e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
        setNumber(digits);
    };

    const handleExpiry = (e) => {
        let v = e.target.value.replace(/\D/g, "").slice(0, 4);
        if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
        setExpiry(v);
    };

    const handlePay = () => {
        setTouched({ number: true, name: true, expiry: true, cvc: true });
        if (!formValid) return;
        setPhase("processing");
        setTimeout(() => {
            setPhase("success");
            setTimeout(() => {
                onDone?.({ brand: BRANDS[brand].label, last4: number.slice(-4), expires: expiry });
            }, 1600);
        }, 1400);
    };

    const fieldCls = (err) =>
        `w-full rounded-xl border bg-white/70 backdrop-blur text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 px-3 py-2.5 transition-all ${
            err ? "border-error/60 focus:ring-error/30" : "border-outline-variant/50 focus:ring-primary/30 focus:border-primary"
        }`;

    const FieldError = ({ msg }) =>
        msg ? (
            <p className="flex items-center gap-1 text-[11px] text-error mt-1">
                <span className="material-symbols-outlined text-[13px]">error</span>
                {msg}
            </p>
        ) : null;

    const cardGradient = brand ? BRANDS[brand].gradient : "linear-gradient(135deg, #1e2294 0%, #383fb0 55%, #4a52c9 100%)";

    return (
        <div
            ref={wrapRef}
            onMouseMove={handleMove}
            className="relative overflow-y-auto flex-1 custom-scrollbar"
            style={{ background: "linear-gradient(160deg, #eef0ff 0%, #f0efe3 45%, #e4e5f6 100%)" }}
        >
            {/* Parallax background orbs — each layer moves at its own depth */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                    className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
                    style={{ transform: `translate3d(${pos.x * -30}px, ${pos.y * -30}px, 0)` }}
                />
                <div
                    className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-cyan/25 blur-3xl"
                    style={{ transform: `translate3d(${pos.x * -55}px, ${pos.y * -45}px, 0)` }}
                />
                <div
                    className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-violet/20 blur-3xl"
                    style={{ transform: `translate3d(${pos.x * 40}px, ${pos.y * 35}px, 0)` }}
                />
                {/* faint dotted grid drifting the opposite way */}
                <div
                    className="absolute inset-0 opacity-[0.35]"
                    style={{
                        backgroundImage: "radial-gradient(rgba(30,34,148,0.14) 1px, transparent 1px)",
                        backgroundSize: "26px 26px",
                        transform: `translate3d(${pos.x * 12}px, ${pos.y * 12}px, 0)`,
                    }}
                />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-gutter md:px-xl py-lg flex flex-col gap-lg">
                {/* Heading */}
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-white/70 rounded-full group transition-colors">
                        <span className="material-symbols-outlined text-primary group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-2xl font-medium text-on-surface">
                            {mode === "update-card" ? "Update payment method" : "Checkout"}
                        </h2>
                        <p className="text-sm text-on-surface-variant mt-0.5">
                            {mode === "update-card"
                                ? "Your new card will be used for future renewals."
                                : plan && `Upgrading to the ${plan.name} plan — $${plan.price}/mo.`}
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-xl items-start">
                    {/* ── Left: 3D card + order summary ──
                        Below lg this wrapper is `display:contents`, so the card and
                        the order summary become direct children of the grid and can
                        be reordered (card → form → summary) with `order` utilities so
                        the card sits on top and the form directly beneath it. */}
                    <div className="contents lg:flex lg:flex-col lg:gap-lg lg:sticky lg:top-6">
                        {/* Tilting card */}
                        {/* Card panel — generous size, height follows the real
                            card ratio (ISO ID-1 ≈ 1.586:1) */}
                        {/* The card face is a fixed 24rem tall and overflows its
                            aspect-ratio box; on desktop the summary's 38vh offset
                            leaves room, but when stacked we must reserve that height
                            so the form below never overlaps the card. */}
                        <div style={{ perspective: "1200px" }} className="mx-auto w-full max-w-lg max-lg:order-1 max-lg:min-h-[25rem]">
                            <div
                                className="relative w-full aspect-8/5"
                                style={{
                                    transformStyle: "preserve-3d",
                                    transform: `rotateY(${flipped ? 180 + pos.x * 6 : pos.x * 10}deg) rotateX(${pos.y * -8}deg)`,
                                    transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                                }}
                            >
                                {/* Front */}
                                <div
                                    className="absolute inset-0 rounded-3xl p-7 text-white shadow-[0_30px_60px_-20px_rgba(30,34,148,0.55)] flex flex-col justify-between overflow-hidden h-96 w-80 -translate-x-40"
                                    style={{ background: cardGradient, backfaceVisibility: "hidden", transition: "background 0.6s" }}
                                >
                                    {/* sheen follows the cursor */}
                                    <div
                                        className="pointer-events-none absolute inset-0"
                                        style={{
                                            background: `radial-gradient(circle at ${50 + pos.x * 35}% ${50 + pos.y * 35}%, rgba(255,255,255,0.22), transparent 55%)`,
                                        }}
                                    />
                                    <div className="flex items-start justify-between relative">
                                        {/* chip */}
                                        <svg viewBox="0 0 40 30" className="h-10 w-14">
                                            <rect x="1" y="1" width="38" height="28" rx="5" fill="#e8c66a" stroke="#c9a83f" />
                                            <path d="M1 11h38M1 19h38M14 1v28M26 1v28" stroke="#c9a83f" strokeWidth="1.2" fill="none" />
                                        </svg>
                                        {/* brand pops in when the number identifies itself */}
                                        <div className="h-10 flex items-center">
                                            {BrandLogo && (
                                                <div key={brand} className="animate-rm-slidein">
                                                    <BrandLogo className="h-9 w-auto" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="relative font-mono text-2xl md:text-[27px] tracking-[0.14em] tabular-nums whitespace-nowrap">
                                        {maskNumber(number)}
                                    </p>
                                    <div className="relative flex items-end justify-between text-sm">
                                        <div>
                                            <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">Card Holder</p>
                                            <p className="font-medium tracking-wide uppercase">{name.trim() || "Your Name"}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] uppercase tracking-[0.2em] text-white/50">Expires</p>
                                            <p className="font-medium tabular-nums">{expiry || "MM/YY"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Back */}
                                <div
                                    className="absolute inset-0 rounded-3xl text-white shadow-[0_30px_60px_-20px_rgba(30,34,148,0.55)] overflow-hidden"
                                    style={{ background: cardGradient, backfaceVisibility: "hidden", transform: "rotateY(180deg)", transition: "background 0.6s" }}
                                >
                                    <div className="h-12 bg-black/70 mt-7" />
                                    <div className="px-7 mt-6">
                                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-1">CVC</p>
                                        <div className="h-10 rounded-md bg-white/90 flex items-center justify-end px-3">
                                            <span className="font-mono text-lg text-on-surface tracking-[0.3em] tabular-nums">{cvc || "•••"}</span>
                                        </div>
                                    </div>
                                    <div className="px-7 mt-5 flex justify-end">
                                        {BrandLogo && <BrandLogo className="h-6 w-auto opacity-80" />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order summary (upgrade only). No hover reaction — it stays
                            exactly where it is. On lg it's nudged down 38vh to line up
                            with the form; below lg it drops the offset and stacks last. */}
                        {mode !== "update-card" && plan && (
                            <div className="glass-card !rounded-2xl p-5 flex flex-col gap-3 lg:translate-y-[38vh] hover:[transform:none]! hover:shadow-none! max-lg:order-3">
                                <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em]">Order Summary</p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-on-surface">{plan.name} plan · {plan.messages}</span>
                                    <span className="font-medium text-on-surface tabular-nums">${plan.price}.00</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-on-surface-variant">Billed monthly · cancel anytime</span>
                                    <span className="text-on-surface-variant tabular-nums">$0.00 today&apos;s fees</span>
                                </div>
                                <div className="h-px bg-outline-variant/40" />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-on-surface">Total due today</span>
                                    <span className="text-lg font-semibold text-primary tabular-nums">${plan.price}.00</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right: form ── (sits directly under the card on small screens) */}
                    <div className="glass-card !rounded-3xl hover:!translate-y-0 p-6 md:p-8 relative overflow-hidden max-lg:order-2">
                        {phase === "form" && (
                            <div className="flex flex-col gap-5">
                                <div>
                                    <h3 className="text-base font-semibold text-on-surface">Card details</h3>
                                    <p className="text-xs text-on-surface-variant mt-0.5">
                                        We accept <span className="font-medium text-on-surface">Visa</span>,{" "}
                                        <span className="font-medium text-on-surface">Mastercard</span> and{" "}
                                        <span className="font-medium text-on-surface">PayPak</span>.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em] mb-1.5">
                                        Card Number
                                    </label>
                                    <div className="relative">
                                        <input
                                            inputMode="numeric"
                                            autoComplete="cc-number"
                                            className={`${fieldCls(touched.number && errors.number)} pr-16 font-mono tracking-wider`}
                                            placeholder="4242 4242 4242 4242"
                                            value={formatNumber(number)}
                                            onChange={handleNumber}
                                            onFocus={() => setFlipped(false)}
                                            onBlur={() => setTouched((t) => ({ ...t, number: true }))}
                                        />
                                        {/* detected brand slides in beside the field too */}
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-6 flex items-center">
                                            {brand === "visa" && (
                                                <span key="v" className="animate-rm-slidein rounded bg-[#1a1f71] px-1.5 py-0.5"><VisaLogo className="h-3.5 w-auto" /></span>
                                            )}
                                            {brand === "mastercard" && (
                                                <span key="m" className="animate-rm-slidein"><MastercardLogo className="h-6 w-auto" /></span>
                                            )}
                                            {brand === "paypak" && (
                                                <span key="p" className="animate-rm-slidein rounded bg-[#0b6b3d] px-1.5 py-0.5"><PayPakLogo className="h-4 w-auto" /></span>
                                            )}
                                        </div>
                                    </div>
                                    <FieldError msg={touched.number ? errors.number : ""} />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em] mb-1.5">
                                        Cardholder Name
                                    </label>
                                    <input
                                        autoComplete="cc-name"
                                        className={fieldCls(touched.name && errors.name)}
                                        placeholder="Name as printed on card"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onFocus={() => setFlipped(false)}
                                        onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                                    />
                                    <FieldError msg={touched.name ? errors.name : ""} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em] mb-1.5">
                                            Expiry
                                        </label>
                                        <input
                                            inputMode="numeric"
                                            autoComplete="cc-exp"
                                            className={`${fieldCls(touched.expiry && errors.expiry)} font-mono`}
                                            placeholder="MM/YY"
                                            value={expiry}
                                            onChange={handleExpiry}
                                            onFocus={() => setFlipped(false)}
                                            onBlur={() => setTouched((t) => ({ ...t, expiry: true }))}
                                        />
                                        <FieldError msg={touched.expiry ? errors.expiry : ""} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-on-surface-variant uppercase tracking-[0.06em] mb-1.5">
                                            CVC
                                        </label>
                                        <input
                                            inputMode="numeric"
                                            autoComplete="cc-csc"
                                            className={`${fieldCls(touched.cvc && errors.cvc)} font-mono`}
                                            placeholder="123"
                                            value={cvc}
                                            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
                                            onFocus={() => setFlipped(false)}
                                            onBlur={() => setTouched((t) => ({ ...t, cvc: true }))}
                                        />
                                        <FieldError msg={touched.cvc ? errors.cvc : ""} />
                                    </div>
                                </div>

                                <button
                                    onClick={handlePay}
                                    className="mt-1 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px]">lock</span>
                                    {mode === "update-card" ? "Save card" : plan ? `Pay $${plan.price}.00` : "Pay"}
                                </button>

                                <p className="flex items-center justify-center gap-1.5 text-[11px] text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[14px]">verified_user</span>
                                    256-bit encrypted · your card details never touch our servers
                                </p>
                            </div>
                        )}

                        {phase === "processing" && (
                            <div className="flex flex-col items-center justify-center gap-4 py-20">
                                <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
                                <p className="text-sm text-on-surface-variant">Contacting your bank…</p>
                            </div>
                        )}

                        {phase === "success" && (
                            <div className="flex flex-col items-center justify-center gap-4 py-16 animate-rm-slidein">
                                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-brand text-white shadow-lg shadow-primary/30">
                                    <span className="material-symbols-outlined text-[42px]">check</span>
                                </span>
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-on-surface">
                                        {mode === "update-card" ? "Card updated!" : "Payment successful!"}
                                    </p>
                                    <p className="text-sm text-on-surface-variant mt-1">
                                        {mode === "update-card"
                                            ? `${brand ? BRANDS[brand].label : "Card"} ending in ${number.slice(-4)} is now your payment method.`
                                            : `Welcome to the ${plan?.name} plan.`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pb-xl" />
            </div>
        </div>
    );
}
