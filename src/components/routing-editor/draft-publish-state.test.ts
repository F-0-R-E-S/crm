import { describe, expect, it } from "vitest";
import { type ComputeArgs, computeDraftPublishState } from "./draft-publish-state";

const base: ComputeArgs = {
  flowStatus: "DRAFT",
  isLatestDraft: true,
  saveInFlight: false,
  debouncePending: false,
  savedAt: null,
  now: Date.now(),
  activeVersionNumber: null,
  latestVersionNumber: null,
};

describe("computeDraftPublishState", () => {
  it("returns READ-ONLY for archived flows", () => {
    const s = computeDraftPublishState({ ...base, flowStatus: "ARCHIVED" });
    expect(s.tone).toBe("readonly");
    expect(s.label).toBe("ARCHIVED");
  });

  it("returns READ-ONLY when viewing a historical (non-tip) version", () => {
    const s = computeDraftPublishState({ ...base, isLatestDraft: false });
    expect(s.tone).toBe("readonly");
    expect(s.label).toBe("READ-ONLY");
  });

  it("prefers READ-ONLY over any other state when applicable", () => {
    const s = computeDraftPublishState({
      ...base,
      flowStatus: "ARCHIVED",
      saveInFlight: true,
      debouncePending: true,
    });
    expect(s.tone).toBe("readonly");
  });

  it("reports dirty when save is in flight", () => {
    const s = computeDraftPublishState({ ...base, saveInFlight: true });
    expect(s.tone).toBe("dirty");
    expect(s.label).toContain("unsaved");
  });

  it("reports dirty when debounce is pending", () => {
    const s = computeDraftPublishState({ ...base, debouncePending: true });
    expect(s.tone).toBe("dirty");
    expect(s.label).toContain("unsaved");
  });

  it("reports PUBLISHED when status is PUBLISHED and no draft-ahead delta", () => {
    const s = computeDraftPublishState({
      ...base,
      flowStatus: "PUBLISHED",
      activeVersionNumber: 3,
      latestVersionNumber: 3,
    });
    expect(s.tone).toBe("published");
    expect(s.label).toBe("PUBLISHED");
  });

  it("reports DRAFT — ahead of published by N edits", () => {
    const s = computeDraftPublishState({
      ...base,
      flowStatus: "PUBLISHED",
      activeVersionNumber: 3,
      latestVersionNumber: 7,
    });
    expect(s.tone).toBe("ahead");
    expect(s.aheadBy).toBe(4);
    expect(s.label).toBe("DRAFT — ahead of published by 4 edits");
  });

  it("pluralizes correctly for aheadBy=1", () => {
    const s = computeDraftPublishState({
      ...base,
      flowStatus: "PUBLISHED",
      activeVersionNumber: 3,
      latestVersionNumber: 4,
    });
    expect(s.label).toBe("DRAFT — ahead of published by 1 edit");
  });

  it("reports DRAFT (saved Ns ago) when savedAt is set and status is DRAFT", () => {
    const savedAt = new Date(1_700_000_000_000);
    const s = computeDraftPublishState({
      ...base,
      savedAt,
      now: savedAt.getTime() + 5_000,
    });
    expect(s.tone).toBe("saved");
    expect(s.label).toBe("DRAFT — saved 5s ago");
    expect(s.savedAgoSec).toBe(5);
  });

  it("uses `just now` for sub-2s delta", () => {
    const savedAt = new Date(1_700_000_000_000);
    const s = computeDraftPublishState({
      ...base,
      savedAt,
      now: savedAt.getTime() + 500,
    });
    expect(s.label).toBe("DRAFT — saved just now");
  });

  it("uses m-scale when > 60s old", () => {
    const savedAt = new Date(1_700_000_000_000);
    const s = computeDraftPublishState({
      ...base,
      savedAt,
      now: savedAt.getTime() + 125_000,
    });
    expect(s.label).toBe("DRAFT — saved 2m ago");
  });

  it("uses h-scale when > 3600s old", () => {
    const savedAt = new Date(1_700_000_000_000);
    const s = computeDraftPublishState({
      ...base,
      savedAt,
      now: savedAt.getTime() + 2 * 3600_000 + 5_000,
    });
    expect(s.label).toBe("DRAFT — saved 2h ago");
  });

  it("falls back to plain DRAFT when savedAt is null", () => {
    const s = computeDraftPublishState({ ...base });
    expect(s.tone).toBe("saved");
    expect(s.label).toBe("DRAFT");
  });

  it("dirty takes precedence over draft-ahead computation", () => {
    const s = computeDraftPublishState({
      ...base,
      flowStatus: "PUBLISHED",
      activeVersionNumber: 1,
      latestVersionNumber: 5,
      debouncePending: true,
    });
    expect(s.tone).toBe("dirty");
  });
});
