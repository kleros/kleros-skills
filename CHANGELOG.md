# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-05-27

### Added
- Published `kleros-curate` skill — consolidated from three draft skills (Curate Light, Stake Curate/PGTCR, Curate Scout) into a single skill covering all three Curate flavors.

### Changed
- Renamed plugin from `kleros-ipfs-upload` to `kleros-skills` (multi-skill plugin).
- Landing page: replaced three "Coming Soon" draft cards with a single published Kleros Curate card.

## [1.1.0] - 2026-05-26

### Added
- Upload file size limit (4 MiB) enforced before payment, preventing wasted USDC on oversize requests.

### Changed
- Renamed plugin from `kleros` to `kleros-ipfs-upload` to match the skill directory name.
- Bundled scripts reframed as optional — agents with existing x402 tooling can skip them entirely.

### Removed
- Deprecated `pinToGraph` parameter from skill and bundled scripts (gateway no longer supports it).
- Redundant `version` field from marketplace.json plugin entries (plugin.json is the single source of truth).

## [1.0.0] - 2026-05-19

### Added
- Initial release of the `kleros-ipfs-upload` skill.
- x402-paid IPFS uploads via `https://kleros-ipfs-gateway.fly.dev/upload-to-ipfs`.
- Bundled `pay-and-upload.ts` script for raw EVM private key wallets.
- Bundled `pay-and-upload-cdp.ts` script for Coinbase CDP server accounts.
- Claude Marketplace plugin configuration (`.claude-plugin/`).

[2.0.0]: https://github.com/kleros/kleros-skills/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/kleros/kleros-skills/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/kleros/kleros-skills/releases/tag/v1.0.0
