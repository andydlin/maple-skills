const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  css = fs.readFileSync("studio.css", "utf8");
function lum(hex) {
  const v = hex
    .match(/../g)
    .map((c) => parseInt(c, 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
}
function ratio(a, b) {
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const muted = css.match(/--muted:\s*#([0-9a-f]{6})/i)[1];
for (const [label, a, b] of [
  ["primary", "ffffff", "bd4810"],
  ["body", "34434b", "f6f5ed"],
  ["muted", muted, "fffef9"],
  ["sidebar muted", muted, "eef7f5"],
  ["selected", "903c12", "fff2df"],
])
  assert.ok(ratio(a, b) >= 4.5, label + " contrast below 4.5:1");
console.log(
  "PASS: primary, body, muted, sidebar and selected text contrast tokens.",
);

const homeCss = fs.readFileSync("home.css", "utf8");
for (const match of homeCss.matchAll(
  /(?<![\w-])color:\s*#([0-9a-f]{6})(?![0-9a-f])/gi,
))
  assert.ok(
    ratio(match[1], "f0f6ec") >= 4.5,
    "Home text contrast: " + match[1],
  );
console.log("PASS: home-page foreground text tokens on the workbench surface.");
