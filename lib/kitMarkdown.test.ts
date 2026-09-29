import { describe, expect, it } from "vitest";
import { buildKitMarkdown } from "./kitMarkdown";
import type { ApplicationKit } from "./schema";

const kit: ApplicationKit = {
  cv: {
    header: {
      name: "Rohan Mehta",
      title: "Senior PM — 0-to-1 platforms & scale",
      contactLine: "Bengaluru, India | rohan@example.com",
    },
    summary: "Product leader with 8+ years shipping 0-to-1 platforms.",
    coreCompetencies: ["0-to-1 ownership", "API platform strategy"],
    experience: [
      {
        role: "Senior Product Manager",
        company: "DemoCommerce Labs",
        dates: "Jan 2022 — Present",
        bullets: ["one", "two"],
      },
    ],
    education: ["MBA, Product Management — Demo Institute — 2018"],
    certifications: ["CSPO — Scrum Alliance — 2020"],
    skills: ["Product Leadership: Roadmapping, OKRs"],
  },
  coverLetter: "Dear Hiring Team, ...",
  recruiterEmail: "Hi, saw your JD for the checkout role...",
};

describe("buildKitMarkdown", () => {
  it("includes CV, cover letter, and recruiter email sections as headers", () => {
    const md = buildKitMarkdown(kit);
    expect(md).toContain("## CV");
    expect(md).toContain("#### Professional Experience");
    expect(md).toContain("## Cover Letter");
    expect(md).toContain("## Recruiter Email");
  });

  it("renders every experience bullet as a markdown list item", () => {
    const md = buildKitMarkdown(kit);
    for (const bullet of kit.cv.experience[0].bullets) {
      expect(md).toContain(`- ${bullet}`);
    }
  });

  it("includes the header name, cover letter, and recruiter email verbatim", () => {
    const md = buildKitMarkdown(kit);
    expect(md).toContain(kit.cv.header.name);
    expect(md).toContain(kit.coverLetter);
    expect(md).toContain(kit.recruiterEmail);
  });

  it("omits sections the profile had nothing for", () => {
    const sparseKit: ApplicationKit = {
      ...kit,
      cv: { ...kit.cv, education: [], certifications: [], skills: [] },
    };
    const md = buildKitMarkdown(sparseKit);
    expect(md).not.toContain("#### Education");
    expect(md).not.toContain("#### Certifications");
    expect(md).not.toContain("#### Technical Skills");
  });
});
