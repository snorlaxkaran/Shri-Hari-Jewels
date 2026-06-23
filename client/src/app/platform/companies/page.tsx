"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Gem, LogOut, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  createOrganization,
  deleteOrganization,
  fetchOrganizations,
  type CreateOrganizationInput,
  type OrganizationSummary,
} from "@/lib/api/organizations";
import { getApiErrorMessage } from "@/lib/api/client";

const emptyForm: CreateOrganizationInput = {
  name: "",
  slug: "",
  emailDomain: "",
  adminEmail: "",
  adminName: "",
  adminPassword: "",
};

export default function PlatformCompaniesPage() {
  const { user, logout } = useAuth();
  const [companies, setCompanies] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateOrganizationInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrganizations();
      setCompanies(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load companies."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createOrganization(form);
      setForm(emptyForm);
      setShowForm(false);
      await loadCompanies();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create company."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (company: OrganizationSummary) => {
    if (
      !window.confirm(
        `Delete "${company.name}" and all its data? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError("");
    try {
      await deleteOrganization(company.id);
      await loadCompanies();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete company."));
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="flex items-center gap-3">
          <div className="brand-mark w-10 h-10 rounded-lg">
            <Gem size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">Jewellery ERP</p>
            <p className="text-xs text-[var(--text-muted)]">Platform administration</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--text-muted)] hidden sm:inline">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border"
            style={{ borderColor: "var(--border)" }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Companies</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Add jewellery businesses to the platform. Each company gets its own
              isolated ERP with its own admin and staff.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
          >
            <Plus size={16} />
            Add company
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl border p-6 space-y-4"
            style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
          >
            <h2 className="font-medium">New company</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Company name</span>
                <input
                  className="input-field-login mt-1"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Slug</span>
                <input
                  className="input-field-login mt-1"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  placeholder="company-name"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Staff email domain (optional)</span>
                <input
                  className="input-field-login mt-1"
                  value={form.emailDomain}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, emailDomain: e.target.value }))
                  }
                  placeholder="company.com"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Admin email</span>
                <input
                  className="input-field-login mt-1"
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, adminEmail: e.target.value }))
                  }
                  placeholder="admin@company.com"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Admin name</span>
                <input
                  className="input-field-login mt-1"
                  value={form.adminName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, adminName: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--text-muted)]">Admin password</span>
                <input
                  className="input-field-login mt-1"
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, adminPassword: e.target.value }))
                  }
                  minLength={6}
                  required
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="login-submit px-4 py-2 text-sm w-auto"
              >
                {submitting ? "Creating..." : "Create company"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
        >
          {loading ? (
            <p className="p-6 text-sm text-[var(--text-muted)]">Loading companies...</p>
          ) : companies.length === 0 ? (
            <p className="p-6 text-sm text-[var(--text-muted)]">
              No companies yet. Add your first jewellery business above.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {companies.map((company) => (
                <li
                  key={company.id}
                  className="p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgb(37 99 235 / 0.12)", color: "#2563eb" }}
                    >
                      <Building2 size={18} />
                    </div>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {company.slug}
                        {company.adminEmail ? ` · ${company.adminEmail}` : ""}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {company.branchCount} branch(es) · {company.userCount} user(s)
                        {!company.active && " · Inactive"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(company)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                    aria-label={`Delete ${company.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
