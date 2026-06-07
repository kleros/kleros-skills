# Curate Token Query Feedback — Pre-Refactor

Session: 2026-05-26 — querying DAMMeth ERC-20 submission status in Kleros Tokens registry using `curate-v1-scout/scout-skills.md`.

## Task

Find the status of an ERC-20 token submission named "DAMMeth" in the Kleros Tokens registry (`0xeE1502e29795Ef6C2D60F8D7120596abE3baD990`) on Gnosis, submitted within the last 3 days.

## What was tried, in order

### 1. Blockscout token lookup (fast, partial success)
Found DAMMeth on Ethereum mainnet via `lookup_token_by_symbol` — got the token address `0x3c63f3cE75dc83735745CF4e86B63414D95Ee355` immediately. But knowing the token exists on Ethereum doesn't tell you anything about its Curate registry status on Gnosis.

### 2. Blockscout transaction pagination (slow, brute force)
Fetched `get_transactions_by_address` on the Kleros Tokens registry for the last 3 days. The registry is very active — dozens of `addItem` calls per day, each generating 3 transaction records (external call + 2 internal). Each item required:
- A separate Blockscout API call to get tx details and decode the IPFS URI from calldata
- A separate IPFS fetch via WebFetch to read the item JSON
- Manual inspection for "DAMMeth"

Checked 7 items this way (WAKE, AAI, CLERK, HPX, TSG, KOJI, HOPPY) before giving up on this approach. At 30 submissions over 3 days, this would have taken ~15 round-trips.

### 3. Scout API (dead end)
The skill documents `POST https://scout-api.kleros.link/api/address-tags` as an optional research tool. Tried it with the DAMMeth token address — returned empty. Either it only covers Address Tags (not Tokens), or the item isn't indexed yet because it's still pending.

### 4. Subgraph query (auth wall)
Searched for the Light Curate subgraph on Gnosis. Found the subgraph ID (`9hHo5MpjpC1JqfD3BsgFnojGurXRHTrHWcUcZPPCo6m8`) on The Graph Explorer, but the gateway requires an API key. The free hosted service is deprecated. No public unauthenticated subgraph endpoint exists for this data.

### 5. Envio indexer (no response)
Tried an Envio BigDevEnergy endpoint pattern — got no useful response. Either the endpoint doesn't exist or uses a different schema.

### 6. Blockscout logs API (wrong parameter)
Tried `/api/v2/addresses/.../logs` with a `topic0` filter — Blockscout's v2 API rejected it as an unexpected field.

### 7. RPC `eth_getLogs` with wrong event topic (0 results)
First attempt used `ItemStatusChange` topic hash — got 0 results because the topic hash was wrong.

### 8. RPC `eth_getLogs` with correct `NewItem` topic (breakthrough)
After inspecting the actual event logs from a known tx via Blockscout, discovered the real event is `NewItem(bytes32 indexed _itemID, string _data, bool _addedDirectly)` with topic `0x93e4d3e9542ddd9eea8962241d920b12b96bce26749667189fd06ed3549019e1`. This returned all 30 submissions in one call, each with its IPFS URI embedded in the event data.

### 9. Bash batch-grep of IPFS files (final answer)
With all 30 IPFS URIs in hand, curled them all in a bash loop and grepped for "DAMMeth". Found it instantly.

### 10. On-chain status reads (clean)
Once the itemID was known, `getRequestInfo` + `challengePeriodDuration` worked cleanly via Blockscout `read_contract`.

## Root causes of difficulty

### A. No text search capability
The skill correctly documents: "Light Curate ABI is not good for arbitrary full-text discovery." But it doesn't offer a practical alternative. The skill mentions the Scout API endpoint, but that only covers Address Tags and doesn't index pending items.

### B. No subgraph endpoint provided
The skill hardcodes the View helper address and registry addresses, but doesn't include a subgraph endpoint — which is the standard way to search Curate items. The public hosted service is dead and the decentralized gateway needs an API key, so there's no free queryable index.

### C. The winning strategy isn't documented
The approach that actually worked — `eth_getLogs` filtering by `NewItem` event topic, then batch-fetching IPFS content — is not described anywhere in the skill. The skill documents `MetaEvidence` event retrieval in detail (section 4B) but never mentions `NewItem` as a searchable event for item discovery.

### D. Event topic hashes not provided
The skill provides the `MetaEvidence` event topic hash (`0x61606860...`) but not `NewItem`, `ItemStatusChange`, `RequestSubmitted`, or `Contribution` topics. Having these would have saved several round-trips.

### E. RPC reliability not addressed
The final query used `https://rpc.gnosischain.com` — the default public Gnosis RPC. It worked because the block window was narrow (~27k blocks) and only 30 events matched. Public RPCs often:
- Cap the block range they'll scan (e.g. 10k blocks max)
- Limit the number of returned logs
- Timeout on wide ranges with many events
- Rate-limit or return empty results silently

For a registry with 700k+ entries, a "last 3 days" query was manageable. But "find an item submitted 6 months ago" on a public RPC would almost certainly fail.

## Suggested skill improvements

### 1. Add a "discovery by search" section
Document the `NewItem` event topic and the `eth_getLogs` → batch-fetch-IPFS → grep pattern as the primary item discovery method.

### 2. Embed key event topic hashes
Like `MetaEvidence` topic already is. At minimum:
- `NewItem`: `0x93e4d3e9542ddd9eea8962241d920b12b96bce26749667189fd06ed3549019e1`
- `ItemStatusChange`: (needs to be computed from actual contract)
- `RequestSubmitted`: `0x73057048557c37c893f346985dc1d461cf12b00f09397bb275613203124c2be1`
- `Contribution`: `0x0388febb25c47b8b6fc7ecbe1dd210dfab59161d1d25992a642333d0792ab776`

### 3. Document subgraph access
Either embed a working endpoint or explicitly state "requires API key, not available in this skill." If Kleros has a preferred public subgraph or Envio endpoint, include it.

### 4. Clarify Scout API scope
Note which registries it covers (Address Tags only? all four?) and that pending items may not appear.

### 5. Add an item-lookup recipe
A step-by-step for "given a token name/address, find its itemID and status" since that's a very natural user query. Something like:
1. Query `eth_getLogs` with `NewItem` topic on the target registry
2. Decode IPFS URIs from event data
3. Batch-fetch and search IPFS content
4. Once itemID is found, call `getRequestInfo` for status

### 6. Block range strategy for `eth_getLogs`
- Recommend chunking into smaller windows (e.g. 10k blocks)
- Document which RPCs are reliable for log queries
- Suggest fallback order: subgraph first → `eth_getLogs` second → IPFS brute-force last

## Summary

The skill is excellent for **submitting** items (sections 7-14) but weak for **finding/querying** existing items. The submission workflow is thorough and well-documented. The discovery/lookup workflow is the gap this session exposed.
