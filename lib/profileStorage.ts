import { PROFILE_STORAGE_KEY, type Profile } from "./schema";

const PROFILE_UPDATED_AT_KEY = "aka.profile.updatedAt";

// Storage is injected (defaulting to the real localStorage) so this is
// unit-testable without a DOM/jsdom environment — same pattern as
// lib/effortTracking.ts and lib/rateLimit.ts.
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// The one place that writes the profile, so every save path (wizard save,
// JSON import) stamps the "last updated" timestamp automatically instead of
// relying on every call site to remember to do it separately.
export function saveProfile(profile: Profile, storage: KeyValueStorage = localStorage): void {
  storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  storage.setItem(PROFILE_UPDATED_AT_KEY, new Date().toISOString());
}

export function clearProfile(storage: KeyValueStorage = localStorage): void {
  storage.removeItem(PROFILE_STORAGE_KEY);
  storage.removeItem(PROFILE_UPDATED_AT_KEY);
}

export function getProfileUpdatedAt(storage: KeyValueStorage = localStorage): Date | null {
  const raw = storage.getItem(PROFILE_UPDATED_AT_KEY);
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
