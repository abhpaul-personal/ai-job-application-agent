import { describe, expect, it } from "vitest";
import { buildKitAppliedRecord, describeTrackerDraft, mergeChatTrackerDraft } from "./trackerChatDraft";
import type { ChatTrackerDraft, TrackerDraft, TrackerRecord } from "./schema";

const existingRecords: TrackerRecord[] = [
  {
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
    entryOrigin: "Manual",
  },
];

describe("mergeChatTrackerDraft", () => {
  it("patches the matched record's fields while preserving the rest and its id", () => {
    const draft: ChatTrackerDraft = { matchedRecordId: "record-1", status: "Interview" };
    const { record, matchedId } = mergeChatTrackerDraft(draft, existingRecords);
    expect(matchedId).toBe("record-1");
    expect(record.status).toBe("Interview");
    expect(record.company).toBe("Agoda");
    expect(record.compBand).toBe("40-55 LPA");
  });

  it("falls back to blank defaults and a null matchedId when matchedRecordId is absent", () => {
    const draft: ChatTrackerDraft = { company: "Stripe", role: "Senior TPM" };
    const { record, matchedId } = mergeChatTrackerDraft(draft, existingRecords);
    expect(matchedId).toBeNull();
    expect(record.company).toBe("Stripe");
    expect(record.role).toBe("Senior TPM");
    expect(record.status).toBe("Applied");
    expect(record.track).toBe("");
  });

  it("falls back to blank defaults when matchedRecordId doesn't match anything", () => {
    const draft: ChatTrackerDraft = { matchedRecordId: "does-not-exist", company: "Stripe" };
    const { record, matchedId } = mergeChatTrackerDraft(draft, existingRecords);
    expect(matchedId).toBeNull();
    expect(record.company).toBe("Stripe");
  });
});

describe("describeTrackerDraft", () => {
  it("only lists fields actually present in the draft", () => {
    const lines = describeTrackerDraft({ company: "Agoda", status: "Applied" });
    expect(lines).toEqual(["Company: Agoda", "Status: Applied"]);
  });

  it("excludes matchedRecordId from the description", () => {
    const lines = describeTrackerDraft({ matchedRecordId: "record-1", status: "Interview" });
    expect(lines).toEqual(["Status: Interview"]);
  });

  it("returns an empty list for an empty draft", () => {
    expect(describeTrackerDraft({})).toEqual([]);
  });
});

describe("buildKitAppliedRecord", () => {
  it("uses the extracted role when present", () => {
    const extracted: TrackerDraft = { company: "Stripe", role: "Senior TPM" };
    const record = buildKitAppliedRecord(extracted, "Product Manager", "2026-09-27");
    expect(record.role).toBe("Senior TPM");
    expect(record.company).toBe("Stripe");
  });

  it("falls back to the given role when extraction found none", () => {
    const extracted: TrackerDraft = { company: "Stripe" };
    const record = buildKitAppliedRecord(extracted, "Product Manager", "2026-09-27");
    expect(record.role).toBe("Product Manager");
  });

  it("always forces status Applied, the given date, and Job Kit Agent origin", () => {
    const extracted: TrackerDraft = { status: "Interview", appliedDate: "2020-01-01" };
    const record = buildKitAppliedRecord(extracted, "Product Manager", "2026-09-27");
    expect(record.status).toBe("Applied");
    expect(record.appliedDate).toBe("2026-09-27");
    expect(record.entryOrigin).toBe("Job Kit Agent");
  });
});
