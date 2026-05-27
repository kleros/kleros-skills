# Phase 2: Shared References - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract all content shared across two or more Curate flavors from the 3 draft skills (2,366 lines) into the 5 `shared-*.md` reference files scaffolded in Phase 1. Apply writing quality standards (WRIT-01 through WRIT-04). Add a "Common workflows" section to SKILL.md's action index showing multi-step loading sequences. Flavor-specific reference files (Phase 3) are out of scope — only shared content is extracted here.

</domain>

<decisions>
## Implementation Decisions

### Flavor Callout Style
- **D-01:** Subsections per flavor — shared procedure first, then `### LGTCR specifics` and `### PGTCR specifics` subsections within each shared file. Truly shared parts (e.g., msg.value assembly) get their own sections without flavor prefix.
- **D-02:** Scout does NOT get its own subsection in shared files — Scout uses identical LGTCR mechanics at the contract layer. Add a parenthetical pointer under LGTCR subsections: "(Scout registries use these same LGTCR mechanics — see scout-registries.md for the 4 specific registry addresses.)"
- **D-03:** Table of contents at top of any shared file exceeding 300 lines (per WRIT-03 and skill-creator guidance).

### ABI Representation
- **D-04:** Solidity-style human-readable signatures for all functions and events — e.g., `function addItem(bytes _item) external payable`. Both ethers and viem parse these natively. Matches the `grep -n "function\|event"` pattern already in SKILL.md action index.
- **D-05:** Full event signatures in the same Solidity-style format (not just topic0 hashes) — agents derive topic0 from the signature. e.g., `event MetaEvidence(uint256 indexed _metaEvidenceID, string _evidence)`.
- **D-06:** No JSON ABI arrays. Solidity-style is the single format.

### Cross-Referencing
- **D-07:** Self-contained + pointers — each shared file includes enough inline context to be usable alone for its primary task (e.g., shared-deposits.md explains the `arbitrationCost()` call inline). Add a parenthetical pointer for depth: "(Full ABI signatures: shared-abi-fragments.md)". Agents should not be forced to load a second shared file for the primary operation.
- **D-08:** Flavor files (Phase 3) point to shared files as single source of truth — no duplication. Flavor files add only what's not covered in shared files (e.g., stake-curate.md adds the ERC20 `approve()` flow before staking, but deposit formulas live in shared-deposits.md only).
- **D-09:** SKILL.md gets a "Common workflows" section in the action index showing multi-step loading sequences for common operations (submit item, challenge/remove item). Each sequence lists the shared + flavor files to load in order. This is a minor SKILL.md edit alongside the main shared file extraction work.

### Writing Quality (from skill-creator + WRIT requirements)
- **D-10:** Imperative/infinitive form per WRIT-01 and skill-creator ("prefer using the imperative form in instructions").
- **D-11:** Explain the WHY behind constraints per WRIT-02 and skill-creator ("explain the why behind everything... if you find yourself writing ALWAYS or NEVER in all caps, that's a yellow flag — reframe and explain the reasoning"). Reframe naked rules into reasoned guidance.
- **D-12:** Structured list format over markdown tables per D-12 from Phase 1 — less tokenization overhead for LLMs.
- **D-13:** Keep content lean — "remove things that aren't pulling their weight" (skill-creator). Extract what agents need, not everything from draft skills.

### Claude's Discretion
- The specific ordering of subsections within each shared file — researcher/planner can determine natural information flow
- How much inline context is "enough" in each self-contained section before pointing to another file — use judgment based on whether the inline version is actionable without the pointer target

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Skill Design Patterns
- `.planning/research/SUMMARY.md` — Research summary: architecture decision, platform constraints, content analysis
- `.planning/research/SKILL-DESIGN.md` — Skill design patterns and context limits
- `.planning/research/PROGRESSIVE-DISCLOSURE.md` — Progressive disclosure patterns for skills
- `.planning/research/CONTENT-ANALYSIS.md` — Content overlap analysis across 3 draft files (identifies exactly which sections overlap)

### Draft Skills (source material for extraction)
- `curate-v1/curate-light-skill.md` — LGTCR draft (708 lines) — primary source for shared MetaEvidence, deposits, item.json, ABI fragments
- `curate-v1/pgtcr-stake-curate-skill.md` — PGTCR draft (650 lines) — source for PGTCR-specific subsections in shared files
- `curate-v1-scout/scout-skills.md` — Scout draft (1,008 lines) — source for Scout-specific MetaEvidence and IPFS patterns

### Phase 1 Output (scaffolding to fill)
- `kleros-curate/SKILL.md` — Routing skeleton, non-negotiables, action index (will be updated with "Common workflows" section)
- `kleros-curate/references/shared-metaevidence.md` — Stub with section headings + source markers
- `kleros-curate/references/shared-deposits.md` — Stub with section headings + source markers
- `kleros-curate/references/shared-item-json.md` — Stub with section headings + source markers
- `kleros-curate/references/shared-abi-fragments.md` — Stub with section headings + source markers
- `kleros-curate/references/shared-ipfs-upload.md` — Stub with section headings + source markers

### Skill-Creator Guidance
- Skill-creator SKILL.md (installed plugin) — Writing patterns, progressive disclosure, domain organization, description optimization. Key rules: imperative form, explain the why, lean content, >300 lines → ToC.

### Published Skill (reference for style)
- `kleros-ipfs-upload/SKILL.md` — Published skill (283 lines) — reference for writing style and content density

### Plugin Structure
- `CLAUDE.md` — Repo conventions: naming rules, versioning, publishing checklist, IPFS CID URL gotcha

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 1 stubs with HTML source markers (`<!-- Source: curate-v1/curate-light-skill.md §N -->`) — trace exactly which draft sections to extract content from
- `kleros-ipfs-upload/SKILL.md` lines 36-48: IPFS upload procedure and durability rationale — reference for shared-ipfs-upload.md content
- `.planning/research/CONTENT-ANALYSIS.md`: overlap analysis identifying which content appears in 2+ draft files (the extraction target list)

### Established Patterns
- Structured list format for LLM readability (D-12 from Phase 1)
- Source markers as HTML comments for traceability (D-14 from Phase 1)
- Agent autonomy framing: "recommended for durability" not "required" (D-08 from Phase 1)

### Integration Points
- `kleros-curate/SKILL.md` action index — will be updated with "Common workflows" section
- Flavor reference files (Phase 3) will point to shared files created here — shared files must use predictable heading names for cross-reference pointers
- `kleros-ipfs-upload` skill — shared-ipfs-upload.md references this as the recommended upload path

</code_context>

<specifics>
## Specific Ideas

- Workflow sequences in SKILL.md action index should show numbered steps: "1. shared-metaevidence.md (fetch schema), 2. shared-item-json.md (build payload), ..." — explicit loading order for multi-step operations
- Scout parenthetical pointers should use consistent format: "(Scout registries use these same LGTCR mechanics — see scout-registries.md for the 4 specific registry addresses.)"
- ABI file sections should follow the stub's existing structure: read functions, write functions, events — grouped by contract type (LGTCR, PGTCR, IArbitrator)

</specifics>

<deferred>
## Deferred Ideas

- Standardized pointer format across all shared files (arrow notation vs parenthetical) — can be decided during implementation
- Circular reference handling between shared files (e.g., metaevidence ↔ IPFS) — unlikely to be an issue with self-contained + pointers approach

</deferred>

---

*Phase: 2-Shared References*
*Context gathered: 2026-05-27*
