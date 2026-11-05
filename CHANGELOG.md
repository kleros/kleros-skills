# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.5.0] - 2026-11-05

### Added
- Published `kleros-create-dispute`, a standalone Kleros V2 skill that creates a dispute (arbitration case) through the deployed `DisputeResolver` on Arbitrum One (production) or Arbitrum Sepolia (rehearsal), then prepares evidence for it. Its bundled helper validates, prices and prepares transactions for the user's wallet to send — it never signs or broadcasts. Commands: `validate`, `quote`, `preflight` (`--human` for the user-facing review), `prepare`, `simulate`, `evidence`, `receipt`.
- Dispute creation flow: mandatory Kleros IPFS policy upload (paid separately in Base USDC via `kleros-ipfs-upload`), deterministic template validation, on-chain deployment checks before any quote (bytecode, `DisputeResolver.arbitrator()`, court enabled, dispute kit supported, Arbitrum One arbitrable whitelist), live arbitration fee with an optional `--max-fee` cap (arbitration fee only, not gas; `prepare --max-fee` blocks a fee rise after approval), allowlisted calldata, simulation, and dispute ID / case URL / evidence group from the `DisputeCreation` receipt. Gas is estimated with EIP-1559 fees and reported as `maxFeePerGasWei` (an upper bound).
- The juror ballot, not just the template, is what `preflight` renders: ruling `0` ("Refuse to Arbitrate / Invalid") first, then the template answers under their ruling IDs. The Court adds that option to every case, so `validate` rejects a template that offers a refuse or invalid answer of its own. Juror-facing text containing `{{` or `}}` is rejected, because the Court renders it through mustache and would blank the case.
- Evidence support in the same skill: `evidence` prepares an `EvidenceModule.submitEvidence` transaction from a validated `{name, description, fileURI?}` document (the attachment is uploaded with `kleros-ipfs-upload`; the JSON travels inline). The evidence group it is keyed by is derived from the chain — the `DisputeRequest` event with `--creation-tx`, otherwise the resolver's `arbitratorDisputeIDToLocalID` mapping — because it is not the dispute ID the Court shows; the skill tells agents never to pass a group themselves. The dispute's court and period are read back so a wrong case or a late submission surfaces before signing. `receipt` flags `Evidence` payloads that are not JSON objects; with `--dispute <id>` it also states outright whether a submission is keyed to the group that case indexes.
- `evidence` and `receipt` pin the deployed EvidenceModule implementation (EIP-1967 slot) on both networks and refuse to prepare evidence on any other implementation, so an upgrade that re-keys `submitEvidence` cannot silently mis-key evidence.
- Every IPFS reference — `policyURI` and each evidence `fileURI` — must be a strict `/ipfs/<CID>` path and is fetched through `https://cdn.kleros.link`; it must resolve to non-empty content before any transaction is prepared. Fabricated CID-shaped references, `ipfs://` strings and unpinned content are hard failures.
- Machine-readable results: every command prints one JSON object with `ok`; blocking problems (would revert, balance too low, simulation failed, receipt reverted, evidence mis-keyed) are listed in `blocking` with exit code `2`; failures are `{"ok":false,"error","kind":"input|network|internal"}` with exit `1`; unknown, valueless or malformed flags exit `64`. RPC failures without a verdict are reported as `network`, never as "does not exist" or "would revert". RPC URLs and keys are redacted from errors.
- Known limitation, documented in `kleros-create-dispute`: under Claude Code's opt-in Linux Bash sandbox the helper can fail before doing anything (`listen EPERM … tsx …pipe`, or RPC/IPFS `fetch` failing with `EAI_AGAIN`). This is an environment failure, not a verdict on the case; the skill tells agents to ask for an unsandboxed retry and never to hand-build the transaction.

### Changed
- Updated the Ethereum Mainnet Curate list-verification registry to `0x2aCF59a420cA888f46d46974f62570F8a38Cd4Da` and its `NewItem` scan start block to that registry's deployment block (`25641005`).
- Root `SKILL.md` and the OpenClaw skill route dispute creation, and evidence on disputes created through `DisputeResolver`, to `kleros-create-dispute` (attachments still upload through `kleros-ipfs-upload`); README, landing page and `.well-known/agent-skills/index.json` descriptions mention evidence too.
- `.claude-plugin/marketplace.json` `metadata.version` bumped to 2.1.0 — the catalog's `kleros-skills` plugin entry now offers a new skill (`kleros-create-dispute`) and its description changed accordingly; no plugins were added or removed. `plugin.json` keywords gained `arbitrum`, `kleros-v2`, `dispute` and `evidence`.
- `.github/workflows/sync-master.yml` sanity check learned the new skill directory; `CLAUDE.md` records the workflow allowlist as a multi-surface publication target so future skills cannot break the release sync.
- `.gitignore` now ignores nested `node_modules/` so per-skill `scripts/` installs are never committed.
- Script dependencies are now locked for both skills: `kleros-ipfs-upload/scripts/package-lock.json` is committed (previously deliberately omitted) alongside `kleros-create-dispute/scripts/package-lock.json`, and both skills install with `npm ci`. Both scripts sign payments or build transactions, so their dependency trees must be reproducible; deps are bumped deliberately instead of drifting on every install. The create-dispute helper runs the locked `tsx` via `npm --prefix "${CLAUDE_SKILL_DIR}/scripts" exec -- tsx …` from any directory.

### Security
- `kleros-create-dispute/scripts`: zod 4.4.3 → 4.6.7 (GHSA-mrhx-c7xc-m3w5).
- `kleros-ipfs-upload/scripts`: migrated from `x402-fetch@1.2.0` (still the latest legacy release) to `@x402/fetch` + `@x402/evm` 2.29.0. The legacy package pulled browser wallet SDKs (`wagmi`, `@reown/appkit*`, `@walletconnect/*`, `@metamask/*`) into a Node CLI that holds `EVM_PRIVATE_KEY`, which brought 29 advisories with them (11 moderate, 18 high: `ws`, `decode-uri-component`, `uuid`, `zod`, `viem`, `abitype`). `npm audit --omit=dev` now reports 3 high, all one advisory, GHSA-mrhx-c7xc-m3w5 (zod 3 memory exhaustion). It is accepted as unreachable: zod 3 comes only from `@coinbase/cdp-sdk` (its policy-management schemas, used by `policies.create/update` and never called by the scripts) and from its pinned `abitype@1.0.6` (optional `abitype/zod` entry, never imported). The scripts' x402 payload validation uses zod 4.6.7 through `@x402/core`. No `overrides` were used: forcing zod 4 into `cdp-sdk` would break its semver contract for no reachable gain. The gateway still speaks x402 v1; the v2 client registers both the v1 (`base`) and v2 (`eip155:8453`) exact schemes and sends the same `X-PAYMENT` payload, which was checked against the previous client and by signature recovery.
- Both IPFS upload scripts (and the inline snippet in `kleros-ipfs-upload/SKILL.md`) now refuse to sign any payment that is not Base USDC or is over 0.10 USDC. This keeps the per-request cap `x402-fetch` 1.x applied by default; the v2 SDK's default cap is $1. The cap is enforced twice, both times on the amount the scheme actually signs for the challenge's x402 version (`maxAmountRequired` on v1, `amount` on v2): by the SDK's own `spendControls` (`maxAmountPerPayment: "$0.10"`) and by a Base-USDC-only policy that ignores any extra `maxAmountRequired` on a v2 challenge (a lower one there would otherwise pass the check while the signer authorizes `amount`). The policy also accepts only plain EIP-3009 authorizations (no Permit2, whose gas-sponsoring path can sign an unlimited USDC `approve`) with an integer `maxTimeoutSeconds` of at most one hour (the gateway asks for 300). Offline tests evaluate each cap on its own against the locked SDK and run `pay-and-upload.ts` against a local x402 stand-in.

## [2.4.0] - 2026-07-18

### Changed
- Improved Curate list deployment guidance with canonical MetaEvidence templates, known factory and arbitrator addresses, correct multiplier ordering, and reuse of identical IPFS artifacts.
- Migrated Ethereum Mainnet, Gnosis Chain, and Sepolia list verification to their canonical `LightGeneralizedTCR` registries and standard LGTCR item submission workflow.
- Clarified that each Kleros x402 request uploads exactly one file: identical bytes may reuse a CID, while different content requires separate paid uploads.
- README and landing page: skill card descriptions synced with the updated skill content (single-file-per-upload wording, deploy-and-verify phrasing, Sepolia network tag).

## [2.3.0] - 2026-07-07

### Added
- Tier 1 agent-to-maintainer feedback channel: `.github/ISSUE_TEMPLATE/agent-feedback.yml` (structured GitHub issue form, auto-applies the `agent-feedback` label) and a new `kleros-feedback` skill (`feedback/SKILL.md`) teaching agents how to file a report via Kleros MCP, `gh` CLI, or a prefilled GitHub URL fallback, in priority order.
- Feedback footers linking to `feedback/SKILL.md` added to every published/routing skill: root `SKILL.md`, `kleros-ipfs-upload`, `kleros-curate`, `openclaw-skill`.
- `feedback/SKILL.md` registered in `.well-known/agent-skills/index.json` and `sitemap.xml` for discovery parity with other published skills.

### Changed
- Landing page: simplified the Skills section meta line (dropped the redundant `/<name>/SKILL.md` path hint — the section intro already states it).

## [2.2.0] - 2026-06-29

### Added
- Landing page: visually-hidden `<h1>` (the page previously had no top-level heading), improving SEO and screen-reader structure.
- Landing page: social/discovery meta — `canonical`, `og:url`, `og:site_name`, `og:locale`, `og:image`, `twitter:image`, and `theme-color`.
- Landing page: sticky translucent top nav and subtle hero glow for depth.
- Landing page: `prefers-reduced-motion` support and a consistent `:focus-visible` ring for keyboard users.

### Changed
- Hardened the `kleros-curate` skill with stricter MetaEvidence retrieval, item.json construction, field type validation, deployment guardrails, and list-of-lists visibility guidance.
- Clarified `kleros-curate` Scout visibility, reward, challenge, and custom-registry value propositions.
- Restricted Curate IPFS upload guidance to the Kleros x402 gateway path and strengthened PDF policy recommendations.
- Added a narrow `verify-your-list` reference for Classic Curate list-of-lists visibility submissions.

### Fixed
- Landing page accessibility: modal now manages focus (focus-on-open, focus trap, restore-on-close) and is labelled by its title.
- Landing page accessibility: setup tablist exposes `tabpanel` semantics with arrow/Home/End keyboard navigation and roving tabindex.
- Landing page accessibility: ASCII-art hero marked `aria-hidden` so screen readers skip it.

## [2.1.0] - 2026-06-12

### Added
- Branch-based minimal-strip distribution (SEED-002): published `master` branch — what marketplace users install — now ships without `.planning/`, `test/`, `scripts/`, `package.json`, `yarn.lock`, `.yarnrc.yml`, and root-level `*FEEDBACK*.md` / `HANDOVER*.md` files. Install footprint is dramatically smaller.
- Landing page: 8 coming-soon cards previewing upcoming skills.

### Changed
- Documented `dev` (full repo) / `master` (derived clean tree) branch model in `README.md` and `CLAUDE.md`. All PRs target `dev`; `master` is regenerated by `.github/workflows/sync-master.yml` on release-tag push.

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

[Unreleased]: https://github.com/kleros/kleros-skills/compare/v2.5.0...HEAD
[2.5.0]: https://github.com/kleros/kleros-skills/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/kleros/kleros-skills/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/kleros/kleros-skills/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/kleros/kleros-skills/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/kleros/kleros-skills/releases/tag/v2.1.0
[2.0.0]: https://github.com/kleros/kleros-skills/compare/v1.1.0...v2.0.0
[kleros-curate@v1.0.0]: https://github.com/kleros/kleros-skills/releases/tag/kleros-curate@v1.0.0
[1.1.0]: https://github.com/kleros/kleros-skills/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/kleros/kleros-skills/releases/tag/v1.0.0
