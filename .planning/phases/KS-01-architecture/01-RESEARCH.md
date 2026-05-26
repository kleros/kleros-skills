# Phase 1: Architecture - Research

**Researched:** 2026-05-26
**Domain:** Claude Code skill structure — directory layout, SKILL.md skeleton, routing decision tree, reference file stubs
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Routing Decision Tree**
- D-01: Hybrid routing — keywords first (zero-cost), then contract address lookup if user provides an address or intent is ambiguous
- D-02: Keyword triggers — Scout: "Scout", "token list", "address tags", "CDN"; PGTCR: "PGTCR", "Stake Curate", "PermanentGTCR", "Goldsky"; default: Light Curate
- D-03: Ambiguous routing (user says "Curate" with no flavor hint): interactive → ask briefly with 1-sentence descriptions; one-shot → default Light Curate then progressively correct via address matching
- D-04: Scout is an overlay on Light Curate (not a hard fork) — routing loads Scout context ON TOP of LGTCR context
- D-05: Contract-type detection (LGTCR vs PGTCR) deferred to reference files — SKILL.md says "check the contract type" but each flavor reference explains how

**Reference File Granularity**
- D-06: 8 separate reference files — 3 flavor + 5 shared:
  - `light-curate.md`, `stake-curate.md`, `scout-registries.md`
  - `shared-metaevidence.md`, `shared-deposits.md`, `shared-item-json.md`, `shared-abi-fragments.md`, `shared-ipfs-upload.md`
- D-07: `shared-ipfs-upload.md` covers: durability rationale, kleros-ipfs-upload skill recommendation, `/ipfs/<CID>` format rule, agent autonomy note
- D-08: Respect agent autonomy — frame as "recommended for durability" not "required"

**SKILL.md Content Scope**
- D-09: Brief "Curate in a nutshell" explainer (~15 lines) for zero-context agents
- D-10: Merged non-negotiables section in SKILL.md — safety-critical rules across all flavors: never guess amounts, onchain-first, never rewrite schema
- D-11: Action index as a structured list (not markdown table) mapping user intents to reference files, with grep search patterns inline for large reference files
- D-12: Structured list format preferred over markdown tables for LLM readability

**Stub Detail Level**
- D-13: Reference file stubs include section headings + one-liner description per section (~20-40 lines per stub)
- D-14: Source markers in stubs as HTML comments: `<!-- Source: curate-v1/curate-light-skill.md L540-560 -->`

### Claude's Discretion

- D-05: The specific mechanism for contract-type detection (which function signature to check)

### Deferred Ideas (OUT OF SCOPE)

- IPFS durability: eager CID crawling/pinning on Kleros nodes (mid-to-long-term)
- Eval testing via skill-creator's `run_loop.py` — deferred to after v1.0 manual testing
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | Single `kleros-curate/SKILL.md` entry point under 500 lines / 5k words | Platform constraint verified: 500-line limit, 5k-token post-compaction budget. Target ~300 lines gives headroom. |
| ARCH-02 | `references/` subdirectory following official domain-organization pattern (one file per flavor + shared files) | Validated by official Anthropic skill-creator pattern and SKILL-DESIGN.md. 8-file layout locked in D-06. |
| ARCH-03 | Routing decision tree in SKILL.md that disambiguates LGTCR vs PGTCR vs Scout from user intent | Routing logic fully specified in D-01 through D-05. Decision tree prose pattern confirmed in ARCHITECTURES.md. |
| ARCH-04 | No content duplication between SKILL.md and reference files — each piece of information lives in one place | Non-negotiables stay in SKILL.md body; all flavor-specific and shared technical content in reference stubs. |
</phase_requirements>

---

## Summary

Phase 1 is purely structural: create `kleros-curate/SKILL.md` with skeleton content and `kleros-curate/references/` with 8 stub files. No content extraction from the draft skills happens in this phase — that is Phase 2 (shared content) and Phase 3 (flavor-specific content).

The architecture is fully locked from prior research (SKILL-DESIGN.md, ARCHITECTURES.md, PROGRESSIVE-DISCLOSURE.md, CONTENT-ANALYSIS.md) and user decisions in CONTEXT.md. No new architecture decisions are needed. The key open area is the exact prose and structure of the routing decision tree in SKILL.md, which this research fully specifies below.

The reference skill `kleros-ipfs-upload/SKILL.md` (283 lines) establishes the YAML frontmatter format and section ordering convention. The target `kleros-curate/SKILL.md` follows the same conventions but adds a routing decision tree and action index in place of the IPFS-specific operational sections.

**Primary recommendation:** Create `kleros-curate/SKILL.md` as a ~300-line skeleton with routing tree + action index + non-negotiables + section stubs, then create 8 stub files in `references/` with headings only. No source content from the draft files enters SKILL.md itself.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Skill triggering (description matching) | Claude Code runtime | — | Description frontmatter is parsed at session start by Claude Code |
| Flavor routing (LGTCR / PGTCR / Scout) | SKILL.md body | — | Routing prose lives in always-in-context SKILL.md |
| Light Curate operations | `references/light-curate.md` | SKILL.md (action index pointer) | Demand-loaded; not in context until needed |
| Stake Curate operations | `references/stake-curate.md` | SKILL.md (action index pointer) | Demand-loaded; not in context until needed |
| Scout operations | `references/scout-registries.md` | `references/light-curate.md` (overlay) | Scout IS LGTCR — both files loaded together |
| Shared MetaEvidence retrieval | `references/shared-metaevidence.md` | — | Single source of truth for log retrieval |
| Shared deposit computation | `references/shared-deposits.md` | — | Single source of truth for deposit math |
| Shared item.json construction | `references/shared-item-json.md` | — | Authoritative item.json rules, one location |
| Shared ABI fragments | `references/shared-abi-fragments.md` | — | Arbitrator ABI + both contract type ABIs |
| IPFS upload guidance | `references/shared-ipfs-upload.md` | `kleros-ipfs-upload` skill | Durability rationale + skill cross-reference |
| Safety-critical rules (non-negotiables) | SKILL.md body | — | Must always be in context, survives compaction |
| Plugin registration | `plugin.json` + `marketplace.json` | — | Phase 5 only |

---

## Standard Stack

No external packages. Phase 1 is pure file creation — markdown files with no dependencies.

### Established Conventions (from existing codebase)
[VERIFIED: kleros-ipfs-upload/SKILL.md, .claude-plugin/plugin.json]

| Convention | Value | Source |
|------------|-------|--------|
| Skill frontmatter fields | `name`, `description` (YAML) | `kleros-ipfs-upload/SKILL.md` line 1-3 |
| Description style | Third-person, "pushy", positive + negative triggers | `kleros-ipfs-upload` description, SKILL-DESIGN.md |
| Description char cap | 1,536 chars | Official docs, SKILL-DESIGN.md |
| SKILL.md max lines | 500 lines | Official docs (explicit tip) |
| Post-compaction token cap | First 5,000 tokens per skill | Official docs |
| Supporting files location | `references/` subdirectory | Official Anthropic domain-org pattern |
| Reference file loading | On-demand via Read tool (not auto-loaded) | Official docs |
| Skills array path | `"./kleros-curate"` in `plugin.json` | Matches existing `"./kleros-ipfs-upload"` convention |
| Source markers in stubs | `<!-- Source: path/to/file.md L100-120 -->` | D-14 decision |

### File Naming Convention
[VERIFIED: .planning/research/SUMMARY.md, CONTEXT.md D-06]

```
kleros-curate/
├── SKILL.md
└── references/
    ├── light-curate.md
    ├── stake-curate.md
    ├── scout-registries.md
    ├── shared-metaevidence.md
    ├── shared-deposits.md
    ├── shared-item-json.md
    ├── shared-abi-fragments.md
    └── shared-ipfs-upload.md
```

Total files to create: 9 (SKILL.md + 8 reference stubs).

---

## Package Legitimacy Audit

Not applicable. Phase 1 installs no packages.

---

## Architecture Patterns

### SKILL.md Section Order
[CITED: kleros-ipfs-upload/SKILL.md structure, SKILL-DESIGN.md]

The published `kleros-ipfs-upload` skill uses this section order, which becomes the template:

```
YAML frontmatter (name, description)
# Title

Brief intro paragraph ("Curate in a nutshell" — ~15 lines, D-09)

## Non-negotiables (D-10)
[merged cross-flavor safety rules]

## Routing — Which Curate flavor? (D-01 to D-05)
[decision tree as structured list]

## Action index (D-11)
[structured list: intent → reference file, with grep patterns for large files]

## Reference files
[brief description of each file, what it covers, when to read it]
```

Total target: ~300 lines (well under 500-line limit, ~750-900 tokens, leaves 4,000+ tokens headroom in post-compaction budget).

### Routing Decision Tree Pattern
[VERIFIED: ARCHITECTURES.md section 4, PROGRESSIVE-DISCLOSURE.md section 3b]

The routing tree is instructed prose, not a technical dispatch mechanism. Claude reads it and self-routes based on LLM reasoning. Locked structure from D-01 through D-05:

```markdown
## Which Curate flavor are you using?

**Step 1 — Keyword scan (zero cost)**
- Mentions "Scout", "token list", "address tags", "CDN"
  → **Scout** (overlay on Light Curate)
  → Read `references/scout-registries.md` AND `references/light-curate.md`
- Mentions "PGTCR", "Stake Curate", "PermanentGTCR", "Goldsky", "ERC20 stake"
  → **Stake Curate (PGTCR)**
  → Read `references/stake-curate.md`
- Mentions "Curate", "LGTCR", "LightGeneralizedTCR", "Light Curate", "addItem", registry
  → **Light Curate (LGTCR)** (also the default)
  → Read `references/light-curate.md`

**Step 2 — Ambiguous ("Curate" with no flavor hint)**
- Interactive session: ask one question — "Which Curate flavor? Light Curate (optimistic challenge window), Stake Curate (permanent ERC20 stake), or Scout (4 Gnosis registries for contract/token tagging)?"
- One-shot / non-interactive: default to Light Curate, then:
  - If user provides a contract address: check if it matches one of the 4 Scout registry addresses → load Scout overlay
  - If contract introspection reveals `token()` + `submissionMinDeposit()` (PGTCR hallmarks) → pivot to Stake Curate
  - Otherwise: proceed as Light Curate

**Step 3 — Contract-type verification (if address provided)**
See the flavor reference file for hallmark calls:
- Light Curate hallmarks: `submissionBaseDeposit()`, `arbitrator()`
- Stake Curate hallmarks: `token()` (ERC20), `submissionMinDeposit()`
- Scout: address is one of the 4 known Gnosis registry addresses
```

### Action Index Pattern
[VERIFIED: CONTEXT.md D-11, D-12; ARCHITECTURES.md section 2]

Structured list format (not markdown table). Each entry: bold label → arrow → file reference. Grep pattern inline when reference file will be large (>300 lines estimated):

```markdown
## Action index

**Submit item to a registry** → `references/light-curate.md` or `references/stake-curate.md` (per flavor)
**Challenge / remove an item** → flavor reference file
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

### Reference File Stub Structure
[VERIFIED: CONTEXT.md D-13, D-14]

Each stub: section headings + one-liner description per section + source marker HTML comments. Target: 20-40 lines per stub.

Example stub (`references/light-curate.md`):
```markdown
# Light Curate (LightGeneralizedTCR)
<!-- Source: curate-v1/curate-light-skill.md -->

## Contents
[auto-generated TOC once content is filled in Phase 2-3]

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
...
```

### Scout Overlay Pattern
[VERIFIED: CONTEXT.md D-04, ARCHITECTURES.md section 4]

Scout is NOT a fork. Routing loads both files when Scout context is detected:

```
User intent: Scout → Load references/scout-registries.md + references/light-curate.md
```

SKILL.md makes this explicit: "Scout registries run on LightGeneralizedTCR contracts. When working with Scout, read `references/scout-registries.md` for Scout-specific context (4 registry addresses, seed templates, image guidance), then use `references/light-curate.md` for all LGTCR contract operations."

### Non-Negotiables Block
[VERIFIED: CONTEXT.md D-10; curate-light-skill.md lines 10-27; pgtcr-stake-curate-skill.md lines 10-18]

Cross-flavor safety rules extracted from draft files. Must appear near the top of SKILL.md body (before routing tree) so they appear first in post-compaction re-attachment. Content synthesized from D-10:

1. Never guess / invent / approximate amounts, addresses, schemas, or parameters.
2. Onchain state + onchain logs are the source of truth for deposits, arbitration cost, challenge deposits, appeal status, and MetaEvidence URI.
3. Never assume a "standard token schema" — only the current MetaEvidence is authoritative.
4. Never rewrite the schema: `item.json.columns` must be copied verbatim from MetaEvidence; only `values` is dynamic.
5. Never include "typical ranges" / estimates for deposits or fees — only report live-read values.
6. `eth_getCode` before declaring any address is or isn't a contract.

### "Curate in a Nutshell" Block
[VERIFIED: CONTEXT.md D-09; curate-v1-scout/scout-skills.md lines 1-30 — best concise explanation]

~15 lines explaining: what Curate does, the deposit/challenge/arbitration cycle, why onchain-first matters. The scout-skills.md opening ("Why this matters / Curate in one nutshell") is the best source for this — ~20 lines covering the mechanism clearly. Compress to ~15 lines for SKILL.md.

### Anti-Patterns to Avoid

- **Embedding content in SKILL.md that belongs in reference files.** Non-negotiables and routing tree belong in SKILL.md. MetaEvidence retrieval algorithm, item.json construction rules, ABI fragments do not.
- **Nested references.** All 8 reference files are referenced directly from SKILL.md. Reference files do NOT point to each other (except Scout noting "for contract operations see light-curate.md" — this reference is surfaced from SKILL.md routing, not from within scout-registries.md itself).
- **Markdown tables in SKILL.md.** D-12 locked: structured lists only. Fewer tokenization overhead characters.
- **Reference files without section headings.** Stubs must include all section headings (even with one-liner content) so Phase 2/3 executors know exactly what to fill.
- **Omitting source markers.** Every heading in a stub must have a `<!-- Source: ... -->` comment so Phase 2/3 can trace content origins.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skill description triggering | Custom keyword matching | Claude Code LLM description matching | Built-in to the platform; description is the only mechanism |
| Cross-file shared content | Duplicate rules in multiple files | Single `shared-*.md` reference files | Drift risk: shared content diverges when duplicated |
| File loading orchestration | Explicit `!cat` or shell injection | SKILL.md action index prose + Claude's Read tool | `!` injection runs at load time (always); Read tool runs on demand |

**Key insight:** The routing mechanism is pure prose. There is no technical dispatch — Claude reads the routing tree and self-routes based on keywords and context. The value of well-structured prose here (clear conditions, explicit file pointers) is that Claude follows it reliably.

---

## Common Pitfalls

### Pitfall 1: SKILL.md Grows Past 500 Lines
**What goes wrong:** Adding "just a little more context" to SKILL.md until it exceeds the 500-line / 5k-token limit, causing silent truncation after post-compaction re-attachment.
**Why it happens:** Each section feels necessary; routing tree + non-negotiables + action index + nutshell intro + file descriptions add up.
**How to avoid:** Target 300 lines during skeleton creation. Leave Phase 2/3 content in reference files. Verify with `wc -l kleros-curate/SKILL.md` before committing.
**Warning signs:** SKILL.md exceeds 350 lines before any Phase 2/3 content has been added.

### Pitfall 2: Reference File Content in Phase 1
**What goes wrong:** Temptation to "fill in" reference file content while creating stubs, blurring the Phase 1/2/3 boundary.
**Why it happens:** The draft files are right there; easy to copy-paste sections into stubs.
**How to avoid:** Phase 1 stubs contain ONLY: headings + one-liner descriptions + source markers. No copy-paste from draft files.
**Warning signs:** Any stub exceeds 50 lines.

### Pitfall 3: Scout NOT Treated as Overlay
**What goes wrong:** Routing tree sends agent to `scout-registries.md` only, without also loading `light-curate.md`, causing agent to miss LGTCR contract operation details.
**Why it happens:** Scout appears to be a "separate thing"; easy to treat as an independent fork.
**How to avoid:** SKILL.md routing tree must explicitly say "read BOTH scout-registries.md AND light-curate.md" for Scout flavor.
**Warning signs:** Scout routing only references one file.

### Pitfall 4: Markdown Tables in SKILL.md
**What goes wrong:** Tables use many pipe/dash characters that increase tokenization overhead; LLMs also parse them less reliably than structured lists.
**Why it happens:** Tables look cleaner to humans; easy default choice.
**How to avoid:** Use structured list format throughout SKILL.md (D-12). Tables are acceptable in reference files (e.g., deposit formula tables), not in SKILL.md body.
**Warning signs:** Any `|---|` in SKILL.md.

### Pitfall 5: Missing Source Markers in Stubs
**What goes wrong:** Phase 2/3 executors can't trace which draft file section feeds each stub section, slowing content extraction.
**Why it happens:** Source markers look like extra noise; easy to skip.
**How to avoid:** Every heading in every stub must include `<!-- Source: path/to/file.md §section-or-line-range -->`. This is a Phase 1 deliverable requirement (D-14).
**Warning signs:** Any stub heading without a `<!-- Source: ... -->` comment.

### Pitfall 6: Contract-Type Detection Logic in SKILL.md
**What goes wrong:** SKILL.md includes the hallmark function call details for detecting LGTCR vs PGTCR, duplicating content that belongs in each flavor's reference file.
**Why it happens:** Contract-type detection feels like "routing" logic that belongs in SKILL.md.
**How to avoid:** SKILL.md says "check the contract type (see the flavor reference file for hallmark calls)." The actual `submissionBaseDeposit()` vs `token()` details live in the reference files (D-05).
**Warning signs:** Function signatures in SKILL.md routing section.

---

## Code Examples

### YAML Frontmatter Pattern
```markdown
---
name: kleros-curate
description: [third-person pushy, positive + negative triggers, all 3 flavors, under 1536 chars]
---
```

Note: description is written in Phase 4 (TRIG-01 through TRIG-03). Phase 1 stub uses a placeholder description that triggers correctly for basic cases but is NOT the final optimized version.

### Structured List Action Index (correct format per D-11, D-12)
```markdown
## Action index

**Submit item** → `references/light-curate.md` (LGTCR) or `references/stake-curate.md` (PGTCR)
**Build item.json** → `references/shared-item-json.md`
  To find the columns section: `grep -n "columns\|field\|type" references/shared-item-json.md`
```

### Reference File Stub (correct format per D-13, D-14)
```markdown
# Shared: MetaEvidence Retrieval
<!-- Source: curate-v1/curate-light-skill.md §1-§2, curate-v1-scout/scout-skills.md §4+§6 -->

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
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Three separate skills (light, stake, scout) | Single skill + routing + references/ | Research phase (2026-05-26) | No duplicated non-negotiables, Scout-as-LGTCR-overlay preserved, single description to maintain |
| Monolithic single SKILL.md | SKILL.md + 8 reference stubs | Architecture decision | Reference files load on demand; SKILL.md stays under 5k token post-compaction budget |

**Deprecated/outdated:**
- `curate-v1/curate-light-skill.md`, `curate-v1/pgtcr-stake-curate-skill.md`, `curate-v1-scout/scout-skills.md`: Draft files. Source material for Phase 2/3. Not deleted in Phase 1 (they are the source).

---

## Runtime State Inventory

Not applicable — Phase 1 creates new files only. No rename, refactor, or migration.

---

## Environment Availability

Not applicable — Phase 1 requires only a text editor. No external tools, CLIs, services, or runtimes needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node --test`) |
| Config file | none — `node --test test/index.test.js` directly |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

**Note:** The existing test suite (`test/index.test.js`) tests `index.html` and `README.md` — not skill files. Phase 1 creates markdown files with no testable runtime behavior. The correct validation for Phase 1 is structural/content assertions, not the existing test suite.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | `kleros-curate/SKILL.md` exists and is under 500 lines / 5k words | manual | `wc -l kleros-curate/SKILL.md && wc -w kleros-curate/SKILL.md` | ❌ Wave 0 |
| ARCH-02 | `references/` exists with 8 stub files at correct names | manual | `ls kleros-curate/references/ \| wc -l` (expect 8) | ❌ Wave 0 |
| ARCH-03 | SKILL.md contains routing decision tree with LGTCR/PGTCR/Scout paths | manual | `grep -c "LGTCR\|PGTCR\|Scout" kleros-curate/SKILL.md` (expect >3) | ❌ Wave 0 |
| ARCH-04 | No content duplication between SKILL.md and reference stubs | manual | Human review — stubs must contain headings only, no content extracted from drafts | ❌ Wave 0 |

**Validation approach for Phase 1:** Shell commands + human review. No automated test file needed. The planner should include explicit verification commands in each plan's `verify` step.

### Wave 0 Gaps
- No new test files required for Phase 1. Verification is via shell `wc`, `ls`, and `grep` commands in plan verify steps.

---

## Security Domain

Not applicable. Phase 1 creates markdown files (documentation artifacts). No code execution, no user input handling, no secrets. ASVS categories do not apply.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SKILL.md description placeholder in Phase 1 is a draft — will be replaced in Phase 4 (TRIG-01 to TRIG-03) | Code Examples | Low: description optimization is explicitly Phase 4 scope |
| A2 | 8 reference file names from D-06 are final — not changed during Phase 1 execution | Standard Stack | Medium: name changes would require updating SKILL.md action index pointers |
| A3 | `wc -l` count will be ≤500 at Phase 1 completion (skeleton only — no Phase 2/3 content) | Validation | Low: skeleton is ~300 lines by design; Phase 2/3 add content to reference files, not SKILL.md |

---

## Open Questions

1. **SKILL.md placeholder description: what trigger phrases?**
   - What we know: Final description is Phase 4 work (TRIG-01 to TRIG-03, 1,536-char cap)
   - What's unclear: Should Phase 1 placeholder be minimal ("Kleros Curate skill — see description Phase 4") or a working draft covering all 3 flavors?
   - Recommendation: Use a working draft description in Phase 1 that covers all trigger phrases but is not length-optimized. This allows basic triggering during Phase 2/3 work without blocking on Phase 4.

2. **Should Phase 1 include a `when_to_use` frontmatter field?**
   - What we know: `when_to_use` is a supported field that appends to `description` in the skill listing, counts against the same 1,536-char cap
   - What's unclear: Whether splitting description + when_to_use improves triggering vs single description field
   - Recommendation: Omit `when_to_use` in Phase 1 skeleton; revisit in Phase 4 during description optimization.

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/SKILL-DESIGN.md` — Claude Code loading lifecycle, 500-line limit, 5k token compaction budget, 1,536-char description cap
- `.planning/research/ARCHITECTURES.md` — Architecture options evaluated; Option C (single SKILL.md + references/) selected; routing prose pattern
- `.planning/research/PROGRESSIVE-DISCLOSURE.md` — Three-level loading, domain-org pattern, nested reference anti-pattern
- `.planning/research/CONTENT-ANALYSIS.md` — Line-by-line overlap analysis; 8-file factoring plan; source section cross-references
- `.planning/research/SUMMARY.md` — Consolidated findings; Scout seed-first pattern; description trigger phrases
- `.planning/phases/KS-01-architecture/01-CONTEXT.md` — All locked decisions (D-01 through D-14)
- `kleros-ipfs-upload/SKILL.md` — Reference implementation: YAML frontmatter format, section ordering, description style

### Secondary (MEDIUM confidence)
- `curate-v1/curate-light-skill.md` (708 lines) — Non-negotiables wording, registry discovery hallmarks, section structure
- `curate-v1/pgtcr-stake-curate-skill.md` (650 lines) — PGTCR hallmarks (`token()`, `submissionMinDeposit()`), section structure
- `curate-v1-scout/scout-skills.md` (1,008 lines) — Scout registry addresses (4 × Gnosis), "Curate in a nutshell" prose, seed-first pattern

---

## Metadata

**Confidence breakdown:**
- SKILL.md structure: HIGH — locked by decisions and validated by research docs
- Routing decision tree: HIGH — fully specified in CONTEXT.md D-01 to D-05
- Reference file naming: HIGH — locked in D-06
- Stub content format: HIGH — locked in D-13, D-14
- Placeholder description: MEDIUM — working draft; final version is Phase 4

**Research date:** 2026-05-26
**Valid until:** Stable (no external dependencies; all decisions are locked)
