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
const ANCESTRY_STEP = "Verify tagged commit is on dev";

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
    assert.strictEqual(checkouts.length, 1, "quality-gate must check out exactly once");
    const [checkout] = checkouts;
    assert.strictEqual(checkout.with["persist-credentials"], false, "quality-gate checkout must set persist-credentials: false");
    // Tag push → the tagged commit itself; dispatch → dev. Never dev HEAD on a
    // tag push: commits landing on dev after tagging must not ship under it.
    assert.strictEqual(checkout.with.ref, "${{ github.event_name == 'push' && github.sha || 'dev' }}");
    // Full fetch provides refs/remotes/origin/dev and origin/master for the checks.
    assert.strictEqual(checkout.with["fetch-depth"], 0);
    assert.match(runs(gate), /npm test/);
    assert.match(gate.outputs.sha, /steps\.resolve\.outputs\.sha/);
    assert.match(gate.outputs.already_synced, /steps\.synced\.outputs\.already_synced/);
    // The already-synced decision is made before any third-party code runs.
    const synced = gate.steps.findIndex((s) => s.id === "synced");
    const ancestry = gate.steps.findIndex((s) => s.name === ANCESTRY_STEP);
    const firstThirdParty = gate.steps.findIndex((s) => /setup-node|npm/.test((s.uses || "") + (s.run || "")));
    assert.ok(synced >= 0 && synced < firstThirdParty, "already-synced check must run before setup-node / npm");
    assert.ok(ancestry >= 0 && ancestry < synced, "dev-ancestry check must run before the already-synced check");
    assert.strictEqual(gate.steps[ancestry].if, "github.event_name == 'push'");
    // A soft-failing or conditionally skipped gate step would still satisfy `needs`.
    assert.strictEqual(gate["continue-on-error"], undefined);
    for (const step of gate.steps) {
      assert.ok(!step["continue-on-error"], `quality-gate step '${step.name}' must not continue-on-error`);
      if (step.name !== ANCESTRY_STEP) {
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
    assert.match(verify.run, /"\$EVENT_NAME" = "push" \] && \[ "\$TESTED_SHA" != "\$TRIGGER_SHA" \]/);
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


// Behaviour of the release workflow's commit-selection and already-synced
// logic: each step's own script, extracted from the workflow, run against
// throwaway git repos. A wrongly-true already-synced result would silently
// withhold a release, so every "must sync" case is pinned too; a wrongly
// passing verify step would publish the wrong commit, so every refusal is too.
describe("sync-master.yml behaviour", { skip: !hasYq && !inCI && "yq not installed locally" }, () => {
  const os = require("node:os");
  const { spawnSync } = require("node:child_process");
  const wf = JSON.parse(
    execFileSync("yq", ["-o=json", ".", path.join(workflowDir, "sync-master.yml")], { encoding: "utf8" }),
  );
  const gateSteps = wf.jobs["quality-gate"].steps;
  const syncSteps = wf.jobs.sync.steps;
  const resolveScript = gateSteps.find((s) => s.id === "resolve").run;
  const ancestryScript = gateSteps.find((s) => s.name === ANCESTRY_STEP).run;
  const checkScript = gateSteps.find((s) => s.id === "synced").run;
  const verifyScript = syncSteps.find((s) => s.name === "Verify pinned commit").run;
  const stripScript = syncSteps.find((s) => s.name === "Strip dev-only files").run;
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
  // Like runBash, but returns the exit status instead of throwing.
  const runStep = (cwd, script, env) => {
    const r = spawnSync("bash", ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", script], {
      cwd,
      env: { ...baseEnv, ...env },
      encoding: "utf8",
    });
    return { status: r.status, out: r.stdout + r.stderr };
  };
  const commit = (dir, rel, body, msg) => {
    write(dir, rel, body);
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", msg);
    return git(dir, "rev-parse", "HEAD");
  };
  const tmpFile = () => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "runner-temp-")), "f");
    fs.writeFileSync(f, "");
    return f;
  };

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

  // A commit on dev that is neither ancestor nor descendant of `devTip`:
  // a side-branch commit from `base`, merged into dev after `devTip`.
  function mergedSideCommit(dir, base) {
    git(dir, "checkout", "-q", "-b", "side", base);
    const side = commit(dir, "kleros-curate/SIDE.md", "side\n", "side work");
    git(dir, "checkout", "-q", "dev");
    git(dir, "merge", "-q", "--no-ff", "-m", "merge side", "side");
    return side;
  }

  describe("quality-gate resolve step", () => {
    const resolve = (dir, { event = "push", trigger }) => {
      const out = tmpFile();
      const r = runStep(dir, resolveScript, {
        EVENT_NAME: event, TRIGGER_SHA: trigger, TRIGGER_REF: "v9.9.9", GITHUB_OUTPUT: out,
      });
      return { ...r, output: fs.readFileSync(out, "utf8") };
    };

    it("outputs HEAD when it is the tagged commit", () => {
      const { dir, sha } = makeRepo();
      const r = resolve(dir, { trigger: sha });
      assert.strictEqual(r.status, 0, r.out);
      assert.strictEqual(r.output.trim(), `sha=${sha}`);
    });

    it("fails a tag push when HEAD is not the tagged commit", () => {
      const { dir, sha } = makeRepo();
      commit(dir, "kleros-curate/SKILL.md", "after tag\n", "lands on dev after tagging");
      const r = resolve(dir, { trigger: sha });
      assert.notStrictEqual(r.status, 0);
      assert.strictEqual(r.output, "", "no SHA may be handed to sync");
    });

    it("accepts dev HEAD on workflow_dispatch", () => {
      const { dir, sha } = makeRepo();
      const head = commit(dir, "kleros-curate/SKILL.md", "after\n", "newer");
      const r = resolve(dir, { event: "workflow_dispatch", trigger: sha });
      assert.strictEqual(r.status, 0, r.out);
      assert.strictEqual(r.output.trim(), `sha=${head}`);
    });
  });

  describe("quality-gate dev-ancestry step", () => {
    // HEAD = the tagged commit, as the gate's checkout leaves it on a tag push.
    const ancestry = (dir, sha) => {
      git(dir, "checkout", "-q", "--detach", sha);
      const r = runStep(dir, ancestryScript, { SHA: sha, TRIGGER_REF: "v9.9.9" });
      git(dir, "checkout", "-q", "dev");
      return r;
    };

    it("passes for the dev tip and for an older dev commit", () => {
      const { dir, sha } = makeRepo();
      const tip = commit(dir, "kleros-curate/SKILL.md", "newer\n", "newer");
      git(dir, "update-ref", "refs/remotes/origin/dev", tip);
      assert.strictEqual(ancestry(dir, tip).status, 0);
      assert.strictEqual(ancestry(dir, sha).status, 0);
    });

    it("fails for a tagged commit that is not on dev", () => {
      const { dir, sha } = makeRepo();
      git(dir, "update-ref", "refs/remotes/origin/dev", sha);
      git(dir, "checkout", "-q", "-b", "rogue");
      const rogue = commit(dir, "kleros-curate/SKILL.md", "unreviewed\n", "unreviewed");
      git(dir, "checkout", "-q", "dev");
      const r = ancestry(dir, rogue);
      assert.notStrictEqual(r.status, 0);
      assert.match(r.out, /not on dev/);
    });

    it("fails when origin/dev was not fetched", () => {
      const { dir, sha } = makeRepo();
      const r = ancestry(dir, sha);
      assert.notStrictEqual(r.status, 0);
      assert.match(r.out, /origin\/dev not fetched/);
    });
  });

  describe("quality-gate already-synced check", () => {
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

    it("is true when master is the strip of exactly the commit under test", () => {
      const { dir, sha } = makeRepo();
      syncMaster(dir, sha);
      const r = check(dir, sha);
      assert.strictEqual(r.synced, "true");
      assert.match(r.summary, /Already synced/);
      assert.match(r.summary, /already at commit/);
      assert.match(r.summary, new RegExp(sha.slice(0, 7)));
    });

    it("is true when the tag is master's parent even though dev has moved past it", () => {
      // The tagged commit, not dev HEAD, is what a tag push publishes.
      const { dir, sha } = makeRepo();
      syncMaster(dir, sha);
      commit(dir, "kleros-curate/SKILL.md", "after tag\n", "dev moved on");
      const r = check(dir, sha);
      assert.strictEqual(r.synced, "true");
      assert.match(r.summary, /already at commit/);
    });

    it("is true for a tag on an older commit than master's parent (master already ahead)", () => {
      // E.g. a skill tag pushed after a newer release already synced. The
      // stripped trees of the two commits differ: master must be compared
      // with a strip of its own parent, not of the tagged commit.
      const { dir, sha: older } = makeRepo();
      const newer = commit(dir, "kleros-curate/SKILL.md", "newer\n", "newer release");
      syncMaster(dir, newer);
      const r = check(dir, older);
      assert.strictEqual(r.synced, "true");
      assert.match(r.summary, /already ahead/);
      assert.match(r.summary, new RegExp(newer.slice(0, 7)));
      assert.match(r.summary, new RegExp(older.slice(0, 7)));
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

    it("is false when the tagged commit is newer than master's parent", () => {
      const { dir, sha } = makeRepo();
      syncMaster(dir, sha);
      const newer = commit(dir, "kleros-curate/SKILL.md", "changed\n", "skill change");
      assert.strictEqual(check(dir, newer).synced, "false");
    });

    it("is false when the newer commit changed only dev-only files (same stripped tree)", () => {
      // Conservative on purpose: the tag still names a commit master was not
      // synced from, so a human decides — even though the tree would not change.
      const { dir, sha } = makeRepo();
      syncMaster(dir, sha);
      const newer = commit(dir, ".planning/STATE.md", "changed\n", "planning only");
      assert.strictEqual(check(dir, newer).synced, "false");
    });

    it("is false when the tagged commit is unrelated to master's parent (merged side branch)", () => {
      const { dir, sha: base } = makeRepo();
      const p = commit(dir, "kleros-curate/SKILL.md", "dev\n", "dev work");
      syncMaster(dir, p);
      const side = mergedSideCommit(dir, base);
      assert.strictEqual(check(dir, side).synced, "false");
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

    it("is false for an older tag when master's tree drifted", () => {
      const { dir, sha: older } = makeRepo();
      const newer = commit(dir, "kleros-curate/SKILL.md", "newer\n", "newer release");
      const tampered = git(dir, "commit-tree", git(dir, "rev-parse", `${newer}^{tree}`), "-p", newer, "-m", "unstripped");
      git(dir, "update-ref", "refs/remotes/origin/master", tampered);
      assert.strictEqual(check(dir, older).synced, "false");
    });

    it("is false when master has extra parents", () => {
      const { dir, sha } = makeRepo();
      const master = syncMaster(dir, sha);
      const merge = git(dir, "commit-tree", git(dir, "rev-parse", `${master}^{tree}`), "-p", sha, "-p", master, "-m", "merge");
      git(dir, "update-ref", "refs/remotes/origin/master", merge);
      assert.strictEqual(check(dir, sha).synced, "false");
    });
  });

  describe("sync Verify pinned commit step", () => {
    // HEAD = tested commit, as sync's checkout leaves it.
    function verify(dir, tested, { event = "push", trigger = tested } = {}) {
      git(dir, "checkout", "-q", "--detach", tested);
      const r = runStep(dir, verifyScript, {
        TESTED_SHA: tested, EVENT_NAME: event, TRIGGER_SHA: trigger, TRIGGER_REF: "v9.9.9",
      });
      git(dir, "checkout", "-q", "dev");
      return r;
    }
    const setDev = (dir) => git(dir, "update-ref", "refs/remotes/origin/dev", git(dir, "rev-parse", "dev"));

    it("passes for a tag push of a dev commit that moves master forward", () => {
      const { dir, sha } = makeRepo();
      syncMaster(dir, sha);
      const newer = commit(dir, "kleros-curate/SKILL.md", "newer\n", "newer");
      setDev(dir);
      const r = verify(dir, newer);
      assert.strictEqual(r.status, 0, r.out);
    });

    it("fails a tag push whose tested commit is not the tagged commit", () => {
      // The pre-fix behaviour: tag at an older commit, dev HEAD tested.
      const { dir, sha: tagged } = makeRepo();
      const head = commit(dir, "kleros-curate/SKILL.md", "after tag\n", "after tag");
      setDev(dir);
      const r = verify(dir, head, { trigger: tagged });
      assert.notStrictEqual(r.status, 0);
      assert.match(r.out, /publishes the tagged commit only/);
    });

    it("accepts dev HEAD on workflow_dispatch", () => {
      const { dir, sha } = makeRepo();
      const head = commit(dir, "kleros-curate/SKILL.md", "after\n", "after");
      setDev(dir);
      assert.strictEqual(verify(dir, head, { event: "workflow_dispatch", trigger: sha }).status, 0);
    });

    it("fails when the tested commit is no longer on origin/dev", () => {
      const { dir, sha } = makeRepo();
      git(dir, "checkout", "-q", "-b", "rogue");
      const rogue = commit(dir, "kleros-curate/SKILL.md", "unreviewed\n", "unreviewed");
      git(dir, "checkout", "-q", "dev");
      git(dir, "update-ref", "refs/remotes/origin/dev", sha);
      assert.notStrictEqual(verify(dir, rogue).status, 0);
    });

    it("refuses to roll master back (tested commit older than master's parent)", () => {
      const { dir, sha: older } = makeRepo();
      const newer = commit(dir, "kleros-curate/SKILL.md", "newer\n", "newer");
      syncMaster(dir, newer);
      setDev(dir);
      for (const event of ["push", "workflow_dispatch"]) {
        const r = verify(dir, older, { event });
        assert.notStrictEqual(r.status, 0, event);
        assert.match(r.out, /roll master back/);
      }
    });

    it("refuses a tag push that does not contain master's parent; dispatch may", () => {
      const { dir, sha: base } = makeRepo();
      const p = commit(dir, "kleros-curate/SKILL.md", "dev\n", "dev work");
      syncMaster(dir, p);
      const side = mergedSideCommit(dir, base);
      setDev(dir);
      const r = verify(dir, side);
      assert.notStrictEqual(r.status, 0);
      assert.match(r.out, /does not contain/);
      assert.strictEqual(verify(dir, side, { event: "workflow_dispatch" }).status, 0);
    });

    it("allows re-syncing master's own parent (e.g. after tree drift)", () => {
      const { dir, sha } = makeRepo();
      syncMaster(dir, sha);
      setDev(dir);
      assert.strictEqual(verify(dir, sha).status, 0);
    });
  });
});
