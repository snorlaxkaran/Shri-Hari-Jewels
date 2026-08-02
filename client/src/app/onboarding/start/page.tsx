"use client";

import Link from "next/link";
import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import ErpNextAuthShell from "@/app/(components)/auth/ErpNextAuthShell";
import { sendTrialOtp, verifyTrialOtp } from "@/lib/api/trial";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

type Step = "phone" | "otp";

export default function TrialStartPage() {
  const { signInWithSession, clearSession, loading: authLoading } = useAuth();
  const [sessionCleared, setSessionCleared] = useState(false);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);
  const didClear = useRef(false);

  useLayoutEffect(() => {
    if (didClear.current) return;
    didClear.current = true;
    clearSession();
    setSessionCleared(true);
  }, [clearSession]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await sendTrialOtp(phone);
      setVerifiedPhone(result.phone);
      setStep("otp");
      setResendIn(15);
      setOtp("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not send code."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const session = await verifyTrialOtp(verifiedPhone, otp);
      signInWithSession(
        session.token,
        session.refreshToken,
        session.user,
        session.needsSetup ? "/setup" : "/dashboard",
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Verification failed."));
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setSubmitting(true);
    setError("");
    try {
      await sendTrialOtp(verifiedPhone);
      setResendIn(15);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not resend code."));
    } finally {
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
      title={step === "phone" ? "Start your free trial" : "Verify your mobile"}
      subtitle={
        step === "phone"
          ? "One-time phone verification. After setup you'll sign in with email and password."
          : `Enter the 6-digit code sent to +91 ${verifiedPhone.slice(0, 5)} ${verifiedPhone.slice(5)}.`
      }
      backHref={step === "phone" ? "/onboarding" : undefined}
      backLabel="Back"
      navAction={
        <Link href="/login" className="text-sm text-[#525252] hover:text-[#171717]">
          Sign in
        </Link>
      }
    >
      {error ? <p className="erp-alert-error">{error}</p> : null}

      {step === "phone" ? (
        <form onSubmit={handleSendOtp}>
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

          <button type="submit" className="erp-btn-primary" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? "Sending…" : "Send verification code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <div className="erp-form-group">
            <label htmlFor="trial_otp">6-digit code</label>
            <input
              ref={otpRef}
              id="trial_otp"
              required
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="\d{6}"
              autoComplete="one-time-code"
              className="text-center tracking-[0.3em] font-mono"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>

          <button
            type="submit"
            className="erp-btn-primary"
            disabled={submitting || otp.length !== 6}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? "Verifying…" : "Verify & continue"}
          </button>

          <div className="erp-auth-footer mt-3 space-y-2">
            <button
              type="button"
              disabled={resendIn > 0 || submitting}
              onClick={() => void handleResend()}
              className="block w-full text-sm bg-transparent border-none cursor-pointer disabled:opacity-50"
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
            <button
              type="button"
              className="block w-full text-sm bg-transparent border-none cursor-pointer text-[#737373]"
              onClick={() => {
                setStep("phone");
                setError("");
                setOtp("");
              }}
            >
              Change number
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-xs text-[#737373] leading-relaxed text-center">
        2-month free trial · No credit card · Phone verification is only needed once
      </p>
    </ErpNextAuthShell>
  );
}
