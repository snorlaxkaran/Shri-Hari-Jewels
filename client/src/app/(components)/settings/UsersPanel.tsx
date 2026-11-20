"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchLoginAuditLogs, type AuditLogEntry } from "@/lib/api/audit";
import {
  createUser,
  fetchUsers,
  revealProvisionedPassword,
  resetUserProvisionedPassword,
} from "@/lib/api/users";
import { getApiErrorMessage } from "@/lib/api/client";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/format";
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
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [loginHistory, setLoginHistory] = useState<AuditLogEntry[]>([]);

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

  useEffect(() => {
    void fetchLoginAuditLogs()
      .then(setLoginHistory)
      .catch(() => setLoginHistory([]));
  }, [users.length]);

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
          Create worker logins. Passwords you set are encrypted and can be revealed here (not
          user-chosen trial passwords). User ID <strong>workerkaran</strong> logs in as{" "}
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
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Last login:{" "}
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never (since tracking)"}
                  </p>
                  {user.hasProvisionedPassword ? (
                    <p className="text-xs text-emerald-700 mt-1">
                      Admin password on file
                      {user.provisionedPasswordSetByName
                        ? ` · set by ${user.provisionedPasswordSetByName}`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400 mt-1">No admin-saved password</p>
                  )}
                  {revealedPasswords[user.id] ? (
                    <p className="text-xs font-mono mt-1 text-zinc-800">
                      {revealedPasswords[user.id]}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                    {ROLE_LABELS[user.role]}
                  </span>
                  {user.hasProvisionedPassword && !revealedPasswords[user.id] ? (
                    <button
                      type="button"
                      className="text-xs text-[#e74c3c] font-medium"
                      onClick={() => {
                        void revealProvisionedPassword(user.id).then((r) => {
                          setRevealedPasswords((prev) => ({ ...prev, [user.id]: r.password }));
                        });
                      }}
                    >
                      Reveal
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs text-zinc-600 underline"
                    onClick={() => {
                      setResetUserId(user.id);
                      setResetPassword("");
                    }}
                  >
                    Reset password
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loginHistory.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            Recent sign-ins
          </h3>
          <ul className="text-xs text-zinc-600 space-y-1 max-h-40 overflow-y-auto border border-zinc-200 rounded-lg p-3">
            {loginHistory.slice(0, 25).map((log) => (
              <li key={log.id}>
                <strong>{log.actorName}</strong>
                {log.after?.email ? ` (${log.after.email})` : ""} — {formatDate(log.createdAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {resetUserId ? (
        <form
          className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            void resetUserProvisionedPassword(resetUserId, resetPassword)
              .then(async () => {
                setSuccess("Password reset and saved for admin view.");
                setResetUserId(null);
                setResetPassword("");
                setRevealedPasswords((prev) => {
                  const next = { ...prev };
                  delete next[resetUserId];
                  return next;
                });
                await loadUsers();
              })
              .catch((err) => setError(getApiErrorMessage(err, "Reset failed.")))
              .finally(() => setSubmitting(false));
          }}
        >
          <p className="text-sm font-medium text-amber-900">Set new password (saved for admin)</p>
          <input
            type="password"
            className={inputClass}
            minLength={6}
            required
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="New password"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary px-3 py-1.5 text-sm" disabled={submitting}>
              Save
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-sm"
              onClick={() => setResetUserId(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
