import { emptyTrackerFields } from "./trackerStorage";
import type { ChatTrackerDraft, TrackerRecord } from "./schema";

const FIELD_LABELS: Record<string, string> = {
  role: "Role",
  company: "Company",
  track: "Track",
  compBand: "Comp band",
  source: "Source",
  appliedDate: "Applied date",
  status: "Status",
  nextAction: "Next action",
};

// Kept out of ChatAssistant.tsx so the "patches the right existing record"
// behavior is testable without React — same reasoning as
// lib/profileMigration.ts's pure shouldOfferMigration().
export function mergeChatTrackerDraft(
  draft: ChatTrackerDraft,
  existingRecords: TrackerRecord[],
): { record: Omit<TrackerRecord, "id" | "lastUpdatedDate">; matchedId: string | null } {
  const { matchedRecordId, ...fields } = draft;
  const matched = matchedRecordId
    ? existingRecords.find((r) => r.id === matchedRecordId)
    : undefined;
  const base = matched ?? emptyTrackerFields();
  return { record: { ...base, ...fields }, matchedId: matched?.id ?? null };
}

// Plain-language field-by-field summary for the in-chat confirm card — only
// lists fields the model actually filled in, same "only show what's
// present" rule as the paste-to-prefill flow.
export function describeTrackerDraft(draft: ChatTrackerDraft): string[] {
  return Object.entries(draft)
    .filter(([key, value]) => key !== "matchedRecordId" && value !== undefined && value !== "")
    .map(([key, value]) => `${FIELD_LABELS[key] ?? key}: ${value}`);
}
