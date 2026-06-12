"use client";

import { Gem, MoreVertical, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navSections } from "@/lib/navigation";

type SidebarContentProps = {
  pathname: string;
  onClose: () => void;
  showClose?: boolean;
};

const SidebarContent = ({
  pathname,
  onClose,
  showClose = false,
}: SidebarContentProps) => (
  <div className="flex flex-col h-full w-[260px] overflow-y-auto bg-white border-r border-zinc-200">
    <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-zinc-200">
      <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center">
        <Gem size={18} className="text-white" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-900 leading-tight">
          Shree Hari
        </p>
        <p className="text-[11px] text-zinc-400 tracking-wide uppercase">
          Jewels ERP
        </p>
      </div>
      {showClose && (
        <button
          className="ml-auto p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      )}
    </div>

    <nav className="flex-1 px-3 py-4 space-y-1">
      {navSections.map((section, si) => (
        <div key={section.title} className={si !== 0 ? "pt-4" : ""}>
          {si !== 0 && <div className="mb-3 mx-2 border-t border-zinc-100" />}
          <p className="text-[10px] font-medium tracking-wider uppercase px-2 mb-2 text-zinc-400">
            {section.title}
          </p>
          {section.items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={onClose}
                data-active={isActive}
                className="sidebar-nav-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] font-medium transition-colors duration-150"
                style={{
                  background: isActive ? "#f4f4f5" : "transparent",
                  color: isActive ? "#18181b" : "#52525b",
                }}
              >
                <span
                  className="flex-shrink-0 w-[18px] flex justify-center"
                  style={{ color: isActive ? "#18181b" : "#a1a1aa" }}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-zinc-100 text-zinc-600">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>

    <div className="px-3 py-4 border-t border-zinc-200">
      <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-zinc-900 text-white flex-shrink-0">
          SH
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[12.5px] font-medium truncate text-zinc-900">
            Store Admin
          </p>
          <p className="text-[11px] text-zinc-400">Manager</p>
        </div>
        <MoreVertical size={15} className="text-zinc-300 flex-shrink-0" />
      </button>
    </div>
  </div>
);

type SidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const Sidebar = ({ mobileOpen, onMobileClose }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden md:flex h-screen sticky top-0 flex-shrink-0">
        <SidebarContent pathname={pathname} onClose={() => {}} />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="relative z-10 h-full shadow-xl">
            <SidebarContent
              pathname={pathname}
              onClose={onMobileClose}
              showClose
            />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
