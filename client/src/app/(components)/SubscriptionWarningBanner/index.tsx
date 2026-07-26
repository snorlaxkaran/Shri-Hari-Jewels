"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { fetchBillingInfo } from "@/lib/api/billing";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageSettings } from "@/lib/auth/permissions";

const WARNING_DAYS = 14;
const DISMISS_KEY_PREFIX = "shj_sub_banner_dismiss_";

const daysUntil = (isoDate: string): number => {
  const end = new Date(isoDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export default function SubscriptionWarningBanner() {
  const { user } = useAuth();
  const pathname = usePathname();
  const isAdmin = user ? canManageSettings(user.role) : false;
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (pathname === "/billing") return;

    fetchBillingInfo()
      .then((data) => {
        const remaining = daysUntil(data.subscription.currentPeriodEnd);
        if (remaining > 0 && remaining <= WARNING_DAYS) {
          setDaysLeft(remaining);
          const today = new Date().toISOString().slice(0, 10);
          const dismissKey = `${DISMISS_KEY_PREFIX}${today}`;
          setDismissed(sessionStorage.getItem(dismissKey) === "1");
        }
      })
      .catch((err) => {
        if (getApiErrorMessage(err).includes("402")) return;
      });
  }, [pathname]);

  if (daysLeft == null || dismissed) return null;

  const dismissForToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    sessionStorage.setItem(`${DISMISS_KEY_PREFIX}${today}`, "1");
    setDismissed(true);
  };

  if (!isAdmin) return null;

  return (
    <div className="mx-6 mt-3 mb-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="flex-shrink-0" />
        <span>
          Your subscription ends in{" "}
          <strong>{daysLeft} day{daysLeft === 1 ? "" : "s"}</strong>.{" "}
          <Link href="/billing" className="font-medium underline hover:no-underline">
            Contact us to renew →
          </Link>
        </span>
      </div>
      <button
        type="button"
        onClick={dismissForToday}
        className="p-1 rounded hover:bg-amber-100 flex-shrink-0"
        aria-label="Dismiss for today"
      >
        <X size={16} />
      </button>
    </div>
  );
}
