# Shared: MetaEvidence Retrieval and Authoring
<!-- Sources: curate-v1/curate-light-skill.md §1-§2, curate-v1/pgtcr-stake-curate-skill.md §5A-5B -->

MetaEvidence is the onchain source of truth for every Curate workflow:
- **Policy document**: `fileURI` points to the human-readable registry rules.
- **Item schema**: `metadata.columns[]` defines field labels, types, identifiers, and item.json construction.

Do not ask users for schema fields until you have extracted `metadata.columns` from the current MetaEvidence.
Do not rely on screenshots, old docs, UI labels, policy prose, or memory. Fetch from live registry state every session.

---

## RPC log retrieval (`eth_getLogs`)

Fetch MetaEvidence events from the registry contract itself.

Filter:

```json
{
  "address": "<registryAddress>",
  "topics": [
    "0x61606860eb6c87306811e2695215385101daab53bd6ab4e9f9049aead9363c7d"
  ],
  "fromBlock": "<registry-deployment-block-or-earliest>",
  "toBlock": "latest"
}
```

Topic0:

```text
0x61606860eb6c87306811e2695215385101daab53bd6ab4e9f9049aead9363c7d
```

Event:

```solidity
MetaEvidence(uint256 indexed _metaEvidenceID, string _evidence)
```

`_evidence` is the IPFS pointer to the MetaEvidence JSON.

For full ABI context, see `shared-abi-fragments.md`.

---

## Sort and choose the current MetaEvidence

After retrieving logs, sort matching logs by:

1. `blockNumber`
2. `transactionIndex`
3. `logIndex`

Use ascending order for history and descending order for "latest first" inspection. Do not use an old cached
URI if a newer valid MetaEvidence event exists.

**Important:** do not assume `_metaEvidenceID = 0` and `_metaEvidenceID = 1` remain the only active IDs
forever. Factory deployment commonly emits initial registration and clearing MetaEvidence, but governor
updates can emit later MetaEvidence events with new IDs. The latest applicable event is what matters.

---

## Fetch the MetaEvidence JSON

Fetch `_evidence` via a gateway:

```text
https://cdn.kleros.link/ipfs/<CID>
https://ipfs.io/ipfs/<CID>
```

If the event path is `/ipfs/<CID>/metaEvidence.json`, prepend only the gateway host. Do not add a second
`/ipfs/` segment.

Parse the JSON and extract:

- `fileURI` - policy document URI.
- `metadata.columns[]` - canonical item schema.
- `metadata.logoURI` - list logo for production registries.
- title/description/rulingOptions - useful for classifying registration vs clearing streams.

Stop if the JSON cannot be fetched, parsed, or validated.

---

## LGTCR specifics

LightGeneralizedTCR uses separate registration and clearing MetaEvidence.

Use the correct policy stream:

- `addItem` flow - use the latest registration-like MetaEvidence.
- `removeItem` flow - use the latest clearing-like MetaEvidence.
- Challenging a registration request - use registration policy.
- Challenging a removal request - use clearing policy.

How to classify events:

1. Fetch recent MetaEvidence events for the registry using the topic above.
2. Sort latest first.
3. Fetch each candidate `_evidence` JSON.
4. Classify by explicit content:
   - registration: title/description/ruling options such as `Add`, `Add It`, `Don't Add It`.
   - clearing: title/description/ruling options such as `Remove`, `Remove It`, `Don't Remove It`.
5. Use the latest candidate matching the operation.

Do not rely only on event parity, hardcoded stream IDs, or the absolute latest log. Some update transactions
emit a registration MetaEvidence and then a clearing MetaEvidence in the same transaction; blindly taking the
last log can choose the clearing policy for an `addItem` task.

For the narrow task "recover the fields to compose item.json from a registry link", the agent may fetch the
latest valid MetaEvidence event, parse `_evidence`, and read `metadata.columns`. If the latest event is clearly
clearing and a same-block or nearby registration MetaEvidence exists, use the registration columns for `addItem`.
If schemas differ or classification is ambiguous, stop and ask.

Scout registries use these same LGTCR mechanics. Read `scout-registries.md` for Scout-specific registry
addresses and seed-template checks.

---

## PGTCR specifics

PermanentGTCR uses a single MetaEvidence URI. There is no registration/clearing split.

Primary path: query Goldsky for `registry.arbitrationSettings[0].metaEvidenceURI`.
Specific endpoints are in `stake-curate.md`.

Fallback path: use the same `eth_getLogs` method above and take the latest valid MetaEvidence event for the
registry. Fetch `_evidence`, parse JSON, and extract `metadata.columns[]`.

---

## MetaEvidence authoring rules

Before uploading or using MetaEvidence onchain, validate it as strictly as item.json. This file is the
canonical source for authored MetaEvidence minimum requirements, JSON key order, and LGTCR/PGTCR templates.

Minimum MetaEvidence requirements:

- top-level `title`, `description`, `rulingOptions`, `category`, `question`, `fileURI`, and `metadata`.
- `fileURI` must point to the human-readable policy.
- `evidenceDisplayInterfaceURI` must be included when the target Curate interface/list template uses one.
- Strongly prefer a PDF policy document for human and juror review. Use a non-PDF policy only if the user
  explicitly accepts the review and compatibility risk.
- `metadata.logoURI` is required for production lists.
- `metadata.tcrTitle`, `metadata.tcrDescription`, `metadata.itemName`, and `metadata.itemNamePlural`
  must match the list.
- `metadata.columns` must be final and valid.
- LGTCR deployments need separate registration and clearing MetaEvidence.
- PGTCR deployments need one MetaEvidence.

Valid GTCR column `type` values when authoring new MetaEvidence:

- `text`
- `long text`
- `link`
- `address`
- `rich address`
- `image`
- `file`
- `number`
- `boolean`
- `GTCR address`

Current scope: this skill covers Light Curate / GTCR and Stake Curate / PGTCR. Do not author Curate V2-only
type spellings such as `longText`, `richAddress`, or `chain` for GTCR/PGTCR MetaEvidence unless the target
interface or live MetaEvidence proves that exact spelling is expected.

Never author unsupported aliases:

- `url` - use `link`
- `uri` - use `link` or `file`, depending on the field
- `string` - use `text`
- `markdown` - use `long text`
- `bool` - use `boolean`
- `integer`, `int`, `float`, `decimal` - use `number`

For `file` columns, include `allowedFileTypes`, for example `pdf`, `json`, or `pdf json`.

Use this canonical key order for authored MetaEvidence JSON:

1. `title`
2. `description`
3. `rulingOptions`
4. `category`
5. `question`
6. `fileURI`
7. `evidenceDisplayInterfaceURI` when used
8. `metadata`

Use this canonical `metadata` key order:

1. `tcrTitle`
2. `tcrDescription`
3. `columns`
4. `itemName`
5. `itemNamePlural`
6. `logoURI`
7. `requireRemovalEvidence` when used
8. `isTCRofTCRs` when used
9. `relTcrDisabled` when used

LGTCR registration MetaEvidence should clearly describe adding the singular item type:

```json
{
  "title": "Add a <singular item name> to <List Name>",
  "description": "Someone requested to add a <singular item name> to <List Name>.",
  "rulingOptions": {
    "titles": [
      "Yes, Add It",
      "No, Don't Add It"
    ],
    "descriptions": [
      "Select this if you think the <singular item name> complies with the required criteria and should be added.",
      "Select this if you think the <singular item name> does not comply with the required criteria and should not be added."
    ]
  },
  "category": "Curated Lists",
  "question": "Does the <singular item name> comply with the required criteria?",
  "fileURI": "/ipfs/<POLICY_PDF_CID>",
  "evidenceDisplayInterfaceURI": "/ipfs/<EVIDENCE_DISPLAY_INTERFACE_CID>/index.html",
  "metadata": {
    "tcrTitle": "<List Name>",
    "tcrDescription": "<List description>",
    "columns": [],
    "itemName": "<singular item name>",
    "itemNamePlural": "<plural item name>",
    "logoURI": "/ipfs/<LOGO_CID>",
    "requireRemovalEvidence": true,
    "isTCRofTCRs": false,
    "relTcrDisabled": true
  }
}
```

LGTCR clearing MetaEvidence should clearly describe removing the singular item type and should normally use the same
`metadata.columns` as registration MetaEvidence. Diverge only when the target contract/interface proves it is
expected.

```json
{
  "title": "Remove a <singular item name> from <List Name>",
  "description": "Someone requested to remove a <singular item name> from <List Name>.",
  "rulingOptions": {
    "titles": [
      "Yes, Remove It",
      "No, Don't Remove It"
    ],
    "descriptions": [
      "Select this if you think the <singular item name> fails to comply with the required criteria and should be removed.",
      "Select this if you think the <singular item name> complies with the required criteria and should not be removed."
    ]
  },
  "category": "Curated Lists",
  "question": "Does the <singular item name> fail to comply with the required criteria?",
  "fileURI": "/ipfs/<POLICY_PDF_CID>",
  "evidenceDisplayInterfaceURI": "/ipfs/<EVIDENCE_DISPLAY_INTERFACE_CID>/index.html",
  "metadata": {
    "tcrTitle": "<List Name>",
    "tcrDescription": "<List description>",
    "columns": [],
    "itemName": "<singular item name>",
    "itemNamePlural": "<plural item name>",
    "logoURI": "/ipfs/<LOGO_CID>",
    "requireRemovalEvidence": true,
    "isTCRofTCRs": false,
    "relTcrDisabled": true
  }
}
```

PGTCR MetaEvidence is a single stream. Do not create a separate clearing MetaEvidence for PGTCR unless the
specific contract flow explicitly requires one. A typical PGTCR MetaEvidence describes the keep/remove
decision for an item already in the permanent-stake registry:

```json
{
  "title": "Keep a <singular item name> in <List Name>",
  "description": "Someone requested to remove a <singular item name> from <List Name>.",
  "rulingOptions": {
    "titles": [
      "Yes, Keep It Included",
      "No, Remove It"
    ],
    "descriptions": [
      "Select this if you think the <singular item name> complies with the required criteria and should be kept included.",
      "Select this if you think the <singular item name> does not comply with the required criteria and should be removed."
    ]
  },
  "category": "Curated Lists",
  "question": "Does the <singular item name> comply with the required criteria?",
  "fileURI": "/ipfs/<POLICY_PDF_CID>",
  "evidenceDisplayInterfaceURI": "/ipfs/<EVIDENCE_DISPLAY_INTERFACE_CID>/index.html",
  "metadata": {
    "tcrTitle": "<List Name>",
    "tcrDescription": "<List description>",
    "columns": [],
    "itemName": "<singular item name>",
    "itemNamePlural": "<plural item name>",
    "logoURI": "/ipfs/<LOGO_CID>",
    "requireRemovalEvidence": true
  }
}
```

When deploying LGTCR, keep both kinds of order separate and explicit:

- **JSON key order:** use the canonical order above for both registration and clearing MetaEvidence.
- **Factory argument order:** pass the registration MetaEvidence URI first and the clearing MetaEvidence URI
  second. The registration URI must point to the `Add a <singular item name>...` JSON; the clearing URI must
  point to the `Remove a <singular item name>...` JSON. Do not swap them, even if the clearing JSON was
  uploaded more recently.

Stop before upload or deployment if:

- JSON does not parse.
- `rulingOptions` is missing or does not match the operation.
- `metadata.columns` is missing or empty.
- any column type is unsupported.
- any placeholder remains.
- `fileURI` is missing.
- `evidenceDisplayInterfaceURI` is missing when the target Curate interface/list template uses one.
- production `metadata.logoURI` is missing.
- LGTCR registration and clearing MetaEvidence URIs are unlabeled or their add/remove mapping is unverified.
- the policy is not a PDF and the user has not explicitly accepted the review and compatibility risk.
- the user has not confirmed schema, policy, logo, chain, arbitrator/court, and deploy parameters.
