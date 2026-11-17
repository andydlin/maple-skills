# Maple Atlas — expanding sitemap

This is an additive scaffold. Existing skill/frame links remain valid. New collections explicitly show planned/import states; no uncollected assets or counts are fabricated.

## Hierarchy

- Home `/`: search, Class Atlas, personal workbench, spotlight/discovery, growing-atlas link.
- Explore `#section=atlas`: grouped collection directory.
  - Class assets
    - Skills `#class={classSlug}` → skill → animation layer → frame.
    - Summons `#section=summons` → class picker → `#section=summons&class={classSlug}` → summon → action → frame (detail routing to follow import).
  - People & creatures
    - Characters `#section=characters` → character → appearance/action → frame (planned).
    - Mobs `#section=mobs` → mob → action → frame (planned).
    - NPCs `#section=npcs` → NPC → action → frame (planned).
  - Places
    - Maps `#section=maps` → region → map → scenery/layer (planned).

Class is the parent of both skills and summons. Summons are not mobs: a source may reuse mob assets, but the class association determines where a summon appears. Allow multiple class associations and multiple source-skill references instead of guessing a single owner. Unmapped summons should stay in an import review report rather than appear under an arbitrary class.

## Implementation boundary

Explore and the five new collection routes work now. All 59 classes have a summon landing view and a link back to Skills. The Studio sidebar links to the selected class’s Summons. Existing home and Studio remain primary; a broad rename/replacement of the working homepage is deferred until collections have real content.

No summons have been imported by this scaffold. Muse’s files, manifests, action names, and class mapping must be inspected before integration. Proposed contract: `data/README.md` and `data/examples/summon.example.json`.

## Next increments

1. Inspect Muse output, map source IDs to classes, validate timing/origins, report missing/ambiguous ownership.
2. Add per-class summon manifests and reuse the frame inspector/PNG modal for summon actions.
3. Introduce shared entity catalog/search for characters, mobs, and NPCs when their datasets arrive.
4. Treat maps as scene/layer data, with a dedicated viewer rather than forcing maps into a single-sprite model.
5. Expand global search across collections only once real catalogs are connected.
