# Curate Token Query Feedback (POST-refactor)

## Task

Find the status of an ERC-20 tag named "DAMMeth" submitted in the last 3 days on the Scout Kleros Tokens registry.

## What worked

- **Skill routing** was correct: "ERC-20 tag" + "Scout" -> Kleros Tokens registry at `0xeE1502...` on Gnosis (chainId 100)
- **Subgraph query** for bulk item listing was fast once found
- **Sequential IPFS fetch** reliably decoded item.json content
- **Final detail query** (subgraph for dispute state + IPFS for full payload) was clean

## What failed or was painfully slow

1. **Blockscout transaction-by-transaction scanning** (first attempt) -- fetched `addItem` transactions one page at a time, then called `get_transaction_info` on each to extract the IPFS CID, then fetched each CID from IPFS to read the token name. This took **4 rounds of tool calls** just to check 7 items. At the volume of submissions this registry gets (~50 in 3 days), this approach would never scale.

2. **Subgraph `data_contains` filter** -- tried `data_contains: "DAMMeth"` hoping the subgraph stored decoded item content. It doesn't -- `data` is just the IPFS URI string (`/ipfs/Qm...`). The subgraph has **no searchable field for item content** (no `props`, no decoded values).

3. **Parallel IPFS batch fetch** -- launched 50 concurrent `curl` requests against `cdn.kleros.link`. All returned empty -- likely rate-limited or the shell pipe structure broke. Had to fall back to sequential fetching in batches of 10-20.

4. **No name-based search path exists** -- there is no API surface (subgraph, scout-api, or contract view) that lets you search by token name/symbol. The only path is: enumerate items -> fetch each IPFS payload -> string match. This is O(n) in the number of items.

## Root causes (skill gaps)

| Gap | Impact |
|-----|--------|
| Skill has no guidance on querying/searching items | The skill covers submission, challenge, and deposit workflows but says nothing about how to *find* or *search* existing items by content |
| No subgraph query patterns | The subgraph endpoint and entity schema (`litems`, `litem`, field names, entity ID format) had to be guessed. The skill mentions "Goldsky subgraph" for PGTCR but gives no LGTCR subgraph endpoint or query examples |
| No mention of content-search limitations | The skill should warn that item content lives on IPFS, not in the subgraph, so name-based lookups require IPFS fetches |
| scout-api underspecified | The `scout-api` section only documents one endpoint (`POST /api/address-tags` for address lookup). No endpoint for searching by token name/symbol, if one exists |
| Missing "read item" workflow | The action index has Submit, Challenge, Remove, Evidence, Appeal -- but no "Query item status" or "Search registry" workflow |

## What the skill should add

1. **"Query / search items" workflow** -- a first-class action in the action index, covering: subgraph endpoint, entity schema, common query patterns (by itemID, by status, by time range, by registry address)
2. **Subgraph reference** -- LGTCR subgraph URL, entity ID format (`<itemID>@<registryAddress>`), available fields, known limitations (no decoded content search)
3. **Content search pattern** -- explicit guidance: "To search by item content (token name, symbol, address label), enumerate items from subgraph then batch-fetch IPFS payloads. There is no indexed content search."
4. **scout-api coverage** -- document all available endpoints, or state explicitly that name-based search isn't supported

## Conclusion

The skill is excellent for *write* operations but essentially blind for *read* operations. An agent asked "what's the status of X?" has to improvise the entire lookup path.
