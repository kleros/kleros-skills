/**
 * Pay-and-upload a file to IPFS via the Kleros x402 gateway on Base mainnet.
 *
 * The @x402/fetch SDK handles the 402 → sign EIP-3009 → retry-with-X-PAYMENT
 * loop transparently. Each successful run spends $0.01 USDC on Base mainnet.
 *
 * Payment guard: the client only signs for USDC on Base, at most 0.10 USDC
 * per request (the same cap the legacy x402-fetch package applied by default).
 * A gateway that asks for anything else is refused before any signature.
 *
 * Run standalone:
 *
 *   cd path/to/this-dir
 *   npm ci
 *   EVM_PRIVATE_KEY=0x... npx tsx pay-and-upload.ts ./somefile.txt
 *
 * Env vars:
 *   EVM_PRIVATE_KEY  payer's Base mainnet private key (required)
 *   GATEWAY_URL      defaults to https://kleros-ipfs-gateway.fly.dev
 *   OPERATION        free-form tag, defaults to "evidence"
 *
 * Output: on success, prints each returned IPFS CID on its own line so the
 * calling agent can parse them with a one-liner.
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import type { PaymentRequirements } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { ExactEvmSchemeV1 } from "@x402/evm/v1";
import { privateKeyToAccount } from "viem/accounts";

// Native USDC on Base mainnet, and the per-request ceiling in atomic units
// (6 decimals): 100000 = 0.10 USDC. The gateway currently charges 0.01 USDC.
const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const MAX_ATOMIC_PER_PAYMENT = 100_000n;
// Longest authorization validity accepted (the gateway asks for 300 s).
const MAX_TIMEOUT_SECONDS = 3600;

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: tsx pay-and-upload.ts <file-path>");
  process.exit(1);
}

const rawKey = process.env.EVM_PRIVATE_KEY;
if (!rawKey) {
  console.error("EVM_PRIVATE_KEY env var is required");
  process.exit(1);
}
const privateKey = (
  rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`
) as `0x${string}`;

const gatewayUrl =
  process.env.GATEWAY_URL ?? "https://kleros-ipfs-gateway.fly.dev";
const operation = process.env.OPERATION ?? "evidence";

const account = privateKeyToAccount(privateKey);

// --- payment guard (keep identical in pay-and-upload.ts and pay-and-upload-cdp.ts) ---
// The gateway speaks x402 v1 (network "base"); v2 ("eip155:8453") is
// registered too so a future gateway upgrade keeps working. No other network
// is registered, so nothing else can be signed.
//
// Two independent caps, both on the amount the scheme actually signs for the
// challenge's x402 version: v1 signs maxAmountRequired, v2 signs amount. A v2
// challenge may also carry a (lower) maxAmountRequired; it is never consulted,
// otherwise it would pass the cap while the signer authorizes `amount`.
const client = new x402Client()
  .registerV1("base", new ExactEvmSchemeV1(account))
  .register("eip155:8453", new ExactEvmScheme(account))
  // 1. SDK spend control (version-aware in the SDK itself; default would be $1).
  .setSpendControls({ maxAmountPerPayment: "$0.10" })
  // 2. Own policy: Base USDC only, integer atomic amount <= 0.10 USDC, signed
  //    as a plain EIP-3009 transferWithAuthorization (no Permit2: its gas-
  //    sponsoring path can sign an unlimited USDC approve), valid <= 1 hour.
  .registerPolicy((version, reqs) =>
    reqs.filter((r: PaymentRequirements) => {
      const raw =
        version === 1
          ? (r as { maxAmountRequired?: unknown }).maxAmountRequired
          : r.amount;
      const method = (r.extra as { assetTransferMethod?: unknown } | undefined)
        ?.assetTransferMethod;
      return (
        r.asset?.toLowerCase() === BASE_USDC &&
        typeof raw === "string" &&
        /^\d+$/.test(raw) &&
        BigInt(raw) <= MAX_ATOMIC_PER_PAYMENT &&
        (method === undefined || method === "eip3009") &&
        Number.isInteger(r.maxTimeoutSeconds) &&
        r.maxTimeoutSeconds > 0 &&
        r.maxTimeoutSeconds <= MAX_TIMEOUT_SECONDS
      );
    })
  );
// --- end payment guard ---
const fetchWithPay = wrapFetchWithPayment(fetch, client);

const form = new FormData();
const bytes = await readFile(filePath);
form.append(
  "file",
  new Blob([bytes], { type: "application/octet-stream" }),
  basename(filePath)
);

const url = `${gatewayUrl}/upload-to-ipfs?operation=${encodeURIComponent(
  operation
)}`;
console.error(`POST ${url}`);

const res = await fetchWithPay(url, { method: "POST", body: form });
const text = await res.text();

if (!res.ok) {
  console.error(`status: ${res.status}`);
  console.error(`body:   ${text}`);
  process.exit(1);
}

const parsed = JSON.parse(text) as {
  message: string;
  cids: string[];
  urls?: string[];
  inconsistentCids?: string[];
};

for (const cid of parsed.cids) console.log(cid);

for (const u of parsed.urls ?? []) console.error(`url=${u}`);

if (parsed.inconsistentCids && parsed.inconsistentCids.length > 0) {
  console.error(
    `warning: inconsistentCids=${JSON.stringify(parsed.inconsistentCids)}`
  );
}
