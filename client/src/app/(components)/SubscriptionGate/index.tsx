"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SubscriptionLockout from "@/app/(components)/SubscriptionLockout";
import {
  getSubscriptionLockout,
  SUBSCRIPTION_LOCKOUT_EVENT,
  clearSubscriptionLockout,
  type SubscriptionExpiredPayload,
} from "@/lib/subscription-lockout";

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onBillingPage = pathname === "/billing";
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (onBillingPage) {
      clearSubscriptionLockout();
      setLocked(false);
      return;
    }
    setLocked(!!getSubscriptionLockout());

    const onLockout = (event: Event) => {
      const detail = (event as CustomEvent<SubscriptionExpiredPayload | null>).detail;
      setLocked(detail != null || !!getSubscriptionLockout());
    };

    window.addEventListener(SUBSCRIPTION_LOCKOUT_EVENT, onLockout);
    return () => window.removeEventListener(SUBSCRIPTION_LOCKOUT_EVENT, onLockout);
  }, [onBillingPage]);

  if (onBillingPage) {
    return <>{children}</>;
  }

  if (locked) {
    return <SubscriptionLockout />;
  }

  return <>{children}</>;
}
