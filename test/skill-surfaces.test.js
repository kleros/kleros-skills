// Every published skill must appear on every surface listed in CLAUDE.md
// § Multi-surface update rule. Generic on purpose: adding a skill to
// plugin.json is enough to enrol it here, so a half-wired skill fails the
// suite instead of the release sync.
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const readJson = (...parts) => JSON.parse(read(...parts));

const plugin = readJson(".claude-plugin", "plugin.json");
const published = plugin.skills.map((entry) => entry.replace(/^\.\//, ""));
const workflow = read(".github", "workflows", "sync-master.yml");
const expectedRoot = workflow.slice(workflow.indexOf("EXPECTED_ROOT=$("), workflow.indexOf("ACTUAL_ROOT=$("));
const keepStart = workflow.indexOf("for path in");
const keepList = workflow.slice(keepStart, workflow.indexOf("; do", keepStart));

describe("published skills", () => {
  it("declares at least one", () => {
    assert.ok(published.length > 0);
  });

  for (const skill of published) {
    describe(skill, () => {
      it("ships a SKILL.md with a quoted description and matching name", () => {
        const source = read(skill, "SKILL.md");
        assert.match(source, new RegExp(`^---\\nname: ${skill}\\n`), "frontmatter name must match the directory");
        assert.match(source, /^description: ".+"$/m, "description must be wrapped in double quotes (CLAUDE.md YAML rule)");
      });

      it("is routed from the root SKILL.md, README, and openclaw skill", () => {
        for (const surface of ["SKILL.md", "README.md", path.join("openclaw-skill", "SKILL.md")]) {
          assert.ok(read(surface).includes(skill), `${surface} does not mention ${skill}`);
        }
      });

      it("is discoverable via sitemap.xml and the agent-skills index", () => {
        assert.ok(read("sitemap.xml").includes(`/${skill}/SKILL.md`), "missing sitemap entry");
        const index = readJson(".well-known", "agent-skills", "index.json");
        const entry = index.skills.find((item) => item.name === skill);
        assert.ok(entry, "missing .well-known/agent-skills entry");
        assert.equal(entry.url, `https://skills.kleros.io/${skill}/SKILL.md`);
      });

      it("survives the master sync strip", () => {
        assert.ok(expectedRoot.includes(skill), `add ${skill} to EXPECTED_ROOT in sync-master.yml`);
        assert.ok(keepList.includes(skill), `add ${skill} to the keep-list loop in sync-master.yml`);
      });
    });
  }
});
