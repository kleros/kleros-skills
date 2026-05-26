# Phase 2: Shared References — Research

**Researched:** 2026-05-27
**Domain:** Content extraction — Kleros Curate skill files (LGTCR, PGTCR, Scout)
**Confidence:** HIGH — all source material read directly; no external dependencies

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Subsections per flavor — shared procedure first, then `### LGTCR specifics` and `### PGTCR specifics` subsections within each shared file. Truly shared parts (e.g., msg.value assembly) get their own sections without flavor prefix.

**D-02:** Scout does NOT get its own subsection in shared files — Scout uses identical LGTCR mechanics at the contract layer. Add a parenthetical pointer under LGTCR subsections: "(Scout registries use these same LGTCR mechanics — see scout-registries.md for the 4 specific registry addresses.)"

**D-03:** Table of contents at top of any shared file exceeding 300 lines.

**D-04:** Solidity-style human-readable signatures for all functions and events — e.g., `function addItem(bytes _item) external payable`. Both ethers and viem parse these natively.

**D-05:** Full event signatures in Solidity-style format (not just topic0 hashes) — agents derive topic0 from the signature. e.g., `event MetaEvidence(uint256 indexed _metaEvidenceID, string _evidence)`.

**D-06:** No JSON ABI arrays. Solidity-style is the single format.

**D-07:** Self-contained + pointers — each shared file includes enough inline context to be usable alone for its primary task. Add a parenthetical pointer for depth.

**D-08:** Flavor files (Phase 3) point to shared files as single source of truth — no duplication.

**D-09:** SKILL.md gets a "Common workflows" section in the action index showing multi-step loading sequences for common operations (submit item, challenge/remove item).

**D-10:** Imperative/infinitive form per WRIT-01.

**D-11:** Explain the WHY behind constraints per WRIT-02.

**D-12:** Structured list format over markdown tables.

**D-13:** Keep content lean — extract what agents need, not everything.

### Claude's Discretion

- The specific ordering of subsections within each shared file.
- How much inline context is "enough" in each self-contained section before pointing to another file.

### Deferred Ideas (OUT OF SCOPE)

- Standardized pointer format across all shared files (arrow notation vs parenthetical).
- Circular reference handling between shared files (e.g., metaevidence ↔ IPFS).
</user_constraints>

---

## Summary

Phase 2 extracts ~750 lines of near-verbatim content that appears in two or more of the three draft skills (LGTCR 708 lines, PGTCR 650 lines, Scout 1008 lines) into 5 stub files already scaffolded in Phase 1. The content analysis confirms four major duplication zones: IPFS upload (≈44 lines × 3 files), item.json construction (128/76/29 lines across the three files), MetaEvidence retrieval (≈60 + 90 lines in LGTCR and Scout; 7 in PGTCR), and deposit formulas (≈20 + 30 + 15 lines).

The extraction work is primarily editorial: lifting content from authoritative draft sections, rewriting to imperative form with WHY rationale, applying D-01/D-02 flavor-subsection structure, and converting all ABI fragments from JSON arrays to Solidity-style signatures (D-04/D-05/D-06). No new technical content is invented — every claim in the shared files traces back to a specific section of a draft skill.

The five target files have predictable estimated line counts: shared-abi-fragments.md will be the largest (≈160–200 lines) because it covers three contracts; shared-metaevidence.md and shared-item-json.md will each be ≈90–120 lines; shared-deposits.md ≈70–90 lines; shared-ipfs-upload.md ≈50–60 lines. None are expected to exceed 300 lines, so no ToC is required by D-03. SKILL.md update is minor: add a "Common workflows" subsection to the existing action index (≈15–20 lines).

**Primary recommendation:** Extract in dependency order — ABI fragments first (other files reference signature names), then MetaEvidence (item.json depends on fetching it), then deposits (needs ABI names), then item.json, then IPFS upload (simplest, no dependencies). SKILL.md update last.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Content extraction + editorial rewrite | Documentation layer | — | Pure file-editing work; no runtime code |
| ABI signature format conversion (JSON → Solidity) | Documentation layer | — | D-04/D-06 mandate; ethers/viem parse both natively |
| Flavor subsection structure | Documentation layer | — | D-01/D-02 framing decision already locked |
| SKILL.md "Common workflows" section | Routing layer (SKILL.md) | — | D-09; agents use SKILL.md as entry point |
| Cross-file pointer consistency | Documentation layer | — | Heading names in shared files must be predictable for Phase 3 flavor files to reference |

---

## Content Mapping — By Target File

### 1. `shared-abi-fragments.md`

**Source sections:**
- LGTCR JSON ABI: `curate-light-skill.md` §0.5 (lines 124–184) — LightGeneralizedTCR minimal ABI, Arbitrator minimal ABI, LightGTCRFactory ABI
- PGTCR JSON ABI: `pgtcr-stake-curate-skill.md` §Minimal ABI fragments (lines 562–641) — PermanentGTCR minimal ABI, PermanentGTCRFactory ABI, Arbitrator ABI (identical to LGTCR copy)
- Scout: no embedded ABI in scout-skills.md; references "LightGeneralizedTCRView" read functions as plain-text lists (lines 128–176, §3)

**What to extract:**
- All function signatures for LightGeneralizedTCR (write + read), converted to Solidity-style
- All function signatures for PermanentGTCR (write + read), converted to Solidity-style
- LightGeneralizedTCRView convenience function signatures (from Scout §3) — Scout-specific but lives here as a LGTCR-adjacent helper
- IArbitrator interface: `arbitrationCost`, `appealCost`, `appealPeriod`, `currentRuling`
- Key event signatures: `MetaEvidence`, `NewItem`, `NewGTCR` — plus the topic0 hash for MetaEvidence (used in eth_getLogs filters everywhere)

**ABI conversion examples (JSON → Solidity-style per D-04):**

LGTCR — before (JSON):
```json
{"type":"function","name":"addItem","stateMutability":"payable","inputs":[{"name":"_item","type":"string"}],"outputs":[]}
```

LGTCR — after (Solidity-style):
```
function addItem(string _item) external payable
```

Event — before (JSON):
```json
{"type":"event","name":"MetaEvidence","inputs":[{"indexed":true,"name":"_metaEvidenceID","type":"uint256"},{"indexed":false,"name":"_evidence","type":"string"}]}
```

Event — after (Solidity-style, per D-05):
```
event MetaEvidence(uint256 indexed _metaEvidenceID, string _evidence)
// topic0 = keccak256("MetaEvidence(uint256,string)")
//        = 0x61606860eb6c87306811e2695215385101daab53bd6ab4e9f9049aead9363c7d
```

**PGTCR difference from LGTCR — key function signature differences:**
- PGTCR `addItem(string _item, uint256 _deposit) external payable` — takes deposit param; LGTCR `addItem(string _item) external payable` — no deposit param
- PGTCR uses `challengeItem` not `challengeRequest`
- PGTCR has `startWithdrawItem`, `withdrawItem` (two-step withdrawal); LGTCR has `executeRequest`
- PGTCR `withdrawFeesAndRewards` takes `_challengeID uint120` not `_requestID uint256`

**Flavor subsection structure (D-01):**
- Shared: IArbitrator interface (identical across both), MetaEvidence event (identical topic0)
- `### LGTCR functions` subsection: LightGeneralizedTCR write + read signatures
- `### PGTCR functions` subsection: PermanentGTCR write + read signatures
- `### LGTCR-only helper` subsection: LightGeneralizedTCRView (Scout context, D-02 pointer)
- `### Factory signatures` subsection: LightGTCRFactory deploy, PermanentGTCRFactory deploy

**Scout pointer per D-02:** Under the LGTCR helper section, add: "(Scout registries use the LightGeneralizedTCRView helper at a fixed Gnosis address — see scout-registries.md for the hardcoded contract address.)"

**Estimated line count:** 160–200 lines (Solidity-style signatures are compact vs JSON arrays)

**Content NOT to extract (Phase 3 scope):**
- LightGTCRFactory deploy parameters documentation (flavor-specific factory section)
- PermanentGTCRFactory deploy parameters documentation
- Sanity check guidance after ABI sourcing (belongs in flavor reference files)


### 2. `shared-metaevidence.md`

**Source sections:**
- Primary: `curate-light-skill.md` §1 (lines 194–218) and §2 (lines 219–281) — what MetaEvidence contains, RPC log method, two-stream classification, JSON parsing
- PGTCR path: `pgtcr-stake-curate-skill.md` §5A–5B (lines 313–330) — GraphQL primary (Goldsky `arbitrationSettings[0].metaEvidenceURI`), onchain log fallback
- Scout reinforcement: `scout-skills.md` §4 (lines 185–241) and §6 Method 3 (lines 344–378) — identical topic0 and sort rule; seed-first framing (do NOT extract — Scout-only inversion)

**What to extract:**
- What MetaEvidence contains: `fileURI` → policy, `metadata.columns[]` → schema — with WHY (policy is the acceptance standard; schema is the only authoritative field list)
- RPC log method: `eth_getLogs`, filter by `address = listAddress`, `topics[0]` with the exact hash, wide block range
- Sort and take-latest rule: sort by `blockNumber desc, logIndex desc`, take first per MetaEvidenceID — with WHY (latest update supersedes all prior versions)
- Two-stream classification (LGTCR): registration MetaEvidence ID (for addItem) vs clearing MetaEvidence ID (for removeItem); resolution hierarchy when ID mapping is ambiguous — LGTCR-specific subsection
- PGTCR GraphQL path: Goldsky `registry.arbitrationSettings[0].metaEvidenceURI` as primary; onchain log fallback when subgraph is down — PGTCR-specific subsection
- Fetching the JSON: IPFS gateway read (cdn.kleros.link or ipfs.io); format `/ipfs/<CID>/metaEvidence.json`
- Blockscout explorer fallback: debugging/cross-check only, not source-of-truth

**Key verbatim content to preserve (topic0 hash):**
```
topics[0] = 0x61606860eb6c87306811e2695215385101daab53bd6ab4e9f9049aead9363c7d
```
This appears word-for-word in LGTCR §2A and Scout §4 and §6. Single canonical location in shared-abi-fragments.md is better; shared-metaevidence.md should reference it with a pointer: "(topic0 hash and full event signature: shared-abi-fragments.md)".

**LGTCR two-stream note (unique detail):**
LGTCR emits at least two MetaEvidence events per registry (one for registration, one for removal/clearing). The MetaEvidenceID distinguishes them. This detail does NOT appear in PGTCR (single MetaEvidence model) and is NOT in Scout (single registration focus). Goes in `### LGTCR specifics` subsection.

**Scout pointer per D-02 under LGTCR section:** "(Scout registries use these same LGTCR mechanics — see scout-registries.md for the 4 specific registry addresses.)"

**Content NOT to extract (Phase 3 / Scout-only):**
- Seed-first drafting philosophy (Scout §4 / §6 §15) — inverts the MetaEvidence-as-primary rule; belongs in scout-registries.md
- Specific Goldsky subgraph endpoint URLs (PGTCR-specific; belongs in stake-curate.md)
- LightGeneralizedTCRView existence check (Scout-specific helper; belongs in scout-registries.md)

**Estimated line count:** 90–120 lines


### 3. `shared-item-json.md`

**Source sections:**
- Primary: `curate-light-skill.md` §3 (lines 282–408) — canonical item.json shape, deep-copy rule, output protocol, programmatic checklist, schema confirmation via NewItem, placeholder rule, field-value types
- PGTCR reinforcement: `pgtcr-stake-curate-skill.md` §5C (lines 328–340) — condensed copy; adds no new content beyond confirming LGTCR rules apply
- Scout: `scout-skills.md` §8 (lines 556–601) — JSON drafting rules are largely the same; CAIP-10 rule is repeated; seed-first twist is Scout-only

**What to extract:**
- Canonical output shape: `{ columns: [...], values: {...} }` — explain WHY (Curate UI and contracts expect this exact envelope)
- `columns` deep-copy rule: copied verbatim from `ME.metadata.columns`; same objects, same key/value pairs, same order — explain WHY (any edit to columns, even correcting a typo in a description, breaks the schema contract)
- `values` construction: one key per `col.label` in exact string match (spaces, punctuation, case); populate from user input per column type
- Output protocol: print "Fetched columns (verbatim)" before item.json to prevent helpful rewriting — explain WHY (LLMs tend to paraphrase; the output protocol makes the verbatim requirement enforceable)
- Programmatic construction checklist (5 items from LGTCR §3): deep-equal columns, keys(values) == columns map, non-empty values per policy, image type → `/ipfs/` path, rich address → CAIP-10
- Schema confirmation via NewItem event: find any NewItem after the latest MetaEvidence update, fetch its `_data`, confirm columns match and observe type encoding (strings vs numbers) — explain WHY (type encoding is not in the schema, only observable from past submissions)
- Field-value types: text, long text, link, address, rich address (CAIP-10), image (→ `/ipfs/` path, never a gateway URL) — with WHY on CAIP-10 and image path format
- Placeholder rule: `PLACE_VALUE_HERE`, `PLACE_IPFS_URI_HERE` while drafting; never submit with placeholders

**Common failure modes to include (from LGTCR §3):**
- Renaming labels (e.g. `"Name"` → `"Token Name"`)
- Reordering columns
- Rewriting/inventing descriptions
- Changing `isIdentifier`
- Building schema from UI assumptions instead of MetaEvidence

**CAIP-10 rule (appears in both LGTCR §4 and Scout §8):**
```
eip155:<chainId>:0xAddress
```
Ask user for chain if rich address field is present but chain is ambiguous.

**Content NOT to extract (Scout-only):**
- Seed-first drafting (Scout §8 "Use the embedded seed templates") — Scout-specific inversion
- 4 registry seed templates (Scout §7) — belong in scout-registries.md
- Mandatory syntax rules restatement in Scout §8 — redundant with LGTCR §3

**Estimated line count:** 110–140 lines (the largest shared file by content density; LGTCR §3 is 128 lines and this must be editorial-quality, not copy-paste)


### 4. `shared-deposits.md`

**Source sections:**
- Primary: `curate-light-skill.md` §6 (lines 481–527) — full deposit formula, UI trap, verification hierarchy
- PGTCR: `pgtcr-stake-curate-skill.md` §7A–7C (lines 387–441) — two-asset model (ERC20 stake + native arbitration), challenge stake formula, appeal funding
- Scout: `scout-skills.md` §4C–4D (lines 254–277) and §5 (lines 280–300) and §10 (lines 751–808) — same formulas repeated three times; §10 is the most structured per-action payment table

**What to extract:**
- Hard rules: never quote "typical" deposits; always live-read; UI trap (Curate UI shows base deposit only, not arbitration cost) — explain WHY (a reverted transaction because of wrong msg.value loses gas and blocks the operation)
- Arbitration cost read: `arbitrator()` → get address, `arbitratorExtraData()` → get bytes, `arbitrator.arbitrationCost(extraData)` → get cost; inline the IArbitrator call pattern with pointer "(full IArbitrator signature: shared-abi-fragments.md)"
- `### LGTCR specifics` subsection:
  - Submission: `msg.value = submissionBaseDeposit() + arbitrationCost`
  - Removal: `msg.value = removalBaseDeposit() + arbitrationCost`
  - Challenge (registration request): `msg.value = submissionChallengeBaseDeposit() + arbitrationCost`
  - Challenge (removal request): `msg.value = removalChallengeBaseDeposit() + arbitrationCost`
  - All paid in native token (ETH on Mainnet/Sepolia, xDAI on Gnosis)
- `### PGTCR specifics` subsection:
  - PGTCR uses two assets — explain WHY (ERC20 permanent stake is the collateral; native arbitration cost is the arbitrator fee; they are sent separately and serve different purposes)
  - Submission: ERC20 `approve(registryAddress, depositStake)` first (where `depositStake >= submissionMinDeposit()`), then `addItem(itemURI, depositStake)` with `msg.value = arbitrationCost`
  - "Stake more than minimum" rationale: signals confidence, makes spam less attractive (from PGTCR §7A)
  - Challenge stake formula: `challengeStake = item.stake * challengeStakeMultiplier / MULTIPLIER_DIVISOR` — all three values from live reads
  - Challenge msg.value: `arbitrationCost` (same as LGTCR)
  - Appeal funding: `requiredForSide = appealCost + appealCost * feeStakeMultiplier / MULTIPLIER_DIVISOR`; loser half-time rule
- Shared: appeal funding multiplier logic (identical in LGTCR §7E and PGTCR §7C); winner/loser/shared multiplier selection based on currentRuling

**Verification hierarchy (from LGTCR §6):**
Primary source of truth: live reads. Optional cross-check: inspect recent successful tx to confirm `msg.value`. Do not use tx inspection as primary.

**Content NOT to extract:**
- LGTCR `fundAppeal` step-by-step algorithm with `getItemInfo`/`getRequestInfo`/`getRoundInfo` chain — detailed enough to belong in light-curate.md (flavor reference)
- Scout §10 per-action payment tables — redundant with formulas; belongs in scout-registries.md if anywhere

**Scout pointer under LGTCR subsection per D-02:** "(Scout registries use these same LGTCR deposit formulas — see scout-registries.md for Scout-specific context.)"

**Estimated line count:** 80–100 lines


### 5. `shared-ipfs-upload.md`

**Source sections:**
- All three files have near-identical Pinata + The Graph sections:
  - LGTCR §5 (lines 437–478): Manual Pinata, Programmatic Pinata (JWT), The Graph IPFS node, submission rule
  - PGTCR §6 (lines 345–380): same content, same curl commands
  - Scout §9 (lines 632–698): same Pinata + Graph content + image-specific guidance (logo specs, CDN screenshot)
- kleros-ipfs-upload/SKILL.md: recommended path for Kleros-ecosystem content, durability rationale, x402 mechanism

**What to extract:**
- Durability rationale: third-party pins (Pinata, The Graph) can disappear after a service changes or token expires — explain WHY (once an IPFS CID is anchored onchain in a MetaEvidence or item event, the artifact must remain available for the dispute lifecycle, which can last months)
- Recommended path: `kleros-ipfs-upload` skill — Kleros-operated pins have strong availability incentives because the protocol depends on them; frame as "recommended for durability", not "required" (D-07/D-08 agent autonomy)
- Manual Pinata: account creation, Files → Add drag-drop, copy CID
- Programmatic Pinata (API): JWT from Developers → API Keys, curl command
- The Graph IPFS node: use when single direct-open link needed; `wrap-with-directory=false` rule — explain WHY (`wrap-with-directory=true` creates a directory CID and the file is at `/CID/filename`, which breaks `ipfs.io/ipfs/<CID>` direct access)
- Submission rule: use `/ipfs/<CID>` in onchain calls, never `https://gateway.../ipfs/<CID>` — explain WHY (gateway URLs are mutable; the IPFS protocol is content-addressed and gateway-agnostic)
- Double-slash trap (from CLAUDE.md and shared-ipfs-upload.md stub): `cids[]` from the Kleros gateway already includes `/ipfs/` prefix; build CDN URLs as `"https://cdn.kleros.link" + cid` not `"https://cdn.kleros.link/ipfs/" + cid`
- Image-specific guidance (from Scout §9): PNG preferred; token logos at least 128×128; CDN visual proof must show the exact domain/subdomain page with address context — brief, not Scout-scoped (any Curate registry can have image fields)
- Agent autonomy note: agents may use any IPFS mechanism; the skill is recommended for Kleros-ecosystem artifacts, not mandated

**Content NOT to extract (Scout-only):**
- Scout §8 optional existing-entry research endpoint (`scout-api.kleros.link`) — Scout-specific
- Upload agent workflow numbered list in Scout §9 steps 1–8 — covered by the shared procedure

**No flavor subsections needed** — IPFS upload procedure is identical across LGTCR, PGTCR, and Scout. The only flavor note: PGTCR uploads both item.json AND MetaEvidence JSON (same procedure, no separate section needed).

**Estimated line count:** 55–70 lines

---

## SKILL.md Update — "Common workflows" section

**Location in SKILL.md:** add after the existing `## Action index` section (currently ends at line ~104)

**Content (per D-09):** Numbered loading sequences for multi-step operations. These tell agents which reference files to read and in what order for common compound operations.

**Proposed sequences:**

**Submit an item (any flavor):**
1. `references/shared-metaevidence.md` — fetch schema and policy
2. `references/shared-item-json.md` — build item.json payload
3. `references/shared-ipfs-upload.md` — upload item.json to IPFS
4. `references/shared-deposits.md` — compute msg.value
5. Flavor reference (`light-curate.md` or `stake-curate.md`) — send transaction

**Challenge or remove an item:**
1. `references/shared-metaevidence.md` — fetch clearing policy (removal) or registration policy (challenge)
2. `references/shared-ipfs-upload.md` — upload evidence JSON
3. `references/shared-deposits.md` — compute challenge deposit
4. Flavor reference — send transaction

**Deploy a new registry:**
1. `references/shared-metaevidence.md` — prepare MetaEvidence JSON (policy + schema)
2. `references/shared-ipfs-upload.md` — upload MetaEvidence to IPFS
3. Flavor reference — factory deploy

**Estimated addition to SKILL.md:** 18–22 lines

---

## Extraction Dependency Order (recommended task sequence)

Dependencies flow through shared files — later files reference names defined in earlier ones.

```
1. shared-abi-fragments.md
   — standalone; defines function/event names referenced by all other files
   — "topic0 hash" lives here; metaevidence file will point here

2. shared-metaevidence.md
   — depends on ABI for topic0 pointer
   — foundational: item.json cannot be built without MetaEvidence schema

3. shared-deposits.md
   — depends on ABI for arbitrator function signatures
   — depends on metaevidence conceptually (schema tells you which action)
   — logically before item.json (deposit is computed before submission)

4. shared-item-json.md
   — depends on metaevidence (columns come from ME.metadata.columns)
   — references CAIP-10 and image type rules defined within this file

5. shared-ipfs-upload.md
   — depends on item.json (uploads item.json artifact)
   — standalone otherwise; simplest file

6. SKILL.md update ("Common workflows")
   — depends on all 5 shared files being complete (references their names)
```

No circular dependencies. Files 3 and 4 (deposits and item.json) could be extracted in parallel since they don't reference each other.

---

## Estimated Line Counts and ToC Trigger

| File | Estimated lines | Exceeds 300? | ToC required? |
|---|---|---|---|
| shared-abi-fragments.md | 160–200 | No | No |
| shared-metaevidence.md | 90–120 | No | No |
| shared-item-json.md | 110–140 | No | No |
| shared-deposits.md | 80–100 | No | No |
| shared-ipfs-upload.md | 55–70 | No | No |
| SKILL.md additions | 18–22 | N/A | N/A |

None of the five files are projected to exceed 300 lines, so D-03 (ToC requirement) will not trigger. The shared-abi-fragments.md and shared-item-json.md are the largest and should be monitored during implementation — if they grow beyond 250 lines, add a ToC proactively for navigation even though not strictly required.

---

## Content NOT Being Extracted (Phase 3 / Out of Scope)

These sections appear in the draft skills and may seem relevant but belong in Phase 3 flavor reference files, not in shared files:

| Content | Source location | Reason to defer |
|---|---|---|
| fundAppeal step-by-step algorithm (getItemInfo chain) | LGTCR §7E (55 lines) | LGTCR-only; level of detail belongs in light-curate.md |
| PGTCR status model + derived-status algorithm | PGTCR §3 (56 lines) | PGTCR-only; belongs in stake-curate.md |
| PGTCR GraphQL queries (§4A–4C, 164 lines) | PGTCR §4 | PGTCR-only; belongs in stake-curate.md |
| Goldsky endpoint URLs (3 chains) | PGTCR §1 | PGTCR-only |
| Scout seed templates (4 registries, 173 lines) | Scout §7 | Scout-only; belongs in scout-registries.md |
| LightGeneralizedTCRView address + usage | Scout §3/§6/§12 | Scout-specific helper; belongs in scout-registries.md |
| Seed-first drafting philosophy | Scout distributed | Scout-specific inversion of MetaEvidence rule |
| Scout incentive programs / profit paths | Scout §1 Why section | Scout-only context |
| Factory deploy walkthroughs | LGTCR §9, PGTCR §9 | Flavor-specific param sets |
| PGTCR admin/governor actions | PGTCR §8.1 | PGTCR-only |
| Stop conditions list | LGTCR §10 | LGTCR-specific; belongs in light-curate.md |
| Key references / academic links | LGTCR §11 | Flavor-specific; belongs in light-curate.md |

---

## Content Gaps Found in Drafts

One genuine gap: `shared-ipfs-upload.md` should reference the `kleros-ipfs-upload` skill as the recommended durable path, but none of the three draft skills mention it (they predate the kleros-ipfs-upload plugin). The content for this section comes from `kleros-ipfs-upload/SKILL.md` lines 8–11 (durability rationale) and from project memory notes about IPFS durability risk. This is the one place where the implementer must write new content beyond lifting from drafts.

No other gaps found — the five stub sections map cleanly to existing draft content.

---

## Writing Quality Checklist (per WRIT requirements)

**WRIT-01 (Imperative form):** Draft skills mix imperative ("Use `eth_getLogs`") with declarative ("The agent must use...") and passive ("This is computed by..."). All shared file content must use imperative: "Call `eth_getLogs`", "Sort by blockNumber descending", "Copy columns verbatim".

**WRIT-02 (Explain WHY):** Draft skills have multiple naked rules ("HARD RULE: always sort and take latest"). Each such rule needs a reason:
- Sort and take latest → "deposit amounts and schema columns change when governors update params; an old log returns stale state"
- Deep-copy columns → "any edit to columns, even fixing a typo in a description, violates the schema contract and may cause dispute resolution to fail"
- `/ipfs/<CID>` not gateway URL → "gateway URLs are mutable; the IPFS protocol is content-addressed and gateway-agnostic"
- `eth_getCode` before declaring EOA → "a contract that deploys and self-destructs returns 0x; a missing contract on the wrong chain returns 0x — both look the same"

**WRIT-03 (Structured lists):** Draft skills use code blocks and markdown headers consistently — good baseline. Replace any remaining markdown tables with structured lists.

**WRIT-04 (Lean content):** Scout §10 (110-line per-action payment tables) repeats what LGTCR §6 already says more concisely. Extract the concise LGTCR version; do not transplant the Scout verbosity.

---

## Common Pitfalls for Implementation

### Pitfall 1: Transplanting Scout's seed-first inversion into shared files
**What goes wrong:** Scout intentionally inverts the MetaEvidence-as-primary rule for item.json drafting. If this gets extracted into shared-item-json.md, it contradicts the LGTCR/PGTCR rule that MetaEvidence is always the source of truth.
**Prevention:** The seed-first rule is Scout-specific and goes in scout-registries.md (Phase 3). shared-item-json.md states the generic rule: "derive columns from MetaEvidence". The Scout parenthetical under LGTCR sections (D-02) can note the exception.

### Pitfall 2: topic0 hash in multiple shared files
**What goes wrong:** The topic0 hash `0x61606860...` currently appears in LGTCR §2A and Scout §4 and §6 Method 3. If it's put into both shared-metaevidence.md and shared-abi-fragments.md, it creates a drift risk.
**Prevention:** Single location: shared-abi-fragments.md (as a comment alongside the MetaEvidence event signature). shared-metaevidence.md points there: "(topic0 and event signature: shared-abi-fragments.md)".

### Pitfall 3: PGTCR's single-MetaEvidence model vs LGTCR's two-stream
**What goes wrong:** PGTCR has a single `metaEvidenceURI` in `arbitrationSettings`. LGTCR has two (registration + clearing). If the two-stream note is written ambiguously, it may confuse PGTCR workflows.
**Prevention:** Two-stream classification goes strictly in `### LGTCR specifics` subsection. PGTCR subsection states: "PGTCR uses a single MetaEvidence URI (via Goldsky or onchain fallback); no registration/clearing distinction."

### Pitfall 4: ABI format migration breaking cross-references
**What goes wrong:** Phase 3 flavor files (light-curate.md, stake-curate.md) will reference shared-abi-fragments.md for specific function signatures. If heading names change during implementation, the pointer text breaks.
**Prevention:** Use predictable heading names. Proposed canonical headings for shared-abi-fragments.md:
  - `## LightGeneralizedTCR` (with `### Read functions`, `### Write functions`, `### Events`)
  - `## PermanentGTCR` (with `### Read functions`, `### Write functions`)
  - `## LightGeneralizedTCRView` (with `### Read functions`)
  - `## IArbitrator`
  - `## Factory contracts`

### Pitfall 5: PGTCR addItem signature confusion
**What goes wrong:** PGTCR `addItem(string _item, uint256 _deposit)` takes two parameters; LGTCR `addItem(string _item)` takes one. If a shared playbook is written that says "call addItem(itemURI)", PGTCR submissions will fail.
**Prevention:** Do not write a shared addItem playbook. shared-deposits.md covers the formula; shared-item-json.md covers the JSON construction; the actual transaction call stays in each flavor's reference file (Phase 3).

---

## Open Questions

1. **LightGTCRFactory ABI inclusion scope**
   - What we know: LightGTCRFactory is in LGTCR §0.5 (16 lines JSON) and is LGTCR-only. PermanentGTCRFactory is PGTCR-only.
   - What's unclear: Should factory ABIs live in shared-abi-fragments.md (all ABIs in one place) or in each flavor's reference file (factory deploy is flavor-specific)?
   - Recommendation: Include both factory ABIs in shared-abi-fragments.md under `## Factory contracts` — convenience of single ABI source outweighs the flavor-specificity concern. Implementer note: add a comment "(LGTCR only)" and "(PGTCR only)" to each factory subsection.

2. **appeal funding in shared-deposits.md vs flavor files**
   - What we know: Appeal funding formula (`requiredForSide = appealCost + appealCost * feeStakeMultiplier / MULTIPLIER_DIVISOR`) is identical in LGTCR and PGTCR. The step-by-step algorithm (getItemInfo → getRequestInfo → getRoundInfo chain) is LGTCR-specific detail.
   - What's unclear: Does the formula alone belong in shared-deposits.md, or does the multi-step algorithm also go there?
   - Recommendation: Formula in shared-deposits.md (shared logic). Step-by-step algorithm in light-curate.md (LGTCR-specific detail, 55 lines in LGTCR §7E). PGTCR appeal algorithm differs (uses `amountPaidRequester/Challenger` from subgraph).

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely documentation/content editing. No external tools, services, or runtimes required beyond a text editor and the existing local files.

---

## Validation Architecture

Step 4: SKIPPED — `workflow.nyquist_validation` key is absent from `.planning/config.json` but this phase produces no executable code. Test coverage is not applicable to documentation extraction work. The verification gate for Phase 2 is manual review of the 5 shared files against the WRIT requirements and the content mapping in this research.

---

## Security Domain

Not applicable — this phase makes no code changes, introduces no dependencies, and handles no user data or secrets. Content being extracted is public skill documentation.

---

## Sources

### Primary (HIGH confidence — direct file reads)
- `curate-v1/curate-light-skill.md` (708 lines) — LGTCR draft, all sections read
- `curate-v1/pgtcr-stake-curate-skill.md` (650 lines) — PGTCR draft, all sections read
- `curate-v1-scout/scout-skills.md` (1008 lines) — Scout draft, all sections read
- `.planning/research/CONTENT-ANALYSIS.md` — overlap analysis, line counts verified against source files
- `.planning/phases/KS-02-shared-references/02-CONTEXT.md` — locked decisions
- `kleros-curate/SKILL.md` (163 lines) — routing skeleton + action index read
- `kleros-curate/references/shared-*.md` (5 stub files) — section headings and source markers read
- `kleros-ipfs-upload/SKILL.md` — durability rationale and x402 mechanism read (lines 1–100)

### No external sources consulted
All content is grounded in direct reads of project files. No web searches required — this is an editorial extraction task, not a framework research task.

---

## Metadata

**Confidence breakdown:**
- Content mapping (what to extract): HIGH — read all source files directly, cross-referenced with CONTENT-ANALYSIS.md
- Estimated line counts: MEDIUM — estimates based on Solidity-style format compression vs JSON; actual may vary ±20%
- Dependency order: HIGH — logical dependencies are clear from content structure
- Gap identification (IPFS skill reference): HIGH — three draft files predate kleros-ipfs-upload; gap confirmed

**Research date:** 2026-05-27
**Valid until:** Stable — source files won't change until Phase 3 begins
