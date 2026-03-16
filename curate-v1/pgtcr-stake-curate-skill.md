---
name: pgtcr-stake-curate
description: Operate Kleros PGTCR / Stake Curate (PermanentGTCR) lists on Ethereum Mainnet, Gnosis, and Sepolia: query live list+item state via Goldsky subgraphs (GraphQL), fetch MetaEvidence/policy, build full item.json (columns+values), submit items with ERC20 stake + native arbitration deposit, challenge items, submit evidence, fund appeals, start/execute withdrawals, withdraw fees/rewards, and deploy new lists via PermanentGTCRFactory. Use when user mentions PGTCR, Stake Curate, PermanentGTCR, permanent stake registry, or needs GraphQL-based querying for Curate.
---

# Kleros Stake Curate (PGTCR / PermanentGTCR) — single‑file skill

PGTCR (“Permanent Generalized TCR”) is the **Stake Curate** variant of Curate.
Unlike Light Curate, PGTCR uses **permanent ERC20 stake** as collateral, plus **native-token arbitration deposits**.

This skill is designed to be **transaction-ready** and **query-heavy**:
- Use Goldsky GraphQL as the primary live data surface (items, challenges, rounds, metadata, params).
- Keep **onchain fallbacks** for anything that can affect money or correctness.

---

## Non‑negotiables (read this twice)

- **Never guess / invent / approximate**: amounts, addresses, schemas, params, “standard token schema”, “typical deposits”, etc.
- **Source-of-truth hierarchy**:
  1) **Onchain reads + logs** (official) for anything financial or schema-defining
  2) **Goldsky subgraph** (excellent live view, but still derived)
  3) UI screenshots / old blog posts (never authoritative)
- **Item schema hard rule**: `item.json.columns` must be copied **verbatim** from the current MetaEvidence JSON. The only dynamic part is `values`.
- **Deposit hard rule**: always compute required deposits from live reads (contract + arbitrator). Never infer from previous txs or UI labels.

---

## 0) Inputs to ask the user (minimum)

1) **Existing list or create new list?**
   - Existing list → `(chainId, registryAddress)` or a Curate UI URL.
   - New list → `(chainId, factoryAddress)` + deploy params (Section 9).

2) **Goldsky API token** (required for this skill’s GraphQL flow)
   - Create for free on Goldsky dashboard → Project Settings → API Tokens.
   - Use as: `Authorization: Bearer <GOLDSKY_TOKEN>`.

3) **Action** (submit, challenge, evidence, appeal funding, withdraw, etc.).

---

## 1) Goldsky GraphQL endpoints (Mainnet + Gnosis + Sepolia)

### Public endpoints (given)
- **Mainnet:**
  `https://api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/pgtcr-mainnet/v0.0.1/gn`
- **Gnosis:**
  `https://api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/pgtcr-gnosis/v0.0.1/gn`
- **Sepolia:**
  `https://api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/pgtcr-sepolia/v0.0.2/gn`

### Private endpoints (recommended when using a token)
Replace `/api/public/` with `/api/private/` and send the `Authorization` header.

### Curl template
```bash
ENDPOINT="<PASTE_ENDPOINT_HERE>"  # mainnet, gnosis, or sepolia
TOKEN="<GOLDSKY_TOKEN>"

curl -sS "$ENDPOINT" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  --data '{"query":"{ __typename }"}'
```

---

## 2) Registry discovery + correctness checks (don’t skip)

Given `(chainId, registryAddress)`:

1) **Confirm it’s a contract on that chain**: `eth_getCode(registryAddress)`.
   - If `0x` → stop; wrong chain or wrong address.

2) **Confirm it’s a PermanentGTCR-like contract** (hallmark calls):
   - `token()` (ERC20 stake token)
   - `submissionMinDeposit()`

3) **GraphQL existence test** (fast):
```graphql
query RegistryExistence($id: String!) {
  registry(id: $id) { id }
}
```
If GraphQL returns null but onchain code exists, assume indexing lag and proceed with onchain reads.

---

## 3) Core data model + status logic (PGTCR is not “just onchain status”)

### Onchain contract status (enum)
PGTCR contract-level `status` is typically one of:
- `Absent`
- `Submitted`
- `Reincluded`
- `Disputed`

### UI/consumer status is derived (mixed onchain + timestamps + dispute state)
For practical operation you must classify items using:
- `item.status`
- `item.includedAt`
- registry periods: `submissionPeriod`, `reinclusionPeriod`, `withdrawingPeriod`
- `item.withdrawingTimestamp`
- dispute round fields: appeal period + hasPaid flags + ruling time

#### Reference-derived status algorithm (pseudocode)
Use this logic when you need “Pending vs Accepted vs Crowdfunding vs Waiting Arbitrator vs Pending Withdrawal vs Removed/Rejected”:

```text
if item.status == Absent:
  # distinguish rejected vs removed using includedAt+submissionPeriod when available
  if includedAt > 0 and submissionPeriod > 0 and includedAt + submissionPeriod < now:
    return REMOVED
  else:
    return REJECTED

if item.status in {Submitted, Reincluded}:
  if withdrawingTimestamp > 0 and withdrawingTimestamp + withdrawingPeriod < now:
    return PENDING_WITHDRAWAL

if item.status == Submitted:
  return (includedAt + submissionPeriod < now) ? ACCEPTED : PENDING

if item.status == Reincluded:
  return (includedAt + reinclusionPeriod < now) ? ACCEPTED : PENDING

if item.status == Disputed:
  round = latest_round
  if round.rulingTime == 0:
    return DISPUTED
  if round.appealPeriodEnd <= now:
    return WAITING_ARBITRATOR

  half = (round.appealPeriodStart + round.appealPeriodEnd) / 2
  if now < half:
    return CROWDFUNDING

  loser = (round.ruling == ACCEPT) ? CHALLENGER : REQUESTER
  if loser_hasPaid:
    return CROWDFUNDING_WINNER
  else:
    return WAITING_ARBITRATOR
```

---

## 4) GraphQL queries you will use constantly

### 4A) Registry (params + latest metaEvidenceURI)
```graphql
query PermanentRegistry($id: String!) {
  registry(id: $id) {
    id
    token
    arbitrator { id }
    arbitrationSettings(orderBy: timestamp, orderDirection: desc) {
      timestamp
      arbitratorExtraData
      metaEvidenceURI
      metadata {
        title
        description
        itemName
        itemNamePlural
        policyURI
        logoURI
        requireRemovalEvidence
      }
    }
    submissionMinDeposit
    submissionPeriod
    reinclusionPeriod
    withdrawingPeriod
    arbitrationParamsCooldown
    challengeStakeMultiplier
    winnerStakeMultiplier
    loserStakeMultiplier
    sharedStakeMultiplier
  }
}
```

### 4B) Paginated items list (for search/browse)
```graphql
query PermanentItems($skip: Int, $first: Int, $where: Item_filter) {
  items(
    skip: $skip
    first: $first
    orderDirection: desc
    orderBy: includedAt
    where: $where
  ) {
    itemID
    status
    data
    createdAt
    includedAt
    stake
    arbitrationDeposit
    withdrawingTimestamp
    metadata {
      props { value type label description isIdentifier }
    }
    submissions(first: 1, orderBy: createdAt, orderDirection: desc) { submitter }
    challenges(first: 1, orderBy: createdAt, orderDirection: desc) {
      disputeID
      createdAt
      resolutionTime
      challenger
      challengerStake
      disputeOutcome
      rounds(first: 1, orderBy: creationTime, orderDirection: desc) {
        appealPeriodStart
        appealPeriodEnd
        ruling
        rulingTime
        hasPaidRequester
        hasPaidChallenger
        amountPaidRequester
        amountPaidChallenger
      }
    }
  }
}
```

### 4C) Item details (everything needed for appeals/evidence)
Item entity IDs are typically: `<itemID>@<registryAddress>`.

```graphql
query PermanentItemDetails($id: String!) {
  item(id: $id) {
    itemID
    data
    status
    stake
    submitter
    includedAt
    arbitrationDeposit
    withdrawingTimestamp

    submissions(orderBy: createdAt, orderDirection: desc) {
      id
      createdAt
      creationTx
      finishedAt
      withdrawingTimestamp
      withdrawingTx
      submitter
      initialStake
      arbitrationDeposit
    }

    challenges(orderBy: createdAt, orderDirection: desc) {
      id
      disputeID
      createdAt
      creationTx
      resolutionTime
      resolutionTx
      challenger
      challengerStake
      disputeOutcome
      arbitrationSetting { arbitratorExtraData }
      rounds(orderBy: creationTime, orderDirection: desc) {
        appealPeriodStart
        appealPeriodEnd
        ruling
        rulingTime
        hasPaidRequester
        hasPaidChallenger
        amountPaidRequester
        amountPaidChallenger
      }
    }

    evidences(orderBy: number, orderDirection: desc) {
      party
      URI
      number
      timestamp
      txHash
      metadata { name title description fileURI fileTypeExtension }
    }

    registry {
      id
      token
      arbitrator { id }
      arbitrationSettings(orderBy: timestamp, orderDirection: desc) {
        timestamp
        arbitratorExtraData
        metaEvidenceURI
        metadata { title itemName policyURI requireRemovalEvidence }
      }
      submissionMinDeposit
      submissionPeriod
      reinclusionPeriod
      withdrawingPeriod
      arbitrationParamsCooldown
      challengeStakeMultiplier
      winnerStakeMultiplier
      loserStakeMultiplier
      sharedStakeMultiplier
    }
  }
}
```

---

## 5) MetaEvidence → schema → FULL item.json (programmatic, no hallucinations)

### 5A) Fetch current metaEvidenceURI
Preferred:
- GraphQL: `registry.arbitrationSettings[0].metaEvidenceURI`

Fallback:
- Onchain logs: latest `MetaEvidence(uint256,string)` event.

### 5B) Fetch MetaEvidence JSON from IPFS
MetaEvidence URI is typically `/ipfs/<CID>/metaEvidence.json`.

Read via gateway (example):
- `https://cdn.kleros.link/ipfs/<CID>/metaEvidence.json`

### 5C) HARD RULE: build item.json by deep copy
Given metaEvidence JSON `ME`:

- `C = ME.metadata.columns`
- `item.columns = C` (deep copy, unchanged)
- `item.values` must have **exactly** one key per `col.label`, in the same order.

**Output protocol (prevents “helpful rewriting”)**
1. Print `Fetched columns (verbatim)` = exact `ME.metadata.columns` JSON.
2. Print final `item.json` where `columns` is a copy/paste of step (1) and only `values` is filled.

If you did not fetch MetaEvidence, do **not** output item.json.

---

## 6) Upload to IPFS

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

### Optional (advanced): The Graph hosted IPFS node (file CID, direct-open)
Use this when you want a single pasteable URL like `https://ipfs.io/ipfs/<CID>` to open the file directly.

**Rule:** do **not** use `wrap-with-directory=true` for direct-open file CIDs.

```bash
curl -sS -X POST \
  -F "file=@/absolute/path/to/file.jpg;filename=file.jpg;type=image/jpeg" \
  "https://api.thegraph.com/ipfs/api/v0/add"
```
Use the returned `Hash` as the CID.

### Submission rule
Submit the IPFS reference as:
```text
/ipfs/<CID>
```

---

## 7) Deposits & fees (PGTCR has TWO assets)

PGTCR uses:
- **ERC20 stake token** (registry `token()`) — approvals required
- **Native token** (ETH on mainnet/sepolia, xDAI on Gnosis) — passed as `msg.value` for arbitration

### 7A) Submission (addItem)
Onchain call:
- `addItem(string itemURI, uint256 depositStake)` (payable)

You must provide:
1) **ERC20 stake (minimum + optional boost)**:
   - `submissionMinDeposit()` is a **minimum** stake requirement (read live).
   - Rule: `depositStake >= submissionMinDeposit()`
   - Submitters can optionally stake **more than the minimum**.

Why stake more?
- It’s a stronger onchain commitment: you’re putting more collateral behind the accuracy of your submission.
- In practice, higher stake can signal confidence/seriousness and make low-effort spam less attractive.

Hard rules:
- Never go below `submissionMinDeposit()`.
- If the user chooses a higher stake, confirm they understand it becomes part of their locked stake until withdrawal.
- user must `approve(registryAddress, depositStake)` on the ERC20
2) **Native msg.value**:
   - `arbitrationCost = arbitrator.arbitrationCost(extraData)`
   - send `msg.value = arbitrationCost`

Where to get `extraData`:
- Primary: GraphQL `registry.arbitrationSettings[0].arbitratorExtraData`
- Fallback: onchain `arbitrationParamsChanges(lastIndex)` (see Section 10)

### 7B) Challenge (challengeItem)
Onchain call:
- `challengeItem(bytes32 itemID, string evidenceURI)` (payable)

You must provide:
1) **ERC20 challenge stake** (contract pulls it; you must approve):
```text
challengeStake = item.stake * challengeStakeMultiplier / MULTIPLIER_DIVISOR
```
All three values must be read live (contract or subgraph + cross-check).

2) **Native msg.value**:
- `msg.value = arbitrator.arbitrationCost(extraData)`

### 7C) Appeal funding (fundAppeal)
Onchain call:
- `fundAppeal(bytes32 itemID, Party side)` (payable)

Compute required total for side:
- `appealCost = arbitrator.appealCost(disputeID, extraData)`
- Determine `feeStakeMultiplier` based on current ruling (Accept/Reject/None) and which side you’re funding
- `requiredForSide = appealCost + appealCost * feeStakeMultiplier / MULTIPLIER_DIVISOR`
- `remaining = requiredForSide - amountPaidForSide` (from subgraph rounds)

Loser half-time rule:
- loser can only fund during first half of appeal period.

---

## 8) Transactions (ALL core interactions)

### A) Submit item
1. Query registry (GraphQL) → get params + metaEvidenceURI
2. Fetch policy (metaEvidence.metadata.fileURI / metadata.policyURI)
3. Fetch `metadata.columns` from MetaEvidence JSON
4. Build FULL `item.json` (columns+values)
5. Upload `item.json` → get `/ipfs/...`
6. Read `token()`, `submissionMinDeposit()`
7. Approve ERC20 stake
8. Compute `arbitrationCost` from arbitrator + extraData
9. Simulate/dry-run then call:
   - `addItem("/ipfs/...", depositStake)` with `msg.value = arbitrationCost`

### B) Challenge item
1. Fetch item details (GraphQL)
2. Compute `challengeStake` from live values
3. Approve ERC20 `challengeStake`
4. Build/upload evidence JSON (ERC-1497) → `/ipfs/...`
5. Compute `arbitrationCost`
6. Simulate then call `challengeItem(itemID, evidenceURI)` with `msg.value = arbitrationCost`

### C) Submit evidence
- Upload evidence JSON → call `submitEvidence(itemID, evidenceURI)`

### D) Fund appeal
- Use Section 7C to compute `remaining`
- Simulate then call `fundAppeal(itemID, side)` with `msg.value = remaining` (or partial)

### E) Start withdrawal
- Call `startWithdrawItem(itemID)` (payable)
- If unsure about required `msg.value`, simulate first (some deployments may require native deposit handling).

### F) Execute withdrawal
- After `withdrawingPeriod` has passed, call `withdrawItem(itemID)` (payable)
- Simulate first.

### G) Withdraw fees & rewards
- Call `withdrawFeesAndRewards(beneficiary, itemID, challengeID, roundID)`
- Determine `(challengeID, roundID)` from subgraph challenge history.

---

## 8.1) Registry admin / governor actions (PermanentGTCR)

These actions are for the registry **governor** (list admin). Always simulate first.

### Update arbitration params + MetaEvidence (policy/schema upgrade)
- `changeArbitrationParams(bytes arbitratorExtraData, string metaEvidenceURI)`
  - Upload the new MetaEvidence JSON to IPFS first.
  - Use the returned `/ipfs/...` URI as `metaEvidenceURI`.
  - Remember `arbitrationParamsCooldown()` may delay activation; do not assume immediate effect.

### Update economic parameters
- `changeSubmissionMinDeposit(uint256)`
- `changeChallengeStakeMultiplier(uint256)`
- `changeWinnerStakeMultiplier(uint256)`
- `changeLoserStakeMultiplier(uint256)`
- `changeSharedStakeMultiplier(uint256)`

### Update periods
- `changeSubmissionPeriod(uint256)`
- `changeReinclusionPeriod(uint256)`
- `changeWithdrawingPeriod(uint256)`

### Update governor
- `changeGovernor(address)`

---

## 9) Creating a new PGTCR list (PermanentGTCRFactory)

Factory function:
```text
deploy(
  IArbitrator _arbitrator,
  bytes _arbitratorExtraData,
  string _metaEvidence,
  address _governor,
  IERC20 _token,
  uint256 _submissionMinDeposit,
  uint256[4] _periods,
  uint256[4] _stakeMultipliers
) returns (address instance)
```

### Steps
1. Ask chain + factory address (do not guess; accept explorer link)
2. Prepare MetaEvidence JSON (policy + metadata.columns) → upload to IPFS
3. Confirm params with user:
   - token address
   - submissionMinDeposit
   - periods: `[submissionPeriod, reinclusionPeriod, withdrawingPeriod, arbitrationParamsCooldown]`
   - stakeMultipliers: `[challengeStakeMultiplier, winnerStakeMultiplier, loserStakeMultiplier, sharedStakeMultiplier]`
4. Simulate `deploy`
5. Send tx; confirm `NewGTCR(instance)` event
6. Immediately query the new registry via GraphQL (once indexed) and also verify onchain reads

---

## 10) Onchain fallbacks (when GraphQL is down / lagging)

### A) Latest MetaEvidence
Use `eth_getLogs` filtering registry address with topic0 = `MetaEvidence(uint256,string)`.

### B) Arbitration extraData (PGTCR)
If you can’t rely on subgraph `arbitratorExtraData`, read from contract:
- `arbitrationParamsChanges(index)`
- Determine the latest active index (usually the last change whose `timestamp <= now - arbitrationParamsCooldown`).
- Use that `arbitratorExtraData` when calling arbitrator.

### C) Amounts paid for appeals
- Subgraph provides `amountPaidRequester/Challenger` and `hasPaidRequester/Challenger`.
- Onchain fallback:
  - `getRoundAmountPaid(itemID, challengeID, roundID)`

---

## Minimal ABI fragments (enough for operation)

### PermanentGTCR — minimal ABI
```json
[
  {"type":"function","name":"token","stateMutability":"view","inputs":[],"outputs":[{"type":"address"}]},
  {"type":"function","name":"submissionMinDeposit","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"submissionPeriod","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"reinclusionPeriod","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"withdrawingPeriod","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},

  {"type":"function","name":"arbitrator","stateMutability":"view","inputs":[],"outputs":[{"type":"address"}]},
  {"type":"function","name":"MULTIPLIER_DIVISOR","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"challengeStakeMultiplier","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"winnerStakeMultiplier","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"loserStakeMultiplier","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"sharedStakeMultiplier","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},

  {"type":"function","name":"items","stateMutability":"view","inputs":[{"type":"bytes32"}],"outputs":[
    {"name":"status","type":"uint8"},
    {"name":"arbitrationDeposit","type":"uint128"},
    {"name":"challengeCount","type":"uint120"},
    {"name":"submitter","type":"address"},
    {"name":"includedAt","type":"uint48"},
    {"name":"withdrawingTimestamp","type":"uint48"},
    {"name":"stake","type":"uint256"}
  ]},
  {"type":"function","name":"challenges","stateMutability":"view","inputs":[{"type":"bytes32"},{"type":"uint256"}],"outputs":[
    {"name":"arbitrationParamsIndex","type":"uint80"},
    {"name":"ruling","type":"uint8"},
    {"name":"roundCount","type":"uint8"},
    {"name":"challenger","type":"address"},
    {"name":"stake","type":"uint256"},
    {"name":"disputeID","type":"uint256"}
  ]},
  {"type":"function","name":"rounds","stateMutability":"view","inputs":[{"type":"bytes32"},{"type":"uint256"},{"type":"uint256"}],"outputs":[
    {"name":"sideFunded","type":"uint8"},
    {"name":"feeRewards","type":"uint256"}
  ]},
  {"type":"function","name":"contributions","stateMutability":"view","inputs":[{"type":"bytes32"},{"type":"uint256"},{"type":"uint256"},{"type":"address"},{"type":"uint256"}],"outputs":[{"type":"uint256"}]},

  {"type":"function","name":"addItem","stateMutability":"payable","inputs":[{"name":"_item","type":"string"},{"name":"_deposit","type":"uint256"}],"outputs":[]},
  {"type":"function","name":"challengeItem","stateMutability":"payable","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_evidence","type":"string"}],"outputs":[]},
  {"type":"function","name":"submitEvidence","stateMutability":"nonpayable","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_evidence","type":"string"}],"outputs":[]},
  {"type":"function","name":"fundAppeal","stateMutability":"payable","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_side","type":"uint8"}],"outputs":[]},
  {"type":"function","name":"startWithdrawItem","stateMutability":"payable","inputs":[{"name":"_itemID","type":"bytes32"}],"outputs":[]},
  {"type":"function","name":"withdrawItem","stateMutability":"payable","inputs":[{"name":"_itemID","type":"bytes32"}],"outputs":[]},
  {"type":"function","name":"withdrawFeesAndRewards","stateMutability":"nonpayable","inputs":[{"name":"_beneficiary","type":"address"},{"name":"_itemID","type":"bytes32"},{"name":"_challengeID","type":"uint120"},{"name":"_roundID","type":"uint256"}],"outputs":[]},

  {"type":"function","name":"getRoundAmountPaid","stateMutability":"view","inputs":[{"name":"_itemID","type":"bytes32"},{"name":"_challengeID","type":"uint256"},{"name":"_roundID","type":"uint256"}],"outputs":[{"name":"amountPaid","type":"uint256[3]"}]},
  {"type":"function","name":"arbitrationParamsChanges","stateMutability":"view","inputs":[{"type":"uint256"}],"outputs":[{"name":"timestamp","type":"uint48"},{"name":"arbitratorExtraData","type":"bytes"}]},
  {"type":"function","name":"arbitrationParamsCooldown","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]}
]
```

### PermanentGTCRFactory — minimal ABI
```json
[
  {"type":"event","name":"NewGTCR","inputs":[{"indexed":true,"name":"_address","type":"address"}],"anonymous":false},
  {"type":"function","name":"deploy","stateMutability":"nonpayable","inputs":[
    {"name":"_arbitrator","type":"address"},
    {"name":"_arbitratorExtraData","type":"bytes"},
    {"name":"_metaEvidence","type":"string"},
    {"name":"_governor","type":"address"},
    {"name":"_token","type":"address"},
    {"name":"_submissionMinDeposit","type":"uint256"},
    {"name":"_periods","type":"uint256[4]"},
    {"name":"_stakeMultipliers","type":"uint256[4]"}
  ],"outputs":[{"name":"instance","type":"address"}]}
]
```

### Arbitrator — minimal interface
```json
[
  {"type":"function","name":"arbitrationCost","stateMutability":"view","inputs":[{"name":"_extraData","type":"bytes"}],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"appealCost","stateMutability":"view","inputs":[{"name":"_disputeID","type":"uint256"},{"name":"_extraData","type":"bytes"}],"outputs":[{"type":"uint256"}]},
  {"type":"function","name":"appealPeriod","stateMutability":"view","inputs":[{"name":"_disputeID","type":"uint256"}],"outputs":[{"name":"start","type":"uint256"},{"name":"end","type":"uint256"}]},
  {"type":"function","name":"currentRuling","stateMutability":"view","inputs":[{"name":"_disputeID","type":"uint256"}],"outputs":[{"type":"uint256"}]}
]
```

---

## References (public)
- Curate UI: https://curate.kleros.io
- PGTCR repo: https://github.com/kleros/pgtcr
- GTCR UI repo (contains PGTCR UI flows + query patterns): https://github.com/kleros/gtcr
- Goldsky GraphQL endpoints docs: https://docs.goldsky.com/subgraphs/graphql-endpoints
- EIP-1497 evidence: https://eips.ethereum.org/EIPS/eip-1497
