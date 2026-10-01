// Central safe wrapper around browser storage (localStorage/sessionStorage,
// or an injected fake in tests). Storage access can throw outright — not
// just return null for a missing key — when storage itself is blocked:
// Safari's "Block All Cookies" setting and some privacy extensions disable
// web storage entirely, not just cookies. An uncaught throw from a bare
// storage.getItem/setItem/removeItem call, if it happens inside a render,
// a useEffect, or a promise chain, can crash a page or silently swallow a
// feature. This was found independently in several files (profile status,
// the profile wizard, effort tracking, theme, the tracker, the chat
// assistant) before this helper existed — every storage read/write in this
// codebase should go through these three functions instead of calling
// storage.getItem/setItem/removeItem directly, so a new call site can't
// reintroduce the same bug by accident.
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function safeGet(storage: Pick<KeyValueStorage, "getItem">, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(
  storage: Pick<KeyValueStorage, "setItem">,
  key: string,
  value: string,
): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage blocked — nothing to do; the app keeps working without
    // persisting this particular write.
  }
}

export function safeRemove(storage: Pick<KeyValueStorage, "removeItem">, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Storage blocked — see safeSet's comment.
  }
}

// Reading the bare `localStorage`/`sessionStorage` identifier itself can
// throw — not just calling a method on it. Safari's "Block All Cookies"
// makes the getter on `window` throw a SecurityError the instant it's
// evaluated, before there's any object to call .getItem on. That reference
// evaluates immediately wherever it's written — including as a `= localStorage`
// default parameter value, or as a bare argument like `safeGet(localStorage, key)`
// — which happens *before* safeGet/safeSet/safeRemove's own try/catch ever
// runs, so passing the raw global through them does not actually guard
// anything. These two objects exist so nothing in this codebase ever writes
// the bare `localStorage`/`sessionStorage` identifier directly: each method
// below only touches the real global from inside its own try/catch, and
// only at call time, not at module load or at default-parameter evaluation.
// Use these wherever a function would otherwise default to or reference the
// real browser storage; safeGet/safeSet/safeRemove above remain the right
// tool for an already-bound storage parameter (e.g. one injected by a test).
export const safeLocalStorage: KeyValueStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage blocked — see safeSet's comment.
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage blocked — see safeSet's comment.
    }
  },
};

export const safeSessionStorage: KeyValueStorage = {
  getItem: (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Storage blocked — see safeSet's comment.
    }
  },
  removeItem: (key) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Storage blocked — see safeSet's comment.
    }
  },
};
