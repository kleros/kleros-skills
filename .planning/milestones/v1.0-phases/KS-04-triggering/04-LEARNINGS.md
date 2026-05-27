---
phase: "04"
phase_name: "triggering"
project: "Kleros Skills"
generated: "2026-05-27"
counts:
  decisions: 3
  lessons: 3
  patterns: 3
  surprises: 2
missing_artifacts:
  - "04-UAT.md"
  - "04-RESEARCH.md"
---

# Phase 4 Learnings: Triggering

## Decisions

### Three-pass structure over keyword-only description
Adopted a three-pass aggressive trigger style (Use when / Also trigger when / Even if) instead of the previous flat keyword list. This saturates the trigger surface across three audience dimensions: developers (Solidity function names), non-developers (workflow verbs), and implicit contexts (registry operations + Kleros signals).

**Rationale:** The previous 726-char keyword-only description under-triggered on natural-language prompts because it only listed nouns. The three-pass structure, modeled after the published kleros-ipfs-upload skill (1,147 chars), addresses Claude Code's known tendency to under-trigger skills.
**Source:** 04-01-PLAN.md, 04-CONTEXT.md (D-04)

### Explicit exclusion of arbitrator-layer terms from trigger description
Deliberately excluded MetaEvidence, arbitrationCost, evidence submission, submission deposit, and challenge deposit from the description. These are cross-product Kleros terms that would cause false triggers on arbitration-layer queries that have nothing to do with Curate registries.

**Rationale:** Curate-specific triggers must not overlap with shared Kleros arbitration vocabulary. False triggers waste user time and erode trust in the skill system.
**Source:** 04-CONTEXT.md (D-02), 04-01-PLAN.md acceptance criteria

### Explicit non-Kleros registry exclusion over implicit
Chose to add an explicit "Do NOT trigger for non-Kleros registries" clause rather than relying on the implicit Kleros-context-signal requirement. The verifier flagged that requiring Kleros context signals provides functional exclusion but not the explicit language the ROADMAP SC-3 demanded.

**Rationale:** Implicit exclusions are fragile — future description edits could remove the Kleros-context gate without realizing it also served as the non-Kleros registry boundary. An explicit clause is self-documenting and survives refactoring.
**Source:** 04-VERIFICATION.md (Truth 8), fix commit 7a2b484

---

## Lessons

### Verification catches scope gaps that planning misses
The plan checker passed with only a warning (missing update-digests), but the verifier caught a deeper issue: ROADMAP SC-3 required "explicitly excludes non-Kleros registries" while the description only achieved this implicitly. The fix required tightening wording across the entire description to free 24 characters for the explicit exclusion — a non-trivial edit.

**Context:** Plan-checker validates structure and coverage; verifier validates against the ROADMAP success criteria. Both are needed — they catch different classes of issues.
**Source:** 04-VERIFICATION.md (human_needed → passed after fix)

### Character budget forces trade-offs between expressiveness and precision
The 1,536-char YAML description cap is a hard constraint. The initial draft landed at 1,600 chars (64 over), requiring two rounds of tightening: first to reach 1,515, then to 1,512 after adding the non-Kleros exclusion. Each trim required choosing which words earn their character cost — "appeal a dispute on a registry item" became "appeal a registry dispute" (-10 chars).

**Context:** Future skill descriptions hitting the cap should budget ~50 chars of headroom for post-verification fixes rather than targeting the maximum.
**Source:** 04-01-SUMMARY.md, execution transcript

### update-digests is a mandatory post-edit step that plans must include
The plan checker correctly flagged that the original plan omitted `npm run update-digests` — a CLAUDE.md requirement after any SKILL.md edit. This was added to the plan's verify block before execution. Without this, the `.well-known/agent-skills/index.json` digest would have been stale.

**Context:** Any plan modifying a SKILL.md file must include `npm run update-digests` in its verify block and `.well-known/agent-skills/index.json` in its files_modified.
**Source:** 04-01-PLAN.md (plan-checker warning), CLAUDE.md

---

## Patterns

### Three-pass skill description template
Structure: Pass 1 (explicit term coverage) → Pass 2 (workflow verb triggers) → Pass 3 (implicit triggers + boundaries + override exception). Each pass targets a different user persona and trigger modality. This pattern is reusable for any multi-domain skill.

**When to use:** Any Claude Code skill that serves multiple user types (developers + non-developers) or covers multiple product flavors. The three-pass structure ensures coverage across explicit mentions, action-oriented requests, and implicit context.
**Source:** 04-CONTEXT.md (D-04), modeled after kleros-ipfs-upload/SKILL.md

### Automated verification scripts embedded in plan
The plan included Python verification scripts directly in the `<verify>` block: term presence check, character count, forbidden term check, body integrity check. These ran immediately after the edit, catching issues before commit.

**When to use:** Any plan where acceptance criteria can be expressed as deterministic checks. Embedding the scripts in the plan ensures the executor runs them rather than relying on manual inspection.
**Source:** 04-01-PLAN.md verify block

### Override exception clause as standard skill footer
Every published skill should end with an override exception: "if the user explicitly names [skill], or asks to test/validate this skill, trigger regardless of topical context." This handles deliberate testing and explicit invocation that would otherwise fail the topical trigger filter.

**When to use:** Every published skill description. It's cheap (~120 chars) and prevents a class of false-negative triggers during development and testing.
**Source:** 04-CONTEXT.md (D-08), kleros-ipfs-upload/SKILL.md reference

---

## Surprises

### Previous description was missing 2 of 15 required trigger terms
The pre-existing description (726 chars from Phase 3) was assumed to contain all required positive triggers, but was actually missing `removeItem` and `challengeItem`. The TRIG-02 requirement exposed this gap — the original description only listed `addItem` and `challengeRequest`, omitting two of the four Solidity functions.

**Impact:** Without Phase 4's systematic term check, the skill would have continued under-triggering for users working with PGTCR contracts (which use `challengeItem` instead of `challengeRequest`) and item removal workflows.
**Source:** 04-01-SUMMARY.md (key metrics: 13/15 → 15/15)

### Verifier's human_needed flag was resolved programmatically
The verifier returned `human_needed` status for the non-Kleros registry exclusion, expecting a human judgment call. But the fix was mechanical: tighten wording to free characters, add explicit exclusion, re-run digests. No human judgment was actually needed — the ROADMAP's "explicitly excludes" language was unambiguous once interpreted as requiring the literal phrase.

**Impact:** `human_needed` verification status doesn't always require human intervention — sometimes it surfaces a gap that can be fixed and re-verified automatically. The iteration cost was ~3 edits + 1 commit.
**Source:** 04-VERIFICATION.md (status: human_needed → passed)
