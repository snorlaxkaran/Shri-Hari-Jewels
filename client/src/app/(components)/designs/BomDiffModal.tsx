"use client";

import type { DesignElementDiff } from "@/lib/types";

type Props = {
  open: boolean;
  diff: DesignElementDiff | null;
  onConfirm: () => void;
  onCancel: () => void;
  saving?: boolean;
};

export default function BomDiffModal({
  open,
  diff,
  onConfirm,
  onCancel,
  saving,
}: Props) {
  if (!open || !diff) return null;

  const hasChanges =
    diff.added.length > 0 ||
    diff.removed.length > 0 ||
    diff.changed.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-base font-semibold text-zinc-900">
            Confirm BOM changes
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Saved production runs keep their original snapshot. These changes
            only affect future runs.
          </p>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4 text-sm">
          {!hasChanges ? (
            <p className="text-zinc-500">No element changes detected.</p>
          ) : (
            <>
              {diff.added.length > 0 && (
                <section>
                  <h4 className="font-medium text-emerald-700 mb-2">Adding</h4>
                  <ul className="space-y-1 text-zinc-600">
                    {diff.added.map((el, i) => (
                      <li key={i}>
                        + {el.name} ({el.type}) × {el.qtyPerSet}/set
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {diff.removed.length > 0 && (
                <section>
                  <h4 className="font-medium text-red-700 mb-2">Removing</h4>
                  <ul className="space-y-1 text-zinc-600">
                    {diff.removed.map((el) => (
                      <li key={el.id}>
                        − {el.name} ({el.type}) × {el.qtyPerSet}/set
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {diff.changed.length > 0 && (
                <section>
                  <h4 className="font-medium text-amber-700 mb-2">Changing</h4>
                  <ul className="space-y-2 text-zinc-600">
                    {diff.changed.map(({ before, after }, i) => (
                      <li key={i}>
                        {before.name}: qty {before.qtyPerSet} → {after.qtyPerSet}
                        {before.unitValue !== after.unitValue &&
                          ` · unit ₹${before.unitValue ?? 0} → ₹${after.unitValue ?? 0}`}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="btn-primary px-4 py-2 text-sm"
          >
            {saving ? "Saving…" : "Apply changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
