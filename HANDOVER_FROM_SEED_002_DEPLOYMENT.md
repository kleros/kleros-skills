# Handover — SEED-002 deployment session (quick task 260607-w84)

Captured 2026-06-11 at session-end for continuity. The next session reading this should be able to pick up cleanly without rebuilding context.

---

## ⏱️ First — push pending commits

The last two commits (`0d3d33d` fix, `6c288c3` REV-17 docs) need to land on origin:

```bash
git push origin dev
```

You ran the fix dispatch against `origin/dev` previously so `0d3d33d` is already there — but `6c288c3` (REV-17 docs) isn't. The dev branch state is currently mildly diverged.

---

## 1. Remaining work (in urgency order)

| # | Item | Driver | GSD Workflow |
|---|------|--------|--------------|
| **A** | **REV-17 — Node 20 bump** | Deadline **2026-06-16** (5 days from this finding) | `/gsd:quick` with the canned invocation in REVIEW.md |
| **B** | First real release tag | Validates production tag-trigger path end-to-end | Not a GSD task — just `git tag -a` + `git push --tags` when a real change is ready |
| **C** | Phase 2 — master branch ruleset | Locks down direct human pushes to master | `/gsd:quick` (mostly admin clicks); recommended *after* 1–2 more clean sync cycles |
| **D** | REV-16 broader sanity-check (deferred) | Quality of safety net | Bundle into REV-17 task or skip until a regression bites |

**Practical bundling suggestion:** combine **A + C** into one quick task. You'll have the deployment context loaded once; doing the Node bump and turning on the ruleset together amortizes the setup. Suggested invocation:

```
/gsd:quick "Apply REV-17 Node 20 bump from 260607-w84-REVIEW.md, then enable Phase 2 master ruleset (App on bypass, others PR-only)"
```

**B (real release)** stays out of GSD — it's just a tag push when a real skill change ships.

---

## 2. What a real release looks like (process)

Start on `dev` with the change committed:

```bash
# 1. Bump the affected skill's version in CHANGELOG.md
#    Format follows the existing convention — see top of CHANGELOG.md
$EDITOR CHANGELOG.md

# 2. Bump the relevant version field
#    - Skill change → no plugin.json bump needed; skill version lives in tag
#    - Plugin manifest / skill addition → bump .claude-plugin/plugin.json
$EDITOR .claude-plugin/plugin.json   # if applicable

# 3. Multi-surface sync (per CLAUDE.md update rule)
npm run update-digests               # SHA-256s in .well-known/agent-skills/index.json
$EDITOR sitemap.xml                  # if a published URL changed
# README.md "Skills included", index.html, openclaw-skill/SKILL.md may need touches too

# 4. Commit on dev
git -c commit.gpgsign=false commit -am "..."
git push origin dev

# 5. Tag (annotated, NOT signed — -a not -s, GPG won't prompt)
git tag -a "kleros-curate@v1.0.1" -m "Release notes summary"
git push origin "kleros-curate@v1.0.1"

# 6. Workflow fires automatically:
#    a. Reviewer prompt in Actions tab — you approve
#    b. npm test → digest gate → strip → sanity check → push to master
#    c. Netlify rebuilds the landing page from master
#    d. Plugin installs pick up the new master within minutes

# 7. Create the GitHub Release (separate from the tag push)
gh release create "kleros-curate@v1.0.1" \
  --title "kleros-curate v1.0.1" \
  --notes "Copy of the CHANGELOG section for this release"
```

**Failure modes:** test or digest gate fails → master stays at previous good state, tag exists but doesn't reach users. Fix on dev, push, delete the bad tag (`git push origin --delete kleros-curate@v1.0.1` + local `git tag -d`), push a new tag. Tag protection ruleset allows you to do all of this because you're in the bypass list.

---

## 3. Plugin version vs skills version

Per CLAUDE.md — and what the SEED-002 work itself confirms:

| What changed | Bump | Tag |
|--------------|------|-----|
| A specific skill's `SKILL.md` content | Nothing in `plugin.json`; release with skill tag | `skillname@vX.Y.Z` |
| Plugin manifest (`plugin.json`) — skills added/removed/restructured | `.claude-plugin/plugin.json` `version` field | `vX.Y.Z` (whole-repo) |
| Marketplace catalog (skills published/unpublished) | `.claude-plugin/marketplace.json` `metadata.version` field | usually rides with a plugin tag |
| Infrastructure (workflow, docs only) — like our SEED-002 work | **Nothing.** Lives under `## [Unreleased]` in CHANGELOG until next real release pulls it in | none |

**The SEED-002 work itself does NOT need a version bump.** It's plumbing — no skill content changed, no manifest changed. Add a brief note to `CHANGELOG.md` under `## [Unreleased]` (something like *"infra: branch-based dev/master split with sync-master workflow"*) and the next real release will fold it into its release notes.

Important consequence: **don't tag anything just to validate the workflow.** Wait for a real change. If you want sooner validation, the next REV-17 follow-up could double as the test — that task does change `.github/workflows/sync-master.yml`, which is in the keep-list (ships to master), so it's a legitimate (small) release moment.

---

## 4. Most appropriate GSD workflow for the remaining items

- **REV-17 (Node 20 bump):** `/gsd:quick` plain. Scope is narrow (3 action bumps + 1 verification), no real ambiguity, no need for `--discuss` or `--research`. The plan/execute path will be ~10–15 minutes.
- **Phase 2 ruleset (combined with REV-17):** add to the same `/gsd:quick` so it's one atomic deployment milestone.
- **First real release:** not a GSD workflow. Use the release process above.
- **REV-16 principle fix (deferred):** if you ever do tackle it, it's another `/gsd:quick` — small enough.

If you'd rather track REV-17 + Phase 2 as a more visible chunk (since it has the deadline), `/gsd:phase` to add it as a real numbered phase is also fine. But honestly: `/gsd:quick` matches the scope and you avoid the overhead.

---

## 5. Other things the next session should know

**State of play:**
- Last good local commit on dev: `6c288c3` (REV-17 docs, **not yet pushed**)
- `origin/dev`: `0d3d33d` (FEEDBACK regex fix — pushed)
- `origin/master`: stripped tree from the cleanup dispatch run (verified by API, no `FEEDBACK_FROM_CLAUDE_MARKETPLACE.md`)
- GitHub App `kleros-skills-sync` is live and working
- `production-sync` Environment is live with reviewer approval on every run
- Tag protection ruleset `release tags` is active for `*@v*` and `v[0-9]*`

**Operational reminders:**
- **Every** tag push or workflow_dispatch will require you to click "Approve" in the Actions tab (Environment reviewer rule). That's a feature for now; revisit after ~5 clean cycles.
- **Master is not yet branch-protected** — humans can still force-push to it. Phase 2 ruleset closes that. Don't postpone past a couple of release cycles.
- **GPG signing is OFF for commits** (`-c commit.gpgsign=false`) but **annotated tags are fine** — `git tag -a` doesn't sign by default.
- If anything breaks master, recovery is `git push --force-with-lease origin <good-sha>:master` from local (you're in the master force-push bypass list as repo admin).
- The Environment's "Deployment branches and tags" allowlist must be kept in sync with any new tag patterns added to `on.push.tags` in the workflow.

**Where to find things in the next session:**
- `SUMMARY.md` — top-level current-state document
- `REVIEW.md` — 17 findings, disposition table at the bottom shows what's done
- `CONTEXT.md` `## Post-Execution Learnings` — captures the workflow_dispatch / Environment / sentinel-tag discoveries
- `CLAUDE.md` `## Branch model` — concise reference
- `README.md` `## Branch model` / `## Releases` — public-facing version of the same

**Quick-reference paths:**
- Workflow: `.github/workflows/sync-master.yml`
- Quick task dir: `.planning/quick/260607-w84-execute-seed-002-branch-based-minimal-st/`
- Seed: `.planning/seeds/SEED-002-exclude-planning-from-plugin-install.md`

---

## TL;DR

1. `git push origin dev` first.
2. Run `/gsd:quick` for the REV-17 + Phase 2 ruleset bundle before 2026-06-16.
3. Don't tag anything just to validate — wait for a real change. The next real release tag follows the 7-step process above; **no `plugin.json` bump for the SEED-002 work itself** (it's infra, lives under `## [Unreleased]` until the next real release).
4. Master is not branch-protected yet — close that gap after a couple of clean release cycles.

---

*Memory entry `project_planning-folder-ships-to-users.md` was updated at session-end to reflect SHIPPED status. The MEMORY.md index line now reads: "SEED-002 SHIPPED 2026-06-11 via branch-based minimal-strip (dev=full, master=derived by sync-master.yml on tag push)". The next session will see the correct status from MEMORY.md at startup.*
