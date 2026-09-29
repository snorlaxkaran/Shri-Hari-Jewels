"use client";

import Link from "next/link";
import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import ErpNextAuthShell from "@/app/(components)/auth/ErpNextAuthShell";
import { registerTrial } from "@/lib/api/trial";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

export default function TrialStartPage() {
  const { signInWithSession, clearSession, loading: authLoading } = useAuth();
  const [sessionCleared, setSessionCleared] = useState(false);
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const didClear = useRef(false);

  useLayoutEffect(() => {
    if (didClear.current) return;
    didClear.current = true;
    clearSession();
    setSessionCleared(true);
  }, [clearSession]);

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const session = await registerTrial({
        phone,
        userId,
        password,
        name: name.trim() || undefined,
      });
      signInWithSession(
        session.token,
        session.refreshToken,
        session.user,
        session.needsSetup ? "/setup" : "/dashboard",
      );
    } catch (err) {
      const message = getApiErrorMessage(err, "Could not start trial.");
      setError(message);
      setSubmitting(false);
    }
  };

  if (!sessionCleared || authLoading) {
    return (
      <div className="erp-auth-page flex items-center justify-center">
        <Loader2 className="animate-spin text-[#6b7280]" size={24} />
      </div>
    );
  }

  return (
    <ErpNextAuthShell
      title="Start your free trial"
      subtitle="Register with mobile, user ID, and password. Sign in anytime with your user ID or mobile number."
      backHref="/onboarding"
      backLabel="Back"
      navAction={
        <Link href="/login" className="erp-auth-nav-link">
          Sign in
        </Link>
      }
    >
      {error ? (
        <div className="erp-alert-error">
          {error}
          {error.toLowerCase().includes("sign in") ? (
            <p className="mt-2 mb-0">
              <Link href="/login" className="text-[#b91c1c] font-medium underline">
                Go to sign in →
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleRegister}>
        <div className="erp-form-group">
          <label htmlFor="trial_phone">Mobile number</label>
          <div className="erp-input-row">
            <span className="erp-input-prefix">+91</span>
            <input
              id="trial_phone"
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="erp-form-group">
          <label htmlFor="trial_user_id">User ID</label>
          <input
            id="trial_user_id"
            required
            type="text"
            autoComplete="username"
            placeholder="e.g. rajesh or you@yourshop.com"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <p className="text-xs text-[#737373] mt-1 mb-0">
            Letters and numbers, or your business email. Used with password to sign in.
          </p>
        </div>

        <div className="erp-form-group">
          <label htmlFor="trial_name">Your name (optional)</label>
          <input
            id="trial_name"
            type="text"
            autoComplete="name"
            placeholder="Owner name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="erp-form-group">
          <label htmlFor="trial_password">Password</label>
          <div className="erp-password-wrap">
            <input
              id="trial_password"
              required
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="erp-toggle-password"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="erp-form-group">
          <label htmlFor="trial_password_confirm">Confirm password</label>
          <input
            id="trial_password_confirm"
            required
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={6}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
        </div>

        <button type="submit" className="erp-btn-primary" disabled={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitting ? "Creating account…" : "Start 2-month free trial"}
        </button>
      </form>

      <p className="mt-6 text-xs text-[#737373] leading-relaxed text-center">
        2-month free trial · No credit card · After trial, contact{" "}
        <a href="tel:+919971692727" className="text-[#525252] underline">
          +91 99716 92727
        </a>{" "}
        to continue
      </p>
    </ErpNextAuthShell>
  );
}
