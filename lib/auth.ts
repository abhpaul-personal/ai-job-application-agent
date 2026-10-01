// Server-only: NextAuth config, shared by the route handler and any server
// code that needs the signed-in user (getServerSession(authOptions)).
import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Google only, per docs/PHASE4-ROADMAP.md's own non-goal: "No password-based
// auth — Google only, to keep the security surface small for a solo-
// maintained project." JWT session strategy — no NextAuth DB adapter, since
// we don't need multi-provider account linking; the DB only ever stores
// profiles, keyed by the id this puts on the session.
export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  // next-auth v4 only auto-detects a secret from `NEXTAUTH_SECRET` — this
  // project's env var is named AUTH_SECRET (the v5-style name, set that way
  // in both .env.local and Vercel), so without this explicit mapping
  // next-auth silently fell back to an ephemeral, auto-generated secret on
  // every environment. In a single long-running `next dev` process that's
  // one stable secret for the whole session, so it never surfaced locally.
  // On Vercel's serverless functions, each cold-started instance generated
  // its own secret, so a JWT session cookie signed by one instance could
  // fail to decode on another — the kind of intermittent, production-only
  // failure this prompt's bug 1 describes.
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
