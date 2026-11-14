# MapleStory Class Skills

A browsable reference for MapleStory class skills: every skill, with its
animation frames where they exist, playable at the skill's real per-frame
timing. Hero (Warrior) is the first class; more classes are added the same
way.

## Live site

GitHub Pages serves this repo (branch `main`, root). Open the site URL once
Pages is enabled in Settings → Pages.

## Data

- Source: [maplestory.io](https://maplestory.io), GMS 270 — skillbook API for
  1st–4th job + Hyper skills, raw WZ API for 5th-job (`Skill/40001.img`) and
  HEXA (`Skill/40000.img`) skills. Burning Soul Blade stills: Maple Editors
  (2019).
- Each class lives under `data/<class>/`:
  - `skills.json` — one entry per skill: id, name, job, description
    (maplestory.io `#c` formatting codes stripped), master level, and frame
    lists with per-frame delay (ms) and origin (x/y).
  - `frames/<skill-slug>/` — WebP frames (`effect-NN.webp`, `hit-NN.webp`)
    and skill icons (`icon.webp`). PNG masters are not stored here; the
    maplestory.io API is the source of truth and frames can be re-pulled.
- The player never calls the API at runtime: the page is fully static.
- Frames marked `placeholder: true` in `skills.json` are 1×1 timing
  placeholders in the source WZ data; the player skips them. Sword
  Illusion's `effect0` (65 blank timing frames) is omitted for the same
  reason. HEXA Raging Blow shares Raging Blow's frames — no distinct
  effect node exists in GMS 270.

## Adding a class

1. Pull the class's skillbooks from maplestory.io (jobs for 1st–4th,
   plus the V-skill file for 5th job and the HEXA file for 6th job).
2. Extract effect/hit frames with delay/origin, convert to WebP (quality
   80), and drop them in `data/<class>/frames/<skill-slug>/`.
3. Write `data/<class>/skills.json` in the same shape as
   `data/hero/skills.json`.
4. Add the class to the site's class list (currently Hero only).

## Notes

- Skill frames are Nexon game assets, shown here for reference only.
- The site is static HTML/CSS/JS with no build step and no backend.
