---
phase: 05-publishing
plan: 01
subsystem: publishing
tags: [kleros-curate, npm-test, sha256, readme, index-html, agent-skills]

# Dependency graph
requires:
  - phase: 04-description
    provides: kleros-curate skill description finalized
provides:
  - All 9 multi-surface files verified consistent with kleros-curate references
  - npm test passes (15/15) with pre-existing failures fixed
  - SHA-256 digests verified current
  - README.md project structure tree includes kleros-curate/
  - index.html tagline has clarifier class
affects: [05-publishing plan 02 — tagging and GitHub release]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hybrid light/dark palette: --bg is light cream body, --dark is dark hero panel"
    - "Multi-class tagline: class=\"hero-tagline clarifier\" — keeps semantic class + test hook"

key-files:
  created: []
  modified:
    - README.md
    - index.html
    - test/index.test.js

key-decisions:
  - "Fix test rather than revert design: hybrid palette --dark check replaces --bg dark check"
  - "Multi-class approach for clarifier: hero-tagline clarifier preserves layout class while satisfying test"

patterns-established:
  - "Test hooks via secondary class: add clarifier/semantic class alongside layout class for test targeting"

requirements-completed: [PUB-01, PUB-02, PUB-03]

# Metrics
duration: 15min
completed: 2026-05-27
---

# Phase 05 Plan 01: Publishing Audit Summary

**All 9 multi-surface files verified consistent; README structure tree fixed; 2 pre-existing test failures resolved; npm test 15/15 pass; SHA-256 digests current**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-27T00:00:00Z
- **Completed:** 2026-05-27T00:00:00Z
- **Tasks:** 2
- **Files modified:** 3 (README.md, index.html, test/index.test.js)

## Accomplishments

- Audited all 9 multi-surface files — 8 already correct, 1 gap fixed (README.md project structure tree)
- Fixed 2 pre-existing test failures (dark bg check, clarifier class regex) — npm test now 15/15
- SHA-256 digests verified current via `npm run update-digests` — all 4 digests OK
- Clean commit as tagging target per D-03

## Task Commits

1. **Task 1+2: Audit all surfaces, fix README, fix tests, verify suite** - `401e433` (chore)

## Files Created/Modified

- `README.md` — added `kleros-curate/` line to project structure tree
- `index.html` — added `clarifier` class to hero tagline paragraph
- `test/index.test.js` — updated dark bg test (--bg → --dark) and clarifier regex (exact → contains)

## Decisions Made

- Fix tests to match actual design: hybrid light/dark palette uses `--dark` for dark hero panel, not `--bg` (which is light cream). Test updated to check `--dark` variable.
- Multi-class approach: `class="hero-tagline clarifier"` preserves layout semantics and satisfies test hook without removing the layout class.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing test failure: dark bg color check**
- **Found during:** Task 2 (verification suite)
- **Issue:** Test "should use a dark purple background color" checked `--bg < 80` RGB, but design was restyled to hybrid palette with `--bg: #f6f1ea` (light cream). Test was stale post-restyle.
- **Fix:** Updated test to check `--dark` CSS variable (the actual dark hero panel color `#1a1426`)
- **Files modified:** `test/index.test.js`
- **Verification:** npm test passes
- **Committed in:** 401e433

**2. [Rule 1 - Bug] Fixed pre-existing test failure: clarifier class regex**
- **Found during:** Task 2 (verification suite)
- **Issue:** Test checked `/class="clarifier"/` (exact), but HTML uses `class="hero-tagline clarifier"` (multi-class). Regex required clarifier to be the only class.
- **Fix:** Added `clarifier` to the tagline element classes; updated regex to `/class="[^"]*clarifier[^"]*"/` to match multi-class attributes
- **Files modified:** `index.html`, `test/index.test.js`
- **Verification:** npm test passes, `class="hero-tagline clarifier"` present in HTML
- **Committed in:** 401e433

---

**Total deviations:** 2 auto-fixed (Rule 1 - pre-existing test/code mismatches from prior restyle)
**Impact on plan:** Both fixes necessary for correct test verification. No scope creep. All fixes are within the publishing audit scope.

## Issues Encountered

- Commit `769fb75` (fix: align tagline test with clarifier class) had removed the dead `.tagline` CSS but did NOT add `clarifier` class to the HTML element or fix the regex in the test — so the test still failed. Both gaps fixed in this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Working tree clean (only untracked feedback docs, not publishing surfaces)
- All 9 surfaces verified consistent
- npm test 15/15 pass
- SHA-256 digests current
- Commit 401e433 is the tagging target for `kleros-curate@v1.0.0`
- Ready for Plan 02: tag release + GitHub release

## Self-Check: PASSED

- README.md exists and contains 2 kleros-curate references
- index.html contains clarifier class
- test/index.test.js updated with correct checks
- npm test: 15 pass, 0 fail
- git log shows commit 401e433
- git status: clean (only untracked feedback docs)

---
*Phase: 05-publishing*
*Completed: 2026-05-27*
