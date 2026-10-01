import { afterEach, describe, expect, it } from "vitest";
import {
  safeGet,
  safeLocalStorage,
  safeRemove,
  safeSessionStorage,
  safeSet,
  type KeyValueStorage,
} from "./safeStorage";

function fakeStorage(): KeyValueStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

function blockedStorage(): KeyValueStorage {
  const throwBlocked = () => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  };
  return { getItem: throwBlocked, setItem: throwBlocked, removeItem: throwBlocked };
}

describe("safeGet / safeSet / safeRemove", () => {
  it("behave like the real storage methods when storage works normally", () => {
    const storage = fakeStorage();
    safeSet(storage, "k", "v");
    expect(safeGet(storage, "k")).toBe("v");
    safeRemove(storage, "k");
    expect(safeGet(storage, "k")).toBeNull();
  });

  it("safeGet returns null instead of throwing when storage access is blocked", () => {
    expect(safeGet(blockedStorage(), "k")).toBeNull();
  });

  it("safeSet does not throw when storage access is blocked", () => {
    expect(() => safeSet(blockedStorage(), "k", "v")).not.toThrow();
  });

  it("safeRemove does not throw when storage access is blocked", () => {
    expect(() => safeRemove(blockedStorage(), "k")).not.toThrow();
  });
});

// Safari's "Block All Cookies" setting (and some privacy extensions) make
// *referencing* the global `localStorage`/`sessionStorage` identifier itself
// throw — not just calling a method on it — which a plain
// `storage: KeyValueStorage = localStorage` default parameter, or a bare
// `safeGet(localStorage, key)` call, evaluates before any try/catch can
// intervene. These tests simulate exactly that by making the global
// identifier itself a throwing getter, which is the scenario that slipped
// through the first pass of this fix (it only guarded the method calls).
describe("safeLocalStorage / safeSessionStorage", () => {
  afterEach(() => {
    // @ts-expect-error -- test-only cleanup of a property defined below
    delete globalThis.localStorage;
    // @ts-expect-error -- test-only cleanup of a property defined below
    delete globalThis.sessionStorage;
  });

  function blockGlobalStorage() {
    const throwBlocked = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    Object.defineProperty(globalThis, "localStorage", { get: throwBlocked, configurable: true });
    Object.defineProperty(globalThis, "sessionStorage", { get: throwBlocked, configurable: true });
  }

  it("getItem returns null instead of throwing when the global identifier itself throws on access", () => {
    blockGlobalStorage();
    expect(safeLocalStorage.getItem("k")).toBeNull();
    expect(safeSessionStorage.getItem("k")).toBeNull();
  });

  it("setItem/removeItem do not throw when the global identifier itself throws on access", () => {
    blockGlobalStorage();
    expect(() => safeLocalStorage.setItem("k", "v")).not.toThrow();
    expect(() => safeLocalStorage.removeItem("k")).not.toThrow();
    expect(() => safeSessionStorage.setItem("k", "v")).not.toThrow();
    expect(() => safeSessionStorage.removeItem("k")).not.toThrow();
  });

  it("round-trips normally when the real global storage works", () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
      configurable: true,
    });
    safeLocalStorage.setItem("k", "v");
    expect(safeLocalStorage.getItem("k")).toBe("v");
    safeLocalStorage.removeItem("k");
    expect(safeLocalStorage.getItem("k")).toBeNull();
  });
});
