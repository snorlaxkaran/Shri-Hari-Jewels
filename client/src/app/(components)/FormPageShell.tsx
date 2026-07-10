"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";

type FormPageShellProps = {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  error?: string;
  onBackClick?: () => void;
  children: React.ReactNode;
};

export default function FormPageShell({
  backHref,
  backLabel,
  title,
  subtitle,
  error,
  onBackClick,
  children,
}: FormPageShellProps) {
  return (
    <div className="space-y-6">
      {onBackClick ? (
        <button
          type="button"
          onClick={onBackClick}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </button>
      ) : (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
      )}

      <PageHeader title={title} subtitle={subtitle} />

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {children}
    </div>
  );
}
