import { z } from "zod";

export const BasicsSchema = z
  .object({
    name: z.string(),
    currentTitle: z.string(),
    currentCompany: z.string(),
    location: z.string(),
    noticePeriodDays: z.number().int().nonnegative(),
    currentCtcLpa: z.number().nonnegative(),
    expectedCtcMinLpa: z.number().nonnegative(),
    expectedCtcMaxLpa: z.number().nonnegative(),
    relocation: z.string(),
  })
  .refine((basics) => basics.expectedCtcMaxLpa >= basics.expectedCtcMinLpa, {
    message: "expectedCtcMaxLpa must be >= expectedCtcMinLpa",
    path: ["expectedCtcMaxLpa"],
  });

export const WorkModeSchema = z.enum(["Onsite", "Hybrid", "Remote"]);

export const TargetsSchema = z.object({
  roleTypes: z.string().array(),
  seniority: z.string(),
  industries: z.string().array(),
  workMode: WorkModeSchema.array(),
  experienceFraming: z.string(),
});

export const StoryBankItemSchema = z.object({
  name: z.string(),
  one_liner: z.string(),
  metrics: z.string(),
  themes: z.string().array(),
});

export const StoryBankSchema = StoryBankItemSchema.array();

export const RulesSchema = z.string().array();

export const FormatsSchema = z.object({
  coverLetter: z.string(),
  recruiterDm: z.string(),
});

export const ProfileSchema = z.object({
  basics: BasicsSchema,
  targets: TargetsSchema,
  storyBank: StoryBankSchema,
  rules: RulesSchema,
  formats: FormatsSchema,
});

export const PROFILE_STORAGE_KEY = "aka.profile";

export type Profile = z.infer<typeof ProfileSchema>;
export type StoryBankItem = z.infer<typeof StoryBankItemSchema>;

export const ScamFlagTypeSchema = z.enum([
  "genericEmailDomain",
  "chatAppFirstRecruitment",
  "feeOrDepositRequest",
  "missingFromCareersPage",
  "other",
]);

export const FitAnalysisSchema = z.object({
  fitScore: z.number().int().min(0).max(100),
  verdict: z.string(),
  matchedStrengths: z
    .object({
      storyName: z.string(),
      whyItMatches: z.string(),
    })
    .array(),
  gaps: z.string().array(),
  salaryCheck: z.object({
    meetsFloor: z.boolean(),
    note: z.string(),
  }),
  scamFlags: z
    .object({
      type: ScamFlagTypeSchema,
      detail: z.string(),
    })
    .array(),
});

export type FitAnalysis = z.infer<typeof FitAnalysisSchema>;

export const ApplicationKitSchema = z.object({
  cvHeadline: z.string(),
  cvBullets: z.string().array().length(5),
  coverLetter: z.string(),
  recruiterDm: z.string().max(300),
});

export type ApplicationKit = z.infer<typeof ApplicationKitSchema>;

export const AnalysisRequestSchema = z.object({
  stage: z.literal("analysis"),
  profile: ProfileSchema,
  jd: z.string(),
});

export const KitRequestSchema = z.object({
  stage: z.literal("kit"),
  profile: ProfileSchema,
  jd: z.string(),
  analysis: FitAnalysisSchema,
});

export const ExtractRequestSchema = z.object({
  stage: z.literal("extract"),
  rawInput: z.string(),
});

export const AgentRequestSchema = z.discriminatedUnion("stage", [
  AnalysisRequestSchema,
  KitRequestSchema,
  ExtractRequestSchema,
]);

export type AgentRequest = z.infer<typeof AgentRequestSchema>;
