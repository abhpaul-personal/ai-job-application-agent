import { describe, expect, it, vi } from "vitest";
import { deleteProfileForUser, getProfileForUser, saveProfileForUser, type SqlQuery } from "./db";
import { defaultProfile } from "./loadProfile";

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
