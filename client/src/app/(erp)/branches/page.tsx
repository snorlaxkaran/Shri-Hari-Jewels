"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageBranches } from "@/lib/auth/permissions";
import { fetchBranches } from "@/lib/api/branches";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Branch } from "@/lib/types";
import { MapPin, Phone, Plus, Store, User } from "lucide-react";

export default function BranchesPage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canManage = user ? canManageBranches(user.role) : false;

  const loadBranches = useCallback(async () => {
    setError("");
    try {
      const data = await fetchBranches();
      setBranches(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load branches."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) {
      loadBranches();
    } else {
      setLoading(false);
    }
  }, [canManage, loadBranches]);

  if (loading) return <PageSkeleton />;

  if (!canManage) {
    return (
      <div className="page-content">
        <PageHeader title="Branches" subtitle="Store locations" />
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          Only admins can manage branches.
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Branches"
        subtitle={`${branches.length} active store${branches.length === 1 ? "" : "s"}`}
        action={
          <Link
            href="/branches/new"
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} />
            Add Branch
          </Link>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {branches.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          No branches yet. Add your first store location to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div key={branch.id} className="surface-card p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Store size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-zinc-900">
                    {branch.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">ID: {branch.id}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-500">
                {branch.address && (
                  <p className="flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <span>{branch.address}</span>
                  </p>
                )}
                {branch.phone && (
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0" />
                    <span>{branch.phone}</span>
                  </p>
                )}
                {branch.manager && (
                  <p className="flex items-center gap-2">
                    <User size={14} className="shrink-0" />
                    <span>{branch.manager}</span>
                  </p>
                )}
                {branch.email && <p className="pl-6">{branch.email}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
