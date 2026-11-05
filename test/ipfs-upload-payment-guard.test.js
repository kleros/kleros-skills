// kleros-ipfs-upload payment guard (PR #6 review, P1): the runners must never
// sign anything but Base USDC, <= 0.10 USDC, as an EIP-3009 authorization valid
// <= 1 hour — whatever the gateway's 402 challenge says.
//
// All offline. Three layers of checks:
// 1. Source: the CDP runner's guard block is byte-identical to the raw-key
//    runner's (the CDP runner needs live CDP credentials, so it is not run).
// 2. Layers: the raw-key runner's guard block is evaluated as written, and
//    with one of its two caps switched off (SDK spendControls / own policy),
//    against the locked SDK with a recording signer and a mocked fetch — so
//    each cap is proven on its own, not only together. The SKILL.md inline
//    policy is evaluated the same way.
// 3. Process: the real `pay-and-upload.ts` runs (node + tsx loader) against a
//    local 127.0.0.1 x402 stand-in, signing with a throwaway key (0x11…11,
//    worthless; signatures never leave the loopback server).
//
// 2 and 3 skip when deps are missing: `npm ci` in kleros-ipfs-upload/scripts.

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { createRequire } = require("node:module");

const scriptsDir = path.join(__dirname, "..", "kleros-ipfs-upload", "scripts");
const rawRunner = path.join(scriptsDir, "pay-and-upload.ts");
const cdpRunner = path.join(scriptsDir, "pay-and-upload-cdp.ts");
const skillMd = path.join(__dirname, "..", "kleros-ipfs-upload", "SKILL.md");
const tsxLoader = path.join(scriptsDir, "node_modules", "tsx", "dist", "loader.mjs");
const tsxApi = path.join(scriptsDir, "node_modules", "tsx", "dist", "esm", "api", "index.cjs");
const haveDeps =
  fs.existsSync(tsxLoader) && fs.existsSync(path.join(scriptsDir, "node_modules", "@x402", "fetch"));
const skipReason = haveDeps ? false : "upload deps missing: run `npm ci` in kleros-ipfs-upload/scripts";

const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const TEST_KEY = "0x" + "11".repeat(32);
const BEGIN = "// --- payment guard";
const END = "// --- end payment guard ---";
const SPEND = '.setSpendControls({ maxAmountPerPayment: "$0.10" })';
// SDK spend-control refusals: over the cap, or its own amount validator
// ("Invalid amount: …") rejecting a non-decimal amount before any cap check.
const SPEND_REFUSAL = /rejected by spendControls|Invalid amount: /;
const SPEND_OR_POLICY_REFUSAL = /rejected by spendControls|Invalid amount: |filtered out by policies/;

function guardBlock(file) {
  const src = fs.readFileSync(file, "utf8");
  const start = src.indexOf(BEGIN);
  const end = src.indexOf(END);
  assert.ok(start >= 0 && end > start, `${path.basename(file)}: payment guard markers missing`);
  return src.slice(start, end + END.length);
}

// Challenge requirement fields shared by the in-process and process suites.
function requirement(version, fields) {
  return {
    scheme: "exact",
    network: version === 1 ? "base" : "eip155:8453",
    asset: BASE_USDC,
    payTo: "0x0000000000000000000000000000000000000002",
    maxTimeoutSeconds: 300,
    extra: { name: "USD Coin", version: "2" },
    ...(version === 1 ? { resource: "http://127.0.0.1/upload-to-ipfs", description: "", mimeType: "" } : {}),
    ...fields,
  };
}

const PERMIT2 = { extra: { name: "USD Coin", version: "2", assetTransferMethod: "permit2" } };
// [label, version, requirement fields, expected signed value or null for refusal, caught by spend controls alone?]
const CASES = [
  ["v2 high amount + low maxAmountRequired (review P1)", 2, { amount: "1000000", maxAmountRequired: "10000" }, null, true],
  ["v2 at cap", 2, { amount: "100000" }, "100000", true],
  ["v2 over cap", 2, { amount: "100001" }, null, true],
  ["v2 non-integer amount", 2, { amount: "1e5" }, null, true],
  ["v2 hex amount", 2, { amount: "0x2710" }, null, true],
  ["v2 padded amount", 2, { amount: " 10000" }, null, true],
  ["v2 other asset", 2, { amount: "1000", asset: "0x0000000000000000000000000000000000000009" }, null, true],
  ["v2 Permit2 transfer method", 2, { amount: "10000", ...PERMIT2 }, null, false],
  ["v2 string maxTimeoutSeconds", 2, { amount: "10000", maxTimeoutSeconds: "99999999" }, null, false],
  ["v2 maxTimeoutSeconds over 1 hour", 2, { amount: "10000", maxTimeoutSeconds: 3601 }, null, false],
  ["v1 live-gateway shape (0.01 USDC, 300 s)", 1, { maxAmountRequired: "10000" }, "10000", true],
  ["v1 at cap", 1, { maxAmountRequired: "100000" }, "100000", true],
  ["v1 over cap", 1, { maxAmountRequired: "100001" }, null, true],
  ["v1 high maxAmountRequired + low amount", 1, { maxAmountRequired: "1000000", amount: "10000" }, null, true],
  ["v1 hex maxAmountRequired", 1, { maxAmountRequired: "0x2710" }, null, true],
];

describe("kleros-ipfs-upload payment guard (source)", () => {
  it("CDP runner guard is identical to the raw-key runner guard", () => {
    assert.equal(guardBlock(cdpRunner), guardBlock(rawRunner));
  });
});

describe("kleros-ipfs-upload payment guard (each cap alone, locked SDK, mocked signer)", { skip: skipReason }, () => {
  let sdk, tsImport, dir;
  const builders = {};

  before(async () => {
    const req = createRequire(path.join(scriptsDir, "package.json"));
    const load = (id) => import(pathToFileURL(req.resolve(id)).href);
    const [fetchMod, exactMod, v1Mod] = await Promise.all([load("@x402/fetch"), load("@x402/evm/exact/client"), load("@x402/evm/v1")]);
    sdk = {
      x402Client: fetchMod.x402Client,
      wrapFetchWithPayment: fetchMod.wrapFetchWithPayment,
      ExactEvmScheme: exactMod.ExactEvmScheme,
      ExactEvmSchemeV1: v1Mod.ExactEvmSchemeV1,
    };
    ({ tsImport } = require(tsxApi));
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "kiu-guard-src-"));

    // The runner's constants and guard block, evaluated verbatim in a module.
    const src = fs.readFileSync(rawRunner, "utf8");
    const consts = ["BASE_USDC", "MAX_ATOMIC_PER_PAYMENT", "MAX_TIMEOUT_SECONDS"].map((n) => {
      const m = src.match(new RegExp(`^const ${n} = .*;$`, "m"));
      assert.ok(m, `${n} missing from pay-and-upload.ts`);
      return m[0];
    });
    const block = guardBlock(rawRunner);
    assert.equal(block.split(SPEND).length, 2, "guard must set spendControls exactly once");
    const variants = {
      asShipped: block,
      policyOnly: block.replace(SPEND, ".setSpendControls(false)"),
      spendOnly: `${block}\n(client as any).policies.length = 0;`,
    };
    // SKILL.md inline policy, alone (spend controls off).
    const md = fs.readFileSync(skillMd, "utf8");
    const m = md.match(/\n(\s*\.registerPolicy\(\(v, reqs\)[\s\S]*?\}\)\);)/);
    assert.ok(m, "SKILL.md inline registerPolicy not found");
    variants.skillMdPolicyOnly = `const client = new x402Client()
  .registerV1("base", new ExactEvmSchemeV1(account))
  .register("eip155:8453", new ExactEvmScheme(account))
  .setSpendControls(false)
${m[1]}`;
    for (const [name, body] of Object.entries(variants)) {
      const file = path.join(dir, `${name}.mts`);
      fs.writeFileSync(file, `type PaymentRequirements = any;
export default function build({ x402Client, ExactEvmScheme, ExactEvmSchemeV1, account }: any) {
${consts.join("\n")}
${body}
  if (${JSON.stringify(name)} !== "spendOnly") {
    if ((client as any).policies.length !== 1) throw new Error("expected exactly one policy");
  }
  return client;
}
`);
      builders[name] = (await tsImport(pathToFileURL(file).href, __filename)).default;
    }
  });
  after(() => dir && fs.rmSync(dir, { recursive: true, force: true }));

  async function attempt(build, version, fields) {
    let signed = null;
    const account = {
      address: "0x0000000000000000000000000000000000000001",
      async signTypedData(data) {
        signed = String(data.message.value ?? data.message.permitted?.amount);
        return "0x" + "00".repeat(65);
      },
    };
    const client = build({ ...sdk, account });
    const accept = requirement(version, fields);
    let requests = 0;
    const fakeFetch = async () => {
      requests++;
      if (requests > 1) return new Response("{}", { status: 200 });
      if (version === 1) return new Response(JSON.stringify({ x402Version: 1, error: "", accepts: [accept] }), { status: 402, headers: { "content-type": "application/json" } });
      const challenge = { x402Version: 2, resource: { url: "http://127.0.0.1/upload-to-ipfs" }, accepts: [accept] };
      return new Response("", { status: 402, headers: { "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(challenge)).toString("base64") } });
    };
    let error = null;
    try {
      await sdk.wrapFetchWithPayment(fakeFetch, client)("http://127.0.0.1/upload-to-ipfs", { method: "POST", body: "x" });
    } catch (err) {
      error = String(err?.message ?? err);
    }
    return { signed, error };
  }

  // A refusal must come from the layer under test, never from a crash
  // (e.g. BigInt() throwing on an unvalidated amount in the policy).
  const REFUSAL = {
    asShipped: SPEND_OR_POLICY_REFUSAL,
    policyOnly: /filtered out by policies/,
    skillMdPolicyOnly: /filtered out by policies/,
    spendOnly: SPEND_REFUSAL,
  };

  for (const variant of ["asShipped", "policyOnly", "skillMdPolicyOnly", "spendOnly"]) {
    for (const [label, version, fields, expected, spendCatches] of CASES) {
      // Spend controls alone only cover amount/asset; the policy-only extras are skipped there.
      if (variant === "spendOnly" && !spendCatches) continue;
      it(`${variant}: ${label} → ${expected ? `signs ${expected}` : "refuses"}`, async () => {
        const { signed, error } = await attempt(builders[variant], version, fields);
        assert.equal(signed, expected, error ?? "");
        if (expected === null) assert.match(error ?? "", REFUSAL[variant]);
      });
    }
  }
});

// One loopback x402 stand-in per test: answers the first unpaid POST with the
// given challenge, records any payment header, and accepts a paid retry.
async function startGateway(version, fields) {
  const seen = { requests: 0, payment: null };
  const accept = requirement(version, fields);
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      seen.requests++;
      const header = req.headers["x-payment"] ?? req.headers["payment-signature"];
      if (header) {
        seen.payment = JSON.parse(Buffer.from(header, "base64").toString());
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: "ok", cids: ["/ipfs/bafkqaaa"] }));
        return;
      }
      if (version === 1) {
        res.writeHead(402, { "content-type": "application/json" });
        res.end(JSON.stringify({ x402Version: 1, error: "payment required", accepts: [accept] }));
      } else {
        const challenge = { x402Version: 2, resource: { url: "http://127.0.0.1/upload-to-ipfs" }, accepts: [accept] };
        res.writeHead(402, { "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(challenge)).toString("base64") });
        res.end();
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, seen, close: () => new Promise((r) => server.close(r)) };
}

function runUpload(gatewayUrl, file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--import", pathToFileURL(tsxLoader).href, rawRunner, file], {
      cwd: scriptsDir,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, EVM_PRIVATE_KEY: TEST_KEY, GATEWAY_URL: gatewayUrl },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("kleros-ipfs-upload payment guard (pay-and-upload.ts vs local x402 stand-in)", { skip: skipReason, concurrency: 4 }, () => {
  let dir, file;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "kiu-guard-"));
    file = path.join(dir, "evidence.json");
    fs.writeFileSync(file, "{}");
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  for (const [label, version, fields, expected] of CASES) {
    it(`${label}: ${expected ? `signs ${expected}` : "refuses before signing"}`, async () => {
      const gw = await startGateway(version, fields);
      try {
        const { code, stdout, stderr } = await runUpload(gw.url, file);
        if (expected === null) {
          assert.notEqual(code, 0, `expected refusal, got exit 0\n${stderr}`);
          assert.equal(gw.seen.payment, null, "a payment header reached the gateway");
          assert.equal(gw.seen.requests, 1, "client retried after refusing");
          assert.match(stderr, SPEND_OR_POLICY_REFUSAL, "refused for another reason");
        } else {
          assert.equal(code, 0, stderr);
          assert.equal(stdout.trim(), "/ipfs/bafkqaaa");
          assert.equal(String(gw.seen.payment.payload.authorization.value), expected);
        }
      } finally {
        await gw.close();
      }
    });
  }
});
