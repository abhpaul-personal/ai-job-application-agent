import { describe, expect, it } from "vitest";
import type { KeyValueStorage } from "./profileStorage";
import { deleteTrackerRecord, getTrackerRecords, saveTrackerRecord } from "./trackerStorage";
import { TRACKER_STORAGE_KEY, type TrackerRecord } from "./schema";

function fakeStorage(): KeyValueStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

function record(overrides: Partial<TrackerRecord> = {}): TrackerRecord {
  return {
    id: "record-1",
    role: "TPM",
    company: "Agoda",
    track: "TPM",
    compBand: "40-55 LPA",
    source: "LinkedIn",
    appliedDate: "2026-07-01",
    lastUpdatedDate: "2026-07-01",
    status: "Applied",
    nextAction: "Follow up",
    ...overrides,
  };
}

describe("getTrackerRecords", () => {
  it("returns an empty array before anything is saved", () => {
    expect(getTrackerRecords(fakeStorage())).toEqual([]);
  });

  it("returns an empty array for corrupted stored JSON", () => {
    const storage = fakeStorage();
    storage.setItem(TRACKER_STORAGE_KEY, "{not json");
    expect(getTrackerRecords(storage)).toEqual([]);
  });
});

describe("saveTrackerRecord", () => {
  it("adds a new record", () => {
    const storage = fakeStorage();
    saveTrackerRecord(record(), storage);
    expect(getTrackerRecords(storage)).toEqual([record()]);
  });

  it("upserts by id instead of duplicating", () => {
    const storage = fakeStorage();
    saveTrackerRecord(record(), storage);
    saveTrackerRecord(record({ status: "Interview" }), storage);
    const records = getTrackerRecords(storage);
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("Interview");
  });

  it("keeps other records untouched", () => {
    const storage = fakeStorage();
    saveTrackerRecord(record({ id: "record-1" }), storage);
    saveTrackerRecord(record({ id: "record-2", company: "Stripe" }), storage);
    expect(getTrackerRecords(storage)).toHaveLength(2);
  });
});

describe("deleteTrackerRecord", () => {
  it("removes only the given id", () => {
    const storage = fakeStorage();
    saveTrackerRecord(record({ id: "record-1" }), storage);
    saveTrackerRecord(record({ id: "record-2", company: "Stripe" }), storage);
    deleteTrackerRecord("record-1", storage);
    const records = getTrackerRecords(storage);
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("record-2");
  });
});
