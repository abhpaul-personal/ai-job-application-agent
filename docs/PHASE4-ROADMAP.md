# Phase 4 Roadmap — Chat Assistant (parked until next week)

Status: NOT STARTED. Captured now, intended pickup: following week, after current feature freeze holds through launch settling. See docs/BUILD_PLAN.md and other roadmap docs for how this fits alongside Phase 2/3.

## 1. Problem / idea

The app is currently a structured, linear flow (form -> button -> gated result). A chat interface could make the product feel more genuinely agentic and let users ask questions naturally — but a general "agent does everything via chat" redesign would be a different product, not a feature, and would weaken the architectural human-in-the-loop guardrails the whole project is built around (see docs/ARCHITECTURE.md section 4, docs/PITCH.md "line this deliberately does not cross").

Resolution: build a **scoped, read-only, advisory chat assistant** — not a replacement for the existing flow, an addition alongside it.

## 2. Scope — what it does

- Explains an already-generated fit analysis in plain language ("why did this score X", "what's the biggest gap").
- Explains the user's own compiled profile/rules ("what does my agent know about me", "why didn't it mention X").
- Offers non-authoritative discussion/reasoning ("should I apply to this one" -> talked through, never decided or acted on by the assistant).
- Points to the right part of the UI for actions the user wants to take (e.g. "go to Settings to update your salary floor").

## 3. Explicit hard boundaries — what it must never do

- Never triggers fit analysis or kit generation itself. Those stay exactly where they are, behind their existing gated buttons.
- Never writes to or modifies the profile.
- Never claims to have taken an action on the user's behalf. If asked to "just apply for me" or similar, it explains what it can discuss versus what still requires the normal flow — redirects honestly, doesn't silently refuse or pretend to comply.
- Only ever reasons over: the user's own profile (already compiled), and the current fit analysis if one has been run in the session. No access to and no ability to trigger anything beyond that.

## 4. Technical approach (draft, refine before building)

- New lightweight stage on the existing /api/agent route (or a small dedicated route) — reuses compileSystemPrompt() and the existing profile/analysis data already in scope, no new data model needed.
- System prompt for this stage explicitly instructs: discuss and explain only; never claim to perform kit generation, analysis, or profile edits; if asked to do so, redirect to the relevant UI action.
- No new persistence — chat history can be session-only (not saved), consistent with the app's minimal-data-retention posture, unless a clear reason emerges to save it.
- Reuse the existing Zod-validated JSON contract pattern where practical (e.g. a simple {message: string} response shape) rather than introducing an unvalidated free-text channel.

## 5. Why this design, not a general agentic redesign

A general "agent does everything via chat" version would remove the current architecture's strongest, most defensible property: that kit generation is *structurally* impossible without a human reviewing the analysis first. A read-only, non-authoritative assistant preserves that property completely while still adding a genuinely more conversational, agentic-feeling surface. This is also the stronger interview story: extending the product while actively defending its own design principles, rather than trading them away for a flashier interface.

## 6. Non-goals

- No voice/multi-modal input.
- No persistent chat history / conversation memory across sessions in v1.
- No ability for the assistant to call external tools, browse, or take any action outside reasoning over already-available profile/analysis data.

## 7. Before starting

- Reconfirm feature freeze has genuinely lifted (i.e. launch traffic has settled, no urgent bugs pending) before beginning build.
- Reread this file's Section 3 (hard boundaries) at the start of the build session, and again before considering the milestone complete — this is the part most likely to erode under normal feature-building pressure ("just let it also...").
