---
phase: KS-02-shared-references
verified: 2026-05-27T00:00:00Z
status: passed
score: 6/6 plans verified; 38/38 must-have truths verified
overrides_applied: 0
re_verification: false
---

# Phase 2: Shared References — Verification Report

**Phase Goal:** Extract shared reference files from draft skills — ABI fragments, MetaEvidence retrieval, deposit computation, item.json construction, IPFS upload guidance — and add a Common workflows section to SKILL.md
**Verified:** 2026-05-27
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Step 0: Previous Verification

No previous VERIFICATION.md found. Initial mode.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | shared-abi-fragments.md contains all LightGeneralizedTCR function signatures in Solidity-style | VERIFIED | 78 function\|event matches; all LGTCR read/write/events present |
| 2 | shared-abi-fragments.md contains all PermanentGTCR function signatures in Solidity-style | VERIFIED | PermanentGTCR read/write sections present; addItem(_item, _deposit) PGTCR form confirmed |
| 3 | shared-abi-fragments.md contains IArbitrator interface (arbitrationCost, appealCost, appealPeriod, currentRuling) | VERIFIED | All 4 functions present at lines 154–157 |
| 4 | shared-abi-fragments.md contains full event signatures (MetaEvidence, NewItem, NewGTCR) in Solidity-style | VERIFIED | MetaEvidence, NewItem, ItemStatusChange, RequestSubmitted, Evidence, Dispute, Ruling, AppealContribution, HasPaidAppealFee all present |
| 5 | MetaEvidence topic0 hash 0x61606860 appears exactly once, as comment on MetaEvidence event | VERIFIED | grep -c returns 1; located at line 52 |
| 6 | No JSON ABI arrays anywhere in shared-abi-fragments.md | VERIFIED | grep -c "^\[" returns 0 |
| 7 | Factory ABIs present under ## Factory contracts, labeled (LGTCR only)/(PGTCR only) | VERIFIED | Lines 164–183: LightGTCRFactory (LGTCR only), PermanentGTCRFactory (PGTCR only) |
| 8 | D-01 flavor subsection structure: ## LightGeneralizedTCR, ## PermanentGTCR, ## LightGeneralizedTCRView, ## IArbitrator, ## Factory contracts | VERIFIED | All 5 top-level headings present at correct lines |
| 9 | D-02 Scout pointer appears under ## LightGeneralizedTCRView | VERIFIED | Line 131: exact pointer text present |
| 10 | All instructions in imperative form; WHY rationale present | VERIFIED | Opening: "Use these signatures with ethers.js or viem"; WHY on Solidity-style choice at lines 6–7 |
| 11 | shared-metaevidence.md explains what MetaEvidence contains: fileURI→policy, metadata.columns[]→schema, with WHY | VERIFIED | Lines 3–10: both fields explained; imperative "Do not ask users..." |
| 12 | RPC log method (eth_getLogs) present with topic0 pointer to shared-abi-fragments.md — not the raw hash | VERIFIED | Line 26: "see `shared-abi-fragments.md`"; no 0x61606860 hash in this file (count=0) |
| 13 | Sort-and-take-latest rule with WHY: latest supersedes prior | VERIFIED | Lines 37–45: rule + "Why: Governors can update..." |
| 14 | ### LGTCR specifics subsection covers two-stream classification | VERIFIED | Line 66: ### LGTCR specifics; two-stream MetaEvidenceID 0/1 mapping |
| 15 | ### PGTCR specifics covers Goldsky GraphQL primary path + onchain fallback | VERIFIED | Line 92: ### PGTCR specifics; Goldsky primary + eth_getLogs fallback documented |
| 16 | D-02 Scout pointer under LGTCR specifics | VERIFIED | Line 88: exact pointer text to scout-registries.md |
| 17 | MetaEvidence JSON fetching: /ipfs/<CID>/metaEvidence.json format, gateway URLs | VERIFIED | Lines 50–62: gateway patterns, path format note |
| 18 | Seed-first Scout inversion NOT in shared-metaevidence.md | VERIFIED | grep "seed.first" returns 0 |
| 19 | Specific Goldsky endpoint URLs NOT in shared-metaevidence.md | VERIFIED | grep "goldsky.com" returns 0 |
| 20 | shared-deposits.md Hard rules section with WHY: never quote typical deposits, UI trap | VERIFIED | Lines 4–17: both hard rules with explicit WHY rationale inline |
| 21 | Arbitration cost read procedure inline with pointer to shared-abi-fragments.md | VERIFIED | Lines 20–28: 3-step IArbitrator chain + pointer "(Full IArbitrator signature: shared-abi-fragments.md)" |
| 22 | LGTCR specifics has all 4 deposit formulas | VERIFIED | Lines 38–41: submissionBaseDeposit, removalBaseDeposit, submissionChallengeBaseDeposit, removalChallengeBaseDeposit |
| 23 | PGTCR specifics explains two-asset model with WHY | VERIFIED | Lines 51–53: "Why: the ERC20 permanent stake is collateral..." |
| 24 | PGTCR challenge stake formula present | VERIFIED | Line 79: challengeStake = item.stake × challengeStakeMultiplier / MULTIPLIER_DIVISOR |
| 25 | Appeal funding formula in shared section: requiredForSide = ... | VERIFIED | Lines 97–109: formula + multiplier selection table + loser half-time rule |
| 26 | D-02 Scout pointer under LGTCR specifics in deposits | VERIFIED | Line 45: exact pointer text |
| 27 | fundAppeal step-by-step algorithm (getItemInfo chain) NOT in deposits | VERIFIED | File references it only in deferral notice at line 111–112; no algorithm extracted |
| 28 | PGTCR addItem signature difference noted; no shared tx playbook | VERIFIED | Lines 71–72: difference noted; "There is no shared transaction playbook" |
| 29 | shared-item-json.md: canonical { columns, values } output shape with WHY | VERIFIED | Lines 11–21: shape + "WHY: Curate UI and subgraph indexers parse this exact envelope" |
| 30 | columns deep-copy rule with WHY | VERIFIED | Lines 25–32: rule + WHY rationale |
| 31 | Output protocol (print columns verbatim before building values) with WHY | VERIFIED | Lines 36–51: protocol + WHY on LLM paraphrasing |
| 32 | CAIP-10 rule for richAddress fields with WHY | VERIFIED | Lines 74, 78–80: eip155:<chainId>:0xAddress + WHY |
| 33 | Image field rule (/ipfs/<CID> path, not gateway URL) with WHY | VERIFIED | Lines 75, 82–83: rule + WHY |
| 34 | PLACE_VALUE_HERE placeholder rule documented | VERIFIED | Lines 89–94: both placeholder forms + "Never submit with placeholders" |
| 35 | Schema confirmation via NewItem event sampling with WHY | VERIFIED | Lines 98–114: 6-step procedure + WHY on type encoding |
| 36 | Programmatic checklist 5 items present | VERIFIED | Lines 122–126: all 5 items |
| 37 | Common failure modes list present | VERIFIED | Lines 130–139: 5 failure modes (Renaming, Reordering, Rewriting, isIdentifier, UI-based) |
| 38 | Seed-first Scout inversion NOT in shared-item-json.md | VERIFIED | grep "seed.first" returns 0 |
| 39 | shared-ipfs-upload.md durability rationale with CID anchoring lifecycle | VERIFIED | Lines 5–9: "Third-party pins can vanish...dispute lifecycle" |
| 40 | kleros-ipfs-upload skill recommended path, framed as recommended not required | VERIFIED | Lines 11–15 and 79: both "recommended" and "not required" explicit |
| 41 | Manual Pinata upload procedure present | VERIFIED | Lines 17–21: 3-step procedure |
| 42 | Programmatic Pinata API procedure present | VERIFIED | Lines 23–32: JWT key creation + curl |
| 43 | The Graph IPFS node with wrap-with-directory=false and WHY | VERIFIED | Lines 34–46: endpoint + WHY on directory CID |
| 44 | Submission rule /ipfs/<CID> in onchain calls, never gateway URLs, with WHY | VERIFIED | Lines 48–58: rule + WHY on gateway mutability |
| 45 | Double-slash trap documented with exact fix | VERIFIED | Lines 60–69: "cdn.kleros.link" + cid vs cdn.kleros.link/ipfs/" + cid |
| 46 | Image guidance present (PNG preferred, 128×128, CDN visual proof) | VERIFIED | Lines 71–75: all three requirements |
| 47 | Agent autonomy note present | VERIFIED | Lines 77–79: "Agents may use any IPFS mechanism" |
| 48 | No flavor subsections in shared-ipfs-upload.md | VERIFIED | grep "^### LGTCR\|^### PGTCR" returns 0 |
| 49 | SKILL.md contains Common workflows section after Action index | VERIFIED | Line 109: ## Common workflows; order: Action index (83) → Common workflows (109) → Reference files (129) |
| 50 | Submit item workflow: 5 steps in order (shared-metaevidence → shared-item-json → shared-ipfs-upload → shared-deposits → flavor reference) | VERIFIED | Lines 111–116: exactly 5 steps in correct order |
| 51 | Challenge/remove workflow: 4 steps in order | VERIFIED | Lines 118–122: exactly 4 steps |
| 52 | Deploy registry workflow: 3 steps | VERIFIED | Lines 124–127: exactly 3 steps |
| 53 | Each step includes what the agent does (not just filename) | VERIFIED | Each step has "— fetch schema", "— build the item.json payload", etc. |
| 54 | SKILL.md line count under 500 (ARCH-01) | VERIFIED | 183 lines |
| 55 | No shared file content duplicated into SKILL.md (ARCH-04) | VERIFIED | grep for submissionBaseDeposit, eth_getLogs, requiredForSide returns 0 in Common workflows section; only eth_getLogs mention is in Reference files description (not duplicating content) |

**Score:** 55/55 truths verified

---

### Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|-------------|--------|---------|
| `kleros-curate/references/shared-abi-fragments.md` | 160 | 183 | VERIFIED | Solidity-style only; 78 function/event matches; topic0 once; canonical heading structure |
| `kleros-curate/references/shared-metaevidence.md` | 90 | 105 | VERIFIED | No topic0 hash; topic0 pointer to shared-abi-fragments; LGTCR/PGTCR subsections; Scout pointer |
| `kleros-curate/references/shared-deposits.md` | 80 | 112 | VERIFIED | 4 LGTCR formulas; PGTCR two-asset model; appeal formula; Scout pointer; IArbitrator pointer |
| `kleros-curate/references/shared-item-json.md` | 110 | 139 | VERIFIED | columns+values shape; deep-copy rule; CAIP-10; image path; placeholder rule; 5-item checklist; 5 failure modes |
| `kleros-curate/references/shared-ipfs-upload.md` | 55 | 79 | VERIFIED | Durability rationale; 3 upload methods; submission rule; double-slash trap; image guidance; agent autonomy |
| `kleros-curate/SKILL.md` | — (contains "Common workflows") | 183 | VERIFIED | Section at line 109; 3 workflows with correct step counts; <500 lines; no content duplication |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `shared-metaevidence.md` | `shared-abi-fragments.md` | topic0 pointer | VERIFIED | Line 26: "see `shared-abi-fragments.md`" — no raw hash in file |
| `shared-deposits.md` | `shared-abi-fragments.md` | IArbitrator signature pointer | VERIFIED | Line 28: "(Full IArbitrator signature: shared-abi-fragments.md)" |
| `shared-item-json.md` | `shared-metaevidence.md` | columns come from MetaEvidence | VERIFIED | Line 5: "(Fetch MetaEvidence: `shared-metaevidence.md`)" |
| `shared-ipfs-upload.md` | `kleros-ipfs-upload/SKILL.md` | recommended path reference | VERIFIED | Lines 11–13, 79: kleros-ipfs-upload skill named explicitly |
| `SKILL.md` | `shared-metaevidence.md` | Common workflows step 1 Submit | VERIFIED | Line 112: step 1 references shared-metaevidence.md |
| `SKILL.md` | `shared-deposits.md` | Common workflows deposit step | VERIFIED | Lines 115, 121: deposit step in both Submit and Challenge workflows |

---

### Data-Flow Trace (Level 4)

Not applicable — this is a documentation-only phase. All artifacts are markdown reference files; there are no runtime components, data fetches, or rendering pipelines to trace.

---

### Behavioral Spot-Checks

Step 7b: SKIPPED (no runnable entry points — documentation-only phase; all artifacts are markdown files)

---

### Probe Execution

Step 7c: No probes declared in any PLAN.md. No conventional `scripts/*/tests/probe-*.sh` files exist for this phase. SKIPPED.

---

### Requirements Coverage

| Requirement | Phase 2 Plans | Description | Status | Evidence |
|-------------|---------------|-------------|--------|---------|
| FACT-01 | 02-02, 02-06 | Shared MetaEvidence retrieval reference | SATISFIED | shared-metaevidence.md: 105 lines; eth_getLogs; LGTCR two-stream; PGTCR Goldsky+fallback |
| FACT-02 | 02-03, 02-06 | Shared deposit computation reference | SATISFIED | shared-deposits.md: 112 lines; LGTCR 4 formulas; PGTCR two-asset model; appeal formula |
| FACT-03 | 02-04, 02-06 | Shared item.json construction reference | SATISFIED | shared-item-json.md: 139 lines; columns+values; deep-copy; CAIP-10; 5-item checklist |
| FACT-04 | 02-05, 02-06 | Shared IPFS upload reference | SATISFIED | shared-ipfs-upload.md: 79 lines; 3 upload mechanisms; double-slash trap; durability rationale |
| FACT-05 | 02-01, 02-06 | Shared ABI fragments reference | SATISFIED | shared-abi-fragments.md: 183 lines; all Curate contracts; IArbitrator; factory ABIs |
| FACT-06 | 02-01 through 02-05 | Flavor-specific nuances preserved during extraction | SATISFIED | PGTCR two-step withdrawal in ABI; LGTCR two-stream in metaevidence; PGTCR ERC20+native in deposits; Scout seed-first absent from all shared files |
| WRIT-01 | 02-01 through 02-06 | All instructions in imperative form | SATISFIED | Verified across all 5 shared files and SKILL.md: "Call eth_getLogs", "Use these signatures", "Copy the columns array", etc. |
| WRIT-02 | 02-01 through 02-06 | WHY behind constraints | SATISFIED | WHY rationale present on: Solidity-style choice, topic0 canonical location, sort-and-take-latest, two-stream, PGTCR two-asset model, deep-copy rule, output protocol, CAIP-10, image path, wrap-with-directory, gateway mutability |
| WRIT-03 | 02-01 through 02-04 | TOC for files >300 lines | SATISFIED (inapplicable) | All Phase 2 files are <200 lines; threshold never triggered; requirement trivially satisfied |
| WRIT-04 | 02-01 through 02-05 | Grep patterns for files >10k words | SATISFIED (inapplicable + partial) | No Phase 2 shared file exceeds 10k words; grep pattern for shared-abi-fragments.md is present in SKILL.md line 104 (bonus) |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `shared-ipfs-upload.md` | 62 | `QmXXX...` | Info | Example CID in explanatory text — not a stub; illustrates the prefix format intentionally |
| `shared-item-json.md` | 87, 89 | "Placeholder rule" / "placeholders" | Info | Section heading and description of PLACE_VALUE_HERE/PLACE_IPFS_URI_HERE — not a stub; explicitly documented drafting aids that must be replaced before submission |

No TBD, FIXME, or XXX markers found in any phase 2 file. Both flagged patterns are intentional documentation content, not incomplete implementation.

---

### Human Verification Required

None. All must-haves are verifiable programmatically (file existence, line counts, grep patterns, structural checks). This is a documentation-only phase with no visual, real-time, or external-service behavior to validate.

---

### Gaps Summary

No gaps. All 6 plans executed successfully. All 55 observable truths verified against actual file contents. All 6 artifacts exist, are substantive, and are wired through correct cross-references.

**Notable observations (not blockers):**

1. **WRIT-03 inapplicability:** Plans 02-01 through 02-04 declare WRIT-03 in their `requirements` field, but WRIT-03 triggers only for files >300 lines. All Phase 2 shared files are under 200 lines. The requirement is satisfied trivially — no TOC needed, none added.

2. **WRIT-04 inapplicability:** Similarly, WRIT-04 requires grep patterns for files >10k words. No Phase 2 file exceeds 1,034 words. The grep pattern for shared-abi-fragments.md in SKILL.md (line 104) was added proactively, satisfying the spirit of WRIT-04 for the most complex file.

3. **Heading level in shared-deposits.md:** The must_have truth for plan 02-03 uses `###` notation for "LGTCR specifics" and "PGTCR specifics", but the actual file uses `##` (top-level sections). This is a notation mismatch in the must_have text, not a content gap — the subsections are named exactly as specified and contain all required content.

4. **shared-ipfs-upload.md line count (79 vs 55–70 target):** The 9-line overage comes from code blocks and blank lines between sections, not padding. `min_lines: 55` artifact gate is satisfied. All required sections are present.

---

## Deferred Items

None. All items in scope for Phase 2 are implemented. Phase 3 items (flavor-specific files, fundAppeal algorithm, Goldsky endpoint URLs, Scout seed templates) are correctly absent from Phase 2 files.

---

_Verified: 2026-05-27_
_Verifier: Claude (gsd-verifier)_
