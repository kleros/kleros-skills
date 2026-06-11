const { describe, it } = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const workflowDir = path.join(__dirname, "..", ".github", "workflows");
const inCI = process.env.CI === "true";

function yqAvailable() {
  try {
    execFileSync("yq", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const hasYq = yqAvailable();

describe(".github/workflows YAML", () => {
  it("parses cleanly with yq", { skip: !hasYq && !inCI && "yq not installed locally — install with brew/apt to validate workflows pre-push" }, () => {
    if (inCI && !hasYq) {
      assert.fail("yq is required in CI for workflow validation. GitHub-hosted ubuntu-latest ships with yq preinstalled — investigate if a runtime change removed it.");
    }
    assert.ok(fs.existsSync(workflowDir), ".github/workflows directory should exist");
    const files = fs
      .readdirSync(workflowDir)
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
    assert.ok(files.length > 0, "expected at least one workflow file");
    for (const file of files) {
      const full = path.join(workflowDir, file);
      // yq eval '.' exits non-zero on parse error; stderr captured for the assertion message
      try {
        execFileSync("yq", ["eval", ".", full], { stdio: ["ignore", "ignore", "pipe"] });
      } catch (err) {
        const stderr = err.stderr ? err.stderr.toString() : "(no stderr)";
        assert.fail(`Workflow YAML failed to parse: ${file}\n${stderr}`);
      }
    }
  });
});
