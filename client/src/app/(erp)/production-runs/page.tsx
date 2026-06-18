"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Plus,
  Trash2,
} from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import FilterPill from "@/app/(components)/ui/FilterPill";
import { useAuth } from "@/lib/auth/auth-context";
import {
  canManageProductionRuns,
  canUpdateProductionRunItems,
} from "@/lib/auth/permissions";
import { useDesigns } from "@/lib/designs/designs-context";
import { useProductionRuns } from "@/lib/production-runs/production-runs-context";
import { exportProductionRunCsv } from "@/lib/api/production-runs";
import type {
  ProductionRun,
  ProductionRunItem,
  ProductionRunStatus,
  UpdateProductionRunItemInput,
} from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const AddProductionRunModal = dynamic(
  () => import("@/app/(components)/AddProductionRunModal"),
  { ssr: false },
);

const statuses: (ProductionRunStatus | "All")[] = [
  "All",
  "Open",
  "In Progress",
  "Completed",
  "Cancelled",
];

const inputClass = "input-field w-full px-2 py-1 text-xs";

function ProgressBar({
  received,
  total,
}: {
  received: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 whitespace-nowrap">
        {received}/{total}
      </span>
    </div>
  );
}

function RunItemRow({
  run,
  item,
  canEditItems,
  onPatchItem,
}: {
  run: ProductionRun;
  item: ProductionRunItem;
  canEditItems: boolean;
  onPatchItem: (
    runId: string,
    itemId: string,
    input: UpdateProductionRunItemInput,
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    productionDate: item.productionDate
      ? item.productionDate.slice(0, 10)
      : "",
    waxCount: item.waxCount !== undefined ? String(item.waxCount) : "",
    czStones: item.czStones !== undefined ? String(item.czStones) : "",
    czWeight: item.czWeight !== undefined ? String(item.czWeight) : "",
    castingReceived: item.castingReceived,
  });

  useEffect(() => {
    setDraft({
      productionDate: item.productionDate
        ? item.productionDate.slice(0, 10)
        : "",
      waxCount: item.waxCount !== undefined ? String(item.waxCount) : "",
      czStones: item.czStones !== undefined ? String(item.czStones) : "",
      czWeight: item.czWeight !== undefined ? String(item.czWeight) : "",
      castingReceived: item.castingReceived,
    });
  }, [item]);

  const saveField = async (
    field: keyof UpdateProductionRunItemInput,
    value: UpdateProductionRunItemInput[keyof UpdateProductionRunItemInput],
  ) => {
    try {
      await onPatchItem(run.id, item.id, { [field]: value });
    } catch {
      // parent shows errors
    }
  };

  const handleDateBlur = () => {
    const current = item.productionDate?.slice(0, 10) ?? "";
    if (draft.productionDate === current) return;
    void saveField(
      "productionDate",
      draft.productionDate ? draft.productionDate : null,
    );
  };

  const handleNumberBlur = (
    field: "waxCount" | "czStones" | "czWeight",
  ) => {
    const raw = draft[field];
    const current =
      item[field] !== undefined ? String(item[field]) : "";

    if (raw === current) return;

    const parsed =
      raw === "" ? null : field === "czWeight" ? parseFloat(raw) : parseInt(raw, 10);

    if (raw !== "" && (parsed === null || Number.isNaN(parsed))) {
      setDraft((d) => ({
        ...d,
        [field]: current,
      }));
      return;
    }

    void saveField(field, parsed);
  };

  return (
    <tr className="border-t border-zinc-100">
      <td className="px-3 py-2 font-medium text-zinc-900">
        {item.elementName}
      </td>
      <td className="px-3 py-2 text-zinc-600">{item.elementType}</td>
      <td className="px-3 py-2 text-zinc-600">{item.qtyPerSet}</td>
      <td className="px-3 py-2 font-medium">{item.totalQty}</td>
      <td className="px-3 py-2">
        <input
          type="date"
          value={draft.productionDate}
          onChange={(e) =>
            setDraft((d) => ({ ...d, productionDate: e.target.value }))
          }
          onBlur={handleDateBlur}
          disabled={!canEditItems}
          className={inputClass}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          value={draft.waxCount}
          onChange={(e) =>
            setDraft((d) => ({ ...d, waxCount: e.target.value }))
          }
          onBlur={() => handleNumberBlur("waxCount")}
          disabled={!canEditItems}
          className={inputClass}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          value={draft.czStones}
          onChange={(e) =>
            setDraft((d) => ({ ...d, czStones: e.target.value }))
          }
          onBlur={() => handleNumberBlur("czStones")}
          disabled={!canEditItems}
          className={inputClass}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          step={0.01}
          value={draft.czWeight}
          onChange={(e) =>
            setDraft((d) => ({ ...d, czWeight: e.target.value }))
          }
          onBlur={() => handleNumberBlur("czWeight")}
          disabled={!canEditItems}
          className={inputClass}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={draft.castingReceived}
          onChange={(e) => {
            const checked = e.target.checked;
            setDraft((d) => ({ ...d, castingReceived: checked }));
            void saveField("castingReceived", checked);
          }}
          disabled={!canEditItems}
          className="h-4 w-4 rounded border-zinc-300"
        />
      </td>
    </tr>
  );
}

function ProductionRunCard({
  run,
  canManage,
  canEditItems,
  onPatchRun,
  onPatchItem,
  onRemoveRun,
}: {
  run: ProductionRun;
  canManage: boolean;
  canEditItems: boolean;
  onPatchRun: (
    id: string,
    input: { status?: ProductionRunStatus },
  ) => Promise<void>;
  onPatchItem: (
    runId: string,
    itemId: string,
    input: UpdateProductionRunItemInput,
  ) => Promise<void>;
  onRemoveRun: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const handleStatusChange = async (status: ProductionRunStatus) => {
    try {
      await onPatchRun(run.id, { status });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update status."));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportProductionRunCsv(run.id, run.runNo);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to export CSV."));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete production run ${run.runNo}? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await onRemoveRun(run.id);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete run."));
    }
  };

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded text-zinc-400 hover:text-zinc-600"
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900">{run.runNo}</span>
            <span className="text-sm text-zinc-600">{run.designCode}</span>
            {run.designName && (
              <span className="text-sm text-zinc-400">— {run.designName}</span>
            )}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">
            {run.setsOrdered} set{run.setsOrdered !== 1 ? "s" : ""} ordered
          </div>
        </div>

        <ProgressBar
          received={run.castingsReceived}
          total={run.castingsTotal}
        />

        {canManage ? (
          <select
            value={run.status}
            onChange={(e) =>
              handleStatusChange(e.target.value as ProductionRunStatus)
            }
            className="input-field text-xs py-1 px-2"
          >
            {statuses
              .filter((s) => s !== "All")
              .map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
          </select>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
            {run.status}
          </span>
        )}

        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
          title="Export CSV"
        >
          <Download size={14} />
          {exporting ? "Exporting…" : "CSV"}
        </button>

        {canManage && (
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50"
            title="Delete run"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-zinc-100 px-5 py-4">
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500">
                  <th className="text-left px-3 py-2 font-medium">Element</th>
                  <th className="text-left px-3 py-2 font-medium w-20">
                    Type
                  </th>
                  <th className="text-left px-3 py-2 font-medium w-16">
                    Qty/Set
                  </th>
                  <th className="text-left px-3 py-2 font-medium w-20">
                    Total
                  </th>
                  <th className="text-left px-3 py-2 font-medium w-32">
                    Date
                  </th>
                  <th className="text-left px-3 py-2 font-medium w-24">
                    Wax
                  </th>
                  <th className="text-left px-3 py-2 font-medium w-24">
                    CZ Stones
                  </th>
                  <th className="text-left px-3 py-2 font-medium w-24">
                    CZ Wt (ct)
                  </th>
                  <th className="text-center px-3 py-2 font-medium w-24">
                    Casting
                  </th>
                </tr>
              </thead>
              <tbody>
                {run.items.map((item) => (
                  <RunItemRow
                    key={item.id}
                    run={run}
                    item={item}
                    canEditItems={canEditItems}
                    onPatchItem={onPatchItem}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductionRunsPage() {
  const { user } = useAuth();
  const canManage = user ? canManageProductionRuns(user.role) : false;
  const canEditItems = user ? canUpdateProductionRunItems(user.role) : false;
  const { designs } = useDesigns();
  const {
    productionRuns,
    hydrated,
    loading,
    error,
    addProductionRun,
    patchProductionRun,
    patchProductionRunItem,
    removeProductionRun,
  } = useProductionRuns();
  const [statusFilter, setStatusFilter] = useState<
    ProductionRunStatus | "All"
  >("All");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () =>
      productionRuns.filter(
        (run) => statusFilter === "All" || run.status === statusFilter,
      ),
    [productionRuns, statusFilter],
  );

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Production Runs"
        subtitle="Track casting, wax moulds, and stone usage per order"
        action={
          canManage ? (
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              New Run
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {statuses.map((status) => (
          <FilterPill
            key={status}
            label={status}
            active={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="surface-card px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">
            {productionRuns.length === 0
              ? "No production runs yet. Start a run from a design."
              : "No runs match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((run) => (
            <ProductionRunCard
              key={run.id}
              run={run}
              canManage={canManage}
              canEditItems={canEditItems}
              onPatchRun={async (id, input) => {
                await patchProductionRun(id, input);
              }}
              onPatchItem={async (runId, itemId, input) => {
                await patchProductionRunItem(runId, itemId, input);
              }}
              onRemoveRun={removeProductionRun}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddProductionRunModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          designs={designs}
          onSubmit={async (input) => {
            await addProductionRun(input);
          }}
        />
      )}
    </div>
  );
}
