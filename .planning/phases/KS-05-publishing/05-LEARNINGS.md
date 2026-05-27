---
phase: "05"
phase_name: "publishing"
project: "Kleros Skills"
generated: "2026-05-27"
counts:
  decisions: 3
  lessons: 3
  patterns: 3
  surprises: 2
missing_artifacts:
  - "05-VERIFICATION.md"
  - "05-UAT.md"
---

# Phase 05 Learnings: Publishing

## Decisions

### Fix-then-tag over dedicated release commit
The release tag goes on whatever HEAD ends up after all surface fixes, not on a dedicated empty "release" commit. This keeps the git history linear and avoids a meaningless commit whose only purpose is to carry a tag.

**Rationale:** Simpler history, no empty commits. The tag points at the last meaningful change (the audit + fix commit), which is more useful for `git log` archaeology than a ceremony commit.
**Source:** 05-CONTEXT.md (D-03), 05-02-SUMMARY.md

---

### Annotated tags for skill releases, user-run for GPG
Skill releases use annotated tags (`git tag -a`) rather than lightweight tags. Because GPG signing requires interactive passphrase input, the plan outputs CLI commands for the user to run manually rather than attempting to automate.

**Rationale:** Annotated tags carry metadata (tagger, date, message) useful for release archaeology. GPG passphrase hangs in non-interactive contexts — manual execution is the only reliable path.
**Source:** 05-CONTEXT.md (D-04), 05-02-PLAN.md (Task 2 checkpoint:human-action)

---

### Skill tag versioning is independent from plugin version
`kleros-curate@v1.0.0` (first release of the skill) coexists with plugin version `2.0.0` (which tracks when the plugin structure changed). These are independent counters that diverge once multiple skills exist.

**Rationale:** Plugin version tracks catalog-level changes (skills added/removed/restructured). Skill tags track individual skill content changes. Coupling them would force version bumps across unrelated skills.
**Source:** 05-02-SUMMARY.md, CLAUDE.md ("Catalog version vs plugin version")

---

## Lessons

### Incremental multi-surface updates leave gaps — trust-but-verify
Updating 9+ surfaces incrementally across 4 prior phases left one gap (README.md project structure tree missing `kleros-curate/`). The full audit in Phase 5 caught it. Incremental updates are efficient but a final audit pass is essential before release.

**Context:** 8 of 9 surfaces were already correct from prior phases. Only README.md's project structure tree (a fenced code block with directory listing) was missed. The gap was invisible without deliberate auditing because the README "Skills included" list was correct — only the separate structure tree was stale.
**Source:** 05-01-SUMMARY.md

---

### Pre-existing test failures can lurk undetected across phases
Two test failures pre-dated Phase 5: a stale dark background color check (from a restyle) and a clarifier class regex (from an incomplete prior fix in commit `769fb75`). Neither was caught during Phases 2-4 because those phases didn't run the full test suite as part of their execution.

**Context:** The prior fix (`769fb75`: "fix: align tagline test with clarifier class, remove dead CSS") removed dead CSS but did NOT add the `clarifier` class to the HTML element or fix the regex in the test. The test continued to fail silently until the Phase 5 audit ran `npm test`.
**Source:** 05-01-SUMMARY.md (Deviations section)

---

### checkpoint:human-action is the correct pattern for GPG operations
The `checkpoint:human-action` task type worked well for GPG-signed tag creation — the executor paused, presented exact commands, and resumed after the user confirmed. This is the right pattern for any operation requiring interactive authentication that can't be automated.

**Context:** Alternative approaches (lightweight tags, skipping GPG) would have worked technically but would break the project's signing policy. The checkpoint pattern lets the plan proceed normally while acknowledging the human-in-the-loop requirement.
**Source:** 05-02-PLAN.md (Task 2), 05-02-SUMMARY.md

---

## Patterns

### Multi-surface audit pattern: 9-file checklist with expected grep patterns
For publishing phases in this repo, audit all 9 surfaces with specific grep patterns per file. Each surface has one expected pattern to verify (e.g., `"./kleros-curate"` in plugin.json, `kleros-curate/SKILL.md` in sitemap.xml). Run the audit before any release tag.

**When to use:** Any time a new skill is published or an existing skill is renamed/restructured. The 9-surface list is in CLAUDE.md's "Multi-surface update rule" table.
**Source:** 05-01-PLAN.md (Task 1), 05-01-SUMMARY.md

---

### Skill release 3-step sequence: CHANGELOG link, annotated tag, GitHub release
Publishing a skill follows: (1) add `[skillname@vX.Y.Z]` comparison link to CHANGELOG.md, (2) create annotated GPG-signed tag, (3) create GitHub release from tag with release notes derived from CHANGELOG. This sequence is reusable for every future skill release.

**When to use:** Every skill release in this repo. The CHANGELOG link goes in the comparison links section at the bottom of the file. The GitHub release body is derived from the relevant CHANGELOG version entry.
**Source:** 05-02-PLAN.md, 05-02-SUMMARY.md

---

### Test hooks via secondary CSS class
When a test needs to target a specific element but the element already has layout/semantic classes, add a secondary class (e.g., `class="hero-tagline clarifier"`) and use a contains-style regex (`/class="[^"]*clarifier[^"]*"/`) rather than exact match. This decouples test targeting from layout class changes.

**When to use:** When writing tests that assert on HTML element classes, especially when the element's class list may change for layout/styling reasons.
**Source:** 05-01-SUMMARY.md (Deviation 2)

---

## Surprises

### 8 of 9 publishing surfaces were already correct before the audit
Despite updating surfaces incrementally across 4 phases without a coordination mechanism, only 1 of 9 files had a gap. The multi-surface update rule in CLAUDE.md was followed more consistently than expected — the audit was mostly a confirmation pass rather than a correction pass.

**Impact:** The Phase 5 audit took ~15 minutes total instead of the potentially longer fix-heavy session anticipated. This suggests the CLAUDE.md update rule is effective as a convention even without enforcement tooling.
**Source:** 05-01-SUMMARY.md

---

### Prior commit claimed to fix a test but left it broken
Commit `769fb75` ("fix: align tagline test with clarifier class, remove dead CSS") removed dead CSS but did not actually fix the test — the clarifier class was never added to the HTML element and the test regex was never updated. The commit message implied a complete fix, but `npm test` would have shown the test still failing.

**Impact:** Misleading commit message created a false sense of resolution. The actual fix required both adding the class to HTML and updating the test regex — two changes the prior commit missed. This is a reminder to always run `npm test` after a "fix" commit, not just after the change being fixed.
**Source:** 05-01-SUMMARY.md (Issues Encountered)
