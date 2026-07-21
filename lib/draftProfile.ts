import { z } from "zod";
import {
  ProfileSchema,
  StoryBankItemSchema,
  WorkModeSchema,
  type Profile,
  type StoryBankItem,
} from "./schema";

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

const BASICS_FIELD_SCHEMAS: { [K in keyof Profile["basics"]]: z.ZodTypeAny } = {
  name: z.string(),
  email: z.string().email(),
  currentTitle: z.string(),
  currentCompany: z.string(),
  location: z.string(),
  noticePeriodDays: z.number().int().nonnegative(),
  currentCtcLpa: z.number().nonnegative(),
  expectedCtcMinLpa: z.number().nonnegative(),
  expectedCtcMaxLpa: z.number().nonnegative(),
  relocation: z.string(),
};

const TARGETS_FIELD_SCHEMAS: { [K in keyof Profile["targets"]]: z.ZodTypeAny } = {
  roleTypes: z.string().array(),
  seniority: z.string(),
  industries: z.string().array(),
  workMode: WorkModeSchema.array(),
  experienceFraming: z.string(),
};

function pickValidFields<T extends Record<string, unknown>>(
  fieldSchemas: { [K in keyof T]: z.ZodTypeAny },
  raw: unknown,
): { valid: Partial<T>; skipped: string[] } {
  const valid: Partial<T> = {};
  const skipped: string[] = [];
  if (typeof raw !== "object" || raw === null) return { valid, skipped };
  const source = raw as Record<string, unknown>;
  (Object.keys(fieldSchemas) as (keyof T)[]).forEach((key) => {
    // A key absent from the file entirely isn't "skipped" — the file never
    // claimed to have it. Only a present-but-invalid value counts, so the
    // import summary can tell the user specifically what to double-check.
    if (!(key in source)) return;
    const parsed = fieldSchemas[key].safeParse(source[key as string]);
    if (parsed.success) {
      valid[key] = parsed.data as T[keyof T];
    } else {
      skipped.push(key as string);
    }
  });
  return { valid, skipped };
}

export interface ImportedProfileFields {
  basics: BasicsDraft;
  targets: TargetsDraft;
  storyBank: StoryBankItem[];
  rules: string[];
  skipped: {
    basics: string[];
    targets: string[];
    storyBankItems: number;
    rulesEntries: number;
  };
}

// Field-by-field, not ProfileSchema.parse(): an imported file is expected to
// be partial or slightly off (hand-edited, copied from elsewhere). Whatever
// validates gets pre-filled into the wizard draft; whatever doesn't is left
// blank for the user to fill in themselves, same as any other skippable
// field in a fresh wizard. `skipped` is returned (not just dropped) so the
// UI can tell the user what to check, rather than silently going quiet.
export function extractImportableFields(raw: unknown): ImportedProfileFields {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const basicsResult = pickValidFields<Profile["basics"]>(BASICS_FIELD_SCHEMAS, source.basics);
  const targetsResult = pickValidFields<Profile["targets"]>(TARGETS_FIELD_SCHEMAS, source.targets);
  const storyBankRaw = Array.isArray(source.storyBank) ? source.storyBank : [];
  const storyBank = storyBankRaw.filter(
    (item): item is StoryBankItem => StoryBankItemSchema.safeParse(item).success,
  );
  const rulesRaw = Array.isArray(source.rules) ? source.rules : [];
  const rules = rulesRaw.filter((r): r is string => typeof r === "string" && r.trim() !== "");
  return {
    basics: basicsResult.valid,
    targets: targetsResult.valid,
    storyBank,
    rules,
    skipped: {
      basics: basicsResult.skipped,
      targets: targetsResult.skipped,
      storyBankItems: storyBankRaw.length - storyBank.length,
      rulesEntries: rulesRaw.length - rules.length,
    },
  };
}
