# Phase 3 Roadmap — Pipeline Intelligence (parked)

Status: PARTIALLY SHIPPED. M7 (application tracker, including natural-language entry via the chat assistant per `docs/POSITIONING.md` Section 5, with confirm-before-write per POSITIONING.md Section 3) is done — see git history. M8 (source-tagged insight cards), M9 (cross-source ingestion), and M10 (pipeline pattern observations) are NOT STARTED and remain future work.

## 1. Problem

A serious job search across 40+ concurrent applications currently requires manual cross-referencing across job boards, recruiter emails/LinkedIn messages, an interview calendar, and an ad-hoc tracker. There's no unified, structured view of the pipeline.

## 2. Scope

### M7 — Application tracker (prerequisite for everything else in this phase) — SHIPPED
- Structured record per application: role, company, track, comp band, source, key dates, status, next action.
- Add-from-pasted-text flow, since most sources (recruiter emails, LinkedIn posts) have no API.
- localStorage-based, same privacy pattern as profile data — never leaves the browser, never enters version control or the public demo.

### M8 — Source-tagged insight cards — FUTURE
- Impact-framed insights over tracker data, e.g. "3 of 5 active processes are TPM-track and clustering in the same 2-week window."
- Every insight tagged with its origin record for trust/verification at a glance.

### M9 — Cross-source ingestion — FUTURE
- Email/calendar via connectors where genuinely feasible.
- LinkedIn has no messaging API — ingestion from LinkedIn stays paste-based by design, not a gap to "fix" later.

### M10 — Pipeline pattern observations — FUTURE
- Aggregate observations across applications (e.g. which sources respond fastest).
- Worded strictly as observations, never as statistical claims or rates — sample sizes here are too small (tens, not hundreds) to support confidence language.

## 3. Non-goals

- No predictive scoring ("this JD will get a response") — not enough data to support it honestly.
- No automated LinkedIn scraping or messaging.

## 4. Privacy

Pipeline data (recruiter names, comp quotes, negotiation details) is the most sensitive data in the system. It follows the same local-only pattern as the personal profile: never in the public repo, never in the deployed demo, which runs on fictional data only.

## 5. Sequencing

See docs/PHASE4-ROADMAP.md for how this phase sequences against Phase 4 (Accounts). Recommended: M7 (tracker) before Phase 4's auth work, so persistence for both profile and tracker data is built once.

## 6. Competitive scan notes (added 2026-07-23)

Reviewed a peer project (JSpotter, github.com/MrLion/JSpotter — an early-stage personal script pipeline, not a polished product) for ideas. Findings relevant to this phase:

**Worth considering when M7-M10 are built:**
- A simple High/Medium/Low priority bucket, derived from the fit score, as a scannable addition to insight cards (M8) — simpler for a user to parse at a glance than a raw number.
- "Interview probability" as a scoring dimension is an interesting idea in principle, but should only ever be attempted once real tracker outcome data exists (M9/M10) to calibrate against — never as a guessed/assumed figure from day one. Consistent with this doc's existing rule against overconfident statistical claims on small samples.

**Deliberately rejected, keep as a hard line:**
- No automated LinkedIn/job-board scraping, ever. Beyond the technical fragility, this is a real Terms of Service and legal risk (see hiQ v. LinkedIn and subsequent enforcement patterns) — not worth the exposure for a project publicly tied to the maintainer's real identity during an active job search. M9's paste-based-only approach to LinkedIn ingestion (already specified above) stays as-is; this scan reinforces rather than changes that decision.
