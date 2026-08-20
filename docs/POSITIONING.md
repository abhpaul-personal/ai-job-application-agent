# Positioning — Job Kit Agent, Professional Product Direction

Status: DECISION DOCUMENT. Written 2026-08-03, before further build. This is the anchor for all phases below it — if a future feature request conflicts with this doc, the doc wins by default; revise the doc deliberately rather than drifting past it silently.

## 1. Who this is for

Tech professionals broadly (not narrowed to PM/TPM specifically) — a deliberate choice to keep the addressable audience wide. Trade-off accepted: broader ICP means more generic core flows initially; role-specific depth (e.g. PM-specific vs. engineer-specific fit-analysis logic) may need to be added later once real usage shows where the need concentrates. Do not silently narrow or silently broaden this without revisiting this doc.

## 2. What brings people back (retention hypothesis)

Three things, combined:

- A running tracker of their own applications (Phase 3, already scoped) — their own data, not generic content.
- Accounts so nothing is ever re-entered (Phase 4, already scoped).
- A compliant, lightweight job feed to give the tracker/dashboard something fresh to show daily — scoped narrowly (see Section 4), not a full job-board replacement.

## 3. The moat: personalization depth, not listings coverage

Explicit decision: this product does not compete on job-listing coverage or freshness — that is a scale game already won by Naukri, LinkedIn, Indeed, and (per the competitive scan below) newer entrants like Underpaid. This product competes on depth per application: a compiled personal agent that reasons over the user's own real story, gated by human review, incapable of fabrication. That is the hard-to-copy part and the one to keep investing in first.

Implication: if a future roadmap item trades personalization quality for listings breadth, that trade should be viewed with suspicion — it's optimizing for the wrong differentiator.

Chat as an input method — scoped decision (added 2026-08-03): the Phase 2 chat assistant may be extended to handle navigation ("take me to settings") and structured data entry ("add Agoda TPM, applied yesterday" → a tracker record), because neither touches the guarded actions below. It must NOT be extended to trigger fit analysis or kit generation directly — those remain behind their existing explicit UI actions, unchanged from the original Phase 2 design and the adversarial testing already done and referenced publicly. Any data the chat writes (e.g. tracker entries) must be shown back to the user for confirmation before it commits — no silent writes from a natural-language guess.

## 4. Job listings — de-risked approach (updated 2026-08-03)

Original idea (scrape LinkedIn + major Indian job boards) is explicitly rejected — real ToS and legal exposure (see docs/PHASE3-ROADMAP.md Section 7 for the original JSpotter-driven reasoning), unacceptable for a product tied to the founder's real identity.

Revised approach, informed by a competitive scan of iamunderpaid.com: that product aggregates listings by pulling from companies' own public career pages and linking directly to the official application — not from LinkedIn or other job boards, and explicitly allows companies to request removal. This is a legitimate, lower-risk model worth following:

- Aggregate only from public company career pages, never from LinkedIn, Naukri, or similar platforms directly.
- Always link out to the original/official listing — never claim to be the application destination.
- Provide a removal mechanism for companies, same as the reference model.
- Treat this as a modest input feed to the existing fit-analysis engine (see Section 5's "multi-JD batch analysis"), not as a standalone job board competing on coverage.

## 5. Sequencing (supersedes prior informal phase ordering where it conflicts)

1. This positioning doc — done, anchor point.
2. Phase 3 — Tracker (already scoped in docs/PHASE3-ROADMAP.md), reframed explicitly as the retention anchor for a professional product, not just a nice-to-have. Includes natural-language tracker entry via the existing chat assistant (see Section 3) as part of its scope, with confirm-before-write required.
3. Phase 4 — Accounts + Freemium billing, combined and built together rather than sequenced separately, since the monetization decision (Section 6) changes what accounts need to support from day one.
4. New — Multi-JD batch analysis: paste or feed multiple JDs at once, get ranked fit analyses. The lightweight substitute for a full job board — gives the "dashboard of options" feeling without listings-coverage risk.
5. New — Trust & Compliance: privacy policy, terms of service, data deletion path, security review. Non-optional once real accounts and payment exist.
6. New — Compliant career-page feed (Section 4's approach): only after 2-5 are solid. Starts narrow (a small curated set of company career pages) rather than attempting broad coverage immediately.

## 6. Business model

Freemium: free tier remains fully functional for the core loop (profile, fit analysis, kit generation) — never crippled as a teaser, consistent with the original "anonymous flow must stay complete" decision. Paid tier scope not yet defined — candidates to evaluate once Phase 4 is underway: unlimited tracker entries / applications, the compliant job feed, multi-JD batch analysis at volume, or export/integration features. Do not finalize paid-tier scope before Phase 3/4 are built and real usage patterns exist to inform it.

## 7. What this explicitly is not

- Not a salary-benchmarking product (Underpaid's core; requires network effects/scale this project doesn't have and isn't pursuing).
- Not a mentorship marketplace (a different business with different operational demands).
- Not a general career content platform (interview prep libraries, community feeds) — out of scope unless a future revision of this doc says otherwise.
