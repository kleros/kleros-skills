---
phase: 3
slug: flavor-references
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for content quality during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | manual review + grep/wc assertions |
| **Config file** | none |
| **Quick run command** | `wc -l kleros-curate/references/light-curate.md kleros-curate/references/stake-curate.md kleros-curate/references/scout-registries.md` |
| **Full suite command** | `grep -c "shared-" kleros-curate/references/light-curate.md kleros-curate/references/stake-curate.md kleros-curate/references/scout-registries.md` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run quick line count check
- **After every plan wave:** Run full suite (pointer verification + content quality)
- **Before `/gsd:verify-work`:** Full content review must pass
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| TBD | TBD | TBD | FLAV-01 | content | `wc -l kleros-curate/references/light-curate.md` | ⬜ pending |
| TBD | TBD | TBD | FLAV-02 | content | `wc -l kleros-curate/references/stake-curate.md` | ⬜ pending |
| TBD | TBD | TBD | FLAV-03 | content | `wc -l kleros-curate/references/scout-registries.md` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify Phase 2 shared files are complete and match expected structure
- [ ] Verify Phase 1 stubs exist with section headings
