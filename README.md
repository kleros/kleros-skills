# Kleros Skills

Knowledge base for AI agents working with [Kleros](https://kleros.io) — the decentralized justice protocol.

Adapted from [ethskills](https://github.com/austintgriffith/ethskills), credits to @austintgriffith

## Install

**Claude Code:**

```
/plugin marketplace add kleros/kleros-skills
/plugin install kleros-ipfs-upload@kleros-skills
```

**OpenClaw:**

```
clawhub install kleros-skills
```

**Codex:** Create `AGENTS.md` in your repo root with:

```
Read https://skills.kleros.io/SKILL.md and follow it before interacting with Kleros protocol.
```

**Any agent:** Paste the prompt `Read https://skills.kleros.io/SKILL.md` or `curl -s https://skills.kleros.io/SKILL.md`.

## Skills included

- **kleros-ipfs-upload** — Upload files to IPFS via the Kleros x402 gateway on Base mainnet ($0.01 USDC per upload). For dispute evidence, meta-evidence JSON, court policies, Curate item metadata, and juror justifications.
- **kleros-curate** — Operate Kleros Curate token-curated registries: Light Curate, Stake Curate (PGTCR), and Scout on Ethereum and Gnosis. Submit items, challenge requests, fund appeals, deploy new lists.

## Project structure

```
SKILL.md                    # Top-level entry point / router (also served as /llms.txt)
index.html                  # Landing page (deployed on Netlify)
kleros-ipfs-upload/         # Published skill — IPFS uploads via x402
kleros-curate/              # Published skill — Curate token-curated registries (Light Curate, Stake Curate, Scout)
openclaw-skill/             # OpenClaw-compatible skill package
.claude-plugin/             # Claude Code plugin manifest
  plugin.json               # Plugin definition (version source of truth)
  marketplace.json           # Catalog index
```

## Development

```bash
npm install
npm test
```

Landing page: `npx serve .` then open `http://localhost:3000`.

## Links

- [skills.kleros.io](https://skills.kleros.io) — Landing page
- [kleros.io](https://kleros.io) — Kleros protocol
- [GitHub](https://github.com/kleros/kleros-skills)
