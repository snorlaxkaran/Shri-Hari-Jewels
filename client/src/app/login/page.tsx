"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import ErpNextAuthShell from "@/app/(components)/auth/ErpNextAuthShell";
import { useAuth } from "@/lib/auth/auth-context";
import { consumeInactivityLogoutFlag } from "@/lib/auth/use-idle-logout";
import { getApiErrorMessage } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const { login, verify2FA, loading, user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inactivityNotice, setInactivityNotice] = useState(false);

  useEffect(() => {
    if (consumeInactivityLogoutFlag()) {
      setInactivityNotice(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace(
        user.role === "SuperAdmin" ? "/platform/companies" : "/dashboard",
      );
    }
  }, [loading, user, router]);

  if (!loading && user) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (tempToken) {
        await verify2FA(tempToken, totpCode);
        return;
      }
      const result = await login({ email: identifier, password });
      if ("requires2FA" in result && result.requires2FA) {
        setTempToken(result.tempToken);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed. Check your user ID and password."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ErpNextAuthShell
      title={tempToken ? "Two-factor authentication" : "Sign in"}
      subtitle={
        tempToken
          ? "Enter the 6-digit code from your authenticator app."
          : "Use your user ID, login email, or 10-digit mobile number."
      }
      navAction={
        <Link href="/onboarding/start" className="erp-auth-nav-link">
          New trial
        </Link>
      }
    >
      {inactivityNotice ? (
        <p
          className="erp-alert-error"
          style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}
        >
          You were signed out due to inactivity.
        </p>
      ) : null}

      {error ? <div className="erp-alert-error">{error}</div> : null}

      <form onSubmit={handleSubmit}>
        {!tempToken ? (
          <>
            <div className="erp-form-group">
              <label htmlFor="login_identifier">User ID, email, or mobile</label>
              <input
                id="login_identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="user id, email, or 9876543210"
              />
            </div>

            <div className="erp-form-group">
              <label htmlFor="login_password">Password</label>
              <div className="erp-password-wrap">
                <input
                  id="login_password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
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
          </>
        ) : (
          <div className="erp-form-group">
            <label htmlFor="totp_code">Authentication code</label>
            <input
              id="totp_code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </div>
        )}

        <button type="submit" className="erp-btn-primary" disabled={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitting ? "Please wait…" : tempToken ? "Verify" : "Sign in"}
        </button>
      </form>

      <div className="erp-auth-footer">
        {tempToken ? (
          <button
            type="button"
            className="text-[#e74c3c] bg-transparent border-none cursor-pointer text-sm"
            onClick={() => {
              setTempToken(null);
              setTotpCode("");
              setError("");
            }}
          >
            Back to sign in
          </button>
        ) : (
          <>
            First time?{" "}
            <Link href="/onboarding/start">Start 2-month free trial</Link>
          </>
        )}
      </div>
    </ErpNextAuthShell>
  );
}
