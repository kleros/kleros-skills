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

// Structural guard for the release workflow's privilege split: third-party
// code (npm installs, the test suite) runs only in the token-less
// `quality-gate` job; `sync` holds the master-push App token and must run no
// npm, and must push exactly the commit the gate tested.
describe("sync-master.yml privilege split", { skip: !hasYq && !inCI && "yq not installed locally" }, () => {
  const wf = () =>
    JSON.parse(
      execFileSync("yq", ["-o=json", ".", path.join(workflowDir, "sync-master.yml")], { encoding: "utf8" }),
    );
  const runs = (job) => job.steps.map((s) => s.run || "").join("\n");
  const uses = (job) => job.steps.map((s) => s.uses || "").filter(Boolean);
  const mentionsSecretOrAppToken = (job) => /secrets\.|app-token|create-github-app-token/.test(JSON.stringify(job));

  it("quality-gate is read-only, token-less and does not persist credentials", () => {
    const gate = wf().jobs["quality-gate"];
    assert.ok(gate, "quality-gate job missing");
    assert.deepStrictEqual(gate.permissions, { contents: "read" });
    assert.strictEqual(gate.environment, undefined, "quality-gate must not use the production-sync environment");
    assert.ok(!mentionsSecretOrAppToken(gate), "quality-gate must not reference secrets or mint the App token");
    const checkouts = gate.steps.filter((s) => (s.uses || "").startsWith("actions/checkout@"));
    assert.ok(checkouts.length > 0, "quality-gate must check out the repo");
    for (const step of checkouts) {
      assert.strictEqual(step.with["persist-credentials"], false, "quality-gate checkout must set persist-credentials: false");
    }
    assert.match(runs(gate), /npm test/);
    assert.match(gate.outputs.sha, /steps\.resolve\.outputs\.sha/);
    // A soft-failing or conditionally skipped gate step would still satisfy `needs`.
    assert.strictEqual(gate["continue-on-error"], undefined);
    for (const step of gate.steps) {
      assert.ok(!step["continue-on-error"], `quality-gate step '${step.name}' must not continue-on-error`);
      if (step.name !== "Verify trigger commit is on dev ancestry") {
        assert.strictEqual(step.if, undefined, `quality-gate step '${step.name}' must not be conditional`);
      }
    }
  });

  it("sync needs the gate, runs no npm, and checks out the tested SHA without persisted credentials", () => {
    const sync = wf().jobs.sync;
    const needs = [].concat(sync.needs);
    assert.ok(needs.includes("quality-gate"), "sync must need quality-gate");
    assert.strictEqual(sync.if, undefined, "an `if:` on sync could let it run after a failed/skipped gate");
    assert.strictEqual(sync.environment, "production-sync");
    const syncCode = runs(sync).replace(/^\s*#.*$/gm, "");
    assert.doesNotMatch(
      syncCode,
      /(^|[;&|(]|\$\()\s*(npm|npx|node|yarn|pnpm|bun|make|bash|sh|source|\.)(\s|$)|scripts\/|\.\//m,
      "sync must not run repo/third-party code",
    );
    for (const u of uses(sync)) {
      assert.match(u, /^actions\/(checkout|create-github-app-token)@/, `sync must only use checkout + app token actions, got ${u}`);
    }
    const checkouts = sync.steps.filter((s) => (s.uses || "").startsWith("actions/checkout@"));
    assert.strictEqual(checkouts.length, 1, "sync must check out exactly once");
    const [checkout] = checkouts;
    assert.strictEqual(checkout.with.ref, "${{ needs.quality-gate.outputs.sha }}");
    assert.strictEqual(checkout.with["persist-credentials"], false);
    assert.strictEqual(checkout.with.token, undefined, "App token must not be handed to checkout");
    for (const step of sync.steps) {
      assert.ok(!step["continue-on-error"], `sync step '${step.name}' must not continue-on-error`);
    }
  });

  it("sync re-verifies the pinned SHA, dev ancestry and rollback before pushing", () => {
    const verify = wf().jobs.sync.steps.find((s) => s.name === "Verify pinned commit");
    assert.ok(verify, "Verify pinned commit step missing");
    assert.strictEqual(verify.if, undefined);
    assert.match(verify.run, /"\$HEAD_SHA" != "\$TESTED_SHA"/);
    assert.match(verify.run, /is-ancestor "\$TESTED_SHA" refs\/remotes\/origin\/dev/);
    assert.match(verify.run, /is-ancestor "\$TRIGGER_SHA" "\$TESTED_SHA"/);
    assert.match(verify.run, /origin\/master\^1/);
  });

  it("sync mints the App token only after all checks and exposes it only to the push step", () => {
    const steps = wf().jobs.sync.steps;
    const mint = steps.findIndex((s) => (s.uses || "").startsWith("actions/create-github-app-token@"));
    assert.ok(mint > 0, "App token step missing");
    for (const name of ["Verify pinned commit", "Strip dev-only files", "Sanity check stripped tree"]) {
      const i = steps.findIndex((s) => s.name === name);
      assert.ok(i >= 0 && i < mint, `'${name}' must run before the App token is minted`);
    }
    const tokenUsers = steps.filter((s) => JSON.stringify(s).includes("steps.app-token.outputs.token"));
    assert.deepStrictEqual(tokenUsers.map((s) => s.name), ["Push to master"]);
  });

  it("every action is pinned to a full commit SHA", () => {
    for (const job of Object.values(wf().jobs)) {
      for (const u of uses(job)) assert.match(u, /@[0-9a-f]{40}$/, `unpinned action: ${u}`);
    }
  });
});
