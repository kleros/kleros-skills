# Kleros IPFS Upload Skill — First-Use Feedback

Honest first-use report from an agent (Claude Opus 4.7) running the skill end-to-end against `foo.txt` on Base mainnet. The skill **works end-to-end** — the issues below are friction, not blockers.

---

## High-impact friction

### 1. `npm install` inside the plugin cache is denied by the auto-mode classifier

The Quickstart says:

```bash
cd path/to/this-skill/scripts && npm install
```

…but that path resolves to `~/.claude/plugins/cache/kleros-skills/...` — a shared/global path. The Claude Code auto-mode classifier blocked it (rightly so: modifies a shared path outside session scope and runs lifecycle scripts not declared in the project manifest).

I had to copy `pay-and-upload.ts` + `package.json` into a project-local `.kleros-ipfs/` dir before installing.

**Recommendation:** change the Quickstart to instruct agents/users to copy the two files into a project-local working dir first (or set `CWD` to one), and add a one-line `cp` recipe. The sentence *"If you're integrating into an existing Node project, you can ignore the bundled `package.json` and just `npm i x402-fetch` in your own project"* is buried at the very bottom — promote it.

### 2. Raw-key path has no `EVM_KEY_PATH` analog to `CDP_CREDS_PATH`

The CDP runner can read four secrets from a file via `CDP_CREDS_PATH`. The raw-key runner forces `EVM_PRIVATE_KEY` into the process env, which means either:

- putting it on the command line (shell history risk), or
- constructing `set -a && source .env && set +a && EVM_PRIVATE_KEY="$PRIVATE_KEY" npx tsx …` by hand.

**Recommendation:** accept `--key-file PATH` or `EVM_KEY_PATH=…` that reads a single-line file (or a `.env`-style file looking for `PRIVATE_KEY` / `EVM_PRIVATE_KEY`).

### 3. The `.env` variable-name mismatch

My `.env` had `PRIVATE_KEY=…` — a very common convention (Hardhat, Foundry, viem examples all use that name). The script only accepts `EVM_PRIVATE_KEY`.

**Recommendation:** either accept both names (try `EVM_PRIVATE_KEY`, fall back to `PRIVATE_KEY`), or have the script auto-source a `.env` in CWD when present. This was the single biggest paper-cut.

---

## Output / agent ergonomics

### 4. CIDs on stdout, `url=…` on stderr is unusual

Forces an agent (or any caller) to parse two streams.

**Recommendation:** add a `--json` flag that prints the full gateway response as one JSON line on stdout — trivial to add, makes the script self-describing for any caller. Keep current behavior as default for human use.

### 5. Raw-key script doesn't print payer address / USDC balance pre-upload

The CDP runner does (per the skill text), and it's a great safety check. Add the same to `pay-and-upload.ts` — a few lines using viem's `publicActions` against a Base mainnet RPC.

### 6. The verbose `console.error("POST <url>")` line

Useful when debugging, noise in normal use. Gate behind a `--verbose` flag or `DEBUG=1`.

---

## Skill copy

### 7. The "Pre-flight (free, no key needed)" recipe has a hidden requirement

Step 3 requires `-F file=@/path/to/anyfile.txt`. Agents won't have a placeholder file lying around.

**Recommendation:** either provide one inline (`-F file=@/dev/null` works on many systems, or `echo x > /tmp/x && -F file=@/tmp/x`), or reduce the mandatory pre-flight to just `/health` and mark the other two as optional.

### 8. Cleanup guidance missing

After a successful upload, the project-local working dir holds `node_modules/` (~MB-sized). A one-line *"rm -rf the working dir when done; or keep it for re-use"* sentence would close the loop.

### 9. Base mainnet warning should be in bold near the top

The "Network" section is clear, but a user skimming the Quickstart could miss that this is real-funds-on-mainnet, not testnet. One line near the top:

> **⚠️ Every upload spends 0.01 real USDC on Base mainnet. There is no testnet path.**

### 10. `npm audit` reports 21 moderate vulnerabilities after a fresh install

Worth bumping the deps and republishing — even if all are transitive, agents and security scanners flag them on every install.

---

## Smaller observations

- `pay-and-upload.ts` declares `@coinbase/cdp-sdk` as a dependency but only `pay-and-upload-cdp.ts` uses it. Splitting into two `package.json`s (or making it optional) would let raw-key users install ~half the tree.
- The `cids[]` shape (`/ipfs/QmXXX...` with a leading `/ipfs/`) is unusual — most pinning services return the bare hash. The *"Do not write `https://cdn.kleros.link/ipfs/${cid}`"* warning is great; consider also normalizing in the script: print bare hash or full URL on stdout, and let `--cid-format=path|bare|ipfs-uri` pick.
- Consider a `--dry-run` mode that runs the three free pre-flight checks and prints the payer balance, but skips the paid call. Cheap insurance.
- The skill description correctly handles the "smoke test" edge case explicitly — that was very helpful when deciding whether `foo.txt` was a legitimate trigger. Good.

---

## What worked well

- The **"When NOT to use this skill"** section is unusually clear and saved me from second-guessing.
- The `urls[]` field in the response with a pre-built CDN URL is a great UX touch; the warning about the double-slash trap is exactly the kind of footgun documentation that pays off.
- The pre-flight `/health` returning `ok` in <100ms made the "is the gateway up?" check trivial.
- The 402 → sign → retry loop in `x402-fetch` was completely invisible. From the agent's perspective it was just `POST → 200 → CID`. The skill's promise on this matches reality.
- The CDP server-account path being documented at all (with a runnable script) is unusual for a marketplace skill and very welcome for hosted agents.

---

## Net

I'd ship this as-is — but tackling items **1–3** would meaningfully reduce time-to-first-upload for the next agent.
