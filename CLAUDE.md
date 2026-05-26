# Kleros Skills

Work style: telegraph; noun-phrases ok; drop filler/grammar; min tokens

## What this repo is

Claude Code plugin marketplace containing skills for the Kleros ecosystem. Each skill is a standalone markdown file (`SKILL.md`) inside its own directory, teaching AI agents how to interact with Kleros protocol components.

Published: `kleros-ipfs-upload` (x402-paid IPFS uploads on Base mainnet).
Drafts: `curate-v1/` (Light Curate, Stake Curate), `curate-v1-scout/` (Scout registries). Not yet registered as plugins.

## Commands

```bash
npm test                    # Node built-in test runner (node --test)
node --test test/index.test.js  # same thing, explicit
```

No build step. No linting configured. The landing page is a static `index.html`.

Scripts in `kleros-ipfs-upload/scripts/` are TypeScript run via `npx tsx` — they have their own `package.json` (no lockfile committed intentionally).

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

## Skill conventions

Each published skill lives in `skillname/SKILL.md` with YAML frontmatter (`name`, `description`). The `description` field is what Claude Code uses to decide when to trigger the skill — it must include both positive triggers and negative triggers (when NOT to use).

Draft skills (not yet registered) may use different file naming but should be restructured to `skillname/SKILL.md` before publishing.

## Publishing a new skill

1. Create `skillname/SKILL.md` with YAML frontmatter (`name`, `description`)
2. Add `"./skillname"` to `plugin.json` `skills[]`
3. Add a plugin entry to `marketplace.json` `plugins[]` (name must match directory, no `version` field — that lives in plugin.json only)
4. Bump `plugin.json` `version` and `marketplace.json` `metadata.version`
5. Update `CHANGELOG.md`
6. Commit and tag: `skillname@vX.Y.Z`

## Gotcha: IPFS CID URLs

`cids[]` from the gateway already includes the `/ipfs/` prefix (e.g. `/ipfs/QmXXX...`). Building URLs as `"https://cdn.kleros.link/ipfs/" + cid` produces a double-slash. Use `"https://cdn.kleros.link" + cid` or just use the `urls[]` field from the response.
