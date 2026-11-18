# Maple Animations — sitemap and information architecture

Updated 2026-11-17 from the owner’s Animated MapleStory Asset Site brief (maplestory.io, GMS 270), then clarified with owner decisions. Dataset counts below are supplied snapshots, not a fresh ingestion audit. Existing skill deep links remain compatible; GitHub stores site/metadata and R2 serves images.

## Primary sitemap

- Home `/`: current search, personal workbench, spotlight/discovery and class atlas remain operational. Expand toward balanced collection discovery as catalogs arrive; skills are one section, not the whole product.
- Explore `#section=atlas`: four peer collections.
  - Skills `#class={classSlug}` → class → skill → Effect / Hit / **Summon** → summon action → frame.
    - Summon only appears for verified associated data. It is part of its owning skill, never a sibling of Skills or a separate browser.
    - Proposed additive detail parameters: `class`, `skill`, `track=summon`, `action`, `frame`. Existing `layer` effect/hit links stay valid. Live summon routing uses `layer=summon&action={sourceAction}&frame={index}`; the proposed `track` parameter is not needed.
    - Passive/buff entries retain icon, description and stats; no fabricated animation.
  - Monsters `#section=monsters` → searchable/filterable index → monster → available action → frame.
    - Filters planned: name/ID, source stats where present, frame/static/link/Spine type, completeness.
    - Link entries display their own identity/stats, identify the target, and resolve its animations without copying frame data. Broken or cyclic links get explicit errors.
    - Spine-only entries show a separate-player requirement. No frame-player substitution.
  - NPCs `#section=npcs` → name/place index → NPC group → source variant → available action → frame.
    - Group near-identical files; preserve every source ID, location association and variant. Exact duplicate grouping may use hashes; near-identical candidates require an auditable grouping rule/review. Never discard source files just because names match.
  - Map Art `#section=map-art` → Backgrounds / Objects / Tiles → source element → available action → frame or static image.
    - Filters planned: source set/ID, animated/static/Spine, completeness. Tiles are static; Spine objects require a separate track.

## Outside the primary navigation

- Characters `#section=characters`: retained from the earlier roadmap, **scope to define**. The supplied brief does not define a character dataset. No counts or source model inferred.
- Full Maps `#section=maps`: **blocked, not scheduled**. No map-page implementation plan until placement/layer extraction is proven. Map Art does not imply assembled scenes.
- Legacy `#section=mobs` resolves to Monsters; old summon landing links explain skill ownership and point back to class skills. There is no standalone summon index.

## Owner decisions

- Working brand: **Maple Animations**. Keep the current URL/repository and hosting.
- Collab classes: include, clearly identify their collaboration in metadata; no invented class entries before a catalog is available.
- Summons: skill pages only.
- NPCs: group near-identical files, preserve variants/provenance.
- Hidden skillbook entries (design decision delegated by owner): include by default, label **Hidden in skillbook**, and offer a visibility filter once source metadata is normalized. Do not confuse hidden with passive, missing, or corrupt; unknown visibility stays unknown.
- Keep the current light visual theme and static PNG copy/download workflow. The brief’s older dark Hero reference describes player behavior, not a request to revert the theme.

## Player contract

Use one origin-aligned, per-frame-delay player across all frame collections. Tabs show only actual actions and frame counts. The simplified shared UI is animation, filmstrip immediately beneath, Play/Pause, frame counter, background dropdown, scrubber, and PNG modal. Fit/crisp pixels are automatic; there are no visible step, speed, direction, loop, range, zoom, origin, or overlay controls. Default die actions (`die`, `die1`, etc.) to play once and hold the final frame; other actions loop. Static assets need no fake timeline. Source-corrupt frames are PARTIAL and name their affected indices/files. Missing attack means “No attack animation exists,” not an invented sequence or relabeled jump.

## Phases and implementation boundary

1. **Now:** IA, brand, collection/status routes and import contracts. Skills and skill-owned summons are live.
2. Summons connected: 212 class-skill pairs, action navigation and shared player. Burning Soul Blade variants have 43/35 non-placeholder frames. Keep partials and missing metadata explicitly disclosed.
3. Consume the monster JSONL index with paginated/sharded listings. Resolve links and separate Spine; then progressively connect frame manifests.
4. NPC stand-only pass, grouping and source variants; expand to expressions. Map Art source-set navigation and static/frame/Spine types.
5. Full Maps only after the data blocker is resolved; character scope separately defined.

Do not download all entity catalogs/frames at startup. Keep compact section indexes, shard/paginate large lists, load one entity manifest and chosen action on demand, prefetch bounded frames, retain bounded decoded-image cache, and preserve source timing/origins.

See `data/README.md` for normalization requirements and `data/inventory-snapshot.json` for dated reported scale/status.
