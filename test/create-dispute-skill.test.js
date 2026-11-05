// The create-dispute skill documents its deployment allowlist and its command
// surface in prose; the helper is what actually runs. These assertions keep the
// two from drifting — a wrong address in SKILL.md is a real safety failure.
//
// The "helper behaviour" suite runs the real TypeScript helper, offline only
// (validate + argument parsing; no RPC, no IPFS). It needs the helper's own
// dependencies: run `npm ci` in kleros-create-dispute/scripts/ first. Without
// them that suite is skipped with a message rather than failing.
const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const os = require("node:os");

const skillDir = path.join(__dirname, "..", "kleros-create-dispute");
const skill = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
const helper = fs.readFileSync(path.join(skillDir, "scripts", "prepare-dispute.ts"), "utf8");

const NETWORKS = [
  { chainId: "42161", core: "0x991d2df165670b9cac3B022f4B68D65b664222ea", resolver: "0xb5526D022962A1fFf6eD32C93e8b714c901F4323", evidenceModule: "0x48e052B4A6dC4F30e90930F1CeaAFd83b3981EB3" },
  { chainId: "421614", core: "0xE8442307d36e9bf6aB27F1A009F95CE8E11C3479", resolver: "0xed31bEE8b1F7cE89E93033C0d3B2ccF4cEb27652", evidenceModule: "0xA88A9a25cE7f1d8b3941dA3b322Ba91D009E1397" },
];
// m-14: path-independent and pinned to the lockfile's tsx (a bare `npx tsx` outside scripts/ fetches tsx@latest).
const INVOKE = 'npm --prefix "${CLAUDE_SKILL_DIR}/scripts" exec -- tsx "${CLAUDE_SKILL_DIR}/scripts/prepare-dispute.ts"';
const COMMANDS = ["validate", "quote", "preflight", "prepare", "simulate", "evidence", "receipt"];

// Documentation drift. Everything below is about prose (SKILL.md) or the
// source layout, which no behaviour test can execute; the helper's behaviour is
// covered by the "helper behaviour" suite below and by
// create-dispute-rpc.test.js (stubbed RPC + gateway).
describe("kleros-create-dispute", () => {
  // SKILL.md must name the same deployments the helper uses (the helper's own
  // values are checked against chain-shaped stubs in create-dispute-rpc.test.js).
  it("pins both Kleros V2 deployments in the helper and the skill", () => {
    for (const network of NETWORKS) {
      for (const value of [network.chainId, network.core, network.resolver, network.evidenceModule]) {
        assert.ok(helper.includes(value), `helper is missing ${value}`);
        assert.ok(skill.includes(value), `SKILL.md is missing ${value}`);
      }
    }
  });

  // Structural: one allowlist table, no stray address a future edit could use
  // instead of it. Not observable from outside the process.
  it("never hardcodes a single chain outside the network table", () => {
    const table = helper.slice(helper.indexOf("const NETWORKS = {"), helper.indexOf("} as const;"));
    for (const network of NETWORKS) {
      const outside = helper.replace(table, "");
      for (const address of [network.core, network.resolver, network.evidenceModule]) {
        assert.ok(!outside.includes(address), `${address} leaked outside the NETWORKS table`);
      }
    }
  });

  it("documents every command", () => {
    for (const command of COMMANDS) {
      assert.ok(skill.includes(`${INVOKE} ${command}`), `SKILL.md does not document ${command} with the path-independent, lockfile-pinned invocation`);
    }
  });

  it("m-14 runs the helper by skill path with the locked tsx, never a bare npx from cwd", () => {
    assert.ok(skill.includes('npm ci --prefix "${CLAUDE_SKILL_DIR}/scripts"'), "install must target the skill's scripts dir");
    assert.match(skill, /`\$\{CLAUDE_SKILL_DIR\}` is the directory containing this SKILL\.md/);
    assert.doesNotMatch(skill, /npx tsx\s+["$\w]/, "npx outside scripts/ installs an unpinned tsx@latest");
  });

  it("routes policy uploads and feedback instead of restating them", () => {
    assert.match(skill, /\.\.\/kleros-ipfs-upload\/SKILL\.md/);
    assert.match(skill, /\.\.\/feedback\/SKILL\.md/);
  });

  it("tells the agent never to invent a CID", () => {
    assert.match(skill, /never write a CID you did not receive from an actual upload/i);
  });

  it("documents the evidence JSON shape rather than a bare IPFS URI", () => {
    assert.match(skill, /stringified JSON object/);
    assert.match(skill, /"fileURI"/);
  });

  it("states the reserved-ruling rule", () => {
    assert.match(skill, /never write a refuse or invalid answer of your own/i, "SKILL.md must state the rule");
  });

  it("tells the reviewer the preflight ballot is the juror ballot", () => {
    assert.match(skill, /preflight ballot is what jurors will see/i, "SKILL.md must tell the reviewer what they are reviewing");
  });

  it("keeps SKILL.md honest about the evidence key and about what 'submitted' means", () => {
    assert.match(skill, /evidence group is not the dispute ID/i, "SKILL.md must say the evidence group is not the dispute ID");
    assert.doesNotMatch(skill, /re-run with --creation-tx/, "no dead-end advice for foreign disputes");
    assert.match(skill, /allocated by different contracts and must never be assumed to match/, "SKILL.md must explain why the evidence key is derived independently");
    assert.match(skill, /Creating a dispute does not submit evidence/, "SKILL.md must separate creation from evidence");
    assert.match(skill, /indexed and visible/i, "SKILL.md must distinguish confirmed from indexed from visible");
    assert.ok(skill.includes(`${INVOKE} receipt   --tx 0x... --rpc-url RPC [--dispute ID]`), "SKILL.md must document the evidence verification flag");
  });

  it("documents ok/blocking, the stop rule and the dated evidence-key caveat", () => {
    assert.match(skill, /On `ok:false` or any non-zero exit/);
    assert.match(skill, /Version caveat \(verified \d{4}-\d{2}-\d{2}\)/, "SKILL.md must date the evidence-key caveat");
  });
});

// ---------------------------------------------------------------------------
// Helper behaviour (offline). Spawns the real CLI through the scripts' own tsx.
// ---------------------------------------------------------------------------
const scriptsDir = path.join(skillDir, "scripts");
const script = path.join(scriptsDir, "prepare-dispute.ts");
const tsxBin = path.join(scriptsDir, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const tsxApi = path.join(scriptsDir, "node_modules", "tsx", "dist", "esm", "api", "index.cjs");
const fixtures = path.join(__dirname, "fixtures", "create-dispute");
const haveDeps = fs.existsSync(tsxBin) && fs.existsSync(tsxApi);
const skipReason = haveDeps ? false : "helper deps missing: run `npm ci` in kleros-create-dispute/scripts";
// CI must run this suite, never skip it: a silent skip would ship untested
// transaction-building code. sync-master.yml installs the deps before npm test.
if (!haveDeps && process.env.CI) {
  throw new Error("CI is set but kleros-create-dispute/scripts deps are missing: run `npm ci --prefix kleros-create-dispute/scripts` before `npm test`");
}

// Async so the suite's tests can run concurrently (each spawn costs ~1 s of
// tsx + viem start-up; run serially the file alone took ~55 s).
function run(...args) {
  return new Promise((resolve, reject) => {
    const child = spawn(tsxBin, [script, ...args], { env: { ...process.env, DEBUG: "" }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 60_000);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, out: `${stdout}\n${stderr}` });
    });
  });
}
const fixture = (name) => path.join(fixtures, `${name}.json`);
// A syntactically valid but unreachable RPC: argument errors must fire before
// any network call, so these runs never touch it.
const DEAD_RPC = "http://127.0.0.1:9";

describe("kleros-create-dispute helper behaviour", { skip: skipReason, concurrency: Math.max(2, os.availableParallelism?.() ?? 4) }, () => {
  let helperModule;
  before(async () => {
    const { tsImport } = require(tsxApi);
    helperModule = await tsImport(script, __filename);
  });

  it("validates a well-formed case offline and reports ok", async () => {
    const result = await run("validate", "--case", fixture("valid"), "--network", "arbitrumSepolia");
    assert.equal(result.code, 0, result.out);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, true);
    assert.deepEqual(output.blocking, []);
    assert.equal(output.template.policyURI, "/ipfs/bafkqaaa");
  });

  // n-15: the test uses the helper's own pattern instead of restating it.
  it("reserved-ruling pattern catches refuse options and spares real answers", async () => {
    const { pattern } = helperModule.RESERVED_RULING;
    for (const title of ["Refuse to Arbitrate / Invalid", "refuse to arbitrate", "Invalid", "Refuse"]) {
      assert.ok(pattern.test(title), `${title} must be caught as a duplicate refuse option`);
    }
    for (const title of ["Refund the buyer", "Pay the seller", "Refuse the refund request"]) {
      assert.ok(!pattern.test(title), `${title} is a legitimate answer and must not be rejected`);
    }
  });

  // B-01: the Court renders templates through mustache; braces are permanent damage.
  for (const [name, field] of [
    ["mustache-unclosed", "description"],
    ["mustache-variable", "title"],
    ["mustache-answer-close", "answers[1].description"],
  ]) {
    it(`B-01 rejects mustache delimiters (${name})`, async () => {
      const result = await run("validate", "--case", fixture(name), "--network", "arbitrumSepolia");
      assert.notEqual(result.code, 0, result.out);
      assert.ok(result.out.includes(`${field} contains "{{" or "}}"`), result.out);
    });
  }

  // M-03: aligned with (and stricter than) the SDK's isMultiaddr.
  for (const name of ["ipfs-dotdot", "ipfs-whitespace", "ipfs-trailing-slash", "ipfs-query"]) {
    it(`M-03 rejects malformed IPFS URI (${name})`, async () => {
      const result = await run("validate", "--case", fixture(name), "--network", "arbitrumSepolia");
      assert.notEqual(result.code, 0, result.out);
      assert.match(result.out, /policyURI must be an IPFS reference/);
    });
  }

  it("M-03 normalises ipfs:// with a path to /ipfs/", async () => {
    const result = await run("validate", "--case", fixture("ipfs-scheme-path"), "--network", "arbitrumSepolia");
    assert.equal(result.code, 0, result.out);
    assert.equal(JSON.parse(result.stdout).template.policyURI, "/ipfs/QmPolicy/policy.pdf");
    const { normalizeIpfsUri } = helperModule;
    for (const bad of ["/ipfs/Qm/../x", "/ipfs/Qm/./x", "/ipfs/Qm//x", "/ipfs/Qm/x#y", "/ipfs/Qm x", "/ipfs/", "/ipfs/QmA/%2e%2e/QmB", "/ipfs/QmA/.%2E/QmB", "/ipfs/QmA/a\\..\\..\\QmB"]) {
      assert.throws(() => normalizeIpfsUri(bad, "fileURI"), /fileURI must be an IPFS reference/, bad);
    }
  });

  // m-07: decimal-only, normalised identifiers.
  it("m-07 normalises courtId \"01\" to \"1\" and still warns about the General Court", async () => {
    const result = await run("validate", "--case", fixture("court-leading-zero"), "--network", "arbitrumSepolia");
    assert.equal(result.code, 0, result.out);
    const output = JSON.parse(result.stdout);
    assert.ok(output.warnings.some((warning) => warning.startsWith("General Court (1)")), result.out);
    assert.equal(
      output.extraData.slice(0, 66),
      `0x${"0".repeat(63)}1`,
      "extraData must encode court 1",
    );
  });

  for (const name of ["court-hex", "court-garbage"]) {
    it(`m-07 rejects non-decimal courtId (${name})`, async () => {
      const result = await run("validate", "--case", fixture(name), "--network", "arbitrumSepolia");
      assert.notEqual(result.code, 0, result.out);
      assert.match(result.out, /courtId must be a decimal integer/);
    });
  }

  it("m-07 rejects hex/garbage dispute IDs and malformed tx hashes before any network call", async () => {
    let result = await run("evidence", "--evidence", fixture("valid"), "--rpc-url", DEAD_RPC, "--dispute", "0x10");
    assert.notEqual(result.code, 0);
    assert.match(result.out, /--dispute must be a decimal integer/);
    result = await run("evidence", "--evidence", fixture("valid"), "--rpc-url", DEAD_RPC, "--dispute", "1", "--evidence-group", "abc");
    assert.match(result.out, /--evidence-group must be a decimal integer/);
    result = await run("receipt", "--tx", "0x1234", "--rpc-url", DEAD_RPC);
    assert.match(result.out, /--tx must be a transaction hash/);
    result = await run("evidence", "--evidence", fixture("valid"), "--rpc-url", DEAD_RPC, "--creation-tx", `0x${"g".repeat(64)}`);
    assert.match(result.out, /--creation-tx must be a transaction hash/);
    assert.equal(helperModule.parseDecimalId("007", "--dispute"), 7n);
  });

  // M-01: no silently dropped flags.
  it("M-01 errors on a valueless --max-fee instead of dropping the cap", async () => {
    const result = await run("quote", "--case", fixture("valid"), "--rpc-url", DEAD_RPC, "--max-fee");
    assert.notEqual(result.code, 0);
    assert.match(result.out, /--max-fee needs a value/);
    const followed = await run("quote", "--case", fixture("valid"), "--max-fee", "--rpc-url", DEAD_RPC);
    assert.match(followed.out, /--max-fee needs a value/);
  });

  it("M-01 rejects unknown flags such as --maxfee", async () => {
    const result = await run("quote", "--case", fixture("valid"), "--rpc-url", DEAD_RPC, "--maxfee", "0.01");
    assert.notEqual(result.code, 0);
    assert.match(result.out, /unknown flag --maxfee for quote/);
    const wrongCommand = await run("validate", "--case", fixture("valid"), "--from", "0x000000000000000000000000000000000000dEaD");
    assert.match(wrongCommand.out, /unknown flag --from for validate/);
  });

  it("M-01 parses --max-fee before any network call", async () => {
    const result = await run("quote", "--case", fixture("valid"), "--rpc-url", DEAD_RPC, "--max-fee", "abc");
    assert.match(result.out, /--max-fee must be a decimal ETH amount/);
    const from = await run("simulate", "--case", fixture("valid"), "--rpc-url", DEAD_RPC, "--from", "0x1234");
    assert.match(from.out, /--from must be a 0x-prefixed 20-byte address/);
  });

  it("M-01 keeps --human a switch that never swallows the next token", async () => {
    const { parseArgs } = helperModule;
    const args = parseArgs("preflight", ["--human", "--case", "c.json", "--rpc-url", "http://x"]);
    assert.equal(args.get("--human"), true);
    assert.equal(args.get("--case"), "c.json");
    assert.throws(() => parseArgs("preflight", ["--case", "c.json", "--rpc-url", "http://x", "--human", "yes"]), /unexpected argument "yes"/);
    assert.throws(() => parseArgs("preflight", ["--case", "c.json", "--rpc-url", "http://x", "--human=yes"]), /takes no value/);
    assert.throws(() => parseArgs("preflight", ["--case", "a", "--case", "b", "--rpc-url", "http://x"]), /more than once/);
    assert.throws(() => parseArgs("simulate", ["--case", "c.json", "--rpc-url", "http://x"]), /--from is required/);
  });

  it("implements exactly the documented commands", () => {
    assert.deepEqual(Object.keys(helperModule.COMMAND_FLAGS).sort(), [...COMMANDS].sort());
  });

  // B-02: the pins must be the verified implementations. The on-chain check
  // itself (refuse on mismatch, pass on match) runs in create-dispute-rpc.test.js.
  it("B-02 pins the verified EvidenceModule implementation per network", () => {
    assert.deepEqual(
      Object.fromEntries(Object.values(helperModule.NETWORKS).map((network) => [network.key, network.evidenceModuleImplementation])),
      { arbitrum: "0xA502A3942abCF8e71FBD87ed442B39b798b192C8", arbitrumSepolia: "0xC4e64e6E949936a18269937FC1e18cb11E3db14D" },
    );
  });

  // ---- batch 3: validate() / validateEvidence() semantics (M-06) -------------
  const baseCase = () => JSON.parse(fs.readFileSync(fixture("valid"), "utf8"));
  const onSepolia = (value) => helperModule.validate(value, helperModule.NETWORKS.arbitrumSepolia);
  const schemaError = (fn) => {
    try { fn(); } catch (error) {
      assert.equal(error.name, "ZodError", `expected a schema error, got: ${error.message}`);
      return helperModule.formatZodError(error);
    }
    return assert.fail("expected a schema error");
  };
  const answer = (id, title) => ({ id, title, description: `Jurors pick ${title} here.` });
  const word = (n) => n.toString(16).padStart(64, "0");

  it("M-06 schema rejects unknown keys and missing or malformed required fields", () => {
    assert.match(schemaError(() => onSepolia({ ...baseCase(), arbitrator: "0x01" })), /^invalid input: \(root\): Unrecognized key: "arbitrator"/);
    const inner = baseCase();
    inner.answers[0].ruling = 1;
    assert.match(schemaError(() => onSepolia(inner)), /^invalid input: answers\[0\]: Unrecognized key: "ruling"/);
    for (const field of ["schemaVersion", "title", "description", "question", "answers", "policyURI"]) {
      const value = baseCase();
      delete value[field];
      assert.match(schemaError(() => onSepolia(value)), new RegExp(`^invalid input: ${field}: `), field);
    }
    for (const [patch, path] of [
      [{ schemaVersion: "2.0" }, "schemaVersion"],
      [{ answers: [answer("0x01", "Yes")] }, "answers"],
      [{ answers: Array.from({ length: 33 }, (_, i) => answer(`0x${(i + 1).toString(16)}`, `Option ${i + 1}`)) }, "answers"],
      [{ numberOfJurors: 0 }, "numberOfJurors"],
      [{ numberOfJurors: 3.5 }, "numberOfJurors"],
      [{ disputeKitId: 2 }, "disputeKitId"],
      [{ lang: "en-us" }, "lang"],
      [{ courtId: 2 }, "courtId"],
    ]) {
      assert.match(schemaError(() => onSepolia({ ...baseCase(), ...patch })), new RegExp(`^invalid input: ${path.replace(/[[\]]/g, "\\$&")}: `), JSON.stringify(patch));
    }
  });

  it("M-06 schema errors reach the CLI as exit 1 / kind input", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kcd-"));
    const file = path.join(dir, "extra.json");
    fs.writeFileSync(file, JSON.stringify({ ...baseCase(), numberOfRulingOptions: 3 }));
    try {
      const output = assertCleanError(await run("validate", "--case", file, "--network", "arbitrumSepolia"), 1, "input");
      assert.match(output.error, /Unrecognized key: "numberOfRulingOptions"/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("E-4 an error carrying user text with newlines is still one stderr line", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kcd-"));
    const file = path.join(dir, "newline.json");
    const value = baseCase();
    value.answers = [answer("0x01", "Pay\nthe seller"), answer("0x02", "Pay\n\n  the seller")];
    fs.writeFileSync(file, JSON.stringify(value));
    try {
      const result = await run("validate", "--case", file, "--network", "arbitrumSepolia");
      const output = assertCleanError(result, 1, "input");
      assert.match(output.error, /duplicates another answer title/);
      assert.ok(output.error.includes("\n"), "the JSON error keeps the exact text");
      assert.equal(result.stderr.split("\n").filter(Boolean).length, 1, `stderr must be one line:\n${result.stderr}`);
      assert.match(result.stderr, /^prepare-dispute: input error: answers\[1\] "Pay the seller" duplicates/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("M-06 answer IDs must run 0x01..0xN, are emitted as two-digit hex, and set numberOfRulingOptions", () => {
    const value = baseCase();
    value.answers = [answer("0x1", "Refund"), answer("0x0002", "Pay"), answer("0x03", "Split")];
    const result = onSepolia(value);
    assert.deepEqual(result.template.answers.map((item) => item.id), ["0x01", "0x02", "0x03"]);
    assert.equal(result.numberOfRulingOptions, 3n);
    const sixteen = baseCase();
    sixteen.answers = Array.from({ length: 16 }, (_, i) => answer(`0x${(i + 1).toString(16)}`, `Option ${i + 1}`));
    assert.equal(onSepolia(sixteen).template.answers.at(-1).id, "0x10");
    for (const [answers, error] of [
      [[answer("0x02", "Refund"), answer("0x01", "Pay")], /answers\[0\]\.id must be 0x01/],
      [[answer("0x01", "Refund"), answer("0x03", "Pay")], /answers\[1\]\.id must be 0x02/],
      // A 0x0 answer cannot slip in at any position: ruling 0 is the protocol's.
      [[answer("0x0", "Refuse to arbitrate"), answer("0x01", "Refund"), answer("0x02", "Pay")], /answers\[0\]\.id must be 0x01/],
      [[answer("0x01", "Refund"), answer("0x02", "Pay"), answer("0x00", "Nobody wins")], /answers\[2\]\.id must be 0x03/],
    ]) {
      assert.throws(() => onSepolia({ ...baseCase(), answers }), error);
    }
  });

  it("M-06 rejects an even juror count", () => {
    for (const numberOfJurors of [2, 4, 10_000]) {
      assert.throws(() => onSepolia({ ...baseCase(), numberOfJurors }), /numberOfJurors must be odd/, String(numberOfJurors));
    }
    assert.doesNotThrow(() => onSepolia({ ...baseCase(), numberOfJurors: 1 }));
  });

  it("M-06 rejects an answer that repeats reserved ruling 0, however it is spelled", () => {
    for (const title of ["Refuse to Arbitrate / Invalid", "refuse to arbitrate", "INVALID", "Ｉｎｖａｌｉｄ", "In​valid", "Refuse / Invalid", "Unable to rule", "Refuse"]) {
      assert.throws(
        () => onSepolia({ ...baseCase(), answers: [answer("0x01", "Refund"), answer("0x02", title)] }),
        /answers\[1\] ".*" repeats ruling 0, which the Court already puts on every ballot/,
        JSON.stringify(title),
      );
    }
    assert.doesNotThrow(() => onSepolia({ ...baseCase(), answers: [answer("0x01", "Refuse the refund request"), answer("0x02", "Invalidate the order")] }));
  });

  it("M-06 extraData is exactly abi.encode(uint256 court, uint256 minJurors, uint256 disputeKitId)", () => {
    assert.equal(onSepolia({ ...baseCase(), courtId: "7", numberOfJurors: 5 }).extraData, `0x${word(7)}${word(5)}${word(1)}`);
    assert.equal(onSepolia(baseCase()).extraData, `0x${word(2)}${word(3)}${word(1)}`, "defaults: 3 jurors, dispute kit 1");
    const uint96Max = (1n << 96n) - 1n;
    assert.equal(onSepolia({ ...baseCase(), courtId: uint96Max.toString(), numberOfJurors: 10_001 }).extraData, `0x${word(uint96Max)}${word(10_001)}${word(1)}`);
    assert.throws(() => onSepolia({ ...baseCase(), courtId: (uint96Max + 1n).toString() }), /courtId .* is out of range/);
    assert.throws(() => onSepolia({ ...baseCase(), courtId: "0" }), /courtId 0 is the reserved forking court/);
  });

  it("M-06 template JSON has exactly the fields the Court's SDK parses, arbitratorChainID as a string", () => {
    for (const [key, chainId, core] of [["arbitrumSepolia", "421614", NETWORKS[1].core], ["arbitrum", "42161", NETWORKS[0].core]]) {
      const result = helperModule.validate(baseCase(), helperModule.NETWORKS[key]);
      const template = JSON.parse(result.templateJson);
      assert.deepEqual(template, result.template, "templateJson is the template, serialised");
      assert.deepEqual(Object.keys(template), ["title", "description", "question", "answers", "policyURI", "category", "lang", "version", "arbitratorAddress", "arbitratorChainID"]);
      assert.equal(template.arbitratorChainID, chainId);
      assert.equal(template.arbitratorAddress, core);
      assert.deepEqual([template.category, template.lang, template.version], ["Other", "en_US", "1.0"], "SDK-required fields get defaults");
      for (const item of template.answers) assert.deepEqual(Object.keys(item), ["id", "title", "description"]);
      assert.equal(template.policyURI, "/ipfs/bafkqaaa");
    }
  });

  it("M-06 evidence JSON is a normalised object with only the four known fields", () => {
    const { input, evidenceJson } = helperModule.validateEvidence({ name: "  Courier report ", description: "Returned to sender.", fileURI: "ipfs://QmX/a.pdf", fileTypeExtension: "pdf" });
    assert.deepEqual(JSON.parse(evidenceJson), { name: "Courier report", description: "Returned to sender.", fileURI: "/ipfs/QmX/a.pdf", fileTypeExtension: "pdf" });
    assert.deepEqual(input, JSON.parse(evidenceJson));
    assert.deepEqual(JSON.parse(helperModule.validateEvidence({ name: "Note", description: "x" }).evidenceJson), { name: "Note", description: "x" }, "fileURI is optional; a short description is fine (8bbab84)");
    for (const description of ["", "   "]) {
      assert.match(schemaError(() => helperModule.validateEvidence({ name: "Note", description })), /^invalid input: description: /, `m-13 empty description ${JSON.stringify(description)} must be rejected`);
    }
    assert.match(schemaError(() => helperModule.validateEvidence({ name: "Note", description: "x", evidence: "/ipfs/QmX" })), /Unrecognized key: "evidence"/);
    assert.match(schemaError(() => helperModule.validateEvidence({ name: "No", description: "x" })), /^invalid input: name: /);
    assert.match(schemaError(() => helperModule.validateEvidence(["/ipfs/QmX"])), /^invalid input: \(root\): /);
    assert.throws(() => helperModule.validateEvidence({ name: "Note", description: "x", fileURI: "https://example.com/a.pdf" }), /fileURI must be an IPFS reference/);
  });

  // ---- batch 2: CLI hygiene ----------------------------------------------
  const parseJson = (result) => {
    try { return JSON.parse(result.stdout); } catch { assert.fail(`stdout is not one JSON object:\n${result.out}`); }
  };
  const assertCleanError = (result, code, kind) => {
    assert.equal(result.code, code, result.out);
    const output = parseJson(result);
    assert.equal(output.ok, false);
    assert.equal(output.kind, kind, result.out);
    assert.equal(typeof output.error, "string");
    assert.doesNotMatch(result.out, /\n\s+at .+:\d+:\d+/, "no stack trace without DEBUG");
    return output;
  };

  it("M-04 --help, -h and no arguments print usage and exit 0", async () => {
    for (const args of [["--help"], ["-h"], [], ["quote", "--help"]]) {
      const result = await run(...args);
      assert.equal(result.code, 0, `${args.join(" ")}: ${result.out}`);
      assert.match(result.stdout, /^usage: prepare-dispute\.ts <command>/);
    }
  });

  it("M-04 usage errors exit 64 with a JSON error object", async () => {
    let output = assertCleanError(await run("frobnicate"), 64, "usage");
    assert.match(output.error, /unknown command: frobnicate/);
    output = assertCleanError(await run("quote", "--case", fixture("valid"), "--rpc-url", DEAD_RPC, "--maxfee", "1"), 64, "usage");
    assert.match(output.error, /unknown flag --maxfee/);
    assertCleanError(await run("evidence", "--evidence", fixture("valid"), "--rpc-url", DEAD_RPC), 64, "usage");
  });

  it("M-04 input errors exit 1 as concise JSON (missing case file, zod issues)", async () => {
    let output = assertCleanError(await run("validate", "--case", fixture("does-not-exist"), "--network", "arbitrumSepolia"), 1, "input");
    assert.match(output.error, /cannot read case file .*does-not-exist\.json.*no such file/);
    output = assertCleanError(await run("evidence", "--evidence", fixture("valid"), "--rpc-url", DEAD_RPC, "--dispute", "1"), 1, "input");
    assert.match(output.error, /^invalid input: name: /, "zod errors are 'path: message' pairs");
    assert.doesNotMatch(output.error, /"code":|"path":/, "no raw zod issue dump");
  });

  it("M-04 redacts RPC credentials and API keys from error output", async () => {
    for (const rpc of ["http://user:secret@127.0.0.1:9/v2/SECRETKEY", "http://127.0.0.1:9/v2/SECRETKEY?apikey=QUERYKEY"]) {
      const result = await run("quote", "--case", fixture("valid"), "--rpc-url", rpc);
      const output = assertCleanError(result, 1, "network");
      for (const secret of ["SECRETKEY", "secret", "QUERYKEY"]) assert.ok(!result.out.includes(secret), `${secret} leaked: ${result.out}`);
      assert.match(output.error, /could not read the chain ID/);
    }
    const { redact, registerSecretUrl } = helperModule;
    const alchemy = "https://arb-mainnet.g.alchemy.com/v2/abcDEF123456ghiJKL";
    assert.equal(redact(`HTTP request failed. URL: ${alchemy}`), "HTTP request failed. URL: https://arb-mainnet.g.alchemy.com/<redacted>");
    registerSecretUrl("https://rpc.example/key/zzTOPSECRETzz");
    assert.equal(redact("node said zzTOPSECRETzz"), "node said <redacted>", "a registered key is scrubbed even outside a URL");
    assert.equal(redact("see https://cdn.kleros.link/ipfs/bafkqaaa"), "see https://cdn.kleros.link/ipfs/bafkqaaa", "public gateway links stay readable");
    assert.equal(redact("case https://v2-testnet.kleros.builders/#/cases/57"), "case https://v2-testnet.kleros.builders/#/cases/57", "m-04 canonical testnet Court links stay readable");
  });

  it("m-11 validate requires --network instead of defaulting to mainnet", async () => {
    const output = assertCleanError(await run("validate", "--case", fixture("valid")), 64, "usage");
    assert.match(output.error, /--network is required for validate/);
    const mainnet = await run("validate", "--case", fixture("valid"), "--network", "arbitrum");
    assert.equal(mainnet.code, 0, mainnet.out);
    assert.equal(parseJson(mainnet).network.chainId, 42161);
    assert.ok(skill.includes(`${INVOKE} validate  --case CASE --network NET`), "SKILL.md must show --network as required");
  });

  it("m-21 malformed case and evidence JSON name the file", async () => {
    let output = assertCleanError(await run("validate", "--case", fixture("malformed"), "--network", "arbitrumSepolia"), 1, "input");
    assert.match(output.error, /case file ".*malformed\.json" is not valid JSON/);
    output = assertCleanError(await run("evidence", "--evidence", fixture("malformed"), "--rpc-url", DEAD_RPC, "--dispute", "1"), 1, "input");
    assert.match(output.error, /evidence file ".*malformed\.json" is not valid JSON/);
  });

  it("m-09 caps the template by UTF-8 bytes, not characters", async () => {
    const base = JSON.parse(fs.readFileSync(fixture("valid"), "utf8"));
    // 20,000 + 2,000 CJK characters: inside every per-field character limit,
    // but ~66 KB of UTF-8 — over the 64 KiB cap.
    const big = { ...base, lang: "zh_CN", description: "案".repeat(20_000), question: `${"问".repeat(1_999)}？` };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kcd-"));
    const file = path.join(dir, "cjk.json");
    fs.writeFileSync(file, JSON.stringify(big));
    try {
      const output = assertCleanError(await run("validate", "--case", file, "--network", "arbitrumSepolia"), 1, "input");
      assert.match(output.error, /serialized template is \d+ bytes of UTF-8, over the 65536-byte cap/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    assert.equal(helperModule.MAX_TEMPLATE_BYTES, 65536);
    // Evidence: 20,000 CJK characters (at the char limit) plus a CJK file path.
    assert.doesNotThrow(() => helperModule.validateEvidence({ name: "Short", description: "証".repeat(20_000) }));
    assert.throws(
      () => helperModule.validateEvidence({ name: "Long", description: "証".repeat(20_000), fileURI: `/ipfs/QmX/${"書".repeat(2_000)}.pdf` }),
      /evidence JSON is \d+ bytes of UTF-8, over the 65536-byte cap/,
    );
  });

  it("n-07 de-duplicates answer titles after NFKC, invisible-char stripping and case folding", async () => {
    for (const name of ["answers-zero-width", "answers-fullwidth"]) {
      const output = assertCleanError(await run("validate", "--case", fixture(name), "--network", "arbitrumSepolia"), 1, "input");
      assert.match(output.error, /duplicates another answer title/, name);
    }
    const { titleKey } = helperModule;
    assert.equal(titleKey("Ｒｅｆｕｓｅ\u200b  to\tArbitrate"), "refuse to arbitrate");
    assert.equal(titleKey("INVALID"), titleKey("invalid"));
    for (const invisible of ["\u034f", "\ufe0f", "\u3164", "\u2800"]) {
      assert.equal(titleKey(`Yes${invisible}`), "yes", `U+${invisible.codePointAt(0).toString(16)} must fold away`);
      assert.throws(() => helperModule.normalizeIpfsUri(`/ipfs/Qm1/a${invisible}b`, "fileURI"), /fileURI must be an IPFS reference/);
    }
  });

  it("n-08 accepts fullwidth and Arabic question marks", async () => {
    for (const name of ["question-arabic", "question-fullwidth"]) {
      const result = await run("validate", "--case", fixture(name), "--network", "arbitrumSepolia");
      assert.equal(result.code, 0, `${name}: ${result.out}`);
    }
    assert.ok(!helperModule.QUESTION_END.test("Did the seller deliver."));
    assert.ok(helperModule.QUESTION_END.test("Did the seller deliver\ufe56".normalize("NFKC")), "small question mark folds to ? under NFKC");
    // …and validate() really applies NFKC before the check (E-8).
    const value = JSON.parse(fs.readFileSync(fixture("valid"), "utf8"));
    assert.doesNotThrow(() => helperModule.validate({ ...value, question: "Did the seller deliver order 1234\ufe56" }, helperModule.NETWORKS.arbitrumSepolia));
  });

  it("D-6 rejects zero-width characters inside IPFS URI paths", async () => {
    const output = assertCleanError(await run("validate", "--case", fixture("ipfs-zero-width"), "--network", "arbitrumSepolia"), 1, "input");
    assert.match(output.error, /policyURI must be an IPFS reference/);
    assert.throws(() => helperModule.normalizeIpfsUri("/ipfs/Qm\u2060abc", "fileURI"), /invisible format characters/);
  });

  it("m-08 rejects empty IPFS content and always releases the body", async () => {
    const { checkIpfsResolves } = helperModule;
    let cancelled = 0;
    const streaming = (chunks) => new ReadableStream({
      pull(controller) { if (chunks.length) controller.enqueue(new TextEncoder().encode(chunks.shift())); else controller.close(); },
      cancel() { cancelled += 1; },
    });
    const stub = (response) => async () => response;
    await assert.rejects(checkIpfsResolves("/ipfs/bafkqaaa", "policyURI", stub(new Response(""))), /EMPTY content/);
    await assert.rejects(checkIpfsResolves("/ipfs/bafkqaaa", "policyURI", stub(new Response(null, { headers: { "content-length": "0" } }))), /EMPTY content/);
    const ok = await checkIpfsResolves("/ipfs/QmX", "fileURI", stub(new Response(streaming(["%PDF", "-rest", "-more"]))));
    assert.equal(ok.status, "ok");
    assert.equal(cancelled, 1, "the body must be cancelled after the first chunk");
    await assert.rejects(checkIpfsResolves("/ipfs/QmX", "fileURI", stub(new Response("nope", { status: 404 }))), /could not be retrieved .*HTTP 404/);
    // A 4xx is final (retrying a bad CID cannot help); a 5xx is retried once.
    for (const [status, attempts] of [[404, 1], [503, 2]]) {
      let fetches = 0;
      await assert.rejects(checkIpfsResolves("/ipfs/QmX", "fileURI", async () => { fetches += 1; return new Response("x", { status }); }), new RegExp(`HTTP ${status}`));
      assert.equal(fetches, attempts, `HTTP ${status}`);
    }
  });

  it("E-6 reads past zero-length leading chunks; an all-empty stream is still EMPTY; the body is always released", async () => {
    const { checkIpfsResolves } = helperModule;
    const streaming = (chunks) => {
      const state = { cancelled: 0 };
      state.stream = new ReadableStream({
        pull(controller) { if (chunks.length) controller.enqueue(new TextEncoder().encode(chunks.shift())); else controller.close(); },
        cancel() { state.cancelled += 1; },
      });
      return state;
    };
    const stub = (body) => async () => new Response(body);
    // Count reader.cancel() calls: a closed stream never reaches its source's cancel().
    const proto = ReadableStreamDefaultReader.prototype;
    const realCancel = proto.cancel;
    let readerCancels = 0;
    proto.cancel = function cancel(...args) { readerCancels += 1; return realCancel.apply(this, args); };
    try {
      const data = streaming(["", "", "%PDF-1.7", "-rest"]);
      const ok = await checkIpfsResolves("/ipfs/QmX", "fileURI", stub(data.stream));
      assert.equal(ok.status, "ok");
      assert.equal(data.cancelled, 1, "the body is cancelled right after the first non-empty chunk");
      for (const chunks of [["", ""], []]) {
        const empty = streaming(chunks);
        readerCancels = 0;
        await assert.rejects(checkIpfsResolves("/ipfs/bafkqaaa", "policyURI", stub(empty.stream)), /EMPTY content/, JSON.stringify(chunks));
        assert.ok(readerCancels >= 1, `reader released for ${JSON.stringify(chunks)}`);
      }
    } finally {
      proto.cancel = realCancel;
    }
  });

  it("m-02 tells a contract revert from a transport failure and redacts the cause", async () => {
    const { readFailure, isContractRevert, isTransportError } = helperModule;
    const named = (name, message, cause) => Object.assign(new Error(message, { cause }), { name });
    // Shape of a real Arbitrum revert: ContractFunctionRevertedError > … > RpcRequestError(code 3).
    const revert = named("ContractFunctionExecutionError", "courts reverted", named("ContractFunctionRevertedError", "panic 0x32", Object.assign(named("RpcRequestError", "execution reverted"), { code: 3 })));
    const transport = named("ContractFunctionExecutionError", "HTTP request failed. URL: http://127.0.0.1:9/v2/SECRETKEY", named("HttpRequestError", "fetch failed"));
    assert.ok(isContractRevert(revert) && !isTransportError(revert));
    assert.ok(isTransportError(transport) && !isContractRevert(transport));
    // viem maps a bare JSON-RPC -32603 to ContractFunctionRevertedError (with `reason`
    // = the node message): that is a node failure, not a revert.
    const internal = named("ContractFunctionExecutionError", "Internal error", Object.assign(named("ContractFunctionRevertedError", "Internal error", Object.assign(named("InternalRpcError", "Internal error"), { code: -32603 })), { reason: "Internal error" }));
    assert.ok(!isContractRevert(internal) && isTransportError(internal), "-32603 without revert evidence is a node failure");
    const internalRevert = named("ContractFunctionExecutionError", "x", named("ContractFunctionRevertedError", "x", Object.assign(named("InternalRpcError", "execution reverted"), { code: -32603, details: "execution reverted" })));
    assert.ok(isContractRevert(internalRevert), "-32603 saying 'execution reverted' is a revert");
    const rateLimited = named("ContractFunctionExecutionError", "x", Object.assign(named("LimitExceededRpcError", "rate limited"), { code: -32005 }));
    assert.ok(!isContractRevert(rateLimited) && isTransportError(rateLimited), "a rate limit is a network failure, never 'would revert'");
    const asRevert = readFailure(revert, "court 99 does not exist", "reading court 99");
    assert.equal(asRevert.kind, "input");
    assert.equal(asRevert.message, "court 99 does not exist");
    const asTransport = readFailure(transport, "court 99 does not exist", "reading court 99");
    assert.equal(asTransport.kind, "network");
    assert.doesNotMatch(asTransport.message, /does not exist/);
    assert.match(asTransport.message, /reading court 99 failed for a reason other than a contract revert/);
    assert.ok(!asTransport.message.includes("SECRETKEY"), asTransport.message);
  });

  // n-10: a file property, not behaviour. (n-11, EIP-1559 fees: behaviour-tested
  // in create-dispute-rpc.test.js — preflight never calls eth_gasPrice.)
  it("n-10 no node shebang on the .ts helper", async () => {
    assert.ok(!helper.startsWith("#!"), "the helper is run with npx tsx, not executed directly");
  });
});
