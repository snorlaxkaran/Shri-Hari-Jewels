"use client";

import { useMemo, useState } from "react";
import ProductionRunElementCard from "@/app/(components)/production-runs/ProductionRunElementCard";
import ImageUpload from "@/app/(components)/ImageUpload";
import type { PendingImage } from "@/lib/inventory/images";
import { submitProductionRunItemQc } from "@/lib/api/production-runs";
import { QC_CHECKLIST } from "@/lib/production-runs/stage-config";
import { PRODUCTION_RUN_STAGES } from "@/lib/production-runs/stages";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  NonConformanceReport,
  NcrSeverity,
  ProductionRunItem,
  ProductionRunQcRecord,
  ProductionRunStage,
} from "@/lib/types";

const inputClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type ItemDraft = {
  checklist: Record<string, boolean>;
  inspectedByName: string;
  photos: PendingImage[];
  severity: NcrSeverity;
  description: string;
  sentToStage: ProductionRunStage;
};

type QcWorksheetProps = {
  runId: string;
  items: ProductionRunItem[];
  qcRecords: ProductionRunQcRecord[];
  canEdit: boolean;
  onSubmitted: (result: {
    qcRecord: ProductionRunQcRecord;
    warning?: string;
    rejectedToStage?: ProductionRunStage;
  }) => void;
};

const emptyChecklist = () =>
  Object.fromEntries(QC_CHECKLIST.map((c) => [c, true])) as Record<string, boolean>;

const latestRecordByItem = (records: ProductionRunQcRecord[]) => {
  const map = new Map<string, ProductionRunQcRecord>();
  for (const record of records) {
    if (!map.has(record.productionRunItemId)) {
      map.set(record.productionRunItemId, record);
    }
  }
  return map;
};

export default function QcWorksheet({
  runId,
  items,
  qcRecords,
  canEdit,
  onSubmitted,
}: QcWorksheetProps) {
  const latestByItem = useMemo(() => latestRecordByItem(qcRecords), [qcRecords]);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<Record<string, string>>({});

  const earlierStages = PRODUCTION_RUN_STAGES.slice(
    0,
    PRODUCTION_RUN_STAGES.indexOf("Quality Check"),
  );

  const summary = useMemo(() => {
    let passed = 0;
    let failed = 0;
    const severityCounts: Record<NcrSeverity, number> = {
      Minor: 0,
      Major: 0,
      Critical: 0,
    };
    for (const item of items) {
      const latest = latestByItem.get(item.id);
      if (latest?.result === "Pass") passed += 1;
      else if (latest?.result === "Fail") {
        failed += 1;
        if (latest.ncr) severityCounts[latest.ncr.severity] += 1;
      }
    }
    return { passed, failed, pending: items.length - passed - failed, severityCounts };
  }, [items, latestByItem]);

  const getDraft = (itemId: string): ItemDraft =>
    drafts[itemId] ?? {
      checklist: emptyChecklist(),
      inspectedByName: "",
      photos: [],
      severity: "Minor",
      description: "",
      sentToStage: earlierStages[earlierStages.length - 1] ?? "Wax Pattern",
    };

  const updateDraft = (itemId: string, patch: Partial<ItemDraft>) => {
    setDrafts((prev) => ({ ...prev, [itemId]: { ...getDraft(itemId), ...patch } }));
  };

  const failedCriteria = (checklist: Record<string, boolean>) =>
    QC_CHECKLIST.filter((c) => checklist[c] === false);

  const handleSubmit = async (item: ProductionRunItem) => {
    const draft = getDraft(item.id);
    if (!draft.inspectedByName.trim()) {
      setError("Inspector name is required for each item.");
      return;
    }

    const failed = failedCriteria(draft.checklist);
    if (failed.length > 0 && !draft.description.trim()) {
      setError("Description is required when any checklist item fails.");
      return;
    }

    setBusyItemId(item.id);
    setError("");
    try {
      const result = await submitProductionRunItemQc(runId, item.id, {
        checklistResults: draft.checklist,
        inspectedByName: draft.inspectedByName.trim(),
        photoUrls: draft.photos.map((p) => p.url),
        severity: failed.length > 0 ? draft.severity : undefined,
        description: failed.length > 0 ? draft.description.trim() : undefined,
        failedCriteria: failed.length > 0 ? failed : undefined,
        sentToStage: failed.length > 0 ? draft.sentToStage : undefined,
      });
      if (result.warning) {
        setWarnings((prev) => ({ ...prev, [item.id]: result.warning! }));
      }
      onSubmitted(result);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to submit QC."));
    } finally {
      setBusyItemId(null);
    }
  };

  const severitySummary = [
    summary.severityCounts.Minor ? `${summary.severityCounts.Minor} Minor` : null,
    summary.severityCounts.Major ? `${summary.severityCounts.Major} Major` : null,
    summary.severityCounts.Critical ? `${summary.severityCounts.Critical} Critical` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        <span className="font-medium text-zinc-900">QC summary: </span>
        {summary.passed} of {items.length} items passed
        {summary.failed > 0 && (
          <>
            {" "}
            · {summary.failed} failed
            {severitySummary ? ` (${severitySummary})` : ""}
          </>
        )}
        {summary.pending > 0 && <> · {summary.pending} pending inspection</>}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {items.map((item, index) => {
        const latest = latestByItem.get(item.id);
        const draft = getDraft(item.id);
        const failed = failedCriteria(draft.checklist);
        const hasFailure = failed.length > 0;
        const isPassed = latest?.result === "Pass";
        const isFailed = latest?.result === "Fail";

        return (
          <ProductionRunElementCard
            key={item.id}
            item={item}
            index={index}
            done={isPassed}
          >
            {isPassed && (
              <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                Passed · inspected by {latest.inspectedByName}
              </p>
            )}
            {isFailed && latest?.ncr && (
              <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                Failed ({latest.ncr.severity}) · {latest.ncr.ncrNo} · sent back to{" "}
                {latest.ncr.sentToStage}
              </p>
            )}

            {canEdit && !isPassed && (
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Inspected by *</label>
                  <input
                    value={draft.inspectedByName}
                    onChange={(e) =>
                      updateDraft(item.id, { inspectedByName: e.target.value })
                    }
                    className={inputClass}
                    placeholder="QC inspector (separate from stage karigar)"
                  />
                  {warnings[item.id] && (
                    <p className="text-xs text-amber-700 mt-1">{warnings[item.id]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className={labelClass}>Inspection checklist</p>
                  {QC_CHECKLIST.map((criterion) => (
                    <label
                      key={criterion}
                      className="flex items-start gap-2 text-sm text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={draft.checklist[criterion] !== false}
                        onChange={(e) =>
                          updateDraft(item.id, {
                            checklist: {
                              ...draft.checklist,
                              [criterion]: e.target.checked,
                            },
                          })
                        }
                        className="mt-0.5"
                      />
                      <span>{criterion}</span>
                    </label>
                  ))}
                </div>

                <ImageUpload
                  images={draft.photos}
                  onChange={(photos) => updateDraft(item.id, { photos })}
                />

                {hasFailure && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
                    <p className="text-sm font-medium text-red-800">
                      Failure details — an NCR will be raised and the run sent back
                    </p>
                    <div>
                      <label className={labelClass}>Severity *</label>
                      <select
                        value={draft.severity}
                        onChange={(e) =>
                          updateDraft(item.id, {
                            severity: e.target.value as NcrSeverity,
                          })
                        }
                        className={inputClass}
                      >
                        <option value="Minor">Minor</option>
                        <option value="Major">Major</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Send back to stage *</label>
                      <select
                        value={draft.sentToStage}
                        onChange={(e) =>
                          updateDraft(item.id, {
                            sentToStage: e.target.value as ProductionRunStage,
                          })
                        }
                        className={inputClass}
                      >
                        {earlierStages.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Description *</label>
                      <textarea
                        value={draft.description}
                        onChange={(e) =>
                          updateDraft(item.id, { description: e.target.value })
                        }
                        className={`${inputClass} min-h-[72px]`}
                        placeholder="Describe the non-conformance…"
                      />
                    </div>
                    <p className="text-xs text-red-700">
                      Failed: {failed.join("; ")}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  disabled={busyItemId === item.id}
                  onClick={() => void handleSubmit(item)}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {busyItemId === item.id
                    ? "Saving…"
                    : hasFailure
                      ? "Record fail & send back"
                      : "Record pass"}
                </button>
              </div>
            )}
          </ProductionRunElementCard>
        );
      })}
    </div>
  );
}

export function NcrHistorySection({ ncrs }: { ncrs: NonConformanceReport[] }) {
  if (ncrs.length === 0) return null;

  return (
    <div className="surface-card p-5">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
        Non-conformance reports
      </h3>
      <ul className="space-y-3 text-sm">
        {ncrs.map((ncr) => (
          <li
            key={ncr.id}
            className="border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-zinc-900">{ncr.ncrNo}</span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  ncr.severity === "Critical"
                    ? "bg-red-100 text-red-800"
                    : ncr.severity === "Major"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-zinc-200 text-zinc-700"
                }`}
              >
                {ncr.severity}
              </span>
              {ncr.elementName && (
                <span className="text-zinc-500">· {ncr.elementName}</span>
              )}
            </div>
            <p className="text-zinc-600 mt-1">{ncr.description}</p>
            <p className="text-xs text-zinc-500 mt-1">
              Sent back to {ncr.sentToStage} · {ncr.failedCriteria.join(", ")} ·{" "}
              {new Date(ncr.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
