// Storage is injected (defaulting to the real localStorage) so the
// week-boundary logic is unit-testable without a DOM/jsdom environment —
// same pattern as agentStage.ts's injected callModel.
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "aka.weeklyAnalysisCount";

interface StoredCount {
  weekStart: string;
  count: number;
}

// Monday-anchored date (YYYY-MM-DD) for the week containing `date`, in the
// caller's local time throughout. Deliberately avoids toISOString() (UTC) —
// mixing local Date math with a UTC-formatted result shifts the date by one
// day in any positive UTC-offset timezone (e.g. IST).
export function getWeekStartISO(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

function readStored(storage: KeyValueStorage): StoredCount | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.weekStart === "string" && typeof parsed?.count === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function getWeeklyAnalysisCount(
  storage: KeyValueStorage = localStorage,
  now: Date = new Date(),
): number {
  const stored = readStored(storage);
  const currentWeekStart = getWeekStartISO(now);
  if (!stored || stored.weekStart !== currentWeekStart) return 0;
  return stored.count;
}

export function incrementWeeklyAnalysisCount(
  storage: KeyValueStorage = localStorage,
  now: Date = new Date(),
): number {
  const stored = readStored(storage);
  const currentWeekStart = getWeekStartISO(now);
  const nextCount = stored && stored.weekStart === currentWeekStart ? stored.count + 1 : 1;
  storage.setItem(STORAGE_KEY, JSON.stringify({ weekStart: currentWeekStart, count: nextCount }));
  return nextCount;
}
