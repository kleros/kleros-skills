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

## LOCKED Solution — Branch-based, minimal-strip (decided 2026-05-28)

**No repo restructuring** — skills stay at repo root, repo stays Claude-agnostic. `master`
remains the GitHub default branch AND is the clean consumer-facing artifact ("master =
production, by convention"). Development moves to a `dev` branch.

### Branch model

| Branch | Contains | Role |
|--------|----------|------|
| `dev` (or `develop`) | EVERYTHING — `.planning/`, website, tests, tooling, skills | Team works here; all human PRs target it |
| `master` (default) | `dev` MINUS dev-only cruft (minimal-strip); KEEPS website + skills | Consumer-facing: marketplace-add + plugin-install + Netlify all use it |

- **Default branch stays `master`** → a bare `claude plugin marketplace add kleros/kleros-skills`
  resolves to it and is automatically clean. No `@ref` required from users (which we can't
  enforce anyway). `ref`/`sha` pinning support exists at both levels if ever needed, but the
  default-branch-is-clean approach means we don't depend on it.
- **`master` is DERIVED, not hand-maintained** — a GitHub Action regenerates it from `dev`
  (see sync sketch). Don't treat `master` as a normal git ancestor of `dev`.

### Why minimal-strip (not pure-plugin / two derived branches)

Rejected the "pure-plugin `master` + separate `landing` branch" idea. The website must track
the *released* plugin version; keeping website + plugin on the SAME branch makes that lockstep
**structural** (same commit) instead of something a second derived branch has to maintain.
The only thing pure-plugin would buy is removing ~60–100KB of `index.html`/favicons/`netlify.toml`
from the plugin cache — invisible, harmless files, not the confusing dev-doc tree `.planning`
is. jaybuidl agreed: tolerate the 2 webpage files to avoid maintaining 2 derived branches in
lockstep. Reserve pure-plugin as a trivial future tightening (extend strip-list + move Netlify)
only if that cosmetic bloat ever matters.

### Strip-list (minimal-strip — remove from `master`)

Definitely dev-only → strip: `.planning/`, `test/`, dev `scripts/`, root
`*_FEEDBACK*.md` / `HANDOVER*.md`, build tooling (`package.json`, `yarn.lock`, `.yarnrc.yml`).
**Keep on `master`:** `.claude-plugin/`, skill dirs, root `SKILL.md`, `index.html`, `netlify/`,
`.well-known/`, `sitemap.xml`, `robots.txt`, favicons, `LICENSE`, `README.md`, `CHANGELOG.md`.
(Confirm the exact list at planning time — e.g. whether anything on `master` needs `package.json`;
the Netlify edge function under `netlify/` must stay.)

### Sync Action sketch (details deferred to research/planning)

On merge to `dev`: Action checks out `dev`, removes the strip-list paths, and updates `master`
with the result. Open mechanics for the research phase:
- Writing to a protected `master`: default `GITHUB_TOKEN` is itself subject to branch
  protection, so likely need a GitHub App / PAT, or an Action-opened auto-merged PR.
- Branch protection: block direct human pushes to `master`; allow only the Action.
- GH Actions reference docs (jaybuidl-provided, use these at research time):
  - https://docs.github.com/en/actions.md
  - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax.md

### Bonus CI gates (on the `dev` PR, required status checks)

- Reuse existing `npm test` and `npm run update-digests` (the latter validates
  `.well-known/agent-skills/index.json` digests).
- Add: assert `plugin.json` `version` bumped + matching `CHANGELOG.md` entry exists
  (aligns with the single-source-of-truth versioning convention in CLAUDE.md).

**Tradeoff accepted:** this introduces CI as load-bearing infra to a repo that currently has
"no build step." Worth it for the payoff.

## Alternative Solutions (rejected/fallback)

- **Separate minimal marketplace repo** + `git-subdir` plugin source — guarantees zero
  exposure with no user flag, but adds a second repo to maintain. Fallback if the branch
  model proves awkward.
- **Single repo + move plugin files into a `plugin/` subdir + `git-subdir`** — rejected:
  forces a Claude-specific subfolder restructure (disliked), and fixes only the install
  cache, not the marketplace clone (unless users pass `--sparse` manually).
- **Pure-plugin `master` + `landing` branch** — rejected: two derived branches in lockstep
  is more machinery than the cosmetic-file savings justify (see "Why minimal-strip" above).

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
