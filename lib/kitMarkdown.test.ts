import { describe, expect, it } from "vitest";
import { buildKitMarkdown } from "./kitMarkdown";
import type { ApplicationKit } from "./schema";

const kit: ApplicationKit = {
  cvHeadline: "Senior PM — 0-to-1 platforms & scale",
  cvBullets: ["one", "two", "three", "four", "five"],
  coverLetter: "Dear Hiring Team, ...",
  recruiterDm: "Hi, saw your JD for the checkout role...",
};

describe("buildKitMarkdown", () => {
  it("includes all four sections as headers", () => {
    const md = buildKitMarkdown(kit);
    expect(md).toContain("## CV Headline");
    expect(md).toContain("## CV Bullets");
    expect(md).toContain("## Cover Letter");
    expect(md).toContain("## Recruiter DM");
  });

  it("renders every bullet as a markdown list item", () => {
    const md = buildKitMarkdown(kit);
    for (const bullet of kit.cvBullets) {
      expect(md).toContain(`- ${bullet}`);
    }
  });

  it("includes the headline, cover letter, and recruiter DM verbatim", () => {
    const md = buildKitMarkdown(kit);
    expect(md).toContain(kit.cvHeadline);
    expect(md).toContain(kit.coverLetter);
    expect(md).toContain(kit.recruiterDm);
  });
});
