const assert = require("node:assert/strict");
const kit = require("../exporter.js");
const entries = [
  {
    file: "a.webp",
    width: 100,
    height: 80,
    origin: { x: 30, y: 50 },
    delay: 60,
    frameNumber: 3,
  },
  {
    file: "b.webp",
    width: 200,
    height: 90,
    origin: { x: 80, y: 45 },
    delay: 90,
    frameNumber: 4,
  },
];
const p = kit.plan(entries, { mode: "sprite", columns: 2, padding: 8 });
assert.equal(p.minX, -80);
assert.equal(p.worldWidth, 200);
assert.equal(p.width, 432);
assert.equal(p.height, 111);
assert.equal(p.count, 2);
const m = kit.metadata(entries, p);
assert.equal(m.frames[0].origin.x, 88);
assert.equal(m.frames[1].origin.x - m.frames[1].cell.x, 88);
assert.equal(m.frames[0].frame, 3);
assert.equal(m.frames[1].delay, 90);
const flipped = kit.plan(entries, {
  mode: "sprite",
  columns: 2,
  padding: 8,
  flip: true,
});
assert.equal(kit.metadata(entries, flipped).frames[0].origin.x, 128);
const single = kit.plan(entries, { mode: "frame", scale: 2 });
assert.equal(single.width, 200);
assert.equal(single.height, 160);
assert.equal(single.count, 1);
const contact = kit.plan(entries, { mode: "contact", columns: 2, padding: 8 });
assert.equal(contact.height, 177);
assert.equal(contact.headerHeight, 40);
assert.throws(
  () => kit.plan([{ width: 9000, height: 9000 }], { mode: "frame" }),
  /too large/,
);
assert.throws(() => kit.plan([]), /Choose a skill/);
let operations = [];
const ctx = {
  save() {},
  restore() {},
  translate() {},
  scale() {},
  drawImage() {
    operations.push("image");
  },
  fillRect() {
    operations.push("fill");
  },
  fillText() {
    operations.push("label");
  },
};
kit.draw({ getContext: () => ctx }, entries, p);
assert.equal(operations.filter((x) => x === "image").length, 2);
assert.equal(operations.filter((x) => x === "fill").length, 0);
operations = [];
kit.draw({ getContext: () => ctx }, entries, contact);
assert.equal(operations.filter((x) => x === "label").length, 3);
console.log(
  "PASS: shared origins, mirrored metadata, scale, sprite transparency, contact labels, size limits.",
);
