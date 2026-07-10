"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Yes, continue",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, loading]);

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        style={{ background: "transparent", border: "none" }}
        onClick={() => !loading && onCancel()}
        aria-label="Close dialog"
      />
      <div
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="modal-panel relative z-10"
      >
        <div id="confirm-dialog-title" className="modal-header">
          {title}
        </div>
        <div id="confirm-dialog-message" className="modal-body">
          {message}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Saving…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
