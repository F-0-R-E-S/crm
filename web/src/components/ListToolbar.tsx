import type { ReactNode } from "react";

interface ListToolbarProps {
  children?: ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  summary?: ReactNode;
}

interface ToolbarSelectProps {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}

interface ToolbarInputProps {
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "date" | "text";
  value: string;
}

export default function ListToolbar({
  children,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  searchLabel = "Search",
  summary,
}: ListToolbarProps) {
  return (
    <>
      <div className="list-toolbar">
        {typeof search === "string" && onSearchChange && (
          <label className="toolbar-field toolbar-field-grow">
            <span className="toolbar-field-label">{searchLabel}</span>
            <div className="toolbar-search-shell">
              <span className="toolbar-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                className="toolbar-control toolbar-search-input"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </label>
        )}

        {children}
      </div>

      {summary && <div className="toolbar-summary">{summary}</div>}
    </>
  );
}

export function ToolbarSelect({
  label,
  onChange,
  options,
  value,
}: ToolbarSelectProps) {
  return (
    <label className="toolbar-field">
      <span className="toolbar-field-label">{label}</span>
      <select
        className="toolbar-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ToolbarInput({
  label,
  max,
  min,
  onChange,
  placeholder,
  type = "text",
  value,
}: ToolbarInputProps) {
  return (
    <label className="toolbar-field">
      <span className="toolbar-field-label">{label}</span>
      <input
        className="toolbar-control"
        type={type}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
