"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ANNOUNCEMENTS } from "@/lib/onboarding/marketing-content";

export function AnnouncementBanner() {
  const [index, setIndex] = useState(0);
  const item = ANNOUNCEMENTS[index];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % ANNOUNCEMENTS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mkt-announcement">
      <div className="mkt-shell mkt-announcement-inner">
        <Link href={item.href} className="mkt-announcement-link">
          <span className="font-semibold">{item.label}</span>
          <span className="mkt-announcement-sep">/</span>
          <span className="mkt-announcement-detail">{item.detail}</span>
        </Link>
        <div className="mkt-announcement-dots">
          {ANNOUNCEMENTS.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-label={`Show announcement: ${a.label}`}
              onClick={() => setIndex(i)}
              className={`mkt-dot ${i === index ? "mkt-dot-active" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
