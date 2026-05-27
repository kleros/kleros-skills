---
phase: 01-architecture
plan: "01"
subsystem: kleros-curate
tags: [skill, routing, curate, lgtcr, pgtcr, scout]
dependency_graph:
  requires: []
  provides:
    - kleros-curate/SKILL.md (skill entry point with routing decision tree and action index)
  affects:
    - kleros-curate/references/ (reference file stubs — created in plan 02)
    - .claude-plugin/plugin.json (skill registration — Phase 5)
tech_stack:
  added: []
  patterns:
    - YAML frontmatter skill convention (name + description, two fields only)
    - Hybrid routing decision tree (keyword-first → contract address lookup)
    - Scout-as-LGTCR-overlay pattern (dual-file load for Scout)
    - Structured list action index (no markdown tables per D-12)
key_files:
  created:
    - kleros-curate/SKILL.md
  modified: []
decisions:
  - D-04 honored: Scout routing explicitly loads BOTH scout-registries.md AND light-curate.md
  - D-05 honored: No function signatures in routing tree — deferred to reference files
  - D-10 honored: Non-negotiables section appears before routing tree
  - D-11/D-12 honored: Action index uses structured list format, no markdown tables
  - ARCH-04 honored: No content extracted from draft skill files into SKILL.md body
metrics:
  duration_minutes: 15
  completed: "2026-05-26"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 1 Plan 01: kleros-curate/SKILL.md Entry Point Summary

Created `kleros-curate/SKILL.md` — the always-in-context routing hub for the unified Kleros Curate skill, with hybrid keyword/address routing tree covering all 3 Curate flavors, 6 cross-flavor non-negotiables, structured action index, and working-draft YAML description.

## What Was Built

`kleros-curate/SKILL.md` (163 lines / 1346 words) — the skill entry point that Claude Code loads into agent context whenever a Curate-related task is detected. Contains:

- **YAML frontmatter**: `name: kleros-curate` + working-draft description covering Light Curate, PGTCR, Scout positive triggers and generic-IPFS negative trigger (under 1,536-char cap; final version deferred to Phase 4 per TRIG-01)
- **Curate in a nutshell** (~30 lines): deposit/challenge/arbitration cycle, onchain-first rationale, plain-English descriptions of all 3 contract flavors
- **Non-negotiables** (6 rules): cross-flavor safety rules that must always be in context — never guess amounts, onchain-first, never rewrite schema columns, no "typical ranges", `eth_getCode` before declaring contracts
- **Routing decision tree** (3-step): keyword scan → Scout/PGTCR/LGTCR; ambiguous interactive/one-shot paths; contract-type detection deferred to reference files
- **Action index** (11 entries): structured list format mapping user intents to reference files, with grep patterns for large files
- **Reference file descriptions** (8 entries): one-paragraph descriptions of each reference file explaining what it covers and when to load it

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create kleros-curate/SKILL.md skeleton | 8f43f29 | kleros-curate/SKILL.md |

## Deviations from Plan

None — plan executed exactly as written.

The plan specified a "skeleton" (~250 lines target) but with 163 lines the file is fully functional for its purpose. The lower count is because:
- Routing tree, action index, and non-negotiables are concise by design
- Reference file descriptions are one paragraph each (not section-level detail)
- No Phase 2/3 content embedded (per ARCH-04)

163 lines is well within the 150-500 line acceptance range and leaves ample headroom for Phase 4 description optimization without hitting the 500-line ceiling.

## Known Stubs

None — `kleros-curate/SKILL.md` is a complete routing entry point, not a stub. The 8 reference files (`kleros-curate/references/`) are stubs created in plan 02.

## Threat Flags

None — this plan creates only a markdown documentation file. No network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- [x] `kleros-curate/SKILL.md` exists: FOUND
- [x] Commit 8f43f29 exists: FOUND
- [x] Line count 163 (between 150-500): PASS
- [x] Word count 1346 (under 5000): PASS
- [x] Non-negotiables section: PASS (count=1)
- [x] Action index section: PASS (count=1)
- [x] Which Curate flavor section: PASS (count=2, section + one body reference)
- [x] Scout dual-file routing present: PASS (2 lines reference both files)
- [x] No markdown tables: PASS
- [x] No function signatures in routing tree: PASS (count=0)
- [x] YAML name=kleros-curate: PASS
- [x] Description mentions Scout, PGTCR, Light Curate, IPFS: PASS
