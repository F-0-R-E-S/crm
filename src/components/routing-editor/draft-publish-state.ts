// Pure helper: compute the headline state indicator for a flow editor
// breadcrumb.
//
// State machine (first match wins):
//
//   1. DIRTY_UNSAVED   — there are pending edits that haven't been saved
//                        (save in flight OR debounced-save pending).
//   2. DRAFT_AHEAD     — draft version is strictly newer than the
//                        published active version (user saved N more edits
//                        on top of the published graph).
//   3. PUBLISHED       — current draft === active published version.
//   4. DRAFT_SAVED     — saved, but no published version exists yet.
//   5. READ_ONLY       — user is viewing an older / archived version.

export type DraftPublishTone = "dirty" | "ahead" | "published" | "saved" | "readonly";

export interface DraftPublishState {
  tone: DraftPublishTone;
  label: string;
  /** Tooltip text for screen readers / hover. */
  detail: string;
  /** When DRAFT_SAVED, elapsed seconds since last save. */
  savedAgoSec?: number;
  /** When DRAFT_AHEAD, how many draft versions ahead of published. */
  aheadBy?: number;
}

export interface ComputeArgs {
  /** Which status is persisted on the Flow row. */
  flowStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  /** Whether the user is looking at the latest (editable) draft. */
  isLatestDraft: boolean;
  /** Pending in-flight save mutation(s). */
  saveInFlight: boolean;
  /**
   * When this is truthy, debounced-save has queued edits that haven't
   * been flushed to the server yet.
   */
  debouncePending: boolean;
  /** Last successful save time. */
  savedAt: Date | null;
  /** ms — usually Date.now(); param-ized for deterministic tests. */
  now: number;
  /**
   * Version numbers. We use them to detect "draft ahead of published".
   */
  activeVersionNumber?: number | null;
  latestVersionNumber?: number | null;
}

export function computeDraftPublishState(args: ComputeArgs): DraftPublishState {
  const {
    flowStatus,
    isLatestDraft,
    saveInFlight,
    debouncePending,
    savedAt,
    now,
    activeVersionNumber,
    latestVersionNumber,
  } = args;

  // Read-only: user is viewing an archived flow, or not looking at the
  // editable draft tip.
  if (flowStatus === "ARCHIVED" || !isLatestDraft) {
    return {
      tone: "readonly",
      label: flowStatus === "ARCHIVED" ? "ARCHIVED" : "READ-ONLY",
      detail:
        flowStatus === "ARCHIVED"
          ? "This flow is archived. Clone to make changes."
          : "You are viewing a historical version — structural edits are disabled.",
    };
  }

  if (saveInFlight || debouncePending) {
    return {
      tone: "dirty",
      label: "DRAFT — unsaved changes",
      detail: saveInFlight
        ? "Save in flight…"
        : "You have pending edits — they will auto-save in a moment.",
    };
  }

  // Draft-ahead detection: the latest version number is strictly > the
  // currently-active published version number.
  if (
    typeof activeVersionNumber === "number" &&
    typeof latestVersionNumber === "number" &&
    latestVersionNumber > activeVersionNumber
  ) {
    const aheadBy = latestVersionNumber - activeVersionNumber;
    return {
      tone: "ahead",
      label: `DRAFT — ahead of published by ${aheadBy} edit${aheadBy === 1 ? "" : "s"}`,
      detail:
        "Draft graph is newer than the active PUBLISHED version. Publish to promote, or keep iterating.",
      aheadBy,
    };
  }

  if (flowStatus === "PUBLISHED") {
    return {
      tone: "published",
      label: "PUBLISHED",
      detail: "Current draft matches the active published version.",
    };
  }

  // Default DRAFT state — saved, no published version to compare to.
  if (savedAt) {
    const sec = Math.max(0, Math.floor((now - savedAt.getTime()) / 1000));
    return {
      tone: "saved",
      label: `DRAFT — saved ${formatAgo(sec)}`,
      detail: "Draft is persisted. No published version yet.",
      savedAgoSec: sec,
    };
  }

  return {
    tone: "saved",
    label: "DRAFT",
    detail: "Draft is persisted. No published version yet.",
  };
}

function formatAgo(sec: number): string {
  if (sec < 2) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}
