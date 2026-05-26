# Progressive Disclosure Research: Curate Skill Architecture

**Researched:** 2026-05-26
**Question:** How to structure a single Claude Code skill covering 3 product flavors (~2,366 lines) so agents load only what they need.

---

## 1. How Claude Code Skills Load Content

Three-level progressive loading (authoritative — from Anthropic docs):

| Level | Triggered by | Token cost | Content |
|-------|-------------|------------|---------|
| **L1: Metadata** | Always, at startup | ~100 tokens | `name` + `description` from YAML frontmatter |
| **L2: SKILL.md body** | When description matches user intent | <5k tokens ideal, <500 lines recommended | Core instructions, routing pointers |
| **L3: Bundled files** | When SKILL.md references them and Claude reads them | Effectively unlimited, zero cost until accessed | `references/`, `scripts/`, `examples/` subdirectories |

Key constraint: **SKILL.md body should stay under 500 lines / 1,500–2,000 words.** The 2,366-line total across all three draft files cannot fit in a single SKILL.md. The multi-file pattern is the intended solution.

Claude accesses bundled files via bash `Read` tool calls — same as it accesses any file in the repo. The files are physically present in the skill directory; Claude navigates them like a filesystem.

---

## 2. Multi-File Skill Pattern (Officially Supported)

The official skill directory structure is:

```
skill-name/
├── SKILL.md              # Main file: routing hub, core concepts, pointers
├── references/           # Prose documentation loaded as needed
│   ├── light-curate.md   # LightGeneralizedTCR details
│   ├── stake-curate.md   # PermanentGTCR details
│   └── scout.md          # Scout registry details
├── examples/             # Working code samples
└── scripts/              # Executable utilities
```

Reference files are loaded **only when SKILL.md references them and Claude decides to read them.** This is native progressive disclosure — zero context cost for files not touched.

**One-level-deep rule (critical):** Anthropic explicitly warns against nested references (SKILL.md → advanced.md → details.md). Claude may `head -100` deeply nested files rather than reading them fully. Keep all reference files referenced directly from SKILL.md.

---

## 3. Routing Patterns

### 3a. Description-based routing (L1 → L2)

Skill selection uses **pure LLM reasoning** over the description field. No embeddings, no classifiers, no pattern matching. Claude reads a formatted list of all installed skills' descriptions and decides which to trigger.

For a multi-flavor skill, the description must cover all three trigger contexts:

```yaml
description: >
  Operate Kleros Curate registries: Light Curate (LightGeneralizedTCR),
  Stake Curate (PermanentGTCR), and Scout (specialized contract/token tagging
  registries). Use when the user mentions Curate, TCR, registry submission,
  item challenge, evidence, appeal, LGTCR, PGTCR, Scout, or wants to submit
  to / challenge / query a Kleros verification list.
```

Description is capped at **1,024 characters**. Write triggers for all three flavors.

### 3b. In-body routing (L2 → L3)

Once SKILL.md loads, it becomes a dispatch table. The recommended pattern from Anthropic's docs (BigQuery example, Pattern 2: Domain-specific organization):

```markdown
## Which variant are you using?

**Light Curate (LGTCR)** — optimistic, time-bounded challenge, stake returned after period
→ See [references/light-curate.md](references/light-curate.md)

**Stake Curate (PGTCR)** — permanent ERC20 stake, anytime slash
→ See [references/stake-curate.md](references/stake-curate.md)

**Scout** — specialized frontend over LGTCR, contract/token tagging registries on Gnosis
→ See [references/scout.md](references/scout.md)
```

Claude reads SKILL.md, identifies the flavor from user intent or asks one clarifying question, then reads exactly one reference file. The other two stay on the filesystem.

### 3c. Explicit navigation hints

Supplement routing with bash `grep` commands so Claude can search within reference files without reading them fully — useful for large reference files:

```markdown
## Quick search

```bash
grep -n "deposit" references/light-curate.md
grep -n "stake" references/stake-curate.md
grep -n "registry address" references/scout.md
```

---

## 4. Is There a "Skill Includes" / "Skill Fragments" Concept?

**No native include mechanism exists.** There is no `include:` or `fragments:` directive in the SKILL.md format. The closest mechanisms are:

1. **Reference file links** — Markdown links like `[details](references/light-curate.md)` that Claude follows via Read tool. This is the standard pattern.
2. **Script execution** — `scripts/` directory; Claude runs them and gets only the output. Script code never enters context.
3. **Multiple skills in a plugin** — `plugin.json` `skills[]` array lists multiple skill directories. Each is a fully independent skill with its own description. Routing happens at L1 (description matching) not within a skill.

For shared content (e.g., contract constants, common terms), the only option is to duplicate in each reference file or use a single `references/shared.md` that all three flavor files point to from SKILL.md.

---

## 5. Multiple Skills vs. Single Routed Skill

Two valid architectures for the Curate problem:

### Option A: Three separate skills in plugin.json

```json
"skills": [
  "./curate-light",
  "./curate-stake",
  "./curate-scout"
]
```

Each skill has its own description. L1 routing handles dispatch automatically — Claude selects the matching skill based on user intent.

**Pros:**
- Description-matching is precise per flavor
- No routing logic in SKILL.md
- Each skill loads independently, no cross-contamination
- Easier to update one flavor without touching others

**Cons:**
- Scout reimplements LGTCR concepts (significant duplication — Scout IS LGTCR under the hood)
- Three frontmatter descriptions to maintain
- Agent may load wrong skill if user doesn't know which variant they're using
- Common concepts (MetaEvidence, deposit computation, challenge mechanics) duplicated across files

### Option B: Single skill with in-body routing

One entry in `plugin.json`, one description, SKILL.md dispatches to `references/` files.

**Pros:**
- Shared foundation in SKILL.md body (MetaEvidence derivation, deposit rules, challenge mechanics)
- Single description that covers "I want to use a Kleros registry" without knowing the variant
- Scout-as-LGTCR is explicitly connected rather than fragmented
- Easier for users who don't know Light vs Stake vs Scout

**Cons:**
- SKILL.md must be lean and routing-focused; all detail pushed to references/
- Description must cover all three contexts within 1,024 chars
- Ambiguous requests need one clarifying question before loading the right reference

### Recommendation

**Option B (single routed skill) is the better fit** for the Curate case because:
1. Scout IS Light Curate at the contract layer — the split is a UI/registry concern, not a contract concern. A user doing Scout operations on Gnosis is running LGTCR calls.
2. The shared foundation (MetaEvidence, deposit computation, registry discovery, challenge mechanics) is ~30% of the total content and is identical across Light Curate and Scout.
3. Users often don't know which variant they're using — they know they're "doing Curate" and need the skill to help them identify the right path.

Option A is better when flavors are truly independent protocols. Curate/Scout is not that case.

---

## 6. Shared Foundation + Flavor-Specific Extensions Pattern

Recommended architecture (Pattern 2 from Anthropic docs, adapted):

```
curate-v1/
├── SKILL.md                    # ~200-300 lines: shared concepts + routing table
├── references/
│   ├── light-curate.md         # LGTCR operations (submit, challenge, evidence, appeal)
│   ├── stake-curate.md         # PGTCR operations (stake, slash, withdraw)
│   └── scout.md                # Scout-specific registries + Gnosis-specific data
└── scripts/                    # Optional: validation utilities
```

**SKILL.md content (shared foundation):**
- Non-negotiables (never guess, policy-first, onchain-first) — identical for all flavors
- Flavor routing table (which is Light vs Stake vs Scout — key differences in one paragraph)
- MetaEvidence derivation steps — shared across all flavors
- Registry discovery — shared across all flavors
- Deposit computation rules — shared (mechanism differs, principle identical)
- Links to each reference file with one-sentence description of when to read it

**references/light-curate.md content:**
- LightGeneralizedTCR ABI references
- Challenge window mechanics
- Chain support (Mainnet, Sepolia, Gnosis)
- Light Curate-specific workflows

**references/scout.md content:**
- Hardcoded Scout registry addresses on Gnosis
- Scout-specific schemas (contract tags, token tags, domain mappings)
- Incentive program guidance
- Note: "underlying contract is LightGeneralizedTCR — see references/light-curate.md for contract operations"

**references/stake-curate.md content:**
- PermanentGTCR ABI, Goldsky subgraph endpoints
- Permanent stake mechanics, ERC20 flow
- Anytime-slash challenge rules

---

## 7. Table of Contents Pattern for Long Reference Files

For any reference file exceeding ~100 lines, Anthropic recommends a ToC at the top:

```markdown
# Light Curate (LightGeneralizedTCR)

## Contents
- Non-negotiables
- Minimum inputs
- Registry discovery
- Reading MetaEvidence and policy
- Deposit computation
- Submit item
- Challenge / remove item
- Evidence submission
- Appeal funding
- Execute request
- Withdraw rewards
- Deploy new list (factory)
- ABI snippets

## Non-negotiables
...
```

This ensures Claude can `head -N` the file to see all available sections and decide which to read.

---

## 8. Plugin.json: Does the skills[] Array Support Routing?

No. The `skills[]` array is just a list of directories. Each entry is an independent skill:
- `"./curate-light"` → loads `curate-light/SKILL.md`
- `"./curate-v1"` → loads `curate-v1/SKILL.md`

There is no routing configuration, no priority ordering, and no "parent skill" concept in `plugin.json`. Routing between skills happens entirely through Claude's LLM reasoning over descriptions.

The `name` in `plugin.json` is the plugin name, not the skill name. Skill names come from individual `SKILL.md` frontmatter.

---

## 9. Pitfalls

### 9a. Description character limit is tight

1,024 chars covers about 150–200 words. For three flavors with distinct terminology, craft the description carefully. Test that all three trigger contexts fit. Example triggers that must all be covered: "Light Curate", "LGTCR", "LightGeneralizedTCR", "Stake Curate", "PGTCR", "PermanentGTCR", "Scout", "registry submission", "item challenge", "Curate list".

### 9b. 500-line SKILL.md limit

The shared foundation for all three Curate flavors is substantial. The non-negotiables section alone in the existing draft is ~25 lines and is duplicated. SKILL.md must be ruthlessly condensed to routing + essential shared rules only. Target: 150–250 lines.

### 9c. Nested reference anti-pattern

If scout.md references light-curate.md for LGTCR operations, Claude may not follow the chain reliably. Instead, SKILL.md should say: "For Scout operations using LGTCR contracts, read both references/scout.md and references/light-curate.md." Surface all references from SKILL.md, not from other reference files.

### 9d. Skill activation gap

Vercel's published evals found skill descriptions failed to activate 56% of the time when vague. Strong, specific trigger phrases in the description are critical. The description must include both product names and user-action verbs ("submit item", "challenge", "evidence").

### 9e. Second-person writing in existing drafts

Both `curate-light-skill.md` and `pgtcr-stake-curate-skill.md` use second-person ("you should", "you need"). Official guidance says use imperative/infinitive form ("Never guess", "Read MetaEvidence first"). Rewrite during restructuring.

---

## 10. Sources

- [Skill authoring best practices — Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — HIGH confidence, official docs
- [Agent Skills overview — Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — HIGH confidence, official docs
- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills) — HIGH confidence, official docs
- [Skill development SKILL.md — anthropics/claude-code on GitHub](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/skill-development/SKILL.md?plain=1) — HIGH confidence, official reference
- [Claude Agent Skills: A First Principles Deep Dive — Lee Han Chung](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) — MEDIUM confidence, independent analysis
- [Stop Bloating Your CLAUDE.md — alexop.dev](https://alexop.dev/posts/stop-bloating-your-claude-md-progressive-disclosure-ai-coding-tools/) — MEDIUM confidence, practitioner experience
- [Path-Scoped Claude Code Skills — claudefa.st](https://claudefa.st/blog/guide/mechanics/path-scoped-skills) — MEDIUM confidence, community documentation
- [kleros-skills-prd-v4.md — internal planning doc](.planning/research/kleros-skills-prd-v4.md) — MEDIUM confidence, prior art from same project
