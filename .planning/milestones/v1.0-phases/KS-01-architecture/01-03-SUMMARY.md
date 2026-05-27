---
phase: 01-architecture
plan: "03"
subsystem: kleros-curate/references
tags: [scaffold, shared-references, ipfs, metaevidence, deposits, abi, item-json]
dependency_graph:
  requires: []
  provides:
    - kleros-curate/references/shared-metaevidence.md
    - kleros-curate/references/shared-deposits.md
    - kleros-curate/references/shared-item-json.md
    - kleros-curate/references/shared-abi-fragments.md
    - kleros-curate/references/shared-ipfs-upload.md
  affects:
    - Phase 2/3 content extraction — all 5 stubs provide scaffolds for extracted content
tech_stack:
  added: []
  patterns:
    - HTML comment source markers (<!-- Source: ... -->) for grep-able provenance
    - Heading-per-section stub pattern with one-liner + Phase 2 placeholder
key_files:
  created:
    - kleros-curate/references/shared-metaevidence.md
    - kleros-curate/references/shared-deposits.md
    - kleros-curate/references/shared-item-json.md
    - kleros-curate/references/shared-abi-fragments.md
    - kleros-curate/references/shared-ipfs-upload.md
  modified: []
decisions:
  - "shared-ipfs-upload.md partially pre-filled in Phase 1: durability rationale and double-slash trap are known facts from D-07, not Phase 2 extractions"
  - "kleros-curate/references/ directory created by Plan 03 (Plan 02 parallel worktree had not yet merged)"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-26"
  tasks_completed: 1
  tasks_total: 1
  files_created: 5
  files_modified: 0
---

# Phase 1 Plan 03: Shared Reference Stubs Summary

Five shared reference stubs scaffolded in `kleros-curate/references/` as Phase 1 deliverable for ARCH-02 — headings + one-liners + HTML source markers only, no extracted draft content.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create shared reference stubs (5 files) | f998339 | shared-metaevidence.md, shared-deposits.md, shared-item-json.md, shared-abi-fragments.md, shared-ipfs-upload.md |

## Verification Results

```
shared-abi-fragments.md:  34 lines, 7 source markers
shared-deposits.md:       29 lines, 6 source markers
shared-ipfs-upload.md:    24 lines, 5 source markers
shared-item-json.md:      24 lines, 5 source markers
shared-metaevidence.md:   34 lines, 7 source markers
```

All stubs: 15-50 line range satisfied. All source marker minimums met. Double-slash trap documented in shared-ipfs-upload.md. kleros-ipfs-upload skill referenced as recommended path.

## Deviations from Plan

**1. [Rule 3 - Blocking] Created kleros-curate/references/ directory**
- Found during: Task 1
- Issue: Plan 02 runs in a parallel worktree; directory did not exist at execution time
- Fix: `mkdir -p kleros-curate/references/` before creating stub files
- Files modified: none (directory creation only)
- Impact: none — plan explicitly states "if not, create it"

No other deviations. Plan executed as specified.

## Known Stubs

All 5 files are intentional stubs. Section bodies contain `[Phase 2 content here — ...]` placeholders. Two exceptions per plan spec:
- `shared-ipfs-upload.md §Durability rationale` — pre-filled one-liner (known fact from D-07)
- `shared-ipfs-upload.md §/ipfs/<CID> format rule` — pre-filled one-liner (double-slash trap from SKILL.md lines 183-191)

These are Phase 1 deliverables by design. Phase 2/3 plans will extract and fill remaining sections.

## Threat Flags

None. Plan 03 creates only markdown documentation files — no code execution, no network calls, no secrets, no trust boundaries introduced.

## Self-Check: PASSED

Files exist:
- FOUND: kleros-curate/references/shared-metaevidence.md
- FOUND: kleros-curate/references/shared-deposits.md
- FOUND: kleros-curate/references/shared-item-json.md
- FOUND: kleros-curate/references/shared-abi-fragments.md
- FOUND: kleros-curate/references/shared-ipfs-upload.md

Commit exists:
- FOUND: f998339
