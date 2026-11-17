# Future collection import contract (proposed)

Keep metadata on GitHub and frame images on R2, as today. This layout is proposed for Muse output; it does not require redownloading or renaming existing frames. An adapter can normalize the delivered format.

- Existing: `data/{classSlug}/skills.json`.
- Summons: proposed `data/{classSlug}/summons.json`, referencing shared summon entities by stable ID when multiple classes own the same entity.
- Other collections: proposed `data/{characters|mobs|npcs|maps}/catalog.json` and per-entity manifests. These are not yet runtime inputs.

Summon required fields: stable source ID, name, `classSlugs` (catalog slugs), source skill IDs when known, source version, and action groups. Each frame includes an actual R2-relative `file`, delay in milliseconds, pixel dimensions where known, and source origin `{x,y,isEmpty}`. Preserve source action names and origin coordinates. Do not invent frames, delays, or class mappings. Record unavailable actions and unresolved ownership separately. Use a schema version and source provenance.

`examples/summon.example.json` is a documentation-only empty example; it is never loaded into the site. Replace all example identifiers with verified source data during import.

Maps need a separate scene model: map/region IDs, canvas bounds, layer order, placements, and linked background/object resources. Do not flatten away layer positions or reuse the summon schema for maps.
