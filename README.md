# Maple Animations — Asset Browser

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
- `home.js` and `home.css` — Class Atlas home, personal shortcuts, and discovery gallery.
- `home-catalog.json` — lightweight class-card and curated-still metadata; regenerate with `npm run data:home`.
- `data/<class>/skills.json` — versioned class catalog with skill descriptions, frame paths, timing, and origins.
- `.nojekyll` — serves the files directly through GitHub Pages.

WebP frame assets remain in the existing Cloudflare R2 bucket, `maple-skills-frames`. The viewer reads the current catalogs and frames from its public asset root. The catalogs checked into GitHub provide a versioned snapshot. No account credentials are stored in the website. R2 CORS permits GET and HEAD for browser playback and transparent PNG export.

## Experience

A bright, MapleStory-inspired workspace uses warm cream, sky, mint, and maple-orange colors. The animation stage offers transparent, black, and white backgrounds.

- Browse class families and recent classes; search within one class or all 59. Filter by job, frame availability, or favorites and sort by name or frame count. The all-class index loads on demand and is cached for the session.
- Play/pause at source timing, select frames from the filmstrip directly below the animation, or scrub the timeline. Keyboard stepping remains available without on-screen step buttons. The preview fits automatically with crisp pixels and source-origin alignment.
- Only the background dropdown remains from appearance settings. Stage labels, technical timing/origin readouts, frame-number inputs, speed/direction/loop controls, ranges, zoom, and overlays have been removed from the interface. Death actions still play once automatically; other actions loop.
- View/copy a static PNG, choose transparent/black/white, or download the current frame at original resolution.
- On mobile, a sticky browse control opens the library when needed. Favorites, recent classes, the last selection, and the stage background are stored in the browser. Unavailable frames are labeled and can be retried.

The site root opens a combined home page: a primary Class Atlas and search, a compact personal workbench, and a lower discovery gallery. The atlas starts with 12 cards and expands to all 59, so discovery stays easy to reach. Search supports class names or skills. Recent and favorite links open the inspector directly; a new visitor gets a compact getting-started prompt.

The Studio navigation opens the first class in `catalog.json` (currently Adele). Explicit skill links still open their requested class, layer, and frame. Home and Studio share the same GitHub Pages site and browser history. Home discovery uses real effect stills and does not autoplay animations.

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

The suite checks control IDs against the real HTML, player and search state, source-timed playback and automatic death completion, export geometry and transparency, contact-sheet labeling, size limits, contrast tokens, and actual DOM interactions with dialogs and navigation. DOM tests simulate image loading and canvas operations; they are not visual rendering or PNG-decoding tests.

All 59 catalog totals were checked: 6,197 entries. Representative first and last frame URLs across every class were checked: 118/118 successful. Earlier Hero playback and a single-frame PNG download were tested in Chrome; that PNG was verified as RGBA with alpha. Visual browser QA for the five new rounds is still pending because the Mac was locked during implementation.

A Copy button next to the Play/Pause icon opens the static PNG view. Its modal supports transparent, black, and white backgrounds, included in the displayed image and clipboard/download output. Legacy export-sheet and link-copy UI has been removed.

## Maple Animations expansion

Working brand: Maple Animations. Explore has peer collections for Skills, Monsters, NPCs, and Map Art. Summons are connected on their skill pages: select Summon beside Effect/Hit, then choose an action. The class skill list marks summon entries and offers a With summons filter. Characters remain a scope item; full maps are blocked on layer-data access. Collab classes are included in future imports; NPC variants will be grouped with provenance preserved.

See [SITEMAP.md](SITEMAP.md), [import contract](data/README.md), [proposed manifest schema](data/asset-manifest.schema.json), and [dated source inventory](data/inventory-snapshot.json). Counts outside the live skill catalog are owner-reported snapshots/estimates.

## Summon integration

212 class-skill pairs across 44 classes are connected from the audited R2 index snapshot. Normalized per-skill metadata lives in `data/summons/`; WebP files stay in R2. The lightweight index loads once, and each skill manifest loads only when opening Summon. Action/frame deep links use `layer=summon&action=stand&frame=0`; workbench history preserves the action. The existing static PNG modal includes the selected action in its context and filename.

Death actions default to play once, hold last frame; other actions loop. Placeholder art is excluded. Missing source frames are listed as PARTIAL. Missing timing uses an explicitly disclosed 90ms preview delay; missing origins are disclosed and centered. Legacy filenames without action boundaries remain an honest Source sequence rather than guessed Stand/Attack splits. Source fallbacks are not offered when real summon data is attached.

Refresh metadata with `npm run data:summons` (uses curl for the source endpoint), or `node tools/import-summons.cjs /path/to/audit-cache` using the saved source index and manifests. Tests cover every imported owner/count/path, action playback and death completion, partials, PNG output context, deep links, retry, and stale requests. Canvas encoding/browser layout are mocked in DOM tests; rendered review remains blocked while the Mac is locked and browser access is disabled.

The Studio workspace is centered and capped at 1440 CSS pixels while preserving its desktop three-column layout. Canvas frames fit down to the available stage but never scale above 1x native CSS size; high-DPI backing resolution is preserved.
