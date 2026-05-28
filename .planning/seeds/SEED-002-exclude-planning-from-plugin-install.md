---
id: SEED-002
status: dormant
planted: 2026-05-28
planted_during: v1.0 milestone complete — awaiting next milestone
trigger_when: when packaging/distribution or repo hygiene is on the agenda, or before the next marketplace publish
scope: unknown
---

# SEED-002: Exclude `.planning/` (and other dev-only files) from plugin/marketplace installs

## Why This Matters

The `.planning/` folder is committed deliberately — it tracks GSD development state
(STATE.md, ROADMAP.md, phases, seeds, research) and lets teammates collaborate on the
build process. That's correct *for the development repo*.

The problem: when an end user installs this repo as a Claude Code plugin/marketplace,
the **entire** `.planning/` tree is copied onto their machine, e.g.
`~/.claude/plugins/marketplaces/kleros-skills/.planning`. This is messy — it pollutes the
user's machine with dozens of internal dev files (plans, research, archived milestones)
that have zero value to a consumer of the skills and may confuse or alarm them.

Ideal outcome: a declarative ignore/exclude mechanism that says "ship these files to the
user, but NOT these" — analogous to npm's `.npmignore` / `files` field, or `.gitattributes
export-ignore`. The same concern applies to other dev-only surfaces: feedback/handover
markdown files at repo root, `evals/`, `*-workspace/` dirs, `CHANGELOG`-adjacent scratch.

## When to Surface

**Trigger:** when packaging/distribution or repo hygiene is on the agenda, or before the
next marketplace publish.

This seed will surface during `/gsd:new-milestone` when the milestone scope matches.

## Scope Estimate

**Unknown** — pending research. Likely small-to-medium. Key unknown: does the Claude Code
plugin/marketplace install path honor any exclude manifest at all?

## Open Questions / Research

- Does Claude Code's plugin/marketplace install copy the whole repo, or only declared
  directories? Check whether `plugin.json` / `marketplace.json` schema has a `files`,
  `include`, or `exclude` field that scopes what ships.
- Is there an analog to `.npmignore`, `.gitattributes export-ignore`, or a manifest
  allowlist that the installer respects?
- If no native mechanism exists: options to evaluate —
  1. Keep `.planning/` in a separate branch or repo (dev vs. published split).
  2. Move planning state out of the published tree entirely.
  3. File a feature request upstream for an install-exclude manifest.
  4. A pre-publish step that strips dev-only files from the published artifact.
- Confirm the exact install behavior empirically by inspecting a real
  `~/.claude/plugins/marketplaces/kleros-skills/` after install.

## Breadcrumbs

- `.gitignore` — already excludes most of `.claude/*` (keeps only settings.json, hooks/,
  package.json); same intent, different layer (git vs. plugin install).
- `.claude-plugin/plugin.json` — plugin manifest; check schema for a files/exclude field.
- `.claude-plugin/marketplace.json` — catalog manifest; check schema likewise.
- `.planning/` — the offending tree (committed intentionally for team collaboration).
- Root dev-only files that share the same install-pollution concern:
  `FEEDBACK_FROM_CLAUDE_MARKETPLACE.md`, `HANDOVER_FROM_IPFS_GATEWAY_REPO.md`,
  `CURATE_TOKEN_QUERY_FEEDBACK_*.md`.

## Notes

Captured via one-shot seed capture. Verbatim idea: the `.planning` folder is committed on
purpose for team collaboration, but it (and other dev-only files) should not be copied to
end-user machines on plugin/marketplace install. Wishlist: a declarative exclude mechanism
— need to check whether one already exists before designing a workaround.
