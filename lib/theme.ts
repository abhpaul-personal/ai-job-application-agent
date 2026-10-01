import { safeGet, safeLocalStorage, safeSet, type KeyValueStorage } from "./safeStorage";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "aka.theme";

export type { KeyValueStorage };

export function getStoredTheme(storage: KeyValueStorage = safeLocalStorage): Theme | null {
  const raw = safeGet(storage, THEME_STORAGE_KEY);
  return raw === "dark" || raw === "light" ? raw : null;
}

export function setStoredTheme(theme: Theme, storage: KeyValueStorage = safeLocalStorage): void {
  safeSet(storage, THEME_STORAGE_KEY, theme);
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
