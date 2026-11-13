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
    assert.match(gate.outputs.already_synced, /steps\.synced\.outputs\.already_synced/);
    // The already-synced decision is made before any third-party code runs.
    const synced = gate.steps.findIndex((s) => s.id === "synced");
    const firstThirdParty = gate.steps.findIndex((s) => /setup-node|npm/.test((s.uses || "") + (s.run || "")));
    assert.ok(synced >= 0 && synced < firstThirdParty, "already-synced check must run before setup-node / npm");
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
    // Pinned verbatim: any other `if:` (e.g. without success(), or always())
    // could let sync run after a failed/skipped gate.
    assert.strictEqual(sync.if, "success() && needs.quality-gate.outputs.already_synced != 'true'");
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

// Behaviour of the already-synced check: the step's own script, extracted from
// the workflow, run against throwaway git repos. A wrongly-true result would
// silently withhold a release, so every "must sync" case is pinned too.
describe("sync-master.yml already-synced check", { skip: !hasYq && !inCI && "yq not installed locally" }, () => {
  const os = require("node:os");
  const wf = JSON.parse(
    execFileSync("yq", ["-o=json", ".", path.join(workflowDir, "sync-master.yml")], { encoding: "utf8" }),
  );
  const checkScript = wf.jobs["quality-gate"].steps.find((s) => s.id === "synced").run;
  const stripScript = wf.jobs.sync.steps.find((s) => s.name === "Strip dev-only files").run;
  const baseEnv = { ...process.env, ...wf.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };

  const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  const write = (dir, rel, body = "x\n") => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  };
  const runBash = (cwd, script, env) =>
    execFileSync("bash", ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", script], {
      cwd,
      env: { ...baseEnv, ...env },
      encoding: "utf8",
    });

  // dev commit with skill content + every kind of dev-only file.
  function makeRepo({ scratchFiles = true } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-check-"));
    git(dir, "init", "-q", "-b", "dev");
    git(dir, "config", "user.email", "t@example.com");
    git(dir, "config", "user.name", "t");
    for (const f of ["SKILL.md", "kleros-curate/SKILL.md", "kleros-curate/MIGRATION_FEEDBACK.md", ".planning/STATE.md",
      "test/a.test.js", "scripts/x.js", "package.json", "RELEASING.md"]) write(dir, f);
    if (scratchFiles) for (const f of ["FEEDBACK_X.md", "DNS_AID_FEEDBACK.md", "HANDOVER_Y.md"]) write(dir, f);
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "dev");
    return { dir, sha: git(dir, "rev-parse", "HEAD") };
  }

  // Build a master sync commit exactly as the `sync` job does, on a side checkout.
  function syncMaster(dir, devSha) {
    git(dir, "checkout", "-q", "--detach", devSha);
    runBash(dir, stripScript, {});
    git(dir, "commit", "-qm", "chore(master): sync from dev (strip dev-only files)");
    const master = git(dir, "rev-parse", "HEAD");
    git(dir, "update-ref", "refs/remotes/origin/master", master);
    git(dir, "checkout", "-q", "dev");
    return master;
  }

  function check(dir, sha, { event = "push" } = {}) {
    const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), "runner-temp-"));
    const out = path.join(runnerTemp, "out");
    const summary = path.join(runnerTemp, "summary");
    fs.writeFileSync(out, "");
    fs.writeFileSync(summary, "");
    runBash(dir, checkScript, {
      SHA: sha, EVENT_NAME: event, TRIGGER_REF: "kleros-curate@v9.9.9",
      RUNNER_TEMP: runnerTemp, GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: summary,
    });
    const value = /already_synced=(\w+)/.exec(fs.readFileSync(out, "utf8"));
    assert.ok(value, "step must always write already_synced");
    assert.strictEqual(git(dir, "status", "--porcelain"), "", "check must not touch the working tree or index");
    return { synced: value[1], summary: fs.readFileSync(summary, "utf8") };
  }

  it("is true only when master is the strip of exactly the commit under test", () => {
    const { dir, sha } = makeRepo();
    syncMaster(dir, sha);
    const r = check(dir, sha);
    assert.strictEqual(r.synced, "true");
    assert.match(r.summary, /Already synced/);
    assert.match(r.summary, new RegExp(sha.slice(0, 7)));
  });

  it("replays the strip exactly: works with no root scratch files (pipefail-safe)", () => {
    const { dir, sha } = makeRepo({ scratchFiles: false });
    syncMaster(dir, sha);
    assert.strictEqual(check(dir, sha).synced, "true");
  });

  it("is false for workflow_dispatch, even when already synced", () => {
    const { dir, sha } = makeRepo();
    syncMaster(dir, sha);
    assert.strictEqual(check(dir, sha, { event: "workflow_dispatch" }).synced, "false");
  });

  it("is false when there is no master yet", () => {
    const { dir, sha } = makeRepo();
    const r = check(dir, sha);
    assert.strictEqual(r.synced, "false");
    assert.strictEqual(r.summary, "");
  });

  it("is false when dev has moved past the synced commit", () => {
    const { dir, sha } = makeRepo();
    syncMaster(dir, sha);
    write(dir, "kleros-curate/SKILL.md", "changed\n");
    git(dir, "commit", "-qam", "skill change");
    assert.strictEqual(check(dir, git(dir, "rev-parse", "HEAD")).synced, "false");
  });

  it("is false when dev moved by dev-only files (same stripped tree, different commit)", () => {
    // Conservative on purpose: the tag still names a commit master was not
    // synced from, so a human decides — even though the tree would not change.
    const { dir, sha } = makeRepo();
    syncMaster(dir, sha);
    write(dir, ".planning/STATE.md", "changed\n");
    git(dir, "commit", "-qam", "planning only");
    assert.strictEqual(check(dir, git(dir, "rev-parse", "HEAD")).synced, "false");
  });

  it("is false when master's tree drifted from a fresh strip (manual push, strip-list change)", () => {
    const { dir, sha } = makeRepo();
    const master = syncMaster(dir, sha);
    // Same single parent, different tree: e.g. an admin amended master by hand.
    const tampered = git(dir, "commit-tree", git(dir, "rev-parse", `${sha}^{tree}`), "-p", sha, "-m", "unstripped");
    git(dir, "update-ref", "refs/remotes/origin/master", tampered);
    assert.notStrictEqual(tampered, master);
    assert.strictEqual(check(dir, sha).synced, "false");
  });

  it("is false when master has extra parents", () => {
    const { dir, sha } = makeRepo();
    const master = syncMaster(dir, sha);
    const merge = git(dir, "commit-tree", git(dir, "rev-parse", `${master}^{tree}`), "-p", sha, "-p", master, "-m", "merge");
    git(dir, "update-ref", "refs/remotes/origin/master", merge);
    assert.strictEqual(check(dir, sha).synced, "false");
  });
});
