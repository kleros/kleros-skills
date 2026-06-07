# HANDOVER.md — `kleros-skills`

Operational reference for a coding agent working in this repo.

## What this repo is

A Claude Code **plugin marketplace** that publishes one or more Kleros-ecosystem skills. Users install via:

```
/plugin add-marketplace kleros/kleros-skills
/plugin install kleros@kleros-skills
```

The repo doubles as both the marketplace (top-level `marketplace.json`) and the single plugin it ships (`source: "./"`). Add more plugins later by extending `plugins[]` in `marketplace.json` if needed — for now the assumption is one plugin (`kleros`) bundling several skills.

## Repo layout

```
kleros-skills/
├── .claude-plugin/
│   ├── marketplace.json     # Top-level marketplace manifest
│   └── plugin.json          # The `kleros` plugin manifest
├── kleros-ipfs-upload/      # First skill
│   ├── SKILL.md
│   └── scripts/
│       ├── pay-and-upload.ts        # Raw EVM private-key path
│       ├── pay-and-upload-cdp.ts    # Coinbase CDP server-account path
│       └── package.json
├── HANDOVER.md                  # ← you are here
├── README.md                    # User-facing install instructions
└── LICENSE
```

## The two manifests

### `.claude-plugin/marketplace.json`

```json
{
  "name": "kleros-skills",
  "owner": { "name": "Kleros", "url": "https://kleros.io" },
  "metadata": {
    "version": "1.0.0",
    "description": "Claude Code skills for interacting with the Kleros ecosystem."
  },
  "plugins": [
    {
      "name": "kleros",
      "source": "./",
      "version": "1.0.0",
      "description": "Skills for Kleros: x402 IPFS uploads, and more to come.",
      "author": { "name": "Kleros", "url": "https://kleros.io" }
    }
  ]
}
```

**Field reference**

| Field | Required | Notes |
|---|---|---|
| `name` | yes | The marketplace's identifier — must match the part after `@` in `/plugin install <plugin>@<marketplace>`. |
| `owner.{name,url}` | conventional | Human-readable owner info. |
| `metadata.version` | conventional | Bump on marketplace-level changes (e.g. adding a plugin). Independent of any plugin's `version`. |
| `metadata.description` | conventional | Shown in marketplace listings. |
| `plugins[]` | yes | At least one plugin entry. `source: "./"` means the repo root *is* the plugin. To add a second plugin, point at a subdir (`"source": "./other-plugin"`) and stop using repo-root layout. |
| `plugins[].name` | yes | Plugin name — `/plugin install <this>@<marketplace>`. |
| `plugins[].version` | conventional | Plugin-level semver. |

### `.claude-plugin/plugin.json`

```json
{
  "name": "kleros",
  "version": "1.0.0",
  "description": "Skills for interacting with the Kleros ecosystem from Claude Code. Today: x402-paid IPFS uploads for evidence, meta-evidence, policies, Curate items, and justifications.",
  "author": { "name": "Kleros", "url": "https://kleros.io" },
  "homepage": "https://kleros.io",
  "repository": "https://github.com/kleros/kleros-skills",
  "license": "MIT",
  "keywords": ["kleros", "ipfs", "x402", "evidence", "meta-evidence", "dispute-resolution"],
  "skills": ["./skills/kleros-ipfs-upload"]
}
```

**Field reference**

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Must match `plugins[0].name` in `marketplace.json`. |
| `version` | yes | Bump on any user-visible change to bundled skills. Semver. |
| `description` | yes | Surfaces in `/plugin list` and marketplace listings. |
| `skills[]` | strongly recommended | Explicit list of skill directories relative to repo root. Without it, Claude Code falls back to scanning for `SKILL.md` files — explicit is clearer and slightly faster. |
| `homepage`, `repository`, `license`, `keywords` | conventional | Treat them like an npm package manifest. |

The `marketplace.json` and `plugin.json` are independent — neither is "primary". They describe the same repo from two angles (one plugin among possibly many vs. one plugin's contents).

## Adding a new skill

1. **Create the directory** at the root project folder , named for the skill slug (kebab-case, prefixed with `kleros-` is the convention here):

   ```
   kleros-<new-skill>/
   ├── SKILL.md            # required
   └── scripts/            # optional — only if bundling runnable code
       ├── *.ts
       └── package.json
   ```

2. **Write `SKILL.md`** with required YAML frontmatter:

   ```yaml
   ---
   name: kleros-<new-skill>
   description: <triggering description — see "Skill conventions" below>
   ---
   ```

3. **Register it in `plugin.json`** — append the relative path to `skills[]`:

   ```json
   "skills": [
     "./kleros-ipfs-upload",
     "./kleros-<new-skill>"
   ]
   ```

4. **Bump versions**: increment `plugin.json` `version` (and `marketplace.json` `plugins[0].version`) by one minor for a new skill, one patch for a content edit. Update `metadata.version` in `marketplace.json` only when the marketplace itself changes shape (adding a plugin, restructuring).

5. **Update `README.md`** with a one-line entry under "Skills included".

6. (Optional) Tag a release: `git tag vX.Y.Z && git push --tags`.

## Skill conventions (followed by `kleros-ipfs-upload`, expected of new skills)

- **Slug**: `kleros-<verb>-<object>` or `kleros-<topic>`. Avoid generic words (`upload`, `tool`) without the `kleros-` prefix.
- **Description as trigger**: the frontmatter `description` is *the* mechanism by which Claude decides whether to consult the skill. Be specific about *when to use* AND *when not to use*. The current `kleros-ipfs-upload` description explicitly enumerates Kleros use cases (evidence, meta-evidence, Curate, etc.) and explicitly excludes generic IPFS-upload requests.
- **Body sections**: prefer the layout `Overview → When to use → When NOT to use → Quickstart → Pre-flight → Request shape → Response shape → Errors → Examples → Bundled`. Departures fine when justified, but match the existing skill where possible so agents reading multiple skills find consistent structure.
- **Length budget**: keep `SKILL.md` under 500 lines. If approaching that, factor reference material into sibling files under `<skill-name>/references/` and link from SKILL.md.
- **No bare `<word>` placeholders in inline code spans or text**. Some markdown renderers (notably MDX-ish ones) interpret these as HTML/JSX tags and either strip them or escape them visibly. Use descriptive placeholders (`0xYourPayerKey`, `path/to/file`, `QmYourCid`) instead of `<key>` / `<file>` / `<cid>`. Fenced code blocks are more forgiving than inline backticks.
- **Bundled scripts go under `scripts/`** with their own `package.json` declaring only the script's deps. **Do not commit `package-lock.json` or `node_modules`** — users install fresh.
- **stdout vs stderr conventions for bundled CLIs**: results (CIDs, IDs, payloads the calling agent will capture) go to stdout; diagnostics go to stderr. Match `kleros-ipfs-upload/scripts/pay-and-upload.ts`.

## Versioning & releases

- **Plugin and marketplace versions are independent**. Most edits bump just the plugin version.
- **Backwards-compatible additions** (new skill, new section in existing skill, new optional env var in a bundled script) → patch or minor bump.
- **Breaking changes** (renaming a skill slug, removing a bundled script, changing the meaning of an existing env var) → major bump, and add a note in `README.md` and the skill's body explaining the migration.
- **No CI auto-bumps** currently. Releases are manual: edit version, commit, tag. Reconsider when the marketplace gets more than ~3 skills.

## Installing & testing locally

```bash
# In Claude Code:
/plugin add-marketplace kleros/kleros-skills        # one-time
/plugin install kleros@kleros-skills                # installs all bundled skills
/plugin list                                        # verify
```

Update the local copy after a push to `main`:

```bash
/plugin update-marketplace kleros-skills
```

Skills come with their bundled scripts intact. For `kleros-ipfs-upload`:

```bash
cd ~/.claude/plugins/marketplaces/kleros-skills/kleros-ipfs-upload/scripts
npm install
EVM_PRIVATE_KEY=0x... npx tsx pay-and-upload.ts /path/to/file.txt
```

## Trigger quality testing (recommended for new / edited skills)

The description is the primary trigger mechanism. After editing it, validate:

1. **Should-trigger prompts** — write 3 realistic user prompts where the skill obviously applies and confirm Claude consults it.
2. **Should-not-trigger prompts** — write 3 realistic adjacent prompts where the skill *almost* applies but shouldn't (e.g. generic IPFS uploads for `kleros-ipfs-upload`) and confirm Claude does NOT consult it.

For larger description rewrites consider the skill-creator's `run_loop.py` description-optimizer (lives in `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/skill-creator/skills/skill-creator/scripts/run_loop.py`). It runs an automated triggering eval. Optional, not required.

## Related repos (out-of-marketplace dependencies)

| Skill | Depends on | Notes |
|---|---|---|
| `kleros-ipfs-upload` | `https://kleros-ipfs-gateway.fly.dev` | The live x402 gateway. Server code lives in `kleros/court-functions/gateway/` (separate repo). The skill's network choice (`base`), price ($0.01 USDC), and discovery body shape are determined by the gateway's deployment — coordinate any breaking changes across both repos. |

When a skill's behaviour depends on a deployed service, document the service URL inside the skill itself (already done in `SKILL.md`) AND list the dependency in this section so a future maintainer notices.

## Coding-agent operational notes

- **Don't add a top-level `CLAUDE.md` to this repo unless there's a project-wide convention to capture** — skills are self-describing via their own `SKILL.md` files. If you do add one, keep it to repo-wide rules (e.g. "commits require `-c commit.gpgsign=false`"), not per-skill content.
- **Don't commit `node_modules/` or `package-lock.json`** from any `<skill-name>/*/scripts/` dir. Add to `.gitignore` if you find them creeping in.
- **Don't include `<word>`-shaped placeholders in SKILL.md** — see "Skill conventions" above.
- **Plan-mode plus skill-creator workflow** is the right pattern for non-trivial skill changes: stage in a sibling dir, run 2-3 with-skill subagent dry-runs against realistic prompts, revise once based on what they reveal, then merge. The user has used this pattern successfully — keep using it.
- **Manifest changes need a marketplace update** (`/plugin update-marketplace kleros-skills`) on every installed client before the new behaviour kicks in. Mention this in PR descriptions / commit messages so installed users know to refresh.

## Quick checklist for a new-skill PR

- [ ] `kleros-<name>/SKILL.md` exists with valid YAML frontmatter (`name`, `description`).
- [ ] Description specifies when to use AND when not to use.
- [ ] Line count < 500.
- [ ] No bare `<word>` patterns (`grep -nE '<[a-zA-Z]' kleros-<name>/SKILL.md` returns empty).
- [ ] Bundled `scripts/package.json` (if any) is minimal and lockfile-free.
- [ ] Skill path appears in `plugin.json` `skills[]`.
- [ ] Plugin version bumped (and marketplace version bumped iff structural change).
- [ ] README updated with one-line entry under "Skills included".
- [ ] At least 3 should-trigger and 3 should-not-trigger prompts run by hand or via subagent.
