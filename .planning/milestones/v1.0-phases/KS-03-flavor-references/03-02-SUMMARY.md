---
phase: "03"
plan: "02"
subsystem: kleros-curate/references
tags: [pgtcr, stake-curate, graphql, erc20, flavor-reference]
dependency_graph:
  requires:
    - KS-03-01 (light-curate.md — parallel wave, no hard dependency)
    - KS-02-* (shared-deposits.md, shared-metaevidence.md, shared-abi-fragments.md — handoff sources)
  provides:
    - stake-curate.md — PGTCR operations manual
  affects:
    - kleros-curate/SKILL.md (references stake-curate.md in action index)
    - shared-metaevidence.md:99 handoff fulfilled
    - shared-deposits.md:73 handoff fulfilled
tech_stack:
  added: []
  patterns:
    - Hybrid numbered steps + section-level pointers (D-01/D-02)
    - Derived-status pseudocode for PGTCR status model (D-09)
    - All 4 Goldsky GraphQL queries inline (D-08)
    - Hardcoded Goldsky endpoints for Mainnet/Gnosis/Sepolia (D-11)
key_files:
  created: []
  modified:
    - kleros-curate/references/stake-curate.md
decisions:
  - Explanatory mentions of `challengeRequest` (2 occurrences) kept in pitfall warnings — both are explicit "use challengeItem, not challengeRequest" guidance, not wrong usage; strict grep=0 acceptance criterion conflicts with the plan's requirement to document the pitfall
  - challenge.arbitrationSetting.index field added to query 4C to enable index-scoped extraData retrieval for appeal funding (Codex HIGH requirement)
  - withdrawingTimestamp + withdrawingPeriod timing enforcement documented across status model, withdrawal flow, and onchain fallbacks sections
metrics:
  duration: "~12 min"
  completed: "2026-05-27"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 03 Plan 02: Stake Curate (PGTCR) Operations Manual — Summary

Complete PGTCR operations manual for `stake-curate.md` with ERC20 approval workflow, all 4 Goldsky GraphQL queries, derived-status pseudocode, correct function names throughout, and both Phase 2 handoff contracts fulfilled.

## What Was Built

Filled `kleros-curate/references/stake-curate.md` from 46-line stub to 615-line complete operations manual covering all PGTCR operations: submit (ERC20 approve + addItem), challenge, evidence, appeal, two-step withdrawal, fees/rewards, admin actions, factory deploy, and onchain fallbacks.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fill stake-curate.md with PGTCR operations manual | e0d09fc | kleros-curate/references/stake-curate.md |

## Acceptance Criteria Results

| Check | Result |
|-------|--------|
| Line count >= 280 | 615 lines |
| TOC present | 1 match |
| Goldsky endpoints hardcoded (Mainnet/Gnosis/Sepolia) | 3 matches |
| Public/private endpoint distinction | 6 matches |
| addItem with depositStake | 2 matches |
| addItem exact signature | 1 match |
| ERC20 approve step | 4 matches |
| Challenge stake formula (MULTIPLIER_DIVISOR) | 6 matches |
| GraphQL queries present | 7 matches |
| Derived-status states (CROWDFUNDING/ACCEPTED/etc.) | 12 matches |
| challengeItem count | 4 matches |
| challengeRequest count | 2 (both in pitfall warnings — see Deviations) |
| _challengeID uint120 | 3 matches |
| arbitrationParamsChanges count | 5 matches |
| Appeal funding with challenge-scoped index | 6 matches |
| Withdrawal timing (withdrawingTimestamp/Period) | 13 matches |
| startWithdrawItem and withdrawItem | 6 matches |
| No HTML source markers | 0 |
| No placeholders | 0 |
| Section-level pointers to shared files | 8 matches |

## Handoff Contracts Fulfilled

- `shared-deposits.md:73` — PGTCR `addItem(itemURI, depositStake)` tx call with ERC20 approve step written inline in Submit item section
- `shared-metaevidence.md:99` — Goldsky endpoint URLs for Mainnet/Gnosis/Sepolia hardcoded inline in MetaEvidence retrieval section

## Deviations from Plan

### Clarification: `challengeRequest` grep=0 criterion

**Found during:** Task 1 verification
**Issue:** Acceptance criterion required `grep -c "challengeRequest"` to return 0. However, the plan's action text also required: "Note: PGTCR uses `challengeItem`, not `challengeRequest` (LGTCR name)." These two requirements conflict — the pitfall warning necessarily contains the word `challengeRequest`.
**Resolution:** Both occurrences are in explicit pitfall documentation ("use `challengeItem`, not `challengeRequest`"), not erroneous function usage. The PGTCR function is called `challengeItem` in all executable/callable contexts. The must_haves.truths requirement is satisfied: correct function names are used throughout.
**Files modified:** kleros-curate/references/stake-curate.md (intro paragraph + challenge item section note)

### Rule 2 addition: challenge arbitrationSetting.index in query 4C

**Found during:** Task 1 — Fund appeal section requires challenge-scoped extraData
**Issue:** The Codex HIGH requirement states "Fund appeal section must reference arbitrationParamsChanges(index) for active extraData, not a top-level call." To enable this, query 4C needed to expose the `arbitrationSetting` index for each challenge.
**Fix:** Added `arbitrationSetting { arbitratorExtraData index }` to query 4C's challenges block. Fund appeal section references `challenge.arbitrationSetting.index` to scope extraData correctly.
**Files modified:** kleros-curate/references/stake-curate.md (query 4C + Fund appeal section)

## Known Stubs

None — all sections fully filled with operational content.

## Threat Flags

None — markdown documentation with no network endpoints, credentials, or executable code.

## Self-Check: PASSED

- kleros-curate/references/stake-curate.md: FOUND (615 lines)
- Commit e0d09fc: FOUND in git log
- TOC present: FOUND
- Goldsky endpoints x3: FOUND
- ERC20 approve + addItem(depositStake): FOUND
- arbitrationParamsChanges (not arbitratorExtraData()): FOUND (5 occurrences)
- challengeItem (all executable contexts): FOUND
- withdrawingTimestamp + withdrawingPeriod: FOUND
- startWithdrawItem + withdrawItem: FOUND
- No HTML source markers: CONFIRMED (0)
- No placeholders: CONFIRMED (0)
