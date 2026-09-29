import { compileSystemPrompt } from "./compilePrompt";
import type { FitAnalysis, Profile, TrackerRecord } from "./schema";

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
  // drafted document. See docs/PHASE2-ROADMAP.md section 2. Bumped from 500
  // since a response can now also carry a trackerDraft object.
  chat: 700,
  // A single tracker record's worth of fields — smaller than story-bank
  // extraction since there's exactly one record to fill, not up to 8.
  trackerExtract: 600,
  // Covers basics + targets + up to 8 story-bank items + rules in one
  // response — larger than plain story-bank extract (1600) since it's
  // strictly more fields.
  profileExtract: 2000,
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
  "cv": {
    "header": {
      "name": "<string, from the candidate's basics.name>",
      "title": "<string, a headline tailored to this JD, e.g. 'Senior Product Manager | Payments | Platform'>",
      "contactLine": "<string, e.g. 'Bengaluru, India | +91... | email@x.com | linkedin.com/in/...' — build from basics/links given below, omit any piece not provided>"
    },
    "summary": "<string, 3-5 sentences, tailored to this JD>",
    "coreCompetencies": ["<string, drawn from the candidate's skills/story-bank themes, reordered/selected for relevance to this JD>"],
    "experience": [{
      "role": "<string, copied verbatim from a work-history entry below>",
      "company": "<string, copied verbatim>",
      "dates": "<string, copied verbatim, e.g. 'Sep 2024 — Present'>",
      "bullets": ["<string, selected/rewritten for JD relevance, but every fact must trace to that entry's real bullets — never invent a metric or outcome>"]
    }],
    "education": ["<string, copied verbatim from the candidate's education list>"],
    "certifications": ["<string, copied verbatim from the candidate's certifications list>"],
    "skills": ["<string, copied verbatim from the candidate's skills list, reordered for relevance>"]
  },
  "coverLetter": "<string, follow the candidate's cover letter format instructions below>",
  "recruiterEmail": "<string, a short outreach email (not a chat DM) — a few sentences: one specific hook from the JD, one credibility point, one clear ask>"
}`;

const CV_ANTI_FABRICATION_INSTRUCTION = [
  "The cv.experience array must include one entry per work-history entry given in your system prompt (or the most relevant subset if the candidate has many) — never a role, company, or date that isn't in that list, and never altered dates or employer names.",
  "cv.education, cv.certifications, and cv.skills must only ever contain items copied from the candidate's actual lists — omit the whole section if the candidate provided none, never invent an entry to fill a gap.",
  "Tailoring means selection, reordering, and emphasis (which bullets to lead with, which skills to surface first) — never inventing new content.",
].join(" ");

export function buildKitUserMessage(
  jd: string,
  analysis: FitAnalysis,
  formats: Profile["formats"],
): string {
  return [
    "Draft an application kit for the following job description, building on the approved fit analysis below.",
    CV_ANTI_FABRICATION_INSTRUCTION,
    "Respond with ONLY a single JSON object in exactly this shape (no prose, no markdown fences):",
    APPLICATION_KIT_SHAPE,
    "",
    `Cover letter format instructions: ${formats.coverLetter}`,
    `Recruiter outreach format instructions: ${formats.recruiterDm}`,
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
// rather than being paraphrased. The tracker-action capability appended
// below is additive (per docs/POSITIONING.md Section 3) and keeps every one
// of these refusal/redirect clauses unchanged.
const CHAT_BOUNDARY_INSTRUCTION = [
  "You are also available for a short conversational aside about the candidate's own profile and, if one is provided below, their current fit analysis for a specific job.",
  "You may only discuss and explain: the candidate profile in your system prompt above, and the fit analysis provided below if any. You have no other data and no tools.",
  "You cannot trigger a fit analysis, generate an application kit, or modify the candidate's profile — you have no ability to do any of those things, only to discuss them.",
  'If asked to perform any of those actions (e.g. "just apply for me", "update my salary floor", "run the analysis"), do not refuse curtly and do not pretend to comply — explain honestly what you can discuss versus what still requires the person to use the relevant part of the app (e.g. the "Generate application kit" button on this screen, or the Settings page to edit their profile).',
  "Keep responses concise — this is a conversational aside, not a drafting surface.",
  "You may also turn a clear application-tracker action (e.g. \"add Agoda TPM, applied yesterday\", \"mark the Stripe one as Interview\") into a draft tracker record, using the tracker list given below to find the record being referred to. Put it in the trackerDraft field of your response — set matchedRecordId to that record's id for an update, or omit it for a new record.",
  "You never write a tracker record yourself — trackerDraft is only ever a proposal the app shows the person to confirm, edit, or cancel before anything is saved.",
  "If a message could plausibly refer to more than one existing record, do not guess which one — omit trackerDraft entirely and ask in your message which one they mean.",
  "Only use facts actually present in the message for trackerDraft fields — never invent a company, role, or date, and omit any field the message doesn't mention.",
].join(" ");

export function buildChatSystemPrompt(profile: Profile): string {
  return [compileSystemPrompt(profile), "", CHAT_BOUNDARY_INSTRUCTION].join("\n");
}

const CHAT_RESPONSE_SHAPE = `{
  "message": "<string>",
  "trackerDraft": {
    "role": "<string, omit if not mentioned>",
    "company": "<string, omit if not mentioned>",
    "track": "<string, omit if not mentioned>",
    "compBand": "<string, omit if not mentioned>",
    "source": "<string, omit if not mentioned>",
    "appliedDate": "<ISO date string YYYY-MM-DD, resolve relative dates against today's date given below — omit if not mentioned>",
    "status": "Applied" | "Screening" | "Interview" | "Offer" | "Rejected" | "Withdrawn",
    "nextAction": "<string, omit if not mentioned>",
    "matchedRecordId": "<id of an existing record from the list below, only when patching it — omit for a new record>"
  }
} // omit the whole trackerDraft key unless the message is a clear, unambiguous tracker action`;

function formatTrackerRecordsForPrompt(trackerRecords: TrackerRecord[]): string {
  if (trackerRecords.length === 0) return "The tracker has no records yet.";
  return [
    "Current tracker records (use these ids for matchedRecordId, never invent one):",
    ...trackerRecords.map(
      (r) => `id: ${r.id}, company: ${r.company}, role: ${r.role}, status: ${r.status}`,
    ),
  ].join("\n");
}

export function buildChatUserMessage(
  message: string,
  analysis?: FitAnalysis,
  trackerRecords: TrackerRecord[] = [],
  today: string = new Date().toISOString().slice(0, 10),
): string {
  return [
    analysis
      ? `Current fit analysis for this session:\n${JSON.stringify(analysis, null, 2)}`
      : "No fit analysis has been run yet in this session.",
    "",
    `Today's date is ${today}.`,
    formatTrackerRecordsForPrompt(trackerRecords),
    "",
    "Respond with ONLY a single JSON object in exactly this shape (no prose, no markdown fences):",
    CHAT_RESPONSE_SHAPE,
    "",
    "User message:",
    message,
  ].join("\n");
}

const TRACKER_DRAFT_SHAPE = `{
  "role": "<string, omit the field entirely if not mentioned>",
  "company": "<string, omit the field entirely if not mentioned>",
  "track": "<string, omit the field entirely if not mentioned>",
  "compBand": "<string, omit the field entirely if not mentioned>",
  "source": "<string, e.g. 'LinkedIn', 'Recruiter email', 'Referral' — omit if not mentioned>",
  "appliedDate": "<ISO date string YYYY-MM-DD, resolve relative dates like 'yesterday' against today's date given below — omit if not mentioned>",
  "status": "Applied" | "Screening" | "Interview" | "Offer" | "Rejected" | "Withdrawn",
  "nextAction": "<string, omit the field entirely if not mentioned>"
}`;

export const TRACKER_EXTRACT_SYSTEM_PROMPT =
  "You turn a pasted piece of text (a forwarded recruiter email, a job description snippet, or a quick note) into a draft application-tracker record. Only use facts present in the input; never invent a company, role, or date. Omit any field the text doesn't actually mention rather than guessing a value.";

export function buildTrackerExtractUserMessage(rawInput: string, today: string): string {
  return [
    `Today's date is ${today}. Extract a draft tracker record from the following pasted text.`,
    "Respond with ONLY a single JSON object in exactly this shape (no prose, no markdown fences), omitting any key you have no basis for:",
    TRACKER_DRAFT_SHAPE,
    "",
    "Pasted text:",
    rawInput,
  ].join("\n");
}

const PROFILE_EXTRACT_SHAPE = `{
  "basics": {
    "name": "<string, omit if not stated>",
    "email": "<string, omit if not stated>",
    "currentTitle": "<string, omit if not stated>",
    "currentCompany": "<string, omit if not stated>",
    "location": "<string, omit if not stated>",
    "noticePeriodDays": "<number, omit if not stated>",
    "currentCtcLpa": "<number, omit if not stated — resumes almost never state this>",
    "expectedCtcMinLpa": "<number, omit if not stated — resumes almost never state this>",
    "expectedCtcMaxLpa": "<number, omit if not stated — resumes almost never state this>",
    "relocation": "<string, omit if not stated>"
  },
  "targets": {
    "roleTypes": ["<string>", "omit the whole key if not clearly implied"],
    "seniority": "<string, omit if not clearly implied>",
    "industries": ["<string>", "omit the whole key if not clearly implied"],
    "workMode": ["Onsite" | "Hybrid" | "Remote", "omit the whole key if not stated"],
    "experienceFraming": "<string, e.g. '8-10 years of product experience' — omit if not clearly implied>"
  },
  "storyBank": [{ "name": "<string>", "one_liner": "<string>", "metrics": "<string>", "themes": ["<string>"] }],
  "rules": ["<string, almost always omit — resumes don't state negotiation constraints>"],
  "workHistory": [{
    "role": "<string>",
    "company": "<string>",
    "location": "<string, omit field if not stated>",
    "startDate": "<string, as written on the resume, e.g. 'Sep 2024'>",
    "endDate": "<string, as written on the resume, e.g. 'Present' or 'Apr 2024'>",
    "bullets": ["<string, copied/lightly cleaned from the resume's own bullets for that role — never invented>"]
  }],
  "education": ["<string, one formatted line per entry, e.g. 'MBA, Project Management — Sikkim Manipal University — 2012'>"],
  "certifications": ["<string, one formatted line per entry, e.g. 'A-CSPO — Scrum Alliance — 2021'>"],
  "skills": ["<string, one formatted line per category, e.g. 'Platform and API: REST APIs, Idempotency, Circuit Breaker'>"]
}`;

export const PROFILE_EXTRACT_SYSTEM_PROMPT = [
  "You turn a candidate's resume text into a draft profile for their job-application agent.",
  "Only use facts present in the resume; never invent metrics, titles, dates, or compensation figures.",
  "Compensation fields (currentCtcLpa, expectedCtcMinLpa, expectedCtcMaxLpa) almost never appear on a resume — leave them out entirely rather than estimating from title or seniority.",
  "For workHistory, extract every distinct role with its actual dates and company — never merge two roles into one or invent a date range.",
  "Omit any field, or any whole section, the resume doesn't actually support rather than guessing.",
].join(" ");

export function buildProfileExtractUserMessage(rawInput: string): string {
  return [
    "Extract a draft profile from the following resume text.",
    "For storyBank, extract at most 8 items — the highest-impact, most distinct achievements.",
    "Respond with ONLY a single JSON object in exactly this shape (no prose, no markdown fences), omitting any key or whole section you have no basis for:",
    PROFILE_EXTRACT_SHAPE,
    "",
    "Resume text:",
    rawInput,
  ].join("\n");
}
