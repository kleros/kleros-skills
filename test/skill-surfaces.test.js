// Every published skill must appear on every surface listed in CLAUDE.md
// § Multi-surface update rule. Generic on purpose: adding a skill to
// plugin.json is enough to enrol it here, so a half-wired skill fails the
// suite instead of the release sync.
//
// Matching is by token or exact path, never by substring: `kleros-curate`
// must not pass because `kleros-curate-x` is listed. Not checked mechanically:
// openclaw "Key Facts" (describes skills by topic, not by name).
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const readJson = (...parts) => JSON.parse(read(...parts));
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/// `name` as a whole token: not preceded or followed by a name character.
const token = (name) => new RegExp(`(?<![\\w-])${escape(name)}(?![\\w-])`);

/// The body of a markdown section, up to the next heading of the same or a higher level.
function section(markdown, heading) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);
  assert.notEqual(start, -1, `missing section ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  const end = lines.findIndex((line, index) => index > start && /^#+ /.test(line) && line.match(/^#+/)[0].length <= level);
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

/// Whitespace-separated words of a shell continuation list (`a b \` lines).
const words = (text) => text.replace(/\\\n/g, " ").split(/\s+/).filter(Boolean);

const plugin = readJson(".claude-plugin", "plugin.json");
const marketplace = readJson(".claude-plugin", "marketplace.json");
const published = plugin.skills.map((entry) => entry.replace(/^\.\//, ""));
const workflow = read(".github", "workflows", "sync-master.yml");

// EXPECTED_ROOT=$(printf '%s\n' \ <words> | sort)
const expectedRootMatch = workflow.match(/EXPECTED_ROOT=\$\(printf '%s\\n' \\\n([\s\S]*?)\| sort\)/);
const expectedRoot = new Set(expectedRootMatch ? words(expectedRootMatch[1]) : []);
// The keep-list is the `for path in …; do` loop whose body asserts `! -e "$path"`,
// wherever it sits — not merely the first `for path in` in the file.
const keepLoops = [...workflow.matchAll(/for path in ([\s\S]*?); do\s*\n\s*if \[ ! -e "\$path" \]/g)];
const keepList = new Set(keepLoops.length === 1 ? words(keepLoops[0][1]) : []);

const rootSkill = read("SKILL.md");
const openclaw = read("openclaw-skill", "SKILL.md");
const readme = read("README.md");
const changelog = read("CHANGELOG.md");
const sitemapLocs = [...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const agentIndex = readJson(".well-known", "agent-skills", "index.json");
const landing = read("index.html");
/// Landing-page skill cards: their data-skill-path and whether they are drafts.
const cards = [...landing.matchAll(/<div class="([^"]*\bskill\b[^"]*)"([^>]*)>/g)]
  .map(([, classes, attributes]) => ({ classes: classes.split(/\s+/), path: attributes.match(/data-skill-path="([^"]+)"/)?.[1] }))
  .filter((card) => card.classes.includes("skill"));

describe("published skills", () => {
  it("declares at least one, each an existing directory", () => {
    assert.ok(published.length > 0);
    for (const skill of published) assert.ok(fs.statSync(path.join(root, skill)).isDirectory(), `${skill} is in plugin.json but not a directory`);
  });

  it("parses the sync-master allowlists (guards the parsers below)", () => {
    assert.ok(expectedRoot.has("SKILL.md") && expectedRoot.has("index.html"), "EXPECTED_ROOT block not found or reshaped");
    assert.equal(keepLoops.length, 1, "expected exactly one keep-list loop asserting `! -e \"$path\"`");
    assert.ok(keepList.has("SKILL.md") && keepList.has(".well-known/agent-skills"), "keep-list not parsed");
  });

  it("is listed once in marketplace.json as the plugin, without a duplicated version", () => {
    const entries = marketplace.plugins.filter((entry) => entry.name === plugin.name);
    assert.equal(entries.length, 1, `marketplace.json must list plugin ${plugin.name} exactly once`);
    assert.equal(entries[0].source, "./");
    assert.ok(!("version" in entries[0]), "plugin.json is the single source of truth for the plugin version");
    assert.match(marketplace.metadata.version, /^\d+\.\d+\.\d+$/);
  });

  it("keeps every agent-skills index digest fresh", () => {
    for (const entry of agentIndex.skills) {
      const file = path.join(root, new URL(entry.url).pathname.replace(/^\//, ""));
      assert.ok(fs.existsSync(file), `${entry.name}: ${entry.url} has no file`);
      const digest = `sha256:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
      assert.equal(entry.digest, digest, `${entry.name}: stale digest — run \`npm run update-digests\``);
    }
  });

  for (const skill of published) {
    describe(skill, () => {
      const skillPath = `${skill}/SKILL.md`;

      it("ships a SKILL.md with a quoted description and matching name", () => {
        const source = read(skill, "SKILL.md");
        assert.match(source, new RegExp(`^---\\nname: ${escape(skill)}\\n`), "frontmatter name must match the directory");
        assert.match(source, /^description: ".+"$/m, "description must be wrapped in double quotes (CLAUDE.md YAML rule)");
      });

      it("is routed from the root SKILL.md (Skills section and What to Fetch by Task)", () => {
        assert.match(section(rootSkill, "## Skills"), new RegExp(`^### \\[[^\\]]+\\]\\(${escape(skillPath)}\\)$`, "m"), "missing ### heading link");
        const rows = section(rootSkill, "## What to Fetch by Task").split("\n").filter((line) => line.startsWith("|"));
        assert.ok(rows.some((row) => row.includes(`\`${skill}/\``)), "missing from What to Fetch by Task");
      });

      it("is listed in the openclaw skill (Available Skills and What to Fetch by Task)", () => {
        const available = section(openclaw, "## Available Skills").split("\n").filter((line) => line.startsWith("|"));
        assert.ok(available.some((row) => row.includes(`\`${skillPath}\``)), "missing from Available Skills");
        const rows = section(openclaw, "## What to Fetch by Task").split("\n").filter((line) => line.startsWith("|"));
        assert.ok(rows.some((row) => row.includes(`\`${skill}/\``)), "missing from What to Fetch by Task");
      });

      it("is in the README skills list", () => {
        assert.match(section(readme, "## Skills included"), new RegExp(`^- \\*\\*${escape(skill)}\\*\\* — `, "m"));
      });

      it("has a clickable, non-draft card on the landing page", () => {
        const matching = cards.filter((card) => card.path === skillPath);
        assert.equal(matching.length, 1, `index.html must have exactly one card with data-skill-path="${skillPath}"`);
        assert.ok(!matching[0].classes.includes("draft"), "published skill must not be shown as a draft");
        assert.ok(landing.includes(`data-copy-text="${skillPath}"`), "missing copy-path button");
      });

      it("is mentioned in CHANGELOG.md", () => {
        assert.match(changelog, token(skill));
      });

      it("is discoverable via sitemap.xml and the agent-skills index", () => {
        const url = `https://skills.kleros.io/${skillPath}`;
        assert.ok(sitemapLocs.includes(url), "missing sitemap entry");
        const entries = agentIndex.skills.filter((item) => item.name === skill);
        assert.equal(entries.length, 1, "missing or duplicated .well-known/agent-skills entry");
        assert.equal(entries[0].url, url);
        assert.equal(entries[0].type, "skill-md");
      });

      it("survives the master sync strip", () => {
        assert.ok(expectedRoot.has(skill), `add ${skill} to EXPECTED_ROOT in sync-master.yml`);
        assert.ok(keepList.has(skill), `add ${skill} to the keep-list loop in sync-master.yml`);
      });
    });
  }
});
