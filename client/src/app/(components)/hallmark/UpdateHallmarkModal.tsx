"use client";

import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api/client";
import { updateUnitHallmark } from "@/lib/api/inventory";

type UpdateHallmarkModalProps = {
  open: boolean;
  itemCode: string;
  unitId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function UpdateHallmarkModal({
  open,
  itemCode,
  unitId,
  onClose,
  onSaved,
}: UpdateHallmarkModalProps) {
  const [huid, setHuid] = useState("");
  const [hallmarkCenter, setHallmarkCenter] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setHuid("");
      setHallmarkCenter("");
      setError("");
    }
  }, [open, itemCode]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateUnitHallmark(unitId, {
        huid: huid.trim(),
        hallmarkCenter: hallmarkCenter.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save hallmark."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="surface-card w-full max-w-md p-6 space-y-4"
        role="dialog"
        aria-labelledby="update-hallmark-title"
      >
        <div>
          <h2 id="update-hallmark-title" className="text-lg font-semibold text-zinc-900">
            Record Hallmark (HUID)
          </h2>
          <p className="text-sm text-zinc-500 mt-1 font-mono">{itemCode}</p>
          <p className="text-xs text-zinc-500 mt-2">
            Enter the BIS HUID for this piece. Gold items cannot be sold until the HUID is recorded.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              HUID (6 characters) *
            </label>
            <input
              type="text"
              value={huid}
              onChange={(e) => setHuid(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="e.g. A1B2C3"
              className="input-field w-full px-3 py-2 text-sm font-mono uppercase"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Hallmark center (optional)
            </label>
            <input
              type="text"
              value={hallmarkCenter}
              onChange={(e) => setHallmarkCenter(e.target.value)}
              placeholder="Assaying centre name"
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-sm"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
              disabled={saving || huid.trim().length !== 6}
            >
              {saving ? "Saving…" : "Save HUID"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
