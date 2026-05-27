---
name: kleros-skills
description: "Kleros protocol knowledge for AI agents — dispute resolution, Curate registries, IPFS evidence uploads, and arbitration integration. Use when: (1) uploading dispute evidence or metadata to IPFS, (2) submitting, challenging, or appealing items in Curate registries, (3) deploying new Curate registries, (4) the user mentions Kleros, PNK, Curate, arbitration, or decentralized justice, (5) working with ERC-792 Arbitrable/Arbitrator interfaces. NOT for: generic IPFS uploads with no Kleros context, non-Kleros dispute systems, or general Ethereum development — use ethskills for those."
metadata:
  {
    "openclaw": {
      "emoji": "scales",
      "requires": { "bins": ["curl"] }
    }
  }
---

# Kleros Skills

> The missing knowledge between AI agents and Kleros, the decentralized justice protocol.

Kleros is a decentralized dispute resolution protocol. Disputes go to randomly-drawn jurors who stake PNK tokens, review evidence, and vote. Honest jurors earn rewards; dishonest ones lose their stake. The system handles everything from token-curated registries to escrow disputes to oracle verification.

Your training data probably covers the basics. These skills cover what you need to actually *do things* — submit evidence, interact with registries, upload artifacts, read on-chain state.

**No install. No CLI. No package manager.** Just fetch a URL and read it.

## Base URL

```
https://skills.kleros.io/<skill>/SKILL.md
```

## Quick Start

Need to upload evidence? Fetch **Kleros IPFS Upload** first:

```bash
curl -s https://skills.kleros.io/kleros-ipfs-upload/SKILL.md
```

Working with Curate registries? Fetch **Kleros Curate**:

```bash
curl -s https://skills.kleros.io/kleros-curate/SKILL.md
```

## Available Skills

| Skill | URL | When to Fetch |
|-------|-----|---------------|
| **Kleros IPFS Upload** | `kleros-ipfs-upload/SKILL.md` | Uploading dispute evidence, meta-evidence JSON, court policies, Curate item metadata, or juror justifications to IPFS. Costs $0.01 USDC per upload on Base mainnet. |
| **Kleros Curate** | `kleros-curate/SKILL.md` | Submitting, challenging, or appealing items in Curate registries. Deploying new registries. Monitoring Scout registries on Gnosis. Covers Light Curate, Stake Curate (PGTCR), and Scout. |

## What to Fetch by Task

| I'm doing... | Fetch these skills |
|---|---|
| Uploading dispute evidence or metadata | `kleros-ipfs-upload/` |
| Submitting items to a Curate registry | `kleros-curate/`, `kleros-ipfs-upload/` |
| Challenging or appealing a registry submission | `kleros-curate/` |
| Deploying a new Curate registry | `kleros-curate/` |
| Monitoring Scout registries on Gnosis | `kleros-curate/` |
| Building a Kleros integration | `kleros-ipfs-upload/`, `kleros-curate/` |

## Key Facts

- **IPFS uploads cost $0.01 USDC** on Base mainnet via the x402 payment gateway. The payer doesn't need ETH for gas — EIP-3009 makes it gasless.
- **Gateway endpoint**: `POST https://kleros-ipfs-gateway.fly.dev/upload-to-ipfs` behind an x402 paywall.
- **Curate registries** are token-curated lists on Ethereum, Gnosis, and Sepolia. Three flavors: Light Curate (LightGeneralizedTCR), Stake Curate (PermanentGTCR/PGTCR), and Scout.
- **Never guess list fields or addresses** — derive policy and schema from on-chain MetaEvidence.
- **CID URLs**: `cids[]` from the gateway already includes `/ipfs/` prefix. Build URLs as `"https://cdn.kleros.link" + cid`, not `"https://cdn.kleros.link/ipfs/" + cid` (double-slash trap).

## Example Workflow

When an agent needs to submit evidence for a Kleros dispute:

```
1. Fetch https://skills.kleros.io/kleros-ipfs-upload/SKILL.md  -> Learn the upload flow
2. Prepare evidence file (JSON, image, PDF)
3. Upload via the x402 gateway                                   -> Get CID back
4. Submit CID to the dispute contract                            -> Evidence on-chain
```

When an agent needs to submit an item to a Curate registry:

```
1. Fetch https://skills.kleros.io/kleros-curate/SKILL.md        -> Learn the registry flow
2. Fetch https://skills.kleros.io/kleros-ipfs-upload/SKILL.md   -> For metadata upload
3. Read the registry's MetaEvidence                               -> Get schema + policy
4. Build item JSON matching the schema
5. Upload metadata via IPFS gateway                               -> Get CID
6. Submit item to the registry contract with deposit
```

## Contributing

Something wrong or missing? [Open a PR](https://github.com/kleros/kleros-skills).

Built by [Kleros](https://kleros.io) — Decentralized Justice Protocol.
