# Phase 2: Shared References - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 2-Shared References
**Areas discussed:** Flavor callout style, ABI representation, Cross-referencing

---

## Flavor Callout Style

### Q1: How should flavor-specific nuances appear within shared reference files?

| Option | Description | Selected |
|--------|-------------|----------|
| Subsections per flavor | Shared procedure first, then ### LGTCR specifics / ### PGTCR specifics subsections. Clear ToC navigation, agents grep for flavor. | ✓ |
| Inline callouts | Single flow with "For PGTCR: ..." callouts inline. Compact but harder to grep. | |
| Shared-only, defer flavor | Only truly shared procedures; flavor mechanics live entirely in flavor files. Minimal duplication but agents must load two files. | |

**User's choice:** Subsections per flavor
**Notes:** None — clear preference for structured navigation.

### Q2: Should Scout get its own subsection in shared files?

| Option | Description | Selected |
|--------|-------------|----------|
| Scout under LGTCR | No separate subsection. Scout IS LGTCR at contract layer. Parenthetical pointer to scout-registries.md. | ✓ |
| Scout gets a note | One-liner under LGTCR subsection confirming identical mechanics. | |
| Scout gets own subsection | Separate ### Scout subsection even though mechanics are identical. Redundant but unambiguous. | |

**User's choice:** Scout under LGTCR
**Notes:** Scout stays under LGTCR with parenthetical pointer format.

---

## ABI Representation

### Q1: What format should ABI fragments use?

| Option | Description | Selected |
|--------|-------------|----------|
| Solidity-style signatures | Human-readable, grepable, compact. Both ethers and viem parse natively. Matches grep pattern in SKILL.md. | ✓ |
| JSON ABI arrays | Copy-pasteable into ethers/viem constructors. More verbose, less grepable. | |
| Both formats | Solidity primary + JSON ABI at end of each section. Maximum utility but longer file. | |

**User's choice:** Solidity-style signatures
**Notes:** No JSON ABI needed — both major libraries support human-readable format.

### Q2: Should event signatures be full or minimal?

| Option | Description | Selected |
|--------|-------------|----------|
| Full event signatures | Same Solidity-style format as functions. Agents derive topic0 from signature. | ✓ |
| Events with precomputed topic0 | Signatures + keccak256 topic0 as comment. Saves computation but adds visual noise. | |
| Minimal — just topic0 | Only topic0 hashes with name labels. Saves agents a step for common events. | |

**User's choice:** Full event signatures
**Notes:** Consistent format, agents can compute topic0 themselves.

---

## Cross-Referencing

### Q1: How should shared reference files cross-reference each other?

| Option | Description | Selected |
|--------|-------------|----------|
| Self-contained + pointers | Each file usable alone for primary task; parenthetical pointers for depth. No forced multi-file loading. | ✓ |
| Lean with mandatory pointers | Free cross-referencing; agents must load multiple files for full context. | |
| Fully self-contained | 100% standalone, no cross-references. Maximum independence but significant duplication. | |

**User's choice:** Self-contained + pointers
**Notes:** Agents should not be forced to load a second file for the primary operation.

### Q2: Flavor files vs shared files — where do flavor-specific deposits live?

| Option | Description | Selected |
|--------|-------------|----------|
| Flavor points to shared | Flavor file says "Deposit formulas → shared-deposits.md" and only adds unique context (e.g., ERC20 approve() flow). | ✓ |
| Flavor duplicates for standalone | Flavor file includes full procedure for single-file utility. Duplicates shared content. | |

**User's choice:** Flavor points to shared
**Notes:** No duplication. Shared files are single source of truth.

### Q3: Should SKILL.md include multi-step workflow loading sequences?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, workflow sequences | Add "Common workflows" section to action index with numbered file loading order for multi-step operations. | ✓ |
| No, agents figure it out | Agents follow self-contained pointers naturally. No explicit workflow in SKILL.md. | |
| In flavor files, not SKILL.md | Workflow orchestration belongs in flavor references, not the routing entry point. | |

**User's choice:** Yes, workflow sequences in SKILL.md
**Notes:** Minor SKILL.md edit alongside main shared file work. Explicit loading order for submit-item, challenge/remove workflows.

---

## Claude's Discretion

- Subsection ordering within each shared file — researcher/planner determine natural information flow
- How much inline context is "enough" before pointing to another file — judgment call based on actionability

## Deferred Ideas

- Standardized pointer format (arrow vs parenthetical) — decide during implementation
- Circular reference handling between shared files — unlikely issue with self-contained + pointers approach
