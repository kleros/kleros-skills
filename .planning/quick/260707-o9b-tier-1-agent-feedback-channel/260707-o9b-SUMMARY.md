---
phase: 260707-o9b-tier-1-agent-feedback-channel
plan: 01
subsystem: docs
tags: [github-issue-form, skill-discovery, feedback-channel, sync-workflow]
status: complete

requires: []
provides:
  - "kleros-feedback skill (feedback/SKILL.md) teaching agents how to file feedback via MCP / gh CLI / URL fallback"
  - "GitHub issue form (.github/ISSUE_TEMPLATE/agent-feedback.yml) auto-applying the agent-feedback label"
  - "Feedback footers on all 4 published/routing SKILL.md files"
  - "Discovery parity: kleros-feedback entry in .well-known/agent-skills/index.json and sitemap.xml"
  - "sync-master.yml EXPECTED_ROOT + keep-list-assertion updated so feedback/ survives the strip step"
affects: [next-release, RELEASING.md]

tech-stack:
  added: []
  patterns: ["GitHub issue form with template-applied labels (not URL query param) for permission-independent labeling"]

key-files:
  created:
    - feedback/SKILL.md
    - .github/ISSUE_TEMPLATE/agent-feedback.yml
  modified:
    - SKILL.md
    - kleros-ipfs-upload/SKILL.md
    - kleros-curate/SKILL.md
    - openclaw-skill/SKILL.md
    - .well-known/agent-skills/index.json
    - sitemap.xml
    - README.md
    - index.html
    - CHANGELOG.md
    - .github/workflows/sync-master.yml

key-decisions:
  - "Squashed the three per-task commits into a single commit before finalizing, per the plan's explicit verification requirement ('One commit exists') and Task 3's instruction to stage all three tasks' files_modified together — this overrides the default per-task commit protocol for this plan only."
  - "Used gh issue create --label agent-feedback (not --template) in feedback/SKILL.md's example, since --template can prompt interactively depending on gh version — matches the plan's interface guidance."
  - "Used the GitHub issue template's labels: [\"agent-feedback\"] field rather than a labels= URL query param, since the query param is silently dropped for reporters without triage/write access (plan-specified rationale)."

requirements-completed: ["260707-o9b"]

duration: ~20min
completed: 2026-07-07
---

# Quick Task 260707-o9b: Tier 1 Agent Feedback Channel Summary

**Stood up a zero-infrastructure agent-to-maintainer feedback channel: a GitHub issue form with an auto-applied `agent-feedback` label, a new `kleros-feedback` skill teaching agents to file reports via MCP/gh/URL in priority order, footers on all 4 published skills pointing to it, and full multi-surface bookkeeping (discovery index, sitemap, README, landing page, changelog, sync-workflow allowlist).**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-07T16:20:00Z (approx)
- **Completed:** 2026-07-07T16:41:32Z
- **Tasks:** 3/3 completed
- **Files modified:** 12 (2 created, 10 modified)

## Accomplishments

- `feedback/SKILL.md` (new `kleros-feedback` skill) gives any agent a clear, priority-ordered path to report problems: Kleros MCP tool → authenticated `gh` CLI (non-interactive `--body`/`--label` form) → prefilled GitHub issue URL for a human to complete.
- `.github/ISSUE_TEMPLATE/agent-feedback.yml` is a structured issue form with 6 body fields (skill name, version/digest, agent runtime, goal, what happened, quoted section, severity) and a template-applied `agent-feedback` label that works regardless of reporter permissions.
- All 4 published/routing skills (root `SKILL.md`, `kleros-ipfs-upload`, `kleros-curate`, `openclaw-skill`) now carry a consistently-worded feedback footer with a correctly-resolving link (relative for the first three, absolute `https://skills.kleros.io/...` for `openclaw-skill` since it's fetched remotely via clawhub).
- Discovery surfaces (`.well-known/agent-skills/index.json`, `sitemap.xml`) list the new skill; digests refreshed for all 5 skills (4 existing + 1 new) since the footer edits changed the 4 existing skills' content too.
- `README.md`, `index.html`, `CHANGELOG.md` updated per the multi-surface rule; `.github/workflows/sync-master.yml` `EXPECTED_ROOT` and keep-list-assertion both include `feedback` so the next tag-push sync doesn't fail-loud on an unexpected root entry.
- `agent-feedback` GitHub label created live on `kleros/kleros-skills` (see below — no manual follow-up needed).

## Task Commits

All three tasks were squashed into a single commit per the plan's explicit "one commit" verification requirement (see Deviations below):

1. **Task 1: Create the feedback skill and GitHub issue template** — content included in `f338416`
2. **Task 2: Wire footers into published skills and discovery surfaces** — content included in `f338416`
3. **Task 3: Doc/landing-page surfaces, workflow allowlist, validation, commit** — content included in `f338416`

**Single plan commit:** `f338416` — "feat: add Tier 1 agent-to-maintainer feedback channel (260707-o9b)"

_Two intermediate per-task commits (`74058d9`, `45f79f6`) were created first following the default executor protocol, then squashed via `git reset --soft` back to the plan-doc commit (`1c52113`) and re-committed as one, since neither was pushed anywhere. See Deviations._

## Files Created/Modified

- `feedback/SKILL.md` — new kleros-feedback skill: before-you-file guidance, delimited channel section (MCP/gh/URL), future-AgentKit note, scope, autonomy note
- `.github/ISSUE_TEMPLATE/agent-feedback.yml` — GitHub issue form, `labels: ["agent-feedback"]`, 6 body fields matching the skill's gh-CLI example headers
- `SKILL.md` — new `## Feedback` section before `<!-- END KLEROS SKILLS -->`
- `kleros-ipfs-upload/SKILL.md`, `kleros-curate/SKILL.md` — new `## Feedback` section appended, relative `../feedback/SKILL.md` link
- `openclaw-skill/SKILL.md` — new `## Feedback` section after `## Contributing`, absolute URL (remote-fetched via clawhub)
- `.well-known/agent-skills/index.json` — new `kleros-feedback` entry; all 5 digests refreshed by `update-digests.js`
- `sitemap.xml` — added `feedback/SKILL.md` URL
- `README.md` — new `## Feedback` section, `feedback/` added to project structure block and branch-model keep-list sentence
- `index.html` — one link added to `.footer-links`
- `CHANGELOG.md` — new `## [Unreleased]` section above `## [2.2.0]`
- `.github/workflows/sync-master.yml` — `feedback` added to `EXPECTED_ROOT` and the keep-list-assertion loop

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written for all task content.

### Process deviation (not a Rule 1-4 case, plan-explicit)

**Commit structure:** The plan's frontmatter (`type: execute`) and general executor protocol call for one commit per task, but this plan's own `<verification>` and Task 3 action explicitly require a **single** commit containing all three tasks' `files_modified` ("Stage exactly the files this plan modified (all three tasks' files_modified) and commit... One commit exists" per `<verification>`). I initially committed Task 1 and Task 2 separately (following default protocol), then recognized the conflict, squashed both into the plan-doc commit via `git reset --soft` (safe — commits existed only on this local, unpushed worktree branch), and produced one final commit (`f338416`) containing all 12 plan files. No file content was lost or altered by the squash; verified via `git status --short` (clean) and `git diff --diff-filter=D` (no deletions) after the squash.

## Auth/Access Gates

None. `gh` was already authenticated as `jaybuidl` in this environment; `gh label create agent-feedback --repo kleros/kleros-skills --color BFD4F2 --description "Filed by AI agents via the feedback skill"` ran successfully and was verified with `gh label list` — **no manual follow-up needed.**

## Known Stubs

None. All created/modified content is final instructional/discovery text, not placeholder data.

## Verification Results

- `npm run update-digests` — ran twice; second run reports all 5 skills `OK` (no diff).
- `npm test` — 16/16 tests pass (index.html, README.md, workflow YAML suites).
- All four published/routing SKILL.md files contain a feedback footer with a correctly-resolving link.
- `.well-known/agent-skills/index.json` is valid JSON with the new `kleros-feedback` entry; `sitemap.xml` lists the feedback URL.
- `.github/workflows/sync-master.yml` `EXPECTED_ROOT` and keep-list-assertion both include `feedback`.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are untouched (confirmed via `git diff HEAD~1 HEAD --stat -- .claude-plugin/` — no output).
- One commit exists (`f338416`), created with `git -c commit.gpgsign=false commit` and the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer.

## Self-Check: PASSED

All 12 files confirmed present on disk. Commit `f338416` confirmed in `git log --oneline --all`.
