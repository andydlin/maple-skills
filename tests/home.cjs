const fs = require("node:fs"),
  assert = require("node:assert/strict");
const catalog = require("../catalog.json"),
  home = require("../home-catalog.json");
assert.deepEqual(
  home.classes.map((c) => c.slug),
  catalog.map((c) => c.slug),
);
assert.equal(home.discoveries.length, 8);
for (const e of home.discoveries) {
  const d = JSON.parse(fs.readFileSync(`data/${e.classSlug}/skills.json`)),
    s = d.skills.find((s) => s.slug === e.skillSlug);
  assert.ok(s, `Missing featured skill ${e.skillSlug}`);
  const frames = s[e.layer].filter((f) => !f.placeholder);
  assert.equal(frames[e.frame].file, e.file);
  assert.equal(frames.length, e.frameCount);
  assert.ok(e.category && e.palette);
}
for (const c of home.classes) {
  assert.ok(c.icons.length <= 3);
  assert.ok(
    c.icons.every((x) => typeof x === "string" && x.startsWith("data/")),
  );
}
console.log(
  "PASS: all 59 atlas classes, eight valid discovery deep links, exact still/frame correspondence, and bounded icon metadata.",
);
