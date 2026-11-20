"use client";

import { useCallback, useEffect, useState } from "react";
import PlatformHeader from "@/app/platform/(components)/PlatformHeader";
import {
  fetchProvisionedCredentials,
  revealPlatformProvisionedPassword,
  type ProvisionedCredentialSummary,
} from "@/lib/api/platform-credentials";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { Eye, EyeOff } from "lucide-react";

function PasswordCell({
  plain,
  mask,
  onToggle,
}: {
  plain: string;
  mask: boolean;
  onToggle: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs">
      {mask ? "••••••••" : plain}
      <button
        type="button"
        className="text-zinc-500 hover:text-zinc-800"
        onClick={onToggle}
        aria-label={mask ? "Show password" : "Hide password"}
      >
        {mask ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
    </span>
  );
}

export default function PlatformCredentialsPage() {
  const [entries, setEntries] = useState<ProvisionedCredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEntries(await fetchProvisionedCredentials());
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load credential vault."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReveal = async (userId: string) => {
    if (revealed[userId]) return;
    try {
      const { password } = await revealPlatformProvisionedPassword(userId);
      setRevealed((prev) => ({ ...prev, [userId]: password }));
      setHidden((prev) => ({ ...prev, [userId]: true }));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not reveal password."));
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <PlatformHeader />
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <header>
          <h1 className="font-display text-2xl font-semibold">Admin-provisioned passwords</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
            Passwords set when creating companies or staff (encrypted at rest). User-chosen trial
            passwords are not stored. Each reveal is written to the audit log.
          </p>
        </header>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-500">No admin-provisioned credentials on file yet.</p>
        ) : (
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Set by</th>
                  <th className="px-4 py-3">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {entries.map((entry) => {
                  const plain = revealed[entry.userId];
                  const mask = hidden[entry.userId] !== false;
                  return (
                    <tr key={entry.userId}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{entry.name}</p>
                        <p className="text-xs text-zinc-500">{entry.email}</p>
                        <p className="text-xs text-zinc-400">{entry.role}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {entry.organizationName ?? "Platform"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        <p>{entry.setByName}</p>
                        <p className="text-xs text-zinc-400">{formatDate(entry.setAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {plain ? (
                          <PasswordCell
                            plain={plain}
                            mask={mask}
                            onToggle={() =>
                              setHidden((prev) => ({
                                ...prev,
                                [entry.userId]: !prev[entry.userId],
                              }))
                            }
                          />
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-[#e74c3c] font-medium"
                            onClick={() => void handleReveal(entry.userId)}
                          >
                            Reveal
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}