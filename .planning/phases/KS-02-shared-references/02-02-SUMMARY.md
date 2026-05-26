---
phase: KS-02-shared-references
plan: "02"
subsystem: docs
tags: [kleros-curate, metaevidence, LGTCR, PGTCR, eth_getLogs, IPFS]

# Dependency graph
requires:
  - phase: KS-02-shared-references
    plan: "01"
    provides: shared-abi-fragments.md with MetaEvidence event topic0
provides:
  - shared-metaevidence.md: single retrieval reference for MetaEvidence across all Curate flavors
affects:
  - KS-02-03 (shared-deposits.md may reference MetaEvidence for deposit context)
  - KS-02-04 (shared-item-json.md — columns derived from MetaEvidence.metadata.columns)
  - KS-03 (any plan referencing MetaEvidence retrieval)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "topic0 pointer pattern: never inline hash, always point to shared-abi-fragments.md"
    - "Subsection scoping: LGTCR two-stream and PGTCR single-URI in separate ### subsections"
    - "WHY rationale on every hard rule (sort-and-take-latest, two-stream separation)"

key-files:
  created: []
  modified:
    - kleros-curate/references/shared-metaevidence.md

key-decisions:
  - "D-01: LGTCR and PGTCR specifics scoped to separate ### subsections, not interleaved"
  - "D-02: Scout pointer placed under LGTCR specifics — same mechanics, 4 specific addresses deferred to scout-registries.md"
  - "D-07: topic0 hash lives only in shared-abi-fragments.md; this file points there by name"
  - "D-11: WHY rationale on sort rule (stale state risk) and two-stream rule (wrong policy applied)"
  - "D-13: Goldsky endpoint URLs deferred to stake-curate.md (Phase 3 scope)"

patterns-established:
  - "Imperative form throughout: 'Call eth_getLogs', 'Sort by blockNumber descending'"
  - "Scope guards documented in plan enforced: no topic0 hash, no seed-first, no Goldsky URLs"

requirements-completed:
  - FACT-01
  - FACT-06
  - WRIT-01
  - WRIT-02
  - WRIT-04

# Metrics
duration: 8min
completed: 2026-05-26
---

# Phase KS-02 Plan 02: Shared MetaEvidence Retrieval Summary

**Single MetaEvidence retrieval reference for all Curate flavors: eth_getLogs with topic0 pointer, sort-and-take-latest with WHY, LGTCR two-stream (IDs 0/1), PGTCR single-URI + Goldsky primary/fallback**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-26T23:50:00Z
- **Completed:** 2026-05-26T23:58:05Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced all stub placeholders in shared-metaevidence.md with complete retrieval content (105 lines)
- LGTCR two-stream classification scoped to its own `### LGTCR specifics` subsection with resolution hierarchy
- PGTCR single-URI model clearly stated; Goldsky primary path documented; endpoint URLs deferred to Phase 3
- D-02 Scout pointer placed under LGTCR specifics as specified
- All scope guards enforced: no topic0 hash (0x61606860…), no seed-first inversion, no Goldsky URLs

## Task Commits

1. **Task 1: Write shared-metaevidence.md** - `9b5a10d` (docs)

**Plan metadata:** (committed with this SUMMARY)

## Files Created/Modified

- `kleros-curate/references/shared-metaevidence.md` - MetaEvidence retrieval reference: RPC log method, sort rule, JSON fetch, LGTCR two-stream, PGTCR single-URI

## Decisions Made

- topic0 hash kept exclusively in shared-abi-fragments.md; this file points there by name (D-07 enforced)
- LGTCR two-stream goes in its own subsection; PGTCR single-URI stated explicitly to prevent cross-contamination (D-01)
- WHY rationale on sort rule: governors update params → stale state risk; on two-stream: wrong stream = wrong policy (D-11)
- Goldsky endpoint URLs deferred to Phase 3 stake-curate.md (D-13)

## Deviations from Plan

None — plan executed exactly as written. Scope guards enforced, subsection structure followed, all must_haves satisfied.

## Issues Encountered

None.

## Known Stubs

None — all placeholder text ("Phase 2 content here") replaced with full content.

## Threat Flags

None — documentation-only plan, no runtime code or network endpoints introduced.

## Self-Check

- [x] `kleros-curate/references/shared-metaevidence.md` exists: 105 lines (target 90–120)
- [x] No "Phase 2 content here" placeholders: `grep` returns 0
- [x] No topic0 hash (0x61606860): `grep` returns 0
- [x] `shared-abi-fragments.md` pointer present: line 26
- [x] `### LGTCR specifics` subsection: line 66
- [x] `### PGTCR specifics` subsection: line 92
- [x] D-02 Scout pointer: line 88
- [x] PGTCR single-URI note: line 94
- [x] No "seed-first": `grep` returns 0
- [x] No Goldsky URLs: `grep` returns 0
- [x] Task commit 9b5a10d exists

## Self-Check: PASSED

## Next Phase Readiness

- shared-metaevidence.md complete — Plan 04 (shared-item-json.md) can now reference `metadata.columns[]` source
- PGTCR Goldsky endpoint URLs deferred to Phase 3 stake-curate.md (tracked)
- No blockers for remaining Phase 2 plans

---
*Phase: KS-02-shared-references*
*Completed: 2026-05-26*
