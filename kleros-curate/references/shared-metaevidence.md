# Shared: MetaEvidence Retrieval
<!-- Source: curate-v1/curate-light-skill.md §1-§2, curate-v1-scout/scout-skills.md §4+§6, curate-v1/pgtcr-stake-curate-skill.md §1 -->

## Contents
- RPC log method (eth_getLogs, topic0)
- Sort + take-latest rule
- Two-stream classification (LGTCR registration vs clearing MetaEvidence IDs)
- PGTCR GraphQL path (Goldsky primary, onchain fallback)
- MetaEvidence JSON parsing
- Policy URI extraction

## RPC log method (eth_getLogs)
<!-- Source: curate-v1/curate-light-skill.md §1 -->
[Phase 2 content here — topic0 = keccak256("MetaEvidence(uint256,string)"), filter by contract address]

## Sort and take-latest rule
<!-- Source: curate-v1/curate-light-skill.md §2A -->
[Phase 2 content here — sort logs by blockNumber descending, take first result]

## Two-stream classification (LGTCR)
<!-- Source: curate-v1/curate-light-skill.md §2B -->
[Phase 2 content here — registration MetaEvidence ID vs clearing MetaEvidence ID]

## PGTCR GraphQL path (Goldsky)
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §1 -->
[Phase 2 content here — Goldsky subgraph primary, onchain eth_getLogs fallback]

## MetaEvidence JSON parsing
<!-- Source: curate-v1/curate-light-skill.md §2C -->
[Phase 2 content here — fetch IPFS URI, parse JSON, extract columns and fileURI]

## Policy URI extraction
<!-- Source: curate-v1/curate-light-skill.md §2D, curate-v1-scout/scout-skills.md §6 -->
[Phase 2 content here — fileURI in MetaEvidence JSON points to the policy/rules document]
