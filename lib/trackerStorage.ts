import { safeGet, safeLocalStorage, safeSet, type KeyValueStorage } from "./safeStorage";
import { TRACKER_STORAGE_KEY, TrackerRecordSchema, type TrackerRecord } from "./schema";

export type { KeyValueStorage };

// The blank-record shape shared by the add form (TrackerView.tsx) and the
// chat-draft merge (trackerChatDraft.ts) — one place for the field list so
// adding/renaming a tracker field only ever needs a schema.ts change here.
// entryOrigin: "Manual" here is what tags the manual-add form and any
// brand-new chat/paste-to-prefill record as human-initiated.
export function emptyTrackerFields(): Omit<TrackerRecord, "id" | "lastUpdatedDate"> {
  return {
    role: "",
    company: "",
    track: "",
    compBand: "",
    source: "",
    appliedDate: "",
    status: "Applied",
    nextAction: "",
    entryOrigin: "Manual",
  };
}

function readAll(storage: KeyValueStorage): TrackerRecord[] {
  const raw = safeGet(storage, TRACKER_STORAGE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const records: TrackerRecord[] = [];
  for (const item of parsed) {
    // Same discipline as lib/db.ts's getProfileForUser/getTrackerRecordsForUser:
    // a record predating a schema field (e.g. entryOrigin) still parses —
    // Zod fills in its default — so old records migrate in place rather
    // than being dropped. Only a genuinely malformed record is skipped.
    const result = TrackerRecordSchema.safeParse(item);
    if (result.success) {
      records.push(result.data);
    } else {
      console.warn("Stored tracker record does not match TrackerRecordSchema; skipping it.");
    }
  }
  return records;
}

function writeAll(storage: KeyValueStorage, records: TrackerRecord[]): void {
  safeSet(storage, TRACKER_STORAGE_KEY, JSON.stringify(records));
}

export function getTrackerRecords(storage: KeyValueStorage = safeLocalStorage): TrackerRecord[] {
  return readAll(storage);
}

// Upserts by id — same record shape is used for both create and edit, so
// the caller doesn't need to know which case it is.
export function saveTrackerRecord(
  record: TrackerRecord,
  storage: KeyValueStorage = safeLocalStorage,
): void {
  const records = readAll(storage);
  const index = records.findIndex((r) => r.id === record.id);
  if (index === -1) {
    records.push(record);
  } else {
    records[index] = record;
  }
  writeAll(storage, records);
}

export function deleteTrackerRecord(id: string, storage: KeyValueStorage = safeLocalStorage): void {
  writeAll(
    storage,
    readAll(storage).filter((r) => r.id !== id),
  );
}
