"use strict";
const Atlas = (() => {
  const sections = [
    { id: "summons", title: "Summons", group: "Class assets", description: "Summoned companions, spirits, and objects, organized by their owning class.", next: "Choose a class to see where its summons will live." },
    { id: "characters", title: "Characters", group: "People & creatures", description: "Character poses, actions, and appearance references.", next: "Browse characters, then choose an action and inspect its frames." },
    { id: "mobs", title: "Mobs", group: "People & creatures", description: "Monsters and their idle, movement, attack, and other animations.", next: "Browse monsters, then study each available action." },
    { id: "npcs", title: "NPCs", group: "People & creatures", description: "The people of MapleStory, their poses, and animated details.", next: "Browse NPCs and open their available animations." },
    { id: "maps", title: "Maps", group: "Places", description: "Locations, scenery, and the layers that make up the Maple world.", next: "Browse regions and maps, then inspect scenery and layers." },
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
    const item = sections.find(s => s.id === section);
    const selected = catalog.find(c => c.slug === classSlug);
    document.title = `${selected && section === "summons" ? selected.name + " · " : ""}${item?.title || "Explore"} — Maple Atlas`;
    if (!item) {
      page.innerHTML = `<p class="home-kicker">THE GROWING MAPLE ATLAS</p><h1>A whole world to look closer at.</h1><p class="atlas-lead">Skills are ready to explore. The next collections now have a home here.</p>` +
        ["Class assets", "People & creatures", "Places"].map(group => `<section class="atlas-group"><h2>${group}</h2><div class="atlas-section-grid">${group === "Class assets" ? `<a class="atlas-section-card" href="#class=${esc(catalog[0]?.slug || "adele")}"><span class="atlas-status ready">Ready to explore</span><h3>Skills</h3><p>Study animations and save the perfect frame across ${catalog.length} classes.</p><strong>Open Studio →</strong></a>` : ""}${sections.filter(s => s.group === group).map(s => `<a class="atlas-section-card" href="${link(s.id)}"><span class="atlas-status">${s.id === "summons" ? "Frames being collected" : "Planned collection"}</span><h3>${s.title}</h3><p>${s.description}</p><strong>Explore collection →</strong></a>`).join("")}</div></section>`).join("");
    } else {
      page.innerHTML = `<a class="atlas-back" href="#section=atlas">← All collections</a><p class="home-kicker">${item.group}</p><h1>${esc(selected && section === "summons" ? selected.name + " summons" : item.title)}</h1><p class="atlas-lead">${item.description}</p>`;
      if (section === "summons") {
        page.innerHTML += selected ? `<nav class="class-assets" aria-label="Class assets"><a href="#class=${esc(selected.slug)}">Skills</a><span aria-current="page">Summons</span></nav><section class="atlas-empty"><span class="atlas-status">Awaiting frame import</span><h2>A home for ${esc(selected.name)}’s summons.</h2><p>Muse’s summon frames will appear here once their class mapping and animation catalog are connected. No summon frames have been imported yet.</p><a href="${link("summons")}">Choose another class →</a></section>` : `<h2>Find your class</h2><p>Summons belong to classes, alongside skills.</p><div class="atlas-class-grid">${catalog.map(c => `<a href="${link("summons", c.slug)}"><strong>${esc(c.name)}</strong><span>Summons →</span></a>`).join("")}</div>`;
      } else page.innerHTML += `<section class="atlas-empty"><span class="atlas-status">Planned collection</span><h2>A place for ${item.title.toLowerCase()}.</h2><p>${item.next}</p><p>This collection is scaffolded. Its source catalog and assets haven’t been connected yet.</p><a href="#section=atlas">Browse other collections →</a></section>`;
    }
    page.scrollTop = 0;
  }
  return { hide, show };
})();
