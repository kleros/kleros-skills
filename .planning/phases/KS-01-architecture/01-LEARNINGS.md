---
phase: 1
phase_name: "Architecture"
project: "Kleros Skills"
generated: "2026-05-26"
counts:
  decisions: 5
  lessons: 3
  patterns: 4
  surprises: 2
missing_artifacts:
  - "01-VERIFICATION.md"
  - "01-UAT.md"
---

# Phase 1 Learnings: Architecture

## Decisions

### Hybrid routing: keyword-first, then contract address lookup
Routing tree uses a zero-cost keyword scan as Step 1 before any onchain calls. Contract-type verification only runs when the user provides an address and Step 1 didn't resolve.

**Rationale:** Avoids unnecessary RPC calls for the majority of interactions where the user's phrasing already reveals the flavor. Keeps the common path fast and cheap.
**Source:** 01-01-PLAN.md (D-01 through D-05)

### Scout dual-file load pattern
Scout routes to BOTH `scout-registries.md` AND `light-curate.md` — Scout is an overlay on LGTCR, not a fork. The overlay note lives in both the SKILL.md router and the scout-registries.md header.

**Rationale:** Scout uses the same LightGeneralizedTCR contracts. Agents need the full LGTCR reference for contract operations plus Scout-specific context (4 registries, seed templates). Putting the note in both locations prevents breakage if an agent is directed to scout-registries.md without going through SKILL.md first.
**Source:** 01-01-SUMMARY.md, 01-02-SUMMARY.md (D-04)

### Structured lists over markdown tables throughout
Action index, non-negotiables, routing tree — all use structured lists, never markdown tables.

**Rationale:** Tables are rigid, hard to update, and break when reference file paths change. Lists allow inline prose, emphasis, and grep patterns. Consistent "no tables" rule (D-12) means one fewer decision per section.
**Source:** 01-01-PLAN.md (D-11, D-12)

### shared-ipfs-upload.md partially pre-filled in Phase 1
The double-slash trap and durability rationale are pre-filled as known facts from D-07 and the published kleros-ipfs-upload skill, not deferred to Phase 2.

**Rationale:** These are concrete, stable facts (URL format rule, durability argument) — not "draft content extraction." Pre-filling them prevents agents from hitting the double-slash trap even before Phase 2 runs.
**Source:** 01-03-SUMMARY.md

### Scout overlay note as blockquote
Overlay note in scout-registries.md written as a Markdown blockquote (`> ...`) immediately after H1 and source comment.

**Rationale:** Blockquotes render with visual prominence in Markdown viewers, are grep-able, and clearly distinguish instructional metadata from section content.
**Source:** 01-02-SUMMARY.md

---

## Lessons

### Parallel worktrees both create the same directory
Plans 02 and 03 both needed `kleros-curate/references/`. Running in parallel worktrees, each independently created the directory since the other's changes hadn't merged yet. No conflict resulted because `mkdir -p` is idempotent and the files within are unique across plans.

**Context:** The plan correctly anticipated this with "if not, create it" language. For future parallel plans sharing a parent directory, no special coordination is needed — just ensure each plan uses `mkdir -p` and files don't overlap.
**Source:** 01-03-SUMMARY.md (Deviations section)

### Source markers enable traceable Phase 2/3 extraction
Every section heading in every stub has a `<!-- Source: path/to/file.md §section -->` HTML comment. Phase 2/3 executors can trace exactly which draft skill section to extract without re-reading the full 2,366-line draft corpus.

**Context:** This was a D-14 decision but the practical value is larger than expected — it turns stubs into a "build manifest" for content extraction phases, not just documentation.
**Source:** 01-02-SUMMARY.md (patterns-established), 01-03-SUMMARY.md

### Routing/index files are naturally concise when content is deferred
SKILL.md came in at 163 lines vs. the ~250-line target. When all operational content lives in reference files, the routing entry point only needs keywords, paths, and brief descriptions — not explanations.

**Context:** The 150-500 line acceptance range was conservatively wide. For future phases, routing-only files can target ~150-200 lines with confidence.
**Source:** 01-01-SUMMARY.md (Deviations section)

---

## Patterns

### HTML comment source markers for cross-phase provenance
Format: `<!-- Source: path/to/file.md §section -->` on the line after each heading. Enables `grep -n "Source:" file.md` to produce a complete extraction manifest.

**When to use:** Any phase that creates scaffolds to be filled in later phases. The markers eliminate re-reading source material when it's time to extract.
**Source:** 01-02-PLAN.md (D-14), 01-02-SUMMARY.md

### Reference stub format (heading + source + one-liner + placeholder)
```
## Section Name
<!-- Source: origin-file.md §section-id -->
One-line description of what goes here.
[Phase N content here]
```

**When to use:** When creating file scaffolds that will be filled across multiple phases. Provides structure, provenance, and clear phase boundaries in a single compact format.
**Source:** 01-02-PLAN.md, 01-03-PLAN.md

### Overlay-note-in-both-locations pattern
When File A is an overlay on File B, put the "also load B" instruction in BOTH the router (SKILL.md) AND File A's header. Redundant but safe — agents may arrive at File A from multiple paths.

**When to use:** Any skill with composite/overlay files where an agent might be directed to a partial reference without the full context.
**Source:** 01-02-SUMMARY.md (Scout dual-file pattern)

### Working-draft YAML description (early triggers, late wording)
Include all positive and negative triggers in the YAML description from Phase 1, but mark it as working-draft. Finalize wording and character-count optimization in a dedicated later phase (Phase 4).

**When to use:** Multi-phase skill development where triggering accuracy matters but the final wording depends on completed content.
**Source:** 01-01-PLAN.md (TRIG-01 deferral)

---

## Surprises

### SKILL.md 35% smaller than target
163 lines vs. ~250-line plan target. A pure routing/index file with no operational content is naturally concise. The 150-500 acceptance range was conservative.

**Impact:** Positive — more context budget available for reference files. Future routing-only files can plan for ~150-200 lines.
**Source:** 01-01-SUMMARY.md

### Zero execution deviations across 3 parallel plans
All 3 plans executed exactly as written with no plan-file deviations (the mkdir -p in Plan 03 was explicitly anticipated). Typical for documentation-only phases where there are no runtime surprises, dependency issues, or API changes.

**Impact:** Confirms that thorough discuss/plan phases (with PATTERNS.md, CONTEXT.md, and RESEARCH.md) produce highly executable plans for content-creation work. Execution is near-mechanical when the plan is specific enough.
**Source:** 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md
