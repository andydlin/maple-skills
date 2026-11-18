const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const base = 'https://pub-5005fc41413846b383b14fe2d3cb7abc.r2.dev/';
const source = process.argv[2];
const read = (key, cached) => JSON.parse(source ? fs.readFileSync(path.join(source, cached), 'utf8') : execFileSync('curl', ['-fsS', '--max-time', '60', base + key], {maxBuffer: 20 * 1024 * 1024}));
const index = read('summons/index.json', 'summons_index.json');
const output = path.join('data', 'summons');
fs.mkdirSync(output, {recursive:true});
let frameCount = 0, excluded = 0;
for (const e of index.entries) {
  if (!/^[a-z0-9-]+$/.test(e.class) || !/^\d+$/.test(String(e.skillId))) throw Error('Unsafe identity');
  const manifest = read(e.manifestKey, `${e.class}-${e.skillSlug}-frames.json`);
  const actions = Object.fromEntries(Object.keys(e.actions).map(name => [name, []]));
  const warnings = {excludedPlaceholders:0, missingDelay:0, missingOrigin:0, ungroupedFrames:0};
  const prefix = 'data/' + e.manifestKey.slice(0, e.manifestKey.lastIndexOf('/') + 1);
  for (const f of manifest.summon || []) {
    if (f.placeholder) { warnings.excludedPlaceholders++; excluded++; continue; }
    if (!f.file || f.file.includes('..') || /[:\\]/.test(f.file) || f.file.startsWith('/')) throw Error('Unsafe frame path');
    let name = path.basename(f.file).replace(/\.webp$/, '').replace(/^summon-/, '').replace(/-\d+$/, '');
    if (!Object.hasOwn(actions, name)) {
      if (Object.keys(e.actions).length === 1) name = Object.keys(e.actions)[0];
      else { name = "source-sequence"; warnings.ungroupedFrames++; }
      actions[name] ||= [];
    }
    const validDelay = Number.isFinite(f.delay) && f.delay > 0;
    const validOrigin = f.origin && !f.origin.isEmpty && Number.isFinite(f.origin.x) && Number.isFinite(f.origin.y);
    if (!validDelay) warnings.missingDelay++;
    if (!validOrigin) warnings.missingOrigin++;
    actions[name].push({...f, file:prefix + f.file, sourceDelay:f.delay, delay:validDelay ? f.delay : 90, origin:validOrigin ? f.origin : null});
    frameCount++;
  }
  if (actions["source-sequence"]) for (const name of Object.keys(actions)) if (!actions[name].length && e.actions[name]?.verified) delete actions[name];
  const dir = path.join(output, e.class); fs.mkdirSync(dir, {recursive:true});
  fs.writeFileSync(path.join(dir, e.skillId + '.json'), JSON.stringify({sourceManifest:e.manifestKey, sourceVersion:index.sourceVersion, class:e.class, skillId:e.skillId, actions, warnings, completeness:e.completeness, missingFrames:e.missingFrames}, null, 2) + '\n');
}
fs.writeFileSync(path.join(output, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`Imported ${index.entries.length} class-skill pairs: ${frameCount} frame references, ${excluded} placeholders excluded.`);
