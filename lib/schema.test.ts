import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AgentRequestSchema,
  ApplicationKitSchema,
  ChatRequestSchema,
  ChatResponseSchema,
  FitAnalysisSchema,
  ProfileExtractSchema,
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
    recruiterEmail: "Hi, saw your JD...",
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

  it("accepts a recruiterEmail longer than 300 characters (no cap, unlike the old DM)", () => {
    expect(() =>
      ApplicationKitSchema.parse({ ...validKit, recruiterEmail: "x".repeat(301) }),
    ).not.toThrow();
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

  it("accepts a chat request with a tracker records list", () => {
    expect(() =>
      ChatRequestSchema.parse({
        stage: "chat",
        profile: exampleProfileRaw,
        message: "mark the Agoda one as Interview",
        trackerRecords: [
          {
            id: "record-1",
            role: "TPM",
            company: "Agoda",
            track: "TPM",
            compBand: "",
            source: "",
            appliedDate: "2026-07-01",
            lastUpdatedDate: "2026-07-01",
            status: "Applied",
            nextAction: "",
          },
        ],
      }),
    ).not.toThrow();
  });
});

describe("ChatResponseSchema", () => {
  it("accepts a plain reply with no trackerDraft", () => {
    expect(() => ChatResponseSchema.parse({ message: "You're all set." })).not.toThrow();
  });

  it("accepts a response with a new-record trackerDraft (no matchedRecordId)", () => {
    expect(() =>
      ChatResponseSchema.parse({
        message: "Here's a draft for that.",
        trackerDraft: { company: "Agoda", role: "TPM", status: "Applied" },
      }),
    ).not.toThrow();
  });

  it("accepts a response with an update trackerDraft (matchedRecordId set)", () => {
    expect(() =>
      ChatResponseSchema.parse({
        message: "Updating that one.",
        trackerDraft: { matchedRecordId: "record-1", status: "Interview" },
      }),
    ).not.toThrow();
  });

  it("rejects an unrecognised status inside trackerDraft", () => {
    expect(() =>
      ChatResponseSchema.parse({
        message: "...",
        trackerDraft: { status: "Ghosted" },
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

  it("discriminates a profileExtract-stage request", () => {
    const result = AgentRequestSchema.safeParse({
      stage: "profileExtract",
      rawInput: "Rohan Mehta — Senior Product Manager at DemoCommerce Labs...",
    });
    expect(result.success).toBe(true);
  });
});

describe("ProfileExtractSchema", () => {
  it("accepts a partial extraction with some fields, a story, and no rules", () => {
    const parsed = ProfileExtractSchema.parse({
      basics: { name: "Rohan Mehta", currentTitle: "Senior Product Manager" },
      targets: { seniority: "Senior" },
      storyBank: [
        {
          name: "Checkout Modernisation",
          one_liner: "Led a zero-downtime checkout migration",
          metrics: "2M orders/month",
          themes: ["migration", "scale"],
        },
      ],
    });
    expect(parsed.basics.name).toBe("Rohan Mehta");
    expect(parsed.rules).toEqual([]);
  });

  it("accepts a fully empty object (a resume with nothing extractable)", () => {
    const parsed = ProfileExtractSchema.parse({});
    expect(parsed.basics).toEqual({});
    expect(parsed.targets).toEqual({});
    expect(parsed.storyBank).toEqual([]);
    expect(parsed.rules).toEqual([]);
  });

  it("rejects an invalid workMode value inside targets", () => {
    expect(() =>
      ProfileExtractSchema.parse({ targets: { workMode: ["Fully Remote"] } }),
    ).toThrow();
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

  it("defaults entryOrigin to Manual when absent (the pre-migration case)", () => {
    const parsed = TrackerRecordSchema.parse(validRecord);
    expect(parsed.entryOrigin).toBe("Manual");
  });

  it("accepts an explicit Job Kit Agent entryOrigin", () => {
    const parsed = TrackerRecordSchema.parse({ ...validRecord, entryOrigin: "Job Kit Agent" });
    expect(parsed.entryOrigin).toBe("Job Kit Agent");
  });

  it("rejects an unrecognised entryOrigin", () => {
    expect(() =>
      TrackerRecordSchema.parse({ ...validRecord, entryOrigin: "Somewhere Else" }),
    ).toThrow();
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

  it("rejects an entryOrigin field (app-assigned, never something the model sets)", () => {
    expect(() =>
      TrackerDraftSchema.strict().parse({ entryOrigin: "Job Kit Agent", company: "Agoda" }),
    ).toThrow();
  });
});
