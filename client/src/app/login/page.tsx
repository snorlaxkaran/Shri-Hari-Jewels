"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gem, Eye, EyeOff, Sparkles, Shield, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { consumeInactivityLogoutFlag } from "@/lib/auth/use-idle-logout";
import { getApiErrorMessage } from "@/lib/api/client";

const FEATURES = [
  {
    icon: <Sparkles size={16} strokeWidth={1.5} />,
    text: "Real-time inventory tracking",
  },
  {
    icon: <Shield size={16} strokeWidth={1.5} />,
    text: "Secure multi-branch management",
  },
  {
    icon: <BarChart3 size={16} strokeWidth={1.5} />,
    text: "Sales analytics & reporting",
  },
];

// Floating jewelry SVG ornaments for the left panel
function JewelryIllustration() {
  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      {/* Ambient glow circles */}
      <div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)",
          top: "30%",
          left: "60%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* Central ring SVG */}
      <svg
        viewBox="0 0 320 320"
        width="320"
        height="320"
        style={{
          position: "relative",
          zIndex: 1,
          filter: "drop-shadow(0 8px 32px rgba(29,78,216,0.22))",
        }}
        aria-hidden="true"
      >
        {/* Main ring band */}
        <ellipse cx="160" cy="192" rx="88" ry="24" fill="rgba(0,0,0,0.18)" />
        <path
          d="M72 160 Q72 220 160 220 Q248 220 248 160 Q248 130 160 128 Q72 126 72 160Z"
          fill="url(#ringGrad)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />
        {/* Ring top face */}
        <ellipse
          cx="160"
          cy="128"
          rx="88"
          ry="22"
          fill="url(#ringTopGrad)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
        />
        {/* Diamond setting on ring */}
        <polygon
          points="160,60 182,95 160,108 138,95"
          fill="url(#diamondGrad)"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1"
        />
        <polygon points="160,60 182,95 160,78" fill="rgba(255,255,255,0.35)" />
        <polygon points="160,60 138,95 160,78" fill="rgba(255,255,255,0.15)" />
        <polygon points="160,108 182,95 160,90" fill="rgba(0,0,0,0.15)" />
        {/* Diamond sparkles */}
        <line
          x1="160"
          y1="44"
          x2="160"
          y2="52"
          stroke="#e0eeff"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.9"
        />
        <line
          x1="152"
          y1="47"
          x2="168"
          y2="59"
          stroke="#e0eeff"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />
        <line
          x1="168"
          y1="47"
          x2="152"
          y2="59"
          stroke="#e0eeff"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Ring engrave lines */}
        <path
          d="M90 155 Q160 148 230 155"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
        <path
          d="M85 165 Q160 158 235 165"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
        {/* Defs */}
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="40%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0f1d32" />
          </linearGradient>
          <linearGradient id="ringTopGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="diamondGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="35%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating necklace top-left */}
      <svg
        viewBox="0 0 80 80"
        width="80"
        height="80"
        style={{
          position: "absolute",
          top: "12%",
          left: "8%",
          opacity: 0.75,
          filter: "drop-shadow(0 4px 12px rgba(139,92,246,0.3))",
          animation: "floatA 6s ease-in-out infinite",
        }}
        aria-hidden="true"
      >
        <path
          d="M20 8 Q40 2 60 8 Q65 30 40 38 Q15 30 20 8Z"
          fill="url(#neckGrad)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        <ellipse cx="40" cy="34" rx="10" ry="6" fill="rgba(167,139,250,0.6)" />
        <defs>
          <linearGradient id="neckGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating earring top-right */}
      <svg
        viewBox="0 0 60 100"
        width="48"
        height="80"
        style={{
          position: "absolute",
          top: "8%",
          right: "10%",
          opacity: 0.7,
          filter: "drop-shadow(0 4px 10px rgba(251,191,36,0.3))",
          animation: "floatB 5s ease-in-out infinite",
        }}
        aria-hidden="true"
      >
        <circle
          cx="30"
          cy="12"
          r="8"
          fill="url(#earGrad)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
        />
        <path
          d="M30 20 L20 50 L30 70 L40 50 Z"
          fill="url(#earDropGrad)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        <defs>
          <linearGradient id="earGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="earDropGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating bangle bottom-left */}
      <svg
        viewBox="0 0 90 90"
        width="80"
        height="80"
        style={{
          position: "absolute",
          bottom: "14%",
          left: "6%",
          opacity: 0.65,
          filter: "drop-shadow(0 4px 12px rgba(251,191,36,0.25))",
          animation: "floatC 7s ease-in-out infinite",
        }}
        aria-hidden="true"
      >
        <circle
          cx="45"
          cy="45"
          r="34"
          fill="none"
          stroke="url(#bangleGrad)"
          strokeWidth="10"
        />
        <circle
          cx="45"
          cy="45"
          r="34"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />
        <defs>
          <linearGradient id="bangleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating gem stone bottom-right */}
      <svg
        viewBox="0 0 70 80"
        width="60"
        height="68"
        style={{
          position: "absolute",
          bottom: "12%",
          right: "8%",
          opacity: 0.7,
          filter: "drop-shadow(0 4px 10px rgba(16,185,129,0.3))",
          animation: "floatD 5.5s ease-in-out infinite",
        }}
        aria-hidden="true"
      >
        <polygon
          points="35,5 65,25 65,55 35,75 5,55 5,25"
          fill="url(#gemGrad)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        <polygon points="35,5 65,25 35,35" fill="rgba(255,255,255,0.25)" />
        <polygon points="35,5 5,25 35,35" fill="rgba(255,255,255,0.1)" />
        <defs>
          <linearGradient id="gemGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>

      {/* Sparkle dots scattered */}
      {[
        { top: "22%", left: "28%", size: 4, opacity: 0.7, delay: "0s" },
        { top: "35%", left: "75%", size: 3, opacity: 0.5, delay: "1s" },
        { top: "65%", left: "22%", size: 3, opacity: 0.6, delay: "2s" },
        { top: "70%", left: "68%", size: 4, opacity: 0.5, delay: "0.5s" },
        { top: "18%", left: "55%", size: 2, opacity: 0.4, delay: "1.5s" },
      ].map((dot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            borderRadius: "50%",
            background: "#93c5fd",
            opacity: dot.opacity,
            animation: `sparkle 3s ease-in-out infinite ${dot.delay}`,
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Login failed. Check your credentials."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(-4deg); }
          50% { transform: translateY(-14px) rotate(2deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(-10px) rotate(-2deg); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(6deg); }
        }
        @keyframes floatD {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-16px) rotate(4deg); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.6); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .login-split {
          display: flex;
          min-height: 100vh;
          width: 100%;
        }
        /* Left panel */
        .login-left {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
          padding: 40px 48px;
          background: linear-gradient(145deg, #0c1829 0%, #0f2044 45%, #0c1435 100%);
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 900px) {
          .login-left { display: flex; }
        }
        .login-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 30% 20%, rgba(37,99,235,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 80%, rgba(139,92,246,0.12) 0%, transparent 60%);
          pointer-events: none;
        }
        /* Right panel */
        .login-right {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding: 32px 20px;
          background: var(--bg-page);
        }
        @media (min-width: 900px) {
          .login-right {
            width: 460px;
            min-width: 420px;
            flex-shrink: 0;
            padding: 48px 56px;
          }
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #93c5fd 0%,
            #e0f2fe 30%,
            #93c5fd 50%,
            #bfdbfe 70%,
            #93c5fd 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .feature-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(148,168,196,0.9);
          font-size: 13px;
          padding: 8px 0;
        }
        .feature-pill svg {
          flex-shrink: 0;
          color: #60a5fa;
        }
        .password-wrapper {
          position: relative;
        }
        .password-toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .password-toggle:hover { color: var(--text-secondary); }
        .login-submit {
          width: 100%;
          padding: 11px 16px;
          font-size: 14px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          border-radius: var(--radius);
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 60%, #1e40af 100%);
          color: #fff;
          transition: opacity 0.15s, box-shadow 0.15s, transform 0.1s;
          box-shadow: 0 2px 12px rgba(29,78,216,0.35);
          position: relative;
          overflow: hidden;
        }
        .login-submit:hover:not(:disabled) {
          box-shadow: 0 4px 20px rgba(29,78,216,0.45);
          transform: translateY(-1px);
        }
        .login-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .login-submit::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transform: translateX(-100%);
          transition: transform 0.4s;
        }
        .login-submit:hover:not(:disabled)::after {
          transform: translateX(100%);
        }
        .input-field-login {
          width: 100%;
          padding: 10px 14px;
          font-size: 14px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-radius: var(--radius);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          outline: none;
        }
        .input-field-login:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .divider-line {
          height: 1px;
          background: var(--border);
          flex: 1;
        }
      `}</style>

      <div className="login-split">
        {/* ── LEFT PANEL ── */}
        <div className="login-left">
          {/* Top logo */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                className="brand-mark"
                style={{ width: 40, height: 40, borderRadius: 10 }}
              >
                <Gem size={20} strokeWidth={1.5} />
              </div>
              <div>
                <p
                  style={{
                    color: "#fff",
                    fontFamily: "var(--font-display)",
                    fontSize: 20,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  Jewellery ERP
                </p>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: 11,
                    marginTop: 2,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  ERP Management
                </p>
              </div>
            </div>
          </div>

          {/* Center illustration */}
          <div
            style={{ flex: 1, position: "relative", zIndex: 2, minHeight: 0 }}
          >
            <JewelryIllustration />
          </div>

          {/* Bottom copy + features */}
          <div style={{ position: "relative", zIndex: 2 }}>
            <h2
              style={{
                fontSize: 28,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                lineHeight: 1.25,
                marginBottom: 8,
              }}
            >
              <span className="shimmer-text">Manage your jewellery</span>
              <br />
              <span style={{ color: "rgba(255,255,255,0.85)" }}>
                business with ease
              </span>
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: 13,
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              From inventory to invoicing — everything in one place.
            </p>

            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.07)",
                paddingTop: 20,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {FEATURES.map((f, i) => (
                <div key={i} className="feature-pill">
                  {f.icon}
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="login-right">
          <div style={{ width: "100%", maxWidth: 360 }}>
            {/* Mobile logo (only visible < 900px) */}
            <div
              style={{ textAlign: "center", marginBottom: 32 }}
              className="block"
              // hide on desktop via media query below
            >
              <style>{`
                @media (min-width: 900px) { .mobile-logo { display: none !important; } }
              `}</style>
              <div className="mobile-logo" style={{ display: "block" }}>
                <div
                  className="brand-mark"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    margin: "0 auto 12px",
                  }}
                >
                  <Gem size={24} strokeWidth={1.5} />
                </div>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    color: "var(--text-primary)",
                    fontWeight: 600,
                  }}
                >
                  Jewellery ERP
                </h1>
              </div>
            </div>

            {/* Form header */}
            <div style={{ marginBottom: 28 }}>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 6,
                }}
              >
                Welcome back
              </h2>
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                Sign in to your ERP account to continue.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {inactivityNotice && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: "#92400e",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "var(--radius)",
                    padding: "10px 14px",
                    lineHeight: 1.5,
                  }}
                >
                  You&apos;ve been logged out due to inactivity.
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                  }}
                >
                  User ID or email
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field-login"
                  autoComplete="username"
                  placeholder="workerkaran or you@example.com"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                  }}
                >
                  Password
                </label>
                <div className="password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field-login"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    style={{ paddingRight: 40 }}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: "#dc2626",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "var(--radius)",
                    padding: "10px 14px",
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-submit"
                disabled={submitting || loading}
              >
                {submitting ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ animation: "spin 0.8s linear infinite" }}
                    >
                      <path
                        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                        strokeLinecap="round"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>

              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
              `}</style>
            </form>

            {/* Footer */}
            <div
              style={{
                marginTop: 32,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div className="divider-line" />
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                Jewellery ERP
              </p>
              <div className="divider-line" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
