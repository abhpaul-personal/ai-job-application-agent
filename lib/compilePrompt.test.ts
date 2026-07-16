import { describe, expect, it } from "vitest";
import { compileSystemPrompt } from "./compilePrompt";
import { defaultProfile } from "./loadProfile";
import type { Profile } from "./schema";

describe("compileSystemPrompt", () => {
  it("matches the snapshot for the example profile", () => {
    expect(compileSystemPrompt(defaultProfile)).toMatchSnapshot();
  });

  it("is deterministic for the same input", () => {
    const first = compileSystemPrompt(defaultProfile);
    const second = compileSystemPrompt(defaultProfile);
    expect(first).toBe(second);
  });

  it("caps the rendered story bank at 8 items", () => {
    const manyStories: Profile["storyBank"] = Array.from({ length: 10 }, (_, i) => ({
      name: `Story ${i + 1}`,
      one_liner: `One-liner ${i + 1}`,
      metrics: `Metric ${i + 1}`,
      themes: ["theme"],
    }));
    const profile: Profile = { ...defaultProfile, storyBank: manyStories };
    const prompt = compileSystemPrompt(profile);

    for (let i = 1; i <= 8; i++) {
      expect(prompt).toContain(`Story ${i}`);
    }
    expect(prompt).not.toContain("Story 9");
    expect(prompt).not.toContain("Story 10");
  });
});
