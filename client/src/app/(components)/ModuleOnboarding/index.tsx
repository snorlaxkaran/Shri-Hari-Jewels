"use client";

import Link from "next/link";
import { Check, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
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
import { isMasterAdmin } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";

type ModuleOnboardingProps = {
  moduleId: JewelleryModuleId;
};

export default function ModuleOnboarding({ moduleId }: ModuleOnboardingProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const canManage = user ? isMasterAdmin(user.role) : false;

  useEffect(() => {
    void fetchOnboardingStatus().then(setStatus);
  }, [moduleId]);

  if (!status || !canManage) return null;

  const moduleState = status.modules[moduleId];
  if (!moduleState || moduleState.dismissed || moduleState.complete) return null;
  if (!status.profile.enabledModules.includes(moduleId)) return null;

  const steps = MODULE_STEPS[moduleId];
  const doneCount = steps.filter((s) => moduleState.steps[s.key]).length;
  const meta = MODULE_META[moduleId];

  const handleDismiss = async () => {
    await dismissModuleOnboarding(moduleId);
    setStatus(await fetchOnboardingStatus());
  };

  return (
    <div
      className="mb-6 rounded border overflow-hidden"
      style={{
        borderColor: "var(--border)",
        background: "linear-gradient(180deg, var(--accent-muted) 0%, var(--bg-surface) 100%)",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            Getting started
          </p>
          <h2 className="text-sm font-semibold mt-0.5">{meta.label}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {doneCount} of {steps.length} steps complete
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="text-xs px-2 py-1 rounded hover:bg-black/5"
            style={{ color: "var(--text-muted)" }}
          >
            {collapsed ? "Show" : "Hide"}
          </button>
          <button
            type="button"
            onClick={() => void handleDismiss()}
            className="p-1 rounded hover:bg-black/5"
            aria-label="Dismiss onboarding"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {steps.map((step) => {
            const done = moduleState.steps[step.key];
            return (
              <li key={step.key}>
                <Link
                  href={step.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] transition-colors group"
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{
                      backgroundColor: done ? "var(--color-success)" : "var(--bg-subtle)",
                      color: done ? "#fff" : "var(--text-muted)",
                      border: done ? "none" : "1px solid var(--border)",
                    }}
                  >
                    {done ? <Check size={14} /> : null}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className="block text-sm font-medium"
                      style={{
                        color: done ? "var(--text-muted)" : "var(--text-primary)",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {step.label}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {step.description}
                    </span>
                  </span>
                  {!done && (
                    <ChevronRight
                      size={16}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--accent)" }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
