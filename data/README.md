# Animated asset import contract

Source: owner’s 2026-11-17 brief, maplestory.io GMS 270. This is a proposed normalized boundary for the site, not a demand to rename Muse’s downloaded files. Inspect actual manifests first and adapt them; keep original provenance and IDs. Existing class `skills.json` snapshots remain valid.

## Storage and relationships

Reported new layout: `<section>/<entry-slug>/frames/<animation>/<frame>.webp`, with `frames.json` per entity and adjacent metadata. Preserve existing skill paths via adapters. Keep source IDs stable and opaque strings. Metadata/versioned indexes belong on GitHub; images stay on R2. Do not commit hundreds of thousands of frames or a monolithic runtime index.

A summon is attached by **skill ID and class**, with variants/actions beneath it. 208 unique skills / 212 class-skill pairs means skill ID alone cannot replace class-skill association. Do not make class-level summons a separate primary catalog. Example in `examples/summon.example.json` is documentation-only, not runtime input.

Proposed shared manifest shape (see `asset-manifest.schema.json`): entity identity/source, representation (`frames`, `static`, `link`, `spine`), completeness, actual actions and ordered frames. Each available frame has a WebP path, delay in ms, and source origin. PARTIAL actions list unavailable indices/source paths/reasons; never substitute art or silently close sequence gaps. All frame paths must resolve to the approved asset origin; reject traversal, executable URLs, malformed origins/delays and duplicate frame indices at ingestion.

## Section rules

- Skills: retain job tier, stats, icon/description, source visibility (`visible`, `hidden`, `unknown`), source/class/skill IDs and collaboration metadata. Hidden entries remain included, labeled and filterable once normalized.
- Summons: owning class-skill associations, variant IDs (e.g. stationary/mobile), actual action names (`summoned`, `stand`, `move`, `attack1`, `die`, or what the source supplies), delays/origins and partial-frame reports.
- Monsters: ingest JSONL as a build/import source, generate small browser indexes. Preserve linkTarget and resolve with cycle/depth/missing-target guards. Keep identity/stats distinct from animation target. Spine references never masquerade as zero-frame sequences. Orange Mushroom has stand/move/jump/hit1/die1; do not manufacture attack.
- NPCs: grouped index plus source variants. Preserve each source ID, place, expression/action, and grouping evidence. Grouping does not erase or merge distinct animations. Place is optional when unknown.
- Map Art: retain Back/Obj/Tile source set/node identity; distinguish animated frames, static tiles and Spine objects. No scene placement or full-map route implied.
- Full maps: blocked until placement, layers, z-order/parallax and resource references can be extracted. No implementation commitment.

## Shared playback and integrity

Origin-composite frames without trimming away anchors. Honor source frame delay; any normalization of invalid timing must be reported. Die actions play once and hold last frame; others default loop. PARTIAL is distinct from absent, static, link, and Spine. Show unavailable actions plainly. Verify frame decode and alpha before publication; no placeholder/substitute art.

## Serving and scale

The brief describes private bulk storage and future custom-domain serving. The current skill app still has its existing R2 public-development asset root; this scaffold does not alter credentials, bucket permissions, DNS, CORS or endpoints. At integration, confirm which bucket/domain serves which collection. Production serving must be configured against the verified custom domain rather than assuming every new upload is publicly available. Reported storage/request estimates are planning inputs, not verified account quotas or guarantees.

Use resumable background uploads and manifest validation. Do not expose R2 credentials in client code. Load indexes by section/shard and entity/action manifests on demand; do not scan ~850k files from the browser.

## Live summon adapter

`data/summons/index.json` is the audited upstream snapshot. `data/summons/{classSlug}/{skillId}.json` is the runtime adapter output: action names map directly to ordered frame arrays with full `data/` paths; `warnings`, `missingFrames`, `sourceManifest` and `completeness` preserve import limits. This intentionally adapts existing data rather than requiring the proposed generic entity schema. `tools/import-summons.cjs` regenerates the files, excludes placeholders, discloses timing/origin normalization, and groups only actions identified by source filenames. Ambiguous legacy files remain `source-sequence`; no action boundaries are invented.
