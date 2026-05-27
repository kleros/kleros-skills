# Milestones

## v1.0 Unified Curate Skill (Shipped: 2026-05-27)

**Phases completed:** 13 phases, 15 plans, 8 tasks

**Key accomplishments:**

- Three LGTCR/PGTCR/Scout flavor reference stubs scaffolded in kleros-curate/references/ with section headings, one-liner descriptions, and HTML source markers tracing content origin to draft skill files
- 1. [Rule 3 - Blocking] Created kleros-curate/references/ directory
- Single MetaEvidence retrieval reference for all Curate flavors: eth_getLogs with topic0 pointer, sort-and-take-latest with WHY, LGTCR two-stream (IDs 0/1), PGTCR single-URI + Goldsky primary/fallback
- Deposit computation reference for LGTCR (4 formulas, native-only) and PGTCR (ERC20+native two-asset model) with shared appeal funding formula and loser half-time rule
- 1. [Rule 1 - Bug] eth_getLogs keyword in pointer description
- Found during:
- All 9 multi-surface files verified consistent; README structure tree fixed; 2 pre-existing test failures resolved; npm test 15/15 pass; SHA-256 digests current
- kleros-curate@v1.0.0 formally released: CHANGELOG link added, annotated tag pushed to origin, GitHub release published with consolidated skill notes covering Light Curate, Stake Curate, and Scout

---

## v1.0 — Unified Curate Skill (in progress)

**Started:** 2026-05-26
**Goal:** Research skill design best practices and restructure 3 draft curate skills into a single published "kleros-curate" skill with progressive disclosure and routing.
