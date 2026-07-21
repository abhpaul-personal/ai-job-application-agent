# Phase 3 Roadmap — Accounts & Persisted Profiles (parked)

Status: NOT STARTED. Do not begin until M6 has shipped and deployed. This file exists to capture the plan so it isn't lost — see docs/BUILD_PLAN.md for the active milestones.

## 1. Problem

Today the app is single-user-per-browser: profile lives in localStorage, nothing survives a new device or a cleared cache. Two real user needs are emerging:

- **Anonymous / try-it users** — paste a CV, run the flow once, evaluate the product. This is the marketing CTA: no friction, no signup, works today.
- **Returning users** — want their profile to persist across sessions and devices, without redoing onboarding each time.

## 2. Design principle

One codebase, one flow, one compiler. Authentication changes *where the profile is stored*, not what the app does. Do not fork the anonymous and authenticated experiences into separate code paths — that doubles maintenance for no product benefit. Concretely: the profile object and compileSystemPrompt() stay exactly as built in M2; only the read/write layer changes (localStorage vs. database, keyed by user id instead of a fixed browser key).

## 3. Scope

### M11 — Auth
- Add NextAuth.js with Google as the sign-in provider (matches "auth via Gmail").
- Anonymous use remains fully functional and default — sign-in is opt-in, offered as "Save your profile — sign in with Google," never required to use the core flow.
- Session handling only; no new UI beyond a sign-in button and a signed-in state indicator.

### M12 — Persistence layer
- Add a database — Postgres via Vercel's managed integration is the lowest-friction path from the current Vercel deployment.
- One table: profiles, keyed by user id (from the auth session), storing the same JSON shape already defined in lib/schema.ts. No schema redesign — the Zod schema built in M2 is reused as-is.
- On sign-in: if a localStorage profile exists and no DB profile exists yet, offer "Save this profile to your account" as a one-time migration prompt. Never silently overwrite.
- Anonymous users continue to use localStorage exactly as today; signed-in users read/write the database instead. Same components, same compiler, different storage call underneath.

### M13 — Application history (depends on Phase 2's tracker, M7+)
- Only relevant once Phase 2's application tracker exists. For signed-in users, tracker records persist to the database instead of localStorage, using the same pattern as M12.
- Anonymous users keep a session-only tracker (lost on tab close) — acceptable, since this is a "try it" experience, not a system of record.

## 4. Explicit non-goals for Phase 3

- No password-based auth — Google only, to keep the security surface small for a solo-maintained project.
- No multi-user org/team features.
- No admin dashboard or analytics on other users' profiles.
- No change to the anonymous flow's capabilities — it must remain a complete, un-nerfed demo of the product, since it is the marketing CTA.

## 5. Risks

- **Security surface increases materially** once real user data sits in a real database — sessions, access control, and data deletion (GDPR-style "delete my data" requests) all become real obligations, not toy concerns. Do not treat this as "just add a login button."
- **Cost**: a managed Postgres instance has a running cost, unlike the current fully-static/serverless setup. Confirm free-tier limits before committing.
- **Scope creep**: the temptation after auth exists is to keep adding account features. Re-read the non-goals list before starting each new idea.

## 6. Sequencing relative to Phase 2

Independent tracks — Phase 2 (Pipeline Intelligence) and Phase 3 (Accounts) touch different parts of the app and can be built in either order after M6. Recommended order: Phase 2's M7 tracker first (it's pure localStorage, no new infra, fast portfolio value), then Phase 3 auth, then M12/M13 to persist the tracker for signed-in users — so persistence is built once, for both profile and tracker data, instead of twice.
