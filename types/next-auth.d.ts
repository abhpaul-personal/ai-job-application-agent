import type { DefaultSession } from "next-auth";

// Augments the default Session type with the `id` field lib/auth.ts's
// session callback adds — the only thing the DB needs as a key.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
