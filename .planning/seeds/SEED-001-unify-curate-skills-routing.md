---
id: SEED-001
status: dormant
planted: 2026-05-26
planted_during: unknown
trigger_when: when relevant
scope: unknown
---

# SEED-001: Unify Curate skills into single skill with progressive disclosure and routing

## Why This Matters

_To be filled in. Run `/gsd:capture --seed --enrich SEED-001` to add context._

## When to Surface

**Trigger:** when relevant

This seed will surface during `/gsd:new-milestone` when the milestone scope matches.

## Scope Estimate

**Unknown** — run `/gsd:capture --seed --enrich SEED-001` to estimate effort.

## Breadcrumbs

Existing curate skill files (3 files across 2 directories):
- `curate-v1/curate-light-skill.md` — LightGeneralizedTCR (LGTCR), optimistic curation, stake returned after challenge period
- `curate-v1/pgtcr-stake-curate-skill.md` — PermanentGTCR (PGTCR), permanent stake lock, slashable anytime
- `curate-v1-scout/scout-skills.md` — Scout frontend, specialized for contract/token tagging registries (uses LGTCR contracts)

Related context:
- `CLAUDE.md` — publishing checklist and naming conventions
- `.claude-plugin/plugin.json` — plugin registry, curate not yet registered
- Memory: `curate-skills-deferred` — all 3 are independent, Scout reimplements LGTCR logic inline

Key design considerations from the idea:
- **Smart contract layer:** Two flavors — LGTCR (optimistic, time-bounded challenge) vs PGTCR (permanent stake, anytime slash)
- **UI layer:** Generic Curate frontend (any registry) vs Scout (specialized for contract/token tagging)
- **Proposed architecture:** Single skill entry point with routing to flavor-specific content, possibly in separate files
- **Constraint:** Skill file line count — very long skills may not load fully into context (needs fact-checking)

## Notes

_Captured via one-shot seed capture. Enrich with trigger, why, and scope at your convenience._
