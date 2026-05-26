# Kleros Skills

## What This Is

Claude Code plugin marketplace containing skills that teach AI agents to interact with Kleros protocol components. Skills are standalone markdown files providing onchain-first instructions: contract ABIs, MetaEvidence retrieval, deposit computation, transaction execution rules, and policy compliance. Published as a Claude Code plugin at `kleros/kleros-skills`.

## Core Value

AI agents can safely and correctly interact with any Kleros Curate registry — right contract flavor, right deposit math, right schema, right chain — without guessing.

## Current Milestone: v1.0 Unified Curate Skill

**Goal:** Research skill design best practices and restructure 3 draft curate skills (LGTCR, PGTCR, Scout — 2,366 lines) into a single published "kleros-curate" skill with progressive disclosure and routing.

**Target features:**
- Research Claude Code skill design: context limits, progressive disclosure, multi-file architectures, routing triggers
- Design unified skill architecture: single entry point routing to LGTCR vs PGTCR vs Scout-specific content
- Factor out shared logic (MetaEvidence, deposits, IPFS upload, item.json, tx execution)
- Preserve flavor-specific content (PGTCR's GraphQL/ERC20 stake, Scout's hardcoded registries + seed templates)
- Publish kleros-curate to the marketplace catalog

## Requirements

### Validated

- IPFS upload skill (kleros-ipfs-upload@v1.1.0) — published and working

### Active

- [ ] Unified curate skill with routing between LGTCR, PGTCR, and Scout
- [ ] Research-backed skill design (context limits, progressive disclosure)
- [ ] Published to marketplace catalog

### Out of Scope

- Curate v2 contracts — not yet deployed, separate future skill
- MCP server integration — no production Kleros v2 MCP exists yet
- Subgraph-only skills — onchain-first remains the design principle (subgraphs are fallback/convenience)

## Context

- Three draft skills exist: `curate-v1/curate-light-skill.md` (708 lines, LGTCR), `curate-v1/pgtcr-stake-curate-skill.md` (650 lines, PGTCR), `curate-v1-scout/scout-skills.md` (1,008 lines, Scout/LGTCR on Gnosis)
- Scout uses the same LightGeneralizedTCR contracts as Light Curate — it's a UI specialization for 4 specific registries on Gnosis, not a third contract type
- PGTCR is fundamentally different: ERC20 permanent stake + native arbitration deposit, Goldsky GraphQL, different status model (Submitted/Reincluded/Disputed/Absent + withdrawal flow)
- Massive content overlap across all three files (MetaEvidence retrieval, deposit computation, IPFS upload, item.json construction, tx execution rules)
- Skill file line count may be a hard constraint — very long skills may not load fully into agent context

## Constraints

- **Plugin structure**: Each published skill must be `skillname/SKILL.md` with YAML frontmatter per CLAUDE.md conventions
- **Context limits**: Skill files that are too long may be truncated — research needed on exact thresholds
- **Onchain-first**: All financial and schema-defining data must come from live contract reads, never cached/guessed
- **No secrets**: Skills are public — no API keys, private endpoints, or local file references

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single skill entry point | Reduces user confusion, enables routing based on intent | -- Pending |
| Research-first approach | Skill design patterns, context limits, and progressive disclosure are unknowns | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-26 after milestone v1.0 initialization*
