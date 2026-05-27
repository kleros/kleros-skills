# Phase 3: Flavor References - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 3-Flavor References
**Areas discussed:** Flavor file depth, Scout content scope, PGTCR unique mechanics, Time-sensitive content, Source marker fate, LGTCR content gap, Cross-flavor pointers

---

## Flavor File Depth

### Q1: How should flavor files handle operations that exist in shared references?

| Option | Description | Selected |
|--------|-------------|----------|
| Pointer + delta only | 2-3 lines per operation: pointer to shared file + only what's different. Very lean (~80-120 lines). | |
| Hybrid steps + pointers | Each operation shows numbered workflow with inline one-liners, delegating HOW to shared files. (~150-250 lines). | ✓ |
| Self-contained operations | Full step-by-step per flavor, inlining shared content. (~300-400+ lines). Contradicts Phase 2 D-08. | |

**User's choice:** Hybrid steps + pointers
**Notes:** Recommended based on analysis of how PGTCR draft already structures operations and how agents consume multi-file skills.

### Q2: Should each flavor file mirror the same section structure?

| Option | Description | Selected |
|--------|-------------|----------|
| LGTCR/PGTCR parallel, Scout organic | LGTCR and PGTCR share section ordering (both are operations manuals). Scout keeps organic overlay structure. | ✓ |
| Consistent structure, all three | Same sections across all files. Scout would have redirect sections. | |
| Organic per-flavor, all three | Each file organizes around its unique strengths. | |
| You decide | Let planner determine. | |

**User's choice:** LGTCR/PGTCR parallel, Scout organic

### Q3: TOC threshold for flavor files

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 300 lines (WRIT-03) | Same threshold as shared files. None expected to exceed except possibly stake-curate.md. | ✓ |
| Lower to 200 lines | More aggressive threshold. | |
| You decide | Let planner apply WRIT-03 as-is. | |

**User's choice:** Keep 300 lines

---

## Scout Content Scope

### Q1: How should scout-registries.md handle the 4 seed templates (~170 lines JSON)?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline templates | Keep all 4 in scout-registries.md. Templates ARE the point. File ~250-280 lines. | ✓ |
| Separate templates file | Move to references/scout-templates.json. ~120 lines but needs second load. | |
| You decide | Let planner determine. | |

**User's choice:** Inline templates

### Q2: Scout image-to-IPFS section (70 lines in draft)

| Option | Description | Selected |
|--------|-------------|----------|
| Image requirements only | Keep only format/size/proof requirements. Upload → shared-ipfs-upload.md. ~15 lines. | ✓ |
| Full image guidance inline | Keep entire 70-line section. Self-contained but duplicates upload mechanics. | |
| You decide | Let planner determine. | |

**User's choice:** Image requirements only

---

## PGTCR Unique Mechanics

### Q1: PGTCR Goldsky GraphQL queries (~140 lines)

| Option | Description | Selected |
|--------|-------------|----------|
| Inline all queries with TOC | All 4 queries in stake-curate.md. File ~337 lines, gets TOC. Queries coupled to status model. | ✓ |
| Separate pgtcr-graphql.md | Queries in own reference file. Keeps stake-curate.md lean but adds 9th file + second load. | |
| Abbreviated inline + full separate | Inline shows query shape only. Full queries in separate file. | |

**User's choice:** Inline all queries with TOC

### Q2: PGTCR derived status algorithm representation

| Option | Description | Selected |
|--------|-------------|----------|
| Pseudocode block | ~35-line if/else pseudocode. Evaluation order explicit, agents can implement directly. | ✓ |
| Decision table | Structured rows: condition → status. Flatter but loses evaluation ordering. | |
| You decide | Let planner determine. | |

**User's choice:** Pseudocode block

---

## Time-Sensitive Content

### Q1: How should flavor files handle content that will go stale?

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered by risk | Incentive amounts → redirect. Endpoints → hardcode. Addresses → keep. Evergreen framing → inline. | ✓ |
| All volatile links out | No endpoint URLs, no incentive details inline. | |
| Everything with staleness banners | Keep all content inline with ⚠️ warnings. | |
| Skip volatile content entirely | No incentives, no scout-api, no Goldsky URLs. | |

**User's choice:** Tiered by risk

### Q2: Goldsky subgraph endpoint handling

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcode only | Keep current URLs. Staleness handled by skill version updates from marketplace. | ✓ |
| Discovery pattern only | Explain URL structure, agents find current endpoints. | |
| Both: hardcoded + discovery note | Current URLs + URL pattern for self-recovery. | |

**User's choice:** Hardcode only. User specified: "if it breaks the users should update the skill from the marketplace to pick up the correct version."

---

## Source Marker Fate

### Q1: Should Phase 1 HTML source markers remain in final published files?

| Option | Description | Selected |
|--------|-------------|----------|
| Strip markers | Remove all. They served their purpose. Git blame preserves provenance. | ✓ |
| Keep markers | Preserve section-level traceability in HTML comments. | |
| Transform to frontmatter note | Single top-of-file note acknowledging lineage. | |

**User's choice:** Strip markers

---

## LGTCR Content Gap

### Q1: Confirm all unfilled sections in light-curate.md are Phase 3 scope

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, all Phase 3 scope | Mislabeled "[Phase 2 content here]" placeholders are Phase 3 work. | ✓ |
| Check if any should have been Phase 2 | Review whether some sections were missed during shared extraction. | |

**User's choice:** Yes, all Phase 3 scope

---

## Cross-Flavor Pointers

### Q1: Should flavor files include section-level pointers into shared files?

| Option | Description | Selected |
|--------|-------------|----------|
| Section-level pointers | "shared-deposits.md § LGTCR specifics" — eliminates ambiguity. | ✓ |
| File-level pointers only | "shared-deposits.md" — simpler but agent must scan. | |
| You decide | Let planner determine granularity. | |

**User's choice:** Section-level pointers

---

## Claude's Discretion

- Specific ordering of subsections within each flavor file
- How much inline context per hybrid step before the pointer
- Whether Scout submission checklist is a standalone section or folded into operations

## Deferred Ideas

None — discussion stayed within phase scope.
