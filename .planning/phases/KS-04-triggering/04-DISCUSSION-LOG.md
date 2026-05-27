# Phase 4: Triggering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 4-Triggering
**Areas discussed:** Trigger surface breadth, Pushiness calibration, Boundary & exceptions

---

## Trigger surface breadth

### Q1: Which trigger categories to add?

| Option | Description | Selected |
|--------|-------------|----------|
| All four categories | Workflow verbs + ecosystem jargon + tool-specific terms + situational phrases | ✓ |
| Verbs + ecosystem only | Skip tool-specific and situational | |
| Verbs only | Keep it lean | |

**User's choice:** All four categories (revised to exclude arbitrator-layer and cross-product terms)
**Notes:** User clarified critical boundary: MetaEvidence, arbitrationCost, evidence submission are arbitrator-specific (not Curate-specific). submission deposit, challenge deposit overlap with PoH and future products. These must be excluded from triggers. Revised "tool-specific terms" to "Curate-specific terms" (addItem, removeItem, challengeItem, challengeRequest, itemID, registry policy).

### Q2: Solidity function names vs generic verbs?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep function names | addItem + challengeRequest + removeItem + challengeItem | |
| Generic verbs only | Replace function names with submit, challenge, remove | |
| Both | Keep addItem, drop rest, add generic verbs | |

**User's choice:** Both (after clarification)
**Notes:** User had mixed feelings — developers naturally use Solidity function names, non-developers use natural language verbs. Both audiences will prompt. Claude analyzed char cost (~160 chars total for both) against remaining budget (828 chars) and recommended including both. User agreed.

---

## Pushiness calibration

### Q1: How pushy?

| Option | Description | Selected |
|--------|-------------|----------|
| Match ipfs-upload style | Two-pass, ~1,000-1,200 chars | |
| More aggressive | Three-pass, ~1,300-1,500 chars | ✓ |
| Lighter touch | Single pass, ~800-900 chars | |

**User's choice:** More aggressive (three-pass)

### Q2: Implicit trigger scenarios?

| Option | Description | Selected |
|--------|-------------|----------|
| Contract + Kleros context | Trigger on contract address in Kleros context | |
| Registry operations + Kleros | Trigger on registry operations + Kleros signals | ✓ |
| Both scenarios | Both contract address and registry operations | |

**User's choice:** Registry operations + Kleros context

---

## Boundary & exceptions

### Q1: Additional exclusions?

| Option | Description | Selected |
|--------|-------------|----------|
| IPFS + non-Kleros registries | Add non-Kleros registry exclusion | |
| IPFS only (current) | Keep single IPFS exclusion | ✓ |
| IPFS + non-Kleros + v2 | Add both non-Kleros and v2 exclusions | |

**User's choice:** IPFS only

### Q2: Override exception?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, match ipfs-upload pattern | Add "trigger regardless" clause for explicit invocation | ✓ |
| No override needed | Name field already handles explicit requests | |

**User's choice:** Yes, match ipfs-upload pattern

### Q3: Vocabulary overlap with future Kleros skills?

| Option | Description | Selected |
|--------|-------------|----------|
| Scope statement only | Let domain framing + D-02/D-06 handle boundaries | ✓ |
| Generic non-registry exclusion | Add principle-based exclusion (~120 chars) | |
| Explicit product boundary | Name PoH, Courts, disputes (~130 chars) | |

**User's choice:** Scope statement only
**Notes:** User asked for deeper analysis. Claude traced 4 failure-mode test cases against the decided trigger architecture (D-02 excluded cross-product terms, D-06 scoped implicit triggers to registry operations). All test cases showed the positive trigger architecture already prevents false-triggering on adjacent Kleros products. Additional negative exclusions would be redundant.

---

## Claude's Discretion

- Exact wording and sentence structure within the three-pass framework
- Ordering of terms within each trigger pass
- Whether situational phrases are quoted examples or woven into prose

## Deferred Ideas

None — discussion stayed within phase scope.
