import type { FitAnalysis, Profile } from "./schema";

// Capped, not exact, token budgets — keeps per-run cost down per PRD §6.
export const MAX_TOKENS = {
  analysis: 1200,
  kit: 1800,
  extract: 1200,
} as const;

const FIT_ANALYSIS_SHAPE = `{
  "fitScore": <integer 0-100>,
  "verdict": "<short string>",
  "matchedStrengths": [{ "storyName": "<string, must match a story bank name from your system prompt>", "whyItMatches": "<string>" }],
  "gaps": ["<string>"],
  "salaryCheck": { "meetsFloor": <boolean>, "note": "<string>" },
  "scamFlags": [{ "type": "genericEmailDomain" | "chatAppFirstRecruitment" | "feeOrDepositRequest" | "missingFromCareersPage" | "other", "detail": "<string>" }]
}`;

export function buildAnalysisUserMessage(jd: string): string {
  return [
    "Evaluate the following job description against the candidate profile in your system prompt.",
    "Respond with ONLY a single JSON object in exactly this shape (no prose, no markdown fences):",
    FIT_ANALYSIS_SHAPE,
    "",
    "Job description:",
    jd,
  ].join("\n");
}

const APPLICATION_KIT_SHAPE = `{
  "cvHeadline": "<string>",
  "cvBullets": ["<string>", "<string>", "<string>", "<string>", "<string>"],
  "coverLetter": "<string, follow the candidate's cover letter format instructions below>",
  "recruiterDm": "<string, under 300 characters>"
}`;

export function buildKitUserMessage(
  jd: string,
  analysis: FitAnalysis,
  formats: Profile["formats"],
): string {
  return [
    "Draft an application kit for the following job description, building on the approved fit analysis below.",
    "Respond with ONLY a single JSON object in exactly this shape (no prose, no markdown fences), with exactly 5 cvBullets:",
    APPLICATION_KIT_SHAPE,
    "",
    `Cover letter format instructions: ${formats.coverLetter}`,
    `Recruiter DM format instructions: ${formats.recruiterDm}`,
    "",
    "Job description:",
    jd,
    "",
    "Approved fit analysis:",
    JSON.stringify(analysis, null, 2),
  ].join("\n");
}

const STORY_BANK_SHAPE = `[{ "name": "<string>", "one_liner": "<string>", "metrics": "<string>", "themes": ["<string>"] }]`;

export const EXTRACT_SYSTEM_PROMPT =
  "You turn a candidate's raw CV text or answers to guided prompts into a structured story bank for their job-application agent. Only use facts present in the input; never invent metrics, titles, or experience.";

export function buildExtractUserMessage(rawInput: string): string {
  return [
    "Extract a story bank from the following candidate input.",
    "Respond with ONLY a single JSON array in exactly this shape (no prose, no markdown fences):",
    STORY_BANK_SHAPE,
    "",
    "Candidate input:",
    rawInput,
  ].join("\n");
}
