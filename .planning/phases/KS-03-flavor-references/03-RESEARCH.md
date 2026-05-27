# Phase 3: Flavor References - Research

**Researched:** 2026-05-27
**Domain:** Kleros Curate skill content authoring — flavor reference files (LGTCR, PGTCR, Scout)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Hybrid numbered steps + pointers — each operation section shows the full numbered workflow
  with inline one-liners explaining each step, delegating HOW to shared files. Agent sees the complete
  operation sequence from one file load (~150-250 lines per file for LGTCR/PGTCR), loads shared files
  on demand for procedural detail. Matches how the PGTCR draft already structures its operations.
- **D-02:** Section-level pointers from flavor files into shared files — e.g.,
  "shared-deposits.md § LGTCR specifics" rather than bare file-level pointers.
- **D-03:** LGTCR and PGTCR share parallel section ordering (inputs → discovery → operations →
  factory). PGTCR adds unique sections after the shared structure (status model, admin actions,
  withdrawal flow).
- **D-04:** Scout keeps its organic overlay structure (addresses → seed templates → view helper →
  API → images → incentives).
- **D-05:** 300-line TOC threshold. stake-curate.md is expected to exceed (~337 lines) and gets a
  TOC. Other two files stay under 300.
- **D-06:** All 4 seed templates (~170 lines JSON) inline in scout-registries.md.
- **D-07:** Image section keeps only Scout-specific requirements (format, size, what constitutes
  valid visual proof per registry type). Upload mechanics → shared-ipfs-upload.md. ~15 lines.
- **D-08:** All 4 Goldsky GraphQL queries (~140 lines) inline in stake-curate.md with TOC. Queries
  are coupled to the status model.
- **D-09:** PGTCR derived status algorithm as pseudocode block (~35 lines).
- **D-10:** Tiered staleness handling — incentive amounts removed (→ blog.kleros.io), endpoints
  hardcoded, addresses kept, evergreen framing kept.
- **D-11:** Goldsky endpoints hardcoded with current URLs for Mainnet/Gnosis/Sepolia. No
  in-skill discovery pattern.
- **D-12:** Strip all Phase 1 HTML source markers (`<!-- Source: curate-v1/... -->`).
- **D-13:** Scout → Light Curate is the only cross-flavor dependency.
- **D-14:** Three explicit handoffs from shared files that Phase 3 must fulfill:
  - `shared-deposits.md:73` — PGTCR addItem tx call (signature differs from LGTCR)
  - `shared-deposits.md:112` — fundAppeal algorithm (getItemInfo → getRequestInfo → getRoundInfo)
  - `shared-metaevidence.md:99` — Goldsky endpoint URLs

### Claude's Discretion

- Specific ordering of subsections within each flavor file
- How much inline context is "enough" in each hybrid step before the pointer
- Whether to include the Scout submission checklist (14 items in draft §14) as a standalone section
  or fold into operation workflow steps

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLAV-01 | Light Curate reference covering LGTCR operations, factory deploy, schema confirmation check, fundAppeal math | Sections 3.1-3.5 below map each to draft source lines; handoff D-14/shared-deposits.md:112 fulfills fundAppeal; schema confirmation check is unique to LGTCR (draft §3 lines 389-406) |
| FLAV-02 | Stake Curate reference covering PGTCR operations, Goldsky GraphQL, ERC20 mechanics, status model, admin actions | Draft §1 (Goldsky endpoints), §3 (status model), §4A-4C (GraphQL queries), §7A-7C (ERC20+native deposits), §8.1 (admin); all unique to PGTCR; handoffs at shared-deposits.md:73 and shared-metaevidence.md:99 |
| FLAV-03 | Scout reference covering 4 registries, seed templates, LightGeneralizedTCRView helper, scout-api, image guidance | Draft §1 (addresses), §3 (helper), §7 (seed templates), §8 (scout-api), §9 (image guidance); all inline per D-06 |
</phase_requirements>

---

## Summary

Phase 3 fills three stub files by extracting and rewriting flavor-specific content from 2,366 lines of draft material. The draft skills have already been exhaustively analyzed in Phase research — the unique content per flavor is precisely mapped. What remains is the authoring task: apply the hybrid format (D-01), honor section-level pointers (D-02), fulfill the three handoff contracts from Phase 2, and strip cleanup markers (D-12).

The three files are qualitatively different in scope: `light-curate.md` is an operations manual for a list-agnostic contract (~200-250 lines), `stake-curate.md` is a GraphQL-heavy operations manual for a different contract type with a complex status model (~337 lines, needs TOC per D-05), and `scout-registries.md` is a fixed-scope context overlay for 4 known registries (~250-280 lines). None of them duplicate content already in the 5 shared files from Phase 2.

The critical constraint is the boundary between flavor files and shared files: everything about HOW to compute deposits, build item.json, upload to IPFS, or retrieve MetaEvidence belongs in shared files. Flavor files own WHAT operations to call in what order, WHICH function signatures are flavor-specific, and any domain content not generalizable (Goldsky queries, seed templates, status model, factory params).

**Primary recommendation:** author each flavor file as a numbered-workflow document with explicit section-level pointers. The hybrid format (D-01) means a reader loading only the flavor file sees the full operation sequence but delegates procedural depth to shared files — the file is a decision tree of calls, not a tutorial.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| LGTCR numbered operation workflows | light-curate.md | shared-deposits.md, shared-metaevidence.md | Orchestration belongs in flavor; HOW belongs in shared |
| LGTCR schema confirmation check | light-curate.md | shared-item-json.md | Unique LGTCR check not in PGTCR; goes in flavor |
| LGTCR fundAppeal algorithm detail | light-curate.md | shared-deposits.md (formula only) | Handoff D-14/line 112 — step-by-step chain deferred to flavor |
| LGTCR factory deploy steps | light-curate.md | shared-metaevidence.md, shared-ipfs-upload.md | LGTCR-specific param set; orchestration in flavor |
| PGTCR Goldsky endpoint URLs | stake-curate.md | (none) | Handoff D-14/shared-metaevidence.md:99; unique to PGTCR |
| PGTCR GraphQL queries (4) | stake-curate.md | (none) | D-08; coupled to status model; flavor-specific |
| PGTCR derived status algorithm | stake-curate.md | (none) | D-09; unique status model; not present in LGTCR |
| PGTCR ERC20 approval + addItem tx | stake-curate.md | shared-deposits.md (formula) | Handoff D-14/line 73; addItem signature differs from LGTCR |
| PGTCR admin/governor actions | stake-curate.md | (none) | No shared equivalent; flavor-specific |
| PGTCR two-step withdrawal | stake-curate.md | (none) | startWithdrawItem unique to PGTCR |
| Scout 4 registry addresses | scout-registries.md | (none) | Fixed scope unique to Scout |
| Scout seed templates (4) | scout-registries.md | (none) | D-06; core value of Scout file |
| Scout LightGeneralizedTCRView helper | scout-registries.md | shared-abi-fragments.md (ABI) | Address + usage rules Scout-specific |
| Scout scout-api endpoint | scout-registries.md | (none) | Scout-specific optional research tool |
| Scout image guidance | scout-registries.md | shared-ipfs-upload.md (mechanics) | D-07; ~15 lines of Scout-specific requirements only |
| Scout incentives | scout-registries.md | (none) | D-10; evergreen framing + blog link only |
| Deposit computation (all flavors) | shared-deposits.md | (already filled) | Phase 2 complete — do not duplicate |
| MetaEvidence retrieval (all flavors) | shared-metaevidence.md | (already filled) | Phase 2 complete — do not duplicate |
| item.json construction (all flavors) | shared-item-json.md | (already filled) | Phase 2 complete — do not duplicate |
| ABI fragments | shared-abi-fragments.md | (already filled) | Phase 2 complete — do not duplicate |
| IPFS upload mechanics | shared-ipfs-upload.md | (already filled) | Phase 2 complete — do not duplicate |

---

## Standard Stack

No external packages. Phase 3 is pure content authoring — creating markdown files.

### Package Legitimacy Audit

Not applicable — no packages installed in this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
Agent loads SKILL.md (routing)
       │
       ├─ Scout? → loads scout-registries.md AND light-curate.md
       │                │                           │
       │           Scout addresses            LGTCR operations
       │           Seed templates             (shared pointers)
       │           View helper
       │           Scout-api
       │           Image guidance (15 lines)
       │           Incentives (evergreen)
       │
       ├─ PGTCR? → loads stake-curate.md
       │                │
       │           Goldsky endpoints (hardcoded)
       │           GraphQL queries (4 inline)
       │           Status model + derived-status pseudocode
       │           ERC20 approval + addItem tx call
       │           Challenge/evidence/appeal workflows
       │           Admin actions
       │           Factory steps
       │           (shared pointers for deposits/metaevidence/item-json)
       │
       └─ LGTCR? → loads light-curate.md
                        │
                   Inputs + discovery
                   MetaEvidence (pointer → shared-metaevidence.md § LGTCR specifics)
                   item.json (pointer → shared-item-json.md)
                   Deposits (pointer → shared-deposits.md § LGTCR specifics)
                   Submit/challenge/remove/evidence/appeal workflows
                   fundAppeal algorithm (step-by-step — handoff from shared-deposits.md:112)
                   Factory steps
```

### Recommended File Structure After Phase 3

```
kleros-curate/
├── SKILL.md                           # Already filled (Phase 1) — verify section headings match
└── references/
    ├── light-curate.md                # FILL: ~200-250 lines
    ├── stake-curate.md                # FILL: ~337 lines (TOC required per D-05)
    ├── scout-registries.md            # FILL: ~250-280 lines
    ├── shared-metaevidence.md         # DONE (105 lines, Phase 2)
    ├── shared-deposits.md             # DONE (112 lines, Phase 2)
    ├── shared-item-json.md            # DONE (139 lines, Phase 2)
    ├── shared-abi-fragments.md        # DONE (183 lines, Phase 2)
    └── shared-ipfs-upload.md          # DONE (79 lines, Phase 2)
```

---

## Content Map: Draft Lines → Flavor File Sections

### 3.1 light-curate.md — Content Source Map

Source: `curate-v1/curate-light-skill.md` (708 lines)

| Stub Section | Draft Source Lines | Content to Write | Pointer to Shared? |
|---|---|---|---|
| Minimum inputs | §0 (lines 43-73) | What to ask user: existing list vs new, chainId+address or URL, action, field values | No — inputs are LGTCR-specific (Curate UI URL format, `/tcr/<chainId>/<addr>`) |
| Registry discovery | §0.4 (lines 76-95) | eth_getCode + hallmark reads (submissionBaseDeposit, arbitrator); forbidden behavior | No — LGTCR hallmarks differ from PGTCR |
| MetaEvidence retrieval | §1-§2 (lines 194-279) | One-liner: "Fetch MetaEvidence per shared-metaevidence.md § LGTCR specifics. Two-stream rule applies." | Yes → `shared-metaevidence.md § LGTCR specifics` |
| item.json construction | §3 (lines 282-408) | One-liner: "Build item.json per shared-item-json.md." + Schema confirmation check (unique to LGTCR, lines 389-406) | Yes → `shared-item-json.md`, but keep schema confirmation check inline (LGTCR-only) |
| Deposit computation | §6 (lines 481-524) | One-liner table per action + pointer | Yes → `shared-deposits.md § LGTCR specifics` |
| Submit item | §7A (lines 541-549) | Numbered steps 1-9 with one-liners | Pointers to shared files at each step |
| Challenge / remove item | §7B-§7C (lines 553-566) | Numbered steps | Pointers |
| Submit evidence | §7D (lines 565-567) | 2-step workflow | Brief |
| Fund an appeal | §7E (lines 569-626) | Full step-by-step algorithm: Step 0 (getItemInfo→getRequestInfo→getRoundInfo), Step 1 (multiplier selection), Step 2 (remaining = max(totalRequired-paid, 0)), Step 3 (send) — this is Handoff D-14/shared-deposits.md:112 | Inline algorithm, pointer to shared for formula |
| Execute / Withdraw | §7F (lines 622-625) | 2-line summary | No |
| Deploy a new registry (factory) | §9 (lines 641-676) | Numbered steps 1-9 including factory address, two MetaEvidence files, confirm params, simulate, listen for NewGTCR event | Pointers to shared for MetaEvidence prep and IPFS upload |

**What NOT to include from the draft:**
- §0.5 ABI/interface sourcing (lines 97-190) → covered by `shared-abi-fragments.md`
- §4 field-value types → covered by `shared-item-json.md`
- §5 IPFS upload → covered by `shared-ipfs-upload.md`
- §8 duplicate checking (intentionally skips subgraphs, lines 628-638) → [ASSUMED: include as brief note; low content, not in shared files]
- §10 stop conditions → include (LGTCR-specific list); not fully covered by shared files
- §11 references → include; unique LGTCR context links
- HTML source markers (`<!-- Source: ... -->`) → strip per D-12
- "[Phase 2 content here]" placeholders → replace with actual content

**Estimated line count:** ~200-250 lines. No TOC required (under 300-line threshold per D-05).

---

### 3.2 stake-curate.md — Content Source Map

Source: `curate-v1/pgtcr-stake-curate-skill.md` (650 lines)

| Stub Section | Draft Source Lines | Content to Write | Notes |
|---|---|---|---|
| Minimum inputs | §0 (lines 29-40) | Three items: existing vs new list, Goldsky API token (required), action | Goldsky token requirement is PGTCR-specific |
| Registry discovery (PGTCR hallmarks) | §2 (lines 70-87) | eth_getCode + hallmark reads: `token()` (ERC20) + `submissionMinDeposit()`; GraphQL existence test | PGTCR hallmarks differ from LGTCR |
| MetaEvidence retrieval | §5A-§5B (lines 315-336) | Goldsky primary: `registry.arbitrationSettings[0].metaEvidenceURI`; onchain fallback. Pointer to shared. **Goldsky endpoint URLs inline here (Handoff D-14/shared-metaevidence.md:99)** | Yes → `shared-metaevidence.md § PGTCR specifics`, but endpoints hardcoded inline per D-11 |
| item.json construction | §5C (lines 327-339) | One-liner + pointer to shared | Yes → `shared-item-json.md` |
| Deposit and stake computation | §7A-§7C (lines 387-443) | ERC20 approve flow + native msg.value; challenge stake formula; appeal funding remaining calc | Yes → `shared-deposits.md § PGTCR specifics`, but addItem tx call written inline (Handoff D-14/shared-deposits.md:73) |
| PGTCR status model | §3 (lines 90-144) | Onchain status enum (Absent/Submitted/Reincluded/Disputed); derived-status pseudocode algorithm (~35 lines, D-09) | Inline per D-09; evaluation-order dependencies require sequential logic |
| GraphQL queries | §4A-§4C (lines 148-310) | 4 full GraphQL queries inline (~140 lines, D-08): registry params, paginated items, item details | Inline per D-08; coupled to status model |
| Submit item (ERC20 approval + stake) | §8A (lines 445-456) | Numbered steps including explicit "Step N: Approve ERC20 stake → Step N+1: addItem with msg.value = arbitrationCost only" — Handoff D-14/shared-deposits.md:73 | Key PGTCR differentiator vs LGTCR |
| Challenge / remove item | §8B-§8C (lines 458-474) | challengeItem (not challengeRequest — PGTCR uses different function name) | Note function name difference from LGTCR |
| Submit evidence | §8C (line 471-473) | One step | — |
| Fund appeal | §8D (lines 469-470) | One-liner + pointer to shared formula + status model query | — |
| Start / execute withdrawal (PGTCR unique) | §8E-§8F (lines 471-478) | Two-step: startWithdrawItem → wait withdrawingPeriod → withdrawItem | Unique to PGTCR; no LGTCR equivalent |
| Withdraw fees & rewards | §8G (lines 479-480) | Note _challengeID is uint120 (different from LGTCR _requestID) | — |
| Admin actions | §8.1 (lines 488-510) | changeArbitrationParams, economic params, period params, changeGovernor | Governor-only actions |
| Deploy a new registry (factory) | §9 (lines 512-540) | Single MetaEvidence (no registration/clearing split unlike LGTCR); 4 periods array; 4 stakeMultipliers; returns instance address | Differs from LGTCR factory in several params |
| Onchain fallbacks | §10 (lines 542-558) | Three fallbacks: MetaEvidence logs, arbitrationParamsChanges index logic, getRoundAmountPaid | Unique to PGTCR (needed because GraphQL may lag) |

**Goldsky endpoint URLs to hardcode (D-11):**
```
Mainnet: https://api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/pgtcr-mainnet/v0.0.1/gn
Gnosis:  https://api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/pgtcr-gnosis/v0.0.1/gn
Sepolia: https://api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/pgtcr-sepolia/v0.0.2/gn
```
(Replace `/api/public/` with `/api/private/` + Authorization header when using Goldsky token.)

**What NOT to include from the draft:**
- §6 IPFS upload → covered by `shared-ipfs-upload.md`
- ABI fragments (minimal ABI section) → covered by `shared-abi-fragments.md`
- §Non-negotiables (most) → covered by `SKILL.md`
- HTML source markers → strip per D-12

**Estimated line count:** ~337 lines. TOC required per D-05.

---

### 3.3 scout-registries.md — Content Source Map

Source: `curate-v1-scout/scout-skills.md` (1,008 lines)

| Stub Section | Draft Source Lines | Content to Write | Notes |
|---|---|---|---|
| Overview | §intro + §Why this matters (lines 1-67) | Why Scout matters (ecosystem, 700k+ entries, Etherscan/Ledger/Blockscout); the two-file loading rule ("also load light-curate.md") | Keep ecosystem context; strip specific incentive amounts (D-10) |
| The 4 registry addresses | §1 (lines 69-78) | Gnosis chainId 100 + 4 addresses: ATQ, Address Tags, Kleros Tokens, CDN | Keep addresses verbatim per D-10 (immutable deployed contracts) |
| Seed-first submission pattern | §15 blunt summary + §4 (lines 59-67, 382-378) | Describe seed-first inversion: use embedded template as primary JSON source; fetch MetaEvidence as cross-check; stop and escalate if they diverge | D-06; explain WHY (seeds include full columns+values shape, safer than MetaEvidence inference) |
| item.json templates per registry | §7 (lines 385-552) | All 4 seed templates inline (~170 lines JSON): ATQ, Address Tags, Kleros Tokens, CDN | D-06; inline because templates ARE the core value |
| LightGeneralizedTCRView helper | §3 (lines 120-181) + §6 Method 2 (lines 329-343) + §12 (lines 930-936) | Address `0xB32e38B08FcC7b7610490f764b0F9bFd754dCE53`, function list (fetchArbitrable, getItem, getLatestRequestData, getLatestRoundRequestData, availableRewards), usage rule and fallback rule | Per shared-abi-fragments.md note; address hardcoded because it's an immutable deployment |
| scout-api integration | §8 optional research (lines 604-627) | POST to `https://scout-api.kleros.link/api/address-tags`, chains array, limitation (not canonical, not a hard gate) | Optional pre-submission research tool |
| Image guidance | §9 (lines 638-699) — Scout-specific requirements only | ~15 lines: token logos (PNG, ≥128×128, square); CDN visual proof (screenshot of exact domain/subdomain page, address context visible). For upload mechanics → shared-ipfs-upload.md | D-07; only Scout-specific requirements |
| Incentives | §Why people care (lines 27-55) | Three profit paths (project visibility, submitter upside, challenger upside) as evergreen framing; no specific amounts; redirect to blog.kleros.io for current campaign terms | D-10; strip "300k PNK/month" and any current figures |

**Scout submission checklist consideration (Claude's Discretion):**
- Draft §14 (lines 969-985) contains 14 items
- Recommendation: include as a standalone section — it synthesizes the full Scout workflow into a
  pre-flight checklist that has high value density relative to its line count (~20 lines)
- It is additive, not duplicative of LGTCR content (which has its own stop conditions)

**What NOT to include from the Scout draft:**
- §2 hard rules → most covered by SKILL.md non-negotiables
- §4 runtime bootstrap → operational detail covered by light-curate.md + shared files
- §5-§6 deposit rules and fetch methods → covered by shared-deposits.md and shared-metaevidence.md
- §8 JSON drafting rules → covered by shared-item-json.md
- §9 upload mechanics → covered by shared-ipfs-upload.md (keep only §9 image specs)
- §10 transaction execution rules → covered by light-curate.md operations via LGTCR
- §11-§12 action methods and read methods → covered by light-curate.md
- §13 ABI limitations → keep as a brief note (agents must know ABI-only search doesn't work in Curate)
- §15 blunt summary → fold into Overview
- HTML source markers → strip per D-12

**Estimated line count:** ~250-280 lines. No TOC required (under 300-line threshold per D-05).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead (from Shared Files) |
|---------|-------------|--------------------------------|
| Deposit formula | Custom per-flavor deposit calculation | `shared-deposits.md § LGTCR specifics` or `§ PGTCR specifics` |
| MetaEvidence retrieval | Repeat eth_getLogs instructions | `shared-metaevidence.md § LGTCR specifics` or `§ PGTCR specifics` |
| item.json construction rules | Custom per-flavor JSON building instructions | `shared-item-json.md` |
| IPFS upload mechanics | Custom upload flow | `shared-ipfs-upload.md` |
| ABI fragments | Custom ABI listing | `shared-abi-fragments.md` |
| image type description | Per-flavor type mapping | `shared-item-json.md § Field-value types` |

**Key insight:** Flavor files own workflow orchestration; shared files own procedures. Every line of procedural content in a flavor file is a duplication risk and a drift hazard.

---

## Common Pitfalls

### Pitfall 1: Duplicating Shared Content
**What goes wrong:** Author copies deposit formula, MetaEvidence steps, or IPFS instructions into flavor file.
**Why it happens:** Draft skills contain the full content; it's tempting to copy-paste rather than pointer-ify.
**How to avoid:** For each section, first check if the content exists in a shared file. If yes, write a one-liner + section-level pointer.
**Warning signs:** A flavor file section exceeds 10 lines for anything covered by shared files.

### Pitfall 2: Mislabeling Phase 2 Placeholders as Out of Scope
**What goes wrong:** The stub for light-curate.md has sections labeled "[Phase 2 content here]" — these are Phase 3 scope (the stub was created in Phase 1 and placeholders were not updated).
**Why it happens:** Placeholder text is misleading.
**How to avoid:** All "[Phase 2 content here]" markers in the 3 flavor stubs are Phase 3 scope. Treat them as "[Phase 3 content here]". The CONTEXT.md domain section explicitly confirms this.

### Pitfall 3: Missing the Three Handoff Contracts
**What goes wrong:** Author writes flavor sections without fulfilling the explicit handoffs from Phase 2 shared files.
**Why it happens:** Handoff points are embedded in shared files, not visible when reading stubs.
**How to avoid:** Three mandatory callouts:
1. `stake-curate.md` "Submit item" section MUST include the full `addItem(itemURI, depositStake)` tx call with separate ERC20 approve step — per `shared-deposits.md:73`.
2. `light-curate.md` "Fund an appeal" section MUST include the step-by-step algorithm (getItemInfo → getRequestInfo → getRoundInfo chain) — per `shared-deposits.md:112`.
3. `stake-curate.md` "MetaEvidence retrieval" section MUST include the Goldsky endpoint URLs for Mainnet/Gnosis/Sepolia — per `shared-metaevidence.md:99`.

### Pitfall 4: Section Headings Mismatch with SKILL.md Routing
**What goes wrong:** Flavor file section headings differ from what SKILL.md action index references, breaking the routing.
**Why it happens:** Author renames sections for clarity.
**How to avoid:** SKILL.md action index references flavor files but does not specify exact section anchors. The stub headings in the Phase 1 stubs define the expected structure — use those as the baseline, filling content while preserving heading text.

### Pitfall 5: Including Specific Incentive Amounts in Scout
**What goes wrong:** Scout incentives section includes specific figures like "300k PNK/month".
**Why it happens:** Figure appears prominently in the draft (lines 33-39).
**How to avoid:** Per D-10, replace all incentive figures with "For current campaign terms and reward amounts, check blog.kleros.io" and keep only the evergreen structural framing (three profit paths).

### Pitfall 6: Wrong PGTCR Function Names
**What goes wrong:** Using `challengeRequest` in PGTCR workflows (LGTCR name) instead of `challengeItem`.
**Why it happens:** The function names are parallel in purpose but different in name. PGTCR uses `challengeItem`, not `challengeRequest`.
**How to avoid:** PGTCR `shared-abi-fragments.md` write functions section is explicit: `challengeItem(bytes32 _itemID, string _evidence)` for PGTCR; `challengeRequest(bytes32 _itemID, string _evidence)` for LGTCR.

### Pitfall 7: Wrong `withdrawFeesAndRewards` Signature for PGTCR
**What goes wrong:** Using `_requestID` as uint256 for PGTCR (LGTCR signature) instead of `_challengeID` as uint120.
**Why it happens:** Both contracts have a `withdrawFeesAndRewards` function; the parameter differs.
**How to avoid:** `shared-abi-fragments.md` documents the difference explicitly:
- LGTCR: `withdrawFeesAndRewards(address _beneficiary, bytes32 _itemID, uint256 _requestID, uint256 _roundID)`
- PGTCR: `withdrawFeesAndRewards(address _beneficiary, bytes32 _itemID, uint120 _challengeID, uint256 _roundID)`

---

## Code Examples

### Hybrid Format Pattern (D-01)

Verified from CONTEXT.md D-01 description and PGTCR draft §8A structure:

```markdown
## Submit item

To submit an item to a LGTCR registry:

1. **Fetch MetaEvidence** — get schema (columns) and policy URI.
   See `shared-metaevidence.md § LGTCR specifics` for the full retrieval procedure.
   Use `_metaEvidenceID = 0` for registration (addItem) flow.

2. **Read policy** — fetch the `fileURI` document and confirm the item complies.
   Do not build item.json before reading the policy.

3. **Build item.json** — construct the full `{ columns, values }` payload.
   See `shared-item-json.md` for the deep-copy rule and output protocol.
   Run the schema confirmation check (see below) before first submission.

4. **Upload item.json to IPFS** → get `/ipfs/<CID>`.
   See `shared-ipfs-upload.md` for upload options and the submission format rule.

5. **Compute deposit** — read `submissionBaseDeposit()` + `arbitrationCost()` live.
   See `shared-deposits.md § LGTCR specifics` for formulas and the never-guess rule.

6. **Simulate** — dry-run with identical calldata + msg.value before submitting.

7. **Submit** — call `addItem("/ipfs/<CID>")` with `msg.value = deposit`.
   (ABI: `function addItem(string _item) external payable` — see `shared-abi-fragments.md`)
```

### Section-Level Pointer Pattern (D-02)

```markdown
## Deposit computation

Compute deposits from live onchain reads — never cache or estimate.

For LGTCR deposit formulas and the arbitrationCost read sequence:
→ `shared-deposits.md § LGTCR specifics`

Quick reference for `addItem`: `msg.value = submissionBaseDeposit() + arbitrationCost`.
```

### PGTCR fundAppeal Handoff (Handoff D-14/shared-deposits.md:112)

This algorithm must appear in `stake-curate.md`:

```markdown
## Fund an appeal

For the appeal funding formula: → `shared-deposits.md § Appeal funding`

Step-by-step algorithm:

1. Read `getItemInfo(itemID)` → `numberOfRequests`. Set `requestID = numberOfRequests - 1`.
2. Read `getRequestInfo(itemID, requestID)` → `disputed`, `disputeID`, `numberOfRounds`, `ruling`,
   `requestArbitrator`, `requestArbitratorExtraData`.
   If `disputed == false`: no appeal to fund — stop.
3. Set `roundID = numberOfRounds - 1`.
4. Read `getRoundInfo(itemID, requestID, roundID)` → `amountPaid[3]`, `hasPaid[3]`.
5. From `requestArbitrator`: call `appealCost(disputeID, requestArbitratorExtraData)`.
   Optionally: `currentRuling(disputeID)` and `appealPeriod(disputeID)` → `(start, end)`.
6. Compute `totalRequired` per the formula in `shared-deposits.md § Appeal funding`.
7. `remaining = hasPaid[side] ? 0 : max(totalRequired - amountPaid[side], 0)`.
8. Call `fundAppeal(itemID, side)` with `msg.value = remaining`. Simulate first.

Party enum: 0 = None, 1 = Requester, 2 = Challenger. Never fund None.
```

### PGTCR addItem Handoff (Handoff D-14/shared-deposits.md:73)

This tx call must appear in `stake-curate.md`:

```markdown
## Submit item (ERC20 approval + stake)

PGTCR uses two separate assets — approve ERC20 first, then send native msg.value for arbitration.
This two-step flow differs from LGTCR which uses only native token.

1. Query registry via Goldsky (GraphQL query 4A) → get `token`, `submissionMinDeposit`, arbitration settings.
2. Fetch MetaEvidence URI from `registry.arbitrationSettings[0].metaEvidenceURI`.
   See `shared-metaevidence.md § PGTCR specifics` for fetch procedure.
3. Build item.json → upload to IPFS.
   See `shared-item-json.md` and `shared-ipfs-upload.md`.
4. Decide stake amount: `depositStake >= submissionMinDeposit()`. May stake more (signals confidence).
   Confirm the user understands the stake is locked until withdrawal.
5. **Approve ERC20 stake:**
   `ERC20.approve(registryAddress, depositStake)`
6. Compute `arbitrationCost = arbitrator.arbitrationCost(arbitratorExtraData)` live.
   See `shared-deposits.md § PGTCR specifics` for the arbitrationCost read sequence.
7. Simulate then call:
   `addItem("/ipfs/<CID>", depositStake)` with `msg.value = arbitrationCost`
   (ABI: `function addItem(string _item, uint256 _deposit) external payable` — see `shared-abi-fragments.md`)
```

---

## State of the Art

No external framework changes. This phase is content authoring within an established pattern.

| Prior State | Current State | What Changed |
|-------------|---------------|--------------|
| 3 flavor files are stubs (45 lines each, placeholders) | 3 filled flavor files (~200-337 lines each) | Phase 3 fills them |
| Phase 2 shared files have 3 explicit handoff TODOs | Handoffs fulfilled | Each handoff resolves in the corresponding flavor section |
| Draft skills contain ~750 lines of duplication | Flavor files contain zero shared-file duplication | Hybrid format + pointers eliminate drift |
| "[Phase 2 content here]" markers in light-curate.md stub | Removed, replaced with actual content | Clarified in CONTEXT.md domain section |
| HTML source markers in all 3 stubs | Stripped per D-12 | Git blame preserves provenance |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Including the Scout submission checklist (§14, 14 items) as a standalone section — recommended under Claude's Discretion | scout-registries.md sections | Minor: if omitted, pre-flight verification stays implicit; risk is agent skips steps not errors |
| A2 | light-curate.md "Duplicate checking" note (~5 lines from draft §8) warrants brief inclusion as a standalone note | light-curate.md | Minor: information is useful but omitting it doesn't break any workflow |
| A3 | PGTCR "Onchain fallbacks" section (when GraphQL is down) should be included in stake-curate.md | stake-curate.md | Medium: if omitted, agents have no recovery path when Goldsky is unavailable |

---

## Open Questions

1. **Scout submission checklist placement**
   - What we know: 14-item checklist in draft §14; Claude's Discretion area
   - What's unclear: Whether it should be a standalone "Submission checklist" section or distributed across operation step callouts
   - Recommendation: Standalone section — dense checklists scan better than distributed inline callouts, and agents frequently search for pre-submission validation

2. **PGTCR TOC structure**
   - What we know: stake-curate.md expected at ~337 lines, TOC required per D-05
   - What's unclear: Exact TOC heading order — CONTEXT.md D-03 says parallel structure with LGTCR for shared sections, PGTCR-unique sections after
   - Recommendation: TOC order: Minimum inputs → Registry discovery → MetaEvidence retrieval → item.json construction → Deposit and stake computation → Status model → GraphQL queries → Submit item → Challenge item → Submit evidence → Fund appeal → Start/execute withdrawal → Withdraw fees → Admin actions → Deploy new registry → Onchain fallbacks

3. **light-curate.md stop conditions**
   - What we know: LGTCR draft §10 has 7 stop conditions; SKILL.md non-negotiables cover the core rules
   - What's unclear: How much overlap exists between SKILL.md non-negotiables and the flavor stop conditions
   - Recommendation: Include LGTCR stop conditions in flavor file (7 lines); they are operationally specific (simulation disagreement, unresolved itemID, MetaEvidence missing) rather than principle-level

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is pure content authoring with no external tool dependencies.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` (key absent). Treating as enabled.

This phase produces markdown files, not executable code. There are no unit tests for skill content. The validation architecture for this phase is manual-only inspection.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual review only — no automated test framework applies |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLAV-01 | light-curate.md covers all LGTCR operations | manual | Read file, verify sections present, verify 3 handoff contracts | ❌ content to be created |
| FLAV-02 | stake-curate.md covers PGTCR operations + GraphQL + ERC20 + status model | manual | Read file, verify Goldsky endpoints present, verify addItem tx call present | ❌ content to be created |
| FLAV-03 | scout-registries.md covers 4 registries + seed templates + helper + api + images | manual | Read file, verify 4 seed templates present, verify view helper address present | ❌ content to be created |

### Wave 0 Gaps

None — no test infrastructure is applicable. Verification is per the `/gsd:verify-work` phase gate:
- [ ] `light-curate.md` — verify all stub headings filled, no "[Phase X content here]", no HTML source markers, handoff D-14/shared-deposits.md:112 fulfilled
- [ ] `stake-curate.md` — verify TOC present (file > 300 lines), Goldsky endpoints hardcoded, addItem tx call present (handoff D-14/shared-deposits.md:73), GraphQL queries inline, status pseudocode inline
- [ ] `scout-registries.md` — verify 4 seed templates inline, view helper address present, incentive amounts replaced with blog link, image section ≤15 lines of Scout-specific requirements

---

## Security Domain

No security considerations apply — this phase creates markdown documentation files with no executable code, no credentials, and no network access.

---

## Sources

### Primary (HIGH confidence)

- `curate-v1/curate-light-skill.md` (708 lines) — LGTCR source material, fully read
- `curate-v1/pgtcr-stake-curate-skill.md` (650 lines) — PGTCR source material, fully read
- `curate-v1-scout/scout-skills.md` (1,008 lines) — Scout source material, fully read
- `kleros-curate/references/shared-deposits.md` (112 lines) — Phase 2 output, handoff lines verified
- `kleros-curate/references/shared-metaevidence.md` (105 lines) — Phase 2 output, handoff line verified
- `kleros-curate/references/shared-item-json.md` (139 lines) — Phase 2 output, read
- `kleros-curate/references/shared-abi-fragments.md` (183 lines) — Phase 2 output, function name differences verified
- `kleros-curate/references/shared-ipfs-upload.md` (79 lines) — Phase 2 output, read
- `kleros-curate/SKILL.md` — Phase 1 output, routing and action index verified
- `.planning/phases/KS-03-flavor-references/03-CONTEXT.md` — 14 locked decisions read
- `.planning/REQUIREMENTS.md` — FLAV-01/02/03 read
- `.planning/research/CONTENT-ANALYSIS.md` — unique-content-per-file analysis read
- `.planning/research/SUMMARY.md` — platform constraints and architecture decision read
- `.planning/research/SKILL-DESIGN.md` — platform constraints read

### Secondary (MEDIUM confidence)

- `.planning/research/SKILL-DESIGN.md` — 300-line TOC threshold confirmed via WRIT-03 requirement in REQUIREMENTS.md

---

## Metadata

**Confidence breakdown:**
- Content source mapping: HIGH — all source files read, line ranges identified
- Handoff contract locations: HIGH — grep confirmed exact line numbers in shared files
- Estimated line counts: MEDIUM — estimates from source analysis; actual output may vary ±20%
- Section ordering: MEDIUM for PGTCR TOC (recommended order, Claude's Discretion applies)

**Research date:** 2026-05-27
**Valid until:** N/A — source files are stable; no external dependencies
