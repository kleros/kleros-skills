# Claude Code Skill Design: Context Limits & Loading Behavior

**Researched:** 2026-05-26
**Confidence:** HIGH (official docs at code.claude.com/docs/en/skills, verified against multiple secondary sources)

---

## 1. How Claude Code loads skill files

**Plugin structure** (`kleros-skills` layout):

```
<plugin-root>/
  skills/
    <skill-name>/
      SKILL.md          ← entrypoint, required
      reference.md      ← optional supporting files
      scripts/          ← optional scripts
```

**Three-level loading sequence:**

1. **Session start** — Claude sees only the `name` + `description` (+ optional `when_to_use`) for every available skill. Full SKILL.md body is NOT loaded.
2. **Skill triggered** — When Claude decides to invoke a skill (or user types `/skill-name`), the full SKILL.md content is rendered and injected into the conversation as a single message.
3. **Supporting files** — Other files in the skill directory are NOT automatically loaded. They load only if the SKILL.md instructions tell Claude to read them, or if Claude decides to read them on demand.

**Lifecycle after loading:**

Once invoked, skill content stays in context for the rest of the session. Claude Code does NOT re-read the skill file on subsequent turns. On context compaction (auto-compact), invoked skills are re-attached from the file, keeping the **first 5,000 tokens** per skill. Re-attached skills share a **combined 25,000-token budget**; least-recently-invoked skills are dropped first if the budget overflows.

**Subagent preloading is different:** If a subagent lists a skill in its `skills` field, the full SKILL.md is injected at subagent startup, not lazily.

Source: [code.claude.com/docs/en/skills — Skill content lifecycle](https://code.claude.com/docs/en/skills)

---

## 2. What happens when a skill exceeds context limits

There is **no hard rejection** for oversized SKILL.md files at load time. The constraints are softer:

- **After compaction:** only the first 5,000 tokens of each skill survive re-attachment. Content beyond that is silently dropped. This is the practical hard limit for content that must remain effective across a long session.
- **Description budget:** All skill descriptions (name + description + when_to_use) compete for a shared budget of **1% of the model's context window** (configurable via `skillListingBudgetFraction` setting or `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var). If the budget overflows, descriptions are shortened or dropped for least-used skills. Each skill's combined description+when_to_use text is **capped at 1,536 characters** regardless of budget (configurable via `maxSkillDescriptionChars`).
- **No truncation or summarization on initial load** — the full SKILL.md enters context as-is when triggered. An extremely large file simply consumes more tokens from the session budget.

**Practical implication for a 2,000+ line unified Curate skill:**
The file would load fully on first invoke, but anything past ~5,000 tokens would be lost after the first compaction. A 2,000-line skill is approximately 5,000-8,000 tokens depending on density — borderline to risky territory for cross-compaction durability.

Source: [code.claude.com/docs/en/skills — Skill content lifecycle](https://code.claude.com/docs/en/skills)

---

## 3. Can a skill reference other files?

**Yes, explicitly supported.** Files in the skill directory are not auto-loaded, but can be referenced from SKILL.md in two ways:

**A. Instruction-based loading (markdown links or prose):**

```markdown
## Additional resources

- For full contract ABI, see [reference.md](reference.md)
- For example submissions, see [examples.md](examples.md)
```

Claude reads referenced files using the Read tool when it determines they're needed. This is demand-loading, not preloading.

**B. Dynamic context injection (shell commands, run at load time):**

```
!`cat ${CLAUDE_SKILL_DIR}/references/addresses.json`
```

The `!` syntax runs the command before Claude sees the skill content; output is inlined. Use for small, always-needed data (contract addresses, chain IDs). The `${CLAUDE_SKILL_DIR}` variable gives the absolute path to the skill directory, making it portable across install levels.

**Supporting file structure (official recommended layout):**

```
curate-v1/
├── SKILL.md                  ← overview, navigation, core workflow (target: ≤500 lines)
├── light-curate.md           ← detailed Light Curate reference (demand-loaded)
├── stake-curate.md           ← detailed Stake Curate reference (demand-loaded)
└── examples/
    └── submission-payloads.md
```

The SKILL.md acts as an index/navigator; heavy content lives in supporting files.

Source: [code.claude.com/docs/en/skills — Add supporting files](https://code.claude.com/docs/en/skills)

---

## 4. Recommended maximum SKILL.md size

**Official docs state explicitly (verbatim tip):**

> Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files.

**Secondary guidance from official docs:**

> Keep the body itself concise. Once a skill loads, its content stays in context across turns, so every line is a recurring token cost.

**Token-budget perspective:**

- Compaction re-attachment budget: 5,000 tokens per skill (hard ceiling for surviving compaction)
- ~500 lines of dense markdown ≈ 3,000-5,000 tokens (depending on code blocks, tables)
- Supporting reference files: no stated per-file limit, loaded on demand so they don't burn the recurring-cost budget

**Conclusion for the 2,366-line draft (3 skills merged):**

The current 3 skills total 2,366 lines. As a single SKILL.md this would be ~5x the official 500-line guideline and almost certainly exceed the 5,000-token compaction window. The correct architecture is:

- One `curate-v1/SKILL.md` ≤ 500 lines: covers triggering, high-level workflow, light-curate vs stake-curate decision tree, pointers to supporting files
- `curate-v1/light-curate.md`: full Light Curate content (currently 708 lines)
- `curate-v1/stake-curate.md`: full Stake Curate content (currently 650 lines)
- `curate-v1/scout.md` or merge into one of the above: Scout content (currently 1,008 lines)

---

## 5. How `description` and `name` affect skill triggering

**Triggering mechanism (from reverse-engineering the skill tool prompt):**

Claude reads the combined `name + description + when_to_use` text for each available skill during its forward pass. There is no regex, keyword index, or ML classifier — it is pure transformer language-model matching. Claude decides whether to invoke a skill based on whether the description semantically matches the current conversation context.

**`description` field:**

- The primary signal for auto-invocation
- Combined with `when_to_use`, capped at **1,536 characters** in the skill listing (configurable)
- If omitted, Claude Code uses the first paragraph of markdown content instead
- Write for Claude, not for humans: concrete trigger phrases beat abstract marketing copy
- Should include both positive triggers ("use when...") and negative exclusions ("do NOT use when...") — the existing `kleros-ipfs-upload` description is a good model

**`when_to_use` field (separate from `description`):**

- Appended to `description` in the skill listing
- Counts toward the same 1,536-character cap
- Useful for supplementary trigger examples without bloating the primary description

**`name` field:**

- Sets the display label in skill listings (`/skills` menu, autocomplete)
- For plugin skills in a `skills/` subdirectory, the command name comes from the **directory name**, not the `name` frontmatter field
- Exception: plugin-root `SKILL.md` (single skill at plugin root) uses frontmatter `name` as the command name

**`disable-model-invocation: true`:**

- Removes the skill from Claude's context entirely (description not shown to Claude)
- Skill only loadable by explicit `/skill-name` user invocation
- Use for workflow skills with side effects (deploy, send, submit)

**Context loading table (from official docs):**

| Frontmatter | You can invoke | Claude can invoke | When loaded |
|---|---|---|---|
| (default) | Yes | Yes | Description always in context; body loads when invoked |
| `disable-model-invocation: true` | Yes | No | Description NOT in context; body loads on user invocation |
| `user-invocable: false` | No | Yes | Description always in context; body loads when invoked |

Source: [code.claude.com/docs/en/skills — Control who invokes a skill](https://code.claude.com/docs/en/skills)

---

## Summary for unified Curate skill design

| Constraint | Value | Source |
|---|---|---|
| SKILL.md recommended max | 500 lines | Official docs (explicit tip) |
| Compaction re-attachment budget | First 5,000 tokens per skill | Official docs |
| Combined re-attachment budget (all skills) | 25,000 tokens | Official docs |
| Description + when_to_use cap | 1,536 chars (default) | Official docs |
| Description budget (all skills) | 1% of context window | Official docs |
| Supporting files auto-loaded? | No — demand-loaded via Read tool | Official docs |
| Shell injection (`!`) runs at? | Load time, before Claude sees content | Official docs |

**Architecture recommendation for unified Curate skill:**

Split, do not merge into one SKILL.md. The current 2,366 total lines must become:
- `curate-v1/SKILL.md` ≤ 500 lines — trigger description, decision tree (Light vs Stake vs Scout), minimal quick-reference, explicit pointers to supporting files
- `curate-v1/light-curate.md` — full Light Curate workflow (~700 lines)
- `curate-v1/stake-curate.md` — full Stake Curate workflow (~650 lines)  
- `curate-v1/scout.md` — Scout registry workflow (~1,008 lines, consider trimming)

The `description` field must remain under 1,536 chars and clearly differentiate Curate from the IPFS upload skill (different domains, no conflict risk).

---

## Sources

- [Extend Claude with skills — Official Claude Code docs](https://code.claude.com/docs/en/skills) — HIGH confidence, primary source
- [Plugins reference — Official Claude Code docs](https://code.claude.com/docs/en/plugins-reference) — HIGH confidence, primary source
- [Claude Agent Skills: A First Principles Deep Dive — leehanchung.github.io](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) — MEDIUM confidence, secondary analysis consistent with official docs
- [Claude Code Skills Architecture — mindstudio.ai](https://www.mindstudio.ai/blog/claude-code-skills-architecture-skill-md-reference-files) — MEDIUM confidence, consistent with official docs
