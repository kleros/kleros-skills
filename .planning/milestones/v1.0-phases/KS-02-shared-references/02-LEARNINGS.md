---
phase: "02"
phase_name: "shared-references"
project: "Kleros Skills"
generated: "2026-05-27"
counts:
  decisions: 6
  lessons: 4
  patterns: 5
  surprises: 3
missing_artifacts:
  - "02-UAT.md"
---

# Phase 02 Learnings: Shared References

## Decisions

### Solidity-style ABI only — no JSON arrays
Chose Solidity-style human-readable ABI strings over JSON ABI arrays for all shared references. ethers.js and viem both parse these natively, and they're ~3x smaller in token footprint.

**Rationale:** D-04/D-06 — token efficiency matters for AI agents with context limits; Solidity-style is also grepable by humans. JSON ABI was explicitly excluded to prevent format drift across files.
**Source:** 02-01-PLAN.md, 02-01-SUMMARY.md

### Single canonical location for topic0 hashes
MetaEvidence topic0 hash `0x61606860...` lives exclusively in `shared-abi-fragments.md`. All other files use pointer text: "(topic0 and full event signature: shared-abi-fragments.md)".

**Rationale:** D-05 — multiple copies of the same hash across files creates drift risk. A single source means grep finds it in one place and corrections propagate automatically.
**Source:** 02-01-PLAN.md, 02-02-PLAN.md

### No shared addItem transaction playbook
PGTCR `addItem(string, uint256)` differs from LGTCR `addItem(string)` — the _deposit parameter changes the call signature. Instead of a shared but leaky abstraction, each flavor file owns its own transaction call in Phase 3.

**Rationale:** A shared playbook that papered over the signature difference would cause wrong-deposit reverts on PGTCR or missing-argument reverts on LGTCR.
**Source:** 02-03-PLAN.md, 02-03-SUMMARY.md

### fundAppeal step-by-step algorithm deferred to Phase 3
The getItemInfo → getRequestInfo → getRoundInfo chain is flavor-specific in its data sources (LGTCR uses direct contract reads; PGTCR uses subgraph). Extracting a "shared" version would require so many conditionals it would confuse rather than help.

**Rationale:** Shared references should cover what's genuinely identical across flavors; the appeal funding *formula* is shared (and was extracted), but the *data-fetching algorithm* differs.
**Source:** 02-03-PLAN.md

### Upload procedure is flavor-agnostic — no subsections needed
IPFS upload is identical across LGTCR, PGTCR, and Scout. The file has zero `### LGTCR specifics` or `### PGTCR specifics` subsections — the only shared reference without them.

**Rationale:** Adding unnecessary flavor subsections would imply differences that don't exist, misleading agents into looking for flavor-specific upload quirks.
**Source:** 02-05-PLAN.md, 02-05-SUMMARY.md

### Common workflows section placement
D-09 placed the Common workflows section between Action index and Reference files in SKILL.md. This gives agents the loading sequence early (after routing) without disrupting the reference lookup table below.

**Rationale:** Agents performing multi-step operations (submit, challenge, deploy) need the file-loading order upfront; placing it after routing but before references creates a natural read-through flow.
**Source:** 02-06-PLAN.md, 02-06-SUMMARY.md

---

## Lessons

### PGTCR arbitratorExtraData() does not exist on PGTCR contracts
The shared arbitration cost read procedure assumed `arbitratorExtraData()` is universal. Code review (CR-01) flagged that PGTCR stores arbitration parameters in an `arbitrationParamsChanges(index)` array instead. The shared procedure works for LGTCR but will need a PGTCR carve-out in Phase 3.

**Context:** This was not caught during planning or extraction because the draft PGTCR skill didn't explicitly call out the absence. The code review caught it by cross-referencing ABI signatures.
**Source:** 02-REVIEW.md (CR-01)

### Worktree merges can silently land on wrong branch
During Wave 3 parallel execution, the 02-03 merge landed on the 02-04 worktree branch instead of master. Both files appeared as stubs on master until the orphaned branch was discovered and re-merged. Root cause: CWD drift during worktree cleanup — the shell's working directory was inside a removed worktree.

**Context:** The merge command reported success, the SUMMARY existed, and spot-checks passed — but the commits were on the wrong branch. Only the code review's "stubs" finding revealed the problem.
**Source:** Execution log (Wave 3 merge sequence)

### Line count targets are soft guides, not hard gates
Plans specified line ranges (e.g., "80–100 lines" for deposits), but actual content consistently exceeded upper bounds (112, 139, 79 lines). The extra lines came from must_have content requirements, not padding. Verification correctly treated these as passes.

**Context:** The line targets were useful for planning (estimating complexity and scope) but shouldn't be verification blockers when content completeness conflicts with brevity.
**Source:** 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md

### Code review on stale file state produces false positives
The first code review run read pre-merge versions of shared-deposits.md and shared-item-json.md (still stubs), producing two false critical findings. A second run after the corrected merge found genuine issues.

**Context:** Always verify worktree merges landed on the correct branch before running cross-file analysis. A simple `wc -l` on key artifacts would have caught the stale state.
**Source:** 02-REVIEW.md (first vs second run)

---

## Patterns

### Topic0 pointer pattern
Never inline cryptographic hashes in reference files. Store the hash in one canonical file, and everywhere else write a named pointer: "(topic0 and full event signature: shared-abi-fragments.md)". Prevents drift, makes grep deterministic.

**When to use:** Any time a constant (hash, address, endpoint URL) would otherwise be copied across multiple reference files.
**Source:** 02-01-PLAN.md, 02-02-PLAN.md

### Flavor subsection scoping
Use `### LGTCR specifics` and `### PGTCR specifics` subsections within shared files to isolate flavor-specific behavior. Shared content lives above the subsections with no heading prefix. This pattern prevents agents from applying LGTCR rules to PGTCR or vice versa.

**When to use:** Any shared reference where at least one rule differs between flavors. Skip subsections when behavior is truly identical (e.g., IPFS upload).
**Source:** 02-02-SUMMARY.md, 02-03-SUMMARY.md

### Scope guard enforcement
Plans explicitly list "OUT OF SCOPE for this file" items and "SCOPE GUARD — these MUST NOT appear" lists. Executors grep for forbidden content during self-check. This prevents content creep across the reference file boundary.

**When to use:** Any multi-file extraction where content could migrate to the wrong file. Especially important when multiple agents work in parallel on related files.
**Source:** 02-02-PLAN.md, 02-04-PLAN.md, 02-05-PLAN.md

### WHY rationale on every hard rule
Every non-obvious constraint includes an inline WHY explaining the failure mode it prevents. "Never quote typical deposits" → WHY: governance parameters change. "Use /ipfs/ paths not gateway URLs" → WHY: gateway URLs are mutable.

**When to use:** Skills and reference docs consumed by AI agents. Without WHY, agents may "helpfully" override rules they don't understand the purpose of.
**Source:** 02-01-PLAN.md (WRIT-02/D-11), all SUMMARYs

### Progressive disclosure via Common workflows
SKILL.md serves as a routing layer, not a content store. The Common workflows section tells agents *which files to load and in what order* without duplicating any content from those files. This keeps SKILL.md under 200 lines while covering complex multi-step operations.

**When to use:** Any skill with multiple reference files that agents need to load in a specific sequence for common tasks.
**Source:** 02-06-PLAN.md, 02-06-SUMMARY.md

---

## Surprises

### All 6 plans executed with zero deviations
Every SUMMARY reports "None — plan executed exactly as written." This is unusual for a 6-plan phase. The thorough discuss-phase and research phase (Phase 2 had 6 plans with detailed content mappings, line ranges, and scope guards) paid off — executors had clear enough instructions to avoid improvisation.

**Impact:** Validates the investment in detailed planning for content-extraction phases. The plans were verbose (~150 lines each) but eliminated ambiguity that would have caused rework.
**Source:** All 6 SUMMARYs

### Parallel worktree execution caused merge ordering issues
Wave 3 ran two agents in parallel (02-03 and 02-04). Despite different worktree branches and non-overlapping files, the merge sequence failed silently — 02-03's merge landed on 02-04's branch due to CWD drift during cleanup. The second merge then reported "Already up to date" because it was comparing against a branch that already included the first merge.

**Impact:** Required manual branch discovery and re-merge. Added ~10 minutes of debugging. For future parallel waves, verify merge target branch before each merge, not just after.
**Source:** Execution log (Wave 3)

### Code review found a genuine cross-file consistency bug
The PGTCR `arbitratorExtraData()` gap (CR-01) was not caught by any plan, summary, or verification check. The shared deposit procedure was extracted faithfully from LGTCR source material, but the PGTCR contract has a different interface. Only the cross-file review comparing ABI signatures against procedural instructions caught the mismatch.

**Impact:** Validates running code review even on documentation-only phases. The finding will prevent a real revert when PGTCR agents follow the shared procedure in Phase 3.
**Source:** 02-REVIEW.md (CR-01)
