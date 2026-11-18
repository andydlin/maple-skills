const assert = require('node:assert/strict');
const fs = require('node:fs');
const index = JSON.parse(fs.readFileSync('data/summons/index.json'));
const classes = new Set(); let count = 0, excluded = 0;
for (const entry of index.entries) {
  classes.add(entry.class);
  const data = JSON.parse(fs.readFileSync(`data/summons/${entry.class}/${entry.skillId}.json`));
  assert.equal(data.skillId, entry.skillId);
  assert.equal(data.class, entry.class);
  const skills = JSON.parse(fs.readFileSync(`data/${entry.class}/skills.json`)).skills;
  assert.ok(skills.some(s => String(s.id) === String(entry.skillId)), `Missing owning skill ${entry.class}/${entry.skillId}`);
  const frames = Object.values(data.actions).flat();
  assert.equal(frames.length, entry.verifiedFrames);
  for (const f of frames) {
    assert.ok(!f.placeholder);
    assert.ok(f.file.startsWith(`data/${entry.class}/frames/${entry.skillSlug}/`));
    assert.ok(Number.isFinite(f.delay) && f.delay > 0);
    assert.ok(f.origin === null || (Number.isFinite(f.origin.x) && Number.isFinite(f.origin.y)));
  }
  count += frames.length;
  excluded += data.warnings.excludedPlaceholders;
}
assert.equal(index.entries.length, 212);
assert.equal(classes.size, 44);
assert.equal(count, 10746);
assert.equal(excluded, 179);
const mobile = JSON.parse(fs.readFileSync('data/summons/hero/400011001.json'));
const fixed = JSON.parse(fs.readFileSync('data/summons/hero/400011002.json'));
assert.equal(mobile.actions.move.length, 8);
assert.ok(!fixed.actions.move);
assert.equal(mobile.actions.summoned[0].origin.x, -22);
const legacy = JSON.parse(fs.readFileSync('data/summons/battle-mage/400021047.json'));
assert.equal(legacy.actions['source-sequence'].length, 75);
assert.ok(!legacy.actions.stand);
console.log('PASS: all 212 summon owners/manifests, 10,746 valid frame references, placeholder exclusion, variants, origins, and honest legacy grouping.');
