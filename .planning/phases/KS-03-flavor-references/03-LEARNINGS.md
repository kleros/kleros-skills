---
phase: 3
phase_name: "Flavor References"
project: "Kleros Skills"
generated: "2026-05-27"
counts:
  decisions: 5
  lessons: 4
  patterns: 4
  surprises: 3
missing_artifacts:
  - "VERIFICATION.md"
  - "UAT.md"
---

# Phase 3 Learnings: Flavor References

## Decisions

### Hybrid format with section-level pointers (D-01/D-02)

Flavor files show complete numbered workflows inline with one-liners per step, delegating procedural depth to shared files via subsection-level pointers (`shared-deposits.md SS LGTCR specifics`, not bare filenames). An agent loads one flavor file and sees the full operation sequence without needing to context-switch.

**Rationale:** Agents need the operational sequence visible in a single file load. Bare file pointers leave ambiguity about which subsection is relevant. The hybrid format was validated by how the PGTCR draft already structured its operations.
**Source:** 03-CONTEXT.md (D-01, D-02), 03-01-SUMMARY.md, 03-02-SUMMARY.md

---

### Inline bulky structured data when it's the file's core value (D-06/D-08)

Scout seed templates (~170 lines JSON) and PGTCR GraphQL queries (~140 lines) kept inline rather than extracted to separate files, even though they inflate line counts significantly (stake-curate.md reached 615 lines). The data IS the reason agents load these files.

**Rationale:** Extracting queries/templates to separate files would defeat the single-file-load value proposition. JSON and GraphQL tokenize efficiently. The TOC (D-05) handles navigability for files exceeding 300 lines.
**Source:** 03-CONTEXT.md (D-06, D-08), 03-02-SUMMARY.md, 03-03-SUMMARY.md

---

### Tiered staleness handling by risk level (D-10/D-11)

Three staleness tiers: (1) financial figures removed entirely, redirected to blog.kleros.io; (2) endpoints hardcoded with version-update recovery; (3) immutable contract addresses kept as-is. No in-skill discovery patterns or URL construction hints.

**Rationale:** Incentive amounts change with governance votes and mislead if stale. Endpoints break less often and are handled by skill updates. Contract addresses are immutable deployments.
**Source:** 03-CONTEXT.md (D-10, D-11), 03-03-SUMMARY.md

---

### challengeRequest pitfall documentation overrides strict grep-zero criterion

Two occurrences of `challengeRequest` kept in stake-curate.md as explicit pitfall warnings ("use `challengeItem`, not `challengeRequest`"). The acceptance criterion (`grep -c "challengeRequest"` returns 0) conflicted with the plan requirement to document the PGTCR/LGTCR function name difference.

**Rationale:** Documenting the pitfall is more important than a clean grep count. All executable/callable contexts correctly use `challengeItem`. The mentions are clearly framed as "do not use this name."
**Source:** 03-02-SUMMARY.md (Deviations)

---

### Challenge-scoped arbitrationSetting.index added to GraphQL query 4C

Query 4C was augmented with `arbitrationSetting { arbitratorExtraData index }` in the challenges block to enable index-scoped extraData retrieval for appeal funding — a Codex HIGH requirement not originally in the source draft.

**Rationale:** Appeal funding must use the arbitratorExtraData that was active when the dispute was created, not the current registry-level value. The challenge record's `arbitrationSetting.index` field provides this scoping.
**Source:** 03-02-SUMMARY.md (Deviations, Rule 2)

---

## Lessons

### eth_getLogs keyword contaminates acceptance checks even in non-procedural contexts

The light-curate.md acceptance criterion checked for zero `eth_getLogs` mentions to verify no shared-file content was duplicated. But the MetaEvidence pointer description initially contained `eth_getLogs` as a descriptive label (not the procedure), causing a false positive. Replaced with "log retrieval" to pass.

**Context:** Acceptance criteria that grep for specific technical terms can be triggered by legitimate non-procedural mentions (descriptions, labels, pointer text). Consider narrowing grep patterns or using comment-aware matching.
**Source:** 03-01-SUMMARY.md (Deviations, auto-fixed)

---

### PGTCR function names are a critical correctness boundary

PGTCR uses `challengeItem` (not `challengeRequest`), `uint120 _challengeID` (not `uint256 _requestID`), and `arbitrationParamsChanges(index)` (not `arbitratorExtraData()`). Wrong names cause silent ABI encoding failures or tx reverts. Phase 2 lesson CR-01 already flagged `arbitratorExtraData()` — Phase 3 extends this to all PGTCR-specific function name differences.

**Context:** Three separate function name/type pitfalls exist between LGTCR and PGTCR. Each was caught by plan-level acceptance criteria that grep for correct and incorrect names. This level of defensive checking is warranted for contract interaction skills.
**Source:** 03-02-PLAN.md (must_haves.truths), 03-02-SUMMARY.md

---

### Seed template type strings must be preserved verbatim

Scout seed templates contain type strings like `"long text"`, `"rich address"`, `"image"` that are consumed by MetaEvidence schema validation. Normalizing these (e.g., `"longText"`, `"richAddress"`) would break schema matching. The plan explicitly forbade normalization and the acceptance criteria included a manual check.

**Context:** When copying structured data from source drafts, type strings and enum values are part of the contract with external systems. Automated reformatting or style normalization must be suppressed for these fields.
**Source:** 03-03-PLAN.md (action text, acceptance_criteria), 03-03-SUMMARY.md (Threat T-03-19)

---

### Overlay documents need explicit dependency banners

Scout's scout-registries.md is not a standalone operations manual — it layers Scout-specific context on top of LGTCR operations in light-curate.md. Without the top-of-file banner ("also load `references/light-curate.md`"), an agent would attempt Scout operations with only the overlay context and fail on contract interactions.

**Context:** When a reference file is an overlay rather than self-contained, the dependency must be declared at the point of entry, not buried in a routing table the agent may not have loaded.
**Source:** 03-03-PLAN.md (D-13), 03-03-SUMMARY.md

---

## Patterns

### Handoff contracts between shared and flavor files

Shared files declare explicit handoff points with line numbers ("write the tx call in each flavor file — Phase 3") that downstream phases must fulfill. Three handoffs existed: `shared-deposits.md:73` (PGTCR addItem signature), `shared-deposits.md:112` (fundAppeal algorithm), `shared-metaevidence.md:99` (Goldsky endpoints). Each was tracked as a D-14 must_have and verified in acceptance criteria.

**When to use:** Any time Phase N writes a file that defers content to Phase N+1. The handoff should include: exact line number, what must be written, and why the deferred file is the right owner.
**Source:** 03-CONTEXT.md (D-14), 03-01-PLAN.md, 03-02-PLAN.md

---

### Parallel wave execution for independent flavor files

All 3 flavor files modify different paths with no shared dependencies. Wave 1 executed all 3 plans in parallel worktrees, completing in ~15 minutes wall-clock (vs ~35 minutes sequential). No merge conflicts since files_modified lists don't overlap.

**When to use:** When plans in the same wave modify disjoint file sets and have no inter-plan data dependencies. The orchestrator's intra-wave overlap check confirms safety before dispatch.
**Source:** 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md (parallel execution)

---

### Acceptance criteria as correctness firewall for contract interactions

Each plan included 15-20+ acceptance criteria combining automated greps and manual checks. Contract-interaction-specific checks went beyond structural validation: requestArbitratorExtraData presence, registration-vs-removal deposit selection, correct function names, correct parameter types. These caught the eth_getLogs false positive and confirmed the challengeRequest pitfall documentation.

**When to use:** Any skill that generates contract interaction instructions. Structural checks (line count, headings present) are necessary but not sufficient — domain-specific correctness checks prevent silent errors that would cause tx reverts.
**Source:** 03-01-PLAN.md (acceptance_criteria), 03-02-PLAN.md (acceptance_criteria)

---

### Seed-first inversion for template-heavy registries

Scout registries invert the normal flow: instead of MetaEvidence-first (fetch schema, infer structure, build JSON), agents use the embedded seed template as primary source and MetaEvidence as cross-check. If they disagree: stop and ask. This reduces field-order mistakes and missing-field errors.

**When to use:** When the target system has well-known, stable JSON shapes that change infrequently via governance. The seed template provides a pre-validated snapshot; MetaEvidence confirms it's still current.
**Source:** 03-03-PLAN.md (D-04, action text), 03-03-SUMMARY.md

---

## Surprises

### stake-curate.md reached 615 lines — nearly 2x the 337-line estimate

The PGTCR operations manual grew to 615 lines, well beyond the ~337-line estimate from planning. GraphQL queries, derived-status pseudocode, and the additional sections (Fund appeal, Withdrawal flow, Onchain fallbacks) each contributed more content than anticipated. The 280-line minimum acceptance criterion had comfortable headroom.

**Impact:** The TOC (required at 300+ lines per D-05) was essential — without it, the file would be difficult to navigate. Future PGTCR-type plans should estimate 500-600 lines when inline structured data (queries, pseudocode) is expected.
**Source:** 03-02-SUMMARY.md (615 lines vs 337 estimate)

---

### All 3 plans completed with zero deviations requiring user intervention

Every auto-fixed issue (eth_getLogs keyword, challengeRequest pitfall documentation, query 4C augmentation) was resolved within the executor without escalation. No checkpoints triggered, no blockers encountered. Pure markdown authoring phases with well-specified acceptance criteria are highly autonomous.

**Impact:** Confirms that detailed plan specifications with domain-specific acceptance criteria enable fully autonomous execution. The investment in planning (discuss → research → plan → review) pays off in zero-intervention execution.
**Source:** 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md (all self-check PASSED)

---

### Codex cross-AI review findings integrated seamlessly into plan acceptance criteria

The Codex review from Phase 3 planning surfaced 3 HIGH and 4 MEDIUM findings (requestArbitrator scoping, challenge deposit selection, execute/withdraw section, withdrawal timing, public/private Goldsky distinction, governor-only admin framing). All were encoded directly as must_haves.truths and acceptance criteria greps. The executor treated them as first-class requirements without needing to re-read the review.

**Impact:** Cross-AI review findings that are translated into machine-checkable acceptance criteria (greps, line patterns) are more effective than prose recommendations. The translation step (review finding → grep pattern) is where the value is created.
**Source:** 03-01-PLAN.md, 03-02-PLAN.md, 03-03-PLAN.md (must_haves.truths referencing "per Codex HIGH/MEDIUM review")
