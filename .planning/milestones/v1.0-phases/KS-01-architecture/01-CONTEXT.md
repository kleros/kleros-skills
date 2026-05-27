# Phase 1: Architecture - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the `kleros-curate/` directory structure, write SKILL.md with routing decision tree and action index, and generate scaffolded reference file stubs. No content extraction — that's Phase 2/3.

</domain>

<decisions>
## Implementation Decisions

### Routing Decision Tree
- **D-01:** Hybrid routing — keywords first (zero-cost), then contract address lookup if user provides an address or intent is ambiguous
- **D-02:** Keyword triggers for Scout: "Scout", "token list", "address tags", "CDN". For PGTCR: "PGTCR", "Stake Curate", "PermanentGTCR", "Goldsky". Note: "ERC20 stake" is internal jargon and NOT a good user-facing intent trigger. Default: Light Curate
- **D-03:** Ambiguous routing (user says "Curate" with no flavor hint): if interactive session, ask briefly with 1-sentence descriptions of each flavor; if one-shot/non-interactive, default to Light Curate then progressively correct — if address matches Scout's 4 registries, load Scout context as overlay; if contract introspection reveals PGTCR, pivot
- **D-04:** Scout is an overlay on Light Curate (not a hard fork) — reflects that Scout IS LGTCR at the contract layer
- **D-05:** Contract-type detection (LGTCR vs PGTCR) is deferred to reference files — SKILL.md says "check the contract type" but each flavor reference explains how

### Reference File Granularity
- **D-06:** 8 separate reference files — maximum precision, agent reads only the exact file needed:
  - 3 flavor: `light-curate.md`, `stake-curate.md`, `scout-registries.md`
  - 5 shared: `shared-metaevidence.md`, `shared-deposits.md`, `shared-item-json.md`, `shared-abi-fragments.md`, `shared-ipfs-upload.md`
- **D-07:** IPFS upload gets its own shared reference file (`shared-ipfs-upload.md`) covering: durability rationale (third-party pins can vanish after on-chain anchoring), recommendation to use `kleros-ipfs-upload` skill (pins on Kleros nodes), `/ipfs/<CID>` format rule, and explicit note that agents are free to use their own IPFS mechanism
- **D-08:** Respect agent autonomy — skills guide and recommend, never force specific tools. Frame as "recommended for durability" not "required"

### SKILL.md Content Scope
- **D-09:** Brief "Curate in a nutshell" explainer (~15 lines) for agents with zero context — what it does, deposit/challenge/arbitration cycle, why onchain-first matters
- **D-10:** Merged non-negotiables section in SKILL.md (always in context) — safety-critical rules that apply across all flavors: never guess amounts, onchain-first, never rewrite schema
- **D-11:** Action index as a structured list (not markdown table) mapping user intents to reference files, with grep search patterns inline where reference files are large enough to warrant them
- **D-12:** Structured list format preferred over markdown tables for LLM readability — less tokenization overhead from pipe/dash alignment characters

### Stub Detail Level
- **D-13:** Reference file stubs include section headings + one-liner description per section (~20-40 lines per stub). Gives Phase 2/3 a clear scaffold
- **D-14:** Source markers in stubs as HTML comments: `<!-- Source: curate-v1/curate-light-skill.md L540-560 -->` — traces back to which draft file each section's content comes from

### Claude's Discretion
- D-05 above: the specific mechanism for contract-type detection (which function signature to check) — planner/researcher can determine the best approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Skill Design Patterns
- `.planning/research/SUMMARY.md` — Research summary: architecture decision, platform constraints, content analysis
- `.planning/research/SKILL-DESIGN.md` — Skill design patterns and context limits
- `.planning/research/PROGRESSIVE-DISCLOSURE.md` — Progressive disclosure patterns for skills
- `.planning/research/ARCHITECTURES.md` — Architecture options evaluated
- `.planning/research/CONTENT-ANALYSIS.md` — Content overlap analysis across 3 draft files

### Draft Skills (source material)
- `curate-v1/curate-light-skill.md` — LGTCR draft (708 lines) — source for light-curate.md and shared content
- `curate-v1/pgtcr-stake-curate-skill.md` — PGTCR draft (650 lines) — source for stake-curate.md and shared content
- `curate-v1-scout/scout-skills.md` — Scout draft (1,008 lines) — source for scout-registries.md

### Published Skill (reference implementation)
- `kleros-ipfs-upload/SKILL.md` — Published skill (283 lines) — reference for SKILL.md structure, YAML frontmatter, description style

### Plugin Structure
- `.claude-plugin/plugin.json` — Plugin manifest (version source of truth)
- `CLAUDE.md` — Repo conventions: naming rules, versioning, publishing checklist

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `kleros-ipfs-upload/SKILL.md`: published skill at 283 lines — reference for YAML frontmatter format, description style ("pushy" third-person), when-to-use/when-not-to-use structure
- `kleros-ipfs-upload/scripts/`: TypeScript scripts run via `npx tsx` — pattern for bundled scripts if curate skill needs any

### Established Patterns
- Plugin structure: `plugin.json` with `skills[]` array pointing to `./skillname` directories
- Skill files: `SKILL.md` with YAML frontmatter (`name`, `description`) in each skill directory
- Description style: third-person, "pushy", includes positive and negative triggers
- No build step, no lockfile for script subdirectories

### Integration Points
- `plugin.json` `skills[]` array: Phase 5 will add `"./kleros-curate"` here
- `marketplace.json` `plugins[]`: Phase 5 will add catalog entry
- `kleros-ipfs-upload` skill: curate skill's `shared-ipfs-upload.md` will reference this as the recommended upload path

</code_context>

<specifics>
## Specific Ideas

- Scout as an overlay on Light Curate, not a separate fork — routing should reflect this by loading Scout context ON TOP of LGTCR context when a Scout registry is detected
- The action index should use the structured list format (bold label → arrow → file references) rather than markdown tables, for better LLM tokenization
- Source markers in stubs use HTML comments so they're invisible in rendered markdown but grep-able

</specifics>

<deferred>
## Deferred Ideas

- IPFS durability: Kleros needs to eagerly crawl contract transactions to surface CIDs and pin them on Kleros nodes (mid-to-long-term priority, not live yet)
- Eval testing via skill-creator's `run_loop.py` — valuable but deferred to after v1.0 manual testing (see REQUIREMENTS.md Future Requirements)

</deferred>

---

*Phase: 1-Architecture*
*Context gathered: 2026-05-26*
