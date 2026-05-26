# Claude Code Skill Architecture Patterns
# Research for: kleros-curate unified skill
# Researched: 2026-05-26

---

## 1. How Claude Code loads skills (verified facts)

Source: official docs at code.claude.com/docs/en/skills and code.claude.com/docs/en/context-window

### Session startup
- Only skill **descriptions** load at startup (~100 tokens each, capped at 1,536 chars combined description+when_to_use)
- Full SKILL.md body loads **on demand** when Claude determines the skill is relevant
- Skills with `disable-model-invocation: true` are excluded from startup listing entirely

### Post-load lifecycle
- Once invoked, skill content enters conversation and **stays for the rest of the session**
- On auto-compaction: each invoked skill is re-attached up to **5,000 tokens**
- All re-attached skills share a **25,000-token combined budget**
- Budget fills from most-recently-invoked skill first; oldest skills can be dropped entirely

### Practical implication for large skills
A 2,366-line file (the current 3-draft total) would be ~5,500–6,000 tokens. That exceeds the 5,000-token post-compaction cap per skill, meaning anything past the 5k mark would be silently dropped after compaction. Skills survive compaction only if they stay under ~5,000 tokens (roughly 400–450 lines of dense markdown).

**Official guidance:** Keep SKILL.md under 500 lines. Move reference material to sibling files in `references/` and link from SKILL.md.

---

## 2. Supporting files pattern (verified)

Source: code.claude.com/docs/en/skills — "Add supporting files"

A skill directory can contain any files alongside SKILL.md:

```
my-skill/
├── SKILL.md              # required, under 500 lines
├── references/
│   ├── abi-fragments.md  # loaded on demand when Claude needs it
│   └── deposit-math.md
├── examples/
│   └── item-json.md
└── scripts/
    └── helper.sh
```

Reference these files from SKILL.md so Claude knows what they contain and when to load them. They do **not** load automatically — Claude reads them only when it decides they are needed. This is the primary mechanism for handling deep reference content without bloating the always-present skill body.

**How Anthropic's own skill-creator uses this:** The skill-creator SKILL.md is 485 lines. Its detailed JSON schemas (430 lines), grading instructions, and eval scripts live in `references/` and `agents/` subdirectories and are only loaded when relevant. This gives the skill a small always-present footprint with on-demand depth.

---

## 3. Plugin skills[] array (verified)

Source: code.claude.com/docs/en/plugins and the anthropics/skills marketplace.json

### Two layout conventions exist side-by-side

**Convention A: `plugin.json` root-level `skills[]` array (kleros-skills current approach)**

```json
{
  "name": "kleros-ipfs-upload",
  "skills": ["./kleros-ipfs-upload"]
}
```

Each entry points to a directory containing a SKILL.md. Skills load independently and on-demand. There is no cross-skill communication at the plugin level.

**Convention B: `plugin/skills/<name>/SKILL.md` directory layout (standard for new plugins)**

```
my-plugin/
├── .claude-plugin/plugin.json
└── skills/
    ├── skill-a/SKILL.md
    └── skill-b/SKILL.md
```

Skills in a plugin are **namespaced**: `/plugin-name:skill-name`. They load independently — each one's description appears in the startup listing, and the full body loads only when invoked.

### Anthropics/skills marketplace example
The official Anthropics skills repo uses a single marketplace.json with three plugin entries, each listing multiple skills:

```json
{
  "plugins": [
    {
      "name": "document-skills",
      "skills": ["./skills/xlsx", "./skills/docx", "./skills/pptx", "./skills/pdf"]
    },
    {
      "name": "example-skills",
      "skills": ["./skills/algorithmic-art", "./skills/skill-creator", /* 10 more */]
    }
  ]
}
```

Each skill in the array is independent. There is no "router" or "orchestrator" skill in the `skills[]` array — the description frontmatter is the only selection mechanism. Skills from the same plugin do not automatically know about each other.

### Key constraint: skills do NOT load each other
There is no `import`, `include`, or cross-skill reference mechanism. If skill A and skill B share common content, that content must either be:
1. duplicated in both SKILL.md files, or
2. factored into a supporting file within one skill's directory and linked from both descriptions (requires user to read both), or
3. put in a shared `references/` directory at the plugin root and referenced from each SKILL.md body explicitly

---

## 4. Router skill pattern: does it exist?

**Short answer: not as a formal pattern, but can be approximated.**

There is no built-in "dispatch" mechanism. The closest real-world pattern found is in Anthropic's `skill-creator` (485 lines, the closest to a "meta-skill"):

> "Your job when using this skill is to figure out where the user is in this process and then jump in and help them progress through these stages."

This is **contextual branching within a single SKILL.md** — the skill's body contains conditional prose ("if the user wants X, do Y; if Z, do W") that Claude interprets at runtime. It is not a technical dispatch mechanism; it is instructed behavior.

**What this means for kleros-curate:**
A single SKILL.md can begin with a disambiguation section:

```markdown
## Which Curate flavor are you using?
- **Light Curate (LGTCR)** — optimistic registry, time-bounded challenge, xDAI/ETH deposit
- **Stake Curate (PGTCR)** — permanent ERC20 stake + native arbitration deposit, Goldsky GraphQL
- **Scout registries** — 4 specific registries on Gnosis, specialized UI (uses LGTCR contracts)

Ask the user or infer from context (PGTCR clues: "PermanentGTCR", "Stake Curate", ERC20 stake, Goldsky API). Then proceed to the relevant section below.
```

This approach works because the entire SKILL.md is in context when the skill runs. The disambiguation prose tells Claude how to pick the right sub-section without any external routing.

---

## 5. Multi-skill vs single-skill: the real tradeoff

### Option A: Three separate skills (kleros-curate-light, kleros-curate-stake, kleros-scout)

Pros:
- Each SKILL.md stays well under 500 lines
- Each has a precise description → accurate triggering
- Independent post-compaction budgets (5,000 tokens each = 15,000 total)
- Users can install only the flavors they need

Cons:
- Shared content (MetaEvidence retrieval, deposit computation, item.json construction, IPFS upload) is duplicated across three files → maintenance burden
- Three separate trigger descriptions to maintain and optimize
- A user who isn't sure which flavor they need must either know the answer or ask; the agent cannot self-route
- Three plugin entries vs one → more `plugin.json` / `marketplace.json` surface

### Option B: Single skill with contextual routing (one SKILL.md)

Pros:
- One description to maintain and optimize
- Single skill = single post-compaction budget (5,000 tokens cap applies to the whole skill)
- Agent can ask user "which flavor?" if unclear
- Shared content appears once

Cons:
- 5,000-token post-compaction cap. The current 3 drafts total ~2,366 lines (~5,500–6,000 tokens). After distillation and sharing factored out, a single SKILL.md covering all three flavors would be ~800–1,000 lines (~2,000–2,500 tokens), fitting within the compaction budget — but only if reference material is aggressively offloaded to supporting files.
- If the user only ever uses Light Curate, they carry PGTCR and Scout content in context that is never relevant

### Option C: Single entry-point SKILL.md + flavor-specific reference files (recommended)

Structure:
```
kleros-curate/
├── SKILL.md                    # ~300 lines: disambiguation, shared invariants, quick playbooks
├── references/
│   ├── lgtcr-operations.md     # full LGTCR action playbooks (~250 lines)
│   ├── pgtcr-operations.md     # full PGTCR/Goldsky flows (~250 lines)
│   ├── scout-registries.md     # 4 Scout registries, seed templates (~300 lines)
│   ├── metaevidence.md         # MetaEvidence retrieval (shared, ~100 lines)
│   ├── deposit-math.md         # deposit computation (shared, ~80 lines)
│   ├── item-json.md            # item.json construction rules (shared, ~120 lines)
│   └── abi-fragments.md        # minimal ABIs for both contract types (~200 lines)
```

SKILL.md contains:
- Description (triggers + negative triggers covering all 3 flavors)
- The 5 hard non-negotiables (shared across all flavors)
- Flavor disambiguation section
- Shared invariants (never guess, onchain-first, policy-first)
- Quick reference table: which action → which reference file to read
- Pointers to each reference file

Reference files load on demand when Claude reaches that part of the task. The SKILL.md body stays ~300 lines (~750–900 tokens), leaving substantial headroom in the 5,000-token post-compaction budget.

This is directly analogous to how Anthropic's `skill-creator` is structured: small always-present body, deep reference material in supporting files.

---

## 6. kleros-ipfs-upload patterns that are reusable

The published skill at 283 lines is a good reference. Reusable patterns for kleros-curate:

**Trigger precision:** Description explicitly lists what it is for (evidence, meta-evidence, Curate item metadata, etc.) AND what it is NOT for (generic IPFS, non-Kleros ecosystems). The same positive/negative trigger structure should be used for kleros-curate.

**Positive trigger examples from kleros-ipfs-upload description:**
- Named protocol components (evidence, meta-evidence, Curate)
- Explicit gateway/skill name mention as override trigger
- Test/validation as override trigger

**Negative trigger:** "Do NOT trigger for generic requests with no Kleros context."

**Section ordering:** Overview → When to use → When NOT to use → Quickstart → Pre-flight → Request shape → Response shape → Errors → Examples → Bundled. This is the established convention for Kleros skills and should be followed for kleros-curate, with flavor-specific sections replaced by disambiguation + reference file pointers.

**Non-negotiables block near the top:** kleros-ipfs-upload doesn't need one, but the Curate drafts use it effectively. The block should appear before any action playbooks so it loads first and survives compaction.

**Concrete examples section:** The ipfs-upload skill has 3 worked examples. kleros-curate should have similar examples per flavor (minimum: submit item to LGTCR, challenge PGTCR item, Scout submission).

**What NOT to copy:** The ipfs-upload SKILL.md inlines everything (no supporting files). This works at 283 lines but would not work for the curate skill's volume. Do not replicate this pattern.

---

## 7. Skills[] array path convention: current mismatch

The current `plugin.json` uses `"skills": ["./kleros-ipfs-upload"]` (plugin-root-relative path pointing directly to a directory at repo root). This works because the plugin root IS the repo root (`source: "./"`).

Official convention per the plugins docs: skills live in `plugin-root/skills/<name>/SKILL.md`. For a new `kleros-curate` skill, both paths will work:
- `"./kleros-curate"` — matches current repo convention (skill directory at repo root)
- `"./skills/kleros-curate"` — matches the Anthropic canonical layout

The current repo convention (`./kleros-curate`) is fine to continue. Changing it would require moving kleros-ipfs-upload too, creating unnecessary churn.

---

## 8. Skills >500 lines: what the ecosystem actually does

Based on research across published plugins:

- **Anthropic's skill-creator:** 485 lines (just under the official guideline). Deep reference material in supporting files.
- **Anthropic's pdf skill:** 314 lines. Comprehensive but focused.
- **Kleros curate-light draft:** 708 lines — already over the guideline.
- **Scout draft:** 1,008 lines — 2× over the guideline.

No published skills >500 lines were found in the official anthropics/skills or anthropics/claude-plugins-official repositories. The HANDOVER_FROM_IPFS_GATEWAY_REPO.md already documents the 500-line guideline and references/subdirectory pattern for overflowing content.

The 5,000-token post-compaction budget is the hard mechanical constraint. A 708-line skill hits ~1,700–2,000 tokens for the body alone — safe. But 1,008 lines (~2,400–2,800 tokens) plus compaction overhead brings Scout close to the cap without any reference loading headroom.

---

## 9. Confidence assessment

| Claim | Confidence | Source |
|-------|-----------|--------|
| 5,000-token post-compaction cap per skill | HIGH | Official docs (skill content lifecycle section) |
| 25,000-token combined re-attachment budget | HIGH | Official docs |
| 500-line SKILL.md recommendation | HIGH | Official docs (explicit tip) + HANDOVER.md |
| Supporting files load on demand | HIGH | Official docs ("Add supporting files") |
| No cross-skill loading mechanism | HIGH | Official docs + ecosystem review |
| skills[] array entries are independent | HIGH | Official docs + Anthropics marketplace.json structure |
| 1,536-char description+when_to_use cap | HIGH | Official docs (frontmatter reference table) |
| Contextual routing via skill body prose | MEDIUM | Pattern from skill-creator; no explicit doc confirmation it works for Curate's complexity |
| Reference files survive compaction | LOW | Not explicitly documented. Likely must be re-read each session. Needs testing. |

---

## 10. Recommendations for the unified kleros-curate skill

**Architecture: Option C (single entry-point + flavor-specific reference files)**

1. **Single SKILL.md** with description covering all 3 flavors (LGTCR, PGTCR, Scout). Target: ~300 lines.
2. **Disambiguation at the top of the body** — Claude asks/infers flavor before any action.
3. **Shared invariants** (non-negotiables, onchain-first, never-guess) appear in SKILL.md body, not in reference files — they must always be in context.
4. **Reference files in `kleros-curate/references/`** for flavor-specific playbooks, ABIs, and shared utilities (MetaEvidence retrieval, deposit math, item.json construction).
5. **SKILL.md body as an index** — each section says "for X, read [references/Y.md](references/Y.md)" so Claude knows what to load and when.
6. **Description trigger** must cover all entry phrases: "Light Curate", "LGTCR", "Stake Curate", "PGTCR", "PermanentGTCR", "Scout", "addItem", "Curate list", "TCR", and negative: "do NOT trigger for dispute evidence uploads — use kleros-ipfs-upload instead."
7. **IPFS upload** references kleros-ipfs-upload rather than embedding its own upload section — the two skills cooperate rather than duplicate.

**What to defer:**
- Scout-specific seed templates can live in `references/scout-registries.md` (already ~300 lines of templates)
- Full ABI fragments belong in `references/abi-fragments.md`
- MetaEvidence retrieval algorithm (sections 2A–2C of the Light Curate draft) is shared and belongs in `references/metaevidence.md`
- Deposit math (section 6 of Light Curate draft) is shared → `references/deposit-math.md`
- item.json construction rules (section 3 of Light Curate draft) → `references/item-json.md`

**What stays in SKILL.md body:**
- Non-negotiables block (hard rules applicable to all flavors)
- Flavor disambiguation (which contract type are we using?)
- What to ask the user (minimum inputs)
- Registry discovery checks (eth_getCode, hallmark reads)
- Quick action table (which action → which reference + which contract function)
- Stop conditions
- Key public links

---

## Sources

- [Claude Code Skills documentation](https://code.claude.com/docs/en/skills) — MEDIUM confidence (may change; docs were current as of 2026-05-26)
- [Claude Code Plugins documentation](https://code.claude.com/docs/en/plugins) — HIGH confidence
- [Context Window explorer](https://code.claude.com/docs/en/context-window) — HIGH confidence (source for token budgets)
- [anthropics/skills marketplace.json](https://github.com/anthropics/skills/blob/main/.claude-plugin/marketplace.json) — HIGH confidence
- [Anthropic skill-creator SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) — HIGH confidence (485 lines, reference implementation)
- [Anthropic pdf SKILL.md](https://github.com/anthropics/skills/blob/main/skills/pdf/SKILL.md) — HIGH confidence (314 lines, practical reference)
- [kleros-skills HANDOVER_FROM_IPFS_GATEWAY_REPO.md](/Users/jaybuidl/project/kleros/kleros-skills/HANDOVER_FROM_IPFS_GATEWAY_REPO.md) — HIGH confidence (repo-internal convention docs)
