import type { Profile } from "./schema";

// True only when there's something to offer: signed in, nothing in the
// database yet, but a real profile sitting in this browser's localStorage.
// Pure so it's unit-testable without a session or a database — same pattern
// as lib/theme.ts's resolveInitialTheme().
export function shouldOfferMigration(
  isSignedIn: boolean,
  dbProfile: Profile | null,
  localProfile: Profile | null,
): boolean {
  return isSignedIn && dbProfile === null && localProfile !== null;
}
