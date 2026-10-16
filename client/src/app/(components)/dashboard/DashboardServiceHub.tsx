"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessRoute, isMasterAdmin } from "@/lib/auth/permissions";
import { NAV_SECTION_DESCRIPTIONS } from "@/lib/navigation/section-meta";
import { useEnrichedNavSections } from "@/lib/navigation/use-enriched-nav-sections";

export default function DashboardServiceHub() {
  const pathname = usePathname();
  const { user } = useAuth();
  const sections = useEnrichedNavSections();

  if (!user || sections.length === 0) {
    return null;
  }

  const setupLink =
    isMasterAdmin(user.role) && canAccessRoute(user.role, "/setup")
      ? { label: "Setup wizard", href: "/setup" }
      : null;

  return (
    <section className="dashboard-services" aria-labelledby="dashboard-services-title">
      <div className="dashboard-services-head">
        <div className="flex items-start gap-3">
          <span className="dashboard-services-head-icon" aria-hidden>
            <LayoutGrid size={22} />
          </span>
          <div>
            <h2 id="dashboard-services-title" className="dashboard-services-title">
              All services
            </h2>
            <p className="dashboard-services-subtitle">
              Everything from the menu, grouped by area — open inventory, website, sales, and more
              from here.
            </p>
          </div>
        </div>
        {setupLink ? (
          <Link href={setupLink.href} className="dashboard-services-setup-link">
            {setupLink.label}
            <ArrowRight size={16} aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="dashboard-services-grid">
        {sections.map((section) => {
          const description = NAV_SECTION_DESCRIPTIONS[section.title];
          const workspaceHref = section.workspaceHref;
          const canOpenWorkspace =
            workspaceHref && canAccessRoute(user.role, workspaceHref);

          return (
            <article key={section.title} className="dashboard-service-box surface-card">
              <header className="dashboard-service-box-head">
                <div>
                  {canOpenWorkspace ? (
                    <Link href={workspaceHref} className="dashboard-service-box-title-link">
                      {section.title}
                    </Link>
                  ) : (
                    <h3 className="dashboard-service-box-title">{section.title}</h3>
                  )}
                  {description ? (
                    <p className="dashboard-service-box-desc">{description}</p>
                  ) : null}
                </div>
                {canOpenWorkspace ? (
                  <Link href={workspaceHref} className="dashboard-service-box-workspace">
                    Workspace
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                ) : null}
              </header>
              <ul className="dashboard-service-links">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="dashboard-service-link"
                        data-active={isActive ? "true" : undefined}
                      >
                        <span className="dashboard-service-link-icon">{item.icon}</span>
                        <span className="dashboard-service-link-label">{item.label}</span>
                        {item.badge !== undefined ? (
                          <span className="dashboard-service-badge">{item.badge}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
