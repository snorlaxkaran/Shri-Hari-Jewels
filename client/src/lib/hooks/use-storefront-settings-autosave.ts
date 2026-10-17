"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  updateStorefrontAdminSettings,
  type UpdateStorefrontSettingsInput,
} from "@/lib/api/storefront-admin";
import { getApiErrorMessage } from "@/lib/api/client";
import type { StorefrontAdminSettings } from "@/lib/storefront/types";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export function useStorefrontSettingsAutosave(
  onSaved?: (settings: StorefrontAdminSettings) => void,
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const readyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  const markReady = useCallback(() => {
    readyRef.current = true;
    setStatus("idle");
  }, []);

  const flushSave = useCallback(async (input: UpdateStorefrontSettingsInput) => {
    if (!readyRef.current) return null;
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    setStatus("saving");
    setError("");
    try {
      const updated = await updateStorefrontAdminSettings(input);
      setLastSavedAt(new Date());
      setStatus("saved");
      onSaved?.(updated);
      return updated;
    } catch (err) {
      setStatus("error");
      setError(getApiErrorMessage(err, "Could not save store settings."));
      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, [onSaved]);

  const scheduleSave = useCallback(
    (input: UpdateStorefrontSettingsInput, debounceMs = 600) => {
      if (!readyRef.current) return;
      setStatus("pending");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flushSave(input);
      }, debounceMs);
    },
    [flushSave],
  );

  const saveNow = useCallback(
    (input: UpdateStorefrontSettingsInput) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      return flushSave(input);
    },
    [flushSave],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return {
    status,
    error,
    lastSavedAt,
    markReady,
    scheduleSave,
    saveNow,
  };
}
