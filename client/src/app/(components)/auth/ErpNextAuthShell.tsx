"use client";

import Link from "next/link";
import { Gem } from "lucide-react";
import "@/styles/erpnext-auth.css";

type ErpNextAuthShellProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  navAction?: React.ReactNode;
  children: React.ReactNode;
};

export default function ErpNextAuthShell({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  navAction,
  children,
}: ErpNextAuthShellProps) {
  return (
    <div className="erp-auth-page">
      <header className="erp-auth-navbar">
        <Link href="/onboarding" className="erp-auth-brand">
          <span className="erp-auth-brand-mark">
            <Gem size={16} />
          </span>
          Shri Hari Jewels
        </Link>
        {navAction}
      </header>

      <div className="erp-auth-content">
        <div className="erp-page-card">
          {backHref ? (
            <Link href={backHref} className="erp-back-link">
              ← {backLabel}
            </Link>
          ) : null}

          <div className="erp-page-card-head">
            <div className="erp-auth-brand-mark app-logo mx-auto mb-3">
              <Gem size={18} />
            </div>
            <h1 className="erp-page-card-title">{title}</h1>
            {subtitle ? <p className="erp-page-card-subtitle">{subtitle}</p> : null}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
