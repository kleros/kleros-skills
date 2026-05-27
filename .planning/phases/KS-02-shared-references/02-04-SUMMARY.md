---
phase: KS-02-shared-references
plan: "04"
subsystem: kleros-curate/references
tags: [shared-reference, item-json, schema, curate, lgtcr, pgtcr]
dependency_graph:
  requires:
    - KS-02-01  # shared-abi-fragments.md (ABI context)
    - KS-02-02  # shared-metaevidence.md (columns come from MetaEvidence)
  provides:
    - kleros-curate/references/shared-item-json.md
  affects:
    - curate-v1/SKILL.md (Phase 3 — will reference this file)
    - curate-v1-scout/SKILL.md (Phase 3 — will reference this file)
tech_stack:
  added: []
  patterns:
    - Imperative rules with WHY rationale (D-10/D-11)
    - Single-source extraction from LGTCR §3 with confirmation from PGTCR §5C and Scout §8
key_files:
  created: []
  modified:
    - kleros-curate/references/shared-item-json.md
decisions:
  - "Seed-first drafting (Scout §8) excluded — inverts MetaEvidence-as-primary rule; deferred to Phase 3 scout-registries.md"
  - "Number type documented in field table with NewItem sampling note — encoding not derivable from schema alone"
  - "Removed one --- separator to land within 110–140 line target (139 lines)"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-27"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 2 Plan 04: shared-item-json.md Summary

Item.json construction rules extracted from LGTCR §3 (128 lines primary source) into a 139-line canonical reference covering output shape, deep-copy rule, output protocol, field-value types (including CAIP-10 and /ipfs/ path), placeholder rule, NewItem schema confirmation, programmatic checklist (5 items), and common failure modes (5 items).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write shared-item-json.md | abd0565 | kleros-curate/references/shared-item-json.md |

## Verification Results

1. No stub placeholders: `grep -c "Phase 2 content here"` returns 0
2. Line count: 139 (within 110–140 target)
3. Canonical `{ columns, values }` output shape documented with WHY
4. columns deep-copy rule present with WHY
5. Output protocol (print verbatim before building values) present with WHY
6. CAIP-10 format documented for richAddress, with WHY
7. Image type rule documented (/ipfs/<CID> path, not gateway URL), with WHY
8. PLACE_VALUE_HERE and PLACE_IPFS_URI_HERE placeholders documented
9. Schema confirmation via NewItem event sampling present with WHY
10. Programmatic checklist: 5 items present
11. Common failure modes: 5 items present
12. Pointer to shared-metaevidence.md present (line 5)
13. "seed-first" does NOT appear in the file

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All content sections are fully populated.

## Threat Flags

None. Documentation-only plan; no runtime code, no network endpoints, no schema changes.

## Self-Check: PASSED

- File exists: kleros-curate/references/shared-item-json.md (139 lines)
- Commit exists: abd0565
- No unexpected file deletions
