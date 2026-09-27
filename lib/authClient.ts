import { getSession } from "next-auth/react";

// useSession()'s `status` starts as "loading" on every fresh page load —
// including the page load right after an OAuth redirect back from Google —
// and only resolves to "authenticated" a moment later, once its own
// background fetch to /api/auth/session completes. A real bug lived here:
// data-access functions used to branch on that reactive `isSignedIn`
// directly, so a call made during the "loading" window read localStorage
// instead of the database — and since that value then seeded a one-time
// lazy-initialized draft state elsewhere, it stuck even after the session
// resolved a moment later and the correct data arrived.
// getSession() sidesteps this entirely: it does its own fresh round trip to
// /api/auth/session every time it's called, so callers always act on the
// actual current server-verified session, never a stale render.
export async function isCurrentlySignedIn(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user?.id;
}
