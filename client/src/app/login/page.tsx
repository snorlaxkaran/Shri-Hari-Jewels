"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gem } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2.5 text-sm";
const labelClass = "text-xs block mb-1 font-medium";
const labelStyle = { color: "var(--text-muted)" };

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, user } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);
  const [email, setEmail] = useState("admin@shreehari.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed. Check your credentials."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-xl brand-mark mb-4">
            <Gem size={24} strokeWidth={1.5} />
          </div>
          <h1
            className="text-3xl font-display"
            style={{ color: "var(--text-primary)" }}
          >
            Shree Hari Jewels
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Sign in to your ERP account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="surface-card p-6 space-y-4">
          <div>
            <label className={labelClass} style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            className="btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p
          className="text-[11px] text-center mt-6 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          Demo: admin@shreehari.com / admin123
          <br />
          sales@shreehari.com / sales123 · karigar@shreehari.com / karigar123
        </p>
      </div>
    </div>
  );
}
