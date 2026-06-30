> **Dev-only** — stripped from `master` by `.github/workflows/sync-master.yml`, so it never ships to plugin consumers. Maintainer release procedures. The decision router ("which tag for which change") lives in `CLAUDE.md` § Releasing; this file is the full how-to.

# Releasing kleros-skills

Tags use prefixed convention: skill releases `skillname@vX.Y.Z`; plugin-level releases digit-anchored `vX.Y.Z`. A tag push fires `sync-master.yml`, which strips dev-only files and force-pushes the result to `master`. Every run needs jaybuidl's approval in the Actions tab (`production-sync` environment).

## Publishing a new skill

1. Create `skillname/SKILL.md` with YAML frontmatter (`name`, `description` in double quotes)
2. Add `"./skillname"` to `plugin.json` `skills[]`
3. Update `marketplace.json` description if needed; bump `metadata.version`
4. Bump `plugin.json` `version`
5. Update all multi-surface files (see **Multi-surface update rule** in `CLAUDE.md`)
6. Run `npm run update-digests`
7. Update `CHANGELOG.md`
8. Commit (push dev) — then **user runs the GPG-signed tag step**: `git tag -s skillname@vX.Y.Z <sha> -m "..."` + `git push origin skillname@vX.Y.Z`. Agent cannot sign — GPG passphrase prompt hangs the session. Tag fires sync-master workflow → user approves in Actions tab.
9. `gh release create skillname@vX.Y.Z --title "..." --notes "..."` after master sync succeeds.

## Publishing a plugin-level release (digit-anchored `vX.Y.Z`)

Use when shipping plugin manifest changes, distribution-mechanism changes (e.g. strip-list edits), bundled landing-page polish, or grouped docs that need to reach users — i.e. anything affecting the install but with NO skill content change.

1. Bump `.claude-plugin/plugin.json` `version` (semver: patch = docs/infra fixes, minor = new packaging behavior/feature bundle, major = breaking install changes)
2. Leave `marketplace.json` `metadata.version` UNCHANGED unless catalog shape (plugins added/removed/restructured) actually shifted
3. Do NOT touch per-skill SKILL.md files unless their content changed (skill content change = separate `skillname@vX.Y.Z` tag instead — or a *deliberate* combined release, see **Versioning in depth** below; just don't bundle skill edits into a plugin release by accident)
4. Add `## [X.Y.Z] - YYYY-MM-DD` entry to `CHANGELOG.md` with Added/Changed/Fixed grouping
5. Add CHANGELOG link line. **First-of-its-kind plugin tag** (e.g. v2.1.0 was first because v2.0.0 was never tagged) → `releases/tag/vX.Y.Z`. Subsequent → `compare/vPREV...vX.Y.Z`.
6. `npm run update-digests` (idempotent if no SKILL.md changed) + `npm test` — both must be green pre-commit
7. Commit on `dev` (push) — then **user runs**: `git tag -s vX.Y.Z <sha> -m "..."` + `git push origin vX.Y.Z`. User approves the sync workflow in Actions.
8. `gh release create vX.Y.Z --title "..." --notes "..."` referencing the CHANGELOG entry.

## Versioning in depth

The router in `CLAUDE.md` § Releasing gives the one-line rule per change type. The nuances behind it:

**Two tag namespaces, one trigger.** Skill-content releases use `skillname@vX.Y.Z`; plugin/distribution releases use digit-anchored `vX.Y.Z`. But a tag push syncs the **whole dev tree** to master regardless of tag _name_ (the workflow checks out the tagged dev commit, strips, force-pushes to master). So the tag is a **label + a trigger**, not a filter on what ships — choosing a tag name is about which version counter advances and how the release reads, not about what reaches consumers.

**`plugin.json` is the version source of truth.** `marketplace.json` `metadata.version` is an independent counter — bump it ONLY when catalog shape changes (plugins added/removed/restructured). `package.json` `version` is dev-tooling, never part of plugin versioning.

**Combined releases are allowed (precedent: `v2.2.0`, 2026-06-29).** When skill content AND landing/manifest change in one batch, you may ship one combined plugin-level `vX.Y.Z` that bundles both rather than two tags. `v2.2.0` bundled kleros-curate hardening + landing a11y/SEO polish. Trade-off: one approval + one GH release + the changelog stays a single section, at the cost of soft-bending "skill content gets its own `skillname@` tag."

**Why prefer the `plugin.json` bump when skill content must reach _existing_ installs.** Claude Code version-pins the install cache at `~/.claude/plugins/cache/<mkt>/<plugin>/<version>/`. Bumping `plugin.json` advances that pin, which *should* make installed plugins pull the new content; a bare `skillname@vX.Y.Z` tag with no `plugin.json` bump still ships to master but leaves the pin unchanged. **(Inferred from the cache layout — not yet empirically confirmed; verify before relying on it.)**

**Quick reference (same as the CLAUDE.md router):**
- Skill content changed → `skillname@vX.Y.Z` tag; no `plugin.json` bump
- Plugin manifest OR distribution behavior changed → `plugin.json` bump + `vX.Y.Z` tag
- Catalog shape changed (plugins added/removed/restructured) → ALSO bump `marketplace.json` `metadata.version`
- Pure infra-only change with no user-visible bundling → don't tag just to validate; let it ride to the next real release
- Skill + landing/manifest in one batch → one combined `vX.Y.Z` bundling both, OR two tags
