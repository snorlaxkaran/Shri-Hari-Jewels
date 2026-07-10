"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type RowAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  hidden?: boolean;
};

type RowActionsDropdownProps = {
  actions: RowAction[];
};

export default function RowActionsDropdown({ actions }: RowActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visible = actions.filter((a) => !a.hidden);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className="row-action-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        Actions <ChevronDown size={12} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 2,
            minWidth: 140,
            background: "var(--bg-surface)",
            border: "0.5px solid var(--border-strong)",
            borderRadius: "var(--radius)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {visible.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                action.onClick();
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 12px",
                fontSize: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: action.destructive ? "#dc2626" : "var(--text-primary)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--bg-muted)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "none";
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
