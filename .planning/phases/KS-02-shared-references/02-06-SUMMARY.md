---
phase: KS-02-shared-references
plan: "06"
subsystem: kleros-curate
tags: [skill, common-workflows, documentation, routing]
dependency_graph:
  requires:
    - 02-02  # shared-metaevidence.md
    - 02-03  # shared-item-json.md
    - 02-04  # shared-deposits.md
    - 02-05  # shared-ipfs-upload.md
  provides:
    - "SKILL.md entry point with Common workflows loading sequences"
  affects:
    - "kleros-curate/SKILL.md"
tech_stack:
  added: []
  patterns:
    - "progressive disclosure — workflows section as top-level orchestration guide"
key_files:
  created: []
  modified:
    - "kleros-curate/SKILL.md"
decisions:
  - "D-09 implemented: Common workflows section inserted between Action index and Reference files"
  - "WRIT-01: imperative step descriptions (fetch, build, upload, compute, send)"
  - "ARCH-04: no formulas, ABIs, or procedure steps duplicated from shared files"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-27"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 2 Plan 06: Common Workflows Section Summary

Added "Common workflows" section to `kleros-curate/SKILL.md` — three multi-step loading sequences (Submit item 5 steps, Challenge/remove 4 steps, Deploy registry 3 steps) placed between Action index and Reference files, implementing D-09.

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add Common workflows section to SKILL.md | 353ea7d | kleros-curate/SKILL.md (+20 lines) |

## What Was Done

Inserted `## Common workflows` section at line 109 of `kleros-curate/SKILL.md`:

- **Submit an item (any flavor):** 5 steps — shared-metaevidence.md → shared-item-json.md → shared-ipfs-upload.md → shared-deposits.md → flavor reference
- **Challenge or remove an item:** 4 steps — shared-metaevidence.md → shared-ipfs-upload.md → shared-deposits.md → flavor reference
- **Deploy a new registry:** 3 steps — shared-metaevidence.md → shared-ipfs-upload.md → flavor reference

Final line count: 183 lines (was 163, net +20 lines). Well within ARCH-01 limit (500 lines / 5k words).

## Verification

- Section present: `grep -n "Common workflows" kleros-curate/SKILL.md` → line 109
- Section order: Non-negotiables (43) → Flavor routing (54) → Action index (83) → Common workflows (109) → Reference files (129)
- Three workflows confirmed: Submit (5 steps), Challenge/remove (4 steps), Deploy (3 steps)
- Line count: 183 < 500 (ARCH-01 pass)
- No duplicated content: no formulas (`submissionBaseDeposit`), no ABI fragments, no deposit math in new section (ARCH-04 pass)
- Non-negotiables section unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. Documentation-only change; no runtime code, no external services, no new network endpoints.

## Self-Check: PASSED

- [x] `kleros-curate/SKILL.md` exists and contains "Common workflows" section
- [x] Commit 353ea7d exists in git log
- [x] Three workflows present with correct step counts
- [x] Line count 183 < 500 (ARCH-01)
- [x] No content from shared files duplicated (ARCH-04)
