import { ProfileSchema, type Profile, type StoryBankItem } from "./schema";

export type BasicsDraft = Partial<Profile["basics"]>;
export type TargetsDraft = Partial<Profile["targets"]>;

export interface ProfileDraft {
  basics: BasicsDraft;
  targets: TargetsDraft;
  storyBank: StoryBankItem[];
  rules: string[];
}

// Rules starts pre-filled from the defaults (PRD: "Prefilled ... user edits"),
// unlike basics/targets/storyBank which start blank (PRD: "skippable ...
// inherits default").
export function emptyDraft(defaults: Profile): ProfileDraft {
  return {
    basics: {},
    targets: {},
    storyBank: [],
    rules: [...defaults.rules],
  };
}

function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  (Object.keys(obj) as (keyof T)[]).forEach((key) => {
    const value = obj[key];
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    result[key] = value;
  });
  return result;
}

export function mergeProfileDraft(draft: ProfileDraft, defaults: Profile): Profile {
  const merged = {
    basics: { ...defaults.basics, ...compact(draft.basics) },
    targets: { ...defaults.targets, ...compact(draft.targets) },
    storyBank: draft.storyBank.length > 0 ? draft.storyBank : defaults.storyBank,
    rules: draft.rules,
    formats: defaults.formats,
  };
  return ProfileSchema.parse(merged);
}
