const fs = require("node:fs");
const catalog = JSON.parse(fs.readFileSync("catalog.json", "utf8"));
const read = (slug) =>
  JSON.parse(fs.readFileSync(`data/${slug}/skills.json`, "utf8"));
const animation = (s) =>
  Object.entries(s).find(
    ([k, v]) =>
      k !== "fallback" &&
      Array.isArray(v) &&
      v.filter((f) => f?.file && !f.placeholder).length > 3,
  );
const classes = catalog.map((c) => {
  const d = read(c.slug),
    icons = [
      ...new Set(
        d.skills.filter((s) => s.icon && animation(s)).map((s) => s.icon),
      ),
    ].slice(0, 3);
  return { ...c, icons };
});
const picks = [
  ["adele", 151121003, "Blade work", "sky"],
  ["hero", 1120017, "Blade work", "sunset"],
  ["ice-lightning-arch-mage", 2221012, "Spellcraft", "sky"],
  ["bishop", 2311004, "Spellcraft", "cream"],
  ["lara", 162101009, "Nature & spirit", "mint"],
  ["ren", 161121004, "Blade work", "rose"],
  ["demon-slayer", 31121001, "Power & impact", "violet"],
  ["mercedes", 23121052, "Nature & spirit", "mint"],
];
const discoveries = picks.map(([classSlug, id, category, palette]) => {
  const d = read(classSlug),
    s = d.skills.find((s) => s.id === id);
  if (!s) throw Error(`Missing curated skill ${classSlug}/${id}`);
  const pair = animation(s);
  if (!pair) throw Error(`No curated animation ${classSlug}/${id}`);
  const frames = pair[1].filter((f) => f.file && !f.placeholder),
    frame = Math.min(frames.length - 1, Math.floor(frames.length * 0.5));
  return {
    classSlug,
    className: d.class,
    skill: s.name,
    skillSlug: s.slug,
    job: s.job,
    icon: s.icon,
    layer: pair[0],
    frame,
    file: frames[frame].file,
    frameCount: frames.length,
    category,
    palette,
  };
});
fs.writeFileSync(
  "home-catalog.json",
  JSON.stringify({ classes, discoveries }, null, 2) + "\n",
);
console.log(
  `Home catalog: ${classes.length} classes, ${discoveries.length} curated skills.`,
);
