---
task: 261103-pr5
type: code-review
target: PR #5 — kleros-create-dispute skill (feat/create-dispute-on-arbitrum @ 8bbab84)
reviewed: 2026-11-03
reviewer: Claude Code — 4 parallel subagents (protocol ground-truth, script code, skill best-practices, repo integration) + orchestrator spot-verification
status: open
findings_total: 47
blocker: 2
major: 7
minor: 22
nit: 16
---

# Quick Task 261103-pr5: Deep review of PR #5 (`kleros-create-dispute`)

**PR:** https://github.com/kleros/kleros-skills/pull/5 — author fortuvp, base `dev`, 2 commits, 19 files, +2200/−15
**Ground truth:**
- `kleros/kleros-v2` **master @ 338cafc** (deployment JSONs, contracts). `dev @ 38d778a` consulted for *upcoming* changes only.
- Mintlify Kleros docs MCP (`/reference/contracts/deployment-addresses`, `/reference/data-formats/dispute-templates`, `/developers/subgraph/queries`, `/reference/sdk/kleros-sdk`, `/court/court-hierarchy`)
- On-chain reads via Blockscout (Arbitrum One 42161); read-only script runs vs Arbitrum Sepolia
- Anthropic skill guidance (fetched 2026-11-03): [BP] platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices · [OV] …/agent-skills/overview · [CC] code.claude.com/docs/en/skills · [SC] skill-creator SKILL.md

**Verdict:** request changes. No fund-loss path vs today's deployments. B-01/B-02 = irreversible-harm risks (unreadable case; evidence mis-keyed). Rest = robustness, docs, polish.

Line refs = PR head 8bbab84. Paths relative to repo root; `PD` = `kleros-create-dispute/scripts/prepare-dispute.ts`.

## Severity buckets

| Severity | Definition |
|---|---|
| 🔴 Blocker | Can permanently break a case or misroute evidence. Fix before merge. |
| 🟠 Major | Silent safety-signal loss, contradictions agents will act on, missing test/eval coverage. Fix before merge. |
| 🟡 Minor | Robustness / docs / bookkeeping. Fix before release tag. |
| 🟢 Nit | Optional polish. |

## Tracking checklist

Mark `[x]` + commit SHA when addressed; `[~]` = won't fix (state reason inline).

### 🔴 Blockers
- [x] **B-01** Mustache injection in template strings → unreadable case — 7f58b66
- [x] **B-02** EvidenceModule upgrade will mis-key evidence (no impl pin) — 7f58b66

### 🟠 Major
- [x] **M-01** Flag parser silently drops valueless/unknown flags (`--max-fee` cap lost) — 7f58b66
- [x] **M-02** Doomed tx / reverted / mis-keyed paths exit 0; signals buried — 7f58b66
- [x] **M-03** IPFS URI regex looser than SDK `isMultiaddr` — 7f58b66 (+ encoded-dot bypass D-1 closed in follow-up commit)
- [x] **M-04** No structured errors; `--help` exits 1; RPC key may leak via viem errors — 2fecec8
- [ ] **M-05** `case-format.md` contradicts SKILL.md (evidence) + overstates `validate`
- [x] **M-06** Tests never execute the script — this commit
- [ ] **M-07** No evals (trigger / should-not-trigger / behavioural)

### 🟡 Minor
- [x] **m-01** Whitelist check fails open on any read error — 7f58b66
- [x] **m-02** RPC errors misreported as "court does not exist" / "dispute does not exist" — 2fecec8
- [ ] **m-03** Overpayment semantics undocumented (excess buys jurors, not refunded)
- [ ] **m-04** Testnet Court URL non-canonical
- [x] **m-05** zod 4.4.3 — GHSA-mrhx-c7xc-m3w5 (high) — 927a17c (→ 4.6.7)
- [x] **m-06** Lockfile policy inconsistent / undocumented; `npm install` vs `npm ci` — 927a17c (decision 2026-11-04: lockfiles committed for both skills; only recorded prior rationale was "so dep versions stay fresh", `045c0d6`)
- [x] **m-07** Numeric inputs not normalised (`courtId "01"`, `--dispute 0x10`, tx hash format) — 7f58b66
- [x] **m-08** IPFS check proves resolve, not content; body never consumed — 2fecec8
- [x] **m-09** Size limits in UTF-16 units, not bytes — 2fecec8
- [x] **m-10** `simulate` checks `--from` after all network calls; `--max-fee` parsed late — 2fecec8
- [x] **m-11** `validate` silently defaults to mainnet — 2fecec8
- [ ] **m-12** Shared evidence group across arbitrables not flagged
- [ ] **m-13** Evidence `description` allows empty
- [ ] **m-14** Script path assumes cwd — use `${CLAUDE_SKILL_DIR}`
- [ ] **m-15** No copyable progress checklist in Flow
- [ ] **m-16** Missing "run exactly / don't edit calldata" low-freedom wording
- [ ] **m-17** Evidence submission not routable from surfaces
- [ ] **m-18** CHANGELOG lacks `[2.5.0]` section + compare link
- [ ] **m-19** `CLAUDE.md:9` "Published:" not updated
- [x] **m-20** `skill-surfaces.test.js` gaps (substring match, no index.html/marketplace/CHANGELOG) — this commit
- [x] **m-21** No top-level catch; `--evidence` JSON.parse unfriendly — 2fecec8
- [ ] **m-22** Description: missing trigger synonyms / "pushy" clause

### 🟢 Nits
- [ ] **n-01** Ruling-0 wording partly wrong (SDK replaces `0x0`, doesn't duplicate)
- [ ] **n-02** Sources links point to dev `DisputeResolver.sol`, not deployment ABIs
- [ ] **n-03** Ruling-0 rationale repeated 3×; step-4 list duplicates `preflight --human`
- [x] **n-04** Voodoo constants (`QUOTE_TTL_MS`, 25 s IPFS timeout) — 2fecec8
- [ ] **n-05** No "When NOT to use" / "Example" sections (sibling parity)
- [ ] **n-06** `../` cross-skill links assume full plugin install
- [x] **n-07** Title dedupe locale-dependent; no NFKC / zero-width stripping — 2fecec8
- [x] **n-08** `question.endsWith("?")` rejects `؟` — 2fecec8
- [x] **n-09** `--human yes` swallows value → JSON output
- [x] **n-10** Node shebang on non-executable `.ts` — 2fecec8
- [x] **n-11** Legacy `getGasPrice` vs EIP-1559 — 2fecec8
- [ ] **n-12** marketplace `metadata.version` 2.1.0 justification conflates skills vs plugins
- [ ] **n-13** `plugin.json` keywords lack `arbitrum`/`v2`
- [ ] **n-14** Landing card "Testnet" tag undersells mainnet target
- [x] **n-15** Reserved-ruling test redeclares regex instead of importing
- [ ] **n-16** `--max-fee` caps arbitration fee only, not gas — document

---

## 🔴 Blockers

### B-01: Mustache tags in case text → permanently unreadable case
**File:** `PD:102-119` (schema), `PD:163-207` (validate) · **Verified by orchestrator** (repro below)
**Problem:**
- Court renders template via `mustache.render` → `JSON.parse` → zod (`kleros-sdk/src/dataMappings/utils/populateTemplate.ts:6-12`, master).
- Unbalanced `{{` throws; `web/src/hooks/queries/usePopulatedDisputeData.ts:72-81` catches → returns `{}` → jurors see empty case. `{{name}}` silently erased. Immutable after creation.
- Repro: description `"Price is {{oops and more"` → `validate` exit 0; mustache → `Unclosed tag at 23`. Also `{{#a}}x` → `Unclosed section`.
**Fix:** reject `{{` / `}}` in every string field (mappings always `""`). Better: run SDK `populateTemplate(templateJson, {})` (or mustache + `DisputeDetailsSchema`) in `validate`/`preflight`. Add regression fixtures.

### B-02: EvidenceModule upgrade will silently mis-key evidence
**File:** `PD:76-83, 579-606, 677`; `SKILL.md:114-129`
**Problem:**
- Today correct: master/deployed `submitEvidence(uint256 _externalDisputeID, string)` (`contracts/src/arbitration/evidence/EvidenceModule.sol:67` master; `deployments/arbitrum/EvidenceModule.json`); script sends `arbitratorDisputeIDToLocalID`.
- `dev` changes to `submitEvidence(uint256 _arbitratorDisputeID, …)` (`EvidenceModule.sol:63` dev); `subgraph/core/src/EvidenceModule.ts:9`, `web/.../SubmitEvidenceModal.tsx:95` already key by core ID.
- EvidenceModule = UUPS proxy (`0x48e0…1EB3`, impl `0xA502…92C8` confirmed on-chain). Upgrade at same address → script keeps sending local ID → evidence lands on another case; script's "keyed to expected group" check still passes.
**Fix:** pin expected implementation per network (read EIP-1967 slot `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`), refuse on mismatch with message pointing to skill update. Add version/date caveat in SKILL.md.

## 🟠 Major

### M-01: Flag parser drops valueless / unknown flags — fee cap silently lost
**File:** `PD:850-866` · **Verified by orchestrator**
- `--max-fee` with no value → stored `true` → `optional()` returns `undefined` → no cap, exit 0.
- `--maxfee 0.01`, `--bogus 1` accepted silently.
**Fix:** per-command flag allowlist; reject unknown; error when value-flag lacks value; parse `--max-fee` up-front (today `parseEther("abc")` throws only after network+IPFS calls).

### M-02: Doomed-tx signals exit 0 and are buried
**File:** `PD:384-405` (preflight), `PD:779-791` (receipt)
- Gas estimation failure → `status: REVIEW_ONLY_NOT_SUBMITTED`, exit 0, no `warnings` entry; `sufficientBalance:false` not surfaced (tested with 0-ETH wallet).
- `receipt` exits 0 on `status:"reverted"` and MIS-KEYED evidence; only free-text `note`.
**Fix:** top-level `ok` + `blocking[]`; push to `warnings`; non-zero exit on reverted / MIS-KEYED / would-revert.

### M-03: IPFS URI regex looser than SDK
**File:** `PD:119-126`
- Script: `(?:\/.*)?` → accepts whitespace, trailing `/`, `..`, `?`, `#`, empty segments. Tested: `"/ipfs/QmPolicy/../../evil path"` passes.
- SDK `isMultiaddr` (`kleros-sdk/.../disputeDetailsSchema.ts:7-11`): `(\/[^\s/]+)+$`. Mismatch → template fails zod → `{}` (same harm as B-01).
**Fix:** `^\/ipfs\/[A-Za-z0-9]+(\/[^\s/?#]+)*$`, reject `..`.

### M-04: No structured error output
**File:** `PD:950` + all throws
- Raw Node stack + source excerpt + full USAGE on stderr; `--help`/no args → `unknown command`, exit 1.
- zod/viem internals dumped; viem `HttpRequestError` includes RPC URL → API key may leak to agent logs.
**Fix:** `main()` try/catch → `{"ok":false,"error":…}`; redact URL; distinct exit code for usage errors; `--help`/`-h` exit 0.

### M-05: `case-format.md` contradicts SKILL.md and overstates `validate`
**File:** `kleros-create-dispute/references/case-format.md:55-56, 47-52`; `PD:93`
- Says version "deliberately excludes … post-creation evidence submission" — but SKILL.md:65-129 + `evidence` command implement it. Agent reading reference may refuse evidence. (Verified by orchestrator.)
- Claims `validate` rejects "cannot be evaluated"-type answers; `PD:93` only matches `refuse to arbitrate|refuse to rule|unable to rule` / bare `refuse`/`invalid`.
**Fix:** drop "post-creation evidence submission"; widen pattern (invalid, cannot be evaluated, neither, abstain) or soften claim. [BP Consistent terminology]

### M-06: Tests never execute the script
**File:** `test/create-dispute-skill.test.js`
- String-matching against source only; reserved-ruling test (L94-99) redeclares regex.
- Uncovered: schema rejection, answer-ID renumbering, odd juror counts, reserved-ruling collision, URI normalisation, extraData encoding, arg parser, B-01/M-03 regressions.
**Fix:** export pure fns (`validate`, `normalizeIpfsUri`, parser, extraData encoder) or spawn `tsx prepare-dispute.ts validate` on fixtures (offline). Add B-01/M-01/M-03 fixtures.

### M-07: No evals
[BP Build evaluations first; SC `evals/evals.json`]
**Fix:** `kleros-create-dispute/evals/evals.json` (decide strip-list: keep off master?). Minimum:
- (a) "Rehearse a 2-option delivery dispute on Sepolia" → reuse policy CID, validate→preflight, stop for approval.
- (b) user answer "Refuse to arbitrate" → removed with explanation.
- (c) "Submit evidence to case 123" → `--creation-tx`/chain-derived group, never typed key.
- (d) fabricated CID → hard stop.
- 8-10 trigger/should-not-trigger queries; negatives: appeal on existing case, Curate challenge, escrow dispute, juror voting. Run on Haiku/Sonnet/Opus.

## 🟡 Minor

| ID | File:line | Problem | Fix |
|---|---|---|---|
| m-01 | `PD:281-288` | `arbitrableWhitelist` read failure → "does not enforce" (ok on Sepolia where fn absent; wrong for mainnet RPC hiccup). `dev` adds `arbitrableWhitelistEnabled`. | Per-network expectation (One: must be true; Sepolia: absent); distinguish revert-no-selector vs transport error; read `…Enabled` when present. |
| m-02 | `PD:263, 269, 652` | Any RPC failure → "court does not exist"/"did not answer"/"dispute does not exist"; cause dropped. | Propagate cause. |
| m-03 | `SKILL.md:153`, `PD:331` | `KlerosCore.sol:748` `nbVotes = _feeAmount / feeForJuror` → excess buys jurors, no refund; fee rise between quote & send → revert. | Document: never pad/round `value`; re-quote if expired. |
| m-04 | `SKILL.md:17`, `PD:44` | `kleros-v2-testnet.netlify.app` non-canonical; `dev--kleros-v2-testnet` = devnet. | `https://v2-testnet.kleros.builders` (`web/README.md:19` master). |
| m-05 | `scripts/package.json` | zod 4.4.3 — GHSA-mrhx-c7xc-m3w5 (high, low real risk: local input). | Bump ≥4.6.7. |
| m-06 | `scripts/package-lock.json`, `CLAUDE.md:22`, `.gitignore`, `SKILL.md:53`, `kleros-ipfs-upload/SKILL.md:315` | Lockfile committed here; ipfs-upload intentionally none (PR's `.gitignore` enforces that). Undocumented; CHANGELOG:20 omits. | Document per-skill policy in CLAUDE.md; `npm ci` in SKILL.md. |
| m-07 | `PD:189` + `--dispute`/`--evidence-group`/`--tx` | `courtId "01"` skips General-Court warning, URL `/courts/01`; `BigInt("0x10")`=16; `abc` → raw SyntaxError; tx hashes unchecked. | Normalise `BigInt(x).toString()`; decimal-only regex; 32-byte hash check. |
| m-08 | `PD:300` | `/ipfs/bafkqaaa` (empty identity CID) 200 → passes; body never cancelled. | Require non-empty content / content-type; `response.body?.cancel()` or HEAD. |
| m-09 | schema limits | `.max()` counts UTF-16 units; CJK at max ≈270 KB calldata (Arbitrum limit concern, unverified). | Cap `templateJson` UTF-8 byte length. |
| m-10 | `PD:913` | `simulate` checks `--from` after full RPC+IPFS. | Validate args first. |
| m-11 | `validate` | No `--network` → silent mainnet default. | Require or print chosen network prominently. |
| m-12 | `SKILL.md:114-122` | Deployed `Evidence` keyed by `_externalDisputeID` only; other arbitrables' same local ID share group. | Note; "visible on Evidence tab" check should expect foreign evidence. |
| m-13 | `PD:159` | Evidence `description` no `.min(1)`; SKILL.md:101 says required. (Note commit 8bbab84 "allow short evidence descriptions" — confirm intent.) | `.min(1)`. |
| m-14 | `SKILL.md:53-63` | `npx tsx prepare-dispute.ts` assumes cwd = `scripts/`. [CC path vars] | `npx tsx ${CLAUDE_SKILL_DIR}/scripts/prepare-dispute.ts`; `npm ci --prefix ${CLAUDE_SKILL_DIR}/scripts`. Optional `allowed-tools` for read-only cmds. |
| m-15 | `SKILL.md:24-51` | No copyable checklist. [BP Workflows] | Add "Dispute progress" checklist (case JSON → policy upload → validate loop → preflight approve → re-quote <5 min → send → receipt → evidence). |
| m-16 | `SKILL.md:45` | "Prefer the caller's wallet tool" leaves tx construction open. [BP Degrees of freedom] | "Send exactly `to`/`value`/`data` from `prepare`; never edit calldata or build tx yourself." |
| m-17 | root `SKILL.md`, `openclaw-skill/SKILL.md`, `README.md`, `index.html:1332`, `index.json` desc | Evidence submission not routable; "Uploading dispute evidence" → ipfs-upload only. | Add "Submitting evidence to a V2 dispute → kleros-create-dispute + kleros-ipfs-upload" rows; mention evidence in descriptions. |
| m-18 | `CHANGELOG.md:8, 99` | `plugin.json` 2.5.0 but entries under `[Unreleased]`; compare link from v2.4.0. Also holds PR #4 change. | At release: `## [2.5.0] - <date>` + compare link (RELEASING.md steps 4-5). |
| m-19 | `CLAUDE.md:9` | "Published:" lists 2 skills. | Add `kleros-create-dispute`. |
| m-20 | `test/skill-surfaces.test.js` | `.includes(skill)` substring (prefix collisions); keepList sliced from first `"for path in"`; no index.html/marketplace/CHANGELOG checks. | Word-boundary match; add surfaces. |
| m-21 | `PD:924`, dispatch | No top-level catch (see M-04); `--evidence` JSON.parse raw error. | Friendly parse error. |
| m-22 | `SKILL.md:3` | Missing synonyms (arbitration, DisputeResolver, createDisputeForTemplate, "open a case", "take this to Kleros"); no "even if Kleros V2 not named". [SC:67] | See proposed description below. |

## 🟢 Nits

| ID | File:line | Note |
|---|---|---|
| n-01 | `SKILL.md:140-144`, `PD:92` | SDK `findAndUpdateRTA` (`populateTemplate.ts:19-33`) replaces `0x0` answer keeping its description — ruling-0 description *is* customisable; only refuse-type under non-zero id duplicates. Behaviour fine; fix wording. |
| n-02 | `SKILL.md:168-172` | Link `deployments/arbitrum/DisputeResolverNeo.json` / `EvidenceModule.json` (master) as ABI source of truth, not dev `DisputeResolver.sol`. |
| n-03 | `SKILL.md:39-43, 114-129, 140-147`; `case-format.md:47-53` | De-dup ruling-0 rationale (keep once in case-format); step 4 → "show full `preflight --human` output verbatim". [BP Concise] |
| n-04 | `PD:66, 140` | Comment why 300 s TTL / 25 s IPFS timeout. |
| n-05 | `SKILL.md` | Add "When NOT to use", worked "Example" (siblings have both). |
| n-06 | `SKILL.md:29, 74, 176` | `../kleros-ipfs-upload`, `../feedback` assume full plugin; note it. |
| n-07 | title dedupe | `toLocaleLowerCase` locale-dependent; add NFKC + zero-width strip. |
| n-08 | question check | Accept `؟` when `lang` is `ar_*`. |
| n-09 | arg parser | `--human yes` consumes value → JSON output. |
| n-10 | `PD:1` | `#!/usr/bin/env node` on 644 `.ts`; drop or `tsx` shebang + chmod. |
| n-11 | preflight | `getGasPrice` → `estimateFeesPerGas`. |
| n-12 | `marketplace.json`, CHANGELOG | 2.1.0 bump allowed by RELEASING.md but CLAUDE.md says plugins-only; CHANGELOG reason conflates. Align docs. |
| n-13 | `plugin.json` | Add keywords `arbitrum`, `v2`, `dispute`. |
| n-14 | `index.html:1326` | "Testnet" tag undersells mainnet. |
| n-15 | `test/create-dispute-skill.test.js:94-99` | Import real `RESERVED_RULING.pattern`. |
| n-16 | `SKILL.md` | `--max-fee` caps arbitration fee only, not gas. |

### Proposed description (m-22)
```yaml
description: "Creates a standalone Kleros V2 dispute (case) through the deployed DisputeResolver on Arbitrum One or Arbitrum Sepolia, then submits evidence to it, using a bundled helper that validates the juror template, checks the deployment, quotes the live arbitration fee, and prepares, simulates, and parses transactions. Use when the user wants to open, draft, price, rehearse on testnet, or submit a new Kleros dispute/arbitration case with ruling options and a policy, file evidence on a case created this way, or recover a dispute ID from a creation transaction. Also trigger on DisputeResolver, createDisputeForTemplate, arbitrationCost, dispute template, or 'take this to Kleros', even if Kleros V2 is not named. Do NOT use for appeals, juror voting, Curate registries, escrow disputes, or evidence on disputes created by other arbitrables; route file uploads to kleros-ipfs-upload and Curate to kleros-curate."
```

## Confirmed correct (do not re-litigate)

| Fact | Source |
|---|---|
| Arb One: Core `0x991d2df1…22ea`, DisputeResolver `0xb5526D02…4323`, EvidenceModule proxy `0x48e052B4…1EB3` | master `deployments/arbitrum/{KlerosCoreNeo,DisputeResolverNeo,EvidenceModule}.json`; docs deployment-addresses; Blockscout impl `0xA502…92C8` = `EvidenceModule_Implementation.json` |
| Sepolia: Core `0xE8442307…3479`, DisputeResolver `0xed31bEE8…7652`, EvidenceModule `0xA88A9a25…1397` (testnet, not devnet) | master `deployments/arbitrumSepolia/*.json` |
| Mainnet resolver whitelisted | on-chain `arbitrableWhitelist(0xb552…)` = true |
| `createDisputeForTemplate(bytes,string,string,uint256) payable returns (uint256)`, `arbitrator()`, `arbitratorDisputeIDToLocalID(uint256)` | deployed resolver ABI |
| `DisputeRequest(address indexed,uint256 indexed,uint256,uint256,string)` (5-arg) | master `IArbitrableV2.sol:19-25`; deployed ABI |
| `arbitrationCost(bytes)`, `courts(uint256)`, `isSupported(uint96,uint256)`, `disputes(uint256)`, `DisputeCreation(uint256 indexed,address indexed)` | deployed KlerosCore ABI |
| `submitEvidence(uint256 _externalDisputeID,string)`, `Evidence(uint256 indexed,address indexed,string)` | master `EvidenceModule.sol:67`; deployed ABI |
| extraData = `abi.encode(uint256 court, uint256 minJurors, uint256 dkId)`; court 0 forking; Classic DK=1; default 3 jurors | `KlerosCore.sol`; `libraries/Constants.sol` |
| Cost = `feeForJuror × minJurors`, native ETH | `KlerosCore.sol` |
| General Court fee 0.005 ETH/juror mainnet, 0.00001 testnet; hiddenVotes true | `config/courts.v2.{mainnet,testnet}.json`; docs court-hierarchy |
| Template fields, `0x01..0xN` answer ids, `numberOfRulingOptions` = answer count, empty data mappings OK | `kleros-sdk/.../disputeDetailsSchema.ts`; `specifications/arbitrable.md`; `web/.../SubmitDisputeButton.tsx` |
| RTA "Refuse to Arbitrate / Invalid" prepended as ruling 0 | `disputeDetailsSchema.ts`; docs dispute-templates |
| Evidence JSON `{name, description, fileURI?, fileTypeExtension?}` | `specifications/evidence-format.md` |
| Dispute ID from Core `DisputeCreation` in receipt | `web/src/utils/retrieveDisputeId.ts` |
| `sync-master.yml` diff only adds `kleros-create-dispute` to `EXPECTED_ROOT` + keep-list; triggers/perms/tags unchanged; strip simulation clean; `kleros-create-dispute/scripts/` correctly kept | workflow diff; simulated strip |
| `index.json` digests current; `.gitignore` `node_modules/` correct; sitemap/README/index.html card/netlify redirect OK | `npm run update-digests`; manual check |

## Run results (2026-11-03)
- `npm test`: 40/41 pass. Fail = `test/workflow-yaml.test.js` — sandbox has Python `yq` (needs Go `yq`); env issue, not PR.
- Sepolia read-only: `quote` → `valueWei 30000000000000`; `preflight --human` total ≈ `0.0000438 ETH`; `simulate --from 0x…dEaD` → `nextDisputeId 212`; network/RPC mismatch rejected; low `--max-fee` rejected; evidence on ruled dispute 211 refused.
- `npm audit`: 1 high (zod, m-05).
- No tx broadcast, no key used.

## Release implications (post-merge)
- Combined `v2.5.0` tag (precedent v2.2.0); optional `kleros-create-dispute@v1.0.0`. Finalise `[2.5.0]` CHANGELOG first (m-18). `[Unreleased]` also carries PR #4's change.

## Suggested fix batches (stacked PR on `claude/dispute-creation-skill-pr-xaxhsq` → `feat/create-dispute-on-arbitrum`)
1. **Safety** — B-01, B-02, M-01, M-02, M-03, m-01, m-07 (+ regression fixtures)
2. **CLI hygiene** — M-04, m-02, m-08..m-11, m-21, n-07..n-11
3. **Tests** — M-06, m-20, n-15
4. **Skill docs** — M-05, m-03, m-04, m-12..m-16, m-22, n-01..n-06, n-16
5. **Evals** — M-07
6. **Surfaces & release** — m-05, m-06, m-17..m-19, n-12..n-14 (m-18 at tag time)

## Batch 1 verification (2026-11-04)

Independent adversarial verifier on 7f58b66: B-01, B-02, M-01, M-02, m-01, m-07 **fixed**; M-03 **partial** → D-1. Pins re-verified vs master `EvidenceModule_Implementation.json` + on-chain EIP-1967 slot (One `0xA502A3942abCF8e71FBD87ed442B39b798b192C8`, Sepolia `0xC4e64e6E949936a18269937FC1e18cb11E3db14D`).

- [x] **D-1** (medium) `%2e%2e` / `\..\` bypass `..` rejection — WHATWG URL normalises → gateway serves other CID. Fix: `%` and `\` excluded from IPFS path segments; regression cases added.
- [x] **D-2** (medium) behaviour suite skipped in CI (no `npm ci` in scripts) → CI coverage dropped. Fix: `sync-master.yml` installs `npm ci --prefix kleros-create-dispute/scripts` before `npm test`; test file throws when `CI` set and deps missing.
- [x] **D-3** (low) B-02 / M-02 tests weak (pin format + source grep only; no exit-2 / BLOCKED assertion). Needs stubbed `PublicClient` → batch 3. — this commit
- [x] **D-4** (low) `receipt` accepted JSON array as evidence object. Fix: `Array.isArray` check.
- [x] **D-5** (low) `case-format.md` silent on `{{`/`}}` ban. Fix: one paragraph added.
- [x] **D-6** (info) zero-width chars accepted in URI paths; gateway check catches broken ones. Won't fix unless cheap in batch 2. — 2fecec8
- [x] **n-15** reserved-ruling test uses real pattern — 7f58b66 (incidental).
- [x] **n-09** `--human yes` now an error — 7f58b66 (incidental).

- [ ] **L-1** (follow-up, out of PR scope) `kleros-ipfs-upload/scripts` lockfile surfaces 29 transitive advisories (18 high) via `x402-fetch@1.2.0` (latest) → wallet SDK tree (ws, viem, zod, uuid, …). Pre-existing for every unlocked install; non-breaking `npm audit fix` can't resolve. Needs upstream x402 bump / overrides review.

## Batch 2 verification (2026-11-04)

Independent verifier on 2fecec8: M-04, m-08, m-09, m-10, m-11, m-21, n-04, n-08, n-10, n-11 **fixed**; m-02, n-07/D-6 **partial** → E-1, E-2. Live Sepolia happy path ok (policy CID `/ipfs/Qma8mnp6xV3J2cRNf3mTth5C8nV11CAnceVinc3y8jSbio`; fixtures' `bafkqaaa` is now correctly rejected live as empty).

- [x] **E-1** (minor) viem maps bare JSON-RPC -32603 to `ContractFunctionRevertedError` (copying the node message into `reason`) → "court does not exist" / "would revert"; rate limit -32005 in simulate/estimateGas → blocking "would fail"; preflight EvidenceModule read failure worded as "cannot be submitted". Fix: revert only with revert data, code 3, or -32603 whose message says "revert"; -32005/-32002/-32603/429 = network; preflight wording distinguishes unreadable vs mismatch. Verified against live Sepolia reverts (code 3 chain) + synthetic viem errors.
- [x] **E-2** (minor) `\p{Cf}` missed U+034F, U+FE0F, U+3164, U+2800 → `"Invalid͏"` bypassed reserved-ruling check. Fix: `\p{Default_Ignorable_Code_Point}` + U+2800 in title key and IPFS path check.
- [x] **E-3** (minor) SKILL.md said gateway failures are `network`; script reports them `input`. Fix: SKILL.md wording.
- [x] **E-4** (nit) multi-line stderr errors → newlines collapsed in `shortError`.
- [ ] **E-5** (nit) RPC path keys < 6 chars not registered as secrets (echoed if the RPC repeats its path). Deferred.
- [ ] **E-6** (nit) zero-length first chunk followed by data reported EMPTY. Deferred.
- [ ] **E-7** (nit) unclassified viem errors → `network` (could be `internal`). Deferred.
- [x] **E-8** (nit) `﹖` (U+FE56) accepted via NFKC before question-mark check.
- [ ] **E-9** (info) test fixtures use empty `/ipfs/bafkqaaa`; fine offline, any future live test needs a real CID.

## Batch 3 — tests (2026-11-04)

Harness: `test/helpers/rpc-stub.js` (in-process JSON-RPC server, one URL per scenario, CLI reached via normal `--rpc-url`) + `test/helpers/mock-gateway.mjs` (test-only fetch stand-in for cdn.kleros.link; `node --import` preload for spawned runs, installed on globalThis for in-process `main()` runs; refuses all non-local hosts). No helper-side bypass added. New `test/create-dispute-rpc.test.js` (D-3 + quote/prepare/preflight/simulate/evidence/receipt); M-06 validate/evidence semantics in `create-dispute-skill.test.js`; helper-source greps replaced by behaviour tests (remaining greps check prose or source layout only). Both create-dispute suites run concurrently (~37 s full `npm test`, was ~57 s).

- [x] **F-1** (minor, found by M-06 tests) answer objects were not `.strict()`: a misspelt answer key (e.g. `"ruling": 0`) was silently stripped. Fix: `.strict()` on the answer schema — this commit.

## Batch 3 verification (2026-11-04)

Independent verifier on 07a7390: batch-3 harness sound; mutation score 15/22 (missed M08, M09, M12, M15, M17, M20, M22) plus 2 classification gaps (E-1 regression, inconsistent simulate/gas catch-all) and E-4 partial. All re-verified against viem 2.55.19 (`getNodeError`, `getContractError`) with real viem error objects before fixing.

- [x] **F-2** (minor) E-1 regression: `{code:-32000,"execution reverted"}` (± `data:"0x"`) not a revert → Sepolia `arbitrableWhitelist` read reported `network`, every quote failed on such providers. Fix: `ExecutionRevertedError` in the cause chain counts as revert (viem builds it only from code 3 or a node message matching /execution reverted|gas required exceeds allowance/); bare `-32603 "Internal error"` stays network; Nethermind `-32015` deliberately not a revert (viem doesn't treat it as one; Nitro answers code 3). — this commit
- [x] **F-3** (minor) simulate / gas estimation treated "not transport" as revert → `header not found`, `missing trie node`, `-32601` gave exit 2 "would fail / do not sign". Fix: blocking only on `isTransactionVerdict` (revert, or viem's node verdicts on sender/fee: InsufficientFunds, IntrinsicGas*, FeeCap*, TipAboveFeeCap); everything else → `readFailure` `network` (exit 1, redacted). Preflight EvidenceModule warning: any viem error = unreadable. SKILL.md exit-code wording widened accordingly. — this commit
- [x] **E-7** resolved with F-3: unclassified viem errors stay `network` (they come from talking to the RPC, same as `readFailure`); unanticipated non-viem errors stay `internal`. Documented in `describeFailure`. — this commit
- [x] **F-4** (nit) E-4 partial: plain-Error messages carrying user text with newlines (answer titles) still multi-line on stderr. Fix: stderr line collapses `\s*\n\s*` for every kind; stdout JSON keeps the exact text. — this commit
- [x] **F-5** (minor) missed mutants → tests (stub gains `HttpStatus` + arbitrary JSON-RPC errors per method/selector, `ZERO_DATA` reads): `--max-fee` inclusive boundary (M08, M09); NFKC in `validate()` (M12); Sepolia whitelist `0x` / -32000 / code 3 → "not enforced" (M15, F-2 e2e); `isSupported` HTTP 503 / -32005 / header-not-found → `network` (M17); `receipt --dispute` without Evidence → exit 2 with the --dispute item (M20); gateway 4xx not retried, 5xx retried once (M22); `eth_estimateGas` / simulate `header not found` → exit 1 network, insufficient funds → exit 2 (F-3 e2e); real-viem-error classification table (code 3, -32000 ±data, -32603 both ways, -32005, -32601, -32015, header/trie, HTTP 429/503, ZeroData). — this commit

Mutation score (verifier's 22-mutant set, `scratchpad/mut/m1.js`): **15/22 → 22/22**. Earlier fixer's 21 (`mutate.py`): 21/21 still caught. 6 new batch-3 mutants (ExecutionRevertedError clause dropped, old simulate/gas catch-all restored ×2, InsufficientFunds not a verdict, stderr collapse removed, -32015 as revert): 6/6 caught. `npm test` / `CI=1 npm test`: 130/131 pass, the one failure is the sandbox `yq` workflow-YAML test. Live Sepolia (`quote`, `preflight --human`, policy `/ipfs/Qma8mnp6…bio`): ok, exit 0; whitelist "not enforced" on the real code-3 revert.
