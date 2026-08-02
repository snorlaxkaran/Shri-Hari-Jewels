"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import {
  dismissModuleOnboarding,
  fetchOnboardingStatus,
  type OnboardingStatus,
} from "@/lib/api/onboarding";
import {
  MODULE_META,
  MODULE_STEPS,
  type JewelleryModuleId,
} from "@/lib/onboarding/config";
import type { WorkspaceConfig } from "@/lib/onboarding/workspace-config";

type ModuleWorkspaceProps = {
  moduleId: JewelleryModuleId;
  config: WorkspaceConfig;
};

export default function ModuleWorkspace({ moduleId, config }: ModuleWorkspaceProps) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    void fetchOnboardingStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  const moduleState = status?.modules[moduleId];
  const steps = MODULE_STEPS[moduleId];
  const doneCount = steps.filter((s) => moduleState?.steps[s.key]).length;
  const showOnboarding =
    status?.completed &&
    moduleState &&
    !moduleState.complete &&
    !moduleState.dismissed;

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await dismissModuleOnboarding(moduleId);
      const updated = await fetchOnboardingStatus();
      setStatus(updated);
    } finally {
      setDismissing(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="ws-page page-content">
      <PageHeader title={config.title} subtitle={config.subtitle} />

      {showOnboarding ? (
        <div className="ws-onboarding-panel">
          <div className="ws-onboarding-head">
            <div>
              <h2>{MODULE_META[moduleId].label} setup</h2>
              <p className="ws-onboarding-progress mt-1">
                {doneCount} of {steps.length} steps complete — ERPNext-style guided checklist
              </p>
            </div>
            <button
              type="button"
              className="ws-dismiss-btn"
              disabled={dismissing}
              onClick={() => void handleDismiss()}
            >
              {dismissing ? "…" : "Dismiss checklist"}
            </button>
          </div>
          <ol className="ws-onboarding-steps">
            {steps.map((step) => {
              const done = Boolean(moduleState?.steps[step.key]);
              return (
                <li key={step.key} className="ws-onboarding-step">
                  <span
                    className={`ws-step-check ${done ? "ws-step-check-done" : ""}`}
                    aria-hidden
                  >
                    {done ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <div className="ws-step-body">
                    <p className={`ws-step-label ${done ? "ws-step-label-done" : ""}`}>
                      {step.label}
                    </p>
                    <p className="ws-step-desc">{step.description}</p>
                  </div>
                  {!done ? (
                    <Link href={step.href} className="ws-step-action">
                      Start →
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      <h2 className="ws-section-title">Your shortcuts</h2>
      <div className="ws-shortcuts">
        {config.shortcuts.map((shortcut) => (
          <Link key={shortcut.href} href={shortcut.href} className="ws-shortcut">
            <div className="ws-shortcut-label">{shortcut.label}</div>
            {shortcut.description ? (
              <div className="ws-shortcut-desc">{shortcut.description}</div>
            ) : null}
          </Link>
        ))}
      </div>

      <h2 className="ws-section-title">Reports &amp; masters</h2>
      <div className="ws-cards">
        {config.cards.map((card) => (
          <div key={card.title} className="ws-card">
            <div className="ws-card-title">{card.title}</div>
            <ul className="ws-card-links">
              {card.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span>{link.label}</span>
                    {link.onboard && !moduleState?.complete ? (
                      <span className="ws-onboard-badge">Setup</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
