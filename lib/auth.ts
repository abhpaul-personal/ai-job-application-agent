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
