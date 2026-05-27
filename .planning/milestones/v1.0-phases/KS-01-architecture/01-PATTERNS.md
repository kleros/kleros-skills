# Phase 1: Architecture - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 9 (1 SKILL.md + 8 reference stubs)
**Analogs found:** 9 / 9 (all have usable analogs or source material)

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `kleros-curate/SKILL.md` | skill entry-point | request-response | `kleros-ipfs-upload/SKILL.md` | exact |
| `kleros-curate/references/light-curate.md` | reference/doc | on-demand read | `curate-v1/curate-light-skill.md` | role-match (source material) |
| `kleros-curate/references/stake-curate.md` | reference/doc | on-demand read | `curate-v1/pgtcr-stake-curate-skill.md` | role-match (source material) |
| `kleros-curate/references/scout-registries.md` | reference/doc | on-demand read | `curate-v1-scout/scout-skills.md` | role-match (source material) |
| `kleros-curate/references/shared-metaevidence.md` | reference/doc | on-demand read | `curate-v1/curate-light-skill.md` §1-§2 | partial (content origin) |
| `kleros-curate/references/shared-deposits.md` | reference/doc | on-demand read | `curate-v1/curate-light-skill.md` §4-§5 | partial (content origin) |
| `kleros-curate/references/shared-item-json.md` | reference/doc | on-demand read | `curate-v1/curate-light-skill.md` §3 | partial (content origin) |
| `kleros-curate/references/shared-abi-fragments.md` | reference/doc | on-demand read | `curate-v1/curate-light-skill.md` + `pgtcr-stake-curate-skill.md` ABI sections | partial (content origin) |
| `kleros-curate/references/shared-ipfs-upload.md` | reference/doc | on-demand read | `kleros-ipfs-upload/SKILL.md` (guidance pattern) | role-match |

---

## Pattern Assignments

### `kleros-curate/SKILL.md` (skill entry-point, request-response)

**Analog:** `kleros-ipfs-upload/SKILL.md`

**YAML frontmatter pattern** (lines 1-3 of analog):
```markdown
---
name: kleros-ipfs-upload
description: Upload files to IPFS through the Kleros x402 payment gateway in exchange for $0.01 USDC on Base mainnet. Use this skill **specifically** when ... Do NOT trigger for ... Exception: if ...
---
```
Copy: two-field YAML (`name`, `description`). Description is third-person, "pushy", includes positive triggers, negative triggers, and exception clause. No `when_to_use` field (defer to Phase 4). Phase 1 uses a working-draft placeholder description — not the final Phase 4 version.

**Title + intro paragraph pattern** (lines 6-10 of analog):
```markdown
# Kleros IPFS Upload (x402)

Upload Kleros-ecosystem files to IPFS via `https://...`, an x402-protected gateway that charges $0.01 USDC per upload on Base mainnet. The returned IPFS CID is content-addressable ...
```
Copy: H1 title + 1-3 sentence operational summary immediately after the frontmatter. For `kleros-curate/SKILL.md` this becomes the "Curate in a nutshell" block (~15 lines, D-09). Best prose source: `curate-v1-scout/scout-skills.md` lines 5-19 (deposit/challenge/arbitration cycle explained clearly — compress to ~15 lines).

**"When to use / when NOT to use" pattern** (lines 13-31 of analog):
```markdown
## When to use this skill
- Dispute **evidence** attachments — ...

## When NOT to use this skill
- Generic "store this file on IPFS" / "get me a CID" ...
```
For `kleros-curate/SKILL.md`: this pattern is replaced by the **Non-negotiables** section (D-10) and the **Routing decision tree** (D-01 through D-05). The non-negotiables go first (must survive post-compaction re-attachment), routing second. Do NOT embed flavor-specific details (function signatures, addresses) — those go in reference files.

**Section ordering to copy:**
```
YAML frontmatter
# Title

[Curate in a nutshell ~15 lines]

## Non-negotiables
[6 cross-flavor safety rules — see non-negotiables block below]

## Which Curate flavor are you using?
[routing decision tree — see routing pattern below]

## Action index
[structured list: intent → reference file, with grep patterns]

## Reference files
[brief description of each of the 8 files]
```

**Non-negotiables block** — source: `curate-v1/curate-light-skill.md` lines 11-23:
```markdown
## Non-negotiables
- **Never guess / invent / approximate** amounts, addresses, schemas, or parameters.
- **Onchain state + onchain logs are the source of truth** for deposits, arbitration cost, challenge deposits, appeal status, and MetaEvidence URI.
- **Never assume a "standard token schema"** — only the current MetaEvidence is authoritative.
- **Never rewrite the schema**: `item.json.columns` must be copied verbatim from MetaEvidence; only `values` is dynamic.
- **Never include "typical ranges" / estimates** for deposits or fees — only report live-read values.
- **`eth_getCode` before declaring any address is or isn't a contract.**
```

**Routing decision tree pattern** — from RESEARCH.md Architecture Patterns section:
```markdown
## Which Curate flavor are you using?

**Step 1 — Keyword scan (zero cost)**
- Mentions "Scout", "token list", "address tags", "CDN"
  → **Scout** (overlay on Light Curate)
  → Read `references/scout-registries.md` AND `references/light-curate.md`
- Mentions "PGTCR", "Stake Curate", "PermanentGTCR", "Goldsky"
  → **Stake Curate (PGTCR)**
  → Read `references/stake-curate.md`
- Mentions "Curate", "LGTCR", "LightGeneralizedTCR", "Light Curate", registry, "addItem"
  → **Light Curate (LGTCR)** (also the default)
  → Read `references/light-curate.md`

**Step 2 — Ambiguous ("Curate" with no flavor hint)**
- Interactive session: ask "Which Curate flavor? Light Curate (optimistic challenge window), Stake Curate (permanent ERC20 stake), or Scout (4 Gnosis registries for contract/token tagging)?"
- One-shot / non-interactive: default Light Curate, then:
  - If user provides a contract address: check if it matches one of the 4 Scout registry addresses → load Scout overlay
  - If contract introspection reveals PGTCR hallmarks → pivot to Stake Curate (see references/stake-curate.md for hallmarks)
  - Otherwise: proceed as Light Curate

**Step 3 — Contract-type verification (if address provided)**
See the flavor reference file for hallmark calls. SKILL.md does NOT embed function signatures here (D-05).
```

**Action index pattern** — from RESEARCH.md Code Examples section:
```markdown
## Action index

**Submit item** → `references/light-curate.md` (LGTCR) or `references/stake-curate.md` (PGTCR)
**Challenge / remove item** → flavor reference file
**Submit evidence** → flavor reference file
**Fund an appeal** → flavor reference file
**Deploy a new registry** → flavor reference file (factory section)
**Fetch MetaEvidence (policy + schema)** → `references/shared-metaevidence.md`
**Compute deposits** → `references/shared-deposits.md`
**Build item.json** → `references/shared-item-json.md`
**Upload to IPFS** → `references/shared-ipfs-upload.md`
**ABI / function signatures** → `references/shared-abi-fragments.md`
  grep: `grep -n "function\|event" references/shared-abi-fragments.md`
**Scout registry addresses + seed templates** → `references/scout-registries.md`
  grep: `grep -n "0x\|ATQ\|Address Tags\|Tokens\|CDN" references/scout-registries.md`
```
Note: structured list, NOT markdown table (D-12). Grep patterns inline for large files only.

---

### `kleros-curate/references/light-curate.md` (reference/doc, on-demand read)

**Analog:** `curate-v1/curate-light-skill.md` (source material, 708 lines)

**Stub structure pattern** — from RESEARCH.md Reference File Stub Structure:
```markdown
# Light Curate (LightGeneralizedTCR)
<!-- Source: curate-v1/curate-light-skill.md -->

## Contents
[TOC placeholder — filled once content is added in Phase 2-3]

## Minimum inputs
<!-- Source: curate-v1/curate-light-skill.md §0 -->
What to ask the user before proceeding.

## Registry discovery
<!-- Source: curate-v1/curate-light-skill.md §0.4 -->
eth_getCode + hallmark read (submissionBaseDeposit, arbitrator).

## MetaEvidence retrieval
<!-- Source: curate-v1/curate-light-skill.md §1-§2 -->
[See shared-metaevidence.md — flavor-specific: two-stream classification (registration vs clearing MetaEvidence IDs)]

## item.json construction
<!-- Source: curate-v1/curate-light-skill.md §3 -->
[See shared-item-json.md — flavor-specific: schema confirmation check via NewItem event sample]

## Submit item
<!-- Source: curate-v1/curate-light-skill.md §6 -->
[Phase 2 content here]

## Challenge / remove item
<!-- Source: curate-v1/curate-light-skill.md §7-§8 -->
[Phase 2 content here]

## Submit evidence
<!-- Source: curate-v1/curate-light-skill.md §9 -->
[Phase 2 content here]

## Fund an appeal
<!-- Source: curate-v1/curate-light-skill.md §10 -->
[Phase 2 content here]

## Deploy a new registry (factory)
<!-- Source: curate-v1/curate-light-skill.md §factory -->
[Phase 2 content here]
```
Each heading gets a `<!-- Source: ... -->` comment (D-14). One-liner description per section (D-13). Target: 20-40 lines total. Phase 1 contains NO copy-pasted content from draft files — headings + one-liners + source markers only.

---

### `kleros-curate/references/stake-curate.md` (reference/doc, on-demand read)

**Analog:** `curate-v1/pgtcr-stake-curate-skill.md` (source material, 650 lines)

**Stub structure** — same pattern as light-curate.md, adapted to PGTCR:
```markdown
# Stake Curate (PermanentGTCR / PGTCR)
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md -->

## Contents
[TOC placeholder]

## Minimum inputs
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §0 -->
What to ask the user before proceeding.

## Registry discovery (PGTCR hallmarks)
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §0.x -->
token() (ERC20) + submissionMinDeposit() identify PGTCR contracts.

## MetaEvidence retrieval
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §1 -->
[Goldsky subgraph primary; onchain eth_getLogs fallback]

## item.json construction
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §3 -->
[See shared-item-json.md]

## Submit item (ERC20 approval + stake)
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §6 -->
[Phase 3 content here]

## Challenge / remove item
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §7-§8 -->
[Phase 3 content here]

## Deploy a new registry (factory)
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §factory -->
[Phase 3 content here]
```

---

### `kleros-curate/references/scout-registries.md` (reference/doc, on-demand read)

**Analog:** `curate-v1-scout/scout-skills.md` (source material, 1,008 lines)

**Stub structure:**
```markdown
# Scout Registries (Gnosis)
<!-- Source: curate-v1-scout/scout-skills.md -->

## Overview
<!-- Source: curate-v1-scout/scout-skills.md §intro -->
Scout IS LightGeneralizedTCR on Gnosis. This file = Scout-specific overlay; also load references/light-curate.md for all contract operations.

## The 4 registry addresses
<!-- Source: curate-v1-scout/scout-skills.md §addresses -->
Four known Gnosis registry contract addresses for contract address lookup routing.

## Seed-first submission pattern
<!-- Source: curate-v1-scout/scout-skills.md §seed-first -->
[Phase 3 content here — seed template → prefill → submit flow]

## item.json templates per registry
<!-- Source: curate-v1-scout/scout-skills.md §templates -->
[Phase 3 content here]

## Image guidance
<!-- Source: curate-v1-scout/scout-skills.md §images -->
[Phase 3 content here]

## Incentives (current campaign)
<!-- Source: curate-v1-scout/scout-skills.md §incentives -->
[Phase 3 content — direct to blog.kleros.io, do not guess amounts]
```

---

### `kleros-curate/references/shared-metaevidence.md` (reference/doc, on-demand read)

**Analog:** `curate-v1/curate-light-skill.md` §1-§2 + `curate-v1-scout/scout-skills.md` §4+§6

**Stub structure** — from RESEARCH.md Code Examples:
```markdown
# Shared: MetaEvidence Retrieval
<!-- Source: curate-v1/curate-light-skill.md §1-§2, curate-v1-scout/scout-skills.md §4+§6, curate-v1/pgtcr-stake-curate-skill.md §1 -->

## Contents
- RPC log method (eth_getLogs, topic0)
- Sort + take-latest rule
- Two-stream classification (LGTCR registration vs clearing MetaEvidence IDs)
- PGTCR GraphQL path (Goldsky primary, onchain fallback)
- MetaEvidence JSON parsing
- Policy URI extraction

## RPC log method (eth_getLogs)
<!-- Source: curate-v1/curate-light-skill.md §1 -->
[Phase 2 content here]

## Sort and take-latest rule
<!-- Source: curate-v1/curate-light-skill.md §2A -->
[Phase 2 content here]

## Two-stream classification (LGTCR)
<!-- Source: curate-v1/curate-light-skill.md §2B -->
[Phase 2 content here]

## PGTCR GraphQL path (Goldsky)
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §1 -->
[Phase 2 content here]

## MetaEvidence JSON parsing
<!-- Source: curate-v1/curate-light-skill.md §2C -->
[Phase 2 content here]
```

---

### `kleros-curate/references/shared-deposits.md` (reference/doc, on-demand read)

**Analog:** `curate-v1/curate-light-skill.md` §4-§5

**Stub structure:**
```markdown
# Shared: Deposit Computation
<!-- Source: curate-v1/curate-light-skill.md §4-§5, curate-v1/pgtcr-stake-curate-skill.md §deposit -->

## Contents
- Submission deposit formula (LGTCR)
- Challenge deposit formula (LGTCR)
- PGTCR stake vs deposit distinction
- Arbitration cost read (arbitrationCost())
- msg.value assembly rule

## Submission deposit (LGTCR)
<!-- Source: curate-v1/curate-light-skill.md §4 -->
[Phase 2 content here]

## Challenge deposit (LGTCR)
<!-- Source: curate-v1/curate-light-skill.md §5 -->
[Phase 2 content here]

## PGTCR stake vs deposit
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §deposit -->
[Phase 2 content here]

## msg.value assembly
<!-- Source: curate-v1/curate-light-skill.md §4-§5 -->
[Phase 2 content here]
```

---

### `kleros-curate/references/shared-item-json.md` (reference/doc, on-demand read)

**Analog:** `curate-v1/curate-light-skill.md` §3

**Stub structure:**
```markdown
# Shared: item.json Construction
<!-- Source: curate-v1/curate-light-skill.md §3, curate-v1/pgtcr-stake-curate-skill.md §3 -->

## Contents
- item.json schema (columns + values)
- columns verbatim-copy rule (never rewrite)
- values population from user input
- Schema confirmation via NewItem event sampling

## item.json schema
<!-- Source: curate-v1/curate-light-skill.md §3A -->
[Phase 2 content here]

## columns verbatim-copy rule
<!-- Source: curate-v1/curate-light-skill.md §3B -->
[Phase 2 content here]

## values population
<!-- Source: curate-v1/curate-light-skill.md §3C -->
[Phase 2 content here]

## Schema confirmation (NewItem event sampling)
<!-- Source: curate-v1/curate-light-skill.md §3D -->
[Phase 2 content here]
```

---

### `kleros-curate/references/shared-abi-fragments.md` (reference/doc, on-demand read)

**Analog:** ABI sections from both `curate-v1/curate-light-skill.md` and `curate-v1/pgtcr-stake-curate-skill.md`

**Stub structure:**
```markdown
# Shared: ABI Fragments
<!-- Source: curate-v1/curate-light-skill.md §abi, curate-v1/pgtcr-stake-curate-skill.md §abi -->

## Contents
- LightGeneralizedTCR read functions
- LightGeneralizedTCR write functions
- PermanentGTCR read functions
- PermanentGTCR write functions
- IArbitrator ABI (shared arbitration interface)
- Key event signatures (MetaEvidence, ItemStatusChange, etc.)

## LightGeneralizedTCR read functions
<!-- Source: curate-v1/curate-light-skill.md §abi-read -->
[Phase 2 content here]

## LightGeneralizedTCR write functions
<!-- Source: curate-v1/curate-light-skill.md §abi-write -->
[Phase 2 content here]

## PermanentGTCR read functions
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §abi-read -->
[Phase 2 content here]

## PermanentGTCR write functions
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §abi-write -->
[Phase 2 content here]

## IArbitrator ABI
<!-- Source: curate-v1/curate-light-skill.md §arbitrator-abi -->
[Phase 2 content here]

## Key event signatures
<!-- Source: curate-v1/curate-light-skill.md §events, curate-v1-scout/scout-skills.md §events -->
[Phase 2 content here]
```

---

### `kleros-curate/references/shared-ipfs-upload.md` (reference/doc, on-demand read)

**Analog:** `kleros-ipfs-upload/SKILL.md` (guidance pattern for durability rationale + skill cross-reference)

**Stub structure:**
```markdown
# Shared: IPFS Upload Guidance
<!-- Source: kleros-ipfs-upload/SKILL.md, CONTEXT.md D-07, D-08 -->

## Contents
- Durability rationale (why third-party pins can vanish)
- Recommended path: kleros-ipfs-upload skill
- /ipfs/<CID> format rule (no double-slash)
- Agent autonomy note

## Durability rationale
<!-- Source: CONTEXT.md D-07 -->
Third-party pins can vanish after on-chain anchoring. Kleros-operated pins have strong incentive to stay live.

## Recommended path: kleros-ipfs-upload skill
<!-- Source: kleros-ipfs-upload/SKILL.md lines 36-48 -->
[Phase 2 content here — reference skill, not mandate]

## /ipfs/<CID> format rule
<!-- Source: kleros-ipfs-upload/SKILL.md lines 183-191 -->
cids[] already includes /ipfs/ prefix. Build URLs as "https://cdn.kleros.link" + cid — never append /ipfs/ again.

## Agent autonomy note
<!-- Source: CONTEXT.md D-08 -->
[Phase 2 content here — frame as "recommended for durability", never "required"]
```
Key pattern from analog (`kleros-ipfs-upload/SKILL.md` lines 183-191): the double-slash trap is explicitly warned against — copy this exact framing into the shared-ipfs-upload.md stub header so Phase 2 doesn't miss it.

---

## Shared Patterns

### Source marker format
**Source:** `CONTEXT.md` D-14
**Apply to:** Every heading in every reference stub
```markdown
<!-- Source: curate-v1/curate-light-skill.md §1-§2 -->
```
HTML comment — invisible in rendered markdown, grep-able. Every heading in every stub MUST have one. Phase 1 deliverable requirement.

### Stub section size limit
**Apply to:** All 8 reference files
Target: 20-40 lines per stub. If a stub exceeds 50 lines, Phase 1 scope has been exceeded (Phase 2/3 content is leaking in). No copy-paste from draft files — headings + one-liners + source markers only.

### No markdown tables in SKILL.md
**Source:** `CONTEXT.md` D-12
**Apply to:** `kleros-curate/SKILL.md` body only
Structured lists throughout. Markdown tables are acceptable in reference files (e.g., deposit formula tables) but NOT in `SKILL.md`. Warning sign: any `|---|` in SKILL.md.

### SKILL.md line budget
**Apply to:** `kleros-curate/SKILL.md`
Target: ~300 lines. Hard ceiling: 500 lines (platform constraint). Phase 1 skeleton (routing + non-negotiables + action index + file descriptions, no extracted content) should land at 200-300 lines. Verify: `wc -l kleros-curate/SKILL.md`.

### Scout dual-file routing
**Apply to:** Routing decision tree in `kleros-curate/SKILL.md`
Scout MUST instruct loading BOTH `references/scout-registries.md` AND `references/light-curate.md`. Single-file Scout routing is a Phase 1 defect (Pitfall 3 in RESEARCH.md).

---

## No Analog Found

No files are without usable analog or source material. All 9 files have either an exact structural analog (`kleros-ipfs-upload/SKILL.md`) or draft-skill source material to scaffold from.

---

## Metadata

**Analog search scope:** `kleros-ipfs-upload/`, `curate-v1/`, `curate-v1-scout/`, `.claude-plugin/`
**Files read:** 7 (`kleros-ipfs-upload/SKILL.md`, `curate-v1/curate-light-skill.md` lines 1-35, `curate-v1-scout/scout-skills.md` lines 1-40, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `01-CONTEXT.md`, `01-RESEARCH.md`)
**Pattern extraction date:** 2026-05-26
