"use client";

import { useEffect, useRef } from "react";

/** Runs `load` once when a context hook is first consumed (not when the provider mounts). */
export function useLazyProviderLoad(load: () => void | Promise<void>) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void load();
  }, [load]);
}
