# Roadmap: Kleros Skills — v1.0 Unified Curate Skill

## Overview

Three draft curate skills (2,366 lines across LGTCR, PGTCR, Scout) are restructured into a single published `kleros-curate` skill with a routing entry point, shared reference files, and flavor-specific reference files. Phases follow the content dependency chain: define structure first, extract shared content second, write flavor content third, finalize triggering fourth, publish last.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Architecture** - Define the `kleros-curate/` skeleton, SKILL.md structure, and routing decision tree
- [ ] **Phase 2: Shared References** - Extract and write all shared content into `references/` files, applying writing quality standards
- [ ] **Phase 3: Flavor References** - Write flavor-specific reference files for LGTCR, PGTCR, and Scout
- [x] **Phase 4: Triggering** - Finalize the YAML description and triggering strategy (completed 2026-05-27)
- [x] **Phase 5: Publishing** - Wire `kleros-curate` into the plugin catalog, bump version, tag (completed 2026-05-27)

## Phase Details

### Phase 1: Architecture

**Goal**: The `kleros-curate/` directory structure and SKILL.md skeleton exist with a working routing decision tree and no content duplication
**Depends on**: Nothing (first phase)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04
**Success Criteria** (what must be TRUE):

  1. `kleros-curate/SKILL.md` exists and is under 500 lines / 5k words
  2. `kleros-curate/references/` directory exists with the correct file stubs (named per research recommendations)
  3. SKILL.md contains a routing decision tree that maps user intent to LGTCR, PGTCR, or Scout
  4. No piece of information appears in both SKILL.md and a reference file

**Plans**: 3 plans
Plans:

- [x] 01-01-PLAN.md — Create kleros-curate/SKILL.md skeleton with routing decision tree, non-negotiables, and action index
- [x] 01-02-PLAN.md — Create flavor reference stubs (light-curate.md, stake-curate.md, scout-registries.md)
- [x] 01-03-PLAN.md — Create shared reference stubs (shared-metaevidence.md, shared-deposits.md, shared-item-json.md, shared-abi-fragments.md, shared-ipfs-upload.md)

**Cross-cutting constraints:**

- No content from draft skills is extracted — stubs contain headings, one-liners, and source markers only

**UI hint**: no

### Phase 2: Shared References

**Goal**: All content shared across two or more flavors is extracted into standalone reference files with consistent writing quality
**Depends on**: Phase 1
**Requirements**: FACT-01, FACT-02, FACT-03, FACT-04, FACT-05, FACT-06, WRIT-01, WRIT-02, WRIT-03, WRIT-04
**Success Criteria** (what must be TRUE):

  1. `shared-metaevidence.md` covers both RPC log and GraphQL retrieval paths with LGTCR-specific two-stream note
  2. `shared-deposits.md` covers native-only computation (LGTCR) and ERC20+native computation (PGTCR) in one place
  3. `shared-item-json.md` and `shared-abi-fragments.md` exist as canonical single-source references
  4. All reference files use imperative/infinitive form and explain the WHY behind constraints
  5. Reference files over 300 lines have a table of contents; files over 10k words trigger grep search patterns in SKILL.md
  6. Flavor-specific nuances (Scout seed-first, PGTCR withdrawal, LGTCR two-stream) are preserved and clearly scoped

**Plans**: 6 plans
Plans:

- [x] 02-01-PLAN.md — Fill shared-abi-fragments.md: all Curate contract signatures in Solidity-style (LGTCR, PGTCR, IArbitrator, factories, events + topic0)
- [x] 02-02-PLAN.md — Fill shared-metaevidence.md: eth_getLogs retrieval, sort rule, LGTCR two-stream, PGTCR Goldsky path
- [x] 02-03-PLAN.md — Fill shared-deposits.md: hard rules, arbitrationCost read, LGTCR 4 formulas, PGTCR two-asset model, appeal formula
- [x] 02-04-PLAN.md — Fill shared-item-json.md: output shape, columns deep-copy, values construction, schema confirmation, failure modes
- [x] 02-05-PLAN.md — Fill shared-ipfs-upload.md: durability rationale, kleros-ipfs-upload reference, Pinata/Graph procedures, double-slash trap
- [x] 02-06-PLAN.md — Add "Common workflows" section to SKILL.md (Submit item / Challenge-remove / Deploy registry loading sequences)

### Phase 3: Flavor References

**Goal**: Each flavor has a dedicated reference file covering its unique operations, preserving all flavor-specific content from the draft skills
**Depends on**: Phase 2
**Requirements**: FLAV-01, FLAV-02, FLAV-03
**Success Criteria** (what must be TRUE):

  1. `light-curate.md` covers LGTCR operations, factory deploy, schema confirmation check, and fundAppeal math without duplicating shared content
  2. `stake-curate.md` covers PGTCR operations, Goldsky GraphQL, ERC20 mechanics, status model, and admin actions without duplicating shared content
  3. `scout-registries.md` covers all 4 Scout registries with addresses, seed templates, LightGeneralizedTCRView helper, scout-api, and image guidance

**Plans**: 3 plans
Plans:

- [x] 03-01-PLAN.md — Fill light-curate.md: LGTCR operations (submit, challenge, remove, evidence, fundAppeal algorithm, factory deploy)
- [x] 03-02-PLAN.md — Fill stake-curate.md: PGTCR operations, Goldsky endpoints, 4 GraphQL queries, derived-status pseudocode, ERC20 approval flow
- [x] 03-03-PLAN.md — Fill scout-registries.md: 4 registry addresses, 4 seed templates, view helper, scout-api, image guidance, incentives

**Cross-cutting constraints:**

- D-12: All Phase 1 HTML source markers stripped
- All '[Phase 3 content here]' placeholders replaced

### Phase 4: Triggering

**Goal**: SKILL.md YAML description triggers correctly on all three flavors within the 1,536-character cap
**Depends on**: Phase 3
**Requirements**: TRIG-01, TRIG-02, TRIG-03
**Success Criteria** (what must be TRUE):

  1. YAML description is in third-person "pushy" style and fits within 1,536 characters
  2. Description includes all required positive triggers: Curate, Light Curate, LGTCR, PGTCR, Stake Curate, PermanentGTCR, Scout, registry, token list, address tags, CDN
  3. Description explicitly excludes generic IPFS uploads (handled by `kleros-ipfs-upload`) and non-Kleros registries

**Plans**: 1 plan
Plans:

- [x] 04-01-PLAN.md — Rewrite kleros-curate/SKILL.md YAML description with three-pass aggressive trigger style (1,300–1,536 chars)

### Phase 5: Publishing

**Goal**: `kleros-curate` is registered in the plugin catalog, versioned, tagged, and ready for installation
**Depends on**: Phase 4
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04
**Success Criteria** (what must be TRUE):

  1. `plugin.json` `skills[]` includes `"./kleros-curate"` and version is bumped
  2. `marketplace.json` `plugins[]` has an entry for `kleros-curate` (name matches directory, no version field)
  3. `CHANGELOG.md` records the release under a new version entry
  4. Git tag `kleros-curate@v1.0.0` exists on the release commit

**Plans**: 2 plans
Plans:

**Wave 1**

- [x] 05-01-PLAN.md — Full surface audit + fix README.md project structure tree + run npm test + update-digests + commit clean pre-tag state

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md — Update CHANGELOG.md comparison link, output tag commands for user, create GitHub release

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Architecture | 3/3 | ✓ Complete | 2026-05-26 |
| 2. Shared References | 6/6 | ✓ Complete | 2026-05-27 |
| 3. Flavor References | 3/3 | ✓ Complete | 2026-05-27 |
| 4. Triggering | 1/1 | Complete   | 2026-05-27 |
| 5. Publishing | 2/2 | Complete   | 2026-05-27 |

## Backlog

### Phase 999.1: Rename kleros-curate to kleros-curate-v1 (BACKLOG)

**Goal:** Rename the skill from `kleros-curate` to `kleros-curate-v1` and make it explicit throughout the skill content that it targets Curate applications built on Kleros protocol v1 (not a version of the Curate app itself, but the version of the underlying Kleros arbitration protocol).
**Requirements:** TBD
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.2: Top-level routing skill as entry point for all Kleros skills (BACKLOG)

**Goal:** Create a top-level SKILL.md that serves as the primary entry point for the entire kleros-skills plugin, routing agents to the correct individual skill (kleros-ipfs-upload, kleros-curate, future skills) based on user intent. Reference: [ethskills SKILL.md](https://github.com/austintgriffith/ethskills/blob/master/SKILL.md) as an example of a multi-skill routing entry point.
**Requirements:** TBD
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.3: Feedback skill for agent-to-maintainer issue reporting (BACKLOG)

**Goal:** Create a `feedback/SKILL.md` that teaches agents how to report issues, confusion, or praise back to Kleros Skills maintainers. Critical because agents (unlike humans) have no natural recourse when a skill is broken or confusing — they silently fail. This feedback channel captures those signals.
**Requirements:** TBD
**Plans:** 0 plans

**Context:**

- Reference: [ethskills feedback/SKILL.md](https://github.com/austintgriffith/ethskills/blob/master/feedback/SKILL.md) — uses a `POST` to a Vercel KV store endpoint; we do NOT want that approach.
- Preferred channels (in priority order):
  1. Kleros MCP feedback endpoint (`mcp__kleros__report-issue_create`) — not generally available yet as of 2026-05-27, but may be by the time this is prioritized. Check availability before implementation.
  2. GitHub issue creation on `kleros/kleros-skills` via `gh issue create` — always available, no backend needed.
- The landing page (`index.html`) already has a "Contributing" section mentioning PRs. A "Feedback" section should be added once this skill exists, similar to ethskills' feedback section (screenshot: encourages agents to fetch `feedback/SKILL.md` and send a note, biasing toward sending).
- The skill should accept structured JSON (kind: "issue"|"praise", message, agent, skill) and route to the appropriate channel.

Plans:

- [ ] TBD (promote with /gsd:review-backlog when ready)
