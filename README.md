# Maple Skills — Animation Studio

A visual reference for 59 MapleStory classes and 6,197 skill entries.

Live site: https://www.andydlin.com/maple-skills/

## Source and hosting

This GitHub repository contains the complete website source, class index, and all class catalogs. GitHub Pages publishes the root of the `main` branch. There is no build step, backend, or ChatGPT hosting dependency.

- `index.html` — studio layout and controls.
- `studio.css` — responsive workspace styling.
- `studio.js` — class browsing, animation playback, favorites, and export dialogs.
- `exporter.js` — transparent PNG, sprite-sheet, contact-sheet, and timing/origin export.
- `DESIGN-ITERATIONS.md` — the five implementation and evaluation rounds.
- `catalog.json` — index of all 59 classes.
- `data/<class>/skills.json` — versioned class catalog with skill descriptions, frame paths, timing, and origins.
- `.nojekyll` — serves the files directly through GitHub Pages.

WebP frame assets remain in the existing Cloudflare R2 bucket, `maple-skills-frames`. The viewer reads the current catalogs and frames from its public asset root. The catalogs checked into GitHub provide a versioned snapshot. No account credentials are stored in the website. R2 CORS permits GET and HEAD for browser playback and transparent PNG export.

## Experience

A bright, MapleStory-inspired workspace uses warm cream, sky, mint, and maple-orange colors. The animation stage has independent transparency, dark, light, and green backgrounds.

- Browse class families and recent classes; search within one class or all 59. Filter by job, frame availability, or favorites and sort by name or frame count. The all-class index loads on demand and is cached for the session.
- Study frames at their source timing. Step, scrub, jump to a frame, or loop a selected range forward, backward, or in ping-pong mode. Inspect per-frame origins and delays; overlay the previous frame; zoom, pan, mirror, or open focus/full-screen views.
- Export transparent stills or origin-aligned sprite sheets, labeled contact sheets, and timing/origin JSON. Choose output scale, columns, and padding and review dimensions before downloading. Sheet exports use the study range. Preview backgrounds, origin markers, and the previous-frame overlay stay out of PNGs.
- On mobile, a sticky browse control opens the library when needed. Favorites, recent classes, the last selection, and the stage background are stored in the browser. Unavailable frames are labeled and can be retried.

A fresh visit to the site root opens the first class in `catalog.json` (currently Adele), even if a previous selection was saved. Explicit skill links still open their requested class, layer, and frame.

Use the Shortcuts guide for keyboard controls. Direct links preserve the class, skill, layer, and selected frame.

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

The website remains buildless: dependencies are only for development tests. Run:

```sh
npm ci
npm test
```

The suite checks control IDs against the real HTML, player and search state, frame-range behavior, export geometry and transparency, contact-sheet labeling, size limits, contrast tokens, and actual DOM interactions with dialogs and navigation. DOM tests simulate image loading and canvas operations; they are not visual rendering or PNG-decoding tests.

All 59 catalog totals were checked: 6,197 entries. Representative first and last frame URLs across every class were checked: 118/118 successful. Earlier Hero playback and a single-frame PNG download were tested in Chrome; that PNG was verified as RGBA with alpha. Visual browser QA for the five new rounds is still pending because the Mac was locked during implementation.
