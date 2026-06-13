"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    setActive(true);
    setProgress(18);

    timerRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + 8));
    }, 80);

    const done = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 200);
    }, 120);

    return () => {
      clearTimeout(done);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pathname]);

  if (!active && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5" style={{ backgroundColor: "var(--border)" }}>
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{ backgroundColor: "var(--accent)", width: `${progress}%` }}
      />
    </div>
  );
}
