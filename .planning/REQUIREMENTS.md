# Requirements: Kleros Skills — Unified Curate Skill

**Defined:** 2026-05-26
**Core Value:** AI agents can safely and correctly interact with any Kleros Curate registry

## v1.0 Requirements

Requirements for the unified Curate skill. Each maps to roadmap phases.

### Architecture

- [ ] **ARCH-01**: Single `kleros-curate/SKILL.md` entry point under 500 lines / 5k words
- [ ] **ARCH-02**: `references/` subdirectory following the official domain-organization pattern (one file per flavor + shared files)
- [ ] **ARCH-03**: Routing decision tree in SKILL.md that disambiguates LGTCR vs PGTCR vs Scout from user intent
- [ ] **ARCH-04**: No content duplication between SKILL.md and reference files — each piece of information lives in one place

### Content Factoring

- [ ] **FACT-01**: Shared MetaEvidence retrieval reference (RPC log + GraphQL paths, with flavor-specific notes)
- [ ] **FACT-02**: Shared deposit computation reference (native-only for LGTCR, ERC20+native for PGTCR)
- [ ] **FACT-03**: Shared item.json construction reference (canonical rules, output protocol, checklist)
- [ ] **FACT-04**: Shared IPFS upload reference (Pinata, The Graph, submission rules)
- [ ] **FACT-05**: Shared ABI fragments reference (Arbitrator + both contract types)
- [ ] **FACT-06**: Flavor-specific nuances preserved during extraction (Scout seed-first, PGTCR withdrawal, LGTCR two-stream MetaEvidence)

### Flavor Content

- [ ] **FLAV-01**: Light Curate reference covering LGTCR operations, factory deploy, schema confirmation check, fundAppeal math
- [ ] **FLAV-02**: Stake Curate reference covering PGTCR operations, Goldsky GraphQL, ERC20 mechanics, status model, admin actions
- [ ] **FLAV-03**: Scout reference covering 4 registries, seed templates, LightGeneralizedTCRView helper, scout-api, image guidance

### Writing Quality

- [ ] **WRIT-01**: All instructions in imperative/infinitive form — "To accomplish X, do Y" not "You should"
- [ ] **WRIT-02**: Explain the WHY behind constraints instead of naked ALL-CAPS MUST/NEVER rules
- [ ] **WRIT-03**: Large reference files (>300 lines) include table of contents at the top
- [ ] **WRIT-04**: Large reference files (>10k words) include grep search patterns in SKILL.md

### Triggering & Description

- [ ] **TRIG-01**: YAML description triggers on all three flavors within 1,536-char cap, written in third-person, "pushy" style
- [ ] **TRIG-02**: Positive triggers include: Curate, Light Curate, LGTCR, PGTCR, Stake Curate, PermanentGTCR, Scout, registry, token list, address tags, CDN
- [ ] **TRIG-03**: Negative triggers exclude: generic IPFS uploads (kleros-ipfs-upload handles those), non-Kleros registries

### Publishing

- [ ] **PUB-01**: `kleros-curate` directory added to `plugin.json` skills array
- [ ] **PUB-02**: Plugin entry added to `marketplace.json` catalog
- [ ] **PUB-03**: `plugin.json` version bumped, CHANGELOG.md updated
- [ ] **PUB-04**: Git tag `kleros-curate@v1.0.0`

## Future Requirements

### Eval Testing

- **EVAL-01**: Description optimization via skill-creator `run_loop.py` (20 trigger/non-trigger eval queries)
- **EVAL-02**: Full skill eval loop with test prompts (with-skill vs without-skill comparison)
- **EVAL-03**: Compaction survivability testing (verify reference files work across long sessions)

### Curate v2

- **V2-01**: Support for Curate v2 contracts when deployed
- **V2-02**: MCP integration when production Kleros v2 MCP server exists

## Out of Scope

| Feature | Reason |
|---------|--------|
| Curate v2 contracts | Not yet deployed |
| MCP server integration | No production Kleros v2 MCP exists |
| Subgraph-only skills | Onchain-first is the design principle |
| Three separate skills | Research showed single skill with routing is superior |
| Automated eval pipeline in v1.0 | Valuable but can follow after manual testing |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | TBD | Pending |
| ARCH-02 | TBD | Pending |
| ARCH-03 | TBD | Pending |
| ARCH-04 | TBD | Pending |
| FACT-01 | TBD | Pending |
| FACT-02 | TBD | Pending |
| FACT-03 | TBD | Pending |
| FACT-04 | TBD | Pending |
| FACT-05 | TBD | Pending |
| FACT-06 | TBD | Pending |
| FLAV-01 | TBD | Pending |
| FLAV-02 | TBD | Pending |
| FLAV-03 | TBD | Pending |
| WRIT-01 | TBD | Pending |
| WRIT-02 | TBD | Pending |
| WRIT-03 | TBD | Pending |
| WRIT-04 | TBD | Pending |
| TRIG-01 | TBD | Pending |
| TRIG-02 | TBD | Pending |
| TRIG-03 | TBD | Pending |
| PUB-01 | TBD | Pending |
| PUB-02 | TBD | Pending |
| PUB-03 | TBD | Pending |
| PUB-04 | TBD | Pending |

**Coverage:**
- v1.0 requirements: 24 total
- Mapped to phases: 0
- Unmapped: 24

---
*Requirements defined: 2026-05-26*
*Last updated: 2026-05-26 after initial definition*
