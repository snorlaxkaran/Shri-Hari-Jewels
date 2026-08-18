"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import BulkUpdateCard from "@/app/(components)/settings/BulkUpdateCard";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageSettings } from "@/lib/auth/permissions";
import { bulkChangeCollections, bulkChangeUnitSkus } from "@/lib/api/inventory";
import {
  COLLECTION_CHANGE_HEADERS,
  mapCollectionChangeRows,
  mapSkuChangeRows,
  SKU_CHANGE_HEADERS,
} from "@/lib/inventory/bulk-updates";

export default function BulkUpdatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user ? canManageSettings(user.role) : false;

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/settings");
    }
  }, [user, isAdmin, router]);

  if (user && !isAdmin) {
    return null;
  }

  return (
    <div className="page-content max-w-3xl">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 mb-4"
      >
        <ArrowLeft size={16} />
        Back to settings
      </Link>

      <PageHeader
        title="Bulk updates from Excel"
        subtitle="Admin only — move SKUs between collections, or move individual pieces to a different SKU, by uploading a sheet."
      />

      <div className="space-y-6">
        <BulkUpdateCard
          title="Change collection through SKU"
          description="One row per SKU. The middle column is checked against the SKU's actual collection first, so a sheet downloaded before someone else made a change will not silently overwrite it — mismatched rows are skipped and listed. Collections must already exist; create them on the Products page."
          headers={COLLECTION_CHANGE_HEADERS}
          sampleRow={["SMNK0011", "Classic", "Bridal"]}
          templateFileName="collection-change-template"
          columns={[
            { label: "SKU", value: (row) => row.sku },
            {
              label: "Current collection",
              value: (row) => row.currentCollection ?? "(not checked)",
            },
            { label: "Change to", value: (row) => row.newCollection },
          ]}
          parse={mapCollectionChangeRows}
          onApply={bulkChangeCollections}
          applyLabel="Apply collection changes"
        />

        <BulkUpdateCard
          title="Change SKU through item code"
          description="One row per piece. The piece keeps its item code and moves under the new SKU; other pieces under its old SKU stay where they are. If the new SKU does not exist yet, it is created by copying the piece's current product details. Sold pieces are skipped, since their SKU is part of the sale record."
          headers={SKU_CHANGE_HEADERS}
          sampleRow={["SMNK0011-003", "SMNK0012"]}
          templateFileName="sku-change-template"
          columns={[
            { label: "Item code", value: (row) => row.itemCode },
            { label: "New SKU", value: (row) => row.newSku },
          ]}
          parse={mapSkuChangeRows}
          onApply={bulkChangeUnitSkus}
          applyLabel="Apply SKU changes"
        />
      </div>

      <div className="surface-card p-5 mt-6 text-sm text-zinc-600 leading-relaxed">
        <p className="font-medium text-zinc-900 mb-2">Good to know</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Column headers are matched loosely — <span className="font-mono text-xs">SKU</span>,{" "}
            <span className="font-mono text-xs">SKU No</span> and{" "}
            <span className="font-mono text-xs">Catalog No</span> all work.
          </li>
          <li>
            Every change is written to the inventory audit log with your name, the old value and
            the new one.
          </li>
          <li>
            Rows are applied one by one. If some rows fail, the rest still go through and the
            failures are listed with the reason.
          </li>
          <li>Item codes (barcodes) are never changed by either upload.</li>
        </ul>
      </div>
    </div>
  );
}
