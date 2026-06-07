## Question: when we start launching x402 endpoints and MCP endpoints, do we need to update this SVCB record?


`★ Insight ─────────────────────────────────────`
**This is actually a really good architectural question** — and the answer reveals the elegant separation of concerns in the agent-discovery stack. There are **two layers** that update at different cadences:

1. **DNS-AID records (slow-changing)** — one per *protocol family*. `_mcp._agents...`, `_x402._agents...`, `_a2a._agents...`. Each says "this protocol is supported, here's the entry-point host." These don't change when individual endpoints come and go — only when you adopt or drop an entire protocol.

2. **api-catalog JSON at skills.kleros.io (fast-changing)** — the comprehensive listing of every endpoint under every protocol. This is the file agents read to discover *specific* endpoints. New MCP servers, new x402 paths, new ERC-8004 contract addresses — they all get added/removed here without touching DNS at all.

**TL;DR:** The `_index` SVCB record points to skills.kleros.io and **never changes**. The api-catalog at skills.kleros.io changes as you ship new endpoints. That's the whole maintenance story for individual endpoint launches.
`─────────────────────────────────────────────────`

## Specific answer to your question

**When you launch x402 endpoints:**
- ✅ **Always**: update the api-catalog JSON at `skills.kleros.io/.well-known/api-catalog` to list the new endpoint
- 🔵 **Once per protocol family (not per endpoint)**: add `_x402._agents.kleros.io` SVCB record pointing to your x402 service host. This is a one-time thing — adding the second/third/Nth x402 endpoint doesn't need another DNS record.

**When you launch MCP endpoints:**
- ✅ **Always**: update api-catalog
- 🔵 **Once per protocol**: add `_mcp._agents.kleros.io` SVCB record. Then new MCP servers just get added to the catalog.

**When you launch A2A (ERC-8004 inter-agent comms, eventually):**
- ✅ Update api-catalog
- 🔵 Add `_a2a._agents.kleros.io` SVCB record

## Recommended rollout strategy

Two phases:

**Phase 1 — now (you have DNS access):**

Just publish the `_index` record. That clears the scanner check and signals "Kleros is DNS-AID aware." The api-catalog at skills.kleros.io already exists and lists what's available today.

```
_index._agents.kleros.io. 3600 IN SVCB 1 skills.kleros.io. alpn="h2" port=443 mandatory=alpn,port
```

This is what you should publish today. **One record, satisfies the scanner.**

**Phase 2 — as protocols mature (months from now):**

Add protocol-specific records when each protocol has a stable production host. Adding them too early (pointing at experimental/changing hosts) creates churn that's worse than not having them. Wait until each protocol's entry-point host is set in stone.

Rough sequencing based on what's in your project tracker:

| Protocol | DNS-AID record | When to publish |
|---|---|---|
| x402 IPFS gateway | `_x402._agents.kleros.io → kleros-ipfs-gateway.fly.dev` (or production host) | When you move off Fly.io to a permanent host with a stable name |
| MCP | `_mcp._agents.kleros.io → mcp.kleros.io` (TBD) | When Parul's expanded Kleros Court MCP has a stable production endpoint with its own hostname |
| ERC-8004 Reputation Oracle | Probably stays on-chain, not DNS-AID surface | Doesn't need this |
| A2A | `_a2a._agents.kleros.io → a2a.kleros.io` | If/when you implement an A2A endpoint |

`★ Insight ─────────────────────────────────────`
**Why I'd recommend NOT publishing _mcp or _x402 yet:** the records are cheap, but **stable identifiers are valuable.** If you publish `_mcp._agents.kleros.io → mcp-staging.fly.dev` today, then move to `mcp.kleros.io` later, agents that have cached that DNS record will continue hitting the dead Fly.io host even after migration. DNS caching is brutal — agents could be looking at stale records for hours to days. Better to wait until you've decided on the *permanent* hostname per protocol, then publish. The api-catalog at skills.kleros.io can list provisional/staging endpoints in the meantime without DNS-level commitment.
`─────────────────────────────────────────────────`

## Practical implication

The DNS-AID work today is **one record**, **once**, by **you** (since you have DNS access). Going forward, every time you ship a new protocol surface, the steps are:

1. **Always:** PR the api-catalog JSON in the skills.kleros.io repo to list the new endpoint
2. **Sometimes (new protocol family):** Add one new SVCB record in Cloudflare DNS
3. **Never:** Touch the `_index` record — it stays pointing at skills.kleros.io forever

This is a really clean operational model — DNS is for slow-changing semantic facts about which protocols exist, the catalog is for fast-changing operational facts about where specific endpoints live. Want me to draft the exact Cloudflare DNS form values for the `_index` record now so you can land it while permissions for the Transform Rule task are still pending?
