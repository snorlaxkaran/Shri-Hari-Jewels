"use client";

import { useCallback, useEffect, useState } from "react";
import type { CatalogAuditLog } from "@/lib/types";
import { fetchDesignAuditLog } from "@/lib/api/designs";

type Props = {
  designId: string;
};

const formatDiff = (log: CatalogAuditLog) => {
  if (log.fieldDiffs?.length) {
    return log.fieldDiffs
      .slice(0, 4)
      .map((d) => `${d.field}: ${String(d.from)} → ${String(d.to)}`)
      .join("; ");
  }
  if (log.reason) return log.reason;
  return log.action;
};

export default function DesignHistoryPanel({ designId }: Props) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<CatalogAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await fetchDesignAuditLog(designId, 10));
    } finally {
      setLoading(false);
    }
  }, [designId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <section className="surface-card rounded-xl p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-semibold text-zinc-700 hover:text-zinc-900"
      >
        {open ? "Hide" : "Show"} BOM history
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-xs text-zinc-400">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-zinc-500">No history yet.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="text-xs border border-zinc-100 rounded-lg px-3 py-2"
              >
                <p className="text-zinc-800">
                  <span className="font-medium">{log.action}</span>
                  {log.entityRef ? ` · ${log.entityRef}` : ""}
                </p>
                <p className="text-zinc-500 mt-0.5">{formatDiff(log)}</p>
                <p className="text-zinc-400 mt-0.5">
                  {new Date(log.createdAt).toLocaleString("en-IN")} ·{" "}
                  {log.performedByName}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
