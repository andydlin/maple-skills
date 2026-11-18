"use strict";
const Home = (() => {
  let data = null,
    ready = null,
    bound = false,
    expanded = false,
    family = "all",
    category = "all",
    searchToken = 0,
    personalToken = 0,
    searchTimer;
  const entryURL = (e) =>
    "#" +
    new URLSearchParams({
      class: e.classSlug,
      skill: e.skillSlug,
      ...(e.layer ? { layer: e.layer } : {}),
      ...(e.action ? { action: e.action } : {}),
      ...(Number.isFinite(Number(e.frame))
        ? { frame: Math.max(0, Math.trunc(Number(e.frame))) }
        : {}),
    }).toString();
  const classURL = (slug) =>
    "#" + new URLSearchParams({ class: slug }).toString();
  const isVisible = () => document.body.classList.contains("home-view");
  function cancelSearch() {
    ++searchToken;
    clearTimeout(searchTimer);
  }
  function activateLinks(container) {
    container.querySelectorAll("a[data-open-studio]").forEach(
      (a) =>
        (a.onclick = (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0)
            return;
          e.preventDefault();
          const u = new URL(a.href, location.href);
          history.pushState(null, "", u);
          routeFromURL();
        }),
    );
  }
  async function init() {
    if (!ready)
      ready = (async () => {
        try {
          const r = await fetch("home-catalog.json");
          if (!r.ok) throw Error();
          const next = await r.json();
          if (!Array.isArray(next.classes) || !Array.isArray(next.discoveries))
            throw Error();
          data = next;
        } catch {
          data = {
            classes: catalog.map((c) => ({ ...c, icons: [] })),
            discoveries: [],
          };
        }
      })();
    await ready;
    if (!bound) {
      bind();
      bound = true;
    }
    renderAtlas();
    renderDiscoveries();
    renderSpotlight();
  }
  function bind() {
    const homeLink = (e) => {
      if (e?.metaKey || e?.ctrlKey || e?.shiftKey || e?.altKey || e?.button > 0)
        return;
      e?.preventDefault();
      const u = new URL(location.href);
      u.hash = "";
      history.pushState(null, "", u);
      show();
    };
    $(".brand").onclick = homeLink;
    $("#homeNav").onclick = homeLink;
    $("#studioNav").onclick = (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0)
        return;
      e.preventDefault();
      $("#scope").value = "class";
      $("#kind").value = "all";
      navigateClass(catalog[0].slug);
    };
    $("#studioNav").href = classURL(catalog[0].slug);
    $("#browseAtlas").onclick = () =>
      $("#classAtlas").scrollIntoView({ block: "start", behavior: "smooth" });
    $("#showAllClasses").onclick = () => {
      expanded = !expanded;
      renderAtlas();
    };
    $("#homeSearch").oninput = () => {
      cancelSearch();
      clearTimeout(searchTimer);
      if ($("#homeSearchType").value === "classes") {
        family = "all";
        renderAtlas();
      }
      searchTimer = setTimeout(search, 220);
    };
    $("#homeSearchType").onchange = () => {
      cancelSearch();
      if ($("#homeSearchType").value === "skills") family = "all";
      renderAtlas();
      search();
    };
    $("#homeClearSearch").onclick = () => {
      $("#homeSearch").value = "";
      family = "all";
      expanded = false;
      cancelSearch();
      renderAtlas();
      search();
      $("#homeSearch").focus();
    };
    $("#homeSearchForm").onsubmit = async (e) => {
      e.preventDefault();
      await search();
      if ($("#homeSearchType").value === "classes")
        $("#classAtlas").scrollIntoView({ block: "start", behavior: "smooth" });
    };
  }
  function filteredClasses() {
    const q =
      $("#homeSearchType").value === "classes"
        ? $("#homeSearch").value.trim().toLowerCase()
        : "";
    return data.classes.filter(
      (c) =>
        (family === "all" || familyOf(c) === family) &&
        (!q || (c.name + " " + c.line).toLowerCase().includes(q)),
    );
  }
  function renderAtlas() {
    if (!data) return;
    const q =
        $("#homeSearchType").value === "classes"
          ? $("#homeSearch").value.trim()
          : "",
      list = filteredClasses(),
      visible = expanded || q || family !== "all" ? list : list.slice(0, 12);
    const families = [...new Set(data.classes.map(familyOf))].sort();
    $("#homeFamilies").innerHTML = [
      ["all", "All classes"],
      ...families.map((f) => [f, f]),
    ]
      .map(
        ([value, name]) =>
          `<button data-family="${esc(value)}" aria-pressed="${family === value}">${esc(name)}</button>`,
      )
      .join("");
    $("#homeFamilies")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            family = b.dataset.family;
            expanded = false;
            renderAtlas();
          }),
      );
    $("#homeClassCount").textContent =
      `${list.length} class${list.length === 1 ? "" : "es"}`;
    $("#homeClassGrid").innerHTML =
      visible
        .map(
          (c) =>
            `<a class="atlas-card" href="${classURL(c.slug)}" data-open-studio><div class="atlas-card-top"><span class="atlas-family">${esc(familyOf(c))}</span><span aria-hidden="true">↗</span></div><h3>${esc(c.name)}</h3><div class="atlas-card-bottom"><span>${c.count} skills</span><span class="skill-icon-stack" aria-hidden="true">${c.icons.map((icon) => `<img src="${esc(asset(icon))}" alt="" loading="lazy" crossorigin="anonymous">`).join("")}</span></div></a>`,
        )
        .join("") ||
      '<div class="home-empty"><strong>No classes found.</strong><p>Try a shorter name or choose All classes.</p></div>';
    $("#showAllClasses").hidden = !!q || family !== "all" || list.length <= 12;
    $("#showAllClasses").textContent = expanded
      ? "Show fewer classes ↑"
      : `Browse all ${list.length} classes ↓`;
    activateLinks($("#homeClassGrid"));
  }
  function renderDiscoveries() {
    if (!data) return;
    const options = [
      "all",
      ...new Set(data.discoveries.map((d) => d.category)),
    ];
    $("#discoveryFilters").innerHTML = options
      .map(
        (c) =>
          `<button data-category="${esc(c)}" aria-pressed="${category === c}">${c === "all" ? "All inspiration" : esc(c)}</button>`,
      )
      .join("");
    $("#discoveryFilters")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            category = b.dataset.category;
            renderDiscoveries();
          }),
      );
    const list = data.discoveries.filter(
      (e) => category === "all" || e.category === category,
    );
    $("#discoveryGrid").innerHTML = list
      .map(
        (e) =>
          `<a class="discovery-card" href="${entryURL(e)}" data-open-studio><div class="discovery-art palette-${esc(e.palette)}"><span>${esc(e.category)}</span><img loading="lazy" crossorigin="anonymous" src="${esc(asset(e.file))}" alt="Still from ${esc(e.skill)}"><small>Frame ${e.frame + 1} / ${e.frameCount}</small></div><div class="discovery-caption"><span>${esc(e.className)} · ${esc(e.job)}</span><h3>${esc(e.skill)}</h3><p>Inspect animation <span aria-hidden="true">↗</span></p></div></a>`,
      )
      .join("");
    activateLinks($("#discoveryGrid"));
    $("#discoverySection").hidden = !data.discoveries.length;
  }
  function renderSpotlight() {
    const e =
      data?.discoveries.find((e) => e.classSlug === catalog[0]?.slug) ||
      data?.discoveries[0];
    if (!e) return;
    $("#homeSpotlight").innerHTML =
      `<a href="${classURL(e.classSlug)}" data-open-studio class="spotlight-card"><div class="spotlight-cloud cloud-one"></div><div class="spotlight-cloud cloud-two"></div><span class="spotlight-tag">CLASS SPOTLIGHT</span><img src="${esc(asset(e.file))}" crossorigin="anonymous" alt="${esc(e.className)} skill effect"><div class="spotlight-caption"><div><span>A little Maple magic</span><h2>${esc(e.className)}</h2></div><span class="spotlight-open">Explore skills ↗</span></div></a>`;
    activateLinks($("#homeSpotlight"));
  }
  function validatedRecents() {
    const rows = readJSON("mapleRecentSkills", []);
    return Array.isArray(rows)
      ? rows.filter(
          (e) =>
            e &&
            typeof e.classSlug === "string" &&
            typeof e.skillSlug === "string" &&
            typeof e.skill === "string",
        )
      : [];
  }
  async function resolveSaved(raw) {
    if (!raw || typeof raw.class !== "string" || typeof raw.skill !== "string")
      return null;
    try {
      const d = await getClassData(raw.class),
        s = d.skills.find((s) => s.slug === raw.skill);
      return s
        ? {
            classSlug: raw.class,
            className: d.class,
            skill: s.name,
            skillSlug: s.slug,
            icon: s.icon,
            layer: raw.layer || "",
            frame: Math.max(0, Math.trunc(Number(raw.frame)) || 0),
          }
        : null;
    } catch {
      return null;
    }
  }
  const savedLink = (e) =>
    `<a href="${entryURL(e)}" data-open-studio class="saved-skill">${e.icon ? `<img src="${esc(asset(e.icon))}" alt="" loading="lazy" crossorigin="anonymous">` : '<span class="saved-placeholder" aria-hidden="true">✦</span>'}<span><strong>${esc(e.skill)}</strong><small>${esc(e.className)}</small></span><span class="saved-arrow" aria-hidden="true">↗</span></a>`;
  async function renderPersonal() {
    const token = ++personalToken;
    let recent = validatedRecents();
    if (!recent.length) {
      const last = await resolveSaved(readJSON("mapleLastSelection", null));
      if (last) recent = [last];
    }
    const favoriteKeys = [...favorites].slice(-3).reverse();
    const resolved = await Promise.all(
      favoriteKeys.map((key) => {
        const [classSlug, , skillSlug] = key.split(":");
        return resolveSaved({ class: classSlug, skill: skillSlug });
      }),
    );
    if (token !== personalToken) return;
    const saved = resolved.filter(Boolean),
      classes = recentClasses
        .map((slug) => catalog.find((c) => c.slug === slug))
        .filter(Boolean)
        .slice(0, 3);
    if (!recent.length && !saved.length && !classes.length) {
      $("#personalContent").innerHTML =
        `<div class="personal-welcome"><span aria-hidden="true">☆</span><div><strong>Make a little room for inspiration.</strong><p>Star a skill in the studio. Your favorites and recent work will appear here.</p></div><a href="${classURL(catalog[0].slug)}" data-open-studio>Start with ${esc(catalog[0].name)} ↗</a></div>`;
    } else {
      $("#personalContent").innerHTML =
        `<div class="workbench-tile"><div class="workbench-label">↻ CONTINUE EXPLORING</div>${recent[0] ? savedLink(recent[0]) : `<p class="workbench-hint">Choose a class to start your next study.</p>`}</div><div class="workbench-tile"><div class="workbench-label">☆ SAVED INSPIRATION <span>${favorites.size}</span></div>${saved.length ? saved.slice(0, 2).map(savedLink).join("") : '<p class="workbench-hint">Star a skill to keep it close.</p>'}${favorites.size ? '<a class="workbench-more" href="#view=favorites" data-open-studio>View all favorites ↗</a>' : ""}</div><div class="workbench-tile"><div class="workbench-label">RECENT CLASS VISITS</div><div class="recent-home-classes">${classes.map((c) => `<a href="${classURL(c.slug)}" data-open-studio>${esc(c.name)} <span>↗</span></a>`).join("") || '<p class="workbench-hint">Your next visit starts a trail.</p>'}</div></div>`;
    }
    activateLinks($("#personalContent"));
  }
  async function search() {
    const token = ++searchToken,
      q = $("#homeSearch").value.trim(),
      scope = $("#homeSearchType").value;
    $("#homeClearSearch").hidden = !q;
    $("#homeSearchResults").hidden = !q;
    $("#homeSearchResults").setAttribute("aria-busy", false);
    if (!q) {
      $("#homeSearchStatus").textContent =
        "59 classes. Thousands of little details to explore.";
      $("#homeSearchResults").innerHTML = "";
      return;
    }
    if (scope === "classes") {
      const list = data.classes.filter((c) =>
        (c.name + " " + c.line).toLowerCase().includes(q.toLowerCase()),
      );
      $("#homeSearchResults").innerHTML = list
        .slice(0, 6)
        .map(
          (c) =>
            `<a href="${classURL(c.slug)}" data-open-studio><strong>${esc(c.name)}</strong><span>${esc(familyOf(c))} · ${c.count} skills ↗</span></a>`,
        )
        .join("");
      $("#homeSearchStatus").textContent = list.length
        ? `${list.length} matching classes. Browse the atlas below for all results.`
        : "No classes found. Try another name, or switch to Skills.";
      activateLinks($("#homeSearchResults"));
      return;
    }
    if (q.length < 2) {
      $("#homeSearchStatus").textContent =
        "Enter at least 2 characters to search every class.";
      $("#homeSearchResults").innerHTML = "";
      return;
    }
    $("#homeSearchStatus").textContent =
      "Searching the skill library. The first search loads its index…";
    $("#homeSearchResults").setAttribute("aria-busy", true);
    try {
      const rows = await getGlobalLibrary();
      if (token !== searchToken) return;
      const matches = rows.filter((e) =>
        `${e.skill.name} ${e.skill.id}`.toLowerCase().includes(q.toLowerCase()),
      );
      $("#homeSearchResults").innerHTML = matches
        .slice(0, 8)
        .map(
          ({ skill: s, classSlug, className }) =>
            `<a href="${entryURL({ classSlug, skillSlug: s.slug })}" data-open-studio><strong>${esc(s.name)}</strong><span>${esc(className)} · ${esc(s.job)} ↗</span></a>`,
        )
        .join("");
      $("#homeSearchStatus").textContent = matches.length
        ? `${matches.length} skills found${matches.length > 8 ? " · Showing the first 8. Refine your search for more specific results." : "."}${globalFailures ? " Some classes are temporarily unavailable." : ""}`
        : "No matching skills. Try another name or skill ID.";
      activateLinks($("#homeSearchResults"));
    } catch {
      $("#homeSearchStatus").textContent =
        "The skill index could not be loaded. Try searching again.";
    } finally {
      if (token === searchToken)
        $("#homeSearchResults").setAttribute("aria-busy", false);
    }
  }
  async function show() {
    Atlas.hide();
    pause(false);
    ++loadVersion;
    ++drawVersion;
    ++showFrame.token;
    ++searchVersion;
    cancelSearch();
    document.body.classList.add("home-view");
    document.body.classList.remove("focus-mode");
    $("#focus").textContent = "Focus view";
    $("#focus").setAttribute("aria-pressed", false);
    closeBrowser();
    $("#homePage").hidden = false;
    $("#homeNav").setAttribute("aria-current", "page");
    $("#studioNav").removeAttribute("aria-current");
    $("#skipLink").href = "#homePage";
    $("#skipLink").textContent = "Skip to home content";
    document.title = "Maple Animations — Class Atlas & Animation Studio";
    renderAtlas();
    renderDiscoveries();
    await Promise.all([renderPersonal(), search()]);
  }
  function hide() {
    cancelSearch();
    document.body.classList.remove("home-view");
    $("#homePage").hidden = true;
    $("#homeNav").removeAttribute("aria-current");
    $("#studioNav").setAttribute("aria-current", "page");
    $("#skipLink").href = "#inspector";
    $("#skipLink").textContent = "Skip to skill preview";
    document.title = "Maple Animations — Animation Studio";
  }
  return {
    init,
    show,
    hide,
    isVisible,
    cancelSearch,
    renderPersonal,
    search,
    renderAtlas,
  };
})();
