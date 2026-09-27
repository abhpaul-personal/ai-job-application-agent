"use client";

import { signIn, signOut, useSession } from "next-auth/react";

const PILL_CLASS =
  "rounded-full border border-foreground/15 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5";

export function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    // Avoids a flash of "Sign in" before the session check resolves —
    // same non-blocking-UI tradeoff already accepted elsewhere in the app
    // (e.g. SideNav's tab1Label while hasProfile is briefly undefined).
    return null;
  }

  if (status === "authenticated") {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span className="hidden sm:inline">{session.user?.email}</span>
        <button type="button" className={PILL_CLASS} onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button type="button" className={PILL_CLASS} onClick={() => signIn("google")}>
      Sign in with Google
    </button>
  );
}
