import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ApplicationKitSchema,
  FitAnalysisSchema,
  ProfileSchema,
} from "./schema";

const exampleProfileRaw = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "config", "default-profile.example.json"),
    "utf-8",
  ),
);

describe("ProfileSchema", () => {
  it("accepts the real default-profile.example.json", () => {
    expect(() => ProfileSchema.parse(exampleProfileRaw)).not.toThrow();
  });

  it("rejects expectedCtcMaxLpa below expectedCtcMinLpa", () => {
    const invalid = {
      ...exampleProfileRaw,
      basics: {
        ...exampleProfileRaw.basics,
        expectedCtcMinLpa: 50,
        expectedCtcMaxLpa: 40,
      },
    };
    expect(() => ProfileSchema.parse(invalid)).toThrow();
  });

  it("rejects an invalid workMode value", () => {
    const invalid = {
      ...exampleProfileRaw,
      targets: {
        ...exampleProfileRaw.targets,
        workMode: ["Fully Remote"],
      },
    };
    expect(() => ProfileSchema.parse(invalid)).toThrow();
  });

  it("rejects a malformed email", () => {
    const invalid = {
      ...exampleProfileRaw,
      basics: { ...exampleProfileRaw.basics, email: "not-an-email" },
    };
    expect(() => ProfileSchema.parse(invalid)).toThrow();
  });
});

describe("FitAnalysisSchema", () => {
  const validFitAnalysis = {
    fitScore: 82,
    verdict: "Strong fit",
    matchedStrengths: [
      { storyName: "Checkout Modernisation", whyItMatches: "Scale + reliability" },
    ],
    gaps: ["No direct fintech experience"],
    salaryCheck: { meetsFloor: true, note: "Offer range meets floor" },
    scamFlags: [{ type: "missingFromCareersPage", detail: "Role not listed on careers page" }],
  };

  it("accepts a well-formed fit analysis", () => {
    expect(() => FitAnalysisSchema.parse(validFitAnalysis)).not.toThrow();
  });

  it("rejects a fitScore above 100", () => {
    expect(() =>
      FitAnalysisSchema.parse({ ...validFitAnalysis, fitScore: 101 }),
    ).toThrow();
  });

  it("rejects an unrecognised scamFlags type", () => {
    expect(() =>
      FitAnalysisSchema.parse({
        ...validFitAnalysis,
        scamFlags: [{ type: "suspiciousVibes", detail: "..." }],
      }),
    ).toThrow();
  });
});

describe("ApplicationKitSchema", () => {
  const validKit = {
    cvHeadline: "Senior PM — 0-to-1 platforms & scale",
    cvBullets: ["one", "two", "three", "four", "five"],
    coverLetter: "Dear Hiring Team, ...",
    recruiterDm: "Hi, saw your JD...",
  };

  it("accepts a well-formed application kit", () => {
    expect(() => ApplicationKitSchema.parse(validKit)).not.toThrow();
  });

  it("rejects cvBullets with fewer than 5 items", () => {
    expect(() =>
      ApplicationKitSchema.parse({ ...validKit, cvBullets: ["one", "two"] }),
    ).toThrow();
  });

  it("rejects cvBullets with more than 5 items", () => {
    expect(() =>
      ApplicationKitSchema.parse({
        ...validKit,
        cvBullets: ["one", "two", "three", "four", "five", "six"],
      }),
    ).toThrow();
  });

  it("rejects a recruiterDm over 300 characters", () => {
    expect(() =>
      ApplicationKitSchema.parse({ ...validKit, recruiterDm: "x".repeat(301) }),
    ).toThrow();
  });
});
