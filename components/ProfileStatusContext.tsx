"use client";

import { getSession, useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  clearProfile as clearLocalProfile,
  saveProfile as saveLocalProfile,
} from "@/lib/profileStorage";
import { PROFILE_STORAGE_KEY, type Profile } from "@/lib/schema";

interface ProfileStatus {
  hasProfile: boolean | undefined;
  refresh: () => void;
  isSignedIn: boolean;
  // The one seam anonymous vs. signed-in profile access goes through: local
  // (unchanged from before) or the database, decided here and nowhere else.
  loadProfile: () => Promise<Profile | null>;
  saveProfile: (profile: Profile) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const ProfileStatusContext = createContext<ProfileStatus | null>(null);

export function readLocalProfile(): Profile | null {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

// useSession()'s `status` starts as "loading" on every fresh page load —
// including the page load right after an OAuth redirect back from Google —
// and only resolves to "authenticated" a moment later, once its own
// background fetch to /api/auth/session completes. A real bug lived here:
// loadProfile()/saveProfile()/clearProfile() used to branch on that reactive
// `isSignedIn` directly, so a call made during the "loading" window read
// localStorage instead of the database — and since that value then seeded
// ProfileWizard's one-time lazy-initialized draft state, it stuck even after
// the session resolved a moment later and the correct profile arrived.
// getSession() sidesteps this entirely: it does its own fresh round trip to
// /api/auth/session every time it's called, so these three functions always
// act on the actual current server-verified session, never a stale render.
async function isCurrentlySignedIn(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user?.id;
}

export function ProfileStatusProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const [hasProfile, setHasProfile] = useState<boolean | undefined>(undefined);

  function refresh() {
    if (isSignedIn) {
      // Signed-in status is settled by loadProfile()/saveProfile()/
      // clearProfile() below, which all set it explicitly — a bare
      // localStorage check here would be wrong for this branch.
      return;
    }
    setHasProfile(!!localStorage.getItem(PROFILE_STORAGE_KEY));
  }

  useEffect(() => {
    if (isSignedIn) return;
    // Client-only localStorage read on mount; can't happen during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  async function loadProfile(): Promise<Profile | null> {
    if (await isCurrentlySignedIn()) {
      const res = await fetch("/api/profile");
      const profile = res.ok ? ((await res.json()).data as Profile | null) : null;
      setHasProfile(!!profile);
      return profile;
    }
    const profile = readLocalProfile();
    setHasProfile(!!profile);
    return profile;
  }

  async function saveProfile(profile: Profile): Promise<void> {
    if (await isCurrentlySignedIn()) {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setHasProfile(true);
      return;
    }
    saveLocalProfile(profile);
    setHasProfile(true);
  }

  async function clearProfile(): Promise<void> {
    if (await isCurrentlySignedIn()) {
      await fetch("/api/profile", { method: "DELETE" });
      setHasProfile(false);
      return;
    }
    clearLocalProfile();
    setHasProfile(false);
  }

  return (
    <ProfileStatusContext.Provider
      value={{ hasProfile, refresh, isSignedIn, loadProfile, saveProfile, clearProfile }}
    >
      {children}
    </ProfileStatusContext.Provider>
  );
}

export function useProfileStatus(): ProfileStatus {
  const ctx = useContext(ProfileStatusContext);
  if (!ctx) {
    throw new Error("useProfileStatus must be used within a ProfileStatusProvider");
  }
  return ctx;
}
