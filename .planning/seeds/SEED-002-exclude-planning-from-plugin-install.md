---
id: SEED-002
status: dormant
planted: 2026-05-28
planted_during: v1.0 milestone complete — awaiting next milestone
trigger_when: when packaging/distribution or repo hygiene is on the agenda, or before the next marketplace publish
scope: medium
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

**Medium** — not a config one-liner. The fix is either a repo restructure (move plugin
files into a subdir + `git-subdir` source) or a second minimal marketplace repo. Either
touches the multi-surface publish flow and the fact that this repo doubles as the Netlify
landing page + agent-discovery host. Decision-heavy more than code-heavy.

## Research Findings (2026-05-28, sourced from code.claude.com plugin docs)

**Empirically confirmed install behavior:**
- Marketplace install = a literal `git clone` of the WHOLE GitHub repo (origin
  `git@github.com:kleros/kleros-skills.git`) into `~/.claude/plugins/marketplaces/kleros-skills/`.
- `.planning/` lands in TWO places on the user's disk:
  1. The marketplace clone: `~/.claude/plugins/marketplaces/kleros-skills/.planning`
  2. The version-pinned plugin cache:
     `~/.claude/plugins/cache/kleros-skills/kleros-skills/2.0.0/.planning`
     (plus a stale `cache/kleros-skills/kleros/1.0.0/.planning` from the old `kleros` plugin name)
- The `skills[]` paths in `plugin.json` only tell Claude where to READ components from —
  they do NOT scope what gets copied to disk.

**No native exclude mechanism exists:**
- Neither `plugin.json` nor `marketplace.json` has a `files` / `include` / `exclude` /
  `ignore` allowlist field.
- No ignore file is honored — no `.claudeignore`, no `.pluginignore`, no
  `.gitattributes export-ignore`.

**What CAN scope things:**
- `git-subdir` plugin source (`{"source":"git-subdir","url":"...","path":"plugin"}`) does a
  SPARSE clone → scopes the *plugin install cache* to just that subdir. Fixes copy #2 only.
- `--sparse` flag on `claude plugin marketplace add <repo> --sparse <dirs...>` scopes the
  *marketplace clone*. BUT it's CLI-only, user-supplied, and can't be baked into settings —
  so it can't be relied on for end users.
- **Marketplace-add ALWAYS full-clones the repo regardless of plugin source.** So no
  single-repo layout fully eliminates `.planning` exposure.

## Recommended Solution — Branch-based (PREFERRED, confirmed viable 2026-05-28)

Pin the marketplace + plugin to a clean branch. **No repo restructuring** — skills stay at
repo root, repo stays Claude-agnostic. This is jaybuidl's preferred direction.

- **`ref` is supported at BOTH levels** (per code.claude.com docs):
  - Plugin source in `marketplace.json`: `github` type accepts `ref` (branch/tag) and `sha`
    (commit). e.g. `{"source":"github","repo":"kleros/kleros-skills","ref":"production"}`.
  - Marketplace add itself: `claude plugin marketplace add kleros/kleros-skills@production`,
    or a `ref` field under `extraKnownMarketplaces` in `settings.json`.
- **Branch layout:** dev branch (everything — `.planning/`, landing page, tests) + a clean
  `production` branch containing only `.claude-plugin/{marketplace.json,plugin.json}` + skill
  dirs (+ LICENSE/README/CHANGELOG). Marketplace-add and plugin-install both check out
  `production`'s tree → no `.planning` on disk. (`.git` history caveat is negligible — the
  user sees a clean working tree, not loose dev files.)
- **`production` is DERIVED, not hand-maintained:** a CI job on push to the dev branch
  regenerates `production` (mirror minus dev-only paths). Avoids drift/fragility.
- **Netlify stays on the dev branch** (landing page + agent-discovery host unaffected).

**OPEN DECISION — which branch is the GitHub default?** `ref` only helps when the consumer
supplies it; a bare `kleros/kleros-skills` install resolves to the repo's DEFAULT branch.
  - (a) Keep `master` (dev) as default → public install instructions MUST say
    `@production`; bare installs still leak dev files (functional, just messy).
  - (b) Make `production` the default branch, dev on `develop`, point Netlify at `develop`
    → bare installs are clean by default, but this inverts GitHub conventions (PR base,
    clones, default checkout all land on the derived branch).

## Alternative Solutions (rejected/fallback)

- **Separate minimal marketplace repo** + `git-subdir` plugin source — also guarantees zero
  exposure at both steps with no user flag, but adds a second repo to maintain. Fallback if
  the branch model proves awkward.
- **Single repo + move plugin files into a `plugin/` subdir + `git-subdir`** — rejected:
  forces a Claude-specific subfolder restructure jaybuidl dislikes, and fixes only the
  install cache, not the marketplace clone (unless users pass `--sparse` manually).

**Side cleanup spotted:** the cache still holds a stale `kleros@1.0.0` plugin from before
the `kleros` → `kleros-skills` rename — worth verifying the old name is fully retired.

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
