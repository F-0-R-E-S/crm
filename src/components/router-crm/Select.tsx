"use client";
import { inputStyle } from "./InputShell";
import { useThemeCtx } from "@/components/shell/ThemeProvider";

interface Opt { v: string; l: string }

export function Select({
  value, onChange, options, placeholder, width,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  placeholder?: string;
  width?: number;
}) {
  const { theme } = useThemeCtx();
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle(theme), width, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0 L4 6 L8 0 Z' fill='%23888'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 24 }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}
