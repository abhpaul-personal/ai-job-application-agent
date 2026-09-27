import { describe, expect, it, vi } from "vitest";
import {
  deleteProfileForUser,
  deleteTrackerRecordForUser,
  getProfileForUser,
  getTrackerRecordsForUser,
  saveProfileForUser,
  saveTrackerRecordForUser,
  type SqlQuery,
} from "./db";
import { defaultProfile } from "./loadProfile";
import type { TrackerRecord } from "./schema";

const trackerRecord: TrackerRecord = {
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
  entryOrigin: "Manual",
};

// A fake tagged-template query function — records what it was called with
// and returns canned rows, so this is testable without a real database.
function fakeSql(rows: unknown[] = []) {
  const calls: { strings: TemplateStringsArray; values: unknown[] }[] = [];
  const fn = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ strings, values });
    return rows;
  }) as unknown as SqlQuery & { calls: typeof calls };
  fn.calls = calls;
  return fn;
}

describe("getProfileForUser", () => {
  it("returns null when there's no row", async () => {
    const sql = fakeSql([]);
    expect(await getProfileForUser("user-1", sql)).toBeNull();
  });

  it("returns the parsed profile when a valid row exists", async () => {
    const sql = fakeSql([{ profile: defaultProfile }]);
    expect(await getProfileForUser("user-1", sql)).toEqual(defaultProfile);
  });

  it("queries by the given user id", async () => {
    const sql = fakeSql([]);
    await getProfileForUser("user-42", sql);
    expect((sql as unknown as { calls: { values: unknown[] }[] }).calls[0].values).toContain(
      "user-42",
    );
  });

  it("treats a malformed stored profile as no profile, without throwing", async () => {
    const sql = fakeSql([{ profile: { basics: { name: "incomplete" } } }]);
    expect(await getProfileForUser("user-1", sql)).toBeNull();
  });
});

describe("saveProfileForUser", () => {
  it("writes the user id and profile JSON", async () => {
    const sql = fakeSql([]);
    await saveProfileForUser("user-1", defaultProfile, sql);
    const { values } = (sql as unknown as { calls: { values: unknown[] }[] }).calls[0];
    expect(values).toContain("user-1");
    expect(values).toContain(JSON.stringify(defaultProfile));
  });
});

describe("deleteProfileForUser", () => {
  it("deletes by the given user id", async () => {
    const sql = fakeSql([]);
    await deleteProfileForUser("user-1", sql);
    expect((sql as unknown as { calls: { values: unknown[] }[] }).calls[0].values).toContain(
      "user-1",
    );
  });
});

describe("getTrackerRecordsForUser", () => {
  it("returns an empty array when there are no rows", async () => {
    const sql = fakeSql([]);
    expect(await getTrackerRecordsForUser("user-1", sql)).toEqual([]);
  });

  it("returns parsed records for valid rows", async () => {
    const sql = fakeSql([{ record: trackerRecord }]);
    expect(await getTrackerRecordsForUser("user-1", sql)).toEqual([trackerRecord]);
  });

  it("migrates a pre-entryOrigin row to Manual without losing any other data", async () => {
    const { entryOrigin, ...preMigrationRecord } = trackerRecord;
    void entryOrigin;
    const sql = fakeSql([{ record: preMigrationRecord }]);
    const [result] = await getTrackerRecordsForUser("user-1", sql);
    expect(result).toEqual({ ...preMigrationRecord, entryOrigin: "Manual" });
  });

  it("queries by the given user id", async () => {
    const sql = fakeSql([]);
    await getTrackerRecordsForUser("user-42", sql);
    expect((sql as unknown as { calls: { values: unknown[] }[] }).calls[0].values).toContain(
      "user-42",
    );
  });

  it("skips a malformed row instead of throwing", async () => {
    const sql = fakeSql([{ record: { company: "incomplete" } }, { record: trackerRecord }]);
    expect(await getTrackerRecordsForUser("user-1", sql)).toEqual([trackerRecord]);
  });
});

describe("saveTrackerRecordForUser", () => {
  it("writes the id, user id, and record JSON", async () => {
    const sql = fakeSql([]);
    await saveTrackerRecordForUser("user-1", trackerRecord, sql);
    const { values } = (sql as unknown as { calls: { values: unknown[] }[] }).calls[0];
    expect(values).toContain("user-1");
    expect(values).toContain(trackerRecord.id);
    expect(values).toContain(JSON.stringify(trackerRecord));
  });
});

describe("deleteTrackerRecordForUser", () => {
  it("deletes by id scoped to the given user id", async () => {
    const sql = fakeSql([]);
    await deleteTrackerRecordForUser("user-1", "record-1", sql);
    const { values } = (sql as unknown as { calls: { values: unknown[] }[] }).calls[0];
    expect(values).toContain("user-1");
    expect(values).toContain("record-1");
  });
});
