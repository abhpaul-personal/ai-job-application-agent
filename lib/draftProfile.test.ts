import { describe, expect, it } from "vitest";
import { emptyDraft, mergeProfileDraft, type ProfileDraft } from "./draftProfile";
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
