"use client";

import { useState } from "react";
import Link from "next/link";
import { BUSINESS_TYPES } from "@/lib/onboarding/config";
import { IMPLEMENTATION_PATHS } from "@/lib/onboarding/marketing-content";
import { submitDemoRequest } from "@/lib/api/demo-requests";

export function DemoRequestForm() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await submitDemoRequest({
        businessName,
        contactName,
        phone,
        email: email || undefined,
        city: city || undefined,
        businessType: businessType || undefined,
        message: message || undefined,
      });
      setSuccess(result.message);
      setBusinessName("");
      setContactName("");
      setPhone("");
      setEmail("");
      setCity("");
      setBusinessType("");
      setMessage("");
    } catch {
      setError("Could not submit — please try again or WhatsApp us directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="erp-form-group mb-0">
          <label htmlFor="demo-business">Business name *</label>
          <input
            id="demo-business"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
        <div className="erp-form-group mb-0">
          <label htmlFor="demo-contact">Your name *</label>
          <input
            id="demo-contact"
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="erp-form-group mb-0">
          <label htmlFor="demo-phone">Mobile *</label>
          <input
            id="demo-phone"
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="erp-form-group mb-0">
          <label htmlFor="demo-email">Email</label>
          <input
            id="demo-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="erp-form-group mb-0">
          <label htmlFor="demo-city">City</label>
          <input id="demo-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="erp-form-group mb-0">
          <label htmlFor="demo-type">Business type</label>
          <select
            id="demo-type"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          >
            <option value="">Select…</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="erp-form-group mb-0">
        <label htmlFor="demo-message">Tell us about your setup</label>
        <textarea
          id="demo-message"
          rows={3}
          className="erp-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Branches, production floor, current software…"
        />
      </div>
      {error && <div className="erp-alert-error">{error}</div>}
      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2">
          {success}
        </div>
      )}
      <button type="submit" className="erp-btn-primary w-auto px-6" disabled={loading}>
        {loading ? "Sending…" : "Request demo"}
      </button>
    </form>
  );
}

export function ImplementationSection() {
  return (
    <section id="request-demo" className="py-16 lg:py-24 bg-white">
      <div className="erp-marketing-shell">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] mb-3">
            Implementations
          </p>
          <h2 className="text-2xl sm:text-4xl font-semibold">Pick your implementation journey</h2>
          <p className="mt-3 text-[#525252]">
            Start a trial on your own, or request a guided walkthrough for multi-branch and
            manufacturing setups.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {IMPLEMENTATION_PATHS.map((path) => (
            <div
              key={path.id}
              className={`erp-marketing-card ${path.primary ? "border-[#e74c3c] bg-[#fffafa]" : ""}`}
            >
              <p className="text-xs font-medium uppercase text-[#e74c3c]">{path.subtitle}</p>
              <h3 className="mt-2 text-xl font-semibold">{path.title}</h3>
              <p className="mt-3 text-sm text-[#525252] leading-relaxed">{path.description}</p>
              {path.id === "self-serve" ? (
                <Link
                  href={path.href}
                  className="inline-flex mt-6 erp-btn-primary w-auto px-6 py-2.5"
                >
                  {path.cta}
                </Link>
              ) : null}
            </div>
          ))}

          <div className="lg:col-span-2 erp-marketing-card">
            <h3 className="font-semibold mb-4">Request a demo</h3>
            <DemoRequestForm />
          </div>
        </div>
      </div>
    </section>
  );
}
