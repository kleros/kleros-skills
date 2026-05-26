# Research Summary: Unified Curate Skill

## Platform Constraints (HIGH confidence)

| Constraint | Value | Source |
|-----------|-------|--------|
| SKILL.md max recommended lines | 500 | Official Anthropic docs |
| Post-compaction token cap per skill | 5,000 | Official docs |
| Combined re-attached skills budget | 25,000 tokens | Official docs |
| Description+when_to_use cap | 1,536 chars | Official docs |
| Supporting file loading | On-demand via Read | Official docs |

## Architecture Decision: Single Skill + References

**Recommended structure:**

```
kleros-curate/
├── SKILL.md                         # ~300 lines: routing, shared rules, action index
└── references/
    ├── light-curate.md              # LGTCR operations + factory
    ├── stake-curate.md              # PGTCR + Goldsky GraphQL + admin
    ├── scout-registries.md          # 4 Scout registries + seed templates
    ├── shared-metaevidence.md       # MetaEvidence retrieval (shared)
    ├── shared-deposits.md           # Deposit computation (shared)
    ├── shared-item-json.md          # item.json construction rules (shared)
    └── shared-abi-fragments.md      # Minimal ABIs for both contract types
```

**Why single skill, not three separate skills:**
- Skills load independently — no shared context between skills
- Users often don't know which flavor they need
- Scout IS Light Curate at the contract layer — separate skills would confuse
- One description covering all triggers is better than three partial descriptions

**Why references/, not one monolithic file:**
- 2,366 total lines across 3 drafts — 5x over the 500-line limit
- Reference files load on demand — zero initial context cost
- Each flavor's content stays independently readable

## Content Analysis

| Content | Lines | Appears in | Action |
|---------|-------|-----------|--------|
| IPFS upload | ~44 each | All 3 | Extract to shared |
| item.json construction | 29-128 | All 3 | Canonical 80-line shared version |
| MetaEvidence retrieval | 60-90 | LGTCR + Scout | Extract to shared |
| Action playbooks | 100-217 | LGTCR + Scout | Merge, deduplicate |
| Non-negotiables | ~20 each | All 3 | Merge in SKILL.md |
| Goldsky GraphQL | ~164 | PGTCR only | Keep in stake-curate.md |
| Seed templates | ~173 | Scout only | Keep in scout-registries.md |
| ERC20 mechanics | ~60 | PGTCR only | Keep in stake-curate.md |
| 4 registry addresses | ~20 | Scout only | Keep in scout-registries.md |

**~750 lines of overlap** can be deduplicated into shared reference files.

## Critical Design Notes

1. **Scout seed-first pattern stays Scout-scoped** — Scout uses embedded seeds as primary JSON source (MetaEvidence as cross-check). LGTCR/PGTCR derive from MetaEvidence dynamically. This inversion is intentional.

2. **Description must trigger on all three flavors** — include: "Curate", "Light Curate", "LGTCR", "PGTCR", "Stake Curate", "PermanentGTCR", "Scout", "registry", "token list", "address tags", "CDN"

3. **Reference file survivability after compaction is an open question** — files read during a skill session may not be re-attached after compaction. Each reference file should have a table of contents at the top for efficient partial reads.

4. **Imperative form required** — official guidance: "Never guess", "Read MetaEvidence first", not "you should" / "you need to"

## Open Questions

- Do reference files survive compaction? Needs empirical testing.
- Optimal description length for three-flavor coverage — needs eval testing.
