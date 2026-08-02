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
        <div className="mkt-form-group mb-0">
          <label htmlFor="demo-business">Business name *</label>
          <input
            id="demo-business"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
        <div className="mkt-form-group mb-0">
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
        <div className="mkt-form-group mb-0">
          <label htmlFor="demo-phone">Mobile *</label>
          <input
            id="demo-phone"
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="mkt-form-group mb-0">
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
        <div className="mkt-form-group mb-0">
          <label htmlFor="demo-city">City</label>
          <input id="demo-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="mkt-form-group mb-0">
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
      <div className="mkt-form-group mb-0">
        <label htmlFor="demo-message">Tell us about your setup</label>
        <textarea
          id="demo-message"
          rows={3}
          className="mkt-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Branches, production floor, current software…"
        />
      </div>
      {error && <div className="mkt-alert-error">{error}</div>}
      {success && <div className="mkt-alert-success">{success}</div>}
      <button type="submit" className="mkt-btn mkt-btn-dark mt-2" disabled={loading}>
        {loading ? "Sending…" : "Request demo"}
      </button>
    </form>
  );
}

export function ImplementationSection() {
  return (
    <section className="mkt-section mkt-section-alt">
      <div className="mkt-shell-wide">
        <p className="mkt-eyebrow text-center">Get started</p>
        <h2 className="mkt-display mkt-section-title mt-3">Start trial or request a demo</h2>
        <p className="mkt-section-desc">
          Explore on your own with a 2-month trial, or tell us about your setup for a guided
          walkthrough.
        </p>

        <div className="grid lg:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto">
          {IMPLEMENTATION_PATHS.map((path) => (
            <div key={path.id} className="mkt-card">
              <p className="mkt-eyebrow">{path.subtitle}</p>
              <h3 className="mt-2 text-xl font-semibold">{path.title}</h3>
              <p className="mt-3 text-sm mkt-text-muted leading-relaxed">{path.description}</p>
              {path.id === "self-serve" ? (
                <Link href={path.href} className="mkt-btn mkt-btn-dark mt-6">
                  {path.cta}
                </Link>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mkt-card mt-8 max-w-2xl mx-auto">
          <h3 className="font-semibold mb-4">Request a demo</h3>
          <DemoRequestForm />
        </div>
      </div>
    </section>
  );
}
