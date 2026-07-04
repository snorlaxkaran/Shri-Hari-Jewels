"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHECKLIST_FILTER_COLUMNS,
  DATE_FILTER_COLUMNS,
  FILTER_COLUMN_LABELS,
  NUMBER_FILTER_COLUMNS,
  TEXT_FILTER_COLUMNS,
  shouldUseChecklist,
  type ChecklistColumnFilter,
  type ColumnFilter,
  type DateColumnFilter,
  type FilterColumnId,
  type NumberColumnFilter,
  type TextColumnFilter,
} from "@/lib/inventory/filters";

type ColumnFilterPopoverProps = {
  column: FilterColumnId;
  filter: ColumnFilter | undefined;
  distinctValues: string[];
  onApply: (filter: ColumnFilter | undefined) => void;
  onClose: () => void;
};

const selectClass =
  "input-field w-full px-2 py-1.5 text-xs";
const inputClass =
  "input-field w-full px-2 py-1.5 text-xs";

export default function ColumnFilterPopover({
  column,
  filter,
  distinctValues,
  onApply,
  onClose,
}: ColumnFilterPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const useChecklist = shouldUseChecklist(column, distinctValues.length);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const applyText = (next: TextColumnFilter) => {
    if (!next.value.trim()) {
      onApply(undefined);
      return;
    }
    onApply(next);
    onClose();
  };

  const applyNumber = (next: NumberColumnFilter) => {
    if (!Number.isFinite(next.value)) return;
    if (next.operator === "between" && !Number.isFinite(next.valueTo)) return;
    onApply(next);
    onClose();
  };

  const applyDate = (next: DateColumnFilter) => {
    if (!next.value) {
      onApply(undefined);
      return;
    }
    if (next.operator === "between" && !next.valueTo) return;
    onApply(next);
    onClose();
  };

  const applyChecklist = (values: string[]) => {
    if (values.length === 0) {
      onApply(undefined);
    } else {
      onApply({ kind: "checklist", values });
    }
    onClose();
  };

  const textFilter =
    filter?.kind === "text"
      ? filter
      : ({
          kind: "text" as const,
          operator: "contains" as const,
          value: "",
        } satisfies TextColumnFilter);

  const numberFilter =
    filter?.kind === "number"
      ? filter
      : ({
          kind: "number" as const,
          operator: "equals" as const,
          value: 0,
        } satisfies NumberColumnFilter);

  const dateFilter =
    filter?.kind === "date"
      ? filter
      : ({
          kind: "date" as const,
          operator: "after" as const,
          value: "",
        } satisfies DateColumnFilter);

  const checklistValues =
    filter?.kind === "checklist" ? filter.values : [];

  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="mb-2 text-xs font-semibold text-zinc-700">
        Filter: {FILTER_COLUMN_LABELS[column]}
      </p>

      {useChecklist && (
        <ChecklistFilter
          values={distinctValues}
          selected={checklistValues}
          onApply={applyChecklist}
        />
      )}

      {!useChecklist && TEXT_FILTER_COLUMNS.has(column) && (
        <TextFilterForm
          initial={textFilter}
          onApply={applyText}
          onClear={() => {
            onApply(undefined);
            onClose();
          }}
        />
      )}

      {NUMBER_FILTER_COLUMNS.has(column) && (
        <div className={useChecklist ? "mt-3 border-t border-zinc-100 pt-3" : ""}>
          {useChecklist && (
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Or filter by value
            </p>
          )}
          <NumberFilterForm
            initial={numberFilter}
            onApply={applyNumber}
            onClear={() => {
              onApply(undefined);
              onClose();
            }}
          />
        </div>
      )}

      {DATE_FILTER_COLUMNS.has(column) && (
        <DateFilterForm
          initial={dateFilter}
          onApply={applyDate}
          onClear={() => {
            onApply(undefined);
            onClose();
          }}
        />
      )}

      {CHECKLIST_FILTER_COLUMNS.has(column) &&
        !useChecklist &&
        !NUMBER_FILTER_COLUMNS.has(column) &&
        !DATE_FILTER_COLUMNS.has(column) && (
          <TextFilterForm
            initial={textFilter}
            onApply={applyText}
            onClear={() => {
              onApply(undefined);
              onClose();
            }}
          />
        )}
    </div>
  );
}

function TextFilterForm({
  initial,
  onApply,
  onClear,
}: {
  initial: TextColumnFilter;
  onApply: (filter: TextColumnFilter) => void;
  onClear: () => void;
}) {
  const [operator, setOperator] = useState(initial.operator);
  const [value, setValue] = useState(initial.value);

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onApply({ kind: "text", operator, value });
      }}
    >
      <select
        value={operator}
        onChange={(e) =>
          setOperator(e.target.value as TextColumnFilter["operator"])
        }
        className={selectClass}
      >
        <option value="contains">Contains</option>
        <option value="equals">Equals</option>
        <option value="startsWith">Starts with</option>
        <option value="endsWith">Ends with</option>
        <option value="notContains">Does not contain</option>
      </select>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Filter value…"
        className={inputClass}
        autoFocus
      />
      <FilterActions onClear={onClear} />
    </form>
  );
}

function NumberFilterForm({
  initial,
  onApply,
  onClear,
}: {
  initial: NumberColumnFilter;
  onApply: (filter: NumberColumnFilter) => void;
  onClear: () => void;
}) {
  const [operator, setOperator] = useState(initial.operator);
  const [value, setValue] = useState(
    initial.value ? String(initial.value) : "",
  );
  const [valueTo, setValueTo] = useState(
    initial.valueTo != null ? String(initial.valueTo) : "",
  );

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onApply({
          kind: "number",
          operator,
          value: parseFloat(value),
          valueTo:
            operator === "between" ? parseFloat(valueTo) : undefined,
        });
      }}
    >
      <select
        value={operator}
        onChange={(e) =>
          setOperator(e.target.value as NumberColumnFilter["operator"])
        }
        className={selectClass}
      >
        <option value="equals">Equals</option>
        <option value="gt">Greater than</option>
        <option value="lt">Less than</option>
        <option value="between">Between</option>
      </select>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value"
        className={inputClass}
      />
      {operator === "between" && (
        <input
          type="number"
          step="any"
          value={valueTo}
          onChange={(e) => setValueTo(e.target.value)}
          placeholder="To"
          className={inputClass}
        />
      )}
      <FilterActions onClear={onClear} />
    </form>
  );
}

function DateFilterForm({
  initial,
  onApply,
  onClear,
}: {
  initial: DateColumnFilter;
  onApply: (filter: DateColumnFilter) => void;
  onClear: () => void;
}) {
  const [operator, setOperator] = useState(initial.operator);
  const [value, setValue] = useState(initial.value);
  const [valueTo, setValueTo] = useState(initial.valueTo ?? "");

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onApply({
          kind: "date",
          operator,
          value,
          valueTo: operator === "between" ? valueTo : undefined,
        });
      }}
    >
      <select
        value={operator}
        onChange={(e) =>
          setOperator(e.target.value as DateColumnFilter["operator"])
        }
        className={selectClass}
      >
        <option value="after">After</option>
        <option value="before">Before</option>
        <option value="between">Between</option>
      </select>
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={inputClass}
      />
      {operator === "between" && (
        <input
          type="date"
          value={valueTo}
          onChange={(e) => setValueTo(e.target.value)}
          className={inputClass}
        />
      )}
      <FilterActions onClear={onClear} />
    </form>
  );
}

function ChecklistFilter({
  values,
  selected,
  onApply,
}: {
  values: string[];
  selected: string[];
  onApply: (values: string[]) => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(selected));

  const toggle = (value: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <div>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {values.map((value) => (
          <label
            key={value}
            className="flex items-center gap-2 rounded px-1 py-0.5 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            <input
              type="checkbox"
              checked={checked.has(value)}
              onChange={() => toggle(value)}
              className="rounded border-zinc-300"
            />
            <span className="truncate">{value}</span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onApply([...checked])}
          className="btn-primary flex-1 px-2 py-1.5 text-xs"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => onApply([])}
          className="btn-secondary px-2 py-1.5 text-xs"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function FilterActions({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="submit" className="btn-primary flex-1 px-2 py-1.5 text-xs">
        Apply
      </button>
      <button
        type="button"
        onClick={onClear}
        className="btn-secondary px-2 py-1.5 text-xs"
      >
        Clear
      </button>
    </div>
  );
}
