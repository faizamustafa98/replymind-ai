"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import Icon from "@/src/components/ui/Icon";
import { signIn, signUp } from "@/src/lib/actions/auth";
import { createClient } from "@/src/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Letters and spaces only — no digits or special characters.
const NAME_RE = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/;

/* ── Underline input with a leading icon + trailing status slot ── */
function AuthField({ icon, type = "text", placeholder, value, onChange, trailing, invalid, error = "" }) {
  return (
    <div>
      <div
        className={`group flex items-center gap-3 border-b py-2.5 transition-colors focus-within:border-primary ${
          invalid ? "border-error" : "border-outline-variant/70"
        }`}
      >
        <Icon
          name={icon}
          className={`text-[20px] group-focus-within:text-primary ${invalid ? "text-error" : "text-text-secondary/70"}`}
        />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
        />
        {trailing}
      </div>
      {invalid && error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

/* ── Green tick shown when a field passes validation ── */
function ValidTick({ ok }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full transition-all ${
        ok ? "bg-emerald-500 text-white scale-100" : "scale-0"
      }`}
    >
      <Icon name="check" className="text-[14px]" />
    </span>
  );
}

/* ── Password requirement row ── */
function Rule({ ok, children }) {
  return (
    <li className={`flex items-center gap-1.5 transition-colors ${ok ? "text-emerald-600" : "text-text-secondary/50"}`}>
      <Icon name={ok ? "check" : "remove"} className="text-[15px]" />
      {children}
    </li>
  );
}

/* ── Google icon button (Facebook removed) ── */
function SocialRow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      // Supabase redirects to Google, then back to /auth/callback, which
      // exchanges the code for a session cookie and forwards into the app.
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
      // On success the browser navigates away to Google — no need to reset state.
    } catch {
      setError("Could not start Google sign-in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <span className="text-sm text-text-secondary/70">Or</span>
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          aria-label="Continue with Google"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/70 bg-white transition-all hover:shadow-sm active:scale-95 disabled:opacity-60"
        >
          {loading ? (
            <Icon name="progress_activity" className="text-[20px] animate-spin text-text-secondary" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button
      disabled={loading}
      className="group inline-flex items-center gap-2 rounded-full bg-gradient-brand pl-7 pr-2 py-1.5 text-sm font-semibold text-white shadow-[0_16px_36px_-12px_rgba(30,34,148,0.6)] transition-all hover:-translate-y-px active:scale-95 disabled:opacity-60"
    >
      {children}
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
        <Icon name="arrow_forward" className="text-[18px]" />
      </span>
    </button>
  );
}

/* ── Login ── */
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState("");

  const emailOk = EMAIL_RE.test(email);
  const passOk = password.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttempted(true);
    setError("");
    if (!emailOk || !passOk) return;
    setLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next || "/inbox";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {error && <p className="text-sm text-error text-center">{error}</p>}
      <AuthField
        icon="person"
        type="email"
        placeholder="Email address"
        value={email}
        onChange={setEmail}
        invalid={attempted && !emailOk}
        error={!email ? "Email is required" : "Enter a valid email address"}
        trailing={<ValidTick ok={emailOk} />}
      />
      <AuthField
        icon="lock"
        type={show ? "text" : "password"}
        placeholder="Password"
        value={password}
        onChange={setPassword}
        invalid={attempted && !passOk}
        error="Password is required"
        trailing={
          <button type="button" onClick={() => setShow((s) => !s)} aria-label="Toggle password" className="text-text-secondary/70 hover:text-primary">
            <Icon name={show ? "visibility" : "visibility_off"} className="text-[20px]" />
          </button>
        }
      />
      <div className="flex justify-end">
        <a href="#" className="text-xs font-medium text-primary hover:underline">Forgot password?</a>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <SubmitButton loading={loading}>{loading ? "Signing in…" : "Sign In"}</SubmitButton>
        <SocialRow />
      </div>

      <p className="text-xs text-text-secondary/60">
        Enter any valid email and password to sign in.
      </p>
    </form>
  );
}

/* ── Signup ── */
function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState("");

  const nameOk = name.trim().length > 1 && NAME_RE.test(name.trim());
  const emailOk = EMAIL_RE.test(email);
  const lenOk = password.length >= 8;
  const numOk = /[0-9]/.test(password);
  const specialOk = /[^A-Za-z0-9\s]/.test(password);
  const caseOk = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const passOk = lenOk && numOk && specialOk && caseOk;
  const matchOk = confirm.length > 0 && password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttempted(true);
    setError("");
    if (!nameOk || !emailOk || !passOk || !matchOk) return;
    setLoading(true);
    try {
      const result = await signUp(email, password, name.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.href = "/onboarding";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {error && <p className="text-sm text-error text-center">{error}</p>}
      <AuthField
        icon="person"
        placeholder="Full name"
        value={name}
        onChange={(v: string) => setName(v.replace(/[^A-Za-z\s]/g, ""))}
        invalid={attempted && !nameOk}
        error={!name.trim() ? "Please enter your full name" : "Name can only contain letters and spaces"}
        trailing={<ValidTick ok={nameOk} />}
      />
      <AuthField
        icon="alternate_email"
        type="email"
        placeholder="Work email"
        value={email}
        onChange={setEmail}
        invalid={attempted && !emailOk}
        error={!email ? "Email is required" : "Enter a valid email address"}
        trailing={<ValidTick ok={emailOk} />}
      />
      <AuthField
        icon="lock"
        type={show ? "text" : "password"}
        placeholder="Password"
        value={password}
        onChange={setPassword}
        invalid={attempted && !passOk}
        trailing={
          <button type="button" onClick={() => setShow((s) => !s)} aria-label="Toggle password" className="text-text-secondary/70 hover:text-primary">
            <Icon name={show ? "visibility" : "visibility_off"} className="text-[20px]" />
          </button>
        }
      />
      <ul className="space-y-1 pl-1 text-xs">
        <Rule ok={lenOk}>At least 8 characters</Rule>
        <Rule ok={numOk}>At least one number (0-9)</Rule>
        <Rule ok={specialOk}>At least one special character (!@#$…)</Rule>
        <Rule ok={caseOk}>Lowercase (a-z) and uppercase (A-Z)</Rule>
      </ul>
      <AuthField
        icon="lock_reset"
        type={show ? "text" : "password"}
        placeholder="Re-type password"
        value={confirm}
        onChange={setConfirm}
        invalid={attempted && !matchOk}
        error={!confirm ? "Please re-type your password" : "Passwords do not match"}
        trailing={<ValidTick ok={matchOk} />}
      />

      <div className="flex items-center gap-4 pt-2">
        <SubmitButton loading={loading}>{loading ? "Creating…" : "Sign Up"}</SubmitButton>
        <SocialRow />
      </div>
    </form>
  );
}

export default function AuthForm({ initialMode = "login" }) {
  const isLogin = initialMode === "login";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-[400px]"
    >
      {/* Top row — back to home + switch link */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/70 text-text-secondary transition-colors hover:border-primary hover:text-primary"
        >
          <Icon name="arrow_back" className="text-[18px]" />
        </Link>
        <p className="text-sm text-text-secondary">
          {isLogin ? "New here?" : "Already a member?"}{" "}
          <Link href={isLogin ? "/register" : "/login"} className="font-semibold text-primary hover:underline">
            {isLogin ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </div>

      {/* Heading */}
      <div className="mb-7">
        <div className="mb-4 flex items-center gap-2">
          <img src="/logo-mark.svg" alt="ReplyMind" className="h-9 w-9" />
          <span className="text-base font-bold tracking-tight text-text-primary font-display">ReplyMind</span>
        </div>
        <h1 className="text-[40px] font-bold leading-none tracking-tight text-text-primary font-display">
          {isLogin ? "Sign In" : "Sign Up"}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {isLogin
            ? "Welcome back — let's get to your inbox."
            : "Secure your customer conversations with ReplyMind."}
        </p>
      </div>

      {isLogin ? <LoginForm /> : <SignupForm />}
    </motion.div>
  );
}
