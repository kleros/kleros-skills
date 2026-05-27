#!/usr/bin/env node

const { readFileSync, writeFileSync } = require("fs");
const { createHash } = require("crypto");
const { resolve } = require("path");

const ROOT = resolve(__dirname, "..");
const INDEX_PATH = resolve(ROOT, ".well-known/agent-skills/index.json");

const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
let changed = 0;

for (const skill of index.skills) {
  const urlPath = new URL(skill.url).pathname;
  const filePath = resolve(ROOT, urlPath.replace(/^\//, ""));

  let content;
  try {
    content = readFileSync(filePath);
  } catch {
    console.log(`  SKIP  ${skill.name} — ${urlPath} not found`);
    continue;
  }

  const hash = createHash("sha256").update(content).digest("hex");
  const fresh = `sha256:${hash}`;

  if (skill.digest === fresh) {
    console.log(`  OK    ${skill.name}`);
  } else {
    console.log(`  UPD   ${skill.name}  ${skill.digest.slice(0, 20)}… → ${fresh.slice(0, 20)}…`);
    skill.digest = fresh;
    changed++;
  }
}

if (changed > 0) {
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
  console.log(`\n${changed} digest(s) updated in ${INDEX_PATH}`);
} else {
  console.log("\nAll digests up to date.");
}
