import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import {
  buildCvDocxBytes,
  buildCvPdfBytes,
  buildDocxBytes,
  buildPdfBytes,
  splitIntoParagraphBlocks,
  stripCoverLetterHeader,
} from "./kitExport";
import type { Cv } from "./schema";

const cv: Cv = {
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
      bullets: ["Built a partner-integration platform from zero to 40 partners."],
    },
  ],
  education: ["MBA, Product Management — Demo Institute — 2018"],
  certifications: ["CSPO — Scrum Alliance — 2020"],
  skills: ["Product Leadership: Roadmapping, OKRs"],
};

describe("buildPdfBytes", () => {
  it("returns non-empty bytes starting with the PDF magic header", () => {
    const bytes = buildPdfBytes("Cover Letter", ["Dear Hiring Team,", "", "Sincerely, Me"]);
    expect(bytes.length).toBeGreaterThan(0);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("paginates long content instead of clipping it", () => {
    const longBody = Array.from({ length: 200 }, (_, i) => `Line number ${i} of a long letter.`);
    const bytes = buildPdfBytes("Long Letter", longBody);
    expect(bytes.length).toBeGreaterThan(0);
  });
});

describe("buildDocxBytes", () => {
  it("returns non-empty bytes starting with the ZIP magic header (.docx is a zip)", async () => {
    const bytes = await buildDocxBytes("Cover Letter", ["Dear Hiring Team,", "Sincerely, Me"]);
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
  });
});

describe("buildCvPdfBytes", () => {
  it("returns non-empty bytes starting with the PDF magic header", () => {
    const bytes = buildCvPdfBytes(cv);
    expect(bytes.length).toBeGreaterThan(0);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("still produces valid output when optional sections are empty", () => {
    const sparseCv: Cv = { ...cv, coreCompetencies: [], education: [], certifications: [], skills: [] };
    const bytes = buildCvPdfBytes(sparseCv);
    expect(bytes.length).toBeGreaterThan(0);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});

describe("buildCvDocxBytes", () => {
  it("returns non-empty bytes starting with the ZIP magic header (.docx is a zip)", async () => {
    const bytes = await buildCvDocxBytes(cv);
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
  });
});

// A full-length profile (several roles, each with multiple bullets, plus
// education/certifications/skills) easily exceeds one page — exactly the
// case the original test suite never exercised, since its one fixture CV
// (above) comfortably fits on a single page and so could never have caught
// a regression in the addPage()/ensureSpace() pagination logic.
function longCv(): Cv {
  const roles = [
    ["Senior Product Manager", "Acme Corp", "Jan 2022 to Present"],
    ["Product Manager", "Beta Inc", "Jun 2018 to Dec 2021"],
    ["Associate Product Manager", "Gamma LLC", "Jun 2016 to May 2018"],
    ["Business Analyst", "Delta Co", "Jun 2014 to May 2016"],
  ] as const;
  return {
    header: {
      name: "Jordan Sample",
      title: "Senior Product Leader — Platforms & Growth",
      contactLine: "Bengaluru, India | jordan@example.com",
    },
    summary: "A detailed professional summary paragraph. ".repeat(8),
    coreCompetencies: Array.from({ length: 10 }, (_, i) => `Competency ${i + 1}`),
    experience: roles.map(([role, company, dates]) => ({
      role,
      company,
      dates,
      bullets: Array.from(
        { length: 4 },
        (_, j) =>
          `Bullet ${j + 1} for ${role} at ${company} with enough detail to wrap across more than one line of text in the rendered PDF.`,
      ),
    })),
    education: [
      "MBA, Product Management — Example Institute — 2018",
      "B.Tech, Computer Science — Example Institute of Technology — 2014",
    ],
    certifications: [
      "Certified Scrum Product Owner (CSPO) — Scrum Alliance — 2020",
      "PMP — PMI — 2019",
    ],
    skills: [
      "Product Leadership: Roadmapping, OKRs, Stakeholder Management, Go-to-Market",
      "Platform and API: REST APIs, Schema Validation, Partner Integrations",
      "Tools: Jira, Figma, Looker, SQL",
    ],
  };
}

describe("buildCvPdfBytes multi-page overflow", () => {
  it("flows every section onto additional pages instead of dropping them", async () => {
    const cv = longCv();
    const bytes = buildCvPdfBytes(cv);

    const pdf = await getDocumentProxy(bytes);
    expect(pdf.numPages).toBeGreaterThan(1);

    const { text } = await extractText(pdf, { mergePages: true });
    expect(text).toContain("PROFESSIONAL EXPERIENCE");
    for (const [, company] of [
      ["Senior Product Manager", "Acme Corp"],
      ["Product Manager", "Beta Inc"],
      ["Associate Product Manager", "Gamma LLC"],
      ["Business Analyst", "Delta Co"],
    ]) {
      expect(text).toContain(company);
    }
    expect(text).toContain("EDUCATION");
    expect(text).toContain("CERTIFICATIONS");
    expect(text).toContain("TECHNICAL SKILLS");
    expect(text).toContain("Tools: Jira, Figma, Looker, SQL");
  });
});

describe("splitIntoParagraphBlocks", () => {
  it("keeps a multi-line block (e.g. a sender address) together as one paragraph", () => {
    const text = "Jordan Sample\nBengaluru, India | jordan@example.com\n\nDear Hiring Team,\n\nBody text.";
    expect(splitIntoParagraphBlocks(text)).toEqual([
      "Jordan Sample\nBengaluru, India | jordan@example.com",
      "Dear Hiring Team,",
      "Body text.",
    ]);
  });

  it("collapses three-or-more blank lines down to a single paragraph break", () => {
    const text = "First.\n\n\n\nSecond.";
    expect(splitIntoParagraphBlocks(text)).toEqual(["First.", "Second."]);
  });
});

describe("stripCoverLetterHeader", () => {
  it("removes a sender name/location/email/date block above the salutation", () => {
    const text =
      "Rohan Mehta\nBengaluru, India\nrohan@example.com\n\n[Date]\n\nDear Hiring Team,\n\nBody text.";
    expect(stripCoverLetterHeader(text)).toBe("Dear Hiring Team,\n\nBody text.");
  });

  it("is case-insensitive and matches any salutee name, not just 'Hiring Team'", () => {
    const text = "Jordan Sample\njordan@example.com\n\ndear Hiring Manager,\n\nBody.";
    expect(stripCoverLetterHeader(text)).toBe("dear Hiring Manager,\n\nBody.");
  });

  it("returns the text unchanged when there is no salutation line to anchor on", () => {
    const text = "Just some body text with no greeting line at all.";
    expect(stripCoverLetterHeader(text)).toBe(text);
  });

  it("is a no-op when the letter already starts bare at the salutation", () => {
    const text = "Dear Hiring Team,\n\nBody text.";
    expect(stripCoverLetterHeader(text)).toBe(text);
  });
});
