"use client";
// FilterConditionEditor — deep-edit a Filter node's conditions list.
//
// Replaces the v1.0.3 read-only block in Inspector.tsx. One table row per
// condition, with op-aware value inputs:
//
//   eq   / neq     → single-line text input
//   matches        → single-line regex input
//   in   / not_in  → comma/newline chip list + add-chip box
//   timeOfDay eq   → "HH:MM-HH:MM" range input
//
// The AND/OR logic toggle persists on FilterNode.logic. Live validation
// surfaces a small inline error when a row would fail the Zod schema; the
// publish-guard still re-validates at save time.

import { useId } from "react";
import {
  FILTER_FIELDS,
  type FilterCondition,
  type FilterField,
  type FilterLogic,
  type FilterOp,
  coerceValue,
  legalOpsForField,
  parseChips,
  validateConditions,
} from "./filter-conditions";

const inp = {
  fontFamily: "var(--sans)",
  fontSize: 12,
  padding: "4px 8px",
  border: "1px solid var(--bd-1)",
  background: "var(--bg-1)",
  color: "var(--fg-0)",
  borderRadius: 3,
  width: "100%",
  boxSizing: "border-box" as const,
};

const btn = (active?: boolean) =>
  ({
    fontSize: 11,
    padding: "4px 8px",
    border: `1px solid ${active ? "var(--fg-0)" : "var(--bd-1)"}`,
    background: active ? "var(--bg-3)" : "var(--bg-2)",
    color: "var(--fg-0)",
    borderRadius: 3,
    cursor: "pointer",
  }) as const;

interface Props {
  node: { conditions: FilterCondition[]; logic: FilterLogic };
  readOnly: boolean;
  onChange: (patch: { conditions: FilterCondition[]; logic: FilterLogic }) => void;
}

export function FilterConditionEditor({ node, readOnly, onChange }: Props) {
  const conditions = node.conditions;
  const logic = node.logic ?? "AND";
  const validity = validateConditions(conditions);
  const errorRowIndex = !validity.ok ? validity.index : undefined;
  const inlineError = !validity.ok ? validity.error : null;

  const logicHintId = useId();

  const patchRow = (i: number, next: FilterCondition) => {
    const rows = conditions.map((r, idx) => (idx === i ? next : r));
    onChange({ conditions: rows, logic });
  };

  const removeRow = (i: number) => {
    if (conditions.length <= 1) return;
    const rows = conditions.filter((_, idx) => idx !== i);
    onChange({ conditions: rows, logic });
  };

  const addRow = () => {
    const next: FilterCondition = { field: "geo", op: "in", value: [] };
    onChange({ conditions: [...conditions, next], logic });
  };

  const setLogic = (next: FilterLogic) => onChange({ conditions, logic: next });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{ fontSize: 10, color: "var(--fg-2)", letterSpacing: "0.08em" }}
          id={logicHintId}
        >
          LOGIC
        </span>
        <div style={{ display: "flex", gap: 4 }} aria-labelledby={logicHintId}>
          {(["AND", "OR"] as FilterLogic[]).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={logic === l}
              disabled={readOnly}
              onClick={() => setLogic(l)}
              style={btn(logic === l)}
            >
              {l}
            </button>
          ))}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "var(--fg-2)",
            marginLeft: "auto",
            fontFamily: "var(--mono)",
          }}
        >
          {conditions.length} row{conditions.length === 1 ? "" : "s"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
        {conditions.map((row, i) => (
          <FilterRow
            // biome-ignore lint/suspicious/noArrayIndexKey: condition rows are identified by position
            key={i}
            index={i}
            row={row}
            readOnly={readOnly}
            hasError={errorRowIndex === i}
            onPatch={(next) => patchRow(i, next)}
            onRemove={() => removeRow(i)}
            canRemove={conditions.length > 1}
          />
        ))}
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          style={{
            ...btn(false),
            alignSelf: "flex-start",
            marginTop: 2,
          }}
        >
          + Add condition
        </button>
      )}

      {inlineError && (
        <div
          role="alert"
          style={{
            marginTop: 4,
            padding: "6px 8px",
            border: "1px solid oklch(60% 0.15 25)",
            background: "oklch(22% 0.08 25)",
            color: "oklch(88% 0.08 25)",
            fontSize: 11,
            borderRadius: 3,
          }}
        >
          {inlineError}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  index: number;
  row: FilterCondition;
  readOnly: boolean;
  hasError: boolean;
  canRemove: boolean;
  onPatch: (next: FilterCondition) => void;
  onRemove: () => void;
}

function FilterRow({ index, row, readOnly, hasError, canRemove, onPatch, onRemove }: RowProps) {
  const legalOps = legalOpsForField(row.field);
  const fieldId = `filter-row-${index}-field`;
  const opId = `filter-row-${index}-op`;
  const valId = `filter-row-${index}-val`;

  const onFieldChange = (field: FilterField) => {
    const ops = legalOpsForField(field);
    const op = ops.includes(row.op) ? row.op : (ops[0] ?? "eq");
    const value = coerceValue(row.value, row.op, op, field);
    onPatch({ ...row, field, op, value } as FilterCondition);
  };

  const onOpChange = (op: FilterOp) => {
    const value = coerceValue(row.value, row.op, op, row.field);
    onPatch({ ...row, op, value } as FilterCondition);
  };

  const onValueChange = (value: FilterCondition["value"]) => {
    onPatch({ ...row, value } as FilterCondition);
  };

  const isSetOp = row.op === "in" || row.op === "not_in";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 110px 1fr auto auto",
        gap: 4,
        alignItems: "start",
        padding: 6,
        border: `1px solid ${hasError ? "oklch(60% 0.15 25)" : "var(--bd-1)"}`,
        borderRadius: 3,
        background: "var(--bg-1)",
      }}
    >
      <select
        id={fieldId}
        aria-label={`condition ${index + 1} field`}
        disabled={readOnly}
        value={row.field}
        onChange={(e) => onFieldChange(e.target.value as FilterField)}
        style={{ ...inp, appearance: "auto" }}
      >
        {FILTER_FIELDS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <select
        id={opId}
        aria-label={`condition ${index + 1} op`}
        disabled={readOnly}
        value={row.op}
        onChange={(e) => onOpChange(e.target.value as FilterOp)}
        style={{ ...inp, appearance: "auto" }}
      >
        {legalOps.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <div style={{ minWidth: 0 }}>
        {isSetOp ? (
          <ChipValue
            valueId={valId}
            ariaLabel={`condition ${index + 1} values`}
            readOnly={readOnly}
            value={
              Array.isArray(row.value) ? row.value : row.value === "" ? [] : [String(row.value)]
            }
            onChange={onValueChange}
          />
        ) : row.field === "timeOfDay" ? (
          <input
            id={valId}
            aria-label={`condition ${index + 1} time range`}
            disabled={readOnly}
            placeholder="00:00-24:00"
            value={Array.isArray(row.value) ? (row.value[0] ?? "") : String(row.value ?? "")}
            onChange={(e) => onValueChange(e.target.value)}
            style={inp}
          />
        ) : (
          <input
            id={valId}
            aria-label={`condition ${index + 1} value`}
            disabled={readOnly}
            placeholder={row.op === "matches" ? "regex (e.g. ^google)" : "value"}
            value={Array.isArray(row.value) ? (row.value[0] ?? "") : String(row.value ?? "")}
            onChange={(e) => onValueChange(e.target.value)}
            style={inp}
          />
        )}
      </div>
      <label
        title="case-sensitive match"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          fontSize: 10,
          color: "var(--fg-2)",
          cursor: readOnly ? "not-allowed" : "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          aria-label={`condition ${index + 1} case-sensitive`}
          disabled={readOnly}
          checked={row.caseSensitive ?? false}
          onChange={(e) => onPatch({ ...row, caseSensitive: e.target.checked } as FilterCondition)}
        />
        Aa
      </label>
      <button
        type="button"
        aria-label={`remove condition ${index + 1}`}
        disabled={readOnly || !canRemove}
        onClick={onRemove}
        title={canRemove ? "remove row" : "must have at least 1 condition"}
        style={{
          ...btn(false),
          opacity: canRemove ? 1 : 0.4,
          cursor: canRemove && !readOnly ? "pointer" : "not-allowed",
        }}
      >
        ×
      </button>
    </div>
  );
}

interface ChipProps {
  value: string[];
  readOnly: boolean;
  valueId: string;
  ariaLabel: string;
  onChange: (next: string[]) => void;
}

function ChipValue({ value, readOnly, valueId, ariaLabel, onChange }: ChipProps) {
  const removeChip = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const t = e.currentTarget;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const parsed = parseChips(t.value);
      if (parsed.length === 0) return;
      const merged = value.slice();
      for (const p of parsed) if (!merged.includes(p)) merged.push(p);
      onChange(merged);
      t.value = "";
    }
    if (e.key === "Backspace" && t.value.length === 0 && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const t = e.currentTarget;
    if (t.value.trim().length === 0) return;
    const parsed = parseChips(t.value);
    const merged = value.slice();
    for (const p of parsed) if (!merged.includes(p)) merged.push(p);
    onChange(merged);
    t.value = "";
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 3,
        padding: 3,
        border: "1px solid var(--bd-1)",
        background: "var(--bg-1)",
        borderRadius: 3,
        minHeight: 26,
      }}
    >
      {value.map((chip, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: chip identity is position
          key={i}
          style={{
            fontSize: 11,
            padding: "1px 6px",
            background: "var(--bg-3)",
            border: "1px solid var(--bd-1)",
            borderRadius: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            fontFamily: "var(--mono)",
          }}
        >
          {chip}
          {!readOnly && (
            <button
              type="button"
              onClick={() => removeChip(i)}
              aria-label={`remove ${chip}`}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--fg-2)",
                cursor: "pointer",
                fontSize: 10,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          id={valueId}
          aria-label={ariaLabel}
          placeholder={value.length === 0 ? "UA, PL, DE" : "+"}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--fg-0)",
            fontSize: 11,
            fontFamily: "var(--mono)",
            minWidth: 60,
            flex: 1,
            padding: "2px 4px",
          }}
        />
      )}
    </div>
  );
}
