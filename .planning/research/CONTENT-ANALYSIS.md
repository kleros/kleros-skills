# Content Analysis: Curate Draft Skill Files

**Date:** 2026-05-26
**Files analyzed:**
- `curate-v1/curate-light-skill.md` — 708 lines (Light Curate / LGTCR, generic)
- `curate-v1/pgtcr-stake-curate-skill.md` — 650 lines (Stake Curate / PGTCR)
- `curate-v1-scout/scout-skills.md` — 1008 lines (Scout — 4 hardcoded Gnosis registries using LGTCR)

---

## 1. Overlap Matrix

Section-by-section mapping of what appears across files, with approximate line counts.

| Section topic | LGTCR | PGTCR | Scout | Overlap notes |
|---|---|---|---|---|
| Non-negotiables / hard rules | ~13 | ~10 | ~18 | Near-identical intent; PGTCR adds source-of-truth hierarchy; Scout adds seed-template rule. Core 8 rules identical. |
| Registry discovery (eth_getCode, hallmark read) | ~20 | ~21 | ~28 (§3+§4A) | Same pattern; PGTCR adds GraphQL existence test; Scout adds LightGeneralizedTCRView confirmation. |
| MetaEvidence retrieval (eth_getLogs, topic0, sort-take-latest) | ~85 (§1+§2) | ~7 (§5A-5B) | ~94 (§4+§6 Method 3) | Core log-retrieval rule is word-for-word in LGTCR and Scout. PGTCR abbreviates it (GraphQL primary, onchain fallback). Topic0 hash `0x61606...` appears verbatim in both LGTCR and Scout. |
| item.json construction (deep-copy columns, verbatim rule, output protocol) | ~128 (§3) | ~29 (§5C) | ~76 (§8) | LGTCR has the authoritative, most detailed version. PGTCR is a condensed copy. Scout reformulates with seed-first twist but repeats the same deep-copy and output-protocol rules. |
| Field-value types (text, image, rich address, CAIP-10) | ~24 (§4) | implicit in §5C | ~35 (§8 rich address + §9) | LGTCR enumerates all types. Scout repeats CAIP-10 rule with examples. PGTCR omits explicit type table. |
| IPFS upload (Pinata manual, Pinata API, The Graph node, /ipfs/ submission rule) | ~44 (§5) | ~39 (§6) | ~68 (§9) | Text is near-verbatim across all three. Pinata curl command, The Graph curl command, and `/ipfs/<CID>` rule appear word-for-word. Scout expands with image-specific guidance (logo size, CDN screenshot). |
| Deposit computation (base + arbitrationCost, never-guess rule) | ~45 (§6) | ~61 (§7) | ~44 (§4C-D + §5 + §10 payment rules) | Deposit formula for addItem is identical. PGTCR adds ERC20 stake layer. Scout repeats formula three times across §4, §5, §10. |
| Action playbooks (addItem, removeItem, challengeRequest, submitEvidence, fundAppeal, executeRequest, withdrawFeesAndRewards) | ~100 (§7) | ~41 (§8) | ~168 (§10 + §11) | Same 7 actions across all three. LGTCR has the most detailed fundAppeal math. Scout's §10 is a verbose standalone execution-rules section that re-states what LGTCR §7 already covers. |
| ABI fragments (LightGeneralizedTCR, Arbitrator) | ~95 (§0.5) | ~82 (minimal ABI section) | none embedded (references ABI paths) | LGTCR and PGTCR have different contract ABIs (different contracts). Scout references ABI files by path rather than embedding JSON. Arbitrator ABI is identical in LGTCR and PGTCR. |
| Factory deploy | ~37 (§9) | ~28 (§9) | none | LGTCR uses LightGTCRFactory; PGTCR uses PermanentGTCRFactory. Different param sets. No overlap except pattern. |
| Stop conditions / submission checklist | ~15 (§10) | implicit | ~20 (§14) | LGTCR lists 7 stop conditions. Scout has a 13-point pre-submission checklist covering the same ground. |
| References / links | ~16 (§11) | ~8 | none | Partially overlapping (curate.kleros.io, EIP-1497). |

### Quantified duplication estimate

| Duplicated topic | Lines in LGTCR | Lines in Scout (duplicate) | Lines in PGTCR (duplicate) |
|---|---|---|---|
| Non-negotiables core | 13 | 10 | 8 |
| Registry discovery | 20 | 20 | 15 |
| MetaEvidence retrieval (log method) | 50 | 60 | 7 |
| item.json construction + output protocol | 128 | 50 | 20 |
| IPFS upload (Pinata + Graph) | 44 | 44 | 39 |
| Deposit formula (addItem) | 20 | 30 | 15 |
| Action verbs / playbook structure | 40 | 80 | 25 |
| Arbitrator ABI | 10 | 0 | 10 |
| **Subtotal duplicate lines** | **325** | **294** | **139** |

Rough total: ~750 lines of content appear in two or three files in near-identical or lightly reformulated form.

---

## 2. Unique Content Per File

### LGTCR-only (curate-light-skill.md)

| Unique content | Lines | Notes |
|---|---|---|
| Generic multi-chain framing (Mainnet/Sepolia/Gnosis, no hardcoded registry) | ~10 | Explicit "list-agnostic" declaration; contrast with Scout's fixed scope |
| How user finds the list address via Curate UI URL format | ~7 | `/tcr/<chainId>/<listAddress>` parsing |
| Two MetaEvidence streams (registration vs clearing ID classification, resolution hierarchy) | ~30 | §2B–§2C — unique detail about addItem vs removeItem MetaEvidence IDs |
| Schema confirmation check via NewItem event sample | ~25 | §3 "Schema confirmation check" — verifying type encoding from a real past submission |
| Placeholder rule while drafting | ~5 | Explicit PLACE_VALUE_HERE convention (also appears in Scout but originated here) |
| fundAppeal detailed math (step 0–3, multiplier selection, loser half-time rule) | ~55 | §7E — most detailed appeal-funding algorithm across all three files |
| Duplicate checking guidance (intentionally skips subgraphs) | ~11 | §8 |
| LightGTCRFactory ABI + deploy parameter docs | ~37 | §9 — factory deploy for LGTCR |
| Stop conditions list (7 explicit conditions) | ~15 | §10 |
| References with academic/media links | ~16 | §11 |

**LGTCR-unique total: ~211 lines**

### PGTCR-only (pgtcr-stake-curate-skill.md)

| Unique content | Lines | Notes |
|---|---|---|
| Goldsky GraphQL endpoints (3 chains, public + private URLs, curl template) | ~23 | §1 — not in any other file |
| Source-of-truth hierarchy (onchain > Goldsky > UI) | ~6 | §Non-negotiables |
| PGTCR status model + derived-status algorithm (pseudocode) | ~56 | §3 — Absent/Submitted/Reincluded/Disputed → PENDING/ACCEPTED/CROWDFUNDING/etc. |
| Full GraphQL schema queries (registry params, paginated items list, item details incl. rounds, challenges, evidences) | ~164 | §4A–4C — ~164 lines of GraphQL, unique to PGTCR |
| ERC20 stake mechanics (approvals, submissionMinDeposit as minimum not total, staking-more rationale) | ~30 | §7A |
| Challenge stake formula: `item.stake * challengeStakeMultiplier / MULTIPLIER_DIVISOR` | ~15 | §7B |
| Start-withdrawal flow (`startWithdrawItem` + withdrawal period) | ~10 | §8E-8F |
| Registry admin/governor actions (changeArbitrationParams, changeSubmissionMinDeposit, etc.) | ~27 | §8.1 |
| PermanentGTCRFactory ABI + single-MetaEvidence deploy params | ~28 | §9 |
| Onchain fallbacks for GraphQL-down scenario (arbitrationParamsChanges index logic) | ~17 | §10 |
| PermanentGTCR full ABI (different contract, different structs) | ~55 | minimal ABI section |
| PermanentGTCRFactory ABI | ~14 | minimal ABI section |

**PGTCR-unique total: ~445 lines**

### Scout-only (curate-v1-scout/scout-skills.md)

| Unique content | Lines | Notes |
|---|---|---|
| Why Scout matters (ecosystem context, 700k+ entries, Etherscan/Ledger/Blockscout integration) | ~35 | §Why this matters + §What Scout registries are |
| Incentive programs (300k PNK/month reference, blog link, don't-guess-campaign rule) | ~15 | §Why people care |
| Three profit paths (project visibility, submitter upside, challenger upside) | ~20 | §The three profit paths |
| Fixed scope declaration (Gnosis/chainId 100, 4 hardcoded registry addresses) | ~28 | §1 |
| LightGeneralizedTCRView helper contract (address `0xB32e38B08FcC7b7610490f764b0F9bFd754dCE53`, function list, usage rules, fallback rule) | ~67 | §3 + §6 Method 2 + §12 |
| Seed-first drafting philosophy (seed as primary JSON source vs MetaEvidence as cross-check) | ~20 | Distributed across §4, §6, §15 — unique inversion vs LGTCR which fetches everything dynamically |
| 4 registry-specific seed templates (ATQ, Address Tags, Kleros Tokens, CDN) with full columns+values JSON | ~173 | §7 — entirely unique |
| scout-api.kleros.link/api/address-tags endpoint (optional pre-submission research) | ~25 | §8 optional existing-entry research |
| Image-to-IPFS guided process (token logo specs: PNG, 128x128; CDN visual proof: screenshot with context) | ~35 | §9 image-specific guidance (Pinata/Graph upload repeats shared content) |
| Verbose standalone transaction execution section (preflight checks, simulation rule, ABI/calldata rule, per-action payment tables) | ~110 | §10 — this restructures and expands content already in LGTCR §7, but as a standalone safety framework |
| Submission checklist (13-point pre-`addItem` checklist) | ~20 | §14 |
| Blunt summary / correct split declaration | ~22 | §15 |
| ABI limitations (what ABI can/cannot do for discovery) | ~27 | §13 |

**Scout-unique total: ~597 lines** (of 1008 total; ~200 lines are shared/duplicate content)

---

## 3. Factoring Recommendation

### Proposed split

```
curate-v1/
  SKILL.md                    ← shared foundation (all three variants)
  lgtcr-extension.md          ← LGTCR-specific content
  pgtcr-extension.md          ← PGTCR-specific content

curate-v1-scout/
  SKILL.md                    ← Scout-specific content (imports shared + lgtcr)
```

Or, if the plugin spec requires single self-contained SKILL.md files per plugin:

```
curate-lgtcr/SKILL.md         ← shared foundation + LGTCR extensions
curate-pgtcr/SKILL.md         ← shared foundation (abbreviated) + PGTCR extensions  
curate-scout/SKILL.md         ← shared foundation (abbreviated) + Scout extensions
```

The second layout (separate plugin per variant) is simpler given the current plugin spec requiring one SKILL.md per plugin directory. Each file would include the shared foundation inline but only the relevant extensions.

### Shared foundation content (common to all three)

These sections should be written once in a canonical form and referenced/copied into each variant's SKILL.md:

| Content | Estimated lines |
|---|---|
| Non-negotiables (8 core rules) | 12 |
| Registry discovery (eth_getCode + hallmark read) | 18 |
| MetaEvidence retrieval (eth_getLogs, topic0, sort-take-latest, two-stream note) | 45 |
| item.json construction (deep-copy rule, output protocol, programmatic checklist) | 80 |
| Field-value types (text, image, rich address, CAIP-10) | 20 |
| IPFS upload (Pinata manual + API, The Graph node, /ipfs/ rule) | 35 |
| Deposit formula pattern (base + arbitrationCost, never-guess) | 18 |
| Arbitrator ABI | 10 |
| Stop conditions | 12 |
| **Shared foundation total** | **~250 lines** |

### LGTCR-specific extensions (beyond shared)

| Content | Estimated lines |
|---|---|
| Generic multi-chain framing + inputs section | 30 |
| Two MetaEvidence streams (registration vs clearing ID, resolution hierarchy) | 30 |
| Schema confirmation check (NewItem event sample validation) | 25 |
| LightGeneralizedTCR full ABI + LightGTCRFactory ABI | 80 |
| Action playbooks (full detail: addItem through withdrawFeesAndRewards) | 70 |
| fundAppeal detailed math (step 0–3 with multiplier logic) | 55 |
| Duplicate checking note | 10 |
| Factory deploy walkthrough | 35 |
| References | 15 |
| **LGTCR-extension total** | **~350 lines** |

**Projected curate-lgtcr/SKILL.md: ~600 lines** (shared 250 + LGTCR 350)
vs current 708 lines — ~15% reduction from deduplication within LGTCR itself.

### PGTCR-specific extensions (beyond shared)

| Content | Estimated lines |
|---|---|
| PGTCR framing (ERC20 stake + native, GraphQL-primary model) | 15 |
| Inputs section (Goldsky token requirement) | 13 |
| Goldsky endpoints (3 chains, curl template) | 23 |
| PGTCR status model + derived-status algorithm | 56 |
| GraphQL queries (registry, items list, item details) | 164 |
| MetaEvidence via GraphQL (abbreviated, since log method is in shared) | 12 |
| ERC20 stake mechanics + challenge stake formula + appeal funding | 61 |
| Transaction playbooks (A–G including startWithdrawItem) | 41 |
| Admin/governor actions | 27 |
| Factory deploy | 28 |
| Onchain fallbacks (GraphQL-down scenarios) | 17 |
| PermanentGTCR ABI + PermanentGTCRFactory ABI | 69 |
| References | 8 |
| **PGTCR-extension total** | **~534 lines** |

**Projected curate-pgtcr/SKILL.md: ~784 lines** (shared 250 + PGTCR 534)
vs current 650 lines — slight increase because shared section adds MetaEvidence/item.json detail that PGTCR currently abbreviates. This is net correct: PGTCR's condensed item.json rules were always a gap.

### Scout-specific extensions (beyond shared + LGTCR)

Scout = LGTCR contracts + fixed-scope wrapper. Its SKILL.md should pull the full LGTCR shared foundation and then add Scout-only content.

| Content | Estimated lines |
|---|---|
| Ecosystem context (why Scout, 700k entries, incentive programs, 3 profit paths) | 70 |
| Fixed scope (Gnosis, 4 registry addresses) | 20 |
| Seed-first drafting philosophy + MetaEvidence-as-cross-check inversion | 20 |
| LightGeneralizedTCRView helper (address, functions, fallback rule) | 45 |
| 4 registry seed templates | 173 |
| scout-api.kleros.link pre-submission research endpoint | 25 |
| Image-to-IPFS with image-specific guidance (logo, CDN screenshot) | 35 |
| Transaction execution safety framework (preflight + simulation + per-action payment tables) | 110 |
| Submission checklist | 20 |
| Blunt summary | 20 |
| ABI limitations (discovery caveat) | 25 |
| **Scout-extension total** | **~563 lines** |

**Projected curate-scout/SKILL.md: ~813 lines** (shared 250 + LGTCR-base 200 reduced + Scout 563)
vs current 1008 lines — ~20% reduction by removing the ~200 lines of IPFS/item.json/deposit content that Scout currently repeats wholesale.

---

## 4. Summary Findings

### Largest duplication zones (by line count)

1. **IPFS upload section** — appears nearly verbatim in all three files (~44 lines each). Cleanest candidate for extract-once.
2. **item.json construction + output protocol** — LGTCR has 128 lines; Scout has 76; PGTCR has 29 (too condensed). Should be one authoritative 80-line section.
3. **Transaction execution / action playbooks** — LGTCR §7 (~100 lines) and Scout §10+§11 (~217 lines) cover the same 7 actions. Scout's version adds safety framing but duplicates the method logic.
4. **MetaEvidence retrieval** — LGTCR §2 (~60 lines) and Scout §4+§6 Method 3 (~90 lines) use identical topic0 hash and identical retrieval algorithm.

### Most important structural difference

Scout inverts the drafting authority: LGTCR says "derive item.json dynamically from MetaEvidence", Scout says "use embedded seed as primary, MetaEvidence as cross-check". This is intentional (4 known registries with stable schemas). Any factoring must preserve this inversion in the Scout variant without contaminating the generic LGTCR skill.

### Factoring risk

The PGTCR item.json section (§5C, 29 lines) is currently under-specified relative to LGTCR's canonical treatment. If factored into a shared foundation, PGTCR would inherit the full item.json rules — net improvement, not regression.

The Scout seed-first rule must stay Scout-scoped. If a shared foundation is written, it must frame the item.json rule as "derive from MetaEvidence" (LGTCR/PGTCR default) with a note that registry-scoped skills may override with embedded seeds.

### Line count summary

| File | Current | Projected after factoring | Delta |
|---|---|---|---|
| Shared foundation (new) | 0 | ~250 | +250 |
| curate-lgtcr/SKILL.md | 708 | ~600 | -108 (-15%) |
| curate-pgtcr/SKILL.md | 650 | ~784 | +134 (+21%) — adds gap-filling from shared |
| curate-scout/SKILL.md | 1008 | ~813 | -195 (-19%) |
| **Total** | **2366** | **2447** | +81 net (shared foundation is new content) |

Net line count stays roughly constant. Value is in consistency, not compression: eliminating drift risk between the 3 files on shared rules (non-negotiables, IPFS upload, item.json construction, MetaEvidence retrieval).
