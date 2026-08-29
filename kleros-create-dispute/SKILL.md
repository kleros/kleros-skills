---
name: kleros-create-dispute
description: "Create a standalone Kleros V2 case through the deployed DisputeResolver on Arbitrum One or Arbitrum Sepolia, and submit evidence to it afterwards. Use when the user asks to draft, validate, price, prepare, simulate, or submit a new Kleros dispute/case with juror-facing ruling options and a policy, to rehearse one on testnet, to file evidence on a case created this way, or to read the dispute ID out of a confirmed transaction. Covers the self-contained dispute template, Classic extraData, live arbitrationCost, deployment preflight, IPFS reference verification, reviewable calldata, and receipt parsing. Do NOT use for Curate registry operations, appeals, escrow disputes, juror voting, or arbitrary calls; route file uploads to kleros-ipfs-upload."
---

# Create a Kleros V2 dispute

Create one self-contained dispute through Kleros V2's `DisputeResolver`. Draft the
juror-facing language with the user; use the bundled script for every address,
fee, ID, encoding, check, simulation, and receipt.

## Networks

| Network | Chain | Kleros Core | DisputeResolver | EvidenceModule | App |
|---|---|---|---|---|---|
| Arbitrum One (production) | `42161` | `0x991d2df165670b9cac3B022f4B68D65b664222ea` | `0xb5526D022962A1fFf6eD32C93e8b714c901F4323` | `0x48e052B4A6dC4F30e90930F1CeaAFd83b3981EB3` | https://v2.kleros.builders |
| Arbitrum Sepolia (test) | `421614` | `0xE8442307d36e9bf6aB27F1A009F95CE8E11C3479` | `0xed31bEE8b1F7cE89E93033C0d3B2ccF4cEb27652` | `0xA88A9a25cE7f1d8b3941dA3b322Ba91D009E1397` | https://kleros-v2-testnet.netlify.app |

The RPC's chain ID selects the network and is authoritative; `--network arbitrum`
or `--network arbitrumSepolia` is an optional assertion the script checks against
it. A real ruling only exists on Arbitrum One — rehearse on Arbitrum Sepolia,
where the arbitration fee is negligible, before spending mainnet ETH.

## Flow

1. Read [references/case-format.md](references/case-format.md) and collect the
   complete case. Stop if the question, policy criteria, or ruling boundaries are
   ambiguous; do not fill factual gaps by guessing.
2. Fetch [../kleros-ipfs-upload/SKILL.md](../kleros-ipfs-upload/SKILL.md), show
   its live x402 price, and obtain approval immediately before uploading the
   policy with `operation=meta-evidence`. Reuse the CID for identical bytes. That
   upload is paid in Base USDC on **both** networks, so for a testnet rehearsal
   reuse an existing CID instead of paying for a throwaway policy.
3. Put the returned `/ipfs/<CID>` in `policyURI` and run `validate`, `quote`,
   `preflight`, `prepare`, and `simulate` against the target RPC. Use
   `preflight --human` for a person and its default JSON for an agent. Pass the
   real wallet with `--from` when available so it can estimate gas, balance, and
   total; never invent an address. Add `--max-fee <eth>` when the user gave a cap.
4. Show the complete preflight before asking for approval: network, every check,
   title, description, juror question, every ruling ID/title/description,
   category, language, openable policy link, evidence timing, court, initial
   juror draw, dispute kit, arbitration fee, gas and balance, contracts, value,
   calldata, quote block, expiry, and warnings. Label it review-only. Obtain
   explicit approval immediately before signing.
5. Prefer the caller's wallet tool to send the exact prepared transaction. Re-run
   `preflight` immediately before the signature — the quote expires in 5 minutes.
6. After confirmation, run `receipt --tx <hash>` for the dispute ID, the case
   URL, and the case's evidence group. Report the transaction and the case link.
7. Creating a dispute does not submit evidence. That is a separate transaction
   with its own approval — see below. It is due during the `evidence` period, so
   do not leave it until the case has moved on to voting.

Install the helper once with `npm install` in `scripts/`, then run:

```bash
npx tsx prepare-dispute.ts validate  --case CASE [--network NET]
npx tsx prepare-dispute.ts quote     --case CASE --rpc-url RPC [--max-fee ETH]
npx tsx prepare-dispute.ts preflight --case CASE --rpc-url RPC [--from 0x...] [--human]
npx tsx prepare-dispute.ts prepare   --case CASE --rpc-url RPC
npx tsx prepare-dispute.ts simulate  --case CASE --rpc-url RPC --from 0x...
npx tsx prepare-dispute.ts evidence  --evidence EV --rpc-url RPC (--dispute ID | --creation-tx 0x...)
npx tsx prepare-dispute.ts receipt   --tx 0x... --rpc-url RPC [--dispute ID]
```

## Evidence after dispute creation

Creating a dispute does not submit evidence. Evidence is optional to the
protocol, but jurors usually cannot evaluate a case without it. Once the
creation transaction has confirmed:

1. Report the new case ID and ask whether evidence should be submitted, unless
   the user has already approved that.
2. Upload the attachment — and only the attachment — with
   [../kleros-ipfs-upload/SKILL.md](../kleros-ipfs-upload/SKILL.md) using
   `operation=evidence` (the policy uses `meta-evidence`). Reuse the CID for
   identical bytes.
3. Reference the returned CID from a small JSON document. **Only the attachment
   is uploaded** — this JSON travels inline in the transaction, so do not spend a
   second paid upload on it, and do not put a bare CID on chain in its place:

```json
{
  "name": "Buyer acceptance report",
  "description": "What this document shows and why it matters, in the juror's language.",
  "fileURI": "/ipfs/<CID>"
}
```

4. Run `evidence`, show what it rendered, and obtain explicit approval before
   signing. Submit during the `evidence` period; the helper warns once the case
   has moved on, and a late submission needs its own specific approval.
5. Verify three separate outcomes and never collapse them into one:
   - the transaction **confirmed**;
   - the `Evidence` event carries the group that case indexes —
     `receipt --tx <evidence hash> --dispute <case id>` says so in one line;
   - the evidence is **indexed and visible** on that case's Evidence tab.

   Report "evidence submitted" only for the third. Everything before it is
   `chain-confirmed`, which is not the same claim.

`name` and `description` are required and `fileURI` is optional — evidence that is
purely an argument needs no file. Three rules decide whether jurors can actually
read it:

- The on-chain string must be that **stringified JSON object**. A bare
  `/ipfs/<CID>` or `ipfs://<CID>` is accepted by the contract but renders in the
  Court as an unreadable raw string with no title and no description.
- References are `/ipfs/<CID>`. Never emit the `ipfs://` scheme.
- **Never write a CID you did not receive from an actual upload.** The helper
  fetches every `policyURI` and `fileURI` through the Kleros gateway and refuses
  to prepare a transaction for content that does not resolve — a plausible-looking
  CID is the single easiest way to ruin a case.

### The evidence key is not the case number

`submitEvidence` is keyed by the dispute's **evidence group** — the arbitrable's
own `_externalDisputeID`, emitted next to the arbitrator's dispute ID in
`DisputeRequest` — not by the case number the Court shows. Those identifiers are
allocated by different contracts and must never be assumed to match. Both are
`uint256`, so a wrong key encodes, simulates, and confirms cleanly, then attaches
the evidence to a different case or to no case at all, permanently and without a
withdrawal mechanism.

So never type the key, never infer it from a counter, and never assume it equals
the ID `receipt` reported. `evidence` derives it from the chain — from the
`DisputeRequest` event when given `--creation-tx`, otherwise from the resolver's
`arbitratorDisputeIDToLocalID` mapping — cross-checks the two whenever both are
available, and rejects an `--evidence-group` that contradicts them. Pass
`--creation-tx` whenever the creation hash is at hand.

## Non-negotiable invariants

- Only the two deployments above. `validate` stamps the selected network's
  arbitrator address and chain ID into the on-chain template, so a case priced on
  one network is never encoded for the other.
- Every RPC command first verifies bytecode, `DisputeResolver.arbitrator()`, that
  the court exists and is enabled, that it supports the dispute kit, and — where
  Kleros Core enforces one — that the resolver is on the arbitrable whitelist.
  A failed check stops the run; do not work around it.
- Ruling `0` is reserved by the protocol *and* rendered by the Court as the first
  choice on every ballot ("Refuse to Arbitrate / Invalid"). It is not part of the
  template, so never write a refuse or invalid answer of your own — it would show
  up twice and split that vote. Answers are contiguous `0x01` through `0xNN`, and
  `numberOfRulingOptions` equals the answer count, excluding ruling `0`.
- The preflight ballot is what jurors will see: ruling `0` first, then the
  template answers under their ruling IDs. Review it as the ballot, not as a list
  of the answers that were written.
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
- Every IPFS reference must resolve through `https://cdn.kleros.link` before it
  goes on chain, for the policy and for every evidence file alike.
- Evidence is keyed by the evidence group the chain reports for that case, never
  by the Court case number, a counter, or a number supplied by the caller.

Stop before upload, payment, or signing if a preflight check fails, the policy is
missing, the quote expired, simulation reverts, or the cost exceeds the user's cap.

## Sources

- Deployments: https://github.com/kleros/kleros-v2/tree/dev/contracts/deployments
- Resolver contract: https://github.com/kleros/kleros-v2/blob/dev/contracts/src/arbitration/arbitrables/DisputeResolver.sol
- Template specification: https://github.com/kleros/kleros-v2/blob/dev/contracts/specifications/arbitrable.md
- Evidence specification: https://github.com/kleros/kleros-v2/blob/dev/contracts/specifications/evidence-format.md
- Frontend compatibility flow: https://github.com/kleros/kleros-v2/tree/dev/web/src/pages/Resolver

## Feedback

Something broken or confusing? Fetch [../feedback/SKILL.md](../feedback/SKILL.md).
