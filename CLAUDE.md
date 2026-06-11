# Kleros Skills

Work style: telegraph; noun-phrases ok; drop filler/grammar; min tokens

## What this repo is

Claude Code plugin marketplace containing skills for the Kleros ecosystem. Each skill is a standalone markdown file (`SKILL.md`) inside its own directory, teaching AI agents how to interact with Kleros protocol components.

Published: `kleros-ipfs-upload` (x402-paid IPFS uploads on Base mainnet), `kleros-curate` (Curate registries — Light Curate, Stake Curate, Scout).

## Commands

```bash
npm test                    # Node built-in test runner (node --test)
npm run update-digests      # Recalculate SHA-256 hashes in .well-known/agent-skills/index.json
```

Run `update-digests` after editing any SKILL.md — it checks all digests and updates stale ones in-place. Commit the updated `index.json` alongside the skill change.

No build step. No linting configured. The landing page is a static `index.html`.

Scripts in `kleros-ipfs-upload/scripts/` are TypeScript run via `npx tsx` — they have their own `package.json` (no lockfile committed intentionally).

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
- Strip-list (excluded from master): `.planning/`, `test/`, `scripts/`, `package.json`, root `*FEEDBACK*.md` / `HANDOVER*.md`.
- Every workflow run (tag push or dispatch) requires jaybuidl approval in Actions tab — `production-sync` Environment reviewer rule. Feature for now; revisit after ~5 clean cycles.

**Live infrastructure (SHIPPED 2026-06-11 via quick task 260607-w84):**
- Workflow: `.github/workflows/sync-master.yml`
- Identity: GitHub App `kleros-skills-sync` in `kleros` org, scoped to this repo, Contents R/W only
- Environment: `production-sync` — required reviewer (jaybuidl); deployment-allowlist: `dev` branch + `*@v*` + `v[0-9]*` tag patterns. **Keep tag-pattern allowlist in sync with workflow's `on.push.tags`.**
- Tag protection: ruleset `release tags` restricts creation/update/deletion of release tags to bypass list

**Phase 2 still deferred:** master branch ruleset (rulesets, NOT classic — classic bypass doesn't cover required status checks). Bundle with REV-17 in a single `/gsd:quick`.

**⏰ Maintenance: REV-17 Node 20 deprecation, deadline 2026-06-16.** `actions/checkout`, `actions/setup-node`, `actions/create-github-app-token` need bumping to Node-24-compatible versions before that date or the workflow may break. Concrete SHAs + pre-bump check (verify `app-slug` output still exists at create-github-app-token v3.2.0) in `.planning/quick/260607-w84-execute-seed-002-branch-based-minimal-st/260607-w84-REVIEW.md`.

**Operational gotchas worth knowing:**
- `workflow_dispatch` needs the workflow on the default branch — tag-push doesn't. If the workflow ever vanishes from master, bootstrap via a sentinel tag pushed on dev.
- Forgetting `git push origin dev` before re-dispatching is a common foot-gun — the workflow runs against `origin/dev`, not local.
- Recovery if master ships bad state: `git push --force-with-lease origin <good-sha>:master` from local (admin bypass), then disable workflow, fix on dev, re-enable.

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
- `metadata.version` in marketplace.json — bump when plugins added/removed/restructured in catalog
- `version` in plugin.json — bump when skill content changes (semver: patch = docs/bugfixes, minor = new features/env vars, major = breaking behavior changes)
- Both are independent counters; they diverge once multiple plugins exist

**No changelog field in plugin spec.** Claude Code plugin schema has no `changelog`, `releaseNotes`, or equivalent. Convention: `CHANGELOG.md` at repo root + git tags.

## Skill conventions

Each published skill lives in `skillname/SKILL.md` with YAML frontmatter (`name`, `description`). The `description` field is what Claude Code uses to decide when to trigger the skill — it must include both positive triggers and negative triggers (when NOT to use).

**YAML quoting rule:** Always wrap `description` values in double quotes. Unquoted colons and em dashes break GitHub's YAML parser even though Claude Code handles them fine. Discovered when `kleros-curate` description (1,413 chars with colons in "Light Curate (LGTCR, optimistic challenge window)") rendered as an error on GitHub.

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

## Publishing a new skill

1. Create `skillname/SKILL.md` with YAML frontmatter (`name`, `description` in double quotes)
2. Add `"./skillname"` to `plugin.json` `skills[]`
3. Update `marketplace.json` description if needed; bump `metadata.version`
4. Bump `plugin.json` `version`
5. Update all multi-surface files (see table above)
6. Run `npm run update-digests`
7. Update `CHANGELOG.md`
8. Commit and tag: `skillname@vX.Y.Z`

## Gotcha: plugin install ships the WHOLE repo

Marketplace add + plugin install = full `git clone`. Entire repo copied to user machine, **twice**: `~/.claude/plugins/marketplaces/<name>/` and version-pinned `~/.claude/plugins/cache/<mkt>/<plugin>/<version>/`. No native exclude — no `files`/`include`/`exclude`/`ignore` manifest field, no `.claudeignore`/`.gitattributes export-ignore` honored. `skills[]` paths only say where to READ, not what to copy. So **anything committed ships to users**, incl `.planning/`. Confirmed empirically + code.claude.com docs (2026-05).

Bare `marketplace add kleros/kleros-skills` resolves to the repo DEFAULT branch.

Knobs: `ref`/`sha` pin branch/tag/commit (marketplace `@ref` + plugin `source.ref`; `extraKnownMarketplaces` in settings.json); `git-subdir` source sparse-clones one subdir (install only, NOT marketplace-add); `--sparse` flag scopes marketplace-add (CLI-only, user-supplied → unreliable for end users).

Fix implemented: branch-based minimal-strip — `dev` holds full repo; `master` is derived via GitHub Action (`.github/workflows/sync-master.yml`) triggered on release tags. Dev-only dirs/files are stripped before master push. Contributors: PR against `dev`. Full design: `.planning/seeds/SEED-002-exclude-planning-from-plugin-install.md`.

## Gotcha: IPFS CID URLs

`cids[]` from the gateway already includes the `/ipfs/` prefix (e.g. `/ipfs/QmXXX...`). Building URLs as `"https://cdn.kleros.link/ipfs/" + cid` produces a double-slash. Use `"https://cdn.kleros.link" + cid` or just use the `urls[]` field from the response.
