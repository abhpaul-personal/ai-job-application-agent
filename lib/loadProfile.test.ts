import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadProfileFromDir } from "./loadProfile";

const fixturesDir = path.join(import.meta.dirname, "__fixtures__");

describe("loadProfileFromDir", () => {
  it("loads the example profile when no local override exists", () => {
    const profile = loadProfileFromDir(path.join(fixturesDir, "example-only"));
    expect(profile.basics.name).toBe("Fixture Example Person");
  });

  it("prefers profile.local.json over the example when both exist", () => {
    const profile = loadProfileFromDir(path.join(fixturesDir, "with-override"));
    expect(profile.basics.name).toBe("Fixture Override Person");
  });

  it("never reads the real gitignored config/profile.local.json", () => {
    const profile = loadProfileFromDir(path.join(fixturesDir, "example-only"));
    expect(profile.basics.currentCompany).toBe("Fixture Co");
  });
});
