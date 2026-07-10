"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import BranchForm from "@/app/(components)/branches/BranchForm";
import FormPageShell from "@/app/(components)/FormPageShell";
import { createBranch } from "@/lib/api/branches";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageBranches } from "@/lib/auth/permissions";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes-guard";

export default function NewBranchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user ? canManageBranches(user.role) : false;
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const backHref = "/branches";

  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (user && !canManage) {
      router.replace(backHref);
    }
  }, [user, canManage, router]);

  const handleBack = () => {
    if (dirty) setLeaveOpen(true);
    else router.push(backHref);
  };

  if (user && !canManage) {
    return null;
  }

  return (
    <div className="page-content">
      <FormPageShell
        backHref={backHref}
        backLabel="Back to branches"
        title="Add Branch"
        subtitle="Register a new store location"
        onBackClick={handleBack}
      >
        <BranchForm
          cancelHref={backHref}
          onCancelClick={handleBack}
          onDirtyChange={setDirty}
          onSubmit={async (input) => {
            await createBranch(input);
            router.push(backHref);
          }}
        />
      </FormPageShell>

      <ConfirmDialog
        open={leaveOpen}
        title="Discard changes?"
        message="You have unsaved edits. Leave without saving?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => router.push(backHref)}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  );
}
