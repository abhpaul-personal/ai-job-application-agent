import { z } from "zod";

// Split from BasicsSchema (below) so .partial() stays legal — .refine()'s
// output isn't a ZodObject anymore, so a refined schema can't be partialed
// directly. ProfileExtractSchema needs the partial version.
export const BasicsFieldsSchema = z.object({
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
});

export const BasicsSchema = BasicsFieldsSchema.refine(
  (basics) => basics.expectedCtcMaxLpa >= basics.expectedCtcMinLpa,
  {
    message: "expectedCtcMaxLpa must be >= expectedCtcMinLpa",
    path: ["expectedCtcMaxLpa"],
  },
);

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

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const TrackerStatusSchema = z.enum([
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
]);

// "Manual" covers every human-initiated path — the add form, chat-entry
// (prompt 3), and paste-to-prefill (prompt 2) all tag records this way,
// even though they're not typed by hand field-by-field. "Job Kit Agent" is
// the one automated path: the post-kit-generation auto-entry prompt.
export const EntryOriginSchema = z.enum(["Manual", "Job Kit Agent"]);

export const TrackerRecordSchema = z.object({
  id: z.string(),
  role: z.string(),
  company: z.string(),
  track: z.string(),
  compBand: z.string(),
  source: z.string(),
  appliedDate: z.string(),
  lastUpdatedDate: z.string(),
  status: TrackerStatusSchema,
  nextAction: z.string(),
  // .default() is the entire migration story for this field: any stored
  // record (Postgres jsonb or localStorage) predating entryOrigin simply
  // lacks the key, and parsing it here fills in "Manual" automatically —
  // no DDL, no backfill script needed.
  entryOrigin: EntryOriginSchema.default("Manual"),
});

export type TrackerRecord = z.infer<typeof TrackerRecordSchema>;

export const TRACKER_STORAGE_KEY = "aka.tracker";

// Paste-to-prefill extraction response: same fields as a record minus the
// server-assigned id/lastUpdatedDate, all optional since a pasted email or
// JD snippet rarely mentions every field (e.g. compBand is often absent).
// entryOrigin is also excluded — the model must never be able to set this
// itself; only application code assigns it, so a record's origin tag is
// structurally guaranteed rather than instruction-dependent.
export const TrackerDraftSchema = TrackerRecordSchema.omit({
  id: true,
  lastUpdatedDate: true,
  entryOrigin: true,
}).partial();

export type TrackerDraft = z.infer<typeof TrackerDraftSchema>;

// Same shape as TrackerDraftSchema, plus the id of an existing record to
// patch — set by the chat model when a message reads as an update to a
// record already in the list it was given, omitted for a new record.
export const ChatTrackerDraftSchema = TrackerDraftSchema.extend({
  matchedRecordId: z.string().optional(),
});

export type ChatTrackerDraft = z.infer<typeof ChatTrackerDraftSchema>;

export const ChatRequestSchema = z.object({
  stage: z.literal("chat"),
  profile: ProfileSchema,
  analysis: FitAnalysisSchema.optional(),
  // The user's current tracker list, so the chat model can match "the
  // Stripe one" to a real id instead of guessing — see POSITIONING.md
  // Section 3's confirm-before-write requirement.
  trackerRecords: TrackerRecordSchema.array().optional(),
  message: z.string(),
  history: ChatMessageSchema.array().optional(),
});

export const ChatResponseSchema = z.object({
  message: z.string(),
  // Present only when the message read as a clear, unambiguous tracker
  // action. The chat assistant never writes this itself — it's rendered as
  // a confirm/edit/cancel card and only written via the app's existing
  // tracker CRUD (TrackerStatusContext.saveRecord) on explicit confirm.
  trackerDraft: ChatTrackerDraftSchema.optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const TRACKER_CHAT_DRAFT_HANDOFF_KEY = "aka.trackerChatDraft";

export const TrackerExtractRequestSchema = z.object({
  stage: z.literal("trackerExtract"),
  rawInput: z.string(),
});

// Resume-extraction response: all fields optional, same "omit what the
// model didn't find" convention as TrackerDraftSchema — reuses the exact
// field schemas ProfileSchema validates against, so this stays in sync
// automatically if a profile field is ever added/renamed.
export const ProfileExtractSchema = z.object({
  basics: BasicsFieldsSchema.partial().default({}),
  targets: TargetsSchema.partial().default({}),
  storyBank: StoryBankSchema.default([]),
  rules: RulesSchema.default([]),
});

export type ProfileExtract = z.infer<typeof ProfileExtractSchema>;

export const ProfileExtractRequestSchema = z.object({
  stage: z.literal("profileExtract"),
  rawInput: z.string(),
});

export const AgentRequestSchema = z.discriminatedUnion("stage", [
  AnalysisRequestSchema,
  KitRequestSchema,
  ExtractRequestSchema,
  ChatRequestSchema,
  TrackerExtractRequestSchema,
  ProfileExtractRequestSchema,
]);

export type AgentRequest = z.infer<typeof AgentRequestSchema>;
