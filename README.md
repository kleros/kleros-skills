# Kleros Skills

Knowledge base for AI agents working with [Kleros](https://kleros.io) — the decentralized justice protocol.

Adapted from [ethskills](https://github.com/austintgriffith/ethskills), credits to @austintgriffith

## Install

**Claude Code:**

```
/plugin marketplace add kleros/kleros-skills
/plugin install kleros-ipfs-upload@kleros-skills
```

**OpenClaw:**

```
clawhub install kleros-skills
```

**Codex:** Create `AGENTS.md` in your repo root with:

```
Read https://skills.kleros.io/SKILL.md and follow it before interacting with Kleros protocol.
```

**Any agent:** Paste the prompt `Read https://skills.kleros.io/SKILL.md` or `curl -s https://skills.kleros.io/SKILL.md`.

## Skills included

- **kleros-ipfs-upload** — Upload files to IPFS via the Kleros x402 gateway on Base mainnet ($0.01 USDC per upload). For dispute evidence, meta-evidence JSON, court policies, Curate item metadata, and juror justifications.
- **kleros-curate** — Operate Kleros Curate token-curated registries: Light Curate, Stake Curate (PGTCR), and Scout on Ethereum and Gnosis. Submit items, challenge requests, fund appeals, deploy new lists.

## Project structure

```
SKILL.md                    # Top-level entry point / router (also served as /llms.txt)
index.html                  # Landing page (deployed on Netlify)
kleros-ipfs-upload/         # Published skill — IPFS uploads via x402
kleros-curate/              # Published skill — Curate token-curated registries (Light Curate, Stake Curate, Scout)
openclaw-skill/             # OpenClaw-compatible skill package
.claude-plugin/             # Claude Code plugin manifest
  plugin.json               # Plugin definition (version source of truth)
  marketplace.json           # Catalog index
```

## Development

```bash
npm install
npm test
```

Landing page: `npx serve .` then open `http://localhost:3000`.

## Branch model

This repo uses a two-branch model to keep end-user plugin installs lean.

**Why:** `claude plugin marketplace add` and `clawhub install` clone the entire git repository to user machines (twice — once for the marketplace mirror, once for the version-pinned cache). Everything committed ships to every user. Without this split, dozens of planning files, tests, and dev-only scripts would land in `~/.claude/plugins/...` on every install. There is no native `.claudeignore` / `files` field in the plugin spec at the time of writing, so the split is the cleanest way to scope what reaches consumers.

**How:**

| Branch | Role | What's on it |
|--------|------|--------------|
| `dev` | Source of truth — all human work, PRs, planning artefacts, tests, build tooling | Full repo |
| `master` (default) | Consumer-facing — what plugin installs and Netlify serve | `dev` minus the strip-list |

**Strip-list** (removed from `master`): `.planning/`, `test/`, `scripts/`, `package.json`, `yarn.lock`, `.yarnrc.yml`, root `*FEEDBACK*.md`, root `HANDOVER*.md`.

**Keep-list** (present on both branches): `.claude-plugin/`, skill dirs, root `SKILL.md`, `index.html`, `netlify/`, `.well-known/`, `sitemap.xml`, `robots.txt`, favicons, `LICENSE`, `README.md`, `CHANGELOG.md`, `.github/workflows/`.

`master` is regenerated automatically by [`.github/workflows/sync-master.yml`](.github/workflows/sync-master.yml) on release-tag pushes. Direct human pushes to `master` are discouraged — the workflow will overwrite them on the next sync. Tag protection rules restrict who can create release tags; the sync workflow itself runs under a dedicated `kleros-skills-sync` GitHub App identity scoped to this repo.

For the full design rationale, security model, and rejected alternatives, see [SEED-002](https://github.com/kleros/kleros-skills/blob/dev/.planning/seeds/SEED-002-exclude-planning-from-plugin-install.md) on the `dev` branch.

## Contributing

1. Branch from `dev` (or fork and branch from your fork's `dev`)
2. Make your changes
3. Run `npm test` locally
4. Open a PR targeting `dev` — never `master`

## Releases (maintainers)

1. Merge release-ready commits into `dev`
2. Bump the relevant version per the [release procedures](https://github.com/kleros/kleros-skills/blob/dev/RELEASING.md) — skill content change → `skillname@vX.Y.Z`; plugin manifest or distribution change → `.claude-plugin/plugin.json` bump + `vX.Y.Z`
3. Tag (GPG-signed) and push:
   ```bash
   # Skill release
   git tag -s "kleros-curate@v1.0.1" -m "release notes here"
   git push origin "kleros-curate@v1.0.1"

   # Plugin-level release (digit-anchored)
   git tag -s "v2.1.0" -m "release notes here"
   git push origin "v2.1.0"
   ```
4. The sync Action runs:
   - `npm test` (must pass)
   - `npm run update-digests` freshness check (must pass)
   - Strips dev-only files
   - Sanity-checks the stripped tree (asserts strip-list absent and keep-list present)
   - Force-pushes the result to `master` under the `kleros-skills-sync[bot]` identity
5. `master` redeploys to Netlify; the new release is live for plugin installs within minutes

If any gate fails, `master` stays at the previous good state — the tag exists but the release does not reach users until the issue is fixed and a new tag is pushed.

## Links

- [skills.kleros.io](https://skills.kleros.io) — Landing page
- [kleros.io](https://kleros.io) — Kleros protocol
- [GitHub](https://github.com/kleros/kleros-skills)
