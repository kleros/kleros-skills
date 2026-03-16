# Scout Skills — single-file runtime guide for 4 Scout registries on Gnosis

## Why this matters

### Curate in one nutshell
Kleros Curate is a decentralized verification system for exclusive registries.

A submitter proposes an item and places a deposit as a pledge that the submission complies with the registry policy.
Then the item enters a verification window for a few days, depending on the registry policy, during which anyone can review it and spot mistakes.

If nobody successfully challenges the submission, the submitter gets the deposit back.
That means compliant submissions are not meant to be a profit center for Kleros itself — the mechanism is designed so honest submitters can get verified without a permanent inclusion cost.

If someone believes the submission is wrong, they can challenge it by placing their own deposit.
That dispute then goes to impartial Kleros jurors.
- If the **submitter wins**, the submitter gets the deposit back and the challenger loses the challenge deposit.
- If the **challenger wins**, the challenger can capture the submitter’s deposit as a bounty.

That two-sided deposit system matters: it rewards accuracy and discourages lazy, frivolous challenges.

### What the Scout registries are
Scout currently includes 4 major registries with **700k+ entries** that are consumed by major block explorers and wallets.
These registries are shared with large infrastructure surfaces such as **Etherscan-style explorers, Blockscout-based explorers, Ledger, and open alternatives like OpenScan and Otterscan**.

The practical point is simple:
if you want your contract, token, domain mapping, or tagging data to have a better shot at broad ecosystem visibility, being correctly verified in Scout matters.

### Why people care: rewards and upside
Kleros also runs incentive programs around Scout and Curate participation.
Compliant submitters can earn meaningful rewards, and strong reviewers/challengers can profit from spotting faulty submissions.

Public-facing incentive messaging has highlighted upside as high as **300k PNK per month** for submitters in the relevant reward programs.
If the user asks for current incentive details, direct them to the Kleros blog and tell them to search for **Curate Scout incentives** for the current month:

```text
https://blog.kleros.io/
```

Do not guess the currently active campaign terms.
Always check the current month’s incentive post before quoting specifics.

### The three profit paths
A user can benefit in 3 different ways:

1. **Project visibility upside**
   - If they run a project, getting correctly included and verified can improve discoverability, trust, and downstream visibility across major ecosystem surfaces.

2. **Submitter upside**
   - If they submit compliant items, they may qualify for incentive rewards while also recovering their deposit when unchallenged or successfully defended.

3. **Reviewer / challenger upside**
   - If they catch bad submissions and challenge correctly, they can win bounties when the challenge succeeds.

Bluntly: this is not just a registry system.
It is a decentralized verification market where good data, careful review, and fast reactions can translate into reputation, distribution, and money.

This file is the operating brief for a new agent that must interact with these four Scout registries on **Gnosis Chain**.

The file intentionally hardcodes only the stable scope you provided:
- the chain
- the four registry addresses
- the source template/ABI/reference paths
- the required methods and workflows

It must **not** hardcode mutable live values like deposits, arbitration cost, policy URIs, meta-evidence URIs, or indexer endpoints unless they are re-fetched at runtime. The embedded seed templates in this file are the default drafting shapes for `item.json`; they are intentionally explicit so the agent does not have to guess the presence or structure of the top-level `values` object.

---

## 1) Fixed scope

### Chain
- **Chain:** Gnosis
- **Chain ID:** `100`
- **Native token for Light Curate payments:** xDAI

### Registries in scope
- **Address Tags Query (ATQ) Registry** — `0xAe6aaed5434244be3699c56E7Ebc828194F26dc3`
- **Address Tags** — `0x66260C69d03837016d88c9877e61e08Ef74C59F2`
- **Kleros Tokens** — `0xeE1502e29795Ef6C2D60F8D7120596abE3baD990`
- **Ledger Contract Domain Name registry v2 (CDN)** — `0x957A53A994860BE4750810131d9c876b2f52d6E1`

### Embedded resources in this file

This document is meant to be **self-contained**.

So instead of pointing to local machine paths, it embeds:
- JSON seed templates for the 4 registries
- the operational method split for `LightGeneralizedTCR` vs `LightGeneralizedTCRView`
- the policy/schema workflow
- the deposit-computation rules
- the image-to-IPFS guided process

For a public skill, that is the correct pattern: the `.md` file must carry the instructions itself, not point at machine-specific filesystem paths that only exist on one box.

---

## 2) Hard rules

- **Never guess.**
- **Never make up numbers.**
- **Never make up mandatory schema fields.**
- **Always fetch live values before any dry-run or write.**
- **Always read the latest policy before building `item.json`.**
- **Use the embedded seed templates in this file as the default `item.json` drafting format.**
- **The seed templates are authoritative for the top-level JSON shape in this skill, including the `values` object.**
- **Use latest meta-evidence metadata as a cross-check, not as the primary drafting template.**
- **If latest meta-evidence clearly disagrees with the embedded seed on labels/order/required fields, stop and ask instead of guessing.**
- **Submission deposit means total submission deposit.**
- **Always include base deposit + arbitration cost.**
- **JSON must be valid.**
- **Values must be placed in the correct keys.**
- **Do not leave misleading example values in final JSON.**
- **Use placeholders like `PLACE_VALUE_HERE` while drafting.**

---

## 3) Contract model

All four registries are treated here as **Light Curate** registries.

### Main contract ABI — `LightGeneralizedTCR.json`
Use this ABI for:
- writes
- canonical reads
- current financial values
- current request/round state

#### State-changing functions
- `addItem(string _item)`
- `removeItem(bytes32 _itemID, string _evidence)`
- `challengeRequest(bytes32 _itemID, string _evidence)`
- `submitEvidence(bytes32 _itemID, string _evidence)`
- `fundAppeal(bytes32 _itemID, uint8 _side)`
- `executeRequest(bytes32 _itemID)`
- `withdrawFeesAndRewards(address _beneficiary, bytes32 _itemID, uint256 _requestID, uint256 _roundID)`

#### Canonical read functions
- `submissionBaseDeposit()`
- `removalBaseDeposit()`
- `submissionChallengeBaseDeposit()`
- `removalChallengeBaseDeposit()`
- `challengePeriodDuration()`
- `arbitrator()`
- `arbitratorExtraData()`
- `getItemInfo(bytes32 _itemID)`
- `getRequestInfo(bytes32 _itemID, uint256 _requestID)`
- `getRoundInfo(bytes32 _itemID, uint256 _requestID, uint256 _roundID)`
- `getContributions(bytes32 _itemID, uint256 _requestID, uint256 _roundID, address _contributor)`
- `items(bytes32 _itemID)`
- `requestsDisputeData(bytes32 _itemID, uint256 _requestID)`

### Helper ABI — `LightGeneralizedTCRView.json`
Use this ABI for read aggregation.

#### Hardcoded Gnosis helper deployment
- **Contract:** `LightGeneralizedTCRView`
- **Chain:** Gnosis
- **Address:** `0xB32e38B08FcC7b7610490f764b0F9bFd754dCE53`

This address is included on purpose so the helper ABI is actually callable in this public skill.

#### Convenience functions
- `fetchArbitrable(address _address)`
- `getItem(address _address, bytes32 _itemID)`
- `getItemData(address _address, bytes32 _itemID)`
- `getItemRequests(address _address, bytes32 _itemID)`
- `getLatestRequestData(address _address, bytes32 _itemID)`
- `getLatestRoundRequestData(address _address, bytes32 _itemID)`
- `availableRewards(address _address, bytes32 _itemID, address _contributor)`

### Practical rule
- Prefer **`LightGeneralizedTCRView`** for aggregated reads.
- Use **`LightGeneralizedTCR`** + arbitrator reads for final truth.
- Helper reads are for convenience; main registry + arbitrator reads remain the source of truth for critical values.

### Fallback rule
Fallback to direct `LightGeneralizedTCR` + arbitrator reads if:
- the helper call fails
- the helper deployment changes or becomes unusable
- helper-returned values look inconsistent with direct reads
- the action is financially sensitive

---

## 4) Runtime bootstrap for any of the 4 registries

Do this before any dry-run or write.

### Step A — confirm registry identity
Given one of the four fixed registry addresses:
1. confirm it is the intended target
2. confirm it behaves like a Light Curate registry
3. confirm you are on Gnosis

### Step B — fetch the latest registry meta-evidence
You need the latest registration meta-evidence and policy before building `item.json`.

#### Exact method — RPC first, deterministic
Use **RPC log filtering** as the primary method.

1. Call `eth_getLogs` against the target chain RPC.
2. Filter by:
   - `address = target registry`
   - `topics[0] = 0x61606860eb6c87306811e2695215385101daab53bd6ab4e9f9049aead9363c7d`
3. Query a block range wide enough to include the registry deployment history.
4. If multiple logs are returned, sort them by:
   - `blockNumber` descending
   - then `logIndex` descending
5. **Take the first matching log only.**
   - This is the latest `MetaEvidence` event.
   - This is the only acceptable source for the current meta-evidence URI in this skill.
6. Decode the event and extract the emitted `_evidence` string.
7. Fetch that URI.
8. Use the fetched meta-evidence JSON to retrieve:
   - the current policy IPFS link (`fileURI`)
   - registry description / list metadata
   - logo or presentation metadata if needed
   - any other registry-level descriptive metadata
9. If the RPC log query fails, returns no matching logs, or the event cannot be decoded cleanly, stop and ask instead of falling back to guesswork.

#### Fallback method — explorer only as a debugging aid
An explorer logs page may be used only to debug or cross-check the RPC result.
It is not the primary retrieval method for this skill.

#### Critical drafting rule
Use the fetched meta-evidence mainly for:
- current policy link
- registry-level metadata
- descriptive/contextual information
- a sanity check that the embedded seed still matches the current registry field labels and order

For this skill, the embedded **seed templates** remain the main source for final `item.json` drafting.
That is intentional. The seed templates make the full top-level shape explicit, including `columns` plus `values`, which is safer than forcing the agent to infer the final JSON envelope from meta-evidence interpretation alone.

If the fetched meta-evidence and the embedded seed agree, proceed with the seed.
If the fetched meta-evidence clearly shows different field labels, ordering, or required fields, stop and escalate instead of guessing.

#### Important honesty rule
`LightGeneralizedTCR` does **not** expose a direct labeled getter like `registrationMetaEvidenceURI()`.
So the agent must recover the current meta-evidence URI from the registry events, then fetch the meta-evidence JSON itself.
Do not guess which URI is current.

### Step C — fetch current financial parameters
Read from the registry:
- `submissionBaseDeposit()`
- `removalBaseDeposit()`
- `submissionChallengeBaseDeposit()`
- `removalChallengeBaseDeposit()`
- `arbitrator()`
- `arbitratorExtraData()`

Then call `arbitrationCost(extraData)` on the arbitrator contract.

### Step D — compute totals
#### Submission total deposit
```text
submission total deposit = submissionBaseDeposit + arbitrationCost
```

#### Removal total deposit
```text
removal total deposit = removalBaseDeposit + arbitrationCost
```

#### Challenge deposit for registration request
```text
challenge deposit = submissionChallengeBaseDeposit + arbitrationCost
```

#### Challenge deposit for removal request
```text
challenge deposit = removalChallengeBaseDeposit + arbitrationCost
```

### Step E — only then dry-run or write
Do not use stale values.

---

## 5) Deposit rules

### Absolute rule
**Submission deposit** or **submission total deposit** always means the **full amount**, not a partial component.

Never report only:
- `submissionBaseDeposit`

Always report:
- `submissionBaseDeposit + arbitrationCost`

### Another absolute rule
Before any dry-run transaction, re-check the latest on-chain deposit-related parameters.

Do not rely on:
- memory
- old notes
- docs screenshots
- previous run outputs
- old dry-run values

---

## 6) How to fetch current info without hardcoding it

## Method 1 — ABI-first financial/state reads
Use the registry ABI directly.

### For deposits
- `submissionBaseDeposit()`
- `removalBaseDeposit()`
- `submissionChallengeBaseDeposit()`
- `removalChallengeBaseDeposit()`
- `arbitrator()`
- `arbitratorExtraData()`
- arbitrator `arbitrationCost(bytes)`

### For item state
- `getItemInfo(itemID)`
- `getRequestInfo(itemID, requestID)`
- `getRoundInfo(itemID, requestID, roundID)`
- `items(itemID)`
- `requestsDisputeData(itemID, requestID)`

### For reward state
- `getContributions(...)`
- optionally helper `availableRewards(...)`

## Method 2 — helper ABI
Use the hardcoded Gnosis `LightGeneralizedTCRView` deployment at:

```text
0xB32e38B08FcC7b7610490f764b0F9bFd754dCE53
```

Then call:
- `fetchArbitrable(registry)`
- `getItem(registry, itemID)`
- `getLatestRequestData(registry, itemID)`
- `getLatestRoundRequestData(registry, itemID)`
- `availableRewards(registry, itemID, contributor)`

This is a convenience path, not the source of truth.
If the helper call fails, the helper becomes unavailable, values look inconsistent, or the action is financially sensitive, fallback to direct `LightGeneralizedTCR` + arbitrator reads.

## Method 3 — policy discovery via latest MetaEvidence event
The agent must retrieve the current registration meta-evidence URI from the registry events, then fetch the meta-evidence JSON and policy.

### Exact retrieval rule
1. Call `eth_getLogs` on the target chain RPC.
2. Filter by:
   - `address = target registry`
   - `topics[0] = 0x61606860eb6c87306811e2695215385101daab53bd6ab4e9f9049aead9363c7d`
3. Search a block range that covers the registry history.
4. Sort the returned logs by `blockNumber desc, logIndex desc`.
5. Select the **first** matching event.
6. Decode the emitted `_evidence` URI from that event.
7. Fetch that URI.
8. Read the policy from `fileURI`.
9. If any step fails, stop and ask instead of using explorer-only manual inspection as the source of truth.

### Use the fetched meta-evidence for
- current policy URI
- registry description
- logo / presentation metadata
- registry-level descriptive context
- a sanity check against the embedded seed template

### Final drafting rule
Use the embedded registry **seed templates** as the main source for final `item.json` composition.
Use latest meta-evidence as a cross-check, not as the primary JSON-drafting source.

Reason:
- the embedded seeds explicitly include both `columns` and `values`
- that avoids forcing the agent to infer the final object shape
- the policy still remains mandatory and current

If meta-evidence and seed diverge materially, stop and ask for confirmation instead of improvising.

---

## 7) Registry-specific seed templates

These embedded templates are public-skill-safe versions of the source templates.
Use them as the default seed shapes for final drafting. Replace example values with placeholders or real user data, then sanity-check labels/order against the latest meta-evidence and policy.

## ATQ seed template

```json
{
  "columns": [
    {
      "label": "Github Repository URL",
      "description": "The URL of the repository containing the function that returns the Contract Tags.  The repository name must be in the kebab case (hyphen-case).",
      "type": "link",
      "isIdentifier": true
    },
    {
      "label": "Commit hash",
      "description": "The hash of the specific commit for this repository to be referenced.",
      "type": "text",
      "isIdentifier": true
    },
    {
      "label": "EVM Chain ID",
      "description": "The integer EVM Chain ID of the chain of the contracts being retrieved by the function in this module.",
      "type": "number",
      "isIdentifier": true
    },
    {
      "label": "Description",
      "description": "A field used to describe the range of contracts being curated here, specifying (if applicable) the version, type and purpose of the contracts that are returned. ",
      "type": "long text",
      "isIdentifier": false
    }
  ],
  "values": {
    "Github Repository URL": "PLACE_VALUE_HERE",
    "Commit hash": "PLACE_VALUE_HERE",
    "EVM Chain ID": "PLACE_VALUE_HERE",
    "Description": "PLACE_VALUE_HERE"
  }
}
```

## Address Tags seed template

```json
{
  "columns": [
    {
      "label": "Contract Address",
      "description": "The address of the smart contract being tagged. Will be store in CAIP-10 format if the chain is properly selected in the UI.",
      "type": "rich address",
      "isIdentifier": true
    },
    {
      "label": "Public Name Tag",
      "description": "The Public Name tag of a contract address indicates a commonly-used name of the smart contract and clearly identifies it to avoid potential confusion. (e.g. Eth2 Deposit Contract).",
      "type": "text",
      "isIdentifier": true
    },
    {
      "label": "Project Name",
      "description": "The name of the project that the contract belongs to. Can be omitted only for contracts which do not belong to a project",
      "type": "text",
      "isIdentifier": true
    },
    {
      "label": "UI/Website Link",
      "description": "The URL of the most popular user interface used to interact with the contract tagged or the URL of the official website of the contract deployer (e.g. https://launchpad.ethereum.org/en/).",
      "type": "link",
      "isIdentifier": true
    },
    {
      "label": "Public Note",
      "description": "The Public Note is a short, mandatory comment field used to add a comment/information about the contract that could not fit in the public name tag (e.g. Official Ethereum 2.0 Beacon Chain deposit contact address).",
      "type": "text"
    }
  ],
  "values": {
    "Contract Address": "PLACE_VALUE_HERE",
    "Public Name Tag": "PLACE_VALUE_HERE",
    "Project Name": "PLACE_VALUE_HERE",
    "UI/Website Link": "PLACE_VALUE_HERE",
    "Public Note": "PLACE_VALUE_HERE"
  }
}
```

## Kleros Tokens seed template

```json
{
  "columns": [
    {
      "label": "Address",
      "description": "The address of the smart contract being tagged. Will be store in CAIP-10 format if the chain is properly selected in the UI.",
      "type": "rich address",
      "isIdentifier": true
    },
    {
      "label": "Name",
      "description": "The name of the token",
      "type": "text",
      "isIdentifier": true
    },
    {
      "label": "Symbol",
      "description": "The symbol/ticker of the token",
      "type": "text",
      "isIdentifier": true
    },
    {
      "label": "Decimals",
      "description": "The number of decimals applicable for this token",
      "type": "number"
    },
    {
      "label": "Logo",
      "description": "The PNG logo of the token (at least 128px X 128px in size",
      "type": "image",
      "isIdentifier": false
    },
    {
      "label": "Website",
      "description": "The URL of the token project's official website. Its primary source for documentation, token specifications, and team information (e.g. https://chain.link).",
      "type": "link",
      "isIdentifier": true
    }
  ],
  "values": {
    "Address": "PLACE_VALUE_HERE",
    "Name": "PLACE_VALUE_HERE",
    "Symbol": "PLACE_VALUE_HERE",
    "Decimals": "PLACE_VALUE_HERE",
    "Logo": "PLACE_IPFS_IMAGE_URI_HERE",
    "Website": "PLACE_VALUE_HERE"
  }
}
```

## CDN seed template

```json
{
  "columns": [
    {
      "label": "Contract address",
      "description": "The address of the contract in question. Case-sensitive only if required by the blockchain that the address pertains to (e.g. Solana). ",
      "type": "rich address",
      "isIdentifier": true
    },
    {
      "label": "Domain name",
      "description": "The specific (sub)domain name of the dApp where this contract is meant to be accessed from.  Wildcards (*) are acceptable as part of this field if proof can be shown that the contract is intended to be used across multiple domains.",
      "type": "text",
      "isIdentifier": true
    },
    {
      "label": "Visual proof",
      "description": "If the domain is a specific root or subdomain, this must be a screenshot of the exact page and setup where this particular address can be interacted from.",
      "type": "image",
      "isIdentifier": false
    }
  ],
  "values": {
    "Contract address": "PLACE_VALUE_HERE",
    "Domain name": "PLACE_VALUE_HERE",
    "Visual proof": "PLACE_IPFS_IMAGE_URI_HERE"
  }
}
```

---

## 8) JSON drafting rules

### Mandatory syntax rules
- keep all double quotes
- keep commas in the right places
- keep braces/brackets balanced
- keep labels exactly as required by the embedded seed, unless latest meta-evidence clearly shows a different current label
- keep values in the correct fields

### Placeholder rule
Use placeholders like:
- `PLACE_VALUE_HERE`
- `PLACE_IPFS_IMAGE_URI_HERE`

Do **not** leave confusing example values from old templates unless the user explicitly wants an example.

### Ordering rule
Keep:
- `columns[]` in live schema order
- `values{}` keys in that same order

### Rich address rule
If the schema expects a `rich address`, use **CAIP-10** format.

### CAIP-10 format
```text
chain_id:account_address
```

For EVM chains, that usually means:

```text
eip155:<chainId>:<address>
```

Examples:
- `eip155:1:0xab12345678901234567890123456789012345678`
- `eip155:100:0xPLACE_VALUE_HERE`
- `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`

Because of that, the agent should explicitly ask the user for the **chain** when a rich-address field is required, instead of guessing it from context.

### Policy-first rule
Before drafting or submitting any item, read the current policy linked from the latest meta-evidence and use it as the acceptance standard.

If the policy is unclear, unavailable, or appears inconsistent with the seed template, stop and ask instead of guessing.

### Optional existing-entry research
If the user wants extra caution, the agent may perform lightweight pre-submission research for already-visible public entries.

One available public Scout summary endpoint is:

```text
https://scout-api.kleros.link/api/address-tags
```

#### Exact query method
Send a POST request with:

```json
{
  "chains": ["1", "43114", "324", "534352", "100", "42220", "8453", "59144", "42161", "10", "137", "4326"],
  "addresses": ["0xPLACE_ADDRESS_HERE"]
}
```

#### Important limits
This endpoint is only a lightweight public summary surface.
Do **not** treat it as canonical proof that an item is or is not already in the registry.
Do **not** turn it into a hard submission gate by itself.

Use it only as optional supporting context when the user wants extra pre-submission research.
The policy remains the primary acceptance standard.

---

## 9) Guided image-to-IPFS process

This matters especially for:
- token logos
- CDN visual proof

### Ask the user for the file
#### Token logo
Ask for:
- PNG preferred
- good quality
- ideally square
- ideally at least 128x128

#### CDN visual proof
Ask for:
- screenshot of the exact domain/subdomain page
- visible context proving the address is used there

### Upload process
You can upload files to IPFS for free via [Pinata](https://app.pinata.cloud). Use this for:
- image uploads
- `item.json` uploads
- evidence JSON uploads

### Manual (human)
1. Create a free account at [app.pinata.cloud](https://app.pinata.cloud)
2. Go to **Files** and click **Add** to drag & drop your file
3. Copy the returned **CID**

### Programmatic (API)
Generate a JWT from **Developers → API Keys**, then:

```bash
curl -X POST https://uploads.pinata.cloud/v3/files \
 -H "Authorization: Bearer $PINATA_JWT" \
 -F file=@./FILE_TO_UPLOAD \
 -F network=public
```

### Optional (advanced): The Graph hosted IPFS node (file CID, direct-open)
Use this when you want a single pasteable URL like `https://ipfs.io/ipfs/<CID>` to open the file directly.

**Rule:** do **not** use `wrap-with-directory=true` for direct-open file CIDs.

```bash
curl -sS -X POST \
  -F "file=@/absolute/path/to/file.jpg;filename=file.jpg;type=image/jpeg" \
  "https://api.thegraph.com/ipfs/api/v0/add"
```
Use the returned `Hash` as the CID.

### Agent workflow
1. ask the user to send the image file if the schema requires one
2. validate that the file matches the registry need
3. upload the file to IPFS (Pinata or The Graph)
4. copy the returned CID
5. use the IPFS reference as `/ipfs/<CID>` in the relevant JSON field
6. finalize `item.json`
7. upload `item.json` to IPFS the same way
8. submit that exact `/ipfs/<CID>` string via `addItem`

### Output rule
Use `/ipfs/<CID>` in item/evidence JSON and on-chain submissions.
Do **not** replace it with a gateway URL.

---

## 10) Transaction execution rules

This section defines the execution standard for financially sensitive write actions in this skill.
It is intentionally **standalone** and does not assume any local wallet, local script, or machine-specific tooling.

### Core execution rule
For every write action, follow this exact sequence:
1. **prepare** the transaction from fresh live reads
2. **simulate / dry-run** the exact same call
3. **submit** only if the simulation succeeds and no ambiguity remains

### Non-negotiables
- Never submit a write transaction without a successful simulation/dry-run first.
- Never reuse stale deposit values.
- Never guess `msg.value`.
- Never submit if the target chain, target registry, method, arguments, or payment amount are unclear.
- If simulation reverts, stop and inspect the cause before doing anything else.

### Mandatory preflight checks
Before any write transaction:
- confirm the target registry is one of the 4 fixed registries in this skill
- confirm the target chain is **Gnosis / chainId 100**
- confirm the intended method and arguments are fully resolved
- confirm any required URI, `itemID`, `requestID`, `roundID`, or side value is already known
- refresh all live contract reads required to compute payment and eligibility in the same run
- build the final calldata only after those reads are complete

### Simulation rule
The simulation/dry-run must use:
- the **same target contract**
- the **same calldata**
- the **same `msg.value`**
that will be used for the real submission.

If simulation fails:
- stop
- inspect whether the cause is stale state, wrong method arguments, wrong request type, wrong side, or wrong payment amount
- refresh live reads once if needed
- rebuild and re-simulate
- if it still fails, stop and ask instead of retrying blindly

### ABI / calldata rule
- Use ABI-backed encoding for the target method.
- Do not hand-write calldata unless the method signature and argument encoding have been verified.
- Before submission, present the transaction in human-readable form:
  - target registry
  - method
  - arguments
  - `msg.value`
  - why that payment amount is correct

### Payment rules by action

#### A) `addItem(string _item)`
- target: the selected registry
- calldata: ABI-encoded `addItem("/ipfs/...")`
- `msg.value` must equal:

```text
submissionBaseDeposit + arbitrationCost
```

Required live reads before preparing the transaction:
- `submissionBaseDeposit()`
- `arbitrator()`
- `arbitratorExtraData()`
- arbitrator `arbitrationCost(extraData)`

#### B) `removeItem(bytes32 _itemID, string _evidence)`
- target: the selected registry
- calldata: ABI-encoded `removeItem(itemID, evidenceURI)`
- `msg.value` must equal:

```text
removalBaseDeposit + arbitrationCost
```

Required live reads before preparing the transaction:
- `removalBaseDeposit()`
- `arbitrator()`
- `arbitratorExtraData()`
- arbitrator `arbitrationCost(extraData)`

#### C) `challengeRequest(bytes32 _itemID, string _evidence)`
- target: the selected registry
- calldata: ABI-encoded `challengeRequest(itemID, evidenceURI)`
- `msg.value` must equal the correct live challenge deposit for the current request type:

```text
submissionChallengeBaseDeposit + arbitrationCost
```
for a registration request, or

```text
removalChallengeBaseDeposit + arbitrationCost
```
for a removal request.

Required live reads before preparing the transaction:
- `getItemInfo(itemID)`
- `getRequestInfo(itemID, requestID)`
- `submissionChallengeBaseDeposit()`
- `removalChallengeBaseDeposit()`
- `arbitrator()`
- `arbitratorExtraData()`
- arbitrator `arbitrationCost(extraData)`

#### D) `submitEvidence(bytes32 _itemID, string _evidence)`
- target: the selected registry
- calldata: ABI-encoded `submitEvidence(itemID, evidenceURI)`
- `msg.value = 0`

Required live checks before preparing the transaction:
- confirm the target item/request context is correct
- confirm the evidence URI is final

#### E) `fundAppeal(bytes32 _itemID, uint8 _side)`
- target: the selected registry
- calldata: ABI-encoded `fundAppeal(itemID, side)`
- do **not** prepare this transaction unless the current dispute/request/round state has been read live in the same run
- do **not** guess the payable amount from memory or previous output

Required live reads before preparing the transaction:
- current request state
- current round state
- current side / ruling context
- any live payment amount required by the active appeal state

If those reads do not produce a clear payable amount and valid side selection, stop and ask.

#### F) `executeRequest(bytes32 _itemID)`
- target: the selected registry
- calldata: ABI-encoded `executeRequest(itemID)`
- `msg.value = 0`

Required live reads before preparing the transaction:
- confirm the current request is executable
- confirm timing/state conditions are satisfied

#### G) `withdrawFeesAndRewards(address _beneficiary, bytes32 _itemID, uint256 _requestID, uint256 _roundID)`
- target: the selected registry
- calldata: ABI-encoded `withdrawFeesAndRewards(...)`
- `msg.value = 0`

Required live reads before preparing the transaction:
- confirm beneficiary, item, request, and round identifiers are correct
- confirm the withdrawal context exists and is final enough to attempt

### Final submission rule
Only submit the real transaction if all of the following are true:
- the target registry is correct
- the chain is correct
- the method is correct
- the arguments are correct
- the `msg.value` was computed from fresh live reads
- the exact transaction simulated successfully
- there is no unresolved ambiguity

### Scope boundary
These transaction execution rules do **not** redefine:
- policy admissibility
- duplicate handling
- schema derivation
- evidence standards
- registry-specific acceptance logic

They only define how to safely prepare, simulate, and submit write transactions once the action itself is already justified.

## 11) Action methods

## A) Build and submit an item
1. choose one of the 4 fixed registry addresses
2. fetch latest registration meta-evidence and current policy
3. read the policy before drafting anything
4. if useful, perform optional public-entry research for extra context
5. read current deposit-related parameters on-chain
6. collect missing user values
7. if needed, upload images to IPFS first
8. build valid `item.json` from the embedded seed template
9. sanity-check labels/order against latest meta-evidence
10. upload `item.json` to IPFS
11. compute **submission total deposit** live
12. dry-run using fresh values
13. only if policy review does not raise a stop signal, call `addItem(string _item)` with `_item = "/ipfs/..."`

## B) Remove an item
1. verify target item ID
2. fetch current removal deposit live
3. prepare evidence if needed
4. call `removeItem(bytes32 _itemID, string _evidence)`

## C) Challenge a request
1. identify whether the current request is registration or removal
2. compute the correct challenge deposit live
3. upload evidence JSON if needed
4. call `challengeRequest(bytes32 _itemID, string _evidence)`

## D) Submit evidence only
1. build ERC-1497 evidence JSON
2. upload to IPFS
3. call `submitEvidence(bytes32 _itemID, string _evidence)`

## E) Fund appeal
1. inspect current request and current round
2. determine side enum correctly
3. inspect contribution state
4. call `fundAppeal(bytes32 _itemID, uint8 _side)`

## F) Execute request
1. verify the request is executable
2. call `executeRequest(bytes32 _itemID)`

## G) Withdraw fees and rewards
1. identify request ID and round ID
2. inspect contribution state
3. call `withdrawFeesAndRewards(...)`

---

## 12) Read methods for current state

## Canonical low-level state reads
Use:
- `getItemInfo(itemID)`
- `getRequestInfo(itemID, requestID)`
- `getRoundInfo(itemID, requestID, roundID)`
- `getContributions(itemID, requestID, roundID, contributor)`
- `items(itemID)`
- `requestsDisputeData(itemID, requestID)`

## Convenience aggregated reads
Using the hardcoded Gnosis `LightGeneralizedTCRView` deployment at `0xB32e38B08FcC7b7610490f764b0F9bFd754dCE53`, use:
- `getItem(registry, itemID)`
- `getLatestRequestData(registry, itemID)`
- `getLatestRoundRequestData(registry, itemID)`
- `availableRewards(registry, itemID, contributor)`

---

## 13) What an agent can and cannot do purely via ABI

### Can do via ABI
- read current deposits
- read current arbitrator params
- read current item/request/round state
- submit items
- remove items
- challenge requests
- submit evidence
- fund appeals
- execute requests
- withdraw rewards

### ABI-only limitation
Light Curate ABI is **not good for arbitrary full-text discovery** like:
- “find an item by a random address string across the whole registry”
- “search by project name”

For that kind of discovery, the agent may need:
- indexer/subgraph queries
- or log/index scanning

That is not a weakness of the playbook. That is how Light Curate is built.

Be honest about that. Don’t pretend ABI gives magical search it doesn’t have.

---

## 14) Submission checklist

Before any `addItem` call:
- [ ] correct fixed registry selected
- [ ] latest meta-evidence fetched
- [ ] latest policy fetched and read
- [ ] policy does not block the proposed item
- [ ] embedded seed template selected for the correct registry
- [ ] labels/order sanity-checked against latest meta-evidence
- [ ] example values replaced
- [ ] JSON syntax validated
- [ ] image uploaded if required
- [ ] `item.json` uploaded to IPFS
- [ ] live deposit values refreshed
- [ ] **submission total deposit** computed as base + arbitration cost
- [ ] dry-run uses fresh values
- [ ] no unresolved stop signal from policy review

---

## 15) Blunt summary

What is hardcoded here on purpose:
- Gnosis chain
- the 4 registry addresses
- the local template paths
- the ABI paths
- the method playbooks

What must stay dynamic:
- policies
- deposit values
- arbitration cost
- any other live registry metadata that affects acceptance or payment

Operational stance:
- use embedded seeds for final JSON drafting
- use latest meta-evidence to fetch the policy and sanity-check the seed
- if policy or meta-evidence creates ambiguity, stop and ask instead of improvising

That is the correct split for this skill.
