# Phase 2 Roadmap — Pipeline Intelligence (parked)

Status: NOT STARTED. Do not begin until core M1-M6 MVP is stable and shipped. This file exists to capture the plan so it isn't lost — see docs/BUILD_PLAN.md for the active milestones.

## 1. Problem

A serious job search across 40+ concurrent applications currently requires manual cross-referencing across job boards, recruiter emails/LinkedIn messages, an interview calendar, and an ad-hoc tracker. There's no unified, structured view of the pipeline.

## 2. Scope

### M7 — Application tracker (prerequisite for everything else in this phase)
- Structured record per application: role, company, track, comp band, source, key dates, status, next action.
- Add-from-pasted-text flow, since most sources (recruiter emails, LinkedIn posts) have no API.
- localStorage-based, same privacy pattern as profile data — never leaves the browser, never enters version control or the public demo.

### M8 — Source-tagged insight cards
- Impact-framed insights over tracker data, e.g. "3 of 5 active processes are TPM-track and clustering in the same 2-week window."
- Every insight tagged with its origin record for trust/verification at a glance.

### M9 — Cross-source ingestion
- Email/calendar via connectors where genuinely feasible.
- LinkedIn has no messaging API — ingestion from LinkedIn stays paste-based by design, not a gap to "fix" later.

### M10 — Pipeline pattern observations
- Aggregate observations across applications (e.g. which sources respond fastest).
- Worded strictly as observations, never as statistical claims or rates — sample sizes here are too small (tens, not hundreds) to support confidence language.

## 3. Non-goals

- No predictive scoring ("this JD will get a response") — not enough data to support it honestly.
- No automated LinkedIn scraping or messaging.

## 4. Privacy

Pipeline data (recruiter names, comp quotes, negotiation details) is the most sensitive data in the system. It follows the same local-only pattern as the personal profile: never in the public repo, never in the deployed demo, which runs on fictional data only.

## 5. Sequencing

See docs/PHASE3-ROADMAP.md section 6 for how this phase sequences against Phase 3 (Accounts). Recommended: M7 (tracker) before Phase 3's auth work, so persistence for both profile and tracker data is built once.
