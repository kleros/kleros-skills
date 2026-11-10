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

Never put `{{` or `}}` in any case text (title, description, question, category,
answers). The Court renders the template with mustache, so double braces are
erased or break the whole case permanently; `validate` rejects them.

Write a neutral description, one question answerable by exactly one option, and
option descriptions that state the applicable policy condition. Put deadlines,
burden of proof, admissibility, and edge-case rules in the policy.

Do not write a “refuse”, “invalid”, or “cannot be evaluated” answer at all —
ruling `0` already is one. The Court prepends it to every ballot as “Refuse to
Arbitrate / Invalid” (kleros-sdk `findAndUpdateRTA`), so jurors can always refuse
and you never have to offer it. A refuse-type answer under a non-zero id would put
that option on the ballot twice, splitting the refuse vote in a system that pays
jurors for coherence, and the duplicate cannot be removed once the case exists. (An
answer with id `0x00` would instead *replace* ruling 0's description while keeping
its title; this skill does not use that either — ids must run `0x01`…`0xNN`.)

`validate` rejects any answer whose title, after Unicode/case folding, contains
“refuse to arbitrate”, “refuse to rule” or “unable to rule”, or is exactly
“refuse”, “invalid” or “refuse / invalid” (plus any id other than `0x01`…`0xNN`).
Other refuse-type wording (“cannot be evaluated”, “abstain”, “neither is proven”)
passes `validate` — keeping it out is your job when drafting.

This version deliberately excludes dynamic template mappings, batch creation, and
specialist dispute-kit data. Evidence is submitted after creation, as SKILL.md describes.

After the policy CID is present, `preflight` produces the mandatory review
artifact. Use `--human` for a readable report and omit it for JSON. It reports the
target network, every deployment check, all case fields and ruling options, the
protocol policy URI and canonical `https://cdn.kleros.link/ipfs/<CID>` link, the
court page, initial juror draw, hidden-vote setting, live arbitration fee,
optional gas/balance/total estimate, quote freshness, and the exact prepared
transaction. It explicitly says that the command performs no upload or submission
and that evidence is submitted after dispute creation.
