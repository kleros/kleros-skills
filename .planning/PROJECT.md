# Kleros Skills

## What This Is

Claude Code plugin marketplace containing skills that teach AI agents to interact with Kleros protocol components. Two published skills: `kleros-ipfs-upload` (x402-paid IPFS uploads on Base mainnet) and `kleros-curate` (Curate registries — Light Curate, Stake Curate, Scout). Skills are standalone markdown files providing onchain-first instructions: contract ABIs, MetaEvidence retrieval, deposit computation, transaction execution rules, and policy compliance. Published as a Claude Code plugin at `kleros/kleros-skills`.

## Core Value

AI agents can safely and correctly interact with any Kleros Curate registry — right contract flavor, right deposit math, right schema, right chain — without guessing.

## Current State

**Shipped:** v1.0 Unified Curate Skill (2026-05-27)
- 5 phases, 15 plans, 24 requirements — all complete
- Three draft skills (2,366 lines) consolidated into single `kleros-curate` skill with routing entry point
- Shared reference files: ABI fragments, MetaEvidence, deposits, item.json, IPFS upload
- Flavor reference files: light-curate.md, stake-curate.md, scout-registries.md
- Optimized YAML trigger description (3-pass aggressive style)
- Published: git tag `kleros-curate@v1.0.0`, GitHub release live

**Tech stack:** Static markdown skills, HTML landing page, Node.js test runner, Netlify deployment

## Requirements

### Validated

- ✓ IPFS upload skill (kleros-ipfs-upload@v1.1.0) — published and working
- ✓ Unified curate skill with routing between LGTCR, PGTCR, and Scout — v1.0
- ✓ Research-backed skill design (context limits, progressive disclosure) — v1.0
- ✓ Published to marketplace catalog — v1.0

### Active

(None — next milestone TBD)

### Out of Scope

- Curate v2 contracts — not yet deployed, separate future skill
- MCP server integration — no production Kleros v2 MCP exists yet
- Subgraph-only skills — onchain-first remains the design principle
- Automated eval pipeline — valuable but deferred to future milestone

## Context

- `kleros-curate/SKILL.md` — routing entry point (~150 lines) with three-flavor decision tree
- `kleros-curate/references/` — 5 shared + 3 flavor reference files
- `kleros-ipfs-upload/SKILL.md` — published IPFS upload skill (283 lines)
- `openclaw-skill/SKILL.md` — OpenClaw-compatible entry point
- `SKILL.md` (root) — top-level router for all skills
- Landing page at skills.kleros.io with agent discovery (robots.txt, sitemap, api-catalog, agent-skills index)
- 9+ multi-surface files must stay in sync (see CLAUDE.md update rule)

## Constraints

- **Plugin structure**: Each published skill must be `skillname/SKILL.md` with YAML frontmatter per CLAUDE.md conventions
- **Context limits**: Skill files that are too long may be truncated — research validated references/ pattern
- **Onchain-first**: All financial and schema-defining data must come from live contract reads, never cached/guessed
- **No secrets**: Skills are public — no API keys, private endpoints, or local file references

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single skill entry point | Reduces user confusion, enables routing based on intent | ✓ Good — routing tree works well |
| Research-first approach | Skill design patterns, context limits, and progressive disclosure were unknowns | ✓ Good — informed architecture |
| Domain-organization pattern (references/) | Official Anthropic pattern, progressive disclosure | ✓ Good — validated |
| Hybrid numbered steps + pointers | Operations manuals with inline context + shared file pointers | ✓ Good — balances depth and modularity |
| Three-pass aggressive trigger style | Combats Claude's tendency to under-trigger | ✓ Good — 1,413 chars, all terms included |
| Fix-then-tag release strategy | Simpler history, tag on meaningful commit | ✓ Good — clean release |
| Skill tags independent from plugin version | `kleros-curate@v1.0.0` coexists with plugin v2.0.0 | ✓ Good — no coupling |

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
*Last updated: 2026-05-27 after v1.0 milestone*
