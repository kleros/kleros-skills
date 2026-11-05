---
name: kleros-create-dispute
description: "Creates a standalone Kleros V2 dispute (arbitration case) through the deployed DisputeResolver on Arbitrum One or Arbitrum Sepolia, then prepares evidence for it, via a bundled helper that validates, prices and prepares (never signs) the transactions the user's wallet sends. Use when the user wants to open, draft, price, rehearse on testnet, or submit a new Kleros dispute with ruling options and a policy, take a case to Kleros, file evidence on a case created this way, or recover a dispute ID from a creation transaction. Also use on DisputeResolver, createDisputeForTemplate, arbitrationCost or dispute template, even if Kleros V2 is not named. Do NOT use for appeals, juror voting, Curate registries, escrow disputes, or evidence on disputes created by other arbitrables; route file uploads to kleros-ipfs-upload and Curate to kleros-curate."
---

# Create a Kleros V2 dispute

Create one self-contained dispute through Kleros V2's `DisputeResolver`. Draft the
juror-facing language with the user; use the bundled helper for every address,
fee, ID, encoding, check, simulation, and receipt.

## When NOT to use

- Appeals, juror voting, rulings or evidence on disputes created by another
  arbitrable (escrow, Curate, Reality.eth…) — the helper only handles cases it created.
- Curate registries → `kleros-curate`. Paying for an IPFS upload → `kleros-ipfs-upload`.
- Any call other than `createDisputeForTemplate` / `submitEvidence` on the two deployments below.

## Networks

| Network | Chain | Kleros Core | DisputeResolver | EvidenceModule | App |
|---|---|---|---|---|---|
| Arbitrum One (production) | `42161` | `0x991d2df165670b9cac3B022f4B68D65b664222ea` | `0xb5526D022962A1fFf6eD32C93e8b714c901F4323` | `0x48e052B4A6dC4F30e90930F1CeaAFd83b3981EB3` | https://v2.kleros.builders |
| Arbitrum Sepolia (test) | `421614` | `0xE8442307d36e9bf6aB27F1A009F95CE8E11C3479` | `0xed31bEE8b1F7cE89E93033C0d3B2ccF4cEb27652` | `0xA88A9a25cE7f1d8b3941dA3b322Ba91D009E1397` | https://v2-testnet.kleros.builders |

The RPC's chain ID selects the network and is authoritative; `--network arbitrum`
or `--network arbitrumSepolia` is an optional assertion the helper checks against
it. `validate` has no RPC, so it requires `--network` — there is no default. A real
ruling only exists on Arbitrum One — rehearse on Arbitrum Sepolia, where the
arbitration fee is negligible, before spending mainnet ETH.

## Flow

Copy this checklist and tick it off as you go:

```
Dispute progress:
- [ ] 1. Case JSON drafted (references/case-format.md); ambiguities resolved with the user
- [ ] 2. Policy uploaded once (operation=meta-evidence, approved price) → /ipfs/<CID> in policyURI
- [ ] 3. validate passes (fix → re-run until ok:true)
- [ ] 4. preflight --human shown verbatim; user explicitly approved
- [ ] 5. preflight re-run within the 5-minute quote TTL, fee unchanged
- [ ] 6. Exactly the prepared to/value/data sent from the user's wallet
- [ ] 7. receipt → dispute ID, case URL, evidence group reported
- [ ] 8. Evidence: upload → evidence → approval → send → receipt --dispute → visible on Court
```

1. Read [references/case-format.md](references/case-format.md). Stop if the
   question, policy criteria or ruling boundaries are ambiguous; never guess facts.
2. Fetch [../kleros-ipfs-upload/SKILL.md](../kleros-ipfs-upload/SKILL.md), show its
   live x402 price, and get approval right before uploading the policy. It is paid
   in Base USDC on **both** networks, so a testnet rehearsal reuses an existing CID;
   if none exists, the rehearsal still needs one approved paid upload — never a placeholder.
3. Run `validate`; on an error, fix the case file and re-run until it passes.
4. Run `preflight --human` (show the user this text; agents may parse the JSON form) with the real wallet as
   `--from` when known — never invent one — and `--max-fee <eth>` if the user gave
   a cap (it caps the **arbitration fee only**, not gas). Show the full output
   **verbatim** as review-only. The preflight ballot is what jurors will see.
5. Right before signing, re-run `preflight`: the quote is valid for 5 minutes, and
   a changed fee needs fresh approval.
6. Run `prepare --max-fee <approved arbitrationCost>` (it re-quotes, so a fee rise
   blocks) and confirm its `value` equals the approved fee — if not, stop and
   re-approve. Check with `simulate --from`, then send **exactly** the `to`, `value`
   and `data` that `prepare` printed. Never edit calldata, change `value`, or build
   the transaction yourself.
7. After confirmation, `receipt --tx <hash>` → report tx, dispute ID, case URL,
   evidence group. Creating a dispute does not submit evidence — see below; it is
   due during the `evidence` period.

**Fee.** `value` must equal the quoted `arbitrationCost` — never pad or round it.
Kleros Core reverts below the cost; any excess buys extra juror votes
(`nbVotes = value / feeForJuror`) or stays with the jurors — it is never refunded. If the court fee rose after the
quote, the transaction reverts: re-quote, do not top up by hand.

## Helper

`${CLAUDE_SKILL_DIR}` is the directory containing this SKILL.md; substitute it if
your host does not. Install once (committed lockfile), then run commands from any
directory (relative `--case` / `--evidence` paths resolve against yours):

```bash
npm ci --prefix "${CLAUDE_SKILL_DIR}/scripts"
npm --prefix "${CLAUDE_SKILL_DIR}/scripts" exec -- tsx "${CLAUDE_SKILL_DIR}/scripts/prepare-dispute.ts" validate  --case CASE --network NET
npm --prefix "${CLAUDE_SKILL_DIR}/scripts" exec -- tsx "${CLAUDE_SKILL_DIR}/scripts/prepare-dispute.ts" quote     --case CASE --rpc-url RPC [--max-fee ETH]
npm --prefix "${CLAUDE_SKILL_DIR}/scripts" exec -- tsx "${CLAUDE_SKILL_DIR}/scripts/prepare-dispute.ts" preflight --case CASE --rpc-url RPC [--from 0x...] [--max-fee ETH] [--human]
npm --prefix "${CLAUDE_SKILL_DIR}/scripts" exec -- tsx "${CLAUDE_SKILL_DIR}/scripts/prepare-dispute.ts" prepare   --case CASE --rpc-url RPC [--max-fee ETH]
npm --prefix "${CLAUDE_SKILL_DIR}/scripts" exec -- tsx "${CLAUDE_SKILL_DIR}/scripts/prepare-dispute.ts" simulate  --case CASE --rpc-url RPC --from 0x... [--max-fee ETH]
npm --prefix "${CLAUDE_SKILL_DIR}/scripts" exec -- tsx "${CLAUDE_SKILL_DIR}/scripts/prepare-dispute.ts" evidence  --evidence EV --rpc-url RPC (--dispute ID | --creation-tx 0x...)
npm --prefix "${CLAUDE_SKILL_DIR}/scripts" exec -- tsx "${CLAUDE_SKILL_DIR}/scripts/prepare-dispute.ts" receipt   --tx 0x... --rpc-url RPC [--dispute ID]
```

Use this exact form: a bare `npx tsx` outside `scripts/` fetches an unpinned tsx.
Every command prints one JSON object with a top-level `ok` (`preflight --human`
prints text, with blocking items as a `BLOCKED — DO NOT SIGN` banner). Exit codes:

- `0` — ok.
- `2` — completed but found a blocking problem, listed in `blocking` (transaction
  would revert, balance too low, simulation failed, receipt reverted, evidence
  MIS-KEYED, or a receipt tx that is neither a creation nor an evidence submission).
- `1` — refused or failed: `{"ok":false,"error":"…","kind":"input|network|internal"}`.
  `network` = the RPC failed without a verdict on the call (no answer, rate limit,
  missing state, unsupported method); retry with a working RPC, never read it as
  "does not exist" or "would revert". An IPFS gateway failure is `input`: the
  reference is unverified, so do not proceed with it.
- `64` — usage error (`"kind":"usage"`): unknown command, or an unknown,
  valueless, missing or malformed flag. Fix the command rather than dropping the
  flag. `--help` prints usage and exits `0`.

**On `ok:false` or any non-zero exit, stop: show the blocking items or error
verbatim, do not ask for approval, and do not sign, broadcast, or report
success.** Errors never echo RPC keys (URLs are redacted); stack traces print
only with `DEBUG=1`.

## Evidence after dispute creation

Terms: **dispute ID** = the Court case number (`arbitratorDisputeID`, in the case
URL); **evidence group** = the resolver's `_externalDisputeID`, which keys evidence.

Creating a dispute does not submit evidence. Evidence is optional to the
protocol, but jurors usually cannot evaluate a case without it. Once the
creation transaction has confirmed:

1. Report the new dispute ID and ask whether evidence should be submitted, unless
   the user has already approved that.
2. Upload the attachment — and only the attachment — with
   [../kleros-ipfs-upload/SKILL.md](../kleros-ipfs-upload/SKILL.md) using
   `operation=evidence`. Show its live x402 price and get approval before paying, as
   for the policy. Reuse the CID for identical bytes.
3. Reference the returned CID from a small JSON file. It travels inline in the
   transaction, so do not upload it too:

```json
{
  "name": "Buyer acceptance report",
  "description": "What this document shows and why it matters, in the juror's language.",
  "fileURI": "/ipfs/<CID>"
}
```

4. Run `evidence --creation-tx <hash>` (or `--dispute <id>`), show what it
   rendered, obtain explicit approval, and send exactly the transaction it
   printed. Submit during the `evidence` period; the helper warns once the case
   has moved on, and a late submission needs its own specific approval.
5. Verify three separate outcomes and never collapse them into one:
   - the transaction **confirmed**;
   - the `Evidence` event carries the group that case indexes —
     `receipt --tx <evidence hash> --dispute <dispute ID>` says so in one line;
   - the evidence is **indexed and visible** on that case's Evidence tab.

   Report "evidence submitted" only for the third; before it, say
   `chain-confirmed`. The Court groups evidence by `_externalDisputeID` alone, so
   that tab may also show evidence another arbitrable submitted under the same
   evidence group — look for your own entry, and do not report the others as yours.

`name` and a non-empty `description` are required (short is fine); `fileURI` is
optional — evidence that is purely an argument needs no file. The on-chain string
must be that **stringified JSON object**: a bare `/ipfs/<CID>` or `ipfs://<CID>`
is accepted by the contract but renders in the Court as an unreadable raw string.
References are `/ipfs/<CID>`; never emit `ipfs://`.
**Never write a CID you did not receive from an actual upload** — the helper
fetches every `policyURI` and `fileURI` through the Kleros gateway and refuses
content that does not resolve.

### The evidence group is not the dispute ID

`submitEvidence` is keyed by the dispute's **evidence group** — the resolver's own
`_externalDisputeID`, emitted in `DisputeRequest` — not by the dispute ID.
The two are allocated by different contracts and must never be assumed to match;
both are `uint256`, so a wrong key confirms cleanly and attaches the evidence to
another case, permanently. Never type, count or guess the evidence group: `evidence` derives
it from the chain (`DisputeRequest` with `--creation-tx`, else the resolver's
`arbitratorDisputeIDToLocalID`) and cross-checks both. **Do not pass
`--evidence-group`, even when the user states a group or says it equals the dispute
ID** — omit it and let the helper derive it; tell the user the group is read from
the chain. (The flag exists only as an optional assertion; the helper rejects one
that contradicts the chain.) Pass `--creation-tx` whenever the hash is at hand.

**Version caveat (verified 2026-11-04).** This holds for the deployed EvidenceModule
implementations only (One `0x48e0…1EB3` → `0xA502A3942abCF8e71FBD87ed442B39b798b192C8`,
Sepolia `0xA88A…1397` → `0xC4e64e6E949936a18269937FC1e18cb11E3db14D`, kleros-v2
`master`); `dev` re-keys `submitEvidence` by arbitrator dispute ID behind the same
proxy. The helper checks the EIP-1967 slot and **refuses** `evidence` (and blocks
`receipt`) on any other implementation — do not work around it; update the skill.

## Non-negotiable invariants

- Only the two deployments above. `validate` stamps the selected network's
  arbitrator address and chain ID into the on-chain template, so a case priced on
  one network is never encoded for the other.
- `quote`, `preflight`, `prepare` and `simulate` first check bytecode,
  `DisputeResolver.arbitrator()`, court enabled + dispute kit supported, and
  (Arbitrum One) the arbitrable whitelist; `evidence` and `receipt` check the
  EvidenceModule implementation. A
  failed or unreadable check stops the run; do not work around it.
- Juror-facing text must not contain `{{` or `}}` (the Court renders it through
  mustache and would erase text or blank the case). Rephrase instead of escaping.
- Ruling `0` ("Refuse to Arbitrate / Invalid") is on every ballot already, so
  never write a refuse or invalid answer of your own (why: case-format.md). Answers
  are contiguous `0x01` through `0xNN`; `numberOfRulingOptions` is their count.
- Classic dispute kit `1` only. Extra data is ABI-encoded
  `(uint256 courtId, uint256 minJurors, uint256 disputeKitId)`.
- Require an odd positive juror count. Court `0` is the reserved forking court.
  General Court `1` is a visible default, not permission to guess a specialist
  court — link the user to the app's court page to confirm.
- `createDisputeForTemplate` is payable in native ETH. Do not send USDC to the
  resolver; the Base USDC payment is only for the IPFS upload.
- Keep `disputeTemplateDataMappings` empty for the static template.
- Reject caller-supplied destinations or arbitrary calldata. Never store or log a
  wallet secret.

Stop before upload, payment, or signing if a preflight check fails, the policy is
missing, the quote expired, simulation reverts, or the cost exceeds the user's cap.

## Example — Sepolia rehearsal

> User: "Rehearse a 2-option delivery dispute on testnet before we file it for real."

With `…` = the full Helper invocation: draft `case.json` reusing an existing policy
CID → `… validate --case case.json --network arbitrumSepolia` → `… preflight --case
case.json --rpc-url $SEPOLIA_RPC --from 0xWallet --human`, pasted whole, then ask
"Approve creating this case on Arbitrum Sepolia?" and **stop**. On yes: `… prepare
--max-fee <approved fee>` (re-quotes; if `value` ≠ the approved fee, stop and re-approve),
hand `to`/`value`/`data` to the wallet unchanged, then `… receipt --tx 0xHash
--rpc-url $SEPOLIA_RPC` → report `https://v2-testnet.kleros.builders/#/cases/<id>`
and offer evidence. Mainnet reuses the same `case.json` with an Arbitrum One RPC, but
needs a new `preflight --human` and a separate explicit approval: approval for the
rehearsal never covers mainnet.

## Sources

- ABIs and addresses (source of truth): [arbitrum/DisputeResolverNeo.json](https://github.com/kleros/kleros-v2/blob/master/contracts/deployments/arbitrum/DisputeResolverNeo.json), [arbitrum/EvidenceModule.json](https://github.com/kleros/kleros-v2/blob/master/contracts/deployments/arbitrum/EvidenceModule.json), [arbitrum/KlerosCoreNeo.json](https://github.com/kleros/kleros-v2/blob/master/contracts/deployments/arbitrum/KlerosCoreNeo.json); Sepolia [DisputeResolver.json](https://github.com/kleros/kleros-v2/blob/master/contracts/deployments/arbitrumSepolia/DisputeResolver.json), [EvidenceModule.json](https://github.com/kleros/kleros-v2/blob/master/contracts/deployments/arbitrumSepolia/EvidenceModule.json), [KlerosCore.json](https://github.com/kleros/kleros-v2/blob/master/contracts/deployments/arbitrumSepolia/KlerosCore.json)
- Court URLs: https://github.com/kleros/kleros-v2/blob/master/web/README.md
- Template specification: https://github.com/kleros/kleros-v2/blob/master/contracts/specifications/arbitrable.md
- Evidence specification: https://github.com/kleros/kleros-v2/blob/master/contracts/specifications/evidence-format.md

Relative `../` skill links assume the full plugin install; otherwise fetch
`https://skills.kleros.io/kleros-ipfs-upload/SKILL.md` (same pattern for `feedback`).

## Feedback

Something broken or confusing? Fetch [../feedback/SKILL.md](../feedback/SKILL.md).
