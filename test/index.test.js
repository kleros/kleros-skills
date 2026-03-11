const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.join(__dirname, "..", "index.html");

describe("index.html", () => {
  let html;

  it("should exist", () => {
    assert.ok(fs.existsSync(indexPath), "index.html should exist");
    html = fs.readFileSync(indexPath, "utf-8");
  });

  describe("Kleros branding", () => {
    it("should have Kleros Skills in the title", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      assert.match(html, /<title>.*Kleros Skills.*<\/title>/i);
    });

    it("should not contain 'ethskills' (case-insensitive) in visible text", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      // Remove HTML comments before checking
      const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
      // Remove script blocks before checking
      const withoutScripts = withoutComments.replace(
        /<script[\s\S]*?<\/script>/gi,
        ""
      );
      assert.doesNotMatch(
        withoutScripts,
        /ethskills/i,
        "Should not contain 'ethskills' in visible content"
      );
    });

    it("should not contain 'eth skills' (case-insensitive) in visible text", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
      const withoutScripts = withoutComments.replace(
        /<script[\s\S]*?<\/script>/gi,
        ""
      );
      assert.doesNotMatch(
        withoutScripts,
        /eth\s+skills/i,
        "Should not contain 'eth skills' in visible content"
      );
    });

    it("should contain 'Kleros' in the page content", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      assert.match(html, /Kleros/);
    });

    it("should contain 'Kleros Skills' in the page content", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      assert.match(html, /Kleros Skills/);
    });
  });

  describe("Dark purple color palette", () => {
    it("should use a dark purple background color", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      // Should have a dark purple-ish background (low lightness, purple hue)
      assert.match(
        html,
        /--bg:\s*#[0-9a-fA-F]{6}/,
        "Should have a --bg CSS variable"
      );
      // Extract the bg color and verify it's purple-ish
      const bgMatch = html.match(/--bg:\s*#([0-9a-fA-F]{6})/);
      assert.ok(bgMatch, "Should have --bg color");
      const r = parseInt(bgMatch[1].slice(0, 2), 16);
      const g = parseInt(bgMatch[1].slice(2, 4), 16);
      const b = parseInt(bgMatch[1].slice(4, 6), 16);
      // For dark purple: R and B should be higher than G, and values should be low (dark)
      assert.ok(r < 80, `Red channel should be low for dark bg, got ${r}`);
      assert.ok(g < 80, `Green channel should be low for dark bg, got ${g}`);
      assert.ok(b < 80, `Blue channel should be low for dark bg, got ${b}`);
      // Purple hue: blue >= red > green (approximately)
      assert.ok(
        b >= g,
        `Blue (${b}) should be >= green (${g}) for purple hue`
      );
    });

    it("should use a purple accent color", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      const accentMatch = html.match(/--accent:\s*#([0-9a-fA-F]{6})/);
      assert.ok(accentMatch, "Should have --accent color");
      const r = parseInt(accentMatch[1].slice(0, 2), 16);
      const g = parseInt(accentMatch[1].slice(2, 4), 16);
      const b = parseInt(accentMatch[1].slice(4, 6), 16);
      // Purple accent: R and B should be prominent, G should be lower
      assert.ok(
        b > g || r > g,
        `Accent should be purple-ish: R=${r}, G=${g}, B=${b}`
      );
    });

    it("should not use the original amber color palette", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      // Original amber accent was #ffb000
      assert.doesNotMatch(
        html,
        /--accent:\s*#ffb000/i,
        "Should not use original amber accent"
      );
      // Original bg was #1a1208
      assert.doesNotMatch(
        html,
        /--bg:\s*#1a1208/i,
        "Should not use original amber background"
      );
    });
  });

  describe("Structure", () => {
    it("should be valid HTML with doctype", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      assert.match(html, /<!DOCTYPE html>/i);
    });

    it("should have meta viewport tag", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      assert.match(html, /<meta name="viewport"/);
    });

    it("should have skill sections", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      assert.match(html, /class="skill"/);
    });

    it("should have a tagline", () => {
      html = fs.readFileSync(indexPath, "utf-8");
      assert.match(html, /class="tagline"/);
    });
  });
});

describe("README.md", () => {
  const readmePath = path.join(__dirname, "..", "README.md");

  it("should exist", () => {
    assert.ok(fs.existsSync(readmePath), "README.md should exist");
  });

  it("should mention Kleros Skills", () => {
    const content = fs.readFileSync(readmePath, "utf-8");
    assert.match(content, /Kleros Skills/);
  });
});
