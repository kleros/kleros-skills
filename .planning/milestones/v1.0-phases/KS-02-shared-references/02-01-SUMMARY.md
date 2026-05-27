---
phase: KS-02-shared-references
plan: "01"
subsystem: kleros-curate/references
tags: [abi, solidity, lgtcr, pgtcr, shared-reference]
dependency_graph:
  requires: []
  provides:
    - kleros-curate/references/shared-abi-fragments.md
  affects:
    - kleros-curate/references/shared-metaevidence.md
    - kleros-curate/references/shared-deposits.md
    - kleros-curate/references/scout-registries.md
tech_stack:
  added: []
  patterns:
    - Solidity-style ABI strings (ethers/viem compatible)
    - Single canonical location for topic0 hashes
key_files:
  created: []
  modified:
    - kleros-curate/references/shared-abi-fragments.md
decisions:
  - "D-04/D-06: Solidity-style only — no JSON ABI arrays anywhere in the file"
  - "D-01: Flavor-based subsection structure (LGTCR / PGTCR / LightGeneralizedTCRView / IArbitrator / Factory)"
  - "D-02: Scout pointer placed under ## LightGeneralizedTCRView"
  - "D-05: MetaEvidence topic0 canonical in this file only"
  - "Factory ABIs consolidated under ## Factory contracts, labeled (LGTCR only)/(PGTCR only)"
metrics:
  duration: "~5 min"
  completed: "2026-05-26"
  tasks_completed: 1
  files_modified: 1
---

# Phase 2 Plan 01: Shared ABI Fragments Summary

Filled `shared-abi-fragments.md` stub with all Curate contract signatures in Solidity-style format — single authoritative ABI reference for LGTCR, PGTCR, LightGeneralizedTCRView, IArbitrator, and both factory contracts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write shared-abi-fragments.md | 9e729d1 | kleros-curate/references/shared-abi-fragments.md |

## Decisions Made

- Solidity-style ABI exclusively (D-04, D-06): no JSON arrays; ethers/viem accept ABI strings natively
- Topic0 for MetaEvidence (`0x61606860eb6c...`) appears exactly once, as a comment on the event definition — downstream files reference this file rather than repeating the hash
- PGTCR-specific gotchas annotated inline: `_deposit` param in `addItem`, `challengeItem` vs `challengeRequest`, two-step withdrawal (`startWithdrawItem` then `withdrawItem`), `uint120 _challengeID` in `withdrawFeesAndRewards`
- Factory ABIs consolidated under `## Factory contracts` with explicit `(LGTCR only)` / `(PGTCR only)` labels
- D-02 Scout pointer placed verbatim under `## LightGeneralizedTCRView`

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- Line count: 183 (target 160–200) — PASS
- function|event matches: 78 (target ≥30) — PASS
- topic0 occurrences: 1 (target exactly 1) — PASS
- JSON array brackets `[` at line start: 0 (target 0) — PASS
- Heading structure matches canonical spec — PASS
- Scout pointer present under LightGeneralizedTCRView — PASS
- PGTCR addItem has `_deposit` param — PASS
- No placeholder text remaining — PASS

## Self-Check: PASSED

- File exists: kleros-curate/references/shared-abi-fragments.md — FOUND
- Commit 9e729d1 — FOUND
