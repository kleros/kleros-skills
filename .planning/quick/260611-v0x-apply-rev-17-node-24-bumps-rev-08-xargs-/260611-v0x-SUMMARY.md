---
phase: quick-260611-v0x
plan: 01
status: complete
subsystem: ci/docs
tags: [rev-17, rev-08, rev-10, rev-13, github-actions, node-24, security]
commits:
  - hash: 73d575b
    message: "chore(sync): REV-17 bump actions to Node 24 + SHA-pin; REV-08 null xargs; REV-10 drop dead check"
    files: [.github/workflows/sync-master.yml]
  - hash: fcb0135
    message: "docs(claude-md): REV-13 note that release tags reference dev commits, not master"
    files: [CLAUDE.md]
dependency_graph:
  requires: []
  provides: [hardened-sync-workflow, rev-13-doc-bullet]
  affects: [.github/workflows/sync-master.yml, CLAUDE.md]
tech_stack:
  added: []
  patterns: [sha-pinned-actions, null-delimited-xargs]
key_files:
  modified:
    - .github/workflows/sync-master.yml
    - CLAUDE.md
decisions:
  - "node-version bump 20→24 added to scope (Node 20 EOL 2026-04-30, Node 24 LTS since Oct 2025); keeps step name + action runtime + installed version consistent"
  - "app-id input not renamed despite v3.1.0 deprecation — orchestrator pre-confirmed it still works at v3.2.0"
metrics:
  duration: ~5m
  completed: 2026-06-11
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-260611-v0x Plan 01: REV-17/REV-08/REV-10/REV-13 Hardening Summary

**One-liner:** SHA-pinned three GitHub Actions to Node-24-compatible versions, hardened FEEDBACK strip with null-delimited xargs, removed unreachable idempotency block, documented release-tag/master-commit mismatch in CLAUDE.md.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Apply REV-17 + REV-08 + REV-10 to sync-master.yml | `73d575b` | `.github/workflows/sync-master.yml` |
| 2 | Apply REV-13 doc bullet to CLAUDE.md | `fcb0135` | `CLAUDE.md` |

## Changes Applied

### Task 1: sync-master.yml

**REV-17 — action pins (Node-24-compatible, SHA-pinned):**
- `actions/create-github-app-token`: `fee1f7d` (v2.2.2) → `bcd2ba49` (v3.2.0)
- `actions/checkout`: `@v4` → `93cb6efe` (v6.0.3)
- `actions/setup-node`: `@v4` → `a0853c24` (v6.4.0); step renamed "Set up Node 24"
- `node-version`: `"20"` → `"24"` (added to plan scope — Node 20 past EOL, keeps workflow internally consistent)

**REV-08 — null-delimited FEEDBACK/HANDOVER strip:**
- Before: `git ls-files | grep -E ... | xargs --no-run-if-empty git rm --quiet`
- After: `git ls-files -z | grep -zE ... | xargs -0 --no-run-if-empty git rm --quiet`
- Prevents false splits on filenames with spaces/special chars; GNU grep -z supported on ubuntu-latest

**REV-10 — dead idempotency block removed:**
- Removed 7-line block (`# If nothing changed after strip` comment + STAGED/UNSTAGED vars + if/echo/exit/fi)
- Block was unreachable: `git rm` always stages deletions; the `git commit` following it already handles the "nothing to commit" case gracefully via exit code

### Task 2: CLAUDE.md

**REV-13 — new bullet in Branch model Rules list:**
- Inserted after "`master` is NOT a git ancestor of `dev`" bullet
- Content: `Release tags reference dev commits, not master — \`git tag --contains HEAD\` on a master checkout finds nothing.`

## Deviations from Plan

### Auto-extended scope

**1. [Rule 2 - Consistency] node-version: "20" → "24" added**
- Found during: Task 1 planning
- Issue: plan notes explicitly called for this as an amendment; step name rename to "Set up Node 24" would be inconsistent with `node-version: "20"` remaining
- Fix: bumped node-version alongside action runtime and step name
- Files modified: `.github/workflows/sync-master.yml` (line 103)
- Commit: `73d575b`

None beyond the above scope addition — plan executed as written.

## Verification Results

| Check | Result |
|-------|--------|
| `create-github-app-token@bcd2ba49` present | line 46 |
| `checkout@93cb6efe` present | line 55 |
| `setup-node@a0853c24` present | line 101 |
| `node-version: "24"` present | line 103 |
| `git ls-files -z` count = 1 | 1 |
| `No changes after strip` count = 0 | 0 |
| `Release tags reference dev` in CLAUDE.md | present |
| `npm test` | 15/15 pass |

## Phase 2 Master Ruleset — handed off to user

Orchestrator prepared the `gh api` POST body for the master branch ruleset (locks master to App-only pushes, bypass list: kleros-skills-sync App / OrganizationAdmin / RepositoryRole 5). User opted to apply the admin action manually outside this session (noted: `enforcement=evaluate` is Enterprise-only and would not work for org `kleros`).

**Ready-to-run command** captured in the orchestration trace. Rules: creation / update / deletion / non_fast_forward. Bypass actors target the same pattern as the existing `release tags` ruleset (id 17422938) plus the App.

**Verification after manual application:** `gh api repos/kleros/kleros-skills/rulesets --jq '.[] | {id, name, target, enforcement}'` should show two active rulesets (`release tags` + `lock master to sync App`).

## Self-Check: PASSED

- `73d575b` exists in git log
- `fcb0135` exists in git log
- `.github/workflows/sync-master.yml` modified (8 insertions, 14 deletions)
- `CLAUDE.md` modified (1 insertion)
- No file deletions in either commit
