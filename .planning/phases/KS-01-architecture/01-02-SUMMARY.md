---
phase: KS-01-architecture
plan: "02"
subsystem: docs
tags: [kleros-curate, skill-design, reference-stubs, progressive-disclosure]

requires: []
provides:
  - "kleros-curate/references/ directory with 3 flavor stub files (ARCH-02)"
  - "light-curate.md: LGTCR flavor stub with section scaffold and source markers"
  - "stake-curate.md: PGTCR flavor stub with hallmark identification note"
  - "scout-registries.md: Scout overlay stub with explicit light-curate.md load instruction"
affects:
  - KS-01-architecture/01-03
  - KS-02 (Phase 2 fills LGTCR/shared sections)
  - KS-03 (Phase 3 fills Scout-specific content)

tech-stack:
  added: []
  patterns:
    - "Reference stub format: H1 + top-level source comment + Contents TOC placeholder + section headings each with <!-- Source: path §section --> comment + one-liner description"
    - "Scout overlay pattern: overlay note in header instructs loading light-curate.md for all contract operations"

key-files:
  created:
    - kleros-curate/references/light-curate.md
    - kleros-curate/references/stake-curate.md
    - kleros-curate/references/scout-registries.md
  modified: []

key-decisions:
  - "Stub format: heading + <!-- Source --> comment + one-liner per section; no Phase 2/3 content extracted (ARCH-04 boundary)"
  - "Scout overlay note positioned after H1 and top-level source comment as a blockquote for visibility"
  - "PGTCR hallmarks (token() + submissionMinDeposit()) noted inline in registry discovery section one-liner"

patterns-established:
  - "Source marker format: <!-- Source: path/to/file.md §section --> on the line immediately after each section heading"
  - "Scout dual-file pattern: scout-registries.md header blockquote instructs loading light-curate.md — not in SKILL.md alone"

requirements-completed: [ARCH-02, ARCH-04]

duration: 8min
completed: 2026-05-26
---

# Phase 01 Plan 02: Architecture - Flavor Reference Stubs Summary

**Three LGTCR/PGTCR/Scout flavor reference stubs scaffolded in kleros-curate/references/ with section headings, one-liner descriptions, and HTML source markers tracing content origin to draft skill files**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-26T00:00:00Z
- **Completed:** 2026-05-26T00:08:00Z
- **Tasks:** 1
- **Files modified:** 3 (all created)

## Accomplishments

- Created `kleros-curate/references/` directory with all 3 flavor stub files
- Each stub: section headings + one-liner descriptions + `<!-- Source: ... -->` markers (D-13, D-14 compliant)
- Scout stub contains overlay blockquote explicitly instructing agents to also load `light-curate.md` (D-04)
- PGTCR hallmarks (`token()` + `submissionMinDeposit()`) noted inline in stake-curate.md registry discovery section

## Task Commits

Each task was committed atomically:

1. **Task 1: Create flavor reference stubs** - `9d1199f` (feat)

## Files Created/Modified

- `kleros-curate/references/light-curate.md` - LGTCR flavor stub, 45 lines, 11 Source: markers
- `kleros-curate/references/stake-curate.md` - PGTCR flavor stub, 45 lines, 11 Source: markers, PGTCR hallmarks
- `kleros-curate/references/scout-registries.md` - Scout flavor stub, 41 lines, 9 Source: markers, overlay note

## Decisions Made

- Scout overlay note written as a Markdown blockquote (> ...) immediately after H1 and top-level source comment for visual prominence in rendered markdown and easy grep-ability
- Deposit computation section in light-curate.md one-liner explicitly calls out `submissionBaseDeposit() + arbitrationCost()` to pre-distinguish from PGTCR ERC20 stake model
- PGTCR MetaEvidence one-liner names Goldsky as primary path per source material, matching plan spec

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

The following `[Phase N content here]` placeholders in the created files are intentional Phase 1 scaffolds per ARCH-04 (no content extraction in Phase 1):

- `kleros-curate/references/light-curate.md` — 5 sections marked `[Phase 2 content here]`
- `kleros-curate/references/stake-curate.md` — 5 sections marked `[Phase 3 content here]`
- `kleros-curate/references/scout-registries.md` — 5 sections marked `[Phase 3 content here]`

These are resolved in Phase 2 (LGTCR/shared) and Phase 3 (Scout-specific).

## Issues Encountered

None.

## Next Phase Readiness

- Plan 01-03 (shared reference stubs) can proceed in parallel — this plan's output is independent
- Phase 2 has a complete scaffold for light-curate.md and shared files
- Phase 3 has a complete scaffold for scout-registries.md and stake-curate.md
- All source markers in place — Phase 2/3 executors can trace content origins without re-reading draft skills

---
*Phase: KS-01-architecture*
*Completed: 2026-05-26*
