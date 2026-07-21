import { describe, expect, it } from "vitest";
import {
  getStoredTheme,
  resolveInitialTheme,
  setStoredTheme,
  THEME_STORAGE_KEY,
  type KeyValueStorage,
} from "./theme";

function fakeStorage(): KeyValueStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

describe("getStoredTheme / setStoredTheme", () => {
  it("returns null when nothing has been stored", () => {
    expect(getStoredTheme(fakeStorage())).toBeNull();
  });

  it("returns null for a corrupted/unexpected stored value", () => {
    const storage = fakeStorage();
    storage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(getStoredTheme(storage)).toBeNull();
  });

  it("round-trips a stored theme", () => {
    const storage = fakeStorage();
    setStoredTheme("dark", storage);
    expect(getStoredTheme(storage)).toBe("dark");
    setStoredTheme("light", storage);
    expect(getStoredTheme(storage)).toBe("light");
  });
});

describe("resolveInitialTheme", () => {
  it("prefers a saved theme over the system preference either way", () => {
    expect(resolveInitialTheme("light", true)).toBe("light");
    expect(resolveInitialTheme("dark", false)).toBe("dark");
  });

  it("falls back to prefers-color-scheme when nothing is saved", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
  });
});
