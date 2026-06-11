---
phase: 260611-vy1
plan: "01"
subsystem: ci
status: complete
tags: [sync-master, allowlist, sanity-check, REV-16]
dependency_graph:
  requires: []
  provides: [allowlist-based sanity check in sync-master.yml]
  affects: [.github/workflows/sync-master.yml]
tech_stack:
  added: []
  patterns: [comm -23 allowlist comparison, heredoc sort]
key_files:
  modified: [.github/workflows/sync-master.yml]
decisions:
  - "Replace predicate-symmetric ABSENT loops with positive root allowlist (REV-16 principle fix)"
  - "Keep-list PRESENT loop preserved as orthogonal over-strip guard"
  - "Pre-existing REV-09 comment lines cause strip-list/keep-list grep counts to be 1/2 instead of 0/1 — acceptable as comment text, not ABSENT loop logic"
metrics:
  duration: ~10min (incl worktree-contamination recovery)
  completed: "2026-06-11"
  commit: "b7f74d9"
  original_commit: "57432b7 (in contaminated worktree, cherry-picked clean)"
---

# Phase 260611-vy1 Plan 01: REV-16 Root Allowlist for Sanity Check Summary

Root allowlist (comm -23 against sorted ls -A1) replaces predicate-symmetric ABSENT loops in sync-master.yml sanity step, making the verifier orthogonal to the strip predicates.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace ABSENT loops with allowlist in Sanity check stripped tree | 57432b7 | .github/workflows/sync-master.yml |

## What Was Built

Replaced the two ABSENT assertion blocks in the "Sanity check stripped tree" step:

1. Removed: for-path-in-strip-list ABSENT loop
2. Removed: compgen-G FEEDBACK/HANDOVER ABSENT check

Added: EXPECTED_ROOT heredoc (23 entries: 8 dirs + 15 files) compared against ls -A1 | sort via comm -23. Any unexpected root entry triggers a FATAL with remediation guidance.

Kept: keep-list PRESENT loop (catches over-strip — orthogonal failure mode).

## Verification Results

- npm test: 15 tests, 0 failures — PASS
- EXPECTED_ROOT in workflow: 4 occurrences (comment + variable + comm usage + echo) — satisfies 1+ requirement
- comm -23: 1 occurrence — PASS
- compgen -G: 0 occurrences — PASS
- strip-list path: 1 occurrence — pre-existing REV-09 comment line 163 only, ABSENT loop echo removed
- keep-list path: 2 occurrences — pre-existing REV-09 comment + PRESENT loop FATAL echo; 0 ABSENT loops

## Deviations from Plan

**Worktree contamination — recovered by cherry-pick.**

The executor's worktree was created from origin/master (post-strip state) instead of dev's HEAD — Claude Code #2015 bug. The worktree branch's ancestry contained the `kleros-skills-sync[bot]` strip commit `6c7bc9f` (from the master sync run that jaybuidl triggered earlier today, 14:58Z) before the executor's REV-16 commit `57432b7`. Merging that branch as-is would have deleted ~14,000 lines of `.planning/` content from dev.

Recovery: orchestrator cherry-picked `57432b7` onto clean dev → final commit `b7f74d9` (same diff, +44/-11 to `.github/workflows/sync-master.yml` only). Contaminated worktree + branch deleted.

The REV-16 edit itself was correct in isolation — the executor was self-aware enough to run `npm test` against the main tree (not the stripped worktree) and called this out in the original summary.

**Pre-existing grep counts:** plan verification expected grep-c strip-list-path = 0 and grep-c keep-list-path = 1, but the pre-existing REV-09 comment block uses both phrases. These comments were present before the edit and explicitly preserved per plan. ABSENT loop logic is definitively removed.

## Self-Check: PASSED

- .github/workflows/sync-master.yml modified and committed as `b7f74d9` on dev
- npm test passes (15/15) — re-verified after cherry-pick on clean dev tree
- No unintended deletions in commit (verified: only sync-master.yml touched)
- Contaminated worktree + branch fully cleaned up
