const fs = require("node:fs"),
  assert = require("node:assert/strict");
const html = fs.readFileSync("index.html", "utf8"),
  source =
    fs.readFileSync("studio.js", "utf8") + fs.readFileSync("home.js", "utf8") + fs.readFileSync("atlas.js", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length, "Duplicate HTML IDs");
const referenced = [
  ...source.matchAll(/\$\(["']#([\w-]+)(?:\s[^"']*)?["']\)/g),
].map((m) => m[1]);
const missing = [...new Set(referenced)].filter((id) => !ids.includes(id));
assert.deepEqual(missing, [], "Player references missing controls");
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(
  (m) => m[1].split("?")[0],
);
for (const file of ["exporter.js", "home.js", "studio.js"])
  assert.ok(scripts.includes(file));
assert.ok(scripts.indexOf("exporter.js") < scripts.indexOf("studio.js"));
assert.ok(html.includes('id="stillBackground"'));
assert.ok(!html.includes('id="sheet"'));
assert.ok(scripts.indexOf("home.js") < scripts.indexOf("studio.js"));
assert.ok(html.includes('aria-label="Animation layer"'));
console.log(
  `PASS: ${ids.length} unique IDs, all literal control references connected, export load order, accessible layer group.`,
);
