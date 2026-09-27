import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AgentRequestSchema,
  ApplicationKitSchema,
  ChatRequestSchema,
  FitAnalysisSchema,
  ProfileSchema,
  TrackerDraftSchema,
  TrackerRecordSchema,
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

describe("ChatRequestSchema", () => {
  it("accepts a minimal chat request (no analysis, no history)", () => {
    expect(() =>
      ChatRequestSchema.parse({
        stage: "chat",
        profile: exampleProfileRaw,
        message: "why did this score low",
      }),
    ).not.toThrow();
  });

  it("accepts a chat request with analysis and history", () => {
    expect(() =>
      ChatRequestSchema.parse({
        stage: "chat",
        profile: exampleProfileRaw,
        analysis: {
          fitScore: 40,
          verdict: "Worth a second look",
          matchedStrengths: [],
          gaps: ["No direct fintech experience"],
          salaryCheck: { meetsFloor: false, note: "Below floor" },
          scamFlags: [],
        },
        message: "why did this score low",
        history: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "hello" },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects an unrecognised history role", () => {
    expect(() =>
      ChatRequestSchema.parse({
        stage: "chat",
        profile: exampleProfileRaw,
        message: "hi",
        history: [{ role: "system", content: "hi" }],
      }),
    ).toThrow();
  });
});

describe("AgentRequestSchema", () => {
  it("discriminates a chat-stage request alongside the other three stages", () => {
    const result = AgentRequestSchema.safeParse({
      stage: "chat",
      profile: exampleProfileRaw,
      message: "what does my agent know about me",
    });
    expect(result.success).toBe(true);
  });

  it("discriminates a trackerExtract-stage request", () => {
    const result = AgentRequestSchema.safeParse({
      stage: "trackerExtract",
      rawInput: "Got an email from Agoda recruiter about the TPM role, applied yesterday.",
    });
    expect(result.success).toBe(true);
  });
});

describe("TrackerRecordSchema", () => {
  const validRecord = {
    id: "record-1",
    role: "TPM",
    company: "Agoda",
    track: "TPM",
    compBand: "40-55 LPA",
    source: "LinkedIn",
    appliedDate: "2026-07-01",
    lastUpdatedDate: "2026-07-01",
    status: "Applied",
    nextAction: "Follow up",
  };

  it("accepts a well-formed tracker record", () => {
    expect(() => TrackerRecordSchema.parse(validRecord)).not.toThrow();
  });

  it("rejects an unrecognised status", () => {
    expect(() => TrackerRecordSchema.parse({ ...validRecord, status: "Ghosted" })).toThrow();
  });
});

describe("TrackerDraftSchema", () => {
  it("accepts a partial draft with only some fields present", () => {
    expect(() =>
      TrackerDraftSchema.parse({ company: "Agoda", status: "Applied" }),
    ).not.toThrow();
  });

  it("accepts an empty object", () => {
    expect(() => TrackerDraftSchema.parse({})).not.toThrow();
  });

  it("rejects an id field (server-assigned, never part of a draft)", () => {
    expect(() =>
      TrackerDraftSchema.strict().parse({ id: "record-1", company: "Agoda" }),
    ).toThrow();
  });
});
