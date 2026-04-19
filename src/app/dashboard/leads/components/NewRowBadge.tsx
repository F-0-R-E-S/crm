"use client";
export function NewRowBadge({ active }: { active: boolean }) {
  return (
    <div
      className={active ? "new-row-bar" : undefined}
      style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "transparent" }}
    />
  );
}
