"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NewBranchInput } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type BranchFormProps = {
  cancelHref: string;
  onSubmit: (input: NewBranchInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

export default function BranchForm({
  cancelHref,
  onSubmit,
  onDirtyChange,
}: BranchFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [manager, setManager] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const markDirty = () => setDirty(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Branch name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        manager: manager.trim() || undefined,
      });
      setDirty(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create branch."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="surface-card p-5 space-y-4">
        <div>
          <label className={labelClass}>Branch name *</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              markDirty();
            }}
            placeholder="e.g. Mumbai Store"
            className={fieldClass}
            autoFocus
          />
        </div>
        <div>
          <label className={labelClass}>Address</label>
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              markDirty();
            }}
            className={fieldClass}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Phone</label>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                markDirty();
              }}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                markDirty();
              }}
              className={fieldClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Manager</label>
          <input
            value={manager}
            onChange={(e) => {
              setManager(e.target.value);
              markDirty();
            }}
            className={fieldClass}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Link href={cancelHref} className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center">
          Cancel
        </Link>
        <button type="submit" disabled={submitting} className="btn-primary flex-1 px-4 py-2.5 text-sm">
          {submitting ? "Creating…" : "Create Branch"}
        </button>
      </div>
    </form>
  );
}
