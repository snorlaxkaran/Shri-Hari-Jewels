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
    <div className="bg-[#171717] text-white text-xs sm:text-sm">
      <div className="erp-marketing-shell h-9 flex items-center justify-center gap-2">
        <Link href={item.href} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <span className="font-semibold">{item.label}</span>
          <span className="text-[#a3a3a3] hidden sm:inline">/</span>
          <span className="text-[#a3a3a3] hidden sm:inline">{item.detail}</span>
        </Link>
        <div className="hidden sm:flex items-center gap-1 ml-4">
          {ANNOUNCEMENTS.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-label={`Show announcement: ${a.label}`}
              onClick={() => setIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === index ? "bg-[#e74c3c]" : "bg-[#525252]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
