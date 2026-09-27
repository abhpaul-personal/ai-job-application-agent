"use client";

// next-auth v4's "next-auth/react" module ships with no "use client"
// directive, so a Server Component (app/(app)/layout.tsx) rendering
// SessionProvider directly breaks the RSC client-boundary — React treats it
// as a Server Component and its internal hooks throw ("React Context is
// unavailable in Server Components"). This thin re-export establishes the
// boundary here instead, same pattern as components/ThemeContext.tsx.
export { SessionProvider as AuthSessionProvider } from "next-auth/react";
