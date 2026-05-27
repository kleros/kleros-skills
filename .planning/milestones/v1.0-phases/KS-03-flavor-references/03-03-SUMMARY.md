---
phase: "03"
plan: "03"
subsystem: kleros-curate
tags: [scout, overlay, seed-templates, gnosis, light-curate]
dependency_graph:
  requires: [03-01]
  provides: [scout-registries.md]
  affects: [kleros-curate/SKILL.md]
tech_stack:
  added: []
  patterns: [overlay-document, seed-first-submission, section-level-pointers]
key_files:
  created: []
  modified:
    - kleros-curate/references/scout-registries.md
decisions:
  - "D-04: Scout kept organic overlay structure (addresses → seed templates → view helper → API → images → incentives)"
  - "D-06: All 4 seed templates (~170 lines JSON) inline — agents can seed item.json directly"
  - "D-07: Image section 21 lines of Scout-specific requirements only; upload mechanics delegated to shared-ipfs-upload.md"
  - "D-10: Incentives section zero specific amounts; evergreen framing + blog.kleros.io"
  - "D-13: Scout → Light Curate dependency banner at top of file"
metrics:
  duration: "~8 min"
  completed: "2026-05-27"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 3 Plan 3: Scout Registries Reference Summary

Scout overlay reference for 4 Gnosis registries — addresses, seed templates, view helper, scout-api, image guidance, incentives, and submission checklist.

## What Was Built

Filled `kleros-curate/references/scout-registries.md` (300 lines) from scratch. Stripped the Phase 1 stub entirely (HTML source markers, TOC placeholder, all `[Phase 3 content here]` placeholders). Produced a complete Scout context overlay following the organic structure (D-04).

### Key content delivered

- **Registry address table** — all 4 Gnosis addresses with explicit `chainId: 100` assertion in table header
- **Seed-first pattern** — explains inversion vs traditional MetaEvidence-first flow, including WHY (seed includes full `{columns, values}` shape) and the stop-and-ask rule when seed and MetaEvidence diverge
- **4 seed templates inline** (~170 lines JSON) — verbatim type strings preserved (`"long text"`, `"rich address"`, `"image"`, `"link"`, `"number"`, `"text"`) under per-registry headings
- **LightGeneralizedTCRView helper** — address `0xB32e38B08FcC7b7610490f764b0F9bFd754dCE53` with all 5 functions in a table (fetchArbitrable, getItem, getLatestRequestData, getLatestRoundRequestData, availableRewards)
- **scout-api integration** — labeled optional/supporting/NOT canonical; not a hard gate
- **Image guidance** — 21 lines covering Kleros Tokens logo (PNG, ≥128×128, square, <200KB) and CDN visual proof (screenshot with address context visible); upload mechanics delegated to shared-ipfs-upload.md
- **Incentives** — three evergreen profit paths (project visibility, submitter upside, challenger upside); zero specific amounts; blog.kleros.io redirect
- **Submission checklist** — 14-item pre-flight covering registry confirmation, seed template selection, placeholder replacement, JSON validation, type string preservation, MetaEvidence cross-check, policy compliance, image upload, live deposit computation, simulation, and duplicate check

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

All mitigations verified:

| Threat | Mitigation Applied |
|--------|--------------------|
| T-03-10: Stale incentive amounts | Zero specific figures; blog.kleros.io redirect confirmed via grep |
| T-03-12: scout-api blocks submissions | "optional", "supporting", "NOT canonical", "Not a hard gate" language present |
| T-03-13: PLACE_VALUE_HERE in final JSON | Seed-first section + checklist item 3 explicitly address replacement |
| T-03-14: CDN screenshot lacks address context | Image guidance specifies "address context visible in URL bar or page content" |
| T-03-19: Type strings normalized | Verbatim from draft source — `"long text"`, `"rich address"`, `"image"` preserved exactly |
| T-03-20: Wrong chainId | chainId 100 in table header + checklist item 1 |

## Known Stubs

The seed templates contain `PLACE_VALUE_HERE` and `PLACE_IPFS_IMAGE_URI_HERE` values — these are intentional instructional placeholders. Agents replace them with real data before submission. They are not stubs that prevent the plan's goal; they are the correct authoring pattern for seed templates.

## Self-Check: PASSED

- `kleros-curate/references/scout-registries.md` — FOUND (300 lines, within 180-340 range)
- Commit `b878c07` — FOUND in git log
- All 4 registry addresses present — VERIFIED
- Gnosis chainId 100 assertion — VERIFIED (3 occurrences)
- View helper address — VERIFIED
- All 5 view helper functions — VERIFIED
- All 4 seed template headings — VERIFIED
- Dependency banner — VERIFIED
- scout-api optional/supporting/NOT canonical — VERIFIED
- No incentive amounts (PNK/month, 300k) — VERIFIED (grep returns 0)
- blog.kleros.io redirect — VERIFIED
- scout-api endpoint hardcoded — VERIFIED
- Image section ≤25 lines — VERIFIED (21 lines)
- No HTML source markers — VERIFIED (grep returns 0)
- No structural placeholders — VERIFIED (grep returns 0)
- seed-first pattern present — VERIFIED
- Upload mechanics not duplicated (eth_getLogs) — VERIFIED
