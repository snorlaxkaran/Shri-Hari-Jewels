"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PackageOpen, Scan, Send, Store } from "lucide-react";
import ModuleOnboarding from "@/app/(components)/ModuleOnboarding";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import WorkspaceHome from "@/app/(components)/WorkspaceHome";
import { fetchBranches } from "@/lib/api/branches";
import { fetchIncomingTransferCount } from "@/lib/api/inventory";

export default function MultibranchWorkspacePage() {
  const [branchCount, setBranchCount] = useState(0);
  const [incoming, setIncoming] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBranches(), fetchIncomingTransferCount()])
      .then(([branches, incomingCount]) => {
        setBranchCount(branches.filter((b) => b.active).length);
        setIncoming(incomingCount);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <>
      <ModuleOnboarding moduleId="multibranch" />
      <WorkspaceHome
        title="Multi-Branch"
        subtitle="Move stock between showrooms with proforma and receive flow"
        stats={[
          { label: "Active branches", value: String(branchCount) },
          { label: "Incoming transfers", value: String(incoming) },
        ]}
        action={
          <Link href="/stock-transfer" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
            <Scan size={16} />
            Scan & send
          </Link>
        }
        shortcuts={[
          { href: "/branches", label: "Branches", description: "Showrooms & warehouses", icon: Store },
          { href: "/stock-transfer", label: "Scan & send", description: "Dispatch pieces", icon: Scan },
          { href: "/stock-transfer/sent", label: "Sent transfers", description: "Track outgoing", icon: Send },
          { href: "/stock-transfer/incoming", label: "Incoming", description: "Receive at branch", icon: PackageOpen },
        ]}
      />
    </>
  );
}
