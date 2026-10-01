import { safeGet, safeLocalStorage, safeRemove, safeSet, type KeyValueStorage } from "./safeStorage";
import { PROFILE_STORAGE_KEY, type Profile } from "./schema";

const PROFILE_UPDATED_AT_KEY = "aka.profile.updatedAt";

export type { KeyValueStorage };

// The one place that writes the profile, so every save path (wizard save,
// JSON import) stamps the "last updated" timestamp automatically instead of
// relying on every call site to remember to do it separately. Defaults to
// safeLocalStorage, not the bare `localStorage` global — see
// lib/safeStorage.ts for why that distinction matters — and goes through
// safeGet/safeSet/safeRemove rather than calling storage.getItem/setItem/
// removeItem directly, so an explicitly-injected (e.g. test) storage that
// throws on a method call is guarded too.
export function saveProfile(profile: Profile, storage: KeyValueStorage = safeLocalStorage): void {
  safeSet(storage, PROFILE_STORAGE_KEY, JSON.stringify(profile));
  safeSet(storage, PROFILE_UPDATED_AT_KEY, new Date().toISOString());
}

export function clearProfile(storage: KeyValueStorage = safeLocalStorage): void {
  safeRemove(storage, PROFILE_STORAGE_KEY);
  safeRemove(storage, PROFILE_UPDATED_AT_KEY);
}

export function getProfileUpdatedAt(storage: KeyValueStorage = safeLocalStorage): Date | null {
  const raw = safeGet(storage, PROFILE_UPDATED_AT_KEY);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffSec = Math.round((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  const diffMonth = Math.round(diffDay / 30);
  return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
}
