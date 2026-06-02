---
id: 260602-c1n
slug: coming-soon-skill-placeholders
created: 2026-06-02
status: in-progress
---

# Add "Coming Soon" placeholder cards to landing page

## Goal

Add 8 placeholder cards to `index.html` showing upcoming skills currently in design or development. Surfaces the roadmap to visitors without committing to live `SKILL.md` files.

## Design (from user screenshot)

- Same `.skill` card markup, with `.coming-soon` modifier class
- Top-right "COMING SOON" badge — gray background, uppercase, small monospace
- No purple `::before` accent stripe
- No copy button at bottom — just the future path as `<code>`
- Non-clickable (no `role=button`, no hover lift, no modal handler)

## Upcoming skills

| # | Name | Path | Tags |
|---|------|------|------|
| 1 | Kleros CLI | `kleros-cli/SKILL.md` | CLI, MCP, AGENTS |
| 2 | Kleros Escrow v1 | `kleros-escrow-v1/SKILL.md` | ESCROW, ARBITRATION |
| 3 | Kleros Escrow v2 | `kleros-escrow-v2/SKILL.md` | ESCROW, V2 |
| 4 | Agent Verification | `agent-verification/SKILL.md` | ERC-8004, REPUTATION |
| 5 | Arbitrable App Builder | `arbitrable-app-builder/SKILL.md` | BUILDER, INTEGRATION |
| 6 | Why Kleros | `why-kleros/SKILL.md` | OVERVIEW |
| 7 | Kleros Protocol | `kleros-protocol/SKILL.md` | PROTOCOL, CRYPTO-ECON |
| 8 | Contract Addresses | `contract-addresses/SKILL.md` | ONCHAIN, REFERENCE |

## Surfaces

Single-file change: `index.html` only (per CLAUDE.md draft rule). Meta count updated from "2 live" to "2 live · 8 coming soon".

## Out of scope

- Real SKILL.md files
- Router updates (`SKILL.md`, `openclaw-skill/SKILL.md`)
- `plugin.json`/`marketplace.json` (published skills only)
- `sitemap.xml`, `.well-known/agent-skills/index.json` (published skills only)
- `CHANGELOG.md` — landing-page-only cosmetic addition
