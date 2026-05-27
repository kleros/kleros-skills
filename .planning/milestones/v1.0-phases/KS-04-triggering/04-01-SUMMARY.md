---
phase: KS-04-triggering
plan: 01
status: complete
started: 2026-05-27
completed: 2026-05-27
---

# Plan 04-01 Summary: Rewrite YAML description with three-pass trigger style

## What was built

Rewrote the `description:` field in `kleros-curate/SKILL.md` YAML frontmatter from 726 chars to 1,515 chars using a three-pass aggressive trigger style modeled after the published `kleros-ipfs-upload` skill.

## Three-pass structure

- **Pass 1 ("Use this skill when..."):** Protocol names (Curate, Light Curate, LGTCR, PGTCR, Stake Curate, PermanentGTCR, Scout), ecosystem jargon (TCR, curated list, decentralized registry, CDN tags, Goldsky), and Solidity functions (addItem, removeItem, challengeItem, challengeRequest)
- **Pass 2 ("Also trigger when..."):** Workflow verbs and situational phrases — submit, challenge, remove, appeal, deploy, curate, browse, check tags, add token, query list, fund appeal
- **Pass 3 ("Even if Curate is not mentioned..."):** Implicit triggers (registry operations + Kleros context signals), IPFS exclusion (kleros-ipfs-upload boundary), override exception (explicit skill naming/testing)

## Key metrics

| Metric | Before | After |
|--------|--------|-------|
| Description length | 726 chars | 1,515 chars |
| Required terms (TRIG-02) | 13/15 | 15/15 |
| Three-pass structure | No | Yes |
| Implicit trigger clause | No | Yes |
| Override exception | No | Yes |

## Decisions honored

- D-01: Four trigger categories (workflow verbs, ecosystem jargon, function names, situational phrases)
- D-02: Excluded arbitrator-layer terms (MetaEvidence, arbitrationCost, submission deposit, challenge deposit)
- D-03: Both Solidity function names and generic verbs
- D-04: Three-pass aggressive style
- D-05: 1,515 chars (within 1,300-1,536 target)
- D-06: Implicit trigger for registry operations + Kleros context signals
- D-07: Single IPFS exclusion only
- D-08: Override exception clause

## Self-Check: PASSED

- All 15 TRIG-02 terms present
- Description length: 1,515 chars (within [1,300, 1,536])
- No forbidden terms (MetaEvidence, arbitrationCost, submission deposit, challenge deposit)
- Body unchanged (line 6 still reads "# Kleros Curate")
- YAML frontmatter valid
- SHA-256 digest updated in .well-known/agent-skills/index.json

## Files changed

| File | Change |
|------|--------|
| kleros-curate/SKILL.md | Rewrote description field (line 3) |
| .well-known/agent-skills/index.json | Updated kleros-curate digest |

## Deviations

None.
