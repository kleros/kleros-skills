const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Curate verification documentation", () => {
  const curateSkill = read("kleros-curate/SKILL.md");
  const verification = read("kleros-curate/references/verify-your-list.md");

  const registries = [
    ["Ethereum Mainnet", "1", "0xB79B610bB8E5E26e5b93b8d45Cdb34858AfEb190", "25531707"],
    ["Gnosis Chain", "100", "0x2418D887d0d0Fe03b793A6aF4321fa488226A0b5", "47081664"],
    ["Sepolia", "11155111", "0xD965Ce430afE0423Ff19A5eb08F7C5722EFabCaF", "4049205"],
  ];

  it("documents the canonical Light Curate registry on all three networks", () => {
    for (const [network, chainId, address, startBlock] of registries) {
      assert.ok(
        verification.includes(
          `| ${network} | \`${chainId}\` | \`${address}\` | \`${startBlock}\` |`
        ),
        `missing or mismatched registry row for ${network}`
      );
    }

    assert.match(
      verification,
      /verification registries on all three supported\s+networks are `LightGeneralizedTCR`/
    );
    assert.match(verification, /LightGeneralizedTCR\.addItem\("\/ipfs\/<CID>"\)/);
    assert.doesNotMatch(verification, /gtcrEncode|addItem\(bytes\)/);
    assert.doesNotMatch(
      verification,
      /0xba0304273a54dfec1fc7f4bccbf4b15519aecf15|0x2442D40B0aeCad0298C2724A97F2f1BbDF2C2615/i
    );
  });

  it("keeps the top-level Curate trigger and routing multi-network", () => {
    const description = curateSkill.match(/^description: "([\s\S]*?)"$/m)?.[1];
    assert.ok(description, "Curate description should be present and quoted");
    assert.ok(description.length <= 1024, "Curate description exceeds schema limit");

    for (const [network] of registries) {
      assert.match(description, new RegExp(network));
    }
    assert.match(description, /frontend verification on all three networks/i);
  });
});

describe("Kleros IPFS upload cardinality", () => {
  const uploadSkill = read("kleros-ipfs-upload/SKILL.md");
  const curateUpload = read("kleros-curate/references/shared-ipfs-upload.md");

  it("requires exactly one file per paid request", () => {
    for (const content of [uploadSkill, curateUpload]) {
      assert.match(content, /exactly one (?:multipart )?(?:part|`file` part)/i);
      assert.match(
        content,
        /different (?:content|bytes)[\s\S]{0,80}separate paid uploads/i
      );
    }

    assert.doesNotMatch(uploadSkill, /one or more parts named `file`/i);
    assert.doesNotMatch(uploadSkill, /upload multiple files in one paid request/i);
  });

  it("allows one CID to be reused only for identical bytes", () => {
    assert.match(uploadSkill, /same byte-for-byte file[\s\S]*upload it once/i);
    assert.match(curateUpload, /same byte-for-byte file[\s\S]*upload it once/i);
  });
});
