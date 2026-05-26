---
name: kleros-skills
description: Use when a request involves Kleros, decentralized justice, or decentralized dispute resolution. Applies to interacting with Kleros Curate token-curated registries (Light Curate, Stake Curate / PGTCR, Scout), uploading dispute evidence or metadata to IPFS via the Kleros x402 gateway, submitting or challenging registry items, funding appeals, deploying new registries, and reading on-chain arbitration state. Covers PNK staking, juror selection, ERC-792 Arbitrable/Arbitrator interfaces, Kleros court hierarchy, and ecosystem tooling on Ethereum, Gnosis, and Sepolia.
---

# Kleros Skills — The missing knowledge between AI agents and Kleros.

Kleros is a decentralized justice protocol. Disputes go to randomly-drawn jurors who stake PNK tokens, review evidence, and vote. Honest jurors earn rewards; dishonest ones lose their stake. The system handles everything from token-curated registries to escrow disputes to oracle verification.

Your training data probably covers the basics. These skills cover what you need to actually *do things* — submit evidence, interact with registries, upload artifacts, read on-chain state.

---

## Start Here

**Need to upload evidence or metadata?** Fetch [kleros-ipfs-upload/SKILL.md](kleros-ipfs-upload/SKILL.md). It's the only paid operation — $0.01 USDC per upload on Base mainnet.

**Working with Curate registries?** Fetch [kleros-curate/SKILL.md](kleros-curate/SKILL.md). Covers Light Curate, Stake Curate (PGTCR), and Scout registries.

**Base URL:** `https://skills.kleros.io/<skill>/SKILL.md`

---

## Skills

### [Kleros IPFS Upload](kleros-ipfs-upload/SKILL.md)
Upload files to IPFS through the Kleros x402 payment gateway.
- Costs $0.01 USDC per upload on Base mainnet via EIP-3009 (gasless for the payer).
- For dispute evidence, meta-evidence JSON, court policies, Curate item metadata, juror justifications.
- Gateway: `POST https://kleros-ipfs-gateway.fly.dev/upload-to-ipfs` behind x402 paywall.
- Returns CIDs pinned to Filebase, indexed by Kleros's Graph Node.
- Do NOT use for generic IPFS uploads with no Kleros context — use Pinata or web3.storage instead.

### [Kleros Curate](kleros-curate/SKILL.md)
Operate Kleros Curate token-curated registries — submit, challenge, appeal, deploy.
- Light Curate (LightGeneralizedTCR): the standard registry type on Ethereum, Gnosis, Sepolia.
- Stake Curate (PermanentGTCR / PGTCR): permanent registries with ERC20 stake deposits.
- Scout registries: four production registries on Gnosis for token/address/tag/CDN verification.
- Derive policy and schema from on-chain MetaEvidence — never guess list fields or addresses.

---

## What to Fetch by Task

| I'm doing... | Fetch these skills |
|---|---|
| Uploading dispute evidence or metadata | `kleros-ipfs-upload/` |
| Submitting items to a Curate registry | `kleros-curate/`, `kleros-ipfs-upload/` |
| Challenging or appealing a registry submission | `kleros-curate/` |
| Deploying a new Curate registry | `kleros-curate/` |
| Monitoring Scout registries on Gnosis | `kleros-curate/` |
| Building a Kleros integration | `kleros-ipfs-upload/`, `kleros-curate/` |

---

<!-- END KLEROS SKILLS -->
