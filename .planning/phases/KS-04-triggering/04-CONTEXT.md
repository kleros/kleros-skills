# Phase 4: Triggering - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Finalize the YAML `description` field in `kleros-curate/SKILL.md` frontmatter — the sole mechanism that determines whether Claude Code (or any skill-consuming agent) triggers the kleros-curate skill. The description must trigger correctly for all three Curate flavors (LGTCR, PGTCR, Scout) within the 1,536-character cap, using a three-pass aggressive style that combats Claude's tendency to under-trigger.

This phase edits only the `description:` value in the YAML frontmatter. The SKILL.md body is not modified.

</domain>

<decisions>
## Implementation Decisions

### Trigger Surface Breadth
- **D-01:** Four trigger categories — the description includes workflow verbs (submit, challenge, remove, appeal, deploy, curate), ecosystem jargon (TCR, token-curated registry, curation, curated list, decentralized registry), Curate-specific function names (addItem, removeItem, challengeItem, challengeRequest), and situational phrases ("add a token to the list", "check if an address is tagged", "browse registry entries").
- **D-02:** Exclude arbitrator-layer terms — MetaEvidence, arbitrationCost, and evidence submission are NOT Curate-specific triggers. They belong to the Kleros arbitration layer shared across all products. Similarly, "submission deposit" and "challenge deposit" are cross-product terms shared with Proof of Humanity and future Kleros products. These terms must NOT appear as triggers in the description.
- **D-03:** Both Solidity function names AND generic verbs — include `addItem`, `removeItem`, `challengeItem`, `challengeRequest` for developers who think in contract calls, alongside natural-language verbs (submit, challenge, remove, appeal, deploy, curate) for non-developers. Both audiences will prompt this skill. ~160 chars total, well within budget.

### Pushiness Calibration
- **D-04:** Three-pass aggressive style — the description uses three reinforcing trigger layers:
  1. "Use this skill when..." — primary trigger list with protocol names, function names, and feature terms
  2. "Also trigger when..." — workflow verbs and situational phrases (actions users ask for)
  3. "Even if the user doesn't explicitly mention Curate, trigger if..." — implicit triggers for edge cases
- **D-05:** Fill close to 1,536-char cap — target ~1,300-1,500 characters. The published `kleros-ipfs-upload` skill uses 1,147 chars. This skill covers three flavors with more complex routing, justifying a denser description. Every character spent on accurate trigger surface reduces under-triggering.
- **D-06:** Implicit trigger condition — trigger when the user describes registry operations (adding entries, checking item status, browsing items, querying a list) combined with Kleros context signals (Kleros, arbitrator, dispute, juror, PNK), even without explicitly mentioning "Curate." The routing tree in SKILL.md handles flavor detection from there.

### Boundary & Exceptions
- **D-07:** Single IPFS exclusion only — the description keeps the existing negative trigger ("Do NOT trigger for generic IPFS uploads with no Curate context — those belong to the `kleros-ipfs-upload` skill"). No additional product-boundary exclusions needed because D-02 already excluded cross-product terms from the trigger list, and D-06 scoped implicit triggers to "registry operations" which naturally excludes PoH, Courts, and general arbitration. Scope statement ("Interact with Kleros Curate registries") handles the rest.
- **D-08:** Override exception clause — add "Exception: if the user explicitly names the kleros-curate skill, or asks to test/validate this skill, trigger regardless of topical context." Matches the pattern established by `kleros-ipfs-upload`. Handles deliberate testing and explicit invocation. ~120 chars.

### Claude's Discretion
- Exact wording and sentence structure within the three-pass framework — planner determines the most natural phrasing
- Ordering of terms within each trigger pass — choose the order that reads most naturally
- Whether situational phrases are quoted examples or woven into prose — whichever fits the char budget better

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current SKILL.md (target file)
- `kleros-curate/SKILL.md` — lines 1-4 contain the YAML frontmatter with current `description:` value (708 chars). Only the `description:` field is modified.

### Published Skill (style reference)
- `kleros-ipfs-upload/SKILL.md` — lines 1-5 contain the published description (1,147 chars) — reference for three-pass trigger style, boundary language, and override exception clause.

### Skill-Creator Guidance
- Skill-creator SKILL.md (installed plugin at `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/skill-creator/skills/skill-creator/SKILL.md`) — lines 66-68: description should be "a little bit pushy", include both what the skill does AND specific contexts for when to use it.

### Requirements
- `.planning/REQUIREMENTS.md` — TRIG-01 (1,536-char cap, third-person, pushy), TRIG-02 (required positive triggers list), TRIG-03 (negative triggers)

### Prior Phase Decisions
- `.planning/phases/KS-01-architecture/01-CONTEXT.md` — D-02: keyword triggers per flavor (Scout, PGTCR, default LGTCR)
- `.planning/phases/KS-03-flavor-references/03-CONTEXT.md` — D-10/D-11: tiered staleness handling (informs which terms are stable enough to use as triggers)

### Plugin Structure
- `CLAUDE.md` — skill conventions, YAML frontmatter requirements, multi-surface update rule

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Current `kleros-curate/SKILL.md` description (708 chars) — solid foundation with all TRIG-02 keywords already present. Expand rather than rewrite from scratch.
- `kleros-ipfs-upload/SKILL.md` description (1,147 chars) — proven three-pass structure to replicate: primary triggers → contextual triggers → override exception.

### Established Patterns
- Description field is the sole triggering mechanism for Claude Code skills — no other metadata influences trigger decisions
- Published skill uses `**specifically**` emphasis and contextual trigger phrases beyond bare keywords
- Override exception clause at the end handles explicit invocation and testing

### Integration Points
- YAML frontmatter parsing — description must be valid YAML (watch for special characters, colons, quotes that need escaping)
- The SKILL.md body (routing tree, non-negotiables, action index) is NOT modified — only the frontmatter description changes

</code_context>

<specifics>
## Specific Ideas

- Model the three-pass structure after kleros-ipfs-upload: Pass 1 lists protocol/contract terms, Pass 2 lists workflow actions and situational contexts, Pass 3 handles implicit triggers and the override exception
- challengeRequest (LGTCR) and challengeItem (PGTCR) are both included as triggers — they serve different developer audiences who know their specific contract flavor
- The implicit trigger (Pass 3) should use concrete verb phrases: "adding entries to a list", "checking item status in a registry", "querying a curated list" — not abstract terms

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 4-Triggering*
*Context gathered: 2026-05-27*
