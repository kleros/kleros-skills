# Phase 5: Publishing - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Register the content-complete `kleros-curate` skill in all publishing surfaces, verify consistency across all 9+ multi-surface files, tag the release, and create a GitHub release. Most surfaces were updated incrementally during prior phases — this phase audits, fixes gaps, and formalizes the release.

</domain>

<decisions>
## Implementation Decisions

### Release Verification
- **D-01:** Full audit before tagging — run `npm test` + `npm run update-digests` + verify all 9 multi-surface files are consistent + confirm file structure and digests are valid. Trust-but-verify approach for incremental updates across 4 prior phases.
- **D-02:** Structure + digests verification only — no live `/plugin install` test in a fresh Claude Code session. File structure, JSON validity, and SHA-256 digest correctness are sufficient pre-tag checks. Live install testing is post-publish.

### Tag & Commit Strategy
- **D-03:** Fix-then-tag — fix any surface gaps found during audit in normal commits, then tag whatever HEAD ends up being as `kleros-curate@v1.0.0`. No dedicated empty release commit.
- **D-04:** Annotated tag — `git tag -a kleros-curate@v1.0.0 -m 'kleros-curate v1.0.0 — first release'`. Requires GPG passphrase, so the plan outputs the CLI command for the user to run manually. Tag push (`git push origin kleros-curate@v1.0.0`) is also manual.

### Post-Publish Steps
- **D-05:** GitHub release from tag — create a GitHub release for `kleros-curate@v1.0.0` with summary from CHANGELOG.md. Skill tag only — no retroactive v2.0.0 plugin-level release.
- **D-06:** Netlify deploy is automatic on push — no explicit deploy verification step in the plan. If the user wants to check `skills.kleros.io/kleros-curate/SKILL.md`, that's post-release.

### Claude's Discretion
- Exact wording of the GitHub release body — use CHANGELOG.md 2.0.0 entry as the basis
- Whether to fix the README.md project structure section (missing `kleros-curate/`) as part of the audit or flag it as optional
- Ordering of audit steps — whatever is most efficient

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plugin Manifest
- `.claude-plugin/plugin.json` — Single source of truth for plugin version (2.0.0) and skills[] array. Verify `"./kleros-curate"` is present.
- `.claude-plugin/marketplace.json` — Catalog index. Verify description mentions Curate.

### Multi-Surface Files (audit targets)
- `SKILL.md` — Root routing entry point. Verify "Skills" section and "What to Fetch by Task" table include kleros-curate.
- `index.html` — Landing page. Verify kleros-curate card is present and clickable.
- `openclaw-skill/SKILL.md` — OpenClaw entry point. Verify "Available Skills" table and "What to Fetch by Task" table.
- `README.md` — Verify "Skills included" list and project structure tree.
- `sitemap.xml` — Verify `<url><loc>` entry for kleros-curate.
- `.well-known/agent-skills/index.json` — Verify kleros-curate entry and SHA-256 digest.
- `CHANGELOG.md` — Verify 2.0.0 entry documents kleros-curate.

### Digest Verification
- `package.json` — Contains `update-digests` script (recalculates SHA-256 hashes in agent-skills index.json)

### Tag Convention
- `CLAUDE.md` — Tags use `skillname@vX.Y.Z` prefix convention. Commits require `-c commit.gpgsign=false`. Existing tags: `kleros-ipfs-upload@v1.0.0`, `kleros-ipfs-upload@v1.1.0`.

### Requirements
- `.planning/REQUIREMENTS.md` — PUB-01 through PUB-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `npm run update-digests` script — recalculates SHA-256 hashes for all SKILL.md files in agent-skills index.json. Run as pre-tag verification.
- `npm test` — Node built-in test runner. Run as pre-tag verification.
- Existing tags (`kleros-ipfs-upload@v1.0.0`, `kleros-ipfs-upload@v1.1.0`) — reference for tag naming convention.

### Established Patterns
- Multi-surface update rule from CLAUDE.md — 9+ files must be in sync when adding/changing a skill.
- Plugin version (2.0.0) is independent from skill tag version (1.0.0) — per CLAUDE.md "Catalog version vs plugin version" section.
- CHANGELOG follows Keep a Changelog format with comparison links at bottom.

### Integration Points
- Git tag → GitHub release (via `gh release create`)
- `npm run update-digests` reads SKILL.md files → writes hashes to `.well-known/agent-skills/index.json`
- Netlify deploys on push to master automatically

### Known Gaps (from codebase scout)
- `README.md` project structure tree (lines 37-44) does not list `kleros-curate/` — needs adding during audit

</code_context>

<specifics>
## Specific Ideas

- Annotated tag command for user to run: `git tag -a kleros-curate@v1.0.0 -m 'kleros-curate v1.0.0 — first release'`
- Tag push command: `git push origin kleros-curate@v1.0.0`
- GitHub release can be created via `gh release create kleros-curate@v1.0.0 --title "kleros-curate v1.0.0" --notes "..."` using CHANGELOG 2.0.0 summary

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Publishing*
*Context gathered: 2026-05-27*
