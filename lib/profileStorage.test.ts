import { describe, expect, it } from "vitest";
import {
  clearProfile,
  formatRelativeTime,
  getProfileUpdatedAt,
  saveProfile,
  type KeyValueStorage,
} from "./profileStorage";
import { PROFILE_STORAGE_KEY, type Profile } from "./schema";

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

const profile: Profile = {
  basics: {
    name: "Test Person",
    email: "test@example.com",
    currentTitle: "Engineer",
    currentCompany: "Test Co",
    location: "Test City",
    noticePeriodDays: 30,
    currentCtcLpa: 20,
    expectedCtcMinLpa: 25,
    expectedCtcMaxLpa: 35,
    relocation: "No",
  },
  targets: {
    roleTypes: ["Engineer"],
    seniority: "Mid",
    industries: ["Tech"],
    workMode: ["Remote"],
    experienceFraming: "5 years",
  },
  storyBank: [],
  rules: [],
  formats: { coverLetter: "Plain.", recruiterDm: "Short." },
};

describe("saveProfile / clearProfile / getProfileUpdatedAt", () => {
  it("has no updated-at timestamp before anything is saved", () => {
    const storage = fakeStorage();
    expect(getProfileUpdatedAt(storage)).toBeNull();
  });

  it("stamps a timestamp when the profile is saved", () => {
    const storage = fakeStorage();
    saveProfile(profile, storage);
    const updatedAt = getProfileUpdatedAt(storage);
    expect(updatedAt).not.toBeNull();
    expect(updatedAt!.getTime()).toBeCloseTo(Date.now(), -2);
  });

  it("clears both the profile and the timestamp", () => {
    const storage = fakeStorage();
    saveProfile(profile, storage);
    clearProfile(storage);
    expect(storage.getItem(PROFILE_STORAGE_KEY)).toBeNull();
    expect(getProfileUpdatedAt(storage)).toBeNull();
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-15T12:00:00Z");

  it("says 'just now' for under a minute", () => {
    expect(formatRelativeTime(new Date("2026-07-15T11:59:31Z"), now)).toBe("just now");
  });

  it("formats minutes", () => {
    expect(formatRelativeTime(new Date("2026-07-15T11:55:00Z"), now)).toBe("5 minutes ago");
    expect(formatRelativeTime(new Date("2026-07-15T11:59:00Z"), now)).toBe("1 minute ago");
  });

  it("formats hours", () => {
    expect(formatRelativeTime(new Date("2026-07-15T09:00:00Z"), now)).toBe("3 hours ago");
    expect(formatRelativeTime(new Date("2026-07-15T11:00:00Z"), now)).toBe("1 hour ago");
  });

  it("formats days", () => {
    expect(formatRelativeTime(new Date("2026-07-12T12:00:00Z"), now)).toBe("3 days ago");
    expect(formatRelativeTime(new Date("2026-07-14T12:00:00Z"), now)).toBe("1 day ago");
  });

  it("formats months for anything 30+ days old", () => {
    expect(formatRelativeTime(new Date("2026-05-15T12:00:00Z"), now)).toBe("2 months ago");
  });
});
