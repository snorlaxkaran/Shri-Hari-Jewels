"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Gem } from "lucide-react";
import {
  completeOnboarding,
  fetchOnboardingStatus,
  saveSetupProfile,
  type OnboardingStatus,
} from "@/lib/api/onboarding";
import { fetchSettings } from "@/lib/api/settings";
import {
  BUSINESS_TYPES,
  CURRENT_SYSTEM_OPTIONS,
  IMPLEMENTING_FOR_OPTIONS,
  JEWELLERY_MODULES,
  MODULE_META,
  MODULE_STEPS,
  TEAM_SIZE_OPTIONS,
  modulesForBusinessType,
  type JewelleryModuleId,
} from "@/lib/onboarding/config";

const SLIDES = ["persona", "organization", "review"] as const;
type SlideId = (typeof SLIDES)[number];

const DEFAULT_STATUS: OnboardingStatus = {
  completed: false,
  profile: {
    implementingFor: null,
    teamSize: null,
    businessType: null,
    currentSystem: null,
    enabledModules: ["inventory", "sales"],
    loadDemoData: false,
  },
  steps: {
    businessInfo: false,
    gstConfigured: false,
    branchCreated: false,
    openingStock: false,
    personaComplete: false,
  },
  modules: {},
};

export default function SetupWizardPage() {
  const router = useRouter();
  const [slide, setSlide] = useState<SlideId>("persona");
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    implementingFor: "",
    teamSize: "",
    businessType: "",
    currentSystem: "",
    enabledModules: [] as JewelleryModuleId[],
    businessName: "",
    gstNumber: "",
    loadDemoData: false,
  });

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchOnboardingStatus(), fetchSettings()])
      .then(([s, settings]) => {
        if (cancelled) return;
        setStatus(s);
        if (s.completed) {
          router.replace("/dashboard");
          return;
        }
        setForm((f) => ({
          ...f,
          implementingFor: s.profile.implementingFor ?? "",
          teamSize: s.profile.teamSize ?? "",
          businessType: s.profile.businessType ?? "",
          currentSystem: s.profile.currentSystem ?? "",
          enabledModules: s.profile.enabledModules.length
            ? s.profile.enabledModules
            : modulesForBusinessType(s.profile.businessType ?? ""),
          businessName:
            settings.businessName !== "Jewellery Business"
              ? settings.businessName
              : "",
          gstNumber: settings.gstNumber ?? "",
          loadDemoData: s.profile.loadDemoData,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            completed: false,
            profile: {
              implementingFor: null,
              teamSize: null,
              businessType: null,
              currentSystem: null,
              enabledModules: ["inventory", "sales"],
              loadDemoData: false,
            },
            steps: {
              businessInfo: false,
              gstConfigured: false,
              branchCreated: false,
              openingStock: false,
              personaComplete: false,
            },
            modules: {},
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const activeStatus = status ?? DEFAULT_STATUS;
  const slideIndex = SLIDES.indexOf(slide);
  const progress = ((slideIndex + 1) / SLIDES.length) * 100;

  const toggleModule = (id: JewelleryModuleId) => {
    setForm((f) => ({
      ...f,
      enabledModules: f.enabledModules.includes(id)
        ? f.enabledModules.filter((m) => m !== id)
        : [...f.enabledModules, id],
    }));
  };

  const applyBusinessTypeModules = (businessType: string) => {
    setForm((f) => ({
      ...f,
      businessType,
      enabledModules: modulesForBusinessType(businessType),
    }));
  };

  const validateSlide = (): boolean => {
    setError("");
    if (slide === "persona") {
      if (!form.implementingFor || !form.teamSize || !form.businessType || !form.currentSystem) {
        setError("Please answer all questions about your business.");
        return false;
      }
      if (form.enabledModules.length === 0) {
        setError("Select at least one module to use.");
        return false;
      }
    }
    if (slide === "organization") {
      if (!form.businessName.trim()) {
        setError("Business name is required.");
        return false;
      }
    }
    return true;
  };

  const persistProfile = async () => {
    const updated = await saveSetupProfile({
      implementingFor: form.implementingFor,
      teamSize: form.teamSize,
      businessType: form.businessType,
      currentSystem: form.currentSystem,
      enabledModules: form.enabledModules,
      businessName: form.businessName.trim() || undefined,
      gstNumber: form.gstNumber.trim() || undefined,
      loadDemoData: form.loadDemoData,
    });
    setStatus(updated);
  };

  const goNext = async () => {
    if (!validateSlide()) return;
    setSubmitting(true);
    try {
      if (slide === "organization") {
        await persistProfile();
      }
      const next = SLIDES[slideIndex + 1];
      if (next) setSlide(next);
    } catch {
      setError("Could not save setup. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    setError("");
    const prev = SLIDES[slideIndex - 1];
    if (prev) setSlide(prev);
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setError("");
    try {
      await persistProfile();
      await completeOnboarding();
      router.replace("/dashboard");
    } catch {
      setError("Could not complete setup. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="setup-wizard-shell">
      <header className="setup-wizard-header">
        <div className="flex items-center gap-2">
          <div className="setup-wizard-logo">
            <Gem size={18} />
          </div>
          <span className="text-sm font-semibold">Shri Hari Jewels</span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Step {slideIndex + 1} of {SLIDES.length}
        </p>
      </header>

      <div className="setup-wizard-progress">
        <div className="setup-wizard-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <main className="setup-wizard-main">
        <div className="setup-wizard-card">
          {slide === "persona" && (
            <>
              <h1 className="setup-wizard-title">A little about your jewellery business</h1>
              <p className="setup-wizard-subtitle">
                A few quick questions so we can set things up the way you work.
              </p>

              <div className="setup-wizard-fields">
                <label className="setup-field">
                  <span>Who are you setting this up for?</span>
                  <select
                    value={form.implementingFor}
                    onChange={(e) => setForm((f) => ({ ...f, implementingFor: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {IMPLEMENTING_FOR_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>

                <label className="setup-field">
                  <span>How big is the team?</span>
                  <select
                    value={form.teamSize}
                    onChange={(e) => setForm((f) => ({ ...f, teamSize: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {TEAM_SIZE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>

                <label className="setup-field">
                  <span>What kind of jewellery business?</span>
                  <select
                    value={form.businessType}
                    onChange={(e) => applyBusinessTypeModules(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {BUSINESS_TYPES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>

                <label className="setup-field">
                  <span>What do you use today?</span>
                  <select
                    value={form.currentSystem}
                    onChange={(e) => setForm((f) => ({ ...f, currentSystem: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {CURRENT_SYSTEM_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>

                <div className="setup-field">
                  <span>Modules you plan to use</span>
                  <div className="setup-module-grid">
                    {JEWELLERY_MODULES.map((id) => {
                      const meta = MODULE_META[id];
                      const checked = form.enabledModules.includes(id);
                      return (
                        <label
                          key={id}
                          className={`setup-module-tile ${checked ? "setup-module-tile-active" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleModule(id)}
                          />
                          <span className="font-medium text-sm">{meta.label}</span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {meta.description}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {slide === "organization" && (
            <>
              <h1 className="setup-wizard-title">Set up your organisation</h1>
              <p className="setup-wizard-subtitle">
                Basic details for billing, invoices, and your team workspace.
              </p>

              <div className="setup-wizard-fields">
                <label className="setup-field">
                  <span>Business / showroom name *</span>
                  <input
                    required
                    value={form.businessName}
                    onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                    placeholder="e.g. Shree Hari Jewellers"
                  />
                </label>

                <label className="setup-field">
                  <span>GSTIN (optional now, required for tax invoices)</span>
                  <input
                    value={form.gstNumber}
                    onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value.toUpperCase() }))}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </label>

                <label className="setup-module-tile flex-row items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.loadDemoData}
                    onChange={(e) => setForm((f) => ({ ...f, loadDemoData: e.target.checked }))}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-sm block">Load sample jewellery data</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Adds demo bangle and ring SKUs so you can explore inventory and sales. You can
                      delete them later.
                    </span>
                  </span>
                </label>
              </div>
            </>
          )}

          {slide === "review" && (
            <>
              <h1 className="setup-wizard-title">You&apos;re ready to go</h1>
              <p className="setup-wizard-subtitle">
                Complete these quick steps from each workspace — we&apos;ll guide you inside the ERP.
              </p>

              <ul className="space-y-4 mt-6">
                {form.enabledModules.map((moduleId) => {
                  const meta = MODULE_META[moduleId];
                  const steps = MODULE_STEPS[moduleId];
                  const moduleState = activeStatus.modules[moduleId];
                  const done = steps.filter((s) => moduleState?.steps[s.key]).length;
                  return (
                    <li key={moduleId} className="surface-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-sm">{meta.label}</h3>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {done}/{steps.length} done
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {steps.slice(0, 3).map((step) => (
                          <li key={step.key} className="flex items-center gap-2 text-xs">
                            {moduleState?.steps[step.key] ? (
                              <Check size={14} style={{ color: "var(--color-success)" }} />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border" style={{ borderColor: "var(--border)" }} />
                            )}
                            <span style={{ color: "var(--text-secondary)" }}>{step.label}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {error && (
            <p className="mt-4 text-sm px-3 py-2 rounded border border-red-200 bg-red-50 text-red-700">
              {error}
            </p>
          )}

          <div className="setup-wizard-actions">
            {slideIndex > 0 ? (
              <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={goBack}>
                <ChevronLeft size={16} className="inline mr-1" />
                Back
              </button>
            ) : (
              <span />
            )}

            {slide === "review" ? (
              <button
                type="button"
                className="btn-primary px-6 py-2 text-sm"
                disabled={submitting}
                onClick={() => void handleFinish()}
              >
                {submitting ? "Finishing…" : "Go to dashboard"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary px-6 py-2 text-sm"
                disabled={submitting}
                onClick={() => void goNext()}
              >
                {submitting ? "Saving…" : "Continue"}
                <ChevronRight size={16} className="inline ml-1" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
