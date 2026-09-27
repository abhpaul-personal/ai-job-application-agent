import { TRACKER_STORAGE_KEY, type TrackerRecord } from "./schema";
import type { KeyValueStorage } from "./profileStorage";

function readAll(storage: KeyValueStorage): TrackerRecord[] {
  const raw = storage.getItem(TRACKER_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrackerRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(storage: KeyValueStorage, records: TrackerRecord[]): void {
  storage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(records));
}

export function getTrackerRecords(storage: KeyValueStorage = localStorage): TrackerRecord[] {
  return readAll(storage);
}

// Upserts by id — same record shape is used for both create and edit, so
// the caller doesn't need to know which case it is.
export function saveTrackerRecord(
  record: TrackerRecord,
  storage: KeyValueStorage = localStorage,
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

export function deleteTrackerRecord(id: string, storage: KeyValueStorage = localStorage): void {
  writeAll(
    storage,
    readAll(storage).filter((r) => r.id !== id),
  );
}
