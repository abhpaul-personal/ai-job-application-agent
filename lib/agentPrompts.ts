import { compileSystemPrompt } from "./compilePrompt";
import type { FitAnalysis, Profile } from "./schema";

// Capped, not exact, token budgets — keeps per-run cost down per PRD §6.
export const MAX_TOKENS = {
  analysis: 1200,
  kit: 1800,
  // Extraction has no cap on how many story-bank items the model tries to
  // generate from a long/dense CV, so a large candidate history can run the
  // response past the budget mid-array — the repair retry reuses the same
  // budget, so it fails the same way twice. 1600 (up from 1200) plus the
  // explicit "at most 8" instruction below are the two halves of the fix.
  extract: 1600,
  // Deliberately small — a chat aside should read as a short reply, not a
  // drafted document. See docs/PHASE2-ROADMAP.md section 2.
  chat: 500,
} as const;

const FIT_ANALYSIS_SHAPE = `{
  "fitScore": <integer 0-100>,
  "verdict": "<short string>",
  "matchedStrengths": [{ "storyName": "<string, must match a story bank name from your system prompt>", "whyItMatches": "<string>" }],
  "gaps": ["<string>"],
  "salaryCheck": { "meetsFloor": <boolean>, "note": "<string>" },
  "scamFlags": [{ "type": "genericEmailDomain" | "chatAppFirstRecruitment" | "feeOrDepositRequest" | "missingFromCareersPage" | "other", "detail": "<string>" }]
}`;

const TONE_INSTRUCTION = [
  "Write every text field in a warm, encouraging, human tone — the candidate may be deep into a tough job search. Never use dismissive or clinical language (e.g. avoid words like \"skip\", \"reject\", or \"disqualified\").",
  'For a low-fit verdict, phrase it supportively, e.g. "Save your energy for stronger matches" or "Not the right fit right now" — never as a rejection.',
  'For a borderline/stretch fit, phrase it as something like "Worth pursuing with prep."',
  "A strong fit can be stated plainly and warmly.",
  "This tone guidance is about delivery only, never substance: never soften, hide, or omit real gaps, scam flags, or salary shortfalls. State them calmly and factually — honest, just not harsh.",
].join(" ");

export function buildAnalysisUserMessage(jd: string): string {
  return [
    "Evaluate the following job description against the candidate profile in your system prompt.",
    TONE_INSTRUCTION,
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
    "Extract at most 8 items — the highest-impact, most distinct stories. A longer candidate history only gets rendered down to its top 8 anyway, so extracting more than that just wastes effort and risks a truncated response.",
    "Respond with ONLY a single JSON array in exactly this shape (no prose, no markdown fences):",
    STORY_BANK_SHAPE,
    "",
    "Candidate input:",
    rawInput,
  ].join("\n");
}

// Verbatim from docs/PHASE2-ROADMAP.md section 3 ("hard boundaries") — this
// is the part of the feature most likely to erode under normal
// feature-building pressure, so it stays close to the roadmap's own wording
// rather than being paraphrased.
const CHAT_BOUNDARY_INSTRUCTION = [
  "You are also available for a short conversational aside about the candidate's own profile and, if one is provided below, their current fit analysis for a specific job.",
  "You may only discuss and explain: the candidate profile in your system prompt above, and the fit analysis provided below if any. You have no other data and no tools.",
  "You cannot trigger a fit analysis, generate an application kit, or modify the candidate's profile — you have no ability to do any of those things, only to discuss them.",
  'If asked to perform any of those actions (e.g. "just apply for me", "update my salary floor", "run the analysis"), do not refuse curtly and do not pretend to comply — explain honestly what you can discuss versus what still requires the person to use the relevant part of the app (e.g. the "Generate application kit" button on this screen, or the Settings page to edit their profile).',
  "Keep responses concise — this is a conversational aside, not a drafting surface.",
].join(" ");

export function buildChatSystemPrompt(profile: Profile): string {
  return [compileSystemPrompt(profile), "", CHAT_BOUNDARY_INSTRUCTION].join("\n");
}

const CHAT_RESPONSE_SHAPE = `{ "message": "<string>" }`;

export function buildChatUserMessage(message: string, analysis?: FitAnalysis): string {
  return [
    analysis
      ? `Current fit analysis for this session:\n${JSON.stringify(analysis, null, 2)}`
      : "No fit analysis has been run yet in this session.",
    "",
    "Respond with ONLY a single JSON object in exactly this shape (no prose, no markdown fences):",
    CHAT_RESPONSE_SHAPE,
    "",
    "User message:",
    message,
  ].join("\n");
}
