import { describe, expect, it } from "vitest";
import { shouldOfferMigration } from "./profileMigration";
import { defaultProfile } from "./loadProfile";

describe("shouldOfferMigration", () => {
  it("offers migration when signed in, no DB profile, and a local one exists", () => {
    expect(shouldOfferMigration(true, null, defaultProfile)).toBe(true);
  });

  it("does not offer when signed out", () => {
    expect(shouldOfferMigration(false, null, defaultProfile)).toBe(false);
  });

  it("does not offer when a DB profile already exists", () => {
    expect(shouldOfferMigration(true, defaultProfile, defaultProfile)).toBe(false);
  });

  it("does not offer when there is no local profile to migrate", () => {
    expect(shouldOfferMigration(true, null, null)).toBe(false);
  });
});
