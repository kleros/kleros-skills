# Kleros Skills

Work style: telegraph; noun-phrases ok; drop filler/grammar; min tokens

## What this repo is

Claude Code plugin marketplace containing skills for the Kleros ecosystem. Each skill is a standalone markdown file (`SKILL.md`) inside its own directory, teaching AI agents how to interact with Kleros protocol components.

Published: `kleros-ipfs-upload` (x402-paid IPFS uploads on Base mainnet).
Drafts: `curate-v1/` (Light Curate, Stake Curate), `curate-v1-scout/` (Scout registries). Not yet registered as plugins.

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

## Plugin structure

```
.claude-plugin/
  plugin.json         # plugin definition — name, version (source of truth), skills[]
  marketplace.json    # catalog index — no version on individual plugin entries
```

**Naming rule:** each plugin `name` in `plugin.json` must match its skill directory name exactly.

**Versioning:** `plugin.json` is the single source of truth for plugin version. `marketplace.json` `metadata.version` tracks catalog-level changes. `CHANGELOG.md` at repo root tracks all changes (Keep a Changelog format).

**Why no version in marketplace plugins[]:** redundant copy of plugin.json version → drift risk. Single source of truth = plugin.json.

**Catalog version vs plugin version:**
- `metadata.version` in marketplace.json — bump when plugins added/removed/restructured in catalog
- `version` in plugin.json — bump when skill content changes (semver: patch = docs/bugfixes, minor = new features/env vars, major = breaking behavior changes)
- Both are independent counters; they diverge once multiple plugins exist

**No changelog field in plugin spec.** Claude Code plugin schema has no `changelog`, `releaseNotes`, or equivalent. Convention: `CHANGELOG.md` at repo root + git tags.

## Skill conventions

Each published skill lives in `skillname/SKILL.md` with YAML frontmatter (`name`, `description`). The `description` field is what Claude Code uses to decide when to trigger the skill — it must include both positive triggers and negative triggers (when NOT to use).

Draft skills (not yet registered) may use different file naming but should be restructured to `skillname/SKILL.md` before publishing.

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

## Publishing a new skill

1. Create `skillname/SKILL.md` with YAML frontmatter (`name`, `description`)
2. Add `"./skillname"` to `plugin.json` `skills[]`
3. Add a plugin entry to `marketplace.json` `plugins[]` (name must match directory, no `version` field — that lives in plugin.json only)
4. Bump `plugin.json` `version` and `marketplace.json` `metadata.version`
5. Update `CHANGELOG.md`
6. Commit and tag: `skillname@vX.Y.Z`

## Gotcha: IPFS CID URLs

`cids[]` from the gateway already includes the `/ipfs/` prefix (e.g. `/ipfs/QmXXX...`). Building URLs as `"https://cdn.kleros.link/ipfs/" + cid` produces a double-slash. Use `"https://cdn.kleros.link" + cid` or just use the `urls[]` field from the response.
