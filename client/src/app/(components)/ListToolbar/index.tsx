"use client";

import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

type ListToolbarProps = {
  onRefresh?: () => void;
  refreshing?: boolean;
  menu?: ReactNode;
  children?: ReactNode;
};

export default function ListToolbar({
  onRefresh,
  refreshing,
  menu,
  children,
}: ListToolbarProps) {
  return (
    <div className="list-toolbar">
      <div className="list-toolbar-start">{children}</div>
      <div className="list-toolbar-end">
        {onRefresh && (
          <button
            type="button"
            className="list-toolbar-btn"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh list"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
          </button>
        )}
        {menu}
      </div>
    </div>
  );
}
