"use client";

import { useCallback, useEffect, useState } from "react";
import { createUser, fetchUsers } from "@/lib/api/users";
import { getApiErrorMessage } from "@/lib/api/client";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { AppUser, UserRole } from "@/lib/types";

const WORKER_ROLES: UserRole[] = [
  "Karigar",
  "ProductionManager",
  "SalesManager",
  "Store",
  "Accountant",
  "Admin",
];

const inputClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function UsersPanel() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Karigar");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await fetchUsers());
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const created = await createUser({
        userId: userId.trim(),
        name: name.trim(),
        password,
        role,
      });
      setSuccess(`Created ${created.name} (${created.email}).`);
      setUserId("");
      setName("");
      setPassword("");
      setRole("Karigar");
      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create user."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="surface-card rounded-xl p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Team & workers</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Create worker logins. User ID <strong>workerkaran</strong> logs in as{" "}
          <strong>workerkaran</strong> or <strong>workerkaran@shreehari.com</strong>.
        </p>
      </div>

      <form onSubmit={(e) => void handleCreate(e)} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>User ID</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className={inputClass}
            placeholder="workerkaran"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Worker Karan"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            minLength={6}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className={inputClass}
          >
            {WORKER_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={submitting} className="btn-primary px-4 py-2 text-sm">
            {submitting ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {success}
        </p>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
          Existing users
        </h3>
        {loading ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : (
          <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
            {users.map((user) => (
              <li
                key={user.id}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-900">{user.name}</p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                  {ROLE_LABELS[user.role]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
