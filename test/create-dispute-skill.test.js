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
const { spawnSync } = require("node:child_process");

const skillDir = path.join(__dirname, "..", "kleros-create-dispute");
const skill = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
const helper = fs.readFileSync(path.join(skillDir, "scripts", "prepare-dispute.ts"), "utf8");

const NETWORKS = [
  { chainId: "42161", core: "0x991d2df165670b9cac3B022f4B68D65b664222ea", resolver: "0xb5526D022962A1fFf6eD32C93e8b714c901F4323", evidenceModule: "0x48e052B4A6dC4F30e90930F1CeaAFd83b3981EB3" },
  { chainId: "421614", core: "0xE8442307d36e9bf6aB27F1A009F95CE8E11C3479", resolver: "0xed31bEE8b1F7cE89E93033C0d3B2ccF4cEb27652", evidenceModule: "0xA88A9a25cE7f1d8b3941dA3b322Ba91D009E1397" },
];
const COMMANDS = ["validate", "quote", "preflight", "prepare", "simulate", "evidence", "receipt"];

describe("kleros-create-dispute", () => {
  it("pins both Kleros V2 deployments in the helper and the skill", () => {
    for (const network of NETWORKS) {
      for (const value of [network.chainId, network.core, network.resolver, network.evidenceModule]) {
        assert.ok(helper.includes(value), `helper is missing ${value}`);
        assert.ok(skill.includes(value), `SKILL.md is missing ${value}`);
      }
    }
  });

  it("never hardcodes a single chain outside the network table", () => {
    const table = helper.slice(helper.indexOf("const NETWORKS = {"), helper.indexOf("} as const;"));
    for (const network of NETWORKS) {
      const outside = helper.replace(table, "");
      for (const address of [network.core, network.resolver, network.evidenceModule]) {
        assert.ok(!outside.includes(address), `${address} leaked outside the NETWORKS table`);
      }
    }
  });

  it("implements and documents the same commands", () => {
    for (const command of COMMANDS) {
      assert.match(helper, new RegExp(`command === "${command}"`), `helper does not implement ${command}`);
      assert.ok(skill.includes(`prepare-dispute.ts ${command}`), `SKILL.md does not document ${command}`);
    }
  });

  it("routes policy uploads and feedback instead of restating them", () => {
    assert.match(skill, /\.\.\/kleros-ipfs-upload\/SKILL\.md/);
    assert.match(skill, /\.\.\/feedback\/SKILL\.md/);
  });

  it("keeps the review artifact and canonical IPFS gateway", () => {
    assert.match(helper, /kleros-v2-dispute-preflight/);
    assert.match(helper, /kleros-v2-evidence-preflight/);
    assert.match(helper, /REVIEW_ONLY_NOT_SUBMITTED/);
    assert.match(helper, /https:\/\/cdn\.kleros\.link/);
  });

  it("verifies every IPFS reference instead of trusting its shape", () => {
    assert.match(helper, /async function checkIpfsResolves/, "helper must fetch IPFS references");
    for (const field of ["policyURI", "fileURI"]) {
      assert.match(helper, new RegExp(`checkIpfsResolves\\([^)]*"${field}"\\)`), `${field} is not resolvability-checked`);
    }
    assert.match(skill, /never write a CID you did not receive from an actual upload/i);
  });

  it("documents the evidence JSON shape rather than a bare IPFS URI", () => {
    assert.match(skill, /stringified JSON object/);
    assert.match(skill, /"fileURI"/);
    assert.match(helper, /const evidenceSchema = z\.object/);
    assert.match(helper, /functionName: "submitEvidence"/, "evidence calldata must call submitEvidence");
    assert.match(helper, /const PERIODS = /, "helper must read the dispute period back before submitting");
  });

  // Evidence must use the arbitrable-side evidence group derived from chain
  // state, independently of the arbitrator dispute ID shown by the Court.
  it("derives the evidence group from the chain instead of reusing the case ID", () => {
    assert.match(helper, /"function submitEvidence\(uint256 _externalDisputeID, string _evidence\)"/, "the deployed EvidenceModule keys evidence by _externalDisputeID");
    assert.match(helper, /"event Evidence\(uint256 indexed _externalDisputeID,/, "the deployed Evidence event is keyed by _externalDisputeID");
    assert.match(helper, /"event DisputeRequest\(address indexed _arbitrator, uint256 indexed _arbitratorDisputeID, uint256 _externalDisputeID,/, "both IDs are only available from DisputeRequest");
    assert.match(helper, /function decodeDisputeRequests\(/, "helper must decode DisputeRequest to learn the evidence group");
    assert.match(helper, /arbitratorDisputeIDToLocalID/, "helper must be able to ask the resolver directly");
    assert.match(helper, /args: \[evidenceGroupId, evidenceJson\]/, "submitEvidence must be encoded with the evidence group, never the dispute ID");
    assert.doesNotMatch(helper, /args: \[disputeId, evidenceJson\]/, "submitEvidence must never be encoded with the court dispute ID");
  });

  it("treats a caller-supplied evidence group as a claim to be checked", () => {
    assert.match(helper, /--evidence-group \$\{target\.claimedEvidenceGroup\} contradicts the chain/, "an unverified evidence group must be rejected, not trusted");
    assert.match(helper, /disagree about the evidence group/, "two readings of the evidence group must be cross-checked");
  });

  // The Court renders reserved ruling 0 before the template options, so the
  // template must not provide a second refuse or invalid option.
  it("refuses to build a template that duplicates the Court's reserved option", () => {
    assert.match(helper, /const RESERVED_RULING = \{/, "the reserved ruling must be defined once, not restated");
    assert.match(helper, /RESERVED_RULING\.pattern\.test\(title\)/, "validate must reject an answer that repeats ruling 0");
    assert.match(helper, /repeats ruling 0, which the Court already puts on every ballot/, "the error must say why, not just that it failed");
    assert.match(helper, /new Set<string>\(\[RESERVED_RULING\.title\.toLocaleLowerCase\(\)\]\)/, "the dedupe set must be seeded with the reserved title");
    assert.match(skill, /never write a refuse or invalid answer of your own/i, "SKILL.md must state the rule");
  });

  // The preflight must show the complete juror ballot with its on-chain ruling
  // identifiers, including reserved ruling 0.
  it("shows the preflight ballot as jurors see it, ruling 0 included", () => {
    assert.match(helper, /ballot: \[\s*\{ ruling: RESERVED_RULING\.id/, "the ballot must lead with the reserved ruling");
    assert.match(helper, /JUROR BALLOT \(\$\{review\.case\.ballot\.length\} choices/, "the human preflight must render the ballot, not the answer list");
    assert.doesNotMatch(helper, /number: index \+ 1/, "preflight must use ruling IDs rather than positional numbering");
    assert.doesNotMatch(helper, /RULING OPTIONS \(/, "preflight must label the complete juror ballot");
    assert.match(skill, /preflight ballot is what jurors will see/i, "SKILL.md must tell the reviewer what they are reviewing");
  });

  it("keeps SKILL.md honest about the evidence key and about what 'submitted' means", () => {
    assert.match(skill, /evidence key is not the case number/i, "SKILL.md must say the evidence key is not the case number");
    assert.match(skill, /allocated by different contracts and must never be assumed to match/, "SKILL.md must explain why the evidence key is derived independently");
    assert.match(skill, /Creating a dispute does not submit evidence/, "SKILL.md must separate creation from evidence");
    assert.match(skill, /indexed and visible/i, "SKILL.md must distinguish confirmed from indexed from visible");
    assert.ok(skill.includes("prepare-dispute.ts receipt   --tx 0x... --rpc-url RPC [--dispute ID]"), "SKILL.md must document the evidence verification flag");
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

function run(...args) {
  const result = spawnSync(tsxBin, [script, ...args], { encoding: "utf8", timeout: 60_000 });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr, out: `${result.stdout}\n${result.stderr}` };
}
const fixture = (name) => path.join(fixtures, `${name}.json`);
// A syntactically valid but unreachable RPC: argument errors must fire before
// any network call, so these runs never touch it.
const DEAD_RPC = "http://127.0.0.1:9";

describe("kleros-create-dispute helper behaviour", { skip: skipReason }, () => {
  let helperModule;
  before(async () => {
    const { tsImport } = require(tsxApi);
    helperModule = await tsImport(script, __filename);
  });

  it("validates a well-formed case offline and reports ok", () => {
    const result = run("validate", "--case", fixture("valid"), "--network", "arbitrumSepolia");
    assert.equal(result.code, 0, result.out);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, true);
    assert.deepEqual(output.blocking, []);
    assert.equal(output.template.policyURI, "/ipfs/bafkqaaa");
  });

  // n-15: the test uses the helper's own pattern instead of restating it.
  it("reserved-ruling pattern catches refuse options and spares real answers", () => {
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
    it(`B-01 rejects mustache delimiters (${name})`, () => {
      const result = run("validate", "--case", fixture(name), "--network", "arbitrumSepolia");
      assert.notEqual(result.code, 0, result.out);
      assert.ok(result.out.includes(`${field} contains "{{" or "}}"`), result.out);
    });
  }

  // M-03: aligned with (and stricter than) the SDK's isMultiaddr.
  for (const name of ["ipfs-dotdot", "ipfs-whitespace", "ipfs-trailing-slash", "ipfs-query"]) {
    it(`M-03 rejects malformed IPFS URI (${name})`, () => {
      const result = run("validate", "--case", fixture(name), "--network", "arbitrumSepolia");
      assert.notEqual(result.code, 0, result.out);
      assert.match(result.out, /policyURI must be an IPFS reference/);
    });
  }

  it("M-03 normalises ipfs:// with a path to /ipfs/", () => {
    const result = run("validate", "--case", fixture("ipfs-scheme-path"), "--network", "arbitrumSepolia");
    assert.equal(result.code, 0, result.out);
    assert.equal(JSON.parse(result.stdout).template.policyURI, "/ipfs/QmPolicy/policy.pdf");
    const { normalizeIpfsUri } = helperModule;
    for (const bad of ["/ipfs/Qm/../x", "/ipfs/Qm/./x", "/ipfs/Qm//x", "/ipfs/Qm/x#y", "/ipfs/Qm x", "/ipfs/"]) {
      assert.throws(() => normalizeIpfsUri(bad, "fileURI"), /fileURI must be an IPFS reference/, bad);
    }
  });

  // m-07: decimal-only, normalised identifiers.
  it("m-07 normalises courtId \"01\" to \"1\" and still warns about the General Court", () => {
    const result = run("validate", "--case", fixture("court-leading-zero"), "--network", "arbitrumSepolia");
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
    it(`m-07 rejects non-decimal courtId (${name})`, () => {
      const result = run("validate", "--case", fixture(name), "--network", "arbitrumSepolia");
      assert.notEqual(result.code, 0, result.out);
      assert.match(result.out, /courtId must be a decimal integer/);
    });
  }

  it("m-07 rejects hex/garbage dispute IDs and malformed tx hashes before any network call", () => {
    let result = run("evidence", "--evidence", fixture("valid"), "--rpc-url", DEAD_RPC, "--dispute", "0x10");
    assert.notEqual(result.code, 0);
    assert.match(result.out, /--dispute must be a decimal integer/);
    result = run("evidence", "--evidence", fixture("valid"), "--rpc-url", DEAD_RPC, "--dispute", "1", "--evidence-group", "abc");
    assert.match(result.out, /--evidence-group must be a decimal integer/);
    result = run("receipt", "--tx", "0x1234", "--rpc-url", DEAD_RPC);
    assert.match(result.out, /--tx must be a transaction hash/);
    result = run("evidence", "--evidence", fixture("valid"), "--rpc-url", DEAD_RPC, "--creation-tx", `0x${"g".repeat(64)}`);
    assert.match(result.out, /--creation-tx must be a transaction hash/);
    assert.equal(helperModule.parseDecimalId("007", "--dispute"), 7n);
  });

  // M-01: no silently dropped flags.
  it("M-01 errors on a valueless --max-fee instead of dropping the cap", () => {
    const result = run("quote", "--case", fixture("valid"), "--rpc-url", DEAD_RPC, "--max-fee");
    assert.notEqual(result.code, 0);
    assert.match(result.out, /--max-fee needs a value/);
    const followed = run("quote", "--case", fixture("valid"), "--max-fee", "--rpc-url", DEAD_RPC);
    assert.match(followed.out, /--max-fee needs a value/);
  });

  it("M-01 rejects unknown flags such as --maxfee", () => {
    const result = run("quote", "--case", fixture("valid"), "--rpc-url", DEAD_RPC, "--maxfee", "0.01");
    assert.notEqual(result.code, 0);
    assert.match(result.out, /unknown flag --maxfee for quote/);
    const wrongCommand = run("validate", "--case", fixture("valid"), "--from", "0x000000000000000000000000000000000000dEaD");
    assert.match(wrongCommand.out, /unknown flag --from for validate/);
  });

  it("M-01 parses --max-fee before any network call", () => {
    const result = run("quote", "--case", fixture("valid"), "--rpc-url", DEAD_RPC, "--max-fee", "abc");
    assert.match(result.out, /--max-fee must be a decimal ETH amount/);
    const from = run("simulate", "--case", fixture("valid"), "--rpc-url", DEAD_RPC, "--from", "0x1234");
    assert.match(from.out, /--from must be a 0x-prefixed 20-byte address/);
  });

  it("M-01 keeps --human a switch that never swallows the next token", () => {
    const { parseArgs } = helperModule;
    const args = parseArgs("preflight", ["--human", "--case", "c.json", "--rpc-url", "http://x"]);
    assert.equal(args.get("--human"), true);
    assert.equal(args.get("--case"), "c.json");
    assert.throws(() => parseArgs("preflight", ["--case", "c.json", "--rpc-url", "http://x", "--human", "yes"]), /unexpected argument "yes"/);
    assert.throws(() => parseArgs("preflight", ["--case", "c.json", "--rpc-url", "http://x", "--human=yes"]), /takes no value/);
    assert.throws(() => parseArgs("preflight", ["--case", "a", "--case", "b", "--rpc-url", "http://x"]), /more than once/);
    assert.throws(() => parseArgs("simulate", ["--case", "c.json", "--rpc-url", "http://x"]), /--from is required/);
  });

  // B-02: implementation pins exist per network (on-chain check needs an RPC).
  it("B-02 pins an EvidenceModule implementation for every network", () => {
    for (const network of Object.values(helperModule.NETWORKS)) {
      assert.match(network.evidenceModuleImplementation, /^0x[0-9a-fA-F]{40}$/, network.key);
    }
    assert.match(helper, /0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc/, "EIP-1967 implementation slot");
    assert.match(skill, /Version caveat \(verified \d{4}-\d{2}-\d{2}\)/, "SKILL.md must date the evidence-key caveat");
  });

  // M-02: agents are told to stop on ok:false / non-zero exit.
  it("M-02 documents ok/blocking and the stop rule", () => {
    assert.match(skill, /On `ok:false` or any non-zero exit/);
    for (const kind of ["kleros-v2-dispute-preflight", "kleros-v2-evidence-preflight", "kleros-v2-dispute-receipt"]) {
      const at = helper.indexOf(`kind: "${kind}"`);
      assert.ok(at > 0, kind);
      assert.match(helper.slice(at, at + 200), /ok: /, `${kind} must carry ok`);
    }
  });
});
