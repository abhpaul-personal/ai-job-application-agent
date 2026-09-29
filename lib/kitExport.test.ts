import { describe, expect, it } from "vitest";
import { buildCvDocxBytes, buildCvPdfBytes, buildDocxBytes, buildPdfBytes } from "./kitExport";
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
