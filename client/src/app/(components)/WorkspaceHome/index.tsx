"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type WorkspaceShortcut = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
};

export type WorkspaceStat = {
  label: string;
  value: string;
};

type WorkspaceHomeProps = {
  title: string;
  subtitle: string;
  stats: WorkspaceStat[];
  shortcuts: WorkspaceShortcut[];
  action?: React.ReactNode;
  children?: React.ReactNode;
};

export default function WorkspaceHome({
  title,
  subtitle,
  stats,
  shortcuts,
  action,
  children,
}: WorkspaceHomeProps) {
  return (
    <div className="page-content">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--accent)" }}>
            Workspace
          </p>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        </div>
        {action}
      </div>

      {children}

      {stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[10px] mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="surface-card px-4 py-3">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </p>
              <p className="text-xl font-semibold mt-1 tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3">Shortcuts</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="surface-card p-4 hover:shadow-sm transition-shadow group block"
            >
              <item.icon size={20} className="mb-2" style={{ color: "var(--accent)" }} />
              <h3 className="text-sm font-medium group-hover:underline">{item.label}</h3>
              {item.description && (
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {item.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
