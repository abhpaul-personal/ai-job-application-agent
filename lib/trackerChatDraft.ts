import { emptyTrackerFields } from "./trackerStorage";
import type { ChatTrackerDraft, TrackerDraft, TrackerRecord } from "./schema";

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

const NON_DISPLAY_KEYS = new Set(["matchedRecordId", "entryOrigin", "id", "lastUpdatedDate"]);

// Plain-language field-by-field summary for a confirm card — only lists
// fields actually present, same "only show what's present" rule as the
// paste-to-prefill flow. Used by both the in-chat confirm card (prompt 3)
// and the post-kit-generation confirm card (prompt 4); entryOrigin/id/
// lastUpdatedDate are excluded since they're app-assigned, not user-facing.
export function describeTrackerDraft(
  draft: ChatTrackerDraft | Record<string, unknown>,
): string[] {
  return Object.entries(draft)
    .filter(([key, value]) => !NON_DISPLAY_KEYS.has(key) && value !== undefined && value !== "")
    .map(([key, value]) => `${FIELD_LABELS[key] ?? key}: ${value}`);
}

// The post-kit-generation auto-entry prompt's own draft builder: unlike
// mergeChatTrackerDraft (patch-or-create against existing records), this is
// always a brand-new record, and status/appliedDate/entryOrigin are always
// forced to these specific values regardless of what extraction returned —
// the record represents "the user just applied," not whatever stage the JD
// text happens to describe.
export function buildKitAppliedRecord(
  extracted: TrackerDraft,
  fallbackRole: string,
  today: string,
): Omit<TrackerRecord, "id" | "lastUpdatedDate"> {
  return {
    ...emptyTrackerFields(),
    ...extracted,
    role: extracted.role || fallbackRole,
    status: "Applied",
    appliedDate: today,
    entryOrigin: "Job Kit Agent",
  };
}
