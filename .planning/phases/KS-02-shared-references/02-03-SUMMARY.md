---
phase: KS-02-shared-references
plan: "03"
subsystem: docs
tags: [curate, lgtcr, pgtcr, deposits, arbitration, appeal]

requires:
  - phase: KS-02-01
    provides: shared-abi-fragments.md (IArbitrator signatures referenced)
  - phase: KS-02-02
    provides: shared-meta-evidence.md (sibling reference file, no direct dependency)

provides:
  - "kleros-curate/references/shared-deposits.md — deposit computation for LGTCR and PGTCR including appeal funding"

affects:
  - KS-03 (Phase 3 flavor files will reference this for deposit formulas)
  - kleros-curate/SKILL.md (entry point will link here for deposit computation)

tech-stack:
  added: []
  patterns:
    - "WHY rationale on every hard rule (D-11/WRIT-02)"
    - "Imperative form instructions (D-10/WRIT-01)"
    - "Lean formula tables over verbose prose (D-13/WRIT-04)"
    - "Deferred step-by-step algorithms to flavor files (Phase 3)"

key-files:
  created: []
  modified:
    - kleros-curate/references/shared-deposits.md

key-decisions:
  - "No shared addItem transaction playbook — PGTCR addItem(string,uint256) differs from LGTCR addItem(string); tx calls belong in flavor files (Phase 3)"
  - "fundAppeal step-by-step algorithm (getItemInfo chain) deferred to light-curate.md (Phase 3)"
  - "Scout pointer placed under LGTCR specifics (D-02: Scout uses same LGTCR formulas)"
  - "Appeal funding formula in shared section — identical across LGTCR and PGTCR"

patterns-established:
  - "Two-asset model explanation: ERC20=collateral, native=arbitrator fee, with WHY rationale"
  - "Multiplier selection table: sharedStakeMultiplier/winnerStakeMultiplier/loserStakeMultiplier based on currentRuling"

requirements-completed:
  - FACT-02
  - FACT-06
  - WRIT-01
  - WRIT-02
  - WRIT-04

duration: 15min
completed: 2026-05-27
---

# Phase KS-02 Plan 03: Deposit Computation Reference Summary

**Deposit computation reference for LGTCR (4 formulas, native-only) and PGTCR (ERC20+native two-asset model) with shared appeal funding formula and loser half-time rule**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-27T00:00:00Z
- **Completed:** 2026-05-27T00:15:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced stub with complete deposit computation reference (112 lines)
- Hard rules with WHY rationale: live-read mandate (governance params change) and UI trap (base deposit != full msg.value)
- All 4 LGTCR native-token deposit formulas in a table
- PGTCR two-asset model explained with WHY; ERC20 approve sequence; challenge stake formula
- Shared appeal funding formula with multiplier selection and loser half-time rule
- D-02 Scout pointer under LGTCR specifics
- IArbitrator pointer to shared-abi-fragments.md
- fundAppeal step-by-step algorithm explicitly deferred to Phase 3

## Task Commits

1. **Task 1: Write shared-deposits.md** - `aa8578b` (docs)

**Plan metadata:** (pending — committed with SUMMARY below)

## Files Created/Modified

- `kleros-curate/references/shared-deposits.md` — deposit computation reference replacing stub content

## Decisions Made

- No shared addItem playbook: PGTCR signature `addItem(string,uint256)` differs from LGTCR `addItem(string)`; flavor-specific tx calls belong in Phase 3 files
- fundAppeal step-by-step algorithm (getItemInfo → getRequestInfo → getRoundInfo chain) deferred to light-curate.md per plan scope guard
- Appeal funding formula placed in shared section (identical in LGTCR and PGTCR, per plan spec)

## Deviations from Plan

None — plan executed exactly as written. Line count is 112 (plan target 80–100); extra 12 lines are content required by must_haves truths, not padding.

## Issues Encountered

None.

## User Setup Required

None — documentation-only plan, no external service configuration.

## Next Phase Readiness

- shared-deposits.md complete; Phase 3 flavor files (light-curate.md, stake-curate.md, scout-registries.md) can reference this directly
- fundAppeal step-by-step algorithm slot reserved in light-curate.md (Phase 3 Task)
- PGTCR challenge tx call reserved for stake-curate.md (Phase 3)

## Self-Check

- [x] `kleros-curate/references/shared-deposits.md` exists (112 lines)
- [x] No "Phase 2 content here" placeholders (grep returns 0)
- [x] All 4 LGTCR formulas present
- [x] PGTCR approve step present
- [x] challengeStakeMultiplier formula present
- [x] requiredForSide / feeStakeMultiplier present
- [x] Scout pointer present
- [x] shared-abi-fragments.md referenced
- [x] No getItemInfo/getRequestInfo/getRoundInfo step-by-step algorithm
- [x] Commit aa8578b exists

## Self-Check: PASSED

---
*Phase: KS-02-shared-references*
*Completed: 2026-05-27*
