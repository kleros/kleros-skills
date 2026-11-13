> **Dev-only** — stripped from `master` by `.github/workflows/sync-master.yml`, so it never ships to plugin consumers. Maintainer release procedures. The decision router ("which tag for which change") lives in `CLAUDE.md` § Releasing; this file is the full how-to.

# Releasing kleros-skills

Tags use prefixed convention: skill releases `skillname@vX.Y.Z`; plugin-level releases digit-anchored `vX.Y.Z`. A tag push fires `sync-master.yml`, which strips dev-only files and force-pushes the result to `master`. Every run needs jaybuidl's approval in the Actions tab (`production-sync` environment).

## Publishing a new skill

1. Create `skillname/SKILL.md` with YAML frontmatter (`name`, `description` in double quotes)
2. Add `"./skillname"` to `plugin.json` `skills[]`
3. Update `marketplace.json` description if needed; bump `metadata.version` — a skill added to / removed from the plugin counts as a catalog change (precedents: `2.0.0` kleros-curate, `2.1.0` kleros-create-dispute)
4. Bump `plugin.json` `version`
5. Update all multi-surface files (see **Multi-surface update rule** in `CLAUDE.md`)
6. Run `npm run update-digests`
7. Update `CHANGELOG.md`
8. Commit (push dev) — then **user runs the GPG-signed tag step**: `git tag -s skillname@vX.Y.Z <sha> -m "..."` + `git push origin skillname@vX.Y.Z`. Agent cannot sign — GPG passphrase prompt hangs the session. Tag fires sync-master workflow → user approves in Actions tab.
9. `gh release create skillname@vX.Y.Z --title "..." --notes "..."` after master sync succeeds.

## Publishing a plugin-level release (digit-anchored `vX.Y.Z`)

Use when shipping plugin manifest changes, distribution-mechanism changes (e.g. strip-list edits), bundled landing-page polish, or grouped docs that need to reach users — i.e. anything affecting the install but with NO skill content change.

1. Bump `.claude-plugin/plugin.json` `version` (semver: patch = docs/infra fixes, minor = new packaging behavior/feature bundle, major = breaking install changes)
2. Leave `marketplace.json` `metadata.version` UNCHANGED unless catalog shape actually shifted (plugins added/removed/restructured, or a skill added to/removed from `plugin.json` `skills[]`)
3. Do NOT touch per-skill SKILL.md files unless their content changed (skill content change = separate `skillname@vX.Y.Z` tag instead — or a *deliberate* combined release, see **Versioning in depth** below; just don't bundle skill edits into a plugin release by accident)
4. Add `## [X.Y.Z] - YYYY-MM-DD` entry to `CHANGELOG.md` with Added/Changed/Fixed grouping
5. Add CHANGELOG link line. **First-of-its-kind plugin tag** (e.g. v2.1.0 was first because v2.0.0 was never tagged) → `releases/tag/vX.Y.Z`. Subsequent → `compare/vPREV...vX.Y.Z`.
6. `npm run update-digests` (idempotent if no SKILL.md changed) + `npm test` — both must be green pre-commit
7. Commit on `dev` (push) — then **user runs**: `git tag -s vX.Y.Z <sha> -m "..."` + `git push origin vX.Y.Z`. User approves the sync workflow in Actions.
8. `gh release create vX.Y.Z --title "..." --notes "..."` referencing the CHANGELOG entry.

## Versioning in depth

The router in `CLAUDE.md` § Releasing gives the one-line rule per change type. The nuances behind it:

**Two tag namespaces, one trigger.** Skill-content releases use `skillname@vX.Y.Z`; plugin/distribution releases use digit-anchored `vX.Y.Z`. But a tag push syncs the **whole tree of the tagged commit** to master regardless of tag _name_. The `quality-gate` job checks out and tests **the tagged commit**, which must already be on `origin/dev` (push dev before the tag), and hands that SHA to `sync`, which checks out exactly that SHA, asserts it is still the tagged commit and on dev, strips, and force-pushes to master. Commits that land on dev after tagging do not ship under the tag. A tag push only moves master forward: a tag on a commit that does not contain what master was last synced from fails `sync` (or, if master already contains the tagged commit, is skipped as already synced). A `workflow_dispatch` run publishes `dev` HEAD at run time instead. So the tag is a **label + a trigger**, not a filter on what ships — choosing a tag name is about which version counter advances and how the release reads, not about what reaches consumers.

**`plugin.json` is the version source of truth.** `marketplace.json` `metadata.version` is an independent counter — bump it ONLY when catalog shape changes (plugins added/removed/restructured, or a skill added to/removed from `plugin.json` `skills[]` — see **Publishing a new skill**). `package.json` `version` is dev-tooling, never part of plugin versioning.

**Combined releases are allowed (precedent: `v2.2.0`, 2026-06-29).** When skill content AND landing/manifest change in one batch, you may ship one combined plugin-level `vX.Y.Z` that bundles both rather than two tags. `v2.2.0` bundled kleros-curate hardening + landing a11y/SEO polish. Trade-off: one approval + one GH release + the changelog stays a single section, at the cost of soft-bending "skill content gets its own `skillname@` tag."

**Several tags for one release (precedent: `v2.5.0` + `kleros-create-dispute@v1.0.0`, `kleros-ipfs-upload@v1.2.0`, `kleros-curate@v1.1.0`, 2026-11-13).** Tag them all on the same commit. Every tag push starts its own sync run, but only the first one has anything to publish: once master holds the commit, `quality-gate`'s already-synced check skips `sync` for the others. They end green with an "Already synced" summary and ask for no approval, so you approve once. Two GitHub limits still apply. (1) **At most three tags per `git push`**: GitHub creates no push events at all for a push of more than three tags, so nothing would run. Push the plugin tag first, then the skill tags in pushes of up to three. Order does not matter for what ships, since every run publishes the same tagged commit. (2) The `sync-master` concurrency group keeps one run going and one pending and cancels the rest, so some redundant runs show as cancelled. That is expected.

**Why prefer the `plugin.json` bump when skill content must reach _existing_ installs.** Claude Code version-pins the install cache at `~/.claude/plugins/cache/<mkt>/<plugin>/<version>/`. Bumping `plugin.json` advances that pin, which *should* make installed plugins pull the new content; a bare `skillname@vX.Y.Z` tag with no `plugin.json` bump still ships to master but leaves the pin unchanged. **(Inferred from the cache layout — not yet empirically confirmed; verify before relying on it.)**

**Quick reference (same as the CLAUDE.md router):**
- Skill content changed → `skillname@vX.Y.Z` tag; no `plugin.json` bump
- Plugin manifest OR distribution behavior changed → `plugin.json` bump + `vX.Y.Z` tag
- Catalog shape changed (plugins or published skills added/removed, plugins restructured) → ALSO bump `marketplace.json` `metadata.version`
- Pure infra-only change with no user-visible bundling → don't tag just to validate; let it ride to the next real release
- Skill + landing/manifest in one batch → one combined `vX.Y.Z` bundling both, OR two tags
