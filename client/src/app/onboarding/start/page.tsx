"use client";

import { FormEvent, useLayoutEffect, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gem, Loader2 } from "lucide-react";
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

  // Always start fresh — an old login must not skip OTP or hijack the trial flow.
  useLayoutEffect(() => {
    if (didClear.current) return;
    didClear.current = true;
    clearSession();
    setSessionCleared(true);
  }, [clearSession]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
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
      const result = await sendTrialOtp(verifiedPhone);
      setResendIn(15);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not resend code."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!sessionCleared || authLoading) {
    return (
      <div className="min-h-screen bg-[#f4f5f6] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#737373]" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f6] flex flex-col">
      <header className="bg-white border-b border-[#e2e6ea] px-6 py-4 flex items-center justify-between">
        <Link href="/onboarding" className="flex items-center gap-2 text-[#171717] font-semibold">
          <span className="w-8 h-8 rounded-md bg-[#ff5858] flex items-center justify-center">
            <Gem size={16} className="text-white" />
          </span>
          Shri Hari Jewels
        </Link>
        <Link href="/login" className="text-sm text-[#525252] hover:text-[#171717]">
          Sign in
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-[#e2e6ea] rounded-lg shadow-sm p-8">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-xs text-[#737373] hover:text-[#171717] mb-6"
          >
            <ArrowLeft size={14} />
            Back
          </Link>

          <h1 className="text-xl font-semibold text-[#171717]">
            {step === "phone" ? "Start your 2-month free trial" : "Verify your mobile"}
          </h1>
          <p className="mt-2 text-sm text-[#525252] leading-relaxed">
            {step === "phone"
              ? "Enter your phone number. We’ll text you a 6-digit code on SMS — usually arrives in a few seconds."
              : `Enter the code sent to +91 ${verifiedPhone.slice(0, 5)} ${verifiedPhone.slice(5)}.`}
          </p>

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="font-medium text-[#404040]">Mobile number</span>
                <div className="mt-1.5 flex rounded-md border border-[#d4d4d4] overflow-hidden focus-within:ring-2 focus-within:ring-[#0089ff]/30 focus-within:border-[#0089ff]">
                  <span className="px-3 py-2.5 bg-[#fafafa] text-sm text-[#737373] border-r border-[#e5e5e5]">
                    +91
                  </span>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="98765 43210"
                    className="flex-1 px-3 py-2.5 text-sm outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-[#171717] hover:bg-[#262626] text-white text-sm font-medium py-2.5 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? "Sending…" : "Send verification code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="font-medium text-[#404040]">6-digit code</span>
                <input
                  ref={otpRef}
                  required
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="\d{6}"
                  autoComplete="one-time-code"
                  className="mt-1.5 w-full rounded-md border border-[#d4d4d4] px-3 py-2.5 text-sm tracking-[0.3em] text-center font-mono outline-none focus:ring-2 focus:ring-[#0089ff]/30 focus:border-[#0089ff]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-[#171717] hover:bg-[#262626] text-white text-sm font-medium py-2.5 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? "Verifying…" : "Verify & continue"}
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || submitting}
                onClick={() => void handleResend()}
                className="w-full text-sm text-[#525252] hover:text-[#171717] disabled:opacity-50"
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
              <button
                type="button"
                className="w-full text-sm text-[#737373] hover:text-[#171717]"
                onClick={() => {
                  setStep("phone");
                  setError("");
                  setOtp("");
                }}
              >
                Change number
              </button>
            </form>
          )}

          <p className="mt-6 text-xs text-[#737373] leading-relaxed">
            By continuing you agree to a 2-month trial of Shri Hari Jewels ERP. No credit card
            required.
          </p>
        </div>
      </main>
    </div>
  );
}
