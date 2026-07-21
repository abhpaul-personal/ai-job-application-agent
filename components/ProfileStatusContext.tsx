"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PROFILE_STORAGE_KEY } from "@/lib/schema";

interface ProfileStatus {
  hasProfile: boolean | undefined;
  refresh: () => void;
}

const ProfileStatusContext = createContext<ProfileStatus | null>(null);

export function ProfileStatusProvider({ children }: { children: ReactNode }) {
  const [hasProfile, setHasProfile] = useState<boolean | undefined>(undefined);

  function refresh() {
    setHasProfile(!!localStorage.getItem(PROFILE_STORAGE_KEY));
  }

  useEffect(() => {
    // Client-only localStorage read on mount; can't happen during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  return (
    <ProfileStatusContext.Provider value={{ hasProfile, refresh }}>
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
