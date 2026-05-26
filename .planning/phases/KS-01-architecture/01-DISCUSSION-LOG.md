# Phase 1: Architecture - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 1-Architecture
**Areas discussed:** Routing decision tree, Reference file granularity, SKILL.md content scope, Stub vs skeleton detail

---

## Routing Decision Tree

| Option | Description | Selected |
|--------|-------------|----------|
| Intent keywords first | Route based on what user says. Fast but relies on user knowing terms. | |
| Contract address lookup | Check contract to distinguish LGTCR vs PGTCR. Robust but requires RPC call. | |
| Hybrid: keywords + address | Try keywords first (zero-cost). If ambiguous or address provided, do contract lookup. | ✓ |

**User's choice:** Hybrid approach
**Notes:** User flagged that "ERC20 stake" is internal jargon and NOT a good intent trigger for PGTCR. Real PGTCR triggers: product names (Stake Curate, PGTCR, PermanentGTCR) or Goldsky/GraphQL mention.

### Follow-up: Ambiguous routing

User provided layered approach rather than selecting a single option:
1. **Interactive session:** Ask briefly, describe three flavors, let user self-select
2. **One-shot fallback:** Default to Light Curate, then progressively correct — if address matches Scout's 4 registries → load Scout overlay; if contract reveals PGTCR → pivot

Key insight: Scout is an overlay on Light Curate, not a hard fork — reflects that Scout IS LGTCR at the contract layer.

### Follow-up: Contract detection mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Function signature check | Call distinguishing function on contract. Definitive answer. | |
| Defer to reference files | SKILL.md says "check contract type", references explain how. Keeps SKILL.md lean. | ✓ |
| You decide | Let planner determine. | |

---

## Reference File Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Keep all 7 separate | Maximum precision: agent reads only the exact file needed. | ✓ |
| Merge shared into 2 files | Combine related shared content into fewer files. | |
| Single shared file | One shared.md with all common content. | |

### Follow-up: IPFS upload path

User provided detailed clarification rather than selecting from initial options:
- Cannot force agents to use any specific upload mechanism — respect agent autonomy
- **Durability risk identified:** third-party pins (Pinata etc.) can vanish after on-chain anchoring, leaving dead CID references in contracts
- **Strong preference:** guide toward kleros-ipfs-upload skill (pins on Kleros nodes, $0.01/upload)
- **But:** agents are free to use alternatives if they prefer
- **Mid-to-long-term fix needed:** Kleros should eagerly crawl contract transactions to pin CIDs on own nodes (not live yet, ASAP priority)

**Result:** New 8th reference file (`shared-ipfs-upload.md`) covering durability rationale + recommendation + format rules

---

## SKILL.md Content Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Non-negotiables in SKILL.md | Safety-critical rules always in context. | ✓ |
| Non-negotiables in reference | Keeps SKILL.md leaner but risk of agent acting before reading. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Action index table | Quick-lookup table mapping intents to reference files. | ✓ |
| No index, routing tree enough | Less prescriptive. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Brief explainer (~15 lines) | Curate in a nutshell for zero-context agents. | ✓ |
| Skip it | Description field is enough. | |
| One-liner only | Single sentence orientation. | |

### Follow-up: Action index format

User questioned whether markdown tables are the best format for LLM readability.

| Option | Description | Selected |
|--------|-------------|----------|
| Structured list | Bold labels with arrows. Less tokenization noise. | ✓ |
| Markdown table | Human-scannable but pipe/dash overhead. | |

**Notes:** User confirmed structured list + grep patterns inline as needed. No separate search hints section.

---

## Stub vs Skeleton Detail

| Option | Description | Selected |
|--------|-------------|----------|
| Section headings + one-liner | Full section structure with descriptions. ~20-40 lines per stub. | ✓ |
| TOC only | Title and contents listing. ~5-10 lines per stub. | |
| Filenames only | Empty files for directory structure. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Source markers (HTML comments) | `<!-- Source: file.md L540-560 -->` for traceability. | ✓ |
| No markers | Draft files are grep-able. | |

---

## Claude's Discretion

- Contract-type detection mechanism (which function signature distinguishes LGTCR from PGTCR) — deferred to planner/researcher

## Deferred Ideas

- IPFS durability: Kleros needs to eagerly crawl contract transactions to surface CIDs and pin on own nodes (ASAP priority, not live yet)
- Eval testing via skill-creator's run_loop.py — deferred to after v1.0 manual testing
