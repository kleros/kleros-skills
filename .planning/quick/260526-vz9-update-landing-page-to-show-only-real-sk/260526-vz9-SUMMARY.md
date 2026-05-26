---
status: complete
---

# Quick Task 260526-vz9: Update landing page to show only real skills

## What changed

Updated `.planning/research/index.html` to reflect actual repository state:

**Removed (fake/non-existent):**
- Dispute Resolution (`dispute-resolution/SKILL.md` — directory doesn't exist)
- Escrow (`escrow/SKILL.md` — directory doesn't exist)
- Reality (`reality/SKILL.md` — directory doesn't exist)
- Proof of Humanity (`proof-of-humanity/SKILL.md` — directory doesn't exist)
- Tokens & Staking (`tokens-staking/SKILL.md` — directory doesn't exist)
- Smart Contracts (`smart-contracts/SKILL.md` — directory doesn't exist)
- Root `SKILL.md` hero button (file doesn't exist)

**Added (real):**
- Kleros IPFS Upload — the only published skill (`kleros-ipfs-upload/SKILL.md`)

**Kept as "Coming Soon" drafts (with badge + dimmed styling):**
- Curate Light — from `curate-v1/curate-light-skill.md`
- Curate Stake (PGTCR) — from `curate-v1/pgtcr-stake-curate-skill.md`
- Curate Scout — from `curate-v1-scout/scout-skills.md`

**Other fixes:**
- Hero button now points to `kleros-ipfs-upload/SKILL.md`
- Skills split into "Published Skills" and "Coming Soon" sections
- Draft skills have `draft` badge and are non-clickable (no modal, no copy button)
- GitHub link updated to `kleros/kleros-skills` (was generic `kleros`)
- curl example updated with `kleros-ipfs-upload/SKILL.md` path
- Descriptions sourced from actual skill file frontmatter/content
