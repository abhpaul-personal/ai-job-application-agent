export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "aka.theme";

// Storage is injected (defaulting to the real localStorage) so this is
// unit-testable without a DOM/jsdom environment — same pattern as
// lib/effortTracking.ts, lib/rateLimit.ts, and lib/profileStorage.ts.
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function getStoredTheme(storage: KeyValueStorage = localStorage): Theme | null {
  const raw = storage.getItem(THEME_STORAGE_KEY);
  return raw === "dark" || raw === "light" ? raw : null;
}

export function setStoredTheme(theme: Theme, storage: KeyValueStorage = localStorage): void {
  storage.setItem(THEME_STORAGE_KEY, theme);
}

// A saved preference always wins; prefers-color-scheme is only the default
// for a user who has never touched the toggle. The blocking inline script in
// app/layout.tsx re-implements this same decision in raw JS (it runs before
// any bundled module can load, to avoid a flash of the wrong theme) — keep
// the two in sync if this logic ever changes.
export function resolveInitialTheme(storedTheme: Theme | null, prefersDark: boolean): Theme {
  if (storedTheme) return storedTheme;
  return prefersDark ? "dark" : "light";
}
