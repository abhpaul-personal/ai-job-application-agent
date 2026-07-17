import type { ApplicationKit } from "./schema";

export function buildKitMarkdown(kit: ApplicationKit): string {
  return [
    "# Application Kit",
    "",
    "## CV Headline",
    kit.cvHeadline,
    "",
    "## CV Bullets",
    ...kit.cvBullets.map((bullet) => `- ${bullet}`),
    "",
    "## Cover Letter",
    kit.coverLetter,
    "",
    "## Recruiter DM",
    kit.recruiterDm,
    "",
  ].join("\n");
}
