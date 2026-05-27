# Phase 5: Publishing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 5-Publishing
**Areas discussed:** Release verification, Tag & commit strategy, Post-publish steps

---

## Release Verification

### Verification Thoroughness

| Option | Description | Selected |
|--------|-------------|----------|
| Full audit (Recommended) | npm test + npm run update-digests + verify all 9 surfaces match + check skill loads in Claude Code | ✓ |
| Automated only | npm test + update-digests. Trust prior phases got the surfaces right | |
| You decide | Claude picks based on the surface audit | |

**User's choice:** Full audit
**Notes:** None

### Install Test Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Structure + digests only | Verify files exist, digests match, plugin.json is valid JSON. No live install test | ✓ |
| Live install test | Actually run /plugin install from the local repo in a fresh context | |
| You decide | Claude picks based on what's practical | |

**User's choice:** Structure + digests only
**Notes:** None

---

## Tag & Commit Strategy

### Release Commit Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Fix then tag HEAD | Fix surface gaps in normal commits, tag HEAD as kleros-curate@v1.0.0. Simple, linear | ✓ |
| Dedicated release commit | After fixes, create a final 'chore: release' commit and tag that | |
| You decide | Claude picks based on repo conventions | |

**User's choice:** Fix then tag HEAD
**Notes:** None

### Tag Type

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight | git tag kleros-curate@v1.0.0 — consistent with existing tags | |
| Annotated | git tag -a kleros-curate@v1.0.0 -m '...' — adds metadata | ✓ (Other) |

**User's choice:** Annotated, with user running the CLI command manually (GPG passphrase requires interactive input)
**Notes:** Plan should output the exact CLI commands for the user to run

---

## Post-Publish Steps

### Post-Tag Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Push tag to GitHub | git push origin kleros-curate@v1.0.0 — manual | |
| Verify Netlify deploy | Check skills.kleros.io resolves correctly | |
| GitHub release notes | Create a GitHub release from the tag with CHANGELOG summary | ✓ |
| None needed | Tag + push is enough | |

**User's choice:** GitHub release notes
**Notes:** None

### Release Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Skill tag only | Create release for kleros-curate@v1.0.0 only | ✓ |
| Both tags | Create releases for both kleros-curate@v1.0.0 and v2.0.0 | |
| You decide | Claude picks based on what exists | |

**User's choice:** Skill tag only
**Notes:** No retroactive v2.0.0 plugin-level release

---

## Claude's Discretion

- Exact wording of the GitHub release body
- Whether to fix README.md project structure section as part of audit or flag as optional
- Ordering of audit steps

## Deferred Ideas

None — discussion stayed within phase scope.
