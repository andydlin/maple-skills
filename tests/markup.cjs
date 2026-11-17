const fs = require("node:fs"),
  assert = require("node:assert/strict");
const html = fs.readFileSync("index.html", "utf8"),
  source = fs.readFileSync("studio.js", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length, "Duplicate HTML IDs");
const referenced = [
  ...source.matchAll(/\$\(["']#([\w-]+)(?:\s[^"']*)?["']\)/g),
].map((m) => m[1]);
const missing = [...new Set(referenced)].filter((id) => !ids.includes(id));
assert.deepEqual(missing, [], "Player references missing controls");
assert.ok(html.indexOf('src="exporter.js"') < html.indexOf('src="studio.js"'));
assert.ok(html.includes('id="sheet"'));
assert.ok(html.includes('aria-label="Animation layer"'));
console.log(
  `PASS: ${ids.length} unique IDs, all literal control references connected, export load order, accessible layer group.`,
);
