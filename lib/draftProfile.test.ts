import { describe, expect, it } from "vitest";
import { emptyDraft, extractImportableFields, mergeProfileDraft, type ProfileDraft } from "./draftProfile";
import { defaultProfile } from "./loadProfile";

describe("emptyDraft", () => {
  it("pre-fills rules from defaults but leaves everything else blank", () => {
    const draft = emptyDraft(defaultProfile);
    expect(draft.rules).toEqual(defaultProfile.rules);
    expect(draft.basics).toEqual({});
    expect(draft.targets).toEqual({});
    expect(draft.storyBank).toEqual([]);
  });
});

describe("mergeProfileDraft", () => {
  it("merges an empty draft down to exactly the defaults", () => {
    const draft = emptyDraft(defaultProfile);
    const merged = mergeProfileDraft(draft, defaultProfile);
    expect(merged).toEqual(defaultProfile);
  });

  it("overrides only the fields the draft actually filled in", () => {
    const draft: ProfileDraft = {
      ...emptyDraft(defaultProfile),
      basics: { name: "Custom Name" },
    };
    const merged = mergeProfileDraft(draft, defaultProfile);
    expect(merged.basics.name).toBe("Custom Name");
    expect(merged.basics.currentTitle).toBe(defaultProfile.basics.currentTitle);
  });

  it("treats blank strings and empty arrays as skipped, not overrides", () => {
    const draft: ProfileDraft = {
      ...emptyDraft(defaultProfile),
      basics: { name: "   " },
      targets: { roleTypes: [] },
    };
    const merged = mergeProfileDraft(draft, defaultProfile);
    expect(merged.basics.name).toBe(defaultProfile.basics.name);
    expect(merged.targets.roleTypes).toEqual(defaultProfile.targets.roleTypes);
  });

  it("uses the draft's story bank when non-empty, otherwise falls back to defaults", () => {
    const filledDraft: ProfileDraft = {
      ...emptyDraft(defaultProfile),
      storyBank: [
        { name: "Custom Story", one_liner: "Did a thing", metrics: "1x", themes: ["custom"] },
      ],
    };
    expect(mergeProfileDraft(filledDraft, defaultProfile).storyBank).toEqual(
      filledDraft.storyBank,
    );

    const blankDraft = emptyDraft(defaultProfile);
    expect(mergeProfileDraft(blankDraft, defaultProfile).storyBank).toEqual(
      defaultProfile.storyBank,
    );
  });

  it("always takes formats from defaults (no formats step)", () => {
    const draft = emptyDraft(defaultProfile);
    expect(mergeProfileDraft(draft, defaultProfile).formats).toEqual(
      defaultProfile.formats,
    );
  });
});

describe("extractImportableFields", () => {
  it("keeps every field from a fully valid profile and reports nothing skipped", () => {
    const result = extractImportableFields(defaultProfile);
    expect(result.basics).toEqual(defaultProfile.basics);
    expect(result.targets).toEqual(defaultProfile.targets);
    expect(result.storyBank).toEqual(defaultProfile.storyBank);
    expect(result.rules).toEqual(defaultProfile.rules);
    expect(result.skipped).toEqual({
      basics: [],
      targets: [],
      storyBankItems: 0,
      rulesEntries: 0,
    });
  });

  it("drops only the invalid field, keeping the rest of a valid section, and reports it as skipped", () => {
    const raw = {
      ...defaultProfile,
      basics: { ...defaultProfile.basics, email: "not-an-email" },
    };
    const result = extractImportableFields(raw);
    expect(result.basics.email).toBeUndefined();
    expect(result.basics.name).toBe(defaultProfile.basics.name);
    expect(result.basics.currentTitle).toBe(defaultProfile.basics.currentTitle);
    expect(result.skipped.basics).toEqual(["email"]);
  });

  it("does not count an absent field as skipped, only a present-but-invalid one", () => {
    const raw = { basics: { name: "Just a name" } };
    const result = extractImportableFields(raw);
    expect(result.skipped.basics).toEqual([]);
  });

  it("drops story bank items that don't validate, keeps ones that do, and counts the drop", () => {
    const raw = {
      ...defaultProfile,
      storyBank: [
        defaultProfile.storyBank[0],
        { name: "Missing fields" },
      ],
    };
    const result = extractImportableFields(raw);
    expect(result.storyBank).toEqual([defaultProfile.storyBank[0]]);
    expect(result.skipped.storyBankItems).toBe(1);
  });

  it("drops non-string rules entries, keeps valid ones, and counts the drop", () => {
    const raw = { ...defaultProfile, rules: ["A real rule", 42, "  ", null] };
    const result = extractImportableFields(raw);
    expect(result.rules).toEqual(["A real rule"]);
    expect(result.skipped.rulesEntries).toBe(3);
  });

  it("returns everything empty for garbage input", () => {
    const result = extractImportableFields("not even an object");
    expect(result.basics).toEqual({});
    expect(result.targets).toEqual({});
    expect(result.storyBank).toEqual([]);
    expect(result.rules).toEqual([]);
  });

  it("returns everything empty for null", () => {
    const result = extractImportableFields(null);
    expect(result.basics).toEqual({});
    expect(result.targets).toEqual({});
    expect(result.storyBank).toEqual([]);
    expect(result.rules).toEqual([]);
  });
});
