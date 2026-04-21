"use client";
// Draft-vs-Publish state badge for the flow-editor breadcrumb. Consumes
// `computeDraftPublishState` and renders the matching tone. Stateless —
// parent page owns the inputs (isLatestDraft, saveInFlight, etc).

import type { DraftPublishState } from "./draft-publish-state";

interface Props {
  state: DraftPublishState;
}

const TONE_COLORS: Record<DraftPublishState["tone"], { bg: string; fg: string; border: string }> = {
  dirty: {
    bg: "oklch(22% 0.08 25)",
    fg: "oklch(90% 0.08 25)",
    border: "oklch(55% 0.15 25)",
  },
  ahead: {
    bg: "oklch(22% 0.08 75)",
    fg: "oklch(92% 0.05 75)",
    border: "oklch(55% 0.15 75)",
  },
  published: {
    bg: "oklch(22% 0.08 145)",
    fg: "oklch(90% 0.08 145)",
    border: "oklch(55% 0.15 145)",
  },
  saved: {
    bg: "var(--bg-3)",
    fg: "var(--fg-1)",
    border: "var(--bd-1)",
  },
  readonly: {
    bg: "var(--bg-2)",
    fg: "var(--fg-2)",
    border: "var(--bd-1)",
  },
};

export function DraftPublishBadge({ state }: Props) {
  const colors = TONE_COLORS[state.tone];
  return (
    <span
      title={state.detail}
      data-tone={state.tone}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        fontSize: 10,
        fontFamily: "var(--mono)",
        letterSpacing: "0.04em",
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.fg,
        borderRadius: 3,
        textTransform: "uppercase",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: colors.fg,
          opacity: state.tone === "dirty" ? 0.9 : 0.7,
        }}
      />
      {state.label}
    </span>
  );
}
