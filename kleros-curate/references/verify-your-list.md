# Verify Your List
<!-- Sources: live Gnosis Chain state and MetaEvidence for the canonical Gnosis verification registry; repository LGTCR references -->

Use this file when a user wants a Curate registry deployed on Gnosis to become visible and verified in the
Curate frontend. This is a narrow Gnosis-specific overlay on the standard Light Curate submission workflow,
not a separate contract flavor.

List verification is recommended for public registries. Skip it only when the registry is intentionally
private or stealth.

## Canonical Gnosis verification registry

| Network | Chain ID | Registry | Contract type | Address |
|---------|----------|----------|---------------|---------|
| Gnosis Chain | `100` | Gnosis Verified Registries | `LightGeneralizedTCR` | `0x2418D887d0d0Fe03b793A6aF4321fa488226A0b5` |

This reference documents Gnosis only. Never reuse this address on another chain or infer a Mainnet or testnet
verification registry from it.

Start verification-registry event scans at deployment block `47081664` and continue through `latest`.

Keep these two addresses distinct throughout the workflow:

- `verificationRegistryAddress` — the fixed address above; this is the transaction target.
- `registryToVerify` — the user's deployed Gnosis registry; this is a value inside the submitted item.json.

The verification registry is LGTCR even when `registryToVerify` is a Stake Curate or other policy-eligible
Curate registry. Contract mechanics are determined by the transaction target, so always use the Light Curate
submission path described below.

## Required references

Read these files before preparing a verification submission:

1. `light-curate.md` — LGTCR discovery, submission, simulation, and request lifecycle.
2. `shared-metaevidence.md` — latest applicable registration MetaEvidence and policy retrieval.
3. `shared-item-json.md` — exact-schema item.json construction and validation.
4. `shared-ipfs-upload.md` — durable upload and IPFS round-trip verification.
5. `shared-deposits.md` — live LGTCR deposit computation.
6. `shared-abi-fragments.md` — LGTCR read/write signatures when building calldata.

Do not cache a MetaEvidence ID, schema, policy, deposit, or item URI in this file. The registry governor can
change them; the latest applicable onchain state is authoritative.

## Standard Light Curate verification flow

1. **Confirm scope and address roles**:
   - target chain is Gnosis (`chainId = 100`).
   - `verificationRegistryAddress` exactly matches the canonical address above.
   - `registryToVerify` is the deployed registry the user wants listed, not the transaction target.
2. **Verify both addresses on Gnosis**:
   - require non-empty `eth_getCode` for both addresses.
   - confirm `verificationRegistryAddress` exposes the LGTCR hallmark reads from `light-curate.md` and the
     `addItem(string)` interface from `shared-abi-fragments.md`.
   - do not require `registryToVerify` to be LGTCR; determine its type separately and let the live
     verification policy decide whether it is eligible.
3. **Fetch the latest registration MetaEvidence** from `verificationRegistryAddress` using
   `shared-metaevidence.md`. Fetch and read its `fileURI` policy, then extract `metadata.columns` verbatim.
   Do not assume the deployment-time MetaEvidence is still current.
4. **Check policy compliance and duplicates** for `registryToVerify`. Validate every live policy requirement.
   When duplicate entries are forbidden, use onchain state rather than a frontend-only search:
   - scan `NewItem` logs from block `47081664` through `latest` and decode every item ID and item URI.
   - fetch each item JSON and compare its schema-designated registry address to `registryToVerify` after
     case-insensitive EVM address normalization. The item ID is derived from the item URI, so checking one
     guessed item ID cannot rule out the same address under another CID.
   - for every address match, call `getItemInfo` and the latest `getRequestInfo` as described in
     `light-curate.md`. Decode the LGTCR status using `shared-abi-fragments.md`; do not guess numeric enum
     values. Treat a registered item or an unresolved request as an existing or active submission.
   - if an indexer or frontend search is used for convenience, cross-check it against the onchain log scan.
   Stop if compliance or duplicate status cannot be established.
5. **Build item.json** using `shared-item-json.md`:
   - deep-copy the live `metadata.columns` without edits.
   - put `registryToVerify` in the unique field designated by the live schema for the registry address.
   - make `Object.keys(values)` exactly match the column labels and order.
   - stop if the schema does not unambiguously identify where the registry address belongs.
6. **Get approval before the paid upload**. Show the live policy summary, fetched columns, compliance check,
   duplicate check, and complete item.json. Upload only after the user confirms it.
7. **Upload and round-trip item.json** using `shared-ipfs-upload.md`. The resulting item URI must be
   `/ipfs/<CID>` and must fetch back to the approved JSON.
8. **Compute the LGTCR submission value live** using `shared-deposits.md`, then simulate this exact call on
   Gnosis:

   ```text
   to: verificationRegistryAddress
   call: LightGeneralizedTCR.addItem("/ipfs/<CID>")
   msg.value: live LGTCR submission value
   ```

9. **Get final onchain approval**. Show both named addresses, chain ID, item URI, live deposit inputs, final
   `msg.value`, and successful simulation result. Submit only after the user approves.
10. **Verify the receipt and track the request**. Confirm the emitted item data resolves to the approved JSON
    and record the item ID and request state. A successful submission is pending, not yet verified.
11. **Finalize and confirm visibility**. After an unchallenged challenge period, simulate and call
    `executeRequest(itemID)`, then confirm the item is registered onchain. Check the accepted item in
    `https://curate.kleros.io/tcr/100/0x2418D887d0d0Fe03b793A6aF4321fa488226A0b5` and confirm the listed
    registry is discoverable in the frontend. If onchain state is registered but the UI has not caught up,
    report frontend indexing as pending and do not resubmit. If challenged, follow the LGTCR dispute workflow.
    Never claim verification is complete from the submission receipt alone or invent an indexing ETA.

## Stop conditions

Stop instead of uploading or submitting if:

- the target chain is not Gnosis or is unclear.
- either address is missing, has no code on Gnosis, or its role is ambiguous.
- the fixed verification target does not behave as `LightGeneralizedTCR`.
- the latest registration MetaEvidence or policy cannot be fetched and parsed.
- `registryToVerify` does not clearly satisfy the live policy.
- an accepted or active duplicate exists, or duplicate status cannot be established when the policy forbids it.
- the live schema is missing or does not unambiguously accept `registryToVerify`.
- item.json validation or its IPFS round trip fails.
- the live deposit cannot be computed or the exact `addItem(string)` simulation fails.
- the user has not approved the paid upload and the final onchain transaction.
