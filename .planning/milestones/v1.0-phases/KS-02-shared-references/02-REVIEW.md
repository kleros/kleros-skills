---
phase: KS-02-shared-references
reviewed: 2026-05-27T00:00:00Z
depth: quick
files_reviewed: 6
files_reviewed_list:
  - kleros-curate/references/shared-abi-fragments.md
  - kleros-curate/references/shared-metaevidence.md
  - kleros-curate/references/shared-deposits.md
  - kleros-curate/references/shared-item-json.md
  - kleros-curate/references/shared-ipfs-upload.md
  - kleros-curate/SKILL.md
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase KS-02: Code Review Report

**Reviewed:** 2026-05-27
**Depth:** quick (extended with targeted cross-file and factual verification)
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six markdown skill-reference files reviewed: 5 shared reference files (`shared-abi-fragments.md`, `shared-metaevidence.md`, `shared-deposits.md`, `shared-item-json.md`, `shared-ipfs-upload.md`) and the top-level `SKILL.md`. All files are fully written (not stubs). Internal structure and cross-file pointers are generally sound. One factual error in `shared-deposits.md` will cause agent failures on PGTCR flows. Three warnings covering ABI completeness and scope leakage. One info item.

The MetaEvidence topic0 hash in `shared-abi-fragments.md` was independently verified via `cast keccak` and is correct (`0x61606860...`). Cross-file pointers between shared files use consistent bare-filename references; `SKILL.md` correctly uses `references/` prefix. All 3 Phase 3 flavor files (`light-curate.md`, `stake-curate.md`, `scout-registries.md`) exist on disk and all references to them are valid.

---

## Critical Issues

### CR-01: Shared arbitration-cost read procedure calls `arbitratorExtraData()` — function does not exist on PGTCR

**File:** `kleros-curate/references/shared-deposits.md:22-26`

**Issue:** The "Arbitration cost read" section is presented as a shared procedure for all Curate flavors. Step 2 instructs:

```
2. `registry.arbitratorExtraData()` → `extraDataBytes`
```

`arbitratorExtraData()` is an LGTCR-only function (listed under `LightGeneralizedTCR` in `shared-abi-fragments.md:22`). The PGTCR contract (`PermanentGTCR`) does **not** expose a top-level `arbitratorExtraData()` getter. On PGTCR, arbitration parameters are stored in an append-only array accessed via:

```solidity
function arbitrationParamsChanges(uint256 _index) external view returns (uint48 timestamp, bytes arbitratorExtraData)
```

An agent following this shared procedure for a PGTCR registry will call a non-existent function. On an EVM the call reverts; via RPC it returns an error. The agent then has no `extraData` to pass to `arbitrationCost()` and either stops or (worse) passes empty bytes, producing a wrong cost that causes the transaction to revert.

**Fix:** Split the arbitration cost section into LGTCR and PGTCR subsections, or add an explicit PGTCR carve-out immediately after step 2:

```markdown
## Arbitration cost read

### LGTCR
1. `registry.arbitrator()` → `arbitratorAddress`
2. `registry.arbitratorExtraData()` → `extraDataBytes`
3. `arbitrator.arbitrationCost(extraDataBytes)` → `costInWei`

### PGTCR
1. `registry.arbitrator()` → `arbitratorAddress`
2. Determine the current arbitration params index (typically the latest entry):
   - Read `arbitrationParamsChanges(index)` incrementing until the call reverts, or
   - Read `challenges(itemID, latestChallengeID).arbitrationParamsIndex` for item-specific context.
3. `arbitrationParamsChanges(currentIndex).arbitratorExtraData` → `extraDataBytes`
4. `arbitrator.arbitrationCost(extraDataBytes)` → `costInWei`
```

---

## Warnings

### WR-01: PGTCR section in `shared-abi-fragments.md` has no Events subsection

**File:** `kleros-curate/references/shared-abi-fragments.md:81-127`

**Issue:** The `LightGeneralizedTCR` section (lines 11–79) documents 9 events with topic0 hashes. The `PermanentGTCR` section (lines 81–127) documents read and write functions but has **zero event declarations**. PGTCR emits events for item lifecycle (submission, challenges, disputes). An agent building an event-driven PGTCR workflow (e.g., monitoring for item status changes, challenge events) has no ABI guidance and may substitute LGTCR event signatures — which will produce wrong topic0 filters and miss all PGTCR-specific events.

**Fix:** Add a `### Events` subsection to the `PermanentGTCR` section covering at minimum:
- The item submission event (equivalent of `NewItem` / `RequestSubmitted`)
- The challenge / dispute event
- Any PGTCR-specific events (e.g., item withdrawal events)

If PGTCR event names differ from LGTCR, add a disambiguation comment analogous to the `challengeItem` vs `challengeRequest` comment on line 115.

---

### WR-02: `shared-abi-fragments.md:160` — `arbitratorExtraData()` read guidance applies only to LGTCR, not stated

**File:** `kleros-curate/references/shared-abi-fragments.md:160`

**Issue:** The IArbitrator section ends with:

> Read `arbitrator()` from the registry contract to get the arbitrator address, then read `arbitratorExtraData()` to pass as `_extraData` to `arbitrationCost`.

This guidance is under the generic `IArbitrator` section, implying it applies universally. It does not — `arbitratorExtraData()` is LGTCR-only (same root cause as CR-01 but in a different file). An agent reading only `shared-abi-fragments.md` (skipping `shared-deposits.md`) encounters the same trap.

**Fix:** Qualify the sentence to scope it to LGTCR:

```markdown
For LGTCR: read `arbitrator()` then `arbitratorExtraData()` from the registry contract.
For PGTCR: read `arbitrator()` then fetch `extraData` from `arbitrationParamsChanges(currentIndex)`.
See `shared-deposits.md` for the full arbitration cost read procedure.
```

---

### WR-03: `shared-deposits.md` PGTCR challenge formula does not specify how to get current `item.stake`

**File:** `kleros-curate/references/shared-deposits.md:78-80`

**Issue:** The PGTCR challenge deposit formula is:

```text
challengeStake = item.stake × challengeStakeMultiplier / MULTIPLIER_DIVISOR
ERC20.approve(registryAddress, challengeStake)
```

`item.stake` is read from `items(itemID).stake` (last field of the 7-field tuple in `shared-abi-fragments.md:100`). The formula names the field but does not tell the agent which contract call produces it. An agent unfamiliar with the PGTCR `items()` return shape may not find `stake` without cross-referencing the ABI. The LGTCR section has an explicit table showing which function to call for each deposit component; the PGTCR challenge section lacks equivalent guidance.

**Fix:** Add a read step before the formula:

```markdown
Step 1 — read current item stake:
`item = registry.items(itemID)` → `item.stake` (7th return field)
challengeStake = item.stake × challengeStakeMultiplier / MULTIPLIER_DIVISOR
```

---

## Info

### IN-01: `shared-metaevidence.md` LGTCR stream-ID mapping omits the primary derivation mechanism

**File:** `kleros-curate/references/shared-metaevidence.md:70-74`

**Issue:** The file states the MetaEvidence ID mapping as a declarative rule (0 = registration, 1 = clearing) without explaining that this ordering is enforced by the LightGTCRFactory deploy call, which emits `MetaEvidence(0, _registrationMetaEvidence)` then `MetaEvidence(1, _clearingMetaEvidence)` at construction. For registries where the ID mapping is "ambiguous" (per the resolution hierarchy at lines 80–86), an agent that understands the factory-enforced ordering would resolve ambiguity faster and with higher confidence.

This is an info item only: the declarative rule is correct and the resolution hierarchy is an adequate fallback. The cross-reference to `shared-abi-fragments.md` for the factory deploy signature would let a diligent agent reconstruct the derivation.

**Fix (optional):** Add one sentence after line 74:

```markdown
This mapping is factory-enforced: `LightGTCRFactory.deploy()` emits MetaEvidence ID 0 for
`_registrationMetaEvidence` and ID 1 for `_clearingMetaEvidence` at construction time.
```

---

_Reviewed: 2026-05-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick (extended)_
