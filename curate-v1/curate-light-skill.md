---
name: curate-light
description: Operate Kleros Curate Light lists (LightGeneralizedTCR) on Ethereum Mainnet, Sepolia, and Gnosis. Use when an agent needs to submit items, remove items, challenge requests, submit evidence, fund appeals, execute requests, withdraw rewards, or create a new Light Curate list. Derive policy and schema from onchain MetaEvidence, compute deposits from live contract state, and never guess list fields or addresses.
---

# Kleros Curate (Light) — **generic** single-file skill (Mainnet / Sepolia / Gnosis)

> Public skill rules (hard): **no local file references**, **no secrets/keys**, **no guessing**, **policy-first**, **onchain-first**.

## Non‑negotiables (most important rules)
- **Never guess / invent / approximate** amounts, addresses, schemas, or parameters.
- **Onchain state + onchain logs are the official source of truth** for:
  - deposits, arbitration cost, challenge deposits
  - appeal status and funding progress
  - the current MetaEvidence URI (and thus the live schema + policy URI)
- **Never assume a “standard token schema”** (or any standard schema). Even if many lists look similar, only the current MetaEvidence is authoritative.
- **Never rewrite the schema**: `item.json.columns` must be copied 1:1 from MetaEvidence. The only dynamic part is `values`.
- **Never include “typical ranges” / estimates** for deposits or fees. Only report live-read values.
- **Never claim an address is an EOA / “not a contract” without checking `eth_getCode` on the *target chain*.**
  - Do not make sweeping statements like “it’s an EOA on every chain”.
  - Always scope statements to **one chainId** + **one address** + **one `eth_getCode` result**.
- **Deposit hard rule:** for Light Curate submissions/challenges/removals, `msg.value` is computed from **live reads** (base deposit + arbitrator cost), not from what you “see on submissions” in an explorer.

Curate helps you verify people, assets, and submissions with less cost, less manual work, and more trust in the result.

Instead of checking every case yourself, you define the rules once and let the system enforce them through incentives.

Anyone who wants to be included submits an item + deposit. If compliant, the deposit is returned; if not, anyone can challenge and earn from the deposit. Everything is onchain and auditable.

This file teaches an agent to operate **any Light Curate list** (LightGeneralizedTCR) on:
- **Ethereum Mainnet** (chainId `1`)
- **Sepolia** (chainId `11155111`)
- **Gnosis** (chainId `100`)

It is intentionally **generic** (unlike Scout-specific skills). It does **not** hardcode registry addresses or list-specific templates.

### How this differs from the Scout-specific skill
- **Scout skill**: registry-scoped, can embed per-registry seed templates.
- **This Curate skill**: list-agnostic. The item schema is derived **dynamically** from the list’s latest **MetaEvidence** so the agent never has to guess labels/fields.

---

## 0) What you must ask the user for (minimum inputs)

1) **Which list (registry) are we interacting with?**
   - Ask for either:
     - the **Curate list URL** (preferred), e.g. `https://curate.kleros.io/tcr/100/0x...`  
       (format: `/tcr/<chainId>/<listAddress>`)
     - or **chainId + list contract address**.

2) **Existing list or create a new one?**
   - If **existing list**: you need chainId + list address (or Curate URL).
   - If **creating a new list**: you need chainId + **factory address** + all deploy params (Section 9).

3) **What action?**
   - `add item` (submit)
   - `remove item`
   - `challenge request`
   - `submit evidence`
   - `fund appeal`
   - `execute request`
   - `withdraw fees/rewards`
   - `create a new list (factory deploy)`

4) For submissions: the **actual field values** required by the list schema.

If any of the above is missing: stop and ask. Don’t guess.

### How the user finds the list address (Curate UI)
1. Open `https://curate.kleros.io`
2. Open the target list.
3. Copy the URL. The list contract address is the string after the chainId.

---

## 0.4) Registry discovery + “is this actually the right contract?”

Agents often fail here by mixing up chains or assuming an address is a registry without verifying it.

### Required checks (before any policy/deposit work)
Given `(chainId, listAddress)`:
1. **Confirm chainId** matches the user’s intent (Mainnet=1, Sepolia=11155111, Gnosis=100).
2. Call `eth_getCode(listAddress)` on that chain RPC.
   - If result is `0x` (empty): it’s not a contract on that chain → stop and ask for the correct chainId/address.
3. If code exists, perform one hallmark read call (any one is enough):
   - `submissionBaseDeposit()` (Light list hallmark)
   - `arbitrator()`
   If these revert, you likely have the wrong contract type/address. Stop and re-check.
4. Only after (1)-(3), proceed to fetch MetaEvidence logs and policy.

### Absolutely forbidden behavior
- Declaring “it’s an EOA on Base/Ethereum/Gnosis/…” without chain-scoped `eth_getCode` checks.
- Guessing which chain the registry “must be on”.

---

## 0.5) ABI / interface sourcing (safe, public, no local refs)

### Where to get contract information (ABI, events, method signatures)
Use any of these public sources to obtain the contract interface you need (ABI / events / method signatures), then proceed with onchain reads and transactions.

### Common sources (pick whichever is easiest for you)
1. **Explorer contract page** (ABI / events / read functions)
   - Blockscout (often easiest for these chains)
   - Etherscan-like explorers

2. **GitHub source / ABIs**
   - Kleros GTCR repo: https://github.com/kleros/gtcr

3. **Minimal ABI fragments (included below)**
   - This file includes minimal ABI fragments for the exact functions/events needed for Light Curate operations.

### Explorer pointers (commonly used hosts)
These hosts are commonly used and include API docs:
- Ethereum Mainnet (Blockscout): https://eth.blockscout.com
- Sepolia (Blockscout): https://eth-sepolia.blockscout.com
- Gnosis (Blockscout): https://gnosis.blockscout.com

If those hosts change, search “Blockscout <chain> explorer” and use the explorer’s **API docs** page.

### Minimal ABI fragments (enough to operate Light Curate)

#### LightGeneralizedTCR — minimal ABI
```json
[
  {"type":"event","name":"MetaEvidence","inputs":[{"indexed":true,"name":"_metaEvidenceID","type":"uint256"},{"indexed":false,"name":"_evidence","type":"string"}],"anonymous":false},
  {"type":"event","name":"NewItem","inputs":[{"indexed":true,"name":"_itemID","type":"bytes32"},{"indexed":false,"name":"_data","type":"string"},{"indexed":false,"name":"_addedDirectly","type":"bool"}],"anonymous":false},

  {"type":"function","name":"addItem","stateMutability":"payable","inputs":[{"name":"_item","type":"string"}],"outputs":[]},
  {"type":"function","name":"removeItem","stateMutability":"payable","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_evidence","type":"string"}],"outputs":[]},
  {"type":"function","name":"challengeRequest","stateMutability":"payable","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_evidence","type":"string"}],"outputs":[]},
  {"type":"function","name":"submitEvidence","stateMutability":"nonpayable","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_evidence","type":"string"}],"outputs":[]},
  {"type":"function","name":"fundAppeal","stateMutability":"payable","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_side","type":"uint8"}],"outputs":[]},
  {"type":"function","name":"executeRequest","stateMutability":"nonpayable","inputs":[{"name":"_itemID","type":"bytes32"}],"outputs":[]},
  {"type":"function","name":"withdrawFeesAndRewards","stateMutability":"nonpayable","inputs":[{"name":"_beneficiary","type":"address"},{"name":"_itemID","type":"bytes32"},{"name":"_requestID","type":"uint256"},{"name":"_roundID","type":"uint256"}],"outputs":[]},

  {"type":"function","name":"submissionBaseDeposit","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"removalBaseDeposit","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"submissionChallengeBaseDeposit","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"removalChallengeBaseDeposit","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"arbitrator","stateMutability":"view","inputs":[],"outputs":[{"type":"address"}]},
  {"type":"function","name":"arbitratorExtraData","stateMutability":"view","inputs":[],"outputs":[{"type":"bytes"}]},

  {"type":"function","name":"winnerStakeMultiplier","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"loserStakeMultiplier","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"sharedStakeMultiplier","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"MULTIPLIER_DIVISOR","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},

  {"type":"function","name":"getItemInfo","stateMutability":"view","inputs":[{"name":"_itemID","type":"bytes32"}],"outputs":[{"name":"status","type":"uint8"},{"name":"numberOfRequests","type":"uint256"},{"name":"sumDeposit","type":"uint256"}]},
  {"type":"function","name":"getRequestInfo","stateMutability":"view","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_requestID","type":"uint256"}],"outputs":[{"name":"disputed","type":"bool"},{"name":"disputeID","type":"uint256"},{"name":"submissionTime","type":"uint256"},{"name":"resolved","type":"bool"},{"name":"parties","type":"address[3]"},{"name":"numberOfRounds","type":"uint256"},{"name":"ruling","type":"uint8"},{"name":"requestArbitrator","type":"address"},{"name":"requestArbitratorExtraData","type":"bytes"},{"name":"metaEvidenceID","type":"uint256"}]},
  {"type":"function","name":"getRoundInfo","stateMutability":"view","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_requestID","type":"uint256"},{"name":"_roundID","type":"uint256"}],"outputs":[{"name":"appealed","type":"bool"},{"name":"amountPaid","type":"uint256[3]"},{"name":"hasPaid","type":"bool[3]"},{"name":"feeRewards","type":"uint256"}]},
  {"type":"function","name":"getContributions","stateMutability":"view","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_requestID","type":"uint256"},{"name":"_roundID","type":"uint256"},{"name":"_contributor","type":"address"}],"outputs":[{"name":"contributions","type":"uint256[3]"}]}
]
```

#### Arbitrator — minimal interface (typical)
Different deployments vary, so if a call reverts, fetch the verified arbitrator ABI from the explorer.
```json
[
  {"type":"function","name":"arbitrationCost","stateMutability":"view","inputs":[{"name":"_extraData","type":"bytes"}],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"appealCost","stateMutability":"view","inputs":[{"name":"_disputeID","type":"uint256"},{"name":"_extraData","type":"bytes"}],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"appealPeriod","stateMutability":"view","inputs":[{"name":"_disputeID","type":"uint256"}],"outputs":[{"name":"start","type":"uint256"},{"name":"end","type":"uint256"}]},
  {"type":"function","name":"currentRuling","stateMutability":"view","inputs":[{"name":"_disputeID","type":"uint256"}],"outputs":[{"type":"uint256"}]}
]
```

#### LightGTCRFactory — minimal ABI
```json
[
  {"type":"event","name":"NewGTCR","inputs":[{"indexed":true,"name":"_address","type":"address"}],"anonymous":false},
  {"type":"function","name":"deploy","stateMutability":"nonpayable","inputs":[
    {"name":"_arbitrator","type":"address"},
    {"name":"_arbitratorExtraData","type":"bytes"},
    {"name":"_connectedTCR","type":"address"},
    {"name":"_registrationMetaEvidence","type":"string"},
    {"name":"_clearingMetaEvidence","type":"string"},
    {"name":"_governor","type":"address"},
    {"name":"_baseDeposits","type":"uint256[4]"},
    {"name":"_challengePeriodDuration","type":"uint256"},
    {"name":"_stakeMultipliers","type":"uint256[3]"},
    {"name":"_relayContract","type":"address"}
  ],"outputs":[]}
]
```

### Sanity checks (don’t skip)
After sourcing an ABI, do at least one read call to confirm it matches the deployed contract, e.g.:
- `submissionBaseDeposit()` succeeds for a Light list
- `arbitrator()` returns a non-zero address
If core reads revert, you likely have the wrong ABI / wrong address / wrong chain. Stop.

---

## 1) Core invariant: policy + schema come from MetaEvidence (not from you)

For Light Curate, the only reliable source of the current policy + schema is the list’s **MetaEvidence** event(s).

### What MetaEvidence contains
When you fetch the MetaEvidence JSON, you typically get:
- `fileURI` → **policy** (often a PDF on IPFS)
- `metadata.columns[]` → the list **schema definition** (labels, types, descriptions, identifiers)

Example (simplified):
```json
{
  "fileURI": "/ipfs/<CID>/policy.pdf",
  "metadata": {
    "columns": [
      { "label": "Name", "type": "text", "isIdentifier": true }
    ]
  }
}
```

**Rule:** do not ask the user for fields until you’ve extracted `metadata.columns` from the current MetaEvidence.

---

## 2) Exact retrieval rule (latest MetaEvidence, onchain)

You must fetch MetaEvidence from the contract logs, not from screenshots, old docs, or memory.

### 2A) Deterministic RPC method (preferred)
Use `eth_getLogs` against a chain RPC.

Filter:
- `address = <listAddress>`
- `topics[0] = keccak256("MetaEvidence(uint256,string)")`

This topic0 is widely used in Kleros skills/playbooks:
```
0x61606860eb6c87306811e2695215385101daab53bd6ab4e9f9049aead9363c7d
```

Process:
1. Query logs over a wide enough block range to cover the list history.
2. Sort by `blockNumber desc`, then `logIndex desc`.
3. **Never take a random one**. Always take the **latest** log **for the MetaEvidenceID you need**.

### 2A.1) Explorer API fallback (Blockscout v2) — debugging / convenience
If you can’t easily do raw RPC log decoding, you can use Blockscout’s API to *view decoded logs*.

Typical endpoints (host varies per chain/explorer):
- Logs for an address: `GET https://<blockscout-host>/api/v2/addresses/<listAddress>/logs`
- Contract/proxy info: `GET https://<blockscout-host>/api/v2/smart-contracts/<listAddress>`

**Rule:** This is a fallback for convenience and cross-checking. The source-of-truth is still the contract logs.

### 2B) Important: there are usually *two* MetaEvidence streams
Most Curate lists have at least:
- **registration** MetaEvidence (used for `addItem`)
- **clearing/removal** MetaEvidence (used for `removeItem`)

MetaEvidence has an indexed `_metaEvidenceID`.

**Primary rule:**
- For **addItem** flows, use the latest MetaEvidence for the registration ID.
- For **removeItem** flows, use the latest MetaEvidence for the clearing/removal ID.

**Resolution hierarchy when the ID mapping is not obvious:**
1. **First**, fetch the latest MetaEvidence logs, grouped by `_metaEvidenceID`, from contract logs.
2. **Then**, fetch the latest event for each candidate ID and read both MetaEvidence JSON files.
3. **Then**, classify by explicit policy language, titles, or descriptions when they clearly distinguish registration vs clearing/removal.
4. **Then**, cross-check against action context:
   - `addItem` must use the registration policy/schema.
   - `removeItem` must use the clearing/removal policy/schema.
5. If the mapping is still ambiguous, stop and warn the user. Do not guess.

**Important:** the first retrieval path must remain onchain log retrieval of the latest filtered MetaEvidence events. Heuristic interpretation is only for classifying candidate IDs after retrieval, not for replacing retrieval.

### 2C) Fetch the MetaEvidence JSON
The event gives you `_evidence` (often `"/ipfs/<CID>/metaEvidence.json"`).

To *read* it, use an IPFS gateway (read-only). Examples:
- `https://cdn.kleros.link/ipfs/<CID>/...`
- `https://ipfs.io/ipfs/<CID>/...`

(When *submitting* onchain, keep `/ipfs/...` as-is. See below.)

---

## 3) The **dynamic** item schema rule (zero ambiguity)

### Problem
MetaEvidence contains only `metadata.columns[]` (the schema). But the onchain item you submit is a JSON file that must contain:
- `columns` (the schema, copied)
- `values` (user-provided values)

### Canonical output shape (item.json) — must be FULL
The item JSON you upload must be a **complete** object with **both** parts present:
- `columns`: the full schema array (copied verbatim)
- `values`: a label → value mapping for every column

It must be exactly:
```json
{
  "columns": [ /* full copied column objects */ ],
  "values": { /* label -> value for EVERY column label */ }
}
```

Submitting **only** a `values` object is not a valid item file for Light Curate.

### Perfect, machine-safe derivation algorithm
Given MetaEvidence JSON `ME`:

1. Extract `C = ME.metadata.columns`.
2. Build `item.json.columns = C` **by deep copy** (do not edit labels/types/order).
3. Build `item.json.values` as follows:
   - For each `col` in `C` **in order**:
     - Let `k = col.label` (**exact string match**, including spaces, punctuation, and case)
     - Set `values[k] = <value for that column>`

That’s it. No extra keys. No renamed labels. No re-ordering.

### HARD RULE: `columns` must match MetaEvidence 1:1 (no edits, no inventions)

### Output protocol (prevents LLM “helpful rewriting”)
When producing an `item.json`, follow this exact output sequence:
1. Print **the fetched columns array** exactly as obtained from MetaEvidence (verbatim JSON) under a heading like `Fetched columns (verbatim)`.
2. Then print `item.json` where:
   - the `columns` field is a **copy/paste** of the same array from step (1)
   - the `values` field is the only part you fill dynamically

**Never** regenerate, paraphrase, or “clean up” descriptions. If you didn’t fetch MetaEvidence, do **not** output an `item.json` at all — ask for the list address / chain / MetaEvidence URI first.

A common failure mode (your “faulty” example) is when an agent:
- **renames** labels (e.g. `"Name"` → `"Token Name"`)
- **reorders** columns
- **rewrites/invents** `description` text
- **changes** `isIdentifier`
- builds a “schema” from the policy text or UI assumptions instead of MetaEvidence

Don’t do any of that.

**Rule:** `item.json.columns` must be a **deep copy** of `ME.metadata.columns` with **all keys preserved** exactly as given. That means:
- same objects
- same key/value pairs (including `description`)
- same order

If MetaEvidence contains a `description` string, you must keep it exactly. If MetaEvidence omits a field, you must not invent it.

If the fetched MetaEvidence columns say:
- `label: "Address"`, you must use exactly `"Address"`.
- and the description string must match exactly too.

The *only* dynamic part of `item.json` is `values`.

### Critical detail: `columns` objects must be copied **verbatim**
Another failure mode is rewriting columns into a “simplified” array like:
```json
[{"label":"Address","type":"rich address"}, ...]
```
Don’t do that.

### Programmatic construction checklist (must pass)
Given `C = ME.metadata.columns` and `V = item.json.values`:
- `item.json.columns` is **deep-equal** to `C` (same order, same keys, same strings — especially `label` and `description`).
- `Object.keys(V)` is **exactly** `C.map(c => c.label)` (same order, no missing, no extras).
- Every value is non-empty unless the policy explicitly allows omission.
- For any `type == "image"`: value must be an `/ipfs/...` path (not a gateway URL).
- For any `type == "rich address"`: value must match CAIP-10 (e.g. `eip155:<chainId>:0x...`).

If *any* checklist item fails, do not submit. Fix the construction first.

### Implementation sketch (language-agnostic pseudocode)
```text
ME = fetchMetaEvidence()
C  = ME.metadata.columns

values = {}
for col in C:
  k = col.label  // exact string
  values[k] = ask_user_for_value(k, col.type, col.description)

item = { columns: C, values }
assert deepEqual(item.columns, C)
assert keys(values) == [col.label for col in C]
```

### Value typing rule (don’t guess)
Different lists historically store numbers as strings (common in Curate UI examples).

**Hard rule:** do not output guessed example schemas (including guessed descriptions) “while waiting” for MetaEvidence. Fetch MetaEvidence first, then construct the full `item.json` from it.

To get **100% certainty**, you must do this validation step once per MetaEvidence version:

#### Schema confirmation check (required)
After you found the latest MetaEvidence update (block `B_meta`):
1. Find **any** `NewItem` event that is **chronologically after** that update.
2. Fetch the `_data` field from that event (it’s typically an `/ipfs/...` URI).
3. Fetch that item JSON from IPFS.
4. Confirm:
   - `item.columns` matches `ME.metadata.columns` (labels, order, types)
   - observe how `item.values` encodes types (strings vs numbers)

If the sample item uses strings for `"number"` fields (very common), **you must match that**.
If there is any mismatch: stop and ask; do not “fix” it by improvising.

> Why `NewItem`? LightGeneralizedTCR emits `NewItem(bytes32 _itemID, string _data, bool _addedDirectly)`.

### Placeholder rule (drafting)
While drafting with the user, you may use placeholders (then replace):
- `PLACE_VALUE_HERE`
- `PLACE_IPFS_URI_HERE` (must become `/ipfs/<CID>`)

But you must never submit placeholders.

---

## 4) Field-value rules by common Curate types

Use the column’s `type` and `description` to decide what you must ask the user.

Common types:
- `text`, `long text` → ask for a string
- `link` → ask for a URL (must match policy requirements)
- `image` → ask for a file, upload to IPFS, store the returned `/ipfs/...` path
- `address` → usually a plain chain address (often `0x...`), but **follow policy**
- `rich address` → **CAIP-10** format (commonly used in multichain lists)

### CAIP-10 (for `rich address`)
For EVM chains:
```
eip155:<chainId>:<0xAddress>
```
Examples:
- `eip155:1:0xabc...`
- `eip155:100:0xabc...`
- `eip155:11155111:0xabc...`

**Rule:** if a field is `rich address` and the user didn’t specify the chain, you must ask.

---

## 5) Upload to IPFS

You can upload a file to IPFS for free via [Pinata](https://app.pinata.cloud).

### Manual (human)
1. Create a free account at [app.pinata.cloud](https://app.pinata.cloud)
2. Go to **Files** and click **Add** to drag & drop your file
3. Copy the returned **CID**

### Programmatic (API)
Generate a JWT from **Developers → API Keys**, then:

```bash
curl -X POST https://uploads.pinata.cloud/v3/files \
 -H "Authorization: Bearer $PINATA_JWT" \
 -F file=@./your-file.txt \
 -F network=public
```

### Optional (advanced): The Graph hosted IPFS node (file CID, not directory CID)
Use The Graph’s hosted IPFS upload when you want a **single direct-open gateway link**.

**Rule:** if you want `https://ipfs.io/ipfs/<CID>` to open the file directly, **do not** use `wrap-with-directory=true`.

Upload as a *file* CID:
```bash
curl -sS -X POST \
  -F "file=@/absolute/path/to/file.jpg;filename=file.jpg;type=image/jpeg" \
  "https://api.thegraph.com/ipfs/api/v0/add"
```

Response includes `Hash` = the CID. Direct link:
```text
https://ipfs.io/ipfs/<Hash>
```

### Submission rule
When writing to chain, use the IPFS reference as:
```text
/ipfs/<CID>
```
Do **not** replace it with `https://.../ipfs/...`.

---

## 6) Deposits (Light Curate): compute from onchain state every time

Never reuse old numbers.

**Hard rule:** do not quote “typical” deposits, fee ranges, or example numbers. Only compute and report values from live onchain reads.

**Hard rule (UI trap):** the Curate UI often shows only the **base deposit** (e.g. `submissionBaseDeposit`). That is **not** the full payable amount. The amount you must send is typically:
- **base deposit** (from the list), **plus**
- **arbitration cost** (from the arbitrator)

So for `addItem`, the payable amount is:
```text
msg.value = submissionBaseDeposit + arbitrator.arbitrationCost(arbitratorExtraData)
```

**Also forbidden:** quoting the base deposit alone as “the deposit” (e.g. “Deposit: 30 xDAI”) without adding arbitration cost.

### Verification hierarchy (bulletproof)
1. **Source of truth:** compute from live reads on the current chain.
2. **Optional cross-check:** inspect a recent successful `addItem` tx and confirm its `msg.value` matches your computed total.
   - Do not use tx inspection as the primary method (values can change).

`msg.value` is paid in the chain’s native token: ETH on Ethereum Mainnet and Sepolia, xDAI on Gnosis.

### Submission (addItem) total deposit
1. Read from the list:
   - `submissionBaseDeposit()`
   - `arbitrator()`
   - `arbitratorExtraData()`
2. Call on the arbitrator:
   - `arbitrationCost(arbitratorExtraData)`

Then:
```text
msg.value = submissionBaseDeposit + arbitrationCost
```

### Removal, challenge deposits
Same pattern:
- `removalBaseDeposit + arbitrationCost`
- `submissionChallengeBaseDeposit + arbitrationCost`
- `removalChallengeBaseDeposit + arbitrationCost`

If you can’t compute it live: stop.

---

## 7) Minimal action playbooks (LightGeneralizedTCR)

### Item identifiers (how to get the `itemID`)
Light Curate actions like `removeItem`, `challengeRequest`, `submitEvidence`, `fundAppeal`, `executeRequest`, and `withdrawFeesAndRewards` require an `itemID` (`bytes32`).

Ask the user for **one** of these (any is enough):
- the **itemID** shown in the Curate UI item details (often visible/copyable on the item page), or
- the **item details URL** from Curate (the itemID is typically in the URL and/or clearly shown on the page), or
- the item’s `/ipfs/...` **itemURI** (you can then derive/locate the itemID), or
- an **explorer link** to the item’s `NewItem` / request tx (logs include the itemID).

If they only have the list URL (not an item), you don’t have an itemID yet — you’re in the “submit item” flow.

### A) Submit an item (`addItem(string _item)`)
1. Fetch latest registration MetaEvidence (Section 2).
2. Read policy from `fileURI`.
3. Derive schema from `metadata.columns`.
4. Ask user for each value **per column label**.
5. Build `item.json = { columns, values }` (Section 3).
6. Upload `item.json` to IPFS → get `/ipfs/<CID>`.
7. Compute deposit live (Section 6).
8. Dry-run/simulate the tx with the same calldata + `msg.value`.
9. Send `addItem("/ipfs/<CID>")` with `msg.value`.

### B) Remove an item (`removeItem(bytes32 itemID, string evidenceURI)`)
1. Fetch latest clearing/removal MetaEvidence.
2. Read clearing/removal policy.
3. Prepare evidence JSON (ERC-1497 minimal is fine), upload to IPFS.
4. Compute removal deposit live.
5. Simulate then send.

### C) Challenge a request (`challengeRequest(bytes32 itemID, string evidenceURI)`)
1. Confirm whether current request is registration or removal (affects deposit).
2. Upload challenge evidence to IPFS.
3. Compute correct challenge deposit live.
4. Simulate then send.

### D) Evidence-only (`submitEvidence(bytes32 itemID, string evidenceURI)`)
- Upload evidence JSON to IPFS, then call `submitEvidence`. Typically `msg.value = 0`.

### E) Fund an appeal (`fundAppeal(bytes32 itemID, Party side)`)

Goal: compute (a) **how much is already paid** and (b) **how much is still required** for a given side, then send `fundAppeal` with the correct `msg.value`.

#### Step 0 — identify request + round (live)
1. Read `getItemInfo(itemID)` → `numberOfRequests`.
2. Set `requestID = numberOfRequests - 1` (latest request).
3. Read `getRequestInfo(itemID, requestID)` → get:
   - `disputed`, `disputeID`, `resolved`
   - `numberOfRounds`
   - `requestArbitrator`, `requestArbitratorExtraData`
   - `ruling` (Party enum)
4. Set `roundID = numberOfRounds - 1` (latest round).
5. Read `getRoundInfo(itemID, requestID, roundID)` → `amountPaid[3]`, `hasPaid[3]`.

If `disputed == false`: there is no appeal to fund. Stop.

#### Step 1 — compute the *required total* for the selected side
1. Read list constants:
   - `winnerStakeMultiplier()`, `loserStakeMultiplier()`, `sharedStakeMultiplier()`, `MULTIPLIER_DIVISOR()`
2. From `requestArbitrator`, call:
   - `appealCost(disputeID, requestArbitratorExtraData)` → `appealCost`
   - (recommended) `currentRuling(disputeID)` → `currentRuling`
   - (recommended) `appealPeriod(disputeID)` → `(start,end)`
3. Choose the multiplier **deterministically**:
   - If `currentRuling == 0` (no current winner): `multiplier = sharedStakeMultiplier`
   - Else if `side == currentRuling`: `multiplier = winnerStakeMultiplier`
   - Else: `multiplier = loserStakeMultiplier` **and** the loser is typically restricted to the first half of the appeal period.
     - Compute `midpoint = (start + end) / 2`.
     - If `now >= midpoint`, stop: loser can’t fund anymore.

4. Compute the total required for that side:
```text
totalRequired = appealCost + (appealCost * multiplier / MULTIPLIER_DIVISOR)
```

#### Step 2 — compute “how much funded as of now” + “remaining”
Let `paid = amountPaid[side]`.
- If `hasPaid[side] == true`, treat `remaining = 0`.
- Else `remaining = max(totalRequired - paid, 0)`.

This gives you a current, onchain answer for:
- “how much has been funded so far for this side?” → `paid`
- “how much is still needed to fully fund this side?” → `remaining`

#### Step 3 — send the tx safely
- Recommended: set `msg.value = remaining` to fully fund the side in one transaction.
- Always simulate/dry-run first.

**Important:** Party is a 3-value enum in most Light Curate deployments:
- `0 = None`
- `1 = Requester`
- `2 = Challenger`
Never fund `None`.

### F) Execute / Withdraw
- `executeRequest(itemID)` once executable.
- `withdrawFeesAndRewards(beneficiary, itemID, requestID, roundID)` when available.

---

## 8) Duplicate checking (this version)

This version intentionally skips subgraphs/indexers.

If the user wants to avoid duplicates:
- use the Curate UI to search/browse the list
- or inspect recent items in the explorer

Do not pretend you can do full-text search purely from ABI reads.

---

## 9) Creating a new Light Curate list (factory deploy)

Light Curate lists are typically deployed via `LightGTCRFactory.deploy(...)`.

### Deploy function signature (param order)
```text
deploy(
  IArbitrator _arbitrator,
  bytes _arbitratorExtraData,
  address _connectedTCR,
  string _registrationMetaEvidence,
  string _clearingMetaEvidence,
  address _governor,
  uint256[4] _baseDeposits,
  uint256 _challengePeriodDuration,
  uint256[3] _stakeMultipliers,
  address _relayContract
)
```

### What the agent must do
1. Ask which chain (1 / 11155111 / 100).
2. Ask for (or help the user obtain) the **factory address** on that chain.
   - Do not guess.
   - Accept a verified explorer link as input.
3. Prepare two MetaEvidence JSON files (registration + clearing) containing:
   - `fileURI` policy
   - `metadata.columns` schema
   - display metadata (title/description/logo) if desired
4. Upload both MetaEvidence JSON files to IPFS.
5. Confirm all numeric params (_baseDeposits, durations, multipliers) with the user.
6. Simulate `deploy(...)`.
7. Send tx.
8. Confirm deployment by listening for the factory `NewGTCR(address)` event.
9. Immediately re-run Section 2 on the new list to confirm MetaEvidence is correct.

---

## 10) Stop conditions (hard)

Stop and warn the user if any of the following happens:
- the MetaEvidence JSON is missing, malformed, or does not contain `metadata.columns`
- multiple plausible MetaEvidence IDs exist and you cannot classify them confidently
- no suitable post-update `NewItem` sample exists for schema confirmation when type encoding is ambiguous
- the IPFS upload endpoint returns malformed JSON or no usable `/ipfs/<CID>`
- a dry-run/simulation disagrees with the intended calldata, `msg.value`, or expected request path
- the current request state does not match the intended action
- any required label, value, address, or URI is still unresolved

Punctuation matters. Match labels, keys, and user-facing field names exactly, including spaces, case, and punctuation.

---

## 11) Key references (public)

- Curate UI: https://curate.kleros.io
- Light Curate dev docs: https://docs.kleros.io/developer/light-curate
- Kleros GTCR (contracts/UI code): https://github.com/kleros/gtcr
- EIP-1497 evidence standard (context): https://eips.ethereum.org/EIPS/eip-1497

Suggested talks/articles (context + real-world use):
- Neuchâtel Uni talk: https://www.youtube.com/watch?v=yNcBR5ews98&t=575s
- Stanford JBLP article: https://stanford-jblp.pubpub.org/pub/resolving-nft-blockchain-disputes/release/4
- Stanford live explanation: https://www.youtube.com/live/2_r7f1ENRy4
- King’s College London: https://www.youtube.com/watch?v=C2whqbbJQTU
- Real case (Baer Chain): https://forum.kleros.io/t/kleros-t2cr-weekly-rundown-the-case-of-the-baer-chain-ethfinex-badge-submission/212
- Mendoza court collab: https://thedefiant.io/news/regulation/kleros-to-collaborate-with-supreme-court-of-mendoza
- Lemon disputes: https://lemon.me/co/blog/alianza-kleros-justicia-descentralizada
