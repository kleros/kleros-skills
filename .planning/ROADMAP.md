# Roadmap: Kleros Skills

## Milestones

- ✅ **v1.0 Unified Curate Skill** — Phases 1-5 (shipped 2026-05-27)

## Phases

<details>
<summary>✅ v1.0 Unified Curate Skill (Phases 1-5) — SHIPPED 2026-05-27</summary>

Three draft curate skills (2,366 lines across LGTCR, PGTCR, Scout) restructured into a single published `kleros-curate` skill with routing entry point, shared reference files, and flavor-specific reference files.

- [x] **Phase 1: Architecture** — Define skeleton, routing decision tree (3/3 plans) — completed 2026-05-26
- [x] **Phase 2: Shared References** — Extract shared content into references/ (6/6 plans) — completed 2026-05-27
- [x] **Phase 3: Flavor References** — Write LGTCR, PGTCR, Scout references (3/3 plans) — completed 2026-05-27
- [x] **Phase 4: Triggering** — Optimize YAML description for trigger accuracy (1/1 plan) — completed 2026-05-27
- [x] **Phase 5: Publishing** — Audit surfaces, tag release, GitHub release (2/2 plans) — completed 2026-05-27

**Total:** 5 phases, 15 plans, 24 requirements — all complete
**Tag:** `kleros-curate@v1.0.0`
**Release:** https://github.com/kleros/kleros-skills/releases/tag/kleros-curate%40v1.0.0

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Architecture | v1.0 | 3/3 | ✓ Complete | 2026-05-26 |
| 2. Shared References | v1.0 | 6/6 | ✓ Complete | 2026-05-27 |
| 3. Flavor References | v1.0 | 3/3 | ✓ Complete | 2026-05-27 |
| 4. Triggering | v1.0 | 1/1 | ✓ Complete | 2026-05-27 |
| 5. Publishing | v1.0 | 2/2 | ✓ Complete | 2026-05-27 |

## Backlog

### Phase 999.1: Rename kleros-curate to kleros-curate-v1 (BACKLOG — DEFERRED)

**Goal:** Rename the skill from `kleros-curate` to `kleros-curate-v1` and make it explicit throughout the skill content that it targets Curate applications built on Kleros protocol v1 (not a version of the Curate app itself, but the version of the underlying Kleros arbitration protocol).
**Deferred:** 2026-07-07 — do not promote until a Kleros Curate v2 (Kleros protocol v2 arbitrator) is available; the `-v1` suffix is only meaningful once a v2 counterpart skill exists.
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
