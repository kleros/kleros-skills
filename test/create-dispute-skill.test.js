// The create-dispute skill documents its deployment allowlist and its command
// surface in prose; the helper is what actually runs. These assertions keep the
// two from drifting — a wrong address in SKILL.md is a real safety failure.
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

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
    for (const title of ["Refuse to Arbitrate / Invalid", "refuse to arbitrate", "Invalid", "Refuse"]) {
      assert.ok(/refuse to arbitrate|refuse to rule|unable to rule|^\s*(refuse|invalid)\s*$|^\s*refuse\s*\/\s*invalid\s*$/i.test(title), `${title} must be caught as a duplicate refuse option`);
    }
    for (const title of ["Refund the buyer", "Pay the seller", "Refuse the refund request"]) {
      assert.ok(!/refuse to arbitrate|refuse to rule|unable to rule|^\s*(refuse|invalid)\s*$|^\s*refuse\s*\/\s*invalid\s*$/i.test(title), `${title} is a legitimate answer and must not be rejected`);
    }
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
