"use client";

import dynamic from "next/dynamic";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatCard from "@/app/(components)/StatCard";
import StatusBadge from "@/app/(components)/StatusBadge";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteRawInventory } from "@/lib/auth/permissions";
import { useRawInventory } from "@/lib/raw-inventory/raw-inventory-context";
import { STONE_TYPE_LABELS } from "@/lib/raw-inventory/constants";
import type { CertifiedStoneLot, MetalLot } from "@/lib/types";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { ArrowLeftRight, Gem, Pencil, Plus, Scale, Search } from "lucide-react";

const AddMetalLotModal = dynamic(
  () => import("@/app/(components)/AddMetalLotModal"),
  { ssr: false },
);
const AddCertifiedStoneModal = dynamic(
  () => import("@/app/(components)/AddCertifiedStoneModal"),
  { ssr: false },
);
const EditMetalLotModal = dynamic(
  () => import("@/app/(components)/EditMetalLotModal"),
  { ssr: false },
);
const EditCertifiedStoneModal = dynamic(
  () => import("@/app/(components)/EditCertifiedStoneModal"),
  { ssr: false },
);
const RawStockActionModal = dynamic(
  () => import("@/app/(components)/RawStockActionModal"),
  { ssr: false },
);
const StoneStockPanel = dynamic(
  () => import("@/app/(components)/StoneStockPanel"),
  { ssr: false },
);

type Tab = "metal" | "stones" | "certified" | "audit";

const isTab = (value: string | null): value is Tab =>
  value === "metal" ||
  value === "stones" ||
  value === "certified" ||
  value === "audit";

type ActionState =
  | { kind: "metal"; mode: "transfer" | "adjust"; lot: MetalLot }
  | { kind: "stone"; mode: "transfer" | "adjust"; lot: CertifiedStoneLot }
  | null;

export default function RawInventoryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RawInventoryPageContent />
    </Suspense>
  );
}

function RawInventoryPageContent() {
  const { user } = useAuth();
  const canWrite = user ? canWriteRawInventory(user.role) : false;
  const searchParams = useSearchParams();
  const initialTab: Tab = isTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as Tab)
    : "metal";
  const {
    metalLots,
    certifiedStoneLots,
    auditLogs,
    summary,
    hydrated,
    loading,
    error,
    addMetalLot,
    updateMetalLot,
    transferMetalLot,
    adjustMetalLot,
    addCertifiedStoneLot,
    updateCertifiedStoneLot,
    transferCertifiedStoneLot,
    adjustCertifiedStoneLot,
  } = useRawInventory();

  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [metalModalOpen, setMetalModalOpen] = useState(false);
  const [stoneModalOpen, setStoneModalOpen] = useState(false);
  const [editMetal, setEditMetal] = useState<MetalLot | null>(null);
  const [editStone, setEditStone] = useState<CertifiedStoneLot | null>(null);
  const [action, setAction] = useState<ActionState>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const filteredMetal = useMemo(() => {
    const q = search.toLowerCase();
    return metalLots.filter(
      (lot) =>
        lot.lotNumber.toLowerCase().includes(q) ||
        lot.metalType.toLowerCase().includes(q) ||
        lot.vendor.toLowerCase().includes(q) ||
        lot.location.toLowerCase().includes(q),
    );
  }, [metalLots, search]);

  const filteredStones = useMemo(() => {
    const q = search.toLowerCase();
    return certifiedStoneLots.filter(
      (lot) =>
        lot.certificateNumber.toLowerCase().includes(q) ||
        lot.stoneType.toLowerCase().includes(q) ||
        lot.vendor.toLowerCase().includes(q) ||
        (lot.color ?? "").toLowerCase().includes(q),
    );
  }, [certifiedStoneLots, search]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Raw Materials"
        subtitle="Metal and stone inventory ledger"
        action={
          canWrite && (tab === "metal" || tab === "certified") ? (
            <button
              onClick={() =>
                tab === "metal" ? setMetalModalOpen(true) : setStoneModalOpen(true)
              }
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              {tab === "metal" ? "Add Metal Lot" : "Add Certified Stone"}
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-700">
          {successMessage}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            label="Gold Stock (all purities)"
            value={`${formatNumber(summary.goldGrams)} g`}
            icon={<Gem size={18} />}
          />
          <StatCard
            label="22K Gold Stock"
            value={`${formatNumber(summary.gold22kGrams ?? 0)} g`}
            icon={<Gem size={18} />}
          />
          <StatCard
            label="Silver Stock"
            value={`${formatNumber(summary.silverGrams)} g`}
            icon={<Gem size={18} />}
          />
          <StatCard
            label="Diamond Stock"
            value={`${formatNumber(summary.diamondCarats)} ct`}
            icon={<Gem size={18} />}
          />
          <StatCard
            label="Total Raw Value"
            value={formatCurrency(summary.metalValue + summary.stoneValue)}
            icon={<Scale size={18} />}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            ["metal", "Metal"],
            ["stones", "Stones"],
            ["certified", "Certified Stones"],
            ["audit", "Audit Trail"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`tab-btn ${tab === key ? "tab-btn-active" : "tab-btn-inactive"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {(tab === "metal" || tab === "certified") && (
        <div className="relative mb-4 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "metal"
                ? "Search lot, vendor, location…"
                : "Search certificate, vendor, color…"
            }
            className="input-field w-full pl-9 pr-4 py-2 text-sm"
          />
        </div>
      )}

      {tab === "stones" && <StoneStockPanel canManage={canWrite} />}

      {tab === "metal" && (
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium">Lot</th>
                <th className="px-4 py-3 font-medium">Metal</th>
                <th className="px-4 py-3 font-medium">Weight</th>
                <th className="px-4 py-3 font-medium">Rates (₹/g)</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Location</th>
                {canWrite && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMetal.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="px-4 py-8 text-center text-zinc-400">
                    No metal lots found.
                  </td>
                </tr>
              ) : (
                filteredMetal.map((lot) => (
                  <tr key={lot.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{lot.lotNumber}</td>
                    <td className="px-4 py-3">
                      {lot.metalType} · {lot.purity}
                    </td>
                    <td className="px-4 py-3">{formatNumber(lot.weightGrams)} g</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatCurrency(lot.purchaseRate)} → {formatCurrency(lot.currentRate)}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(lot.stockValue)}</td>
                    <td className="px-4 py-3 text-zinc-600">{lot.vendor}</td>
                    <td className="px-4 py-3">{lot.location}</td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => setEditMetal(lot)}
                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Transfer"
                            onClick={() =>
                              setAction({ kind: "metal", mode: "transfer", lot })
                            }
                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                          >
                            <ArrowLeftRight size={14} />
                          </button>
                          <button
                            type="button"
                            title="Adjust"
                            onClick={() =>
                              setAction({ kind: "metal", mode: "adjust", lot })
                            }
                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                          >
                            <Scale size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "certified" && (
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium">Certificate</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Carat</th>
                <th className="px-4 py-3 font-medium">4C</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canWrite && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStones.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="px-4 py-8 text-center text-zinc-400">
                    No certified stones found.
                  </td>
                </tr>
              ) : (
                filteredStones.map((lot) => (
                  <tr key={lot.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {lot.certificateNumber}
                    </td>
                    <td className="px-4 py-3">{STONE_TYPE_LABELS[lot.stoneType]}</td>
                    <td className="px-4 py-3">{formatNumber(lot.carat)} ct</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {[lot.color, lot.clarity, lot.cut].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {lot.stockValue != null ? formatCurrency(lot.stockValue) : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{lot.vendor}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lot.status} />
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => setEditStone(lot)}
                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Transfer"
                            onClick={() =>
                              setAction({ kind: "stone", mode: "transfer", lot })
                            }
                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                          >
                            <ArrowLeftRight size={14} />
                          </button>
                          <button
                            type="button"
                            title="Adjust"
                            onClick={() =>
                              setAction({ kind: "stone", mode: "adjust", lot })
                            }
                            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                          >
                            <Scale size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "audit" && (
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Lot / Cert</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                    No audit entries yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-50">
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">{log.stockType}</td>
                    <td className="px-4 py-3 font-medium">{log.lotRef}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.action} />
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 max-w-xs">
                      {log.action === "Transfer" && (
                        <span>
                          {log.fromLocation} → {log.toLocation}
                          {log.reason ? ` (${log.reason})` : ""}
                        </span>
                      )}
                      {log.action === "Adjustment" && (
                        <span>
                          Δ {log.delta != null ? formatNumber(log.delta) : "—"}
                          {log.reason ? ` — ${log.reason}` : ""}
                        </span>
                      )}
                      {log.action === "Create" && log.newValue && (
                        <span>Created</span>
                      )}
                      {log.action === "Update" && <span>Updated details</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{log.performedByName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {metalModalOpen && (
        <AddMetalLotModal
          open={metalModalOpen}
          onClose={() => setMetalModalOpen(false)}
          onSubmit={async (input) => {
            const lot = await addMetalLot(input);
            showSuccess(`Added metal lot ${lot.lotNumber}`);
          }}
        />
      )}

      {stoneModalOpen && (
        <AddCertifiedStoneModal
          open={stoneModalOpen}
          onClose={() => setStoneModalOpen(false)}
          onSubmit={async (input) => {
            const lot = await addCertifiedStoneLot(input);
            showSuccess(`Added certified stone ${lot.certificateNumber}`);
          }}
        />
      )}

      {editMetal && (
        <EditMetalLotModal
          open={Boolean(editMetal)}
          lot={editMetal}
          onClose={() => setEditMetal(null)}
          onSubmit={async (id, input) => {
            await updateMetalLot(id, input);
            showSuccess("Metal lot updated");
          }}
        />
      )}

      {editStone && (
        <EditCertifiedStoneModal
          open={Boolean(editStone)}
          lot={editStone}
          onClose={() => setEditStone(null)}
          onSubmit={async (id, input) => {
            await updateCertifiedStoneLot(id, input);
            showSuccess("Certified stone updated");
          }}
        />
      )}

      {action?.kind === "metal" && (
        <RawStockActionModal
          open
          mode={action.mode}
          stockKind="metal"
          lotRef={action.lot.lotNumber}
          currentValue={action.lot.weightGrams}
          currentLocation={action.lot.location}
          unitLabel="Weight (g)"
          onClose={() => setAction(null)}
          onTransfer={async (input) => {
            await transferMetalLot(action.lot.id, input);
            showSuccess(`Transferred ${action.lot.lotNumber} to ${input.toLocation}`);
          }}
          onAdjust={async ({ value, reason }) => {
            await adjustMetalLot(action.lot.id, {
              weightGrams: value,
              reason,
            });
            showSuccess(`Adjusted ${action.lot.lotNumber}`);
          }}
        />
      )}

      {action?.kind === "stone" && (
        <RawStockActionModal
          open
          mode={action.mode}
          stockKind="stone"
          lotRef={action.lot.certificateNumber}
          currentValue={action.lot.carat}
          currentLocation={action.lot.location}
          unitLabel="Carat"
          onClose={() => setAction(null)}
          onTransfer={async (input) => {
            await transferCertifiedStoneLot(action.lot.id, input);
            showSuccess(
              `Transferred ${action.lot.certificateNumber} to ${input.toLocation}`,
            );
          }}
          onAdjust={async ({ value, reason }) => {
            await adjustCertifiedStoneLot(action.lot.id, { carat: value, reason });
            showSuccess(`Adjusted ${action.lot.certificateNumber}`);
          }}
        />
      )}
    </div>
  );
}
