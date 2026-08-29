# Standalone dispute case format v1

```json
{
  "schemaVersion": "1.0",
  "title": "Delivery milestone dispute",
  "description": "Neutral facts, relevant dates, and what is contested.",
  "question": "Did the supplier satisfy every acceptance criterion by 2026-08-01?",
  "answers": [
    {
      "id": "0x01",
      "title": "Yes — criteria met",
      "description": "Select when every criterion in the policy is supported by the evidence."
    },
    {
      "id": "0x02",
      "title": "No — criteria not met",
      "description": "Select when at least one required criterion is not supported by the evidence."
    }
  ],
  "policyURI": "/ipfs/<CID>",
  "category": "Other",
  "lang": "en_US",
  "version": "1.0",
  "courtId": "1",
  "numberOfJurors": 3,
  "disputeKitId": 1
}
```

The case file is network-independent: the target deployment comes from the RPC
chain ID (asserted by `--network`), and the helper stamps that network's
arbitrator address and chain ID into the on-chain template while dropping the
operational fields (`schemaVersion`, court, juror count, dispute kit). The same
file is therefore rehearsed on Arbitrum Sepolia and then created on Arbitrum One
without edits.

`policyURI` must be a `/ipfs/<CID>` reference that the Kleros gateway can actually
serve. The helper fetches it before quoting and refuses a placeholder, a mangled
CID, or content nobody pinned — so obtain the CID from a real upload rather than
writing one that merely looks right.

Write a neutral description, one question answerable by exactly one option, and
option descriptions that state the applicable policy condition. Put deadlines,
burden of proof, admissibility, and edge-case rules in the policy.

Do not write a “refuse”, “invalid”, or “cannot be evaluated” answer at all. Ruling
`0` is not just reserved in the ABI — the Court renders it as the first choice on
every ballot, titled “Refuse to Arbitrate / Invalid”, and it is not part of your
template. An answer of the same kind therefore appears on the ballot twice, under
two different descriptions, splitting the refuse vote in a system that pays jurors
for coherence. `validate` rejects one. Jurors can always refuse; you never have to
offer it.

This version deliberately excludes dynamic template mappings, batch creation,
post-creation evidence submission, and specialist dispute-kit data.

After the policy CID is present, `preflight` produces the mandatory review
artifact. Use `--human` for a readable report and omit it for JSON. It reports the
target network, every deployment check, all case fields and ruling options, the
protocol policy URI and canonical `https://cdn.kleros.link/ipfs/<CID>` link, the
court page, initial juror draw, hidden-vote setting, live arbitration fee,
optional gas/balance/total estimate, quote freshness, and the exact prepared
transaction. It explicitly says that the command performs no upload or submission
and that evidence is submitted after dispute creation.
