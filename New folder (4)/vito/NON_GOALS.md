# NON_GOALS.md

## What This Dashboard Explicitly Refuses To Be

**Document Type:** Truth Artifact
**Phase:** 1 - Truth Discovery
**Created:** 2026-01-20
**Author:** OLYMPUS Self-Build

---

## Purpose of This Document

Non-goals are not "nice to haves we skipped."
Non-goals are **active refusals** - things we will not do even if asked.

This document protects OLYMPUS from scope drift and identity erosion.

---

## NON-GOAL 1: Chat-First Interface

**We refuse to be a chatbot.**

- No floating chat bubble
- No "Ask OLYMPUS anything" input
- No conversational UI as the primary interaction model
- Chat may exist as a secondary feature, but the primary interface is a build console

**Why:** Chat interfaces encourage vague requests. OLYMPUS requires explicit parameters. A chat-first UI trains users to be imprecise.

---

## NON-GOAL 2: Template Marketplace

**We refuse to be a template browser.**

- No "Start from template" as the default flow
- No gallery of pre-built apps
- No "clone this project" buttons
- No curated starter kits

**Why:** Templates produce users who don't understand their code. OLYMPUS builds from explicit intent, not from copying others.

---

## NON-GOAL 3: Beginner-Friendly Onboarding

**We refuse to optimize for first-time users who expect magic.**

- No "Getting Started" wizard
- No tooltip tours
- No "simplified mode"
- No hiding of advanced options

**Why:** Users who need hand-holding will not understand what OLYMPUS produces. We filter at the door, not after.

---

## NON-GOAL 4: Error Hiding

**We refuse to sanitize failures.**

- No "Something went wrong, please try again"
- No generic error modals
- No suppression of stack traces
- No "contact support" as the only information

**Why:** Hidden errors train users to treat the system as a black box. OLYMPUS is glass-box by design.

---

## NON-GOAL 5: One-Click Deployment

**We refuse to ship without review.**

- No "Deploy Now" button that bypasses inspection
- No auto-deploy on build success
- No "trust us, it works" flows

**Why:** Users must review what agents produced. Shipping without understanding violates the core contract.

---

## NON-GOAL 6: Mobile-First Design

**We refuse to optimize for phone screens.**

- No responsive layouts that hide critical information
- No hamburger menus containing essential controls
- No touch-optimized interactions at the expense of information density

**Why:** This is a power-user tool. Power users have keyboards and large screens. Mobile is a viewport, not a priority.

---

## NON-GOAL 7: Real-Time Collaboration

**We refuse to be Google Docs for code.**

- No simultaneous multi-user editing
- No presence indicators
- No cursor sharing
- No comment threads on generated code

**Why:** Build orchestration is not a collaborative editing task. One operator runs a build. Others can inspect results after.

---

## NON-GOAL 8: AI Personality

**We refuse to give OLYMPUS a persona.**

- No "Hi! I'm OLYMPUS, your friendly AI assistant!"
- No emoji in system messages
- No casual language in status updates
- No anthropomorphization

**Why:** OLYMPUS is a tool, not a character. Personas create false expectations of understanding and agency.

---

## NON-GOAL 9: Gamification

**We refuse to make builds "fun."**

- No achievement badges
- No streak counters
- No leaderboards
- No celebratory animations on completion

**Why:** Gamification optimizes for engagement over understanding. We optimize for comprehension.

---

## NON-GOAL 10: Feature Parity with Competitors

**We refuse to copy features because others have them.**

- No "Vercel has this, so we need it"
- No "Cursor does this, let's add it"
- No feature checklist comparisons

**Why:** OLYMPUS is a different thing. Comparison-driven development produces a worse version of something else.

---

## Enforcement

These non-goals are not suggestions. They are contracts.

Any PR, design, or feature request that violates a non-goal must either:
1. Be rejected
2. Amend this document with explicit justification

Amendment requires documenting:
- What changed
- Why the original non-goal was wrong
- What safeguards prevent the predicted failure mode

---

## Uncertainty Statement

**What I am uncertain about:**

1. Whether "no mobile" is sustainable if the user base grows beyond solo operators
2. Whether "no chat" prevents legitimate use cases (e.g., clarifying build parameters)
3. Whether "no templates" blocks users who have legitimate starting points in mind

These uncertainties are acknowledged but do not override the non-goals. They may be revisited in future phases with evidence.

---

*This document is a shield. Reference it when someone asks "why don't we just add X?"*
