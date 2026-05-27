# Phase 3: Flavor References - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Fill the 3 flavor reference files (light-curate.md, stake-curate.md, scout-registries.md) with content extracted and rewritten from the 3 draft skills (2,366 lines). Each flavor file covers its unique operations using the hybrid format: numbered workflow steps with section-level pointers to shared files for procedural depth. No content from shared-*.md files (Phase 2) is duplicated — flavor files own the workflow orchestration, shared files own the procedures.

All unfilled sections in the flavor stubs (including those mislabeled "[Phase 2 content here]" in light-curate.md) are Phase 3 scope.

</domain>

<decisions>
## Implementation Decisions

### Content Format
- **D-01:** Hybrid numbered steps + pointers — each operation section shows the full numbered workflow with inline one-liners explaining each step, delegating HOW to shared files. Agent sees the complete operation sequence from one file load (~150-250 lines per file for LGTCR/PGTCR), loads shared files on demand for procedural detail. Matches how the PGTCR draft already structures its operations.
- **D-02:** Section-level pointers from flavor files into shared files — e.g., "shared-deposits.md § LGTCR specifics" rather than bare file-level pointers. Eliminates ambiguity about which subsection is relevant; agent jumps directly to the right content.

### File Structure
- **D-03:** LGTCR and PGTCR share parallel section ordering (inputs → discovery → operations → factory) since they're both operations manuals for different contract types. PGTCR adds unique sections after the shared structure (status model, admin actions, withdrawal flow).
- **D-04:** Scout keeps its organic overlay structure (addresses → seed templates → view helper → API → images → incentives) since it's a context document layered on LGTCR operations, not a standalone operations manual.
- **D-05:** 300-line TOC threshold (same WRIT-03 standard as Phase 2). stake-curate.md is expected to exceed this (~337 lines) and gets a TOC. Other two files stay under 300.

### Scout Content
- **D-06:** All 4 seed templates (~170 lines JSON) inline in scout-registries.md. Templates ARE the core value — agents load this file for the "seed-first" submission pattern. JSON tokenizes efficiently. File lands at ~250-280 lines.
- **D-07:** Image section keeps only Scout-specific requirements (format, size, what constitutes valid visual proof per registry type). Upload mechanics → shared-ipfs-upload.md. ~15 lines instead of 70.

### PGTCR Content
- **D-08:** All 4 Goldsky GraphQL queries (~140 lines) inline in stake-curate.md with TOC. Queries are coupled to the status model (field selections encode domain knowledge the derived-status algorithm needs). Consistent with Scout template decision — bulky structured data stays inline when it's the file's core value.
- **D-09:** PGTCR derived status algorithm presented as pseudocode block (~35 lines). Evaluation-order dependencies (withdrawal check before accepted check) require sequential logic that a flat decision table would lose.

### Staleness
- **D-10:** Tiered staleness handling by risk level:
  - Incentive amounts: remove specific figures (e.g., "300k PNK/month"), redirect to blog.kleros.io for current campaign terms. High staleness risk, financial impact.
  - Endpoints (Goldsky, scout-api): hardcode current URLs. If they break, users update the skill from the marketplace. Agent self-recovers from HTTP errors.
  - Contract/helper addresses: keep as-is, no warnings. Immutable deployed contracts.
  - Evergreen framing ("Scout offers incentive programs"): keep inline as structural protocol truth.
- **D-11:** Goldsky subgraph endpoints hardcoded with current URLs for Mainnet/Gnosis/Sepolia. No in-skill discovery pattern or URL structure notes. Staleness is handled by skill version updates from the marketplace, not by in-skill fallback logic.

### Cleanup
- **D-12:** Strip all Phase 1 HTML source markers (`<!-- Source: curate-v1/... -->`). They served their extraction purpose for Phase 2/3 agents. Published skill files should not reference internal draft files that don't ship with the plugin. Git blame preserves provenance.

### Cross-References
- **D-13:** Scout → Light Curate is the only cross-flavor dependency (existing stub banner: "also load references/light-curate.md"). PGTCR and LGTCR are fully independent — shared files handle common ground. No other cross-flavor pointers.

### Phase 3 Handoffs from Shared Files
- **D-14:** Three explicit handoffs exist in shared files that Phase 3 must fulfill:
  - `shared-deposits.md:73` — "write the tx call in each flavor file (Phase 3)" (PGTCR addItem signature differs from LGTCR)
  - `shared-deposits.md:112` — "fundAppeal algorithm (getItemInfo → getRequestInfo → getRoundInfo chain) deferred to flavor-specific files (Phase 3)"
  - `shared-metaevidence.md:99` — "Goldsky endpoint URLs are in stake-curate.md — Phase 3 scope"

### Claude's Discretion
- Specific ordering of subsections within each flavor file — planner/researcher can determine natural information flow within the parallel (LGTCR/PGTCR) and organic (Scout) structures
- How much inline context is "enough" in each hybrid step before the pointer — use judgment on whether the one-liner is actionable without loading the target shared file
- Whether to include the Scout submission checklist (14 items in draft §14) as a standalone section or fold checklist items into the operation workflow steps

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Skill Design Patterns
- `.planning/research/SUMMARY.md` — Architecture decision, platform constraints, content analysis
- `.planning/research/SKILL-DESIGN.md` — Skill design patterns and context limits
- `.planning/research/PROGRESSIVE-DISCLOSURE.md` — Progressive disclosure patterns for skills
- `.planning/research/CONTENT-ANALYSIS.md` — Content overlap analysis across 3 draft files (identifies exactly which sections overlap)

### Draft Skills (source material for extraction and rewriting)
- `curate-v1/curate-light-skill.md` — LGTCR draft (708 lines) — primary source for light-curate.md
- `curate-v1/pgtcr-stake-curate-skill.md` — PGTCR draft (650 lines) — primary source for stake-curate.md
- `curate-v1-scout/scout-skills.md` — Scout draft (1,008 lines) — primary source for scout-registries.md

### Phase 1 Output (stubs to fill)
- `kleros-curate/references/light-curate.md` — Stub with 11 section headings + source markers (45 lines)
- `kleros-curate/references/stake-curate.md` — Stub with 11 section headings + source markers (45 lines)
- `kleros-curate/references/scout-registries.md` — Stub with 8 section headings + source markers (41 lines)

### Phase 2 Output (shared files — do NOT duplicate content from these)
- `kleros-curate/references/shared-metaevidence.md` — MetaEvidence retrieval (105 lines) — check § pointers match actual headings
- `kleros-curate/references/shared-deposits.md` — Deposit computation (112 lines) — contains Phase 3 handoffs at lines 73 and 112
- `kleros-curate/references/shared-item-json.md` — item.json construction (139 lines) — already covers field-value types and CAIP-10
- `kleros-curate/references/shared-abi-fragments.md` — ABI fragments (183 lines)
- `kleros-curate/references/shared-ipfs-upload.md` — IPFS upload (79 lines)

### SKILL.md (verify action index and common workflows still align after filling)
- `kleros-curate/SKILL.md` — Routing skeleton, non-negotiables, action index, common workflows (~150 lines)

### Skill-Creator Guidance
- Skill-creator SKILL.md (installed plugin) — Writing patterns, progressive disclosure, domain organization. Key rules: imperative form, explain the why, lean content, >300 lines → ToC.

### Published Skill (reference for style)
- `kleros-ipfs-upload/SKILL.md` — Published skill (283 lines) — reference for writing style and content density

### Plugin Structure
- `CLAUDE.md` — Repo conventions: naming rules, versioning, publishing checklist

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 1 stubs provide the section scaffold — headings and one-liner descriptions define the structure to fill
- Phase 2 shared files provide the procedural building blocks — flavor files orchestrate these via section-level pointers
- Draft skills (2,366 lines) provide the source material — rewrite in hybrid format, don't copy-paste
- `kleros-ipfs-upload/SKILL.md` lines 36-48: writing style reference for imperative form and content density

### Established Patterns
- Hybrid numbered steps with pointers to shared files (new pattern for Phase 3, derived from how PGTCR draft already structured its operations)
- Structured list format for LLM readability (D-12 from Phase 1, D-12 from Phase 2)
- Agent autonomy framing: "recommended" not "required" (D-08 from Phase 1)
- Imperative/infinitive form (WRIT-01, D-10 from Phase 2)
- Explain the WHY behind constraints (WRIT-02, D-11 from Phase 2)
- Self-contained + pointers cross-referencing (D-07 from Phase 2)

### Integration Points
- Shared files reference flavor files at 3 handoff points (D-14 above) — these must be fulfilled
- SKILL.md action index and common workflows reference flavor files by name — section headings in filled files must match stub headings
- Scout → Light Curate dependency: scout-registries.md assumes light-curate.md exists with LGTCR operations

</code_context>

<specifics>
## Specific Ideas

- PGTCR submit workflow should show the two-step nature prominently: "Step 6: Approve ERC20 stake → Step 7: addItem with msg.value = arbitrationCost only" — this is the #1 difference from LGTCR
- Scout incentives section: keep the three profit paths (project visibility, submitter rewards, challenger bounties) as evergreen framing, but replace all specific figures with "For current campaign terms and reward amounts, check blog.kleros.io"
- Scout submission checklist (§14 in draft, 14 items) — useful as a pre-flight sanity check, consider preserving as a standalone section
- Grep shared files for "Phase 3" before writing to catch all handoff points: `grep -n "Phase 3\|phase 3" kleros-curate/references/shared-*.md`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Flavor References*
*Context gathered: 2026-05-27*
