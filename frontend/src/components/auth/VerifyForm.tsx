"use client";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Icon from "@/src/components/ui/Icon";
import { createClient } from "@/src/lib/supabase/client";
import { getVerificationTarget, sendVerificationCode, verifyCode } from "@/src/lib/actions/verify";

// Must match the Supabase project's OTP length (Auth → Providers → Email).
// This project issues 8-digit codes, not the Supabase default of 6.
const CODE_LENGTH = 8;
const RESEND_SECONDS = 60;

/* ── One digit box of the code input ── */
function DigitBox({ inputRef, value, onChange, onKeyDown, onPaste, invalid, disabled }) {
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      aria-label="Verification code digit"
      className={`h-14 w-full min-w-0 rounded-xl border bg-white text-center font-display text-xl font-semibold text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 ${
        invalid ? "border-error" : "border-outline-variant/70"
      }`}
    />
  );
}

export default function VerifyForm() {
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [email, setEmail] = useState("");
  // loading → resolving who we're verifying; ready → awaiting input; verifying → submitting
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const inputsRef = useRef([]);
  // React runs effects twice in dev StrictMode; without this the first mount
  // would fire off two verification emails.
  const startedRef = useRef(false);

  const code = digits.join("");

  const focusBox = (index) => inputsRef.current[index]?.focus();

  /* Resolve the target address, then send the first code automatically so the
     user doesn't have to ask for something they just implicitly requested. */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const target = await getVerificationTarget();
      if (target.error) {
        setError(target.error);
        setPhase("ready");
        return;
      }
      // Already cleared this step on a previous sign-in — don't make them do it
      // again, just carry on into setup.
      if (target.alreadyVerified) {
        window.location.href = "/onboarding";
        return;
      }

      setEmail(target.email);
      setPhase("ready");

      const sent = await sendVerificationCode();
      if (sent.error) setError(sent.error);
      else {
        setNotice("Code sent — check your inbox.");
        setCooldown(RESEND_SECONDS);
      }
      focusBox(0);
    })();
  }, []);

  /* Resend cooldown tick */
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (value) => {
    setPhase("verifying");
    setError("");
    setNotice("");

    const result = await verifyCode(value);
    if (result.error) {
      setError(result.error);
      setDigits(Array(CODE_LENGTH).fill(""));
      setPhase("ready");
      focusBox(0);
      return;
    }
    // Full reload rather than a client push, so the refreshed session cookie
    // verifyOtp just issued is picked up by the onboarding request.
    window.location.href = "/onboarding";
  };

  /* Submit as soon as the last digit lands, so the common case needs no click.
     Driven off committed state rather than the change handler, which keeps it
     correct however the digits arrived — typed, pasted or autofilled. */
  useEffect(() => {
    if (phase === "ready" && code.length === CODE_LENGTH && !digits.includes("")) {
      submit(code);
    }
    // submit is intentionally omitted: it's re-created every render, and the
    // code/phase pair is what should actually re-trigger a submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, phase, digits]);

  // Every edit goes through a functional update: digits can land faster than
  // React re-renders (autofill, paste, a quick typist), and reading `digits`
  // from the closure would drop everything but the last keystroke.
  const writeDigits = (updater) => {
    setDigits(updater);
    setError("");
  };

  const handleChange = (index, raw) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    writeDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (index < CODE_LENGTH - 1) focusBox(index + 1);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      writeDigits((prev) => {
        const next = [...prev];
        // Clear this box if it has a digit, otherwise step back and clear that one.
        if (next[index]) next[index] = "";
        else if (index > 0) next[index - 1] = "";
        return next;
      });
      if (!digits[index] && index > 0) focusBox(index - 1);
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  /* Pasting the whole code from the email should just work, from any box. */
  const handlePaste = (index, e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();

    writeDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < pasted.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = pasted[i];
      }
      return next;
    });
    focusBox(Math.min(index + pasted.length, CODE_LENGTH - 1));
  };

  /* Signing out is what actually lets them leave: the setup gate would send a
     still-signed-in half-finished account straight back to this screen.
     Done on the browser client rather than a server action — Next.js queues
     server actions, so this would otherwise sit behind an in-flight send and
     the button would feel dead. */
  const handleCancel = async () => {
    await createClient().auth.signOut();
    window.location.href = "/login";
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError("");
    setNotice("");
    setDigits(Array(CODE_LENGTH).fill(""));

    const sent = await sendVerificationCode();
    if (sent.error) setError(sent.error);
    else {
      setNotice("We sent you a new code.");
      setCooldown(RESEND_SECONDS);
    }
    focusBox(0);
  };

  const busy = phase === "loading" || phase === "verifying";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-[400px]"
    >
      {/* Top row — backing out abandons the half-finished signup entirely */}
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Back to sign in"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/70 text-text-secondary transition-colors hover:border-primary hover:text-primary"
        >
          <Icon name="arrow_back" className="text-[18px]" />
        </button>
        <p className="text-sm text-text-secondary">
          Wrong account?{" "}
          <button type="button" onClick={handleCancel} className="font-semibold text-primary hover:underline">
            Sign in
          </button>
        </p>
      </div>

      {/* Heading */}
      <div className="mb-7">
        <div className="mb-4 flex items-center gap-2">
          <img src="/logo-mark.svg" alt="ReplyMind" className="h-9 w-9" />
          <span className="text-base font-bold tracking-tight text-text-primary font-display">ReplyMind</span>
        </div>
        <h1 className="text-[40px] font-bold leading-none tracking-tight text-text-primary font-display">
          Verify email
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {email ? (
            <>Enter the {CODE_LENGTH}-digit code we sent to <span className="font-semibold text-text-primary">{email}</span>.</>
          ) : (
            "Confirming your account…"
          )}
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex justify-between gap-1.5">
          {digits.map((digit, i) => (
            <DigitBox
              key={i}
              inputRef={(el) => (inputsRef.current[i] = el)}
              value={digit}
              disabled={busy}
              invalid={!!error}
              onChange={(v) => handleChange(i, v)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={(e) => handlePaste(i, e)}
            />
          ))}
        </div>

        {error && <p className="text-sm text-error">{error}</p>}
        {!error && notice && <p className="text-sm text-text-secondary/80">{notice}</p>}

        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => code.length === CODE_LENGTH && submit(code)}
            disabled={busy || code.length < CODE_LENGTH}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-brand pl-7 pr-2 py-1.5 text-sm font-semibold text-white shadow-[0_16px_36px_-12px_rgba(30,34,148,0.6)] transition-all hover:-translate-y-px active:scale-95 disabled:opacity-60"
          >
            {phase === "verifying" ? "Verifying…" : "Verify"}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
              <Icon name={phase === "verifying" ? "progress_activity" : "arrow_forward"} className={`text-[18px] ${phase === "verifying" ? "animate-spin" : ""}`} />
            </span>
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={busy || cooldown > 0}
            className="text-sm font-medium text-primary transition-colors hover:underline disabled:text-text-secondary/50 disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>

        <p className="text-xs text-text-secondary/60">
          The code expires shortly. Check your spam folder if it hasn&apos;t arrived.
        </p>
      </div>
    </motion.div>
  );
}
