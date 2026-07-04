"use client";

import { useEffect } from "react";

export const INACTIVITY_LOGOUT_FLAG = "shj_inactivity_logout";

/** Default idle timeout for retail counter use (15 minutes). */
export const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

export function useIdleLogout(
  logout: () => void,
  enabled: boolean,
  timeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem(INACTIVITY_LOGOUT_FLAG, "1");
        logout();
      }, timeoutMs);
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [logout, enabled, timeoutMs]);
}

export const consumeInactivityLogoutFlag = (): boolean => {
  if (typeof window === "undefined") return false;
  const flagged = sessionStorage.getItem(INACTIVITY_LOGOUT_FLAG) === "1";
  if (flagged) sessionStorage.removeItem(INACTIVITY_LOGOUT_FLAG);
  return flagged;
};
