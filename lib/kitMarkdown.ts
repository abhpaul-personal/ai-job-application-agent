import type { ApplicationKit } from "./schema";

function buildCvMarkdown(cv: ApplicationKit["cv"]): string[] {
  const lines: string[] = [
    "## CV",
    "",
    `### ${cv.header.name}`,
    cv.header.title,
    cv.header.contactLine,
    "",
  ];

  if (cv.summary) {
    lines.push("#### Professional Summary", cv.summary, "");
  }

  if (cv.coreCompetencies.length > 0) {
    lines.push("#### Core Competencies", cv.coreCompetencies.join(" | "), "");
  }

  if (cv.experience.length > 0) {
    lines.push("#### Professional Experience");
    for (const entry of cv.experience) {
      lines.push(`**${entry.role}, ${entry.company}** — ${entry.dates}`);
      lines.push(...entry.bullets.map((b) => `- ${b}`), "");
    }
  }

  if (cv.education.length > 0) {
    lines.push("#### Education", ...cv.education.map((e) => `- ${e}`), "");
  }

  if (cv.certifications.length > 0) {
    lines.push("#### Certifications", ...cv.certifications.map((c) => `- ${c}`), "");
  }

  if (cv.skills.length > 0) {
    lines.push("#### Technical Skills", ...cv.skills.map((s) => `- ${s}`), "");
  }

  return lines;
}

export function buildKitMarkdown(kit: ApplicationKit): string {
  return [
    "# Application Kit",
    "",
    ...buildCvMarkdown(kit.cv),
    "## Cover Letter",
    kit.coverLetter,
    "",
    "## Recruiter Email",
    kit.recruiterEmail,
    "",
  ].join("\n");
}
