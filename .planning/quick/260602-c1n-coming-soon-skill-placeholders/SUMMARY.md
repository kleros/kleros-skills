---
id: 260602-c1n
slug: coming-soon-skill-placeholders
status: complete
completed: 2026-06-02
---

# Coming-soon skill placeholders — complete

## What was done

Added 8 "Coming Soon" placeholder cards to `index.html` showing upcoming skills, matching the design from the user's screenshot.

## Files changed

- `index.html`
  - Added `.skill.coming-soon` CSS modifier (suppresses left accent, hover lift, cursor pointer)
  - Added `.skill-status` badge style (gray, top-right, monospace, uppercase)
  - Inserted 8 placeholder cards (Kleros CLI, Escrow v1, Escrow v2, Agent Verification, Arbitrable App Builder, Why Kleros, Kleros Protocol, Contract Addresses)
  - Scoped modal click handler to `.skill:not(.coming-soon)` so placeholders don't open empty modals
  - Updated section meta count: "2 live" → "2 live · 8 coming soon"

## Surfaces NOT touched (intentional)

Per CLAUDE.md draft rule: only `index.html` needs updating for non-published placeholders. Skipped:
- `SKILL.md` (root router)
- `openclaw-skill/SKILL.md`
- `README.md`, `CHANGELOG.md`
- `plugin.json`, `marketplace.json` (published skills only)
- `sitemap.xml`, `.well-known/agent-skills/index.json` (published skills only)

## Verification

- `npm test` — 15/15 pass
- All 8 new cards rendered as non-clickable placeholders with "Coming Soon" badge
