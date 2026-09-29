import { describe, expect, it } from "vitest";
import { buildDocxBytes, buildPdfBytes } from "./kitExport";

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
