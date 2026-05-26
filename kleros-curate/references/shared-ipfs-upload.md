# Shared: IPFS Upload Guidance
<!-- Source: kleros-ipfs-upload/SKILL.md, CONTEXT.md D-07, D-08 -->

## Contents
- Durability rationale (why third-party pins can vanish)
- Recommended path: kleros-ipfs-upload skill
- /ipfs/<CID> format rule (no double-slash)
- Agent autonomy note

## Durability rationale
<!-- Source: CONTEXT.md D-07 -->
Third-party pins can vanish after on-chain anchoring. Kleros-operated pins have strong incentive to stay live since the protocol depends on these artifacts.

## Recommended path: kleros-ipfs-upload skill
<!-- Source: kleros-ipfs-upload/SKILL.md lines 36-48 -->
[Phase 2 content here — reference the kleros-ipfs-upload skill; frame as "recommended for durability" not "required" per D-08]

## /ipfs/<CID> format rule
<!-- Source: kleros-ipfs-upload/SKILL.md lines 183-191 -->
cids[] from the gateway already includes the `/ipfs/` prefix (e.g. `/ipfs/QmXXX...`). Build CDN URLs as `"https://cdn.kleros.link" + cid` — never `"https://cdn.kleros.link/ipfs/" + cid` (double-slash trap). Use `urls[]` field directly when available to avoid the trap entirely.

## Agent autonomy note
<!-- Source: CONTEXT.md D-08 -->
[Phase 2 content here — frame as recommended for durability, agents are free to use their own IPFS mechanism]
