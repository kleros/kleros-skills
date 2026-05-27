---
phase: 03
reviewers: [codex]
reviewed_at: 2026-05-27T02:47:00Z
plans_reviewed: [03-01-PLAN.md, 03-02-PLAN.md, 03-03-PLAN.md]
---

# Cross-AI Plan Review — Phase 03

## Codex Review

### Overall Summary

The three plans are well aligned with Phase 3: each writes one flavor file, depends only on completed shared references, and keeps Scout as an overlay rather than a fourth contract flavor. The main risk is not planning structure but content fidelity: grep/wc checks can prove presence of strings, but they cannot prove that ABI signatures, deposit math, request/round selection, Goldsky semantics, or Scout templates were preserved correctly from the drafts.

### Plan 03-01: `light-curate.md`

**Summary:** Strong plan for LGTCR. It covers the right operational surface and correctly emphasizes shared-file pointers plus flavor-specific transaction sequencing. Risk is medium because LGTCR appeal and challenge flows are easy to make subtly wrong.

**Strengths:**
- Clear 10-section structure matching common agent workflows.
- Correctly treats `fundAppeal` as flavor-specific because it needs `getItemInfo → getRequestInfo → getRoundInfo`.
- Includes factory deployment and two MetaEvidence files.
- Good use of section-level pointers to avoid duplicating shared MetaEvidence, item JSON, ABI, and deposit content.
- Schema confirmation via `NewItem` sampling is the right guardrail.

**Concerns:**
- **HIGH:** `fundAppeal` must use `requestArbitrator` and `requestArbitratorExtraData` from `getRequestInfo`, not necessarily current registry-level arbitrator data.
- **MEDIUM:** Challenge deposit selection needs an explicit registration-vs-removal request check before choosing `submissionChallengeBaseDeposit()` vs `removalChallengeBaseDeposit()`.
- **MEDIUM:** Factory section should not hardcode an unverified factory address unless the source has authoritative addresses. The draft says ask for or verify the factory address.
- **MEDIUM:** Plan does not explicitly preserve `executeRequest` / `withdrawFeesAndRewards`; these are part of post-dispute operation even if not central to FLAV-01.
- **LOW:** Grep checks for "NewItem" alone will not catch whether the sample must be after the latest MetaEvidence update.

**Suggestions:**
- Add acceptance checks for `requestID = numberOfRequests - 1`, `roundID = numberOfRounds - 1`, `requestArbitratorExtraData`, `remaining = max(totalRequired - paid, 0)`, and party enum `0/1/2`.
- Add explicit stop conditions: no dispute, loser half-time elapsed, side `0`, no post-MetaEvidence `NewItem` sample, failed simulation.
- Keep factory address handling as "ask or verify on explorer" unless a vetted address list exists.
- Add a short "Execute / Withdraw" subsection or fold it clearly into post-resolution operations.

**Risk Assessment:** MEDIUM

### Plan 03-02: `stake-curate.md`

**Summary:** This is the highest-value and highest-risk plan. It captures the unique PGTCR mechanics: ERC20 stake plus native arbitration cost, Goldsky queries, derived status, withdrawal flow, and admin actions. The danger is producing a long document that appears complete but has stale GraphQL assumptions or wrong onchain fallback logic.

**Strengths:**
- Correctly separates PGTCR from LGTCR: `challengeItem`, ERC20 `approve`, `submissionMinDeposit`, permanent stake, and `uint120 _challengeID`.
- Inline Goldsky queries and derived-status pseudocode match the locked decisions.
- TOC is appropriate because this file will exceed 300 lines.
- Includes admin actions and onchain fallbacks, which are important for stale indexer cases.
- Calls out `arbitrationParamsChanges(index)` instead of assuming `arbitratorExtraData()` exists.

**Concerns:**
- **HIGH:** Acceptance checks for endpoint strings and query names will not verify GraphQL schema correctness, entity ID format, ordering, or fallback behavior.
- **HIGH:** Appeal funding must preserve how to find the active `arbitratorExtraData`: Goldsky challenge arbitration setting or `arbitrationParamsChanges(index)`.
- **MEDIUM:** Withdrawal flow must distinguish `startWithdrawItem` from `withdrawItem` and enforce `withdrawingTimestamp + withdrawingPeriod`.
- **MEDIUM:** Public Goldsky endpoints exist, while private endpoints require tokens. The plan should avoid saying a token is mandatory if public queries are intended to work.
- **MEDIUM:** Admin actions are easy to overstate. They should be framed as governor-only and simulation-required.
- **LOW:** "280+ lines" is fine, but this file can become a mini-monolith. Keep shared concepts as pointers.

**Suggestions:**
- Add acceptance checks for exact signatures: `addItem(string _item, uint256 _deposit)`, `challengeItem`, `startWithdrawItem`, `withdrawItem`, and `withdrawFeesAndRewards(... uint120 _challengeID ...)`.
- Check for `ERC20.approve(registryAddress, depositStake)` and `msg.value = arbitrationCost` in submission.
- Check for `challengeStake = item.stake * challengeStakeMultiplier / MULTIPLIER_DIVISOR`.
- Add checks for `getRoundAmountPaid`, `arbitrationParamsChanges`, and `<itemID>@<registryAddress>`.
- Use negative checks carefully: the text may say "not `challengeRequest`", so absence checks need to avoid rejecting useful warnings.

**Risk Assessment:** MEDIUM-HIGH

### Plan 03-03: `scout-registries.md`

**Summary:** Good overlay plan. It correctly keeps Scout as Gnosis LGTCR context plus registry-specific templates, addresses, helper reads, optional API, and image guidance. The main risk is compression: all four inline JSON templates plus operational guardrails may not fit cleanly under the target line ceiling.

**Strengths:**
- Correctly requires loading `references/light-curate.md`.
- Includes all four fixed Gnosis registries and seed templates inline.
- Keeps `scout-api` optional rather than canonical.
- Good decision to avoid live incentive amounts and redirect to `blog.kleros.io`.
- Submission checklist is a useful agent-facing safety gate.
- Image guidance is scoped to Scout-specific cases.

**Concerns:**
- **HIGH:** `180-299` lines may be too tight with ~170 lines of JSON templates, 14 checklist items, helper details, API notes, image guidance, and no duplication.
- **MEDIUM:** The plan says helper "5 function list", but the source/shared ABI contains more useful `LightGeneralizedTCRView` functions. This could accidentally drop `fetchArbitrable`, `getItemData`, `getItemRequests`, or `availableRewards`.
- **MEDIUM:** Seed templates may use source-specific type strings like `long text` / `rich address`; these should be preserved verbatim if they match current MetaEvidence, not normalized to shared naming.
- **MEDIUM:** Acceptance should assert Gnosis `chainId 100`, not just addresses.
- **LOW:** Incentive checks should be section-scoped so ordinary numbers in JSON templates do not falsely fail.

**Suggestions:**
- Relax the upper line limit or make completeness trump `wc`.
- Require exact helper address `0xB32e38B08FcC7b7610490f764b0F9bFd754dCE53` and align function-list checks with `shared-abi-fragments.md`.
- Add acceptance checks that `scout-api` is "optional/supporting" and "not canonical".
- Add checks for "also load `references/light-curate.md`", `Gnosis`, and `chainId 100`.
- Keep image upload mechanics as a pointer to shared IPFS guidance, with only Scout-specific requirements inline.

**Risk Assessment:** MEDIUM

---

## Consensus Summary

*(Single reviewer — consensus analysis requires 2+ reviewers)*

### Key Concerns (by severity)

**HIGH:**
1. Line ceiling for scout-registries.md (180-299) may be too tight with ~170 lines of JSON templates plus other content
2. Grep/wc acceptance checks prove string presence but cannot verify semantic correctness of ABI signatures, deposit math, or GraphQL schema
3. fundAppeal must use `requestArbitrator`/`requestArbitratorExtraData` from getRequestInfo, not registry-level data
4. Appeal funding for PGTCR must preserve the `arbitrationParamsChanges(index)` path for active extraData

**MEDIUM:**
5. Challenge deposit selection needs explicit registration-vs-removal check
6. Factory address handling should be "ask or verify" not hardcode
7. Execute/Withdraw subsection should be preserved in light-curate.md
8. Withdrawal flow must enforce `withdrawingTimestamp + withdrawingPeriod`
9. Public vs private Goldsky endpoints distinction needed
10. Seed template type strings must be preserved verbatim

**LOW:**
11. Incentive grep checks could false-positive on JSON template numbers
12. NewItem grep alone doesn't verify post-MetaEvidence timing

### Cross-Cutting Suggestions

- Add shared heading-order check for LGTCR and PGTCR to enforce D-03
- Add "no placeholders remain" checks (already in plans)
- Add negative duplication checks for shared section headings
- Treat grep/wc as smoke tests — add manual source-preservation checklist
