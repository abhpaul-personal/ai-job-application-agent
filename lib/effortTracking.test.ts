import { describe, expect, it } from "vitest";
import {
  getWeekStartISO,
  getWeeklyAnalysisCount,
  incrementWeeklyAnalysisCount,
  type KeyValueStorage,
} from "./effortTracking";

function fakeStorage(): KeyValueStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

describe("getWeekStartISO", () => {
  it("anchors to the Monday of the given week", () => {
    // Wednesday 2026-07-15 -> Monday 2026-07-13
    expect(getWeekStartISO(new Date("2026-07-15T12:00:00Z"))).toBe("2026-07-13");
  });

  it("treats Sunday as the last day of the previous week", () => {
    // Sunday 2026-07-19 -> Monday 2026-07-13
    expect(getWeekStartISO(new Date("2026-07-19T12:00:00Z"))).toBe("2026-07-13");
  });

  it("maps Monday to itself", () => {
    expect(getWeekStartISO(new Date("2026-07-13T12:00:00Z"))).toBe("2026-07-13");
  });
});

describe("getWeeklyAnalysisCount", () => {
  it("returns 0 when nothing has been stored", () => {
    expect(getWeeklyAnalysisCount(fakeStorage(), new Date("2026-07-15T12:00:00Z"))).toBe(0);
  });
});

describe("incrementWeeklyAnalysisCount", () => {
  it("increments within the same week", () => {
    const storage = fakeStorage();
    const monday = new Date("2026-07-13T09:00:00Z");
    const wednesday = new Date("2026-07-15T09:00:00Z");
    expect(incrementWeeklyAnalysisCount(storage, monday)).toBe(1);
    expect(incrementWeeklyAnalysisCount(storage, wednesday)).toBe(2);
    expect(getWeeklyAnalysisCount(storage, wednesday)).toBe(2);
  });

  it("resets when the stored week doesn't match the current week", () => {
    const storage = fakeStorage();
    const lastWeek = new Date("2026-07-08T09:00:00Z");
    const thisWeek = new Date("2026-07-15T09:00:00Z");
    expect(incrementWeeklyAnalysisCount(storage, lastWeek)).toBe(1);
    expect(incrementWeeklyAnalysisCount(storage, lastWeek)).toBe(2);
    expect(incrementWeeklyAnalysisCount(storage, thisWeek)).toBe(1);
    expect(getWeeklyAnalysisCount(storage, thisWeek)).toBe(1);
  });
});
