"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canAccessRoute,
  canManageCustomers,
  canManageExpenses,
  canViewHallmark,
  canViewRepairs,
  canViewStockTransfers,
} from "@/lib/auth/permissions";
import { fetchIncomingTransferCount } from "@/lib/api/inventory";
import { fetchFollowUpsDueCount } from "@/lib/api/leads";
import { fetchReadyForPickupCount } from "@/lib/api/repairs";
import { fetchHallmarkPendingCount } from "@/lib/api/hallmark";
import { fetchExpensesPendingCount } from "@/lib/api/expenses";
import { fetchOrganizationModules } from "@/lib/api/modules";
import { fetchStorefrontStats } from "@/lib/api/storefront-admin";
import type { JewelleryModuleId } from "@/lib/onboarding/config";
import { filterNavSections, type NavSection } from "@/lib/navigation";

export function useEnrichedNavSections(): NavSection[] {
  const { user } = useAuth();
  const [incomingCount, setIncomingCount] = useState<number | undefined>();
  const [followUpsDueCount, setFollowUpsDueCount] = useState<number | undefined>();
  const [readyForPickupCount, setReadyForPickupCount] = useState<number | undefined>();
  const [hallmarkPendingCount, setHallmarkPendingCount] = useState<number | undefined>();
  const [expensesPendingCount, setExpensesPendingCount] = useState<number | undefined>();
  const [enabledModules, setEnabledModules] = useState<JewelleryModuleId[] | undefined>();
  const [pendingWebOrders, setPendingWebOrders] = useState<number | undefined>();

  useEffect(() => {
    if (!user) return;
    fetchOrganizationModules()
      .then((data) => setEnabledModules(data.enabledModules))
      .catch(() => setEnabledModules(undefined));
  }, [user]);

  useEffect(() => {
    if (!user || !canViewStockTransfers(user.role)) return;
    fetchIncomingTransferCount()
      .then(setIncomingCount)
      .catch(() => setIncomingCount(undefined));
  }, [user]);

  useEffect(() => {
    if (!user || !canManageCustomers(user.role)) return;
    fetchFollowUpsDueCount()
      .then(setFollowUpsDueCount)
      .catch(() => setFollowUpsDueCount(undefined));
  }, [user]);

  useEffect(() => {
    if (!user || !canViewRepairs(user.role)) return;
    fetchReadyForPickupCount()
      .then(setReadyForPickupCount)
      .catch(() => setReadyForPickupCount(undefined));
  }, [user]);

  useEffect(() => {
    if (!user || !canViewHallmark(user.role)) return;
    fetchHallmarkPendingCount()
      .then(setHallmarkPendingCount)
      .catch(() => setHallmarkPendingCount(undefined));
  }, [user]);

  useEffect(() => {
    if (!user || !canManageExpenses(user.role)) return;
    fetchExpensesPendingCount()
      .then(setExpensesPendingCount)
      .catch(() => setExpensesPendingCount(undefined));
  }, [user]);

  useEffect(() => {
    if (!user || !canAccessRoute(user.role, "/storefront/orders")) return;
    fetchStorefrontStats()
      .then((s) => setPendingWebOrders(s.pendingOrders))
      .catch(() => setPendingWebOrders(undefined));
  }, [user]);

  return useMemo(() => {
    if (!user) return [];
    const base = filterNavSections(
      (href) => canAccessRoute(user.role, href),
      enabledModules,
    );
    return base.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.href === "/stock-transfer/incoming" && incomingCount != null && incomingCount > 0) {
          return { ...item, badge: incomingCount };
        }
        if (item.href === "/leads" && followUpsDueCount != null && followUpsDueCount > 0) {
          return { ...item, badge: followUpsDueCount };
        }
        if (item.href === "/repairs" && readyForPickupCount != null && readyForPickupCount > 0) {
          return { ...item, badge: readyForPickupCount };
        }
        if (item.href === "/hallmark" && hallmarkPendingCount != null && hallmarkPendingCount > 0) {
          return { ...item, badge: hallmarkPendingCount };
        }
        if (item.href === "/expenses" && expensesPendingCount != null && expensesPendingCount > 0) {
          return { ...item, badge: expensesPendingCount };
        }
        if (
          item.href === "/storefront/orders" &&
          pendingWebOrders != null &&
          pendingWebOrders > 0
        ) {
          return { ...item, badge: pendingWebOrders };
        }
        return item;
      }),
    }));
  }, [
    user,
    incomingCount,
    followUpsDueCount,
    readyForPickupCount,
    hallmarkPendingCount,
    expensesPendingCount,
    enabledModules,
    pendingWebOrders,
  ]);
}
