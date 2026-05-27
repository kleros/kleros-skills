---
phase: KS-02-shared-references
plan: "05"
subsystem: kleros-curate/references
tags: [ipfs, upload, durability, curate, shared-reference]
dependency_graph:
  requires: [02-03, 02-04]
  provides: [shared-ipfs-upload]
  affects: [kleros-curate/references/shared-ipfs-upload.md]
tech_stack:
  added: []
  patterns: [imperative-form, why-on-every-rule, no-flavor-subsections]
key_files:
  created: []
  modified:
    - kleros-curate/references/shared-ipfs-upload.md
decisions:
  - "No flavor subsections — upload procedure identical across LGTCR/PGTCR/Scout"
  - "Third-party pin vanishing rationale + CID anchoring obligation are new content (not in draft skills), derived from kleros-ipfs-upload/SKILL.md"
  - "Double-slash trap text matches CLAUDE.md exactly"
  - "wrap-with-directory=false WHY: directory CID breaks direct ipfs.io/ipfs/<CID> access"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-27"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 02 Plan 05: Shared IPFS Upload Guidance Summary

One-liner: Filled shared-ipfs-upload.md with durability rationale, three upload mechanisms, submission format rule, double-slash trap, image guidance, and agent autonomy note — no flavor subsections.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write shared-ipfs-upload.md | 7dff9ab | kleros-curate/references/shared-ipfs-upload.md |

## What Was Built

`kleros-curate/references/shared-ipfs-upload.md` — complete IPFS upload reference for all Curate flavors (79 lines). Contains:

1. **Durability rationale** — third-party pins can vanish; CID anchoring creates long-term retrieval obligation spanning dispute lifecycle
2. **Recommended path** — `kleros-ipfs-upload` skill framed as recommended not required (D-07 agent autonomy preserved)
3. **Manual Pinata** — 3-step UI procedure
4. **Programmatic Pinata** — JWT key creation + curl with correct v3 endpoint
5. **The Graph IPFS node** — endpoint with `wrap-with-directory=false` and WHY rationale
6. **Submission format rule** — `/ipfs/<CID>` in all onchain fields; never gateway URLs; WHY (gateway URLs are mutable, CID is permanent)
7. **Double-slash trap** — exact fix: `"https://cdn.kleros.link" + cid` not `+ "/ipfs/" + cid`; or use `urls[]` directly
8. **Image guidance** — PNG preferred, 128×128 minimum for token logos, CDN visual proof requirement
9. **Agent autonomy note** — explicit: any IPFS mechanism is valid; skill is recommended path

## Source Sections Verified

- LGTCR §5 (primary): curl patterns, Pinata procedure, The Graph node, submission rule
- PGTCR §6: confirmed identical content, no new material
- Scout §9: image guidance (PNG, 128×128, CDN visual proof)
- kleros-ipfs-upload/SKILL.md: durability rationale, gateway lifecycle, pin incentives

## Deviations from Plan

None — plan executed exactly as written.

Line count (79) exceeds the 55–70 soft target. All required content sections are present. The additional lines come from code blocks and blank lines; no content was padded. The plan's `min_lines: 55` artifact gate is satisfied.

## Known Stubs

None — file is fully wired with substantive content; no placeholders remain.

## Threat Flags

None — documentation-only plan, no runtime code, no new network surface.

## Self-Check

- [x] `kleros-curate/references/shared-ipfs-upload.md` exists (79 lines)
- [x] Commit `7dff9ab` present
- [x] No "Phase 2 content here" placeholder
- [x] Durability rationale + CID anchoring lifecycle present
- [x] `kleros-ipfs-upload` skill referenced as recommended path
- [x] Manual Pinata procedure present
- [x] Programmatic Pinata (JWT + curl) present
- [x] The Graph IPFS node with `wrap-with-directory=false` + WHY present
- [x] Submission format rule (`/ipfs/<CID>`) + WHY present
- [x] Double-slash trap with exact fix present
- [x] Image guidance (PNG, 128×128, CDN visual proof) present
- [x] Agent autonomy note present
- [x] No `### LGTCR` / `### PGTCR` flavor subsections
- [x] No `scout-api` references
- [x] `third-party` pins phrase present

## Self-Check: PASSED
