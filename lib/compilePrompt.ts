import type { Profile } from "./schema";

const MAX_STORY_BANK_ITEMS = 8;

function renderBasics(basics: Profile["basics"]): string {
  return [
    `Name: ${basics.name}`,
    `Current title: ${basics.currentTitle} at ${basics.currentCompany}`,
    `Location: ${basics.location}`,
    `Notice period: ${basics.noticePeriodDays} days`,
    `Current CTC: ${basics.currentCtcLpa} LPA`,
    `Expected CTC: ${basics.expectedCtcMinLpa}-${basics.expectedCtcMaxLpa} LPA`,
    `Relocation: ${basics.relocation}`,
  ].join("\n");
}

function renderTargets(targets: Profile["targets"]): string {
  return [
    `Target roles: ${targets.roleTypes.join(", ")}`,
    `Seniority: ${targets.seniority}`,
    `Industries: ${targets.industries.join(", ")}`,
    `Work mode: ${targets.workMode.join(", ")}`,
    `Experience framing: ${targets.experienceFraming}`,
  ].join("\n");
}

function renderStoryBank(storyBank: Profile["storyBank"]): string {
  const stories = storyBank.slice(0, MAX_STORY_BANK_ITEMS);
  if (stories.length === 0) return "(no story bank items provided)";
  return stories
    .map(
      (story, i) =>
        `${i + 1}. ${story.name} — ${story.one_liner} (${story.metrics}) [themes: ${story.themes.join(", ")}]`,
    )
    .join("\n");
}

function renderCandidateGroundTruth(profile: Profile): string {
  return [
    "## Candidate ground truth",
    renderBasics(profile.basics),
    "",
    renderTargets(profile.targets),
    "",
    "Story bank:",
    renderStoryBank(profile.storyBank),
  ].join("\n");
}

function renderHardRules(rules: Profile["rules"]): string {
  const fixedRules = [
    "Only claim facts present in this profile; never invent metrics, titles, or experience.",
  ];
  const allRules = [...fixedRules, ...rules];
  return [
    "## Hard rules",
    ...allRules.map((rule) => `- ${rule}`),
  ].join("\n");
}

function renderSalaryFloor(basics: Profile["basics"]): string {
  return [
    "## Salary floor",
    `The candidate's salary floor is ${basics.expectedCtcMinLpa} LPA. Never fail to flag an opportunity offering below this floor — call it out explicitly as a gap in the fit analysis.`,
  ].join("\n");
}

function renderScamScreenHeuristics(): string {
  return [
    "## Scam-screen heuristics",
    "Screen every job description against these checks:",
    "- Generic or free email domains used for outreach on senior roles.",
    "- Recruitment conducted chat-app-first (e.g. WhatsApp/Telegram) instead of official channels.",
    "- Any request for a fee, deposit, or payment from the candidate.",
    "- The role is absent from the company's official careers page.",
  ].join("\n");
}

function renderOutputContractInstructions(): string {
  return [
    "## Output-contract instructions",
    "Respond with a single JSON object matching the schema for the requested stage. No prose, no markdown code fences, no commentary before or after the JSON.",
  ].join("\n");
}

export function compileSystemPrompt(profile: Profile): string {
  return [
    renderCandidateGroundTruth(profile),
    "",
    renderHardRules(profile.rules),
    "",
    renderSalaryFloor(profile.basics),
    "",
    renderScamScreenHeuristics(),
    "",
    renderOutputContractInstructions(),
  ].join("\n");
}
