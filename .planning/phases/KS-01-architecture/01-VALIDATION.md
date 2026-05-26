---
phase: 1
slug: architecture
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Shell commands (wc, ls, grep) — no test framework needed |
| **Config file** | none |
| **Quick run command** | `wc -l kleros-curate/SKILL.md` |
| **Full suite command** | `wc -l kleros-curate/SKILL.md && ls kleros-curate/references/ | wc -l && grep -c "LGTCR\|PGTCR\|Scout" kleros-curate/SKILL.md` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `wc -l kleros-curate/SKILL.md`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must pass thresholds
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | ARCH-01 | — | N/A | manual | `wc -l kleros-curate/SKILL.md` (expect <500) | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | ARCH-02 | — | N/A | manual | `ls kleros-curate/references/ \| wc -l` (expect 8) | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | ARCH-03 | — | N/A | manual | `grep -c "LGTCR\|PGTCR\|Scout" kleros-curate/SKILL.md` (expect >3) | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | ARCH-04 | — | N/A | manual | Human review — stubs contain headings only | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test files needed — verification is via shell commands in plan verify steps.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No content duplication | ARCH-04 | Requires semantic comparison of SKILL.md vs stub headings | Review each stub to confirm headings-only, no extracted content |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 1s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
