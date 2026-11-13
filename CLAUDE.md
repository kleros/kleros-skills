# Kleros Skills

Work style: telegraph; noun-phrases ok; drop filler/grammar; min tokens

## What this repo is

Claude Code plugin marketplace containing skills for the Kleros ecosystem. Each skill is a standalone markdown file (`SKILL.md`) inside its own directory, teaching AI agents how to interact with Kleros protocol components.

Published: `kleros-ipfs-upload` (x402-paid IPFS uploads on Base mainnet), `kleros-curate` (Curate registries — Light Curate, Stake Curate, Scout), `kleros-create-dispute` (Kleros V2 disputes via DisputeResolver on Arbitrum One/Sepolia + evidence).

## Commands

```bash
npm test                    # Node built-in test runner (node --test)
npm run update-digests      # Recalculate SHA-256 hashes in .well-known/agent-skills/index.json
npm run eval:check          # Free: parse test/evals cases + sanity-test grader regexes (once: npm ci --prefix test/evals)
npm run eval                # PAID claude plugin eval suite (test/evals/) — needs bubblewrap+socat; not part of npm test; see test/evals/README.md
```

Run `update-digests` after editing any SKILL.md — it checks all digests and updates stale ones in-place. Commit the updated `index.json` alongside the skill change.

No build step. No linting configured. The landing page is a static `index.html`.

Scripts in `kleros-ipfs-upload/scripts/` are TypeScript run via `npx tsx` — they have their own `package.json` and a committed `package-lock.json`. Same for `kleros-create-dispute/scripts/`. Lockfiles are committed so payment / tx-building deps are reproducible; install with `npm ci`, bump deps deliberately (`npm update` + review), never via unlocked installs.

## Claude Code setup

Repo commits only the minimal `.claude/` surface: `settings.json`, `hooks/`, `package.json`. Plugin code (GSD, commands, agents) is gitignored — each contributor installs independently:

```bash
npx @opengsd/get-shit-done-redux   # install GSD workflow plugin
```

If hooks reference missing scripts, Claude Code warns but still works.

## Git

Commits require GPG passphrase (interactive — will hang). Always use `git -c commit.gpgsign=false commit` and append `Co-Authored-By: Claude <noreply@anthropic.com>` to commit messages.

Tags use prefixed convention: `skillname@vX.Y.Z` (e.g. `kleros-ipfs-upload@v1.1.0`).

## Branch model

| Branch | Role | Who pushes |
|--------|------|-----------|
| `dev` | Full repo — all human work, PRs, planning | Contributors |
| `master` | Derived clean tree — plugin/marketplace consumers see this | GitHub Action (also: admins until Phase 2 ships) |

**Rules:**
- All PRs target `dev`.
- Never commit or push directly to `master` — it is regenerated automatically.
- `master` is NOT a git ancestor of `dev`; `git log master` will not match `dev` history.
- Release tags reference dev commits, not master — `git tag --contains HEAD` on a master checkout finds nothing.
- Sync fires on tag push matching `*@v*.*.*` or `v[0-9]*`, and on `workflow_dispatch`.
- Strip-list (excluded from master): `.planning/`, `test/` (incl. `test/evals/`), `scripts/`, `package.json`, root `*FEEDBACK*.md` / `HANDOVER*.md`.
- Every workflow run that would change master requires jaybuidl approval in Actions tab — `production-sync` Environment reviewer rule. Feature for now; ~5-clean-cycle revisit point reached at v2.5.0.
- Tag push publishes the TAGGED commit (must be on `origin/dev` → push dev first; must contain master's current source); `workflow_dispatch` publishes `dev` HEAD.
- Tag-push runs where master already holds the strip of the tagged commit or a descendant of it (extra tags of a multi-tag release, late tag on an older commit) skip `sync` with no approval prompt — `quality-gate` already-synced check. Max 3 tags per `git push` (more → GitHub fires no events). Strip-list = workflow-level `env` `STRIP_PATHS`/`STRIP_ROOT_PATTERN`, shared by the strip and the check.

**Live infrastructure:**
- Workflow: `.github/workflows/sync-master.yml`
- Identity: GitHub App `kleros-skills-sync` in `kleros` org, scoped to this repo, Contents R/W only
- Secret: `GH_APP_PRIVATE_KEY` is a `production-sync` **environment** secret (no repo-level copy) — only a job declaring that environment can mint the token
- Environment: `production-sync` — required reviewer (jaybuidl); deployment-allowlist: `dev` branch + `*@v*.*.*` + `v[0-9]*` tag patterns (exactly the workflow's `on.push.tags`). **Keep tag-pattern allowlist in sync with workflow's `on.push.tags`.**
- Tag protection: ruleset `release tags` (`*@v*`, `v[0-9]*`) restricts creation/update/deletion of release tags to bypass list — must stay a superset of the environment's tag allowlist (else an unprotected tag could deploy)
- Master branch ruleset (`master`): restricts direct push to bypass list (sync App + admins)

**Operational gotchas worth knowing:**
- `workflow_dispatch` needs the workflow on the default branch — tag-push doesn't. If the workflow ever vanishes from master, bootstrap via a sentinel tag pushed on dev.
- Forgetting `git push origin dev` before re-dispatching is a common foot-gun — the workflow runs against `origin/dev`, not local.
- Recovery if master ships bad state: `git push --force-with-lease origin <good-sha>:master` from local (admin bypass), then disable workflow, fix on dev, re-enable.
- **AI worktree-isolated executors: always pre-merge diff-stat before merging back to dev.** Claude Code's `isolation="worktree"` can branch off origin/master instead of the spawning HEAD (CC #2015) — and because master is a strip-derived view of dev (not a fast-forward), a naive merge silently deletes `.planning/`, `test/`, `scripts/`, and `package.json`. Always `git diff --stat HEAD..."$WT_BRANCH"` first; if the file count exceeds what the plan declared, cherry-pick the intended commit by SHA and discard the branch. Incident 2026-06-11 (quick-260611-vy1) would have deleted ~14k lines.

## Plugin structure

```
.claude-plugin/
  plugin.json         # plugin definition — name, version (source of truth), skills[]
  marketplace.json    # catalog index — no version on individual plugin entries
```

**Naming rule:** the plugin `name` in `plugin.json` is `kleros-skills` (multi-skill plugin). Each skill directory listed in `skills[]` must exist.

**Versioning:** `plugin.json` is the single source of truth for plugin version. `marketplace.json` `metadata.version` tracks catalog-level changes. `CHANGELOG.md` at repo root tracks all changes (Keep a Changelog format).

**Why no version in marketplace plugins[]:** redundant copy of plugin.json version → drift risk. Single source of truth = plugin.json.

**Catalog version vs plugin version:**
- `metadata.version` in marketplace.json — bump when plugins added/removed/restructured in catalog, incl. a skill added to/removed from `plugin.json` `skills[]` (RELEASING.md § Publishing a new skill)
- `version` in plugin.json — bump when skill content changes (semver: patch = docs/bugfixes, minor = new features/env vars, major = breaking behavior changes)
- Both are independent counters; they diverge once multiple plugins exist

**No changelog field in plugin spec.** Claude Code plugin schema has no `changelog`, `releaseNotes`, or equivalent. Convention: `CHANGELOG.md` at repo root + git tags.

## Skill conventions

Each published skill lives in `skillname/SKILL.md` with YAML frontmatter (`name`, `description`). The `description` field is what Claude Code uses to decide when to trigger the skill — it must include both positive triggers and negative triggers (when NOT to use).

**YAML quoting rule:** Always wrap `description` values in double quotes. Unquoted colons and em dashes break GitHub's YAML parser even though Claude Code handles them fine.

**Address-table rule:** rows pairing a contract address with a scan/deployment block (e.g. `kleros-curate/references/verify-your-list.md`) are all-or-nothing — swapping an address means re-deriving its block from the contract's *creation tx*, not its first transaction. PR #4 shipped a half-updated row.

## Multi-surface update rule

When adding or changing a skill, multiple files must be updated in sync:

| File | What to update |
|------|---------------|
| `SKILL.md` (root) | Routing table, "Skills" section, "What to Fetch by Task" table |
| `index.html` | Skills list, copy buttons, modal click handlers, descriptions |
| `openclaw-skill/SKILL.md` | "Available Skills" table, "What to Fetch by Task" table, "Key Facts" |
| `README.md` | "Skills included" list |
| `.claude-plugin/plugin.json` | `skills[]` array (published skills only) |
| `.claude-plugin/marketplace.json` | `plugins[]` array (published skills only) |
| `CHANGELOG.md` | New entry under appropriate version |
| `sitemap.xml` | Add/remove/rename `<url><loc>` entries for published skill URLs |
| `.well-known/agent-skills/index.json` | Add/remove skill entries, recalculate `digest` (sha256) when SKILL.md content changes |
| `.github/workflows/sync-master.yml` | Add/remove the skill directory in `EXPECTED_ROOT` **and** the keep-list loop — the sanity check fails the release sync otherwise |

Draft/coming-soon skills only need updates to `index.html` (dimmed listing) and optionally `SKILL.md`/`openclaw-skill/SKILL.md` if they're referenced in routing.

## Landing page (`index.html`)

Static single-page site deployed on Netlify. Key features:
- ASCII art title (single line, centered, overflows body width)
- Prompt copy box at top with "Persistent Setup" anchor
- Skill cards with click-to-modal (fetches SKILL.md, renders markdown inline)
- Persistent Setup section: Codex, Cursor, Claude Code, OpenClaw, Scripts
- Minimal markdown renderer in `<script>` — supports indented tables/code blocks
- Draft skills shown dimmed with `draft` badge, non-clickable (`cursor: default`)

## Netlify

- Config: `netlify.toml` at repo root
- Symlinks don't work on Netlify — use `[[redirects]]` with `status = 200` instead
- `/llms.txt` → `/SKILL.md` redirect already configured
- `/:skill` → `/:skill/SKILL.md` catch-all redirect for skill shorthand URLs
- Edge function `netlify/edge-functions/markdown-negotiation.ts` — serves SKILL.md when `Accept: text/markdown` on `/`
- `[[headers]]` set `Link` (describedby + api-catalog) on `/` and `Content-Type` on `/.well-known/api-catalog`
- Processing order: Edge Functions → Headers → Redirects → Static Files

## Agent readiness

Static files serving agent discovery standards:
- `robots.txt` — allows all crawlers, Content-Signal directives (ai-train/search/ai-input = yes)
- `sitemap.xml` — canonical URLs for all published skills
- `.well-known/agent-skills/index.json` — Agent Skills Discovery RFC v0.2.0 with SHA-256 digests
- `.well-known/api-catalog` — RFC 9727 Linkset JSON advertising the IPFS upload gateway

## Releasing

Full step-by-step → **`RELEASING.md`** (dev-only, stripped from master). **Cutting a release? READ `RELEASING.md` first — don't go from memory.** GPG-signed tag step is user-only (passphrase hangs the agent).

**Which tag for which change (decision router):**
- Skill content changed → `skillname@vX.Y.Z` tag; no `plugin.json` bump
- Plugin manifest / distribution behavior changed → `plugin.json` bump + `vX.Y.Z` tag
- Skill + landing/manifest in one batch → one combined `vX.Y.Z` bundling both, OR two tags (see `RELEASING.md`)
- Catalog shape changed (plugins added/removed/restructured, or a skill added to/removed from `plugin.json` `skills[]`) → ALSO bump `marketplace.json` `metadata.version`
- Infra-only, no user-visible bundling → don't tag just to validate; ride the next real release

**Key mechanic:** a tag push syncs the WHOLE tree of the tagged dev commit to master regardless of tag _name_ — tag choice = labeling + which version counter advances, NOT what reaches master.

## Gotcha: plugin install ships the WHOLE repo

Marketplace add + plugin install = full `git clone`. Entire repo copied to user machine, **twice**: `~/.claude/plugins/marketplaces/<name>/` and version-pinned `~/.claude/plugins/cache/<mkt>/<plugin>/<version>/`. No native exclude — no `files`/`include`/`exclude`/`ignore` manifest field, no `.claudeignore`/`.gitattributes export-ignore` honored. `skills[]` paths only say where to READ, not what to copy. So **anything committed ships to users**, incl `.planning/`. Confirmed empirically + code.claude.com docs (2026-05).

Bare `marketplace add kleros/kleros-skills` resolves to the repo DEFAULT branch.

Fix implemented: branch-based minimal-strip — `dev` holds full repo; `master` is derived via GitHub Action (`.github/workflows/sync-master.yml`) triggered on release tags. Dev-only dirs/files are stripped before master push. Contributors: PR against `dev`. Full design: SEED-002.

## Gotcha: IPFS CID URLs

`cids[]` from the gateway already includes the `/ipfs/` prefix (e.g. `/ipfs/QmXXX...`). Building URLs as `"https://cdn.kleros.link/ipfs/" + cid` produces a double-slash. Use `"https://cdn.kleros.link" + cid` or just use the `urls[]` field from the response.
