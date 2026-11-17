# Maple Skills — Animation Studio

A visual reference for 59 MapleStory classes and 6,197 skill entries.

Live site: https://www.andydlin.com/maple-skills/

## Source and hosting

This GitHub repository contains the complete website source, class index, and all class catalogs. GitHub Pages publishes the root of the `main` branch. There is no build step, backend, or ChatGPT hosting dependency.

- `index.html` — studio layout and controls.
- `studio.css` — responsive workspace styling.
- `studio.js` — class browsing, animation playback, favorites, and PNG export.
- `catalog.json` — index of all 59 classes.
- `data/<class>/skills.json` — versioned class catalog with skill descriptions, frame paths, timing, and origins.
- `.nojekyll` — serves the files directly through GitHub Pages.

WebP frame assets remain in the existing Cloudflare R2 bucket, `maple-skills-frames`. The viewer reads the current catalogs and frames from its public asset root. The catalogs checked into GitHub provide a versioned snapshot. No account credentials are stored in the website. R2 CORS permits GET and HEAD for browser playback and transparent PNG export.

## Experience

Search for a class, select a skill, and inspect its animation. Controls include job and animation filters, favorites, effect/hit layers, a frame timeline, thumbnails, original frame timing, 0.25–4× playback, looping, scale, drag-to-pan, reset, backgrounds, origin markers, mirroring, and crisp pixels.

Playback starts paused. Space toggles playback when focus is outside a control; arrow keys step frames. Playback pauses when the preview is hidden. Frame links preserve the class, skill, layer, and selected frame.

PNG export keeps original resolution and transparency. Mirroring affects the export; preview scale, pan, backgrounds, and origin markers do not.

## Run locally

From the repository root:

```sh
python3 -m http.server 8093
```

Open http://localhost:8093/. The default asset source is the existing R2 public endpoint. An optional asset-root override and favorites are stored only in the browser.

## Data and limitations

Source: maplestory.io, principally GMS 270, with dataset dates and source metadata retained per class. Maple Editors (2019) stills are retained as labeled fallback references where supplied. Nexon game assets are shown for visual reference.

Catalog coverage does not mean every skill has a complete animation. Some skills are passive or icon-only; some frames are absent or damaged in the source. Placeholder frames are skipped. Animation layers are discovered from each entry rather than restricted to effect and hit.

## Validation

Run `node --check studio.js` and `node tests/player.cjs` from the repository root.

All 59 catalog totals checked: 6,197 entries. Representative first and last frame URLs across every class checked: 118/118 successful. Player logic checks cover layer switching, frame links, class navigation, icon-only entries, missing classes, racing class loads, and asset paths. Hero playback, frame stepping, favorites, layer switching, and PNG download were tested in Chrome; the exported image was verified as RGBA with alpha.
