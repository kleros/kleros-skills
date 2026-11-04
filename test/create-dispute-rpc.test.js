// Behaviour tests for the create-dispute helper's on-chain commands (quote,
// preflight, prepare, simulate, evidence, receipt) — fully offline.
//
// Harness (all test-only, nothing here ships: test/ is stripped from master):
// - RPC: test/helpers/rpc-stub.js, an in-process JSON-RPC server. Each test
//   builds its own chain model with `klerosChain()` below and passes the stub URL
//   through the CLI's normal --rpc-url. The model answers eth_chainId, bytecode,
//   contract reads (decoded by selector with viem), the EIP-1967 slot, balance,
//   gas, fees, receipts and blocks as an Arbitrum node would. Its ABIs and
//   addresses are written out here independently of the helper, so a drifted
//   ABI, address or pin in the helper makes these tests fail.
// - IPFS gateway: test/helpers/mock-gateway.mjs, a `node --import` preload the
//   harness adds to the spawned process. It answers cdn.kleros.link from a map
//   passed in KCD_TEST_GATEWAY and refuses every non-local host.
// - Runner: most tests call the helper's exported `main(argv)` in-process (the
//   same function the CLI entry point awaits and turns into the exit code); in
//   that mode the gateway stand-in is installed on globalThis.fetch of the test
//   process. The D-3 exit-code tests pass `{ spawn: true }` and run the helper
//   as a real process (node + tsx loader + gateway preload), so their exit
//   codes are the process exit codes an agent sees.
// The helper itself has no flag, env var or config that touches any of this:
// the chain-id check, the deployment allowlist, the EvidenceModule pin and the
// gateway check all run unmodified against the stubbed network.
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { startRpcStub, RpcError, HttpStatus } = require("./helpers/rpc-stub.js");

const scriptsDir = path.join(__dirname, "..", "kleros-create-dispute", "scripts");
const script = path.join(scriptsDir, "prepare-dispute.ts");
const tsxLoader = path.join(scriptsDir, "node_modules", "tsx", "dist", "loader.mjs");
const viemEntry = path.join(scriptsDir, "node_modules", "viem");
const fixtures = path.join(__dirname, "fixtures", "create-dispute");
const haveDeps = fs.existsSync(tsxLoader) && fs.existsSync(viemEntry);
if (!haveDeps && process.env.CI) {
  throw new Error("CI is set but kleros-create-dispute/scripts deps are missing: run `npm ci --prefix kleros-create-dispute/scripts` before `npm test`");
}
const skipReason = haveDeps ? false : "helper deps missing: run `npm ci` in kleros-create-dispute/scripts";
const viem = haveDeps ? require(viemEntry) : {};
const {
  decodeAbiParameters, decodeFunctionData, encodeAbiParameters, encodeErrorResult, encodeEventTopics,
  encodeFunctionResult, getAddress, numberToHex, pad, parseAbi, parseAbiParameters, parseEther,
} = viem;

// ---------------------------------------------------------------------------
// Independent copy of the deployments (kleros-v2 master deployments/*.json and
// the on-chain EIP-1967 slot, verified 2026-11-04). Literal on purpose.
// ---------------------------------------------------------------------------
const SEPOLIA = {
  key: "arbitrumSepolia", chainId: 421614, production: false,
  core: "0xE8442307d36e9bf6aB27F1A009F95CE8E11C3479",
  resolver: "0xed31bEE8b1F7cE89E93033C0d3B2ccF4cEb27652",
  evidenceModule: "0xA88A9a25cE7f1d8b3941dA3b322Ba91D009E1397",
  pin: "0xC4e64e6E949936a18269937FC1e18cb11E3db14D",
};
const ONE = {
  key: "arbitrum", chainId: 42161, production: true,
  core: "0x991d2df165670b9cac3B022f4B68D65b664222ea",
  resolver: "0xb5526D022962A1fFf6eD32C93e8b714c901F4323",
  evidenceModule: "0x48e052B4A6dC4F30e90930F1CeaAFd83b3981EB3",
  pin: "0xA502A3942abCF8e71FBD87ed442B39b798b192C8",
};
const EIP1967_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const UPGRADED = "0x1111111111111111111111111111111111111111";
const FROM = "0x000000000000000000000000000000000000dEaD";
const PARTY = haveDeps ? getAddress("0x00000000000000000000000000000000000000aa") : "";
const OTHER_ARBITRABLE = haveDeps ? getAddress("0x00000000000000000000000000000000000000bb") : "";
const TX = (n) => `0x${n.toString(16).padStart(64, "0")}`;

const coreAbi = haveDeps ? parseAbi([
  "function arbitrationCost(bytes _extraData) view returns (uint256 cost)",
  "function courts(uint256 _courtID) view returns (uint96 parent, bool hiddenVotes, uint256 minStake, uint256 alpha, uint256 feeForJuror, uint256 jurorsForCourtJump, bool disabled)",
  "function isSupported(uint96 _courtID, uint256 _disputeKitID) view returns (bool)",
  "function arbitrableWhitelist(address _arbitrable) view returns (bool)",
  "function disputes(uint256 _disputeID) view returns (uint96 courtID, address arbitrated, uint8 period, bool ruled, uint256 lastPeriodChange)",
  "event DisputeCreation(uint256 indexed _disputeID, address indexed _arbitrable)",
]) : [];
const resolverAbi = haveDeps ? parseAbi([
  "function createDisputeForTemplate(bytes _arbitratorExtraData, string _disputeTemplate, string _disputeTemplateDataMappings, uint256 _numberOfRulingOptions) payable returns (uint256 disputeID)",
  "function arbitrator() view returns (address)",
  "function arbitratorDisputeIDToLocalID(uint256 _arbitratorDisputeID) view returns (uint256 localDisputeID)",
  "event DisputeRequest(address indexed _arbitrator, uint256 indexed _arbitratorDisputeID, uint256 _externalDisputeID, uint256 _templateId, string _templateUri)",
]) : [];
const evidenceAbi = haveDeps ? parseAbi([
  "function submitEvidence(uint256 _externalDisputeID, string _evidence)",
  "event Evidence(uint256 indexed _externalDisputeID, address indexed _party, string _evidence)",
]) : [];

// ---------------------------------------------------------------------------
// Chain model
// ---------------------------------------------------------------------------
const REVERT = (reason = "") => ({ revert: reason });
const ZERO_DATA = { zeroData: true }; // the node runs the call and returns nothing (no such function)
const revertError = (reason) => new RpcError(
  3,
  reason ? `execution reverted: ${reason}` : "execution reverted",
  reason ? encodeErrorResult({ abi: parseAbi(["error Error(string)"]), errorName: "Error", args: [reason] }) : "0x",
);
const ZERO_WORD = `0x${"0".repeat(64)}`;
const hex = (value) => numberToHex(BigInt(value));

/// A healthy Kleros V2 deployment on `net`; override any field per test.
function klerosChain(net, overrides = {}) {
  const state = {
    chainId: net.chainId,
    blockNumber: 5_000n,
    baseFee: 100_000_000n,
    priorityFee: 1_000_000n,
    balance: parseEther("1"),
    code: { [net.core]: "0x6080", [net.resolver]: "0x6080", [net.evidenceModule]: "0x6080" },
    implementation: net.pin, // what the EvidenceModule proxy runs (EIP-1967 slot)
    historicalState: true,
    arbitrator: net.core,
    arbitrationCost: parseEther("0.0015"),
    court: { parent: 1n, hiddenVotes: false, minStake: parseEther("1"), alpha: 10_000n, feeForJuror: parseEther("0.0005"), jurorsForCourtJump: 511n, disabled: false },
    isSupported: true,
    whitelist: net.production ? true : REVERT(), // Sepolia core has no arbitrableWhitelist()
    estimateGas: 400_000n,
    simulateResult: 4242n,
    disputes: {}, // arbitrator dispute id -> { courtID, arbitrated, period, ruled }
    localIds: {}, // arbitrator dispute id -> evidence group (DisputeResolver mapping)
    receipts: {}, // tx hash -> raw receipt (see receiptOf)
    ...overrides,
  };
  // Any read's value may instead be REVERT(), ZERO_DATA, an RpcError or an HttpStatus.
  const reply = (abi, functionName, value) => {
    fail(value);
    if (value === ZERO_DATA) return "0x";
    return encodeFunctionResult({ abi, functionName, result: value });
  };
  const call = (tx) => {
    const to = getAddress(tx.to);
    let decoded;
    if (to === getAddress(net.core)) {
      try { decoded = decodeFunctionData({ abi: coreAbi, data: tx.data }); } catch { throw revertError(""); }
      const [first] = decoded.args ?? [];
      switch (decoded.functionName) {
        case "arbitrationCost": return reply(coreAbi, "arbitrationCost", state.arbitrationCost);
        case "courts": {
          const c = state.court;
          fail(c);
          return reply(coreAbi, "courts", [c.parent, c.hiddenVotes, c.minStake, c.alpha, c.feeForJuror, c.jurorsForCourtJump, c.disabled]);
        }
        case "isSupported": return reply(coreAbi, "isSupported", state.isSupported);
        case "arbitrableWhitelist": return reply(coreAbi, "arbitrableWhitelist", state.whitelist);
        case "disputes": {
          const d = state.disputes[String(first)];
          if (!d) throw revertError(""); // out-of-range array read reverts
          return reply(coreAbi, "disputes", [d.courtID ?? 2n, d.arbitrated, d.period ?? 0, d.ruled ?? false, 1_760_000_000n]);
        }
        default: throw revertError("");
      }
    }
    if (to === getAddress(net.resolver)) {
      try { decoded = decodeFunctionData({ abi: resolverAbi, data: tx.data }); } catch { throw revertError(""); }
      switch (decoded.functionName) {
        case "arbitrator": return reply(resolverAbi, "arbitrator", state.arbitrator);
        case "arbitratorDisputeIDToLocalID": return reply(resolverAbi, "arbitratorDisputeIDToLocalID", state.localIds[String(decoded.args[0])] ?? 0n);
        case "createDisputeForTemplate": return reply(resolverAbi, "createDisputeForTemplate", state.simulateResult);
        default: throw revertError("");
      }
    }
    return "0x"; // no code: a call returns nothing
  };
  const block = () => ({
    number: hex(state.blockNumber), hash: `0x${"ab".repeat(32)}`, parentHash: ZERO_WORD, timestamp: hex(1_760_000_000),
    baseFeePerGas: hex(state.baseFee), gasLimit: hex(1_125_899_906_842_624n), gasUsed: "0x0", miner: `0x${"0".repeat(40)}`,
    nonce: "0x0000000000000000", difficulty: "0x1", totalDifficulty: "0x1", extraData: "0x", mixHash: ZERO_WORD,
    logsBloom: `0x${"0".repeat(512)}`, sha3Uncles: ZERO_WORD, stateRoot: ZERO_WORD, transactionsRoot: ZERO_WORD,
    receiptsRoot: ZERO_WORD, size: "0x1", transactions: [], uncles: [],
  });
  const fail = (value) => {
    if (value instanceof RpcError || value instanceof HttpStatus) throw value;
    if (value && typeof value === "object" && "revert" in value) throw revertError(value.revert);
  };
  return {
    state,
    handle(method, params) {
      switch (method) {
        case "eth_chainId": return hex(state.chainId);
        case "net_version": return String(state.chainId);
        case "eth_blockNumber": return hex(state.blockNumber);
        case "eth_getBlockByNumber": return block();
        case "eth_maxPriorityFeePerGas": return hex(state.priorityFee);
        case "eth_gasPrice": return hex(state.baseFee + state.priorityFee);
        case "eth_getTransactionCount": return "0x0";
        case "eth_getBalance": return hex(state.balance);
        case "eth_getCode": return state.code[getAddress(params[0])] ?? "0x";
        case "eth_getStorageAt": {
          const [address, slot, at] = params;
          if (at !== "latest" && !state.historicalState) throw new RpcError(-32000, "missing trie node (historical state unavailable)");
          if (getAddress(address) !== getAddress(net.evidenceModule) || slot.toLowerCase() !== EIP1967_SLOT) return ZERO_WORD;
          return state.implementation ? pad(state.implementation.toLowerCase(), { size: 32 }) : ZERO_WORD;
        }
        case "eth_call": return call(params[0]);
        case "eth_estimateGas": {
          fail(state.estimateGas);
          return hex(state.estimateGas);
        }
        case "eth_getTransactionReceipt": return state.receipts[params[0].toLowerCase()] ?? null;
        default: throw new RpcError(-32601, `the method ${method} does not exist/is not available`);
      }
    },
  };
}

function receiptOf(hash, { status = "0x1", to, logs = [], blockNumber = 4_990n } = {}) {
  const blockHash = `0x${"cd".repeat(32)}`;
  return {
    transactionHash: hash, transactionIndex: "0x1", blockHash, blockNumber: hex(blockNumber), from: FROM, to,
    cumulativeGasUsed: "0x30d40", gasUsed: "0x30d40", effectiveGasPrice: "0x5f5e100", contractAddress: null,
    logs: logs.map((log, index) => ({
      ...log, blockNumber: hex(blockNumber), blockHash, transactionHash: hash, transactionIndex: "0x1", logIndex: hex(index), removed: false,
    })),
    logsBloom: `0x${"0".repeat(512)}`, status, type: "0x2",
  };
}
const disputeCreationLog = (net, disputeId, arbitrable = net.resolver) => ({
  address: net.core,
  topics: encodeEventTopics({ abi: coreAbi, eventName: "DisputeCreation", args: { _disputeID: disputeId, _arbitrable: arbitrable } }),
  data: "0x",
});
const disputeRequestLog = (net, disputeId, group) => ({
  address: net.resolver,
  topics: encodeEventTopics({ abi: resolverAbi, eventName: "DisputeRequest", args: { _arbitrator: net.core, _arbitratorDisputeID: disputeId } }),
  data: encodeAbiParameters(parseAbiParameters("uint256, uint256, string"), [group, 0n, ""]),
});
const evidenceLog = (net, group, text) => ({
  address: net.evidenceModule,
  topics: encodeEventTopics({ abi: evidenceAbi, eventName: "Evidence", args: { _externalDisputeID: group, _party: PARTY } }),
  data: encodeAbiParameters(parseAbiParameters("string"), [text]),
});

// ---------------------------------------------------------------------------
// CLI runner
// ---------------------------------------------------------------------------
const POLICY = "/ipfs/bafkqaaa"; // valid.json's policyURI
const EVIDENCE_FILE = "/ipfs/QmEvidenceFile/report.pdf";
const GATEWAY = { [POLICY]: { body: "%PDF-1.7 policy" }, [EVIDENCE_FILE]: { body: "%PDF-1.7 evidence" } };
const preloads = haveDeps ? ["--import", pathToFileURL(tsxLoader).href, "--import", pathToFileURL(path.join(__dirname, "helpers", "mock-gateway.mjs")).href] : [];

/// Spawn the helper as a real process: exit codes are process exit codes.
function spawnCli(args, gateway) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...preloads, script, ...args], {
      env: { ...process.env, DEBUG: "", KCD_TEST_GATEWAY: JSON.stringify(gateway) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 60_000);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(finish(code, stdout, stderr));
    });
  });
}

// In-process: the CLI's own `main(argv)` (what the process entry point awaits
// and turns into process.exitCode), with console output captured. ~1000x
// cheaper than a spawn (tsx-loading viem costs ~2 CPU-s per process), so most
// tests use it; the D-3 exit-code tests spawn. Runs are serialised because the
// console capture and the gateway map are process-global.
let helperModule;
let gatewayMap = {};
let queue = Promise.resolve();
function inProcessCli(args, gateway) {
  const runOnce = async () => {
    let stdout = "";
    let stderr = "";
    const { log, error } = console;
    console.log = (...parts) => { stdout += `${parts.join(" ")}\n`; };
    console.error = (...parts) => { stderr += `${parts.join(" ")}\n`; };
    gatewayMap = gateway;
    try {
      return finish(await helperModule.main(args), stdout, stderr);
    } finally {
      console.log = log;
      console.error = error;
    }
  };
  const result = queue.then(runOnce);
  queue = result.catch(() => {});
  return result;
}

function finish(code, stdout, stderr) {
  let json;
  try { json = JSON.parse(stdout); } catch { json = undefined; }
  return { code, stdout, stderr, out: `${stdout}\n${stderr}`, json };
}

/// `spawn: true` for tests whose point is the process exit code.
const cli = (args, { gateway = GATEWAY, spawn: asProcess = false } = {}) => (asProcess ? spawnCli : inProcessCli)(args, gateway);
const expectJson = (result, code) => {
  assert.equal(result.code, code, result.out);
  assert.ok(result.json, `stdout is not one JSON object:\n${result.out}`);
  return result.json;
};

describe("kleros-create-dispute on-chain behaviour (stubbed RPC + gateway)", { skip: skipReason, concurrency: Math.max(2, os.availableParallelism?.() ?? 4) }, () => {
  let stub;
  let dir;
  let caseFile; // court 7, 5 jurors: values distinct from every default
  let evidenceFile;
  const valid = path.join(fixtures, "valid.json");
  let realFetch;
  before(async () => {
    const { tsImport } = require(path.join(scriptsDir, "node_modules", "tsx", "dist", "esm", "api", "index.cjs"));
    helperModule = await tsImport(script, __filename);
    const { createGatewayFetch } = await import(pathToFileURL(path.join(__dirname, "helpers", "mock-gateway.mjs")).href);
    realFetch = globalThis.fetch;
    globalThis.fetch = createGatewayFetch(() => gatewayMap, realFetch);
    stub = await startRpcStub();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "kcd-rpc-"));
    const base = JSON.parse(fs.readFileSync(valid, "utf8"));
    caseFile = path.join(dir, "case.json");
    fs.writeFileSync(caseFile, JSON.stringify({ ...base, courtId: "7", numberOfJurors: 5 }));
    evidenceFile = path.join(dir, "evidence.json");
    fs.writeFileSync(evidenceFile, JSON.stringify({ name: "Courier report", description: "Tracking shows the parcel was returned to sender.", fileURI: "ipfs://QmEvidenceFile/report.pdf", fileTypeExtension: "pdf" }));
  });
  after(async () => {
    if (realFetch) globalThis.fetch = realFetch;
    await stub?.close();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });
  const rpcFor = (chain) => stub.url(chain);
  const calls = (chain, method) => chain.requests.filter((request) => request.method === method);

  // ---- network identity ----------------------------------------------------
  it("refuses an RPC on a chain without a Kleros V2 deployment, and a --network that contradicts the RPC", async () => {
    const mainnetL1 = klerosChain(SEPOLIA, { chainId: 1 });
    let output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(mainnetL1)]), 1);
    assert.equal(output.ok, false);
    assert.match(output.error, /RPC chain 1 has no Kleros V2 deployment/);
    output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA)), "--network", "arbitrum"]), 1);
    assert.match(output.error, /--network arbitrum \(42161\) contradicts the RPC chain 421614/);
  });

  // ---- quote / prepare -----------------------------------------------------
  it("quote: reads the live fee for the case's own extraData after every deployment check", async () => {
    const chain = klerosChain(SEPOLIA);
    const output = expectJson(await cli(["quote", "--case", caseFile, "--rpc-url", rpcFor(chain)]), 0);
    assert.equal(output.ok, true);
    assert.deepEqual(output.blocking, []);
    assert.equal(output.network.chainId, 421614);
    assert.equal(output.valueWei, parseEther("0.0015").toString());
    assert.equal(output.valueEth, "0.0015");
    assert.equal(output.blockNumber, "5000");
    assert.deepEqual(output.checks.map((check) => [check.name, check.status]), [
      ["bytecode", "ok"], ["resolver-arbitrator", "ok"], ["court", "ok"], ["dispute-kit", "ok"], ["arbitrable-whitelist", "ok"], ["policyURI-resolves", "ok"],
    ]);
    assert.match(output.checks.at(-1).detail, /^https:\/\/cdn\.kleros\.link\/ipfs\/bafkqaaa → HTTP 200/);
    assert.equal(Date.parse(output.expiresAt) - Date.parse(output.quotedAt), 300_000);
    // The fee was read for exactly abi.encode(court 7, 5 jurors, dispute kit 1).
    const costCall = calls(chain, "eth_call").map((request) => request.params[0])
      .find((tx) => getAddress(tx.to) === getAddress(SEPOLIA.core) && decodeFunctionData({ abi: coreAbi, data: tx.data }).functionName === "arbitrationCost");
    assert.ok(costCall, "arbitrationCost was never called");
    const [extraData] = decodeFunctionData({ abi: coreAbi, data: costCall.data }).args;
    assert.deepEqual(decodeAbiParameters(parseAbiParameters("uint256, uint256, uint256"), extraData), [7n, 5n, 1n]);
    // The court and dispute-kit reads used the case's court too.
    const reads = calls(chain, "eth_call").map((request) => { try { return decodeFunctionData({ abi: coreAbi, data: request.params[0].data }); } catch { return null; } }).filter(Boolean);
    assert.deepEqual(reads.find((read) => read.functionName === "courts").args, [7n]);
    assert.deepEqual(reads.find((read) => read.functionName === "isSupported").args, [7n, 1n]);
  });

  it("quote: --max-fee below the live fee is refused", async () => {
    const output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA)), "--max-fee", "0.001"]), 1);
    assert.equal(output.kind, "input");
    assert.match(output.error, /arbitration fee 0\.0015 ETH exceeds --max-fee 0\.001 ETH/);
  });

  it("quote: a policy CID the Kleros gateway cannot serve, or serves empty, is a hard stop", async () => {
    let output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA))], { gateway: {} }), 1);
    assert.match(output.error, /policyURI \/ipfs\/bafkqaaa could not be retrieved from the Kleros IPFS gateway \(HTTP 404\)/);
    output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA))], { gateway: { [POLICY]: { body: "" } } }), 1);
    assert.match(output.error, /resolves to EMPTY content/);
  });

  it("quote: refuses a deployment that fails any allowlist check", async () => {
    const cases = [
      [{ code: { [SEPOLIA.core]: "0x6080" } }, /no bytecode at the allowlisted DisputeResolver/],
      [{ arbitrator: OTHER_ARBITRABLE }, /points at arbitrator 0x0+Bb, not the allowlisted Kleros Core/i],
      [{ court: { ...klerosChain(SEPOLIA).state.court, disabled: true } }, /court 2 is disabled/],
      [{ court: REVERT() }, /court 2 does not exist/],
      [{ isSupported: false }, /court 2 does not support dispute kit 1/],
    ];
    await Promise.all(cases.map(async ([overrides, error]) => {
      const output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, overrides))]), 1);
      assert.match(output.error, error);
    }));
  });

  it("quote: Arbitrum One fails closed unless the resolver is positively whitelisted", async () => {
    let output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(ONE, { whitelist: false }))]), 1);
    assert.match(output.error, /enforces an arbitrable whitelist and DisputeResolver 0xb5526D022962A1fFf6eD32C93e8b714c901F4323 is not on it/);
    output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(ONE, { whitelist: REVERT() }))]), 1);
    assert.match(output.error, /could not confirm that DisputeResolver .* is on the Arbitrum One Kleros Core arbitrable whitelist/);
    output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(ONE))]), 0);
    assert.equal(output.network.chainId, 42161);
  });

  it("quote: --max-fee is inclusive — fee == cap is allowed, cap + 1 wei is refused", async () => {
    const cap = parseEther("0.0015");
    let output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { arbitrationCost: cap })), "--max-fee", "0.0015"]), 0);
    assert.equal(output.valueWei, cap.toString());
    output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { arbitrationCost: cap + 1n })), "--max-fee", "0.0015"]), 1);
    assert.equal(output.kind, "input");
    assert.match(output.error, /arbitration fee 0\.001500000000000001 ETH exceeds --max-fee 0\.0015 ETH/);
  });

  // E-1 / batch-3 F-2: viem turns every node answer below into a different error
  // shape. These are the real objects viem builds (test-process viem, against the
  // stub), classified by the helper's own predicates.
  it("revert classification on real viem errors: only a node's revert answer is a revert", async () => {
    const { isContractRevert, isTransactionVerdict, readFailure } = helperModule;
    const cases = [
      ["code 3, data 0x", new RpcError(3, "execution reverted", "0x"), true],
      ["-32000 execution reverted, data 0x", new RpcError(-32000, "execution reverted", "0x"), true],
      ["-32000 execution reverted, no data", new RpcError(-32000, "execution reverted"), true],
      ["-32603 execution reverted", new RpcError(-32603, "execution reverted"), true],
      ["-32603 Internal error", new RpcError(-32603, "Internal error"), false],
      ["-32005 rate limit", new RpcError(-32005, "rate limit exceeded"), false],
      ["-32000 header not found", new RpcError(-32000, "header not found"), false],
      ["-32000 missing trie node", new RpcError(-32000, "missing trie node 1234 (path ) <nil>"), false],
      ["-32601 method not found", new RpcError(-32601, "the method eth_call does not exist/is not available"), false],
      // Nethermind's VM error: viem does not call it a revert, and neither does the helper.
      ["-32015 VM execution error", new RpcError(-32015, "VM execution error.", "revert"), false],
      ["HTTP 429", new HttpStatus(429, "Too Many Requests"), false],
      ["HTTP 503", new HttpStatus(503, "Service Unavailable"), false],
      ["no such function (0x)", ZERO_DATA, true],
    ];
    const abi = parseAbi(["function f(uint256) view returns (bool)", "function g() payable returns (uint256)"]);
    const target = "0x0000000000000000000000000000000000000001";
    for (const [label, answer, revert] of cases) {
      const url = stub.url({
        handle(method) {
          if (method === "eth_chainId") return hex(SEPOLIA.chainId);
          if (answer === ZERO_DATA) return "0x";
          throw answer;
        },
      });
      const rpc = viem.createPublicClient({ transport: viem.http(url, { retryCount: 0 }) });
      const read = await rpc.readContract({ address: target, abi, functionName: "f", args: [1n] }).then(() => assert.fail(`${label}: read did not fail`), (error) => error);
      assert.equal(isContractRevert(read), revert, `${label} (eth_call): ${read.shortMessage}`);
      assert.equal(readFailure(read, "does not exist", "reading").kind, revert ? "input" : "network", label);
      if (answer === ZERO_DATA) continue; // estimateGas never "returns nothing"
      const gas = await rpc.estimateContractGas({ account: FROM, address: target, abi, functionName: "g" }).then(() => assert.fail(`${label}: estimate did not fail`), (error) => error);
      assert.equal(isContractRevert(gas), revert, `${label} (eth_estimateGas): ${gas.shortMessage}`);
      assert.equal(isTransactionVerdict(gas), revert, `${label} (eth_estimateGas)`);
    }
    // A sender that cannot pay is a verdict on the transaction, not a revert.
    const url = stub.url({ handle(method) { if (method === "eth_chainId") return hex(SEPOLIA.chainId); throw new RpcError(-32000, "insufficient funds for gas * price + value: have 0 want 1500000000000000"); } });
    const rpc = viem.createPublicClient({ transport: viem.http(url, { retryCount: 0 }) });
    const poor = await rpc.estimateContractGas({ account: FROM, address: target, abi, functionName: "g" }).then(() => assert.fail("did not fail"), (error) => error);
    assert.ok(!isContractRevert(poor) && isTransactionVerdict(poor));
  });

  it("quote: Sepolia's absent arbitrableWhitelist is 'not enforced' however the node says it reverted", async () => {
    for (const whitelist of [ZERO_DATA, new RpcError(-32000, "execution reverted"), new RpcError(-32000, "execution reverted", "0x"), new RpcError(3, "execution reverted", "0x")]) {
      const output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { whitelist }))]), 0);
      const check = output.checks.find((item) => item.name === "arbitrable-whitelist");
      assert.equal(check.status, "ok");
      assert.match(check.detail, /no arbitrableWhitelist \(call reverts\); no whitelist is enforced/);
    }
    // …but a node failure on that read is not a revert, so it proves nothing.
    const output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { whitelist: new RpcError(-32603, "Internal error") }))]), 1);
    assert.equal(output.kind, "network");
  });

  it("quote: an isSupported read the RPC fails is a network error, never 'kit unsupported'", async () => {
    for (const isSupported of [new HttpStatus(503, "Service Unavailable"), new RpcError(-32005, "rate limit exceeded"), new RpcError(-32000, "header not found")]) {
      const output = expectJson(await cli(["quote", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { isSupported }))]), 1);
      assert.equal(output.kind, "network", output.error);
      assert.match(output.error, /reading isSupported\(2, 1\) on Arbitrum Sepolia failed for a reason other than a contract revert/);
      assert.doesNotMatch(output.error, /does not support/);
    }
  });

  it("prepare: calldata decodes back to exactly the validated case", async () => {
    const chain = klerosChain(SEPOLIA);
    const output = expectJson(await cli(["prepare", "--case", caseFile, "--rpc-url", rpcFor(chain)]), 0);
    assert.equal(output.ok, true);
    assert.equal(output.chainId, 421614);
    assert.equal(output.to, SEPOLIA.resolver);
    assert.equal(output.value, parseEther("0.0015").toString());
    const { functionName, args } = decodeFunctionData({ abi: resolverAbi, data: output.data });
    assert.equal(functionName, "createDisputeForTemplate");
    const [extraData, templateJson, mappings, rulingOptions] = args;
    // abi.encode(uint256 court, uint256 minJurors, uint256 disputeKitId), byte for byte.
    assert.equal(extraData, `0x${[7, 5, 1].map((n) => n.toString(16).padStart(64, "0")).join("")}`);
    assert.equal(mappings, "");
    assert.equal(rulingOptions, 2n);
    const template = JSON.parse(templateJson);
    assert.deepEqual(Object.keys(template), ["title", "description", "question", "answers", "policyURI", "category", "lang", "version", "arbitratorAddress", "arbitratorChainID"]);
    assert.equal(template.arbitratorAddress, SEPOLIA.core);
    assert.equal(template.arbitratorChainID, "421614");
    assert.equal(template.policyURI, POLICY);
    assert.deepEqual(template.answers.map((answer) => answer.id), ["0x01", "0x02"]);
    assert.deepEqual(output.decoded.disputeTemplate, template);
    assert.equal(output.decoded.arbitratorExtraData, extraData);
    assert.equal(output.decoded.numberOfRulingOptions, "2");
  });

  // ---- preflight (M-02 / D-3) ----------------------------------------------
  it("preflight --from: healthy wallet → ok, full ballot, EIP-1559 fee estimate", async () => {
    const chain = klerosChain(SEPOLIA);
    const output = expectJson(await cli(["preflight", "--case", valid, "--rpc-url", rpcFor(chain), "--from", FROM]), 0);
    assert.equal(output.kind, "kleros-v2-dispute-preflight");
    assert.equal(output.status, "REVIEW_ONLY_NOT_SUBMITTED");
    assert.equal(output.ok, true);
    assert.deepEqual(output.blocking, []);
    assert.deepEqual(output.case.ballot.map((option) => [option.ruling, option.title, option.reserved]), [
      ["0x00", "Refuse to Arbitrate / Invalid", true], ["0x01", "Yes", false], ["0x02", "No", false],
    ]);
    const fee = output.price.networkFee;
    assert.equal(fee.available, true);
    assert.equal(fee.sufficientBalance, true);
    assert.equal(fee.estimatedGas, "400000");
    assert.ok(BigInt(fee.maxFeePerGasWei) > 100_000_000n, "maxFeePerGas must be above the base fee");
    assert.equal(BigInt(fee.estimatedFeeWei), 400_000n * BigInt(fee.maxFeePerGasWei));
    assert.equal(BigInt(fee.estimatedTotalWei), parseEther("0.0015") + BigInt(fee.estimatedFeeWei));
    assert.equal(calls(chain, "eth_gasPrice").length, 0, "fees come from the EIP-1559 path, not a legacy gasPrice");
    const [estimate] = calls(chain, "eth_estimateGas");
    assert.equal(getAddress(estimate.params[0].from), FROM);
    assert.equal(BigInt(estimate.params[0].value), parseEther("0.0015"));
    assert.deepEqual(output.checks.find((check) => check.name === "evidence-module-implementation").status, "ok");
    assert.match(output.nextStep, /^Review every field/);
  });

  it("preflight --from: zero balance → exit 2, ok:false, blocking explains and nextStep says BLOCKED", async () => {
    const output = expectJson(await cli(["preflight", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { balance: 0n })), "--from", FROM], { spawn: true }), 2);
    assert.equal(output.ok, false);
    assert.equal(output.blocking.length, 1);
    assert.match(output.blocking[0], /^0x000000000000000000000000000000000000dEaD holds 0 ETH, less than the estimated total .* ETH\. Do not sign/);
    assert.equal(output.price.networkFee.sufficientBalance, false);
    assert.ok(output.warnings.includes(output.blocking[0]));
    assert.match(output.nextStep, /^BLOCKED: do not ask for approval or sign/);
  });

  it("preflight --from: gas estimation revert → exit 2 with the revert reason", async () => {
    const output = expectJson(await cli(["preflight", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { estimateGas: REVERT("Not enough ETH to cover arbitration costs.") })), "--from", FROM], { spawn: true }), 2);
    assert.equal(output.ok, false);
    assert.equal(output.blocking.length, 1);
    assert.match(output.blocking[0], /^The transaction would fail from 0x000000000000000000000000000000000000dEaD: gas estimation .* failed/);
    assert.match(output.blocking[0], /Not enough ETH to cover arbitration costs/);
    assert.equal(output.price.networkFee.available, false);
  });

  it("preflight --from: a gas-estimation failure that is not about the transaction is exit 1 network, never 'would fail'", async () => {
    for (const estimateGas of [new RpcError(-32000, "header not found"), new RpcError(-32601, "the method eth_estimateGas does not exist/is not available")]) {
      const output = expectJson(await cli(["preflight", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { estimateGas })), "--from", FROM], { spawn: estimateGas.code === -32000 }), 1);
      assert.equal(output.kind, "network");
      assert.match(output.error, /^estimating gas from 0x0+dEaD failed for a reason other than a contract revert/);
      assert.doesNotMatch(output.error, /would fail|Do not sign/);
    }
    // A node verdict on the sender (cannot pay) still blocks.
    const output = expectJson(await cli(["preflight", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { estimateGas: new RpcError(-32000, "insufficient funds for gas * price + value: have 0 want 1500000000000000") })), "--from", FROM]), 2);
    assert.match(output.blocking[0], /^The transaction would fail from 0x0+dEaD: .*insufficient funds/i);
  });

  it("preflight --human: BLOCKED banner and exit 2 when blocking; no banner when clean", async () => {
    const blocked = await cli(["preflight", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { balance: 0n })), "--from", FROM, "--human"], { spawn: true });
    assert.equal(blocked.code, 2, blocked.out);
    assert.match(blocked.stdout, /^KLEROS V2 DISPUTE PREFLIGHT — REVIEW ONLY\n/);
    assert.ok(blocked.stdout.includes("!!! BLOCKED — DO NOT SIGN OR BROADCAST !!!"), blocked.stdout);
    assert.match(blocked.stdout, /\nBLOCKING \(resolve before any approval\)\n- 0x0+dEaD holds 0 ETH/);
    assert.match(blocked.stdout, /STATUS: REVIEW_ONLY_NOT_SUBMITTED — BLOCKED\nBLOCKED: do not ask for approval or sign/);
    const clean = await cli(["preflight", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA)), "--from", FROM, "--human"], { spawn: true });
    assert.equal(clean.code, 0, clean.out);
    assert.ok(!clean.stdout.includes("BLOCKED"), clean.stdout);
    assert.match(clean.stdout, /JUROR BALLOT \(3 choices: ruling 0 plus 2 template answers\)\n\[ruling 0x00\] Refuse to Arbitrate \/ Invalid  — reserved by the protocol/);
    assert.match(clean.stdout, /\nSTATUS: REVIEW_ONLY_NOT_SUBMITTED\n/);
  });

  it("preflight: an upgraded EvidenceModule warns (creation is not blocked) and names the evidence step", async () => {
    const output = expectJson(await cli(["preflight", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { implementation: UPGRADED }))]), 0);
    assert.equal(output.ok, true);
    const check = output.checks.find((item) => item.name === "evidence-module-implementation");
    assert.equal(check.status, "warn");
    assert.ok(output.warnings.some((warning) => /^Evidence for this case cannot be submitted through this skill until it is updated: .*now runs implementation 0x1111111111111111111111111111111111111111/.test(warning)), output.warnings.join("\n"));
  });

  // ---- simulate --------------------------------------------------------------
  it("simulate: success reports the next dispute ID; a revert is exit 2, ok:false", async () => {
    let output = expectJson(await cli(["simulate", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA)), "--from", FROM]), 0);
    assert.equal(output.ok, true);
    assert.equal(output.simulation.nextDisputeId, "4242");
    assert.equal(output.simulation.caseUrlIfCreated, "https://v2-testnet.kleros.builders/#/cases/4242");
    output = expectJson(await cli(["simulate", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { simulateResult: REVERT("Arbitration fees not paid.") })), "--from", FROM], { spawn: true }), 2);
    assert.equal(output.ok, false);
    assert.equal(output.simulation.reverted, true);
    assert.equal(output.blocking.length, 1);
    assert.match(output.blocking[0], /^Simulation from 0x0+dEaD failed: .*Arbitration fees not paid.*do not sign/);
  });

  it("simulate: a node failure is exit 1 network; a revert the node words as -32000 still blocks", async () => {
    let output = expectJson(await cli(["simulate", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { simulateResult: new RpcError(-32000, "header not found") })), "--from", FROM]), 1);
    assert.equal(output.kind, "network");
    assert.match(output.error, /^simulating createDisputeForTemplate failed for a reason other than a contract revert/);
    output = expectJson(await cli(["simulate", "--case", valid, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { simulateResult: new RpcError(-32000, "execution reverted") })), "--from", FROM]), 2);
    assert.equal(output.simulation.reverted, true);
  });

  // ---- evidence (B-02) -------------------------------------------------------
  const creation = (net, disputeId, group, extra = {}) => {
    const hash = TX(0xc0ffee);
    return {
      hash,
      overrides: {
        disputes: { [String(disputeId)]: { arbitrated: net.resolver } },
        localIds: { [String(disputeId)]: group },
        receipts: { [hash]: receiptOf(hash, { to: net.resolver, logs: [disputeCreationLog(net, disputeId), disputeRequestLog(net, disputeId, group)] }) },
        ...extra,
      },
    };
  };

  it("evidence: pinned implementation → submitEvidence keyed by the evidence group read from chain, never the case ID", async () => {
    const { hash, overrides } = creation(SEPOLIA, 57n, 12n);
    const chain = klerosChain(SEPOLIA, overrides);
    const output = expectJson(await cli(["evidence", "--evidence", evidenceFile, "--rpc-url", rpcFor(chain), "--creation-tx", hash], { spawn: true }), 0);
    assert.equal(output.kind, "kleros-v2-evidence-preflight");
    assert.equal(output.ok, true);
    assert.equal(output.disputeId, "57");
    assert.equal(output.evidenceGroupId, "12");
    assert.deepEqual(output.checks.map((check) => [check.name, check.status]), [
      ["evidence-module-implementation", "ok"], ["fileURI-resolves", "ok"], ["dispute", "ok"], ["evidence-group", "ok"],
    ]);
    assert.match(output.checks[3].detail, /read from the DisputeRequest event in 0x0+c0ffee and DisputeResolver\.arbitratorDisputeIDToLocalID/);
    assert.equal(output.transaction.to, SEPOLIA.evidenceModule);
    assert.equal(output.transaction.valueWei, "0");
    const { functionName, args } = decodeFunctionData({ abi: evidenceAbi, data: output.transaction.calldata });
    assert.equal(functionName, "submitEvidence");
    assert.equal(args[0], 12n, "keyed by the evidence group, not dispute 57");
    // Evidence JSON shape: a stringified object with the normalised fileURI.
    assert.equal(args[1], output.evidenceString);
    assert.deepEqual(JSON.parse(args[1]), { name: "Courier report", description: "Tracking shows the parcel was returned to sender.", fileURI: EVIDENCE_FILE, fileTypeExtension: "pdf" });
    // The pin was read from the EIP-1967 slot of the allowlisted proxy.
    const storage = calls(chain, "eth_getStorageAt");
    assert.ok(storage.some((request) => getAddress(request.params[0]) === SEPOLIA.evidenceModule && request.params[1] === EIP1967_SLOT));
  });

  it("evidence: Arbitrum One pin is checked as well", async () => {
    const { hash, overrides } = creation(ONE, 900n, 31n);
    expectJson(await cli(["evidence", "--evidence", evidenceFile, "--rpc-url", rpcFor(klerosChain(ONE, overrides)), "--creation-tx", hash]), 0);
    const output = expectJson(await cli(["evidence", "--evidence", evidenceFile, "--rpc-url", rpcFor(klerosChain(ONE, { ...overrides, implementation: SEPOLIA.pin })), "--creation-tx", hash]), 1);
    assert.match(output.error, /Arbitrum One EvidenceModule 0x48e052B4A6dC4F30e90930F1CeaAFd83b3981EB3 now runs implementation 0xC4e64e6E949936a18269937FC1e18cb11E3db14D, not the 0xA502A3942abCF8e71FBD87ed442B39b798b192C8/);
  });

  it("evidence: an upgraded or missing EvidenceModule implementation is refused before anything is prepared", async () => {
    for (const implementation of [UPGRADED, null]) {
      const { overrides } = creation(SEPOLIA, 57n, 12n);
      const chain = klerosChain(SEPOLIA, { ...overrides, implementation });
      const result = await cli(["evidence", "--evidence", evidenceFile, "--rpc-url", rpcFor(chain), "--dispute", "57"], { spawn: true });
      const output = expectJson(result, 1);
      assert.equal(output.ok, false);
      assert.equal(output.kind, "input");
      assert.match(output.error, new RegExp(`Arbitrum Sepolia EvidenceModule ${SEPOLIA.evidenceModule} now runs implementation ${implementation ?? "\\(none\\)"}, not the ${SEPOLIA.pin}`));
      assert.ok(!result.stdout.includes("calldata"), "no transaction may be emitted");
      assert.equal(calls(chain, "eth_getTransactionReceipt").length + calls(chain, "eth_call").length, 0, "refused before any dispute lookup");
    }
  });

  it("evidence: a caller-supplied --evidence-group that contradicts the chain is refused", async () => {
    const { overrides } = creation(SEPOLIA, 57n, 12n);
    const output = expectJson(await cli(["evidence", "--evidence", evidenceFile, "--rpc-url", rpcFor(klerosChain(SEPOLIA, overrides)), "--dispute", "57", "--evidence-group", "57"]), 1);
    assert.match(output.error, /--evidence-group 57 contradicts the chain, which keys dispute 57 to evidence group 12/);
  });

  it("evidence: creation event and resolver mapping must agree", async () => {
    const { hash, overrides } = creation(SEPOLIA, 57n, 12n);
    const output = expectJson(await cli(["evidence", "--evidence", evidenceFile, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { ...overrides, localIds: { 57: 13n } })), "--creation-tx", hash]), 1);
    assert.match(output.error, /disagree about the evidence group of dispute 57 \(12 vs 13\)/);
  });

  it("evidence: a dispute of another arbitrable is refused (not this skill's case); an evidence file the gateway lacks is refused", async () => {
    let output = expectJson(await cli(["evidence", "--evidence", evidenceFile, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { disputes: { 8: { arbitrated: OTHER_ARBITRABLE } } })), "--dispute", "8"]), 1);
    assert.match(output.error, /dispute 8 belongs to arbitrable 0x0+Bb, not this skill's DisputeResolver.*own flow/i);
    const { overrides } = creation(SEPOLIA, 57n, 12n);
    output = expectJson(await cli(["evidence", "--evidence", evidenceFile, "--rpc-url", rpcFor(klerosChain(SEPOLIA, overrides)), "--dispute", "57"], { gateway: { [POLICY]: GATEWAY[POLICY] } }), 1);
    assert.match(output.error, /fileURI \/ipfs\/QmEvidenceFile\/report\.pdf could not be retrieved/);
  });

  // ---- receipt (M-02 / B-02) -------------------------------------------------
  it("receipt: a creation tx yields the dispute ID and its evidence group from the logs", async () => {
    const { hash, overrides } = creation(SEPOLIA, 57n, 12n);
    const chain = klerosChain(SEPOLIA, overrides);
    const output = expectJson(await cli(["receipt", "--tx", hash, "--rpc-url", rpcFor(chain)]), 0);
    assert.equal(output.kind, "kleros-v2-dispute-receipt");
    assert.equal(output.ok, true);
    assert.equal(output.status, "success");
    assert.equal(output.sentToAllowlistedResolver, true);
    assert.deepEqual(output.disputes, [{ disputeId: "57", evidenceGroupId: "12", arbitrable: SEPOLIA.resolver, viaAllowlistedResolver: true, caseUrl: "https://v2-testnet.kleros.builders/#/cases/57" }]);
    assert.deepEqual(output.evidence, []);
    assert.deepEqual(output.checks, [], "no evidence relied on → no implementation read needed");
  });

  it("receipt: a reverted tx is exit 2, ok:false", async () => {
    const hash = TX(0xbad);
    const chain = klerosChain(SEPOLIA, { receipts: { [hash]: receiptOf(hash, { status: "0x0", to: SEPOLIA.resolver }) } });
    const output = expectJson(await cli(["receipt", "--tx", hash, "--rpc-url", rpcFor(chain)], { spawn: true }), 2);
    assert.equal(output.ok, false);
    assert.equal(output.status, "reverted");
    assert.deepEqual(output.blocking, [`Transaction ${hash} REVERTED: nothing was created or submitted. Do not report success.`]);
  });

  it("receipt: a tx unrelated to this deployment is exit 2", async () => {
    const hash = TX(0x1234);
    const chain = klerosChain(SEPOLIA, { receipts: { [hash]: receiptOf(hash, { to: OTHER_ARBITRABLE, logs: [disputeCreationLog({ ...SEPOLIA, core: OTHER_ARBITRABLE }, 5n)] }) } });
    const output = expectJson(await cli(["receipt", "--tx", hash, "--rpc-url", rpcFor(chain)]), 2);
    assert.match(output.blocking[0], /emitted no DisputeCreation from Kleros Core and no Evidence from the EvidenceModule/);
  });

  const evidenceTx = (net, disputeId, group, keyedTo, text, extra = {}) => {
    const hash = TX(0xe1);
    return {
      hash,
      chain: klerosChain(net, {
        disputes: { [String(disputeId)]: { arbitrated: net.resolver } },
        localIds: { [String(disputeId)]: group },
        receipts: { [hash]: receiptOf(hash, { to: net.evidenceModule, logs: [evidenceLog(net, keyedTo, text)], blockNumber: 4_321n }) },
        ...extra,
      }),
    };
  };
  const EVIDENCE_TEXT = JSON.stringify({ name: "Courier report", description: "Returned to sender." });

  it("receipt --dispute: evidence keyed to the case's group, pinned implementation at that block → ok", async () => {
    const { hash, chain } = evidenceTx(SEPOLIA, 57n, 12n, 12n, EVIDENCE_TEXT);
    const output = expectJson(await cli(["receipt", "--tx", hash, "--rpc-url", rpcFor(chain), "--dispute", "57"]), 0);
    assert.equal(output.ok, true);
    assert.deepEqual(output.expected, { disputeId: "57", evidenceGroupId: "12" });
    assert.equal(output.evidence.length, 1);
    assert.deepEqual(
      { ...output.evidence[0], parsed: undefined },
      { evidenceGroupId: "12", disputeId: "57", keyedToExpectedDispute: true, party: PARTY, evidence: EVIDENCE_TEXT, parsed: undefined, caseUrl: "https://v2-testnet.kleros.builders/#/cases/57" },
    );
    assert.deepEqual(output.checks, [{ name: "evidence-module-implementation", status: "ok", detail: `Pinned implementation ${SEPOLIA.pin} at block 4321.` }]);
    const atBlock = calls(chain, "eth_getStorageAt").find((request) => request.params[1] === EIP1967_SLOT);
    assert.equal(atBlock.params[2], hex(4_321n), "the implementation must be read as of the transaction's block");
  });

  it("receipt --dispute: MIS-KEYED evidence is exit 2", async () => {
    const { hash, chain } = evidenceTx(SEPOLIA, 57n, 12n, 57n, EVIDENCE_TEXT);
    const output = expectJson(await cli(["receipt", "--tx", hash, "--rpc-url", rpcFor(chain), "--dispute", "57"], { spawn: true }), 2);
    assert.equal(output.ok, false);
    assert.equal(output.evidence[0].keyedToExpectedDispute, false);
    assert.equal(output.blocking.length, 1);
    assert.match(output.blocking[0], /^MIS-KEYED evidence: dispute 57 indexes evidence group 12, and at least one Evidence event uses a different key/);
  });

  it("receipt: evidence under an upgraded EvidenceModule implementation is exit 2", async () => {
    const { hash, chain } = evidenceTx(SEPOLIA, 57n, 12n, 12n, EVIDENCE_TEXT, { implementation: UPGRADED });
    for (const args of [["--dispute", "57"], []]) {
      const output = expectJson(await cli(["receipt", "--tx", hash, "--rpc-url", rpcFor(chain), ...args], { spawn: true }), 2);
      assert.equal(output.ok, false);
      assert.deepEqual(output.checks, [{ name: "evidence-module-implementation", status: "fail", detail: `${UPGRADED} at block 4321` }]);
      assert.equal(output.blocking.length, 1);
      assert.match(output.blocking[0], new RegExp(`^At block 4321: the Arbitrum Sepolia EvidenceModule .* now runs implementation ${UPGRADED}, not the ${SEPOLIA.pin}`));
    }
  });

  it("receipt: without historical state the pin is checked at latest and says so", async () => {
    const { hash, chain } = evidenceTx(SEPOLIA, 57n, 12n, 12n, EVIDENCE_TEXT, { historicalState: false });
    const output = expectJson(await cli(["receipt", "--tx", hash, "--rpc-url", rpcFor(chain), "--dispute", "57"]), 0);
    assert.equal(output.checks[0].status, "ok");
    assert.match(output.checks[0].detail, /at latest block \(historical state unavailable on this RPC\)/);
  });

  it("receipt: evidence that is not a JSON object is exit 2", async () => {
    for (const text of ["/ipfs/QmBareUri", "[1,2]"]) {
      const { hash, chain } = evidenceTx(SEPOLIA, 57n, 12n, 12n, text);
      const output = expectJson(await cli(["receipt", "--tx", hash, "--rpc-url", rpcFor(chain)]), 2);
      assert.equal(output.blocking.length, 1, text);
      assert.match(output.blocking[0], /not a JSON object/);
    }
  });

  it("receipt --dispute: a successful tx with no Evidence event is exit 2, even when it created a dispute", async () => {
    const { hash, overrides } = creation(SEPOLIA, 57n, 12n);
    let output = expectJson(await cli(["receipt", "--tx", hash, "--rpc-url", rpcFor(klerosChain(SEPOLIA, overrides)), "--dispute", "57"]), 2);
    assert.equal(output.ok, false);
    assert.deepEqual(output.blocking, [`--dispute 57 asks to verify evidence, but ${hash} contains no Evidence event from the EvidenceModule.`]);
    // Neither DisputeCreation nor Evidence: both reasons are reported.
    const other = TX(0x5151);
    output = expectJson(await cli(["receipt", "--tx", other, "--rpc-url", rpcFor(klerosChain(SEPOLIA, { ...overrides, receipts: { [other]: receiptOf(other, { to: OTHER_ARBITRABLE }) } })), "--dispute", "57"]), 2);
    assert.equal(output.blocking.length, 2);
    assert.match(output.blocking[0], /emitted no DisputeCreation from Kleros Core and no Evidence/);
    assert.match(output.blocking[1], /^--dispute 57 asks to verify evidence, but .* contains no Evidence event/);
  });

  it("receipt: an unknown tx hash is an input error, not a crash", async () => {
    const output = expectJson(await cli(["receipt", "--tx", TX(0x404), "--rpc-url", rpcFor(klerosChain(SEPOLIA))]), 1);
    assert.equal(output.kind, "input");
    assert.match(output.error, /Transaction receipt with hash .* could not be found/i);
  });
});
