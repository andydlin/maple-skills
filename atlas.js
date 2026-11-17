"use strict";
const Atlas = (() => {
  const sections = [
    { id: "monsters", title: "Monsters", group: "Animated assets", status: "Index in progress", description: "Browse monsters and their actual animation sets, with stats and source relationships.", next: "The source index is being built. Frame downloads have not started.", detail: "Linked entries will use their target’s animations and be marked as links. Spine-only entries will be labeled as requiring a separate player. Missing actions will never be invented." },
    { id: "npcs", title: "NPCs", group: "Animated assets", status: "Scoped · not imported", description: "Find NPCs by name or place, then study their available poses and expressions.", next: "NPC collection is scoped; downloads have not started.", detail: "A stand-only first pass can be followed by dialogue and expression sequences. Near-identical NPC files will be grouped, with source IDs and variants kept accessible." },
    { id: "map-art", title: "Map Art", group: "Animated assets", status: "Scoped · not imported", description: "A library of backgrounds, animated objects, and static tiles: waterfalls, cogs, lanterns, and more.", next: "Map art collection is scoped; downloads have not started.", detail: "Browse Backgrounds, Objects, and Tiles. Frame animation, static art, and Spine assets will be identified separately. This collection contains individual elements, not assembled maps." },
    { id: "characters", title: "Characters", group: "Future scope", status: "Scope to define", description: "Character poses, actions, and appearance references.", next: "Characters remain part of the earlier roadmap, but this dataset brief does not define their source catalog.", detail: "No character counts, data model, or download status are assumed." },
    { id: "maps", title: "Full Maps", group: "Blocked", status: "Blocked · not scheduled", description: "Assembled map scenes require placement, layer order, and parallax data.", next: "Full-map pages are blocked until a reliable layer-data route is proven.", detail: "The current API fails on required placement nodes. Raw file parsing or a different endpoint must be validated before a map viewer is planned. Individual map elements belong in Map Art." },
  ];
  const link = (section, classSlug) => "#" + new URLSearchParams({ section, ...(classSlug ? { class: classSlug } : {}) });
  function hide() {
    document.body.classList.remove("atlas-view");
    $("#atlasPage").hidden = true;
    $("#exploreNav").removeAttribute("aria-current");
  }
  function show(section = "atlas", classSlug) {
    Home.hide();
    pause(false);
    ++loadVersion; ++drawVersion; ++showFrame.token; ++searchVersion;
    document.body.classList.remove("focus-mode", "browse-open");
    document.body.classList.add("atlas-view");
    $("#studioNav").removeAttribute("aria-current");
    $("#exploreNav").setAttribute("aria-current", "page");
    const page = $("#atlasPage");
    page.hidden = false;
    $("#skipLink").href = "#atlasPage";
    $("#skipLink").textContent = "Skip to atlas content";
    if (section === "mobs") section = "monsters";
    const item = sections.find(s => s.id === section);
    const selected = catalog.find(c => c.slug === classSlug);
    document.title = `${selected && section === "summons" ? selected.name + " · " : ""}${item?.title || "Explore"} — Maple Animations`;
    if (section === "summons") {
      page.innerHTML = `<a class="atlas-back" href="#section=atlas">← All collections</a><p class="home-kicker">PART OF SKILLS</p><h1>Summons live with their skills.</h1><p class="atlas-lead">Once imported, summon skills will offer a Summon tab alongside Effect and Hit. Each summon action will use the same frame player.</p><section class="atlas-empty"><span class="atlas-status">Downloads in progress · not connected here yet</span><h2>Summon animations are on their way.</h2><p>The supplied dataset brief reports 208 unique summon skills across 44 classes. Their manifests still need to be connected to the site. Summons live only on their skill pages; there is no standalone summon browser.</p><a href="#class=${esc(selected?.slug || catalog[0]?.slug || "adele")}">Open ${esc(selected?.name || "class")} skills →</a></section>`;
    } else if (!item) {
      page.innerHTML = `<p class="home-kicker">THE GROWING ASSET LIBRARY</p><h1>A whole world in motion.</h1><p class="atlas-lead">One frame player for skills, monsters, NPCs, and map art. Skills are live; the other collections are being prepared.</p><section class="atlas-group"><h2>Explore the collections</h2><div class="atlas-section-grid"><a class="atlas-section-card" href="#class=${esc(catalog[0]?.slug || "adele")}"><span class="atlas-status ready">Live</span><h3>Skills</h3><p>59 classes · 6,197 skills. Summons will join their owning skill’s Effect and Hit animations.</p><strong>Open Studio →</strong></a>${sections.filter(s => s.group === "Animated assets").map(s => `<a class="atlas-section-card" href="${link(s.id)}"><span class="atlas-status">${s.status}</span><h3>${s.title}</h3><p>${s.description}</p><strong>View collection →</strong></a>`).join("")}</div></section><section class="atlas-empty"><h2>Summons belong to skills.</h2><p>Downloads are in progress. Summon actions will appear on their skill pages, next to Effect and Hit.</p><a href="#section=summons">Summon import status →</a></section><div class="atlas-roadmap"><a href="#section=characters">Characters: scope to define</a><a href="#section=maps">Full maps: blocked on layer data</a></div>`;
    } else {
      page.innerHTML = `<a class="atlas-back" href="#section=atlas">← All collections</a><p class="home-kicker">${item.group}</p><h1>${item.title}</h1><p class="atlas-lead">${item.description}</p><section class="atlas-empty"><span class="atlas-status">${item.status}</span><h2>${item.next}</h2><p>${item.detail}</p><p>No source catalog or frame files have been imported into this collection yet.</p>${section === "map-art" ? '<div class="atlas-type-labels"><span>Backgrounds</span><span>Objects</span><span>Tiles · static</span></div>' : ""}<a href="#section=atlas">Browse other collections →</a></section>`;
    }
    page.scrollTop = 0;
  }
  return { hide, show };
})();
