"use strict";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
function readLocal(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function readJSON(key, fallback) {
  try {
    return JSON.parse(readLocal(key, JSON.stringify(fallback)));
  } catch {
    return fallback;
  }
}
function writeLocal(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
const asStrings = (value) =>
  Array.isArray(value) ? value.filter((x) => typeof x === "string") : [];
let catalog = [],
  meta = {},
  skills = [],
  current = null,
  selectedClass = "",
  layer = "",
  summonAction = "",
  frames = [],
  index = 0,
  playing = false,
  timer,
  loadVersion = 0,
  drawVersion = 0,
  bounds = null,
  root =
    readLocal("mapleAssetRoot", null) ??
    "https://pub-5005fc41413846b383b14fe2d3cb7abc.r2.dev",
  favorites = new Set(asStrings(readJSON("mapleFavorites", [])));
let loopPlayback = true,
  playSession = 0,
  framesReady = false;
const delayOf = (f) => (Number.isFinite(f?.delay) ? Math.max(1, f.delay) : 90);
const images = new Map();
const imageSizes = new Map();
let imageBytes = 0;
const classData = new Map();
let searchVersion = 0,
  globalLibrary = null,
  globalPromise = null,
  globalFailures = 0;
let recentClasses = asStrings(readJSON("mapleRecentClasses", []));
const familyOf = (c) =>
  [
    "Cygnus Knights",
    "Explorer",
    "Resistance",
    "Heroes",
    "Nova",
    "Flora",
    "Anima",
    "Sengoku",
    "Shine",
    "Special",
    "Collab",
  ].find((f) => (c.line || "").includes(f)) || "Other";
const frameCount = (s) => layers(s).reduce((n, [, f]) => n + f.length, 0) + (s?._summon?.verifiedFrames || 0);
const hasFrames = s => frameCount(s) > 0;
const skillKey = (slug, s) => slug + ":" + s.id + ":" + s.slug;
async function getClassData(slug) {
  if (!classData.has(slug)) {
    classData.set(
      slug,
      (async () => {
        const r = await fetch(asset(`data/${slug}/skills.json`));
        if (!r.ok) throw Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (!Array.isArray(d.skills)) throw Error("Invalid class catalog");
        return Summons.attach(d, slug);
      })().catch((e) => {
        classData.delete(slug);
        throw e;
      }),
    );
  }
  return classData.get(slug);
}
async function getGlobalLibrary() {
  if (globalLibrary) return globalLibrary;
  if (globalPromise) return globalPromise;
  globalPromise = (async () => {
    let cursor = 0,
      done = 0,
      rows = [];
    globalFailures = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (cursor < catalog.length) {
          const c = catalog[cursor++];
          try {
            const d = await getClassData(c.slug);
            rows.push(
              ...d.skills.map((skill) => ({
                skill,
                classSlug: c.slug,
                className: c.name,
              })),
            );
          } catch {
            globalFailures++;
          }
          done++;
          if ($("#scope").value === "all")
            $("#searchStatus").textContent =
              `Indexing classes ${done} / ${catalog.length}…`;
        }
      }),
    );
    if (!globalFailures) globalLibrary = rows;
    return rows;
  })();
  try {
    return await globalPromise;
  } finally {
    globalPromise = null;
  }
}

const asset = (p) =>
  /^https?:/.test(p)
    ? p
    : (root ? root.replace(/\/$/, "") + "/" : "") +
      (root ? p.replace(/^data\//, "") : p).replace(/^\.\//, "");
const layers = (s) =>
  Object.entries(s || {})
    .filter(
      ([k, v]) =>
        Array.isArray(v) &&
        v.some((f) => f && typeof f.file === "string") &&
        k !== "fallback" && k !== "summon",
    )
    .map(([k, v]) => [k, v.filter((f) => !f.placeholder)])
    .filter(([, v]) => v.length);
const key = (s) => selectedClass + ":" + s.id + ":" + s.slug;
const toast = (t) => {
  $("#toast").textContent = t;
  $("#toast").style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").style.display = "none"), 2800);
};
function imageFor(file) {
  const url = asset(file);
  if (images.has(url)) {
    const promise = images.get(url);
    images.delete(url);
    images.set(url, promise);
    return promise;
  }
  const p = new Promise((resolve, reject) => {
    const im = new Image();
    let timeout = setTimeout(() => {
      im.src = "";
      fail();
    }, 20000);
    function fail() {
      clearTimeout(timeout);
      images.delete(url);
      imageBytes -= imageSizes.get(url) || 0;
      imageSizes.delete(url);
      reject(Error("Frame unavailable"));
    }
    im.crossOrigin = "anonymous";
    im.onload = () => {
      clearTimeout(timeout);
      if (images.has(url)) {
        const bytes = im.width * im.height * 4;
        imageSizes.set(url, bytes);
        imageBytes += bytes;
        while (
          images.size > 2 &&
          (imageBytes > 96 * 1024 * 1024 || images.size > 240)
        ) {
          const oldest = images.keys().next().value;
          images.delete(oldest);
          imageBytes -= imageSizes.get(oldest) || 0;
          imageSizes.delete(oldest);
        }
      }
      resolve(im);
    };
    im.onerror = fail;
    im.src = url;
  });
  images.set(url, p);
  return p;
}
function closeBrowser() {
  document.body.classList.remove("browse-open");
  $("#browseToggle").setAttribute("aria-expanded", false);
  $("#browseToggle").textContent = "☰ Browse classes & skills";
}
function navigateClass(slug, skillSlug) {
  const u = new URL(location.href);
  u.hash = new URLSearchParams({
    class: slug,
    ...(skillSlug ? { skill: skillSlug } : {}),
  }).toString();
  try {
    history.pushState(null, "", u);
  } catch {}
  return loadClass(slug, skillSlug);
}
function renderClasses() {
  const q = $("#classSearch").value.toLowerCase(),
    family = $("#family").value || "all";
  const list = catalog.filter(
    (c) =>
      (c.name + " " + c.line).toLowerCase().includes(q) &&
      (family === "all" || familyOf(c) === family),
  );
  $("#classes").innerHTML =
    list
      .map(
        (c) =>
          `<button class="class-button ${c.slug === selectedClass ? "active" : ""}" aria-current="${c.slug === selectedClass ? "page" : "false"}" data-class="${esc(c.slug)}">${esc(c.name)}<span>${c.count ?? ""}</span></button>`,
      )
      .join("") ||
    '<p class="empty">No classes match. Try another family or name.</p>';
  $("#classes")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          $("#scope").value = "class";
          navigateClass(b.dataset.class);
        }),
    );
  const recent = recentClasses
    .filter((slug) => slug !== selectedClass)
    .map((slug) => catalog.find((c) => c.slug === slug))
    .filter(Boolean)
    .slice(0, 3);
  $("#recentClasses").innerHTML = recent.length
    ? '<span class="section-label">RECENT</span>' +
      recent
        .map(
          (c) => `<button data-class="${esc(c.slug)}">${esc(c.name)}</button>`,
        )
        .join("")
    : "";
  $("#recentClasses")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          $("#scope").value = "class";
          navigateClass(b.dataset.class);
        }),
    );
}
function filteredRows(rows) {
  const q = $("#search").value.trim().toLowerCase(),
    job = $("#job").value,
    kind = $("#kind").value;
  const result = rows.filter(
    ({ skill: s, classSlug }) =>
      (job === "All jobs" || s.job === job) &&
      (!q ||
        `${s.name} ${s.id} ${s.description || ""}`.toLowerCase().includes(q)) &&
      (kind === "all" ||
        (kind === "saved" && favorites.has(skillKey(classSlug, s))) ||
        (kind === "summons" && s._summon) ||
        (kind === "animated" && hasFrames(s)) ||
        (kind === "still" && !hasFrames(s))),
  );
  const sort = $("#sort").value;
  if (sort === "name")
    result.sort((a, b) => a.skill.name.localeCompare(b.skill.name));
  if (sort === "frames")
    result.sort((a, b) => frameCount(b.skill) - frameCount(a.skill));
  return result;
}
async function renderSkills() {
  const token = ++searchVersion,
    global = $("#scope").value === "all";
  $("#listTitle").textContent = global ? "ALL CLASSES" : "SKILLS";
  let rows = skills.map((skill) => ({
    skill,
    classSlug: selectedClass,
    className: meta.class,
  }));
  if (global) {
    if ($("#search").value.trim().length < 2 && !["saved", "summons"].includes($("#kind").value)) {
      $("#skills").innerHTML =
        '<div class="empty"><strong>A whole world of skills.</strong><p>Enter at least 2 characters to search all 59 classes, or choose Favorites to see saved skills.</p></div>';
      $("#resultCount").textContent = "—";
      $("#searchStatus").textContent =
        "The all-class index loads once, when you search.";
      return;
    }
    $("#searchStatus").textContent = "Loading the all-class index…";
    rows = await getGlobalLibrary();
    if (token !== searchVersion) return;
  }
  const list = filteredRows(rows),
    shown = list.slice(0, 250);
  $("#resultCount").textContent = list.length;
  $("#searchStatus").textContent =
    globalFailures && global
      ? `${globalFailures} classes could not be indexed. Search again to retry.`
      : list.length > 250
        ? `Showing the first 250 of ${list.length} results. Refine your search.`
        : global
          ? "Results include the class name. Select one to open its preview."
          : "";
  $("#skills").innerHTML = shown.length
    ? shown
        .map(
          ({ skill: s, classSlug, className }) =>
            `<button class="skill-card ${s === current ? "active" : ""}" aria-pressed="${s === current}" data-slug="${esc(s.slug)}" data-class="${esc(classSlug)}">${s.icon ? `<img loading="lazy" src="${esc(asset(s.icon))}" alt="">` : '<span class="icon-placeholder">✦</span>'}<span><strong>${esc(s.name)}</strong><small>${global ? esc(className) + " · " : ""}${esc(s.job || "Other")} · ${frameCount(s) || "No"} frames${s._summon ? " · Summon" : ""}</small></span>${favorites.has(skillKey(classSlug, s)) ? '<span class="dot">★</span>' : ""}</button>`,
        )
        .join("")
    : '<div class="empty"><strong>No matching skills.</strong><p>Try a shorter search, a different job, or Clear to reset the filters.</p></div>';
  $("#skills")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.class !== selectedClass || global) {
            $("#scope").value = "class";
            $("#kind").value = "all";
            closeBrowser();
            navigateClass(b.dataset.class, b.dataset.slug);
          } else {
            const u = new URL(location.href);
            u.hash = new URLSearchParams({
              class: selectedClass,
              skill: b.dataset.slug,
            }).toString();
            try {
              history.pushState(null, "", u);
            } catch {}
            closeBrowser();
            selectSkill(skills.find((s) => s.slug === b.dataset.slug));
          }
        }),
    );
}
async function loadClass(slug, skillSlug) {
  Atlas.hide();
  Home.hide();
  pause(false);
  framesReady = false;
  ++searchVersion;
  const token = ++loadVersion;
  selectedClass = slug;
  current = null;
  frames = [];
  updateCaptureUI();
  ++drawVersion;
  ++showFrame.token;
  $("#play").disabled = true;
  renderClasses();
  $("#skills").innerHTML = '<p class="empty">Loading class…</p>';
  $("#skillName").textContent = "Loading…";
  $("#skills").setAttribute("aria-busy", true);
  $("#loadHealth").textContent = "";
  $("#retryFrames").hidden = true;
  $("#stageMessage").textContent = "Loading class…";
  $("#canvas")
    .getContext("2d")
    .clearRect(0, 0, $("#canvas").width, $("#canvas").height);
  try {
    const data = await getClassData(slug);
    if (token !== loadVersion) return;
    if (!Array.isArray(data.skills)) throw Error("Invalid class catalog");
    recentClasses = [slug, ...recentClasses.filter((x) => x !== slug)].slice(
      0,
      6,
    );
    writeLocal("mapleRecentClasses", JSON.stringify(recentClasses));
    renderClasses();
    meta = data;
    skills = data.skills;
    $("#skills").setAttribute("aria-busy", false);
    $("#className").textContent = data.class || slug;
    $("#classLine").textContent = data.classLine || "MapleStory";
    $("#crumb").textContent = (data.class || slug).toUpperCase();
    $("#classStats").textContent =
      `${skills.length} skills · ${skills.filter(hasFrames).length} with frames${skills.some(s => s._summon) ? ` · ${skills.filter(s => s._summon).length} summons` : ""}`;
    $("#search").value = "";
    $("#job").innerHTML =
      "<option>All jobs</option>" +
      [...new Set(skills.map((s) => s.job).filter(Boolean))]
        .map((j) => `<option>${esc(j)}</option>`)
        .join("");
    $("#metadata").textContent =
      `${data.version || "Source version unknown"} · Dataset ${data.generated || "date unknown"}`;
    await selectSkill(
      skills.find((s) => s.slug === skillSlug) ||
        skills.find((s) => s.name === "Raging Blow") ||
        skills.find((s) => layers(s).length) ||
        skills[0],
    );
  } catch (e) {
    if (token !== loadVersion) return;
    $("#skills").setAttribute("aria-busy", false);
    skills = [];
    $("#className").textContent =
      catalog.find((c) => c.slug === slug)?.name || slug;
    $("#classStats").textContent = "Dataset unavailable";
    $("#skills").innerHTML =
      '<p class="empty">This class is not available from the connected asset source.</p>';
    $("#skillName").textContent = "Class unavailable";
    $("#description").textContent =
      "Choose another class or connect the current asset library.";
    $("#stageMessage").textContent =
      "Could not load this class. Check the asset source and try again.";
    $("#play").disabled = true;
    $("#layers").innerHTML = "";
    $("#filmstrip").innerHTML = "";
    $("#counter").textContent = "0 / 0";
  }
}
function updateURL() {
  if (!current || playing || Home.isVisible() || document.body.classList.contains("atlas-view")) return;
  const u = new URL(location.href);
  u.hash = new URLSearchParams({
    class: selectedClass,
    skill: current.slug,
    layer,
    ...(layer === "summon" ? { action: summonAction } : {}),
    frame: index,
  }).toString();
  try {
    history.replaceState(null, "", u);
  } catch {}
}
async function selectSkill(s) {
  if (!s) return;
  pause(false);
  current = s;
  summonAction = "";
  $("#summonControls").hidden = true;
  $("#skillName").textContent = s.name;
  $("#mobileSelection").textContent =
    `${meta.class || selectedClass} · ${s.name}`;
  $("#skillSource").textContent =
    `${meta.version || "Source version unknown"} · ${s.status || "No completeness status supplied"}${s.sourcePath ? "\n" + s.sourcePath : ""}`;
  $("#skillJob").textContent = `${s.job || "OTHER"} JOB / #${s.id || "—"}`;
  $("#search").placeholder = `Search ${meta.class || "class"} skills…`;
  $("#description").textContent = s.description || "No description available.";
  $("#availability").textContent = !hasFrames(s)
    ? "No animation frames in this dataset. This entry may be passive, icon-only, or awaiting frames."
    : "";
  $("#favorite").textContent = favorites.has(key(s)) ? "★" : "☆";
  $("#favorite").setAttribute("aria-pressed", favorites.has(key(s)));
  const ls = layers(s);
  $("#layers").innerHTML =
    ls
      .map(
        ([k, f]) =>
          `<button data-layer="${esc(k)}">${esc(k.replace(/([a-z])([0-9])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()))} <span>${f.length}</span></button>`,
      )
      .join("") + (s._summon ? `<button data-layer="summon">Summon <span>${s._summon.verifiedFrames}</span></button>` : "") || '<span class="muted">No animation layers</span>';
  $("#layers")
    .querySelectorAll("button")
    .forEach((b) => (b.onclick = () => setLayer(b.dataset.layer)));
  renderSkills();
  await setLayer(ls[0]?.[0] || (s._summon ? "summon" : ""));
  saveSelection();
}
async function setLayer(name, requestedAction) {
  pause(false);
  const token = ++drawVersion;
  const skill = current, classSlug = selectedClass;
  framesReady = false;
  layer = name;
  $("#summonControls").hidden = name !== "summon";
  if (name === "summon") {
    frames = [];
    $("#play").disabled = true;
    $("#summonActions").innerHTML = "";
    $("#summonRetry").hidden = true;
    $("#stageMessage").textContent = "Loading summon actions";
    $("#filmstrip").innerHTML = "";
    $("#counter").textContent = "0 / 0";
    $("#summonStatus").textContent = "Loading summon actions…";
    try {
      const data = await Summons.get(classSlug, skill.id);
      if (token !== drawVersion || current !== skill || classSlug !== selectedClass) return;
      const actions = Object.keys(data.actions);
      summonAction = actions.includes(requestedAction) ? requestedAction : actions.find(a => a === "summoned" && data.actions[a].length) || actions.find(a => data.actions[a].length) || actions[0] || "";
      frames = data.actions[summonAction] || [];
      loopPlayback = !/^die\d*$/i.test(summonAction);
      $("#summonActions").innerHTML = actions.map(a => `<button data-action="${esc(a)}" aria-pressed="${a === summonAction}" class="${a === summonAction ? "active" : ""}" ${data.actions[a].length ? "" : "disabled"}>${esc(Summons.label(a))} <span>${data.actions[a].length || "Unavailable"}</span></button>`).join("");
      $("#summonActions").querySelectorAll("button").forEach(b => b.onclick = () => setLayer("summon", b.dataset.action));
      const warnings = [];
      if (data.completeness === "partial" || data.missingFrames.length) warnings.push(`PARTIAL · ${data.missingFrames.length} missing source frame(s): ${data.missingFrames.map(f => `${f.anim} #${f.idx} (${f.reason})`).join(", ")}`);
      if (data.warnings.excludedPlaceholders) warnings.push(`${data.warnings.excludedPlaceholders} placeholder frame(s) excluded.`);
      if (data.warnings.missingDelay) warnings.push(`${data.warnings.missingDelay} frame(s) lack valid source timing; using 90 ms.`);
      if (data.warnings.missingOrigin) warnings.push(`${data.warnings.missingOrigin} frame(s) lack a source anchor; centered for preview.`);
      if (data.warnings.ungroupedFrames) warnings.push("Action boundaries are unavailable for the legacy source sequence; frames remain in source order.");
      if (/^die\d*$/i.test(summonAction)) warnings.unshift("Plays once and holds the last frame.");
      $("#summonStatus").textContent = warnings.join(" ") || "Source timing and origins preserved.";
    } catch (error) {
      if (token !== drawVersion) return;
      $("#summonStatus").textContent = error.message;
      $("#summonRetry").hidden = false;
      $("#stageMessage").textContent = "Summon animations unavailable. Retry to load them.";
      return;
    }
  } else {
    summonAction = "";
    frames = layers(current).find(([k]) => k === name)?.[1] || (current?._summon ? [] : current?.fallback || []);
    loopPlayback = true;
  }
  index = 0;
  updateCaptureUI();
  bounds = null;
  ++showFrame.token;
  $("#loadHealth").textContent = "";
  $("#retryFrames").hidden = true;
  $("#layers")
    .querySelectorAll("button")
    .forEach((b) => {
      b.classList.toggle("active", b.dataset.layer === name);
      b.setAttribute("aria-pressed", b.dataset.layer === name);
    });
  $("#filmstrip").innerHTML = frames
    .map(
      (f, i) =>
        `<button class="frame" data-frame="${i}" aria-label="Frame ${i + 1}"><img loading="lazy" src="${esc(asset(f.file))}" alt=""><span>${String(i + 1).padStart(2, "0")}</span></button>`,
    )
    .join("");
  $("#filmstrip")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          pause();
          showFrame(+b.dataset.frame);
        }),
    );
  $("#timeline").max = Math.max(0, frames.length - 1);
  $("#play").disabled = true;
  if (!frames.length) {
    $("#canvas")
      .getContext("2d")
      .clearRect(0, 0, $("#canvas").width, $("#canvas").height);
    $("#stageMessage").textContent =
      "No animation frames available for this skill.";
    $("#counter").textContent = "0 / 0";
    $("#timeline").value = 0;
    return;
  }
  $("#stageMessage").textContent = "Preparing frames…";
  const sequence = frames.slice();
  let loaded = new Array(sequence.length),
    cursor = 0,
    done = 0;
  await Promise.all(
    Array.from({ length: Math.min(8, sequence.length) }, async () => {
      while (cursor < sequence.length && token === drawVersion) {
        const i = cursor++;
        try {
          loaded[i] = {
            status: "fulfilled",
            value: await imageFor(sequence[i].file).then((im) => ({
              width: im.width,
              height: im.height,
            })),
          };
        } catch {
          loaded[i] = { status: "rejected" };
        }
        done++;
        if (token === drawVersion)
          $("#stageMessage").textContent =
            `Preparing frames ${done} / ${sequence.length}…`;
      }
    }),
  );
  if (token !== drawVersion) return;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  loaded.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const im = r.value,
      o = originFor(frames[i], im);
    minX = Math.min(minX, -o.x);
    minY = Math.min(minY, -o.y);
    maxX = Math.max(maxX, im.width - o.x);
    maxY = Math.max(maxY, im.height - o.y);
  });
  if (Number.isFinite(minX)) bounds = { minX, minY, maxX, maxY };
  const missing = loaded.filter((r) => r.status !== "fulfilled").length;
  $("#loadHealth").textContent = missing
    ? `${missing} of ${frames.length} frames could not be loaded. Available frames remain viewable.`
    : "";
  $("#retryFrames").hidden = !missing;
  $("#filmstrip")
    .querySelectorAll("button")
    .forEach((b, i) => {
      b.classList.toggle("is-missing", loaded[i]?.status !== "fulfilled");
      if (loaded[i]?.status !== "fulfilled")
        b.title = "Frame unavailable — retry loading";
    });
  framesReady = loaded.some((r) => r.status === "fulfilled");
  $("#play").disabled = frames.length < 2 || !framesReady;
  await showFrame(0);
}
function originFor(f, im) {
  return f.origin && !f.origin.isEmpty
    ? f.origin
    : { x: im.width / 2, y: im.height / 2 };
}
async function showFrame(i) {
  index = Math.max(0, Math.min(Math.trunc(Number(i)) || 0, frames.length - 1));
  const f = frames[index],
    token = ++showFrame.token;
  if (!f) return;
  $("#timeline").value = index;
  $("#timeline").setAttribute("aria-valuetext", `Frame ${index + 1} of ${frames.length}`);
  updateCaptureUI();
  $("#canvas").setAttribute(
    "aria-label",
    `${current?.name || "Skill"}, ${layer || "still"}, frame ${index + 1} of ${frames.length}`,
  );
  $("#counter").textContent =
    `${String(index + 1).padStart(2, "0")} / ${frames.length}`;
  $("#filmstrip")
    .querySelectorAll("button")
    .forEach((b, j) => {
      b.classList.toggle("active", index === j);
      b.setAttribute("aria-pressed", index === j);
    });
  updateURL();
  if (!playing) saveSelection();
  try {
    const im = await imageFor(f.file);
    if (token !== showFrame.token) return;
    const c = $("#canvas"),
      ctx = c.getContext("2d"),
      dpr = window.devicePixelRatio || 1,
      o = originFor(f, im),
      b = bounds || {
        minX: -o.x,
        minY: -o.y,
        maxX: im.width - o.x,
        maxY: im.height - o.y,
      };
    ctx.clearRect(0, 0, c.width, c.height);
    const fit = Math.min(
        (c.width - 100 * dpr) / Math.max(1, b.maxX - b.minX),
        (c.height - 100 * dpr) / Math.max(1, b.maxY - b.minY),
        2 * dpr,
      );
    const scale = fit;
    ctx.save();
    ctx.translate(c.width / 2, c.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, -o.x, -o.y);
    ctx.restore();
    $("#stageMessage").textContent = "";
  } catch (e) {
    if (token !== showFrame.token) return;
    $("#canvas")
      .getContext("2d")
      .clearRect(0, 0, $("#canvas").width, $("#canvas").height);
    $("#stageMessage").textContent =
      "Frame unavailable. Try another frame or check the asset source.";
  }
}
showFrame.token = 0;
function saveSelection() {
  if (Home.isVisible() || document.body.classList.contains("atlas-view")) return;
  if (current)
    writeLocal(
      "mapleLastSelection",
      JSON.stringify({
        class: selectedClass,
        skill: current.slug,
        layer,
        ...(layer === "summon" ? { action: summonAction } : {}),
        frame: index,
      }),
    );
  if (current) {
    const rows = readJSON("mapleRecentSkills", []),
      list = Array.isArray(rows) ? rows : [];
    const next = {
      classSlug: selectedClass,
      className: meta.class,
      skill: current.name,
      skillSlug: current.slug,
      icon: current.icon,
      layer,
      ...(layer === "summon" ? { action: summonAction } : {}),
      frame: index,
    };
    writeLocal(
      "mapleRecentSkills",
      JSON.stringify(
        [
          next,
          ...list.filter(
            (e) =>
              e &&
              !(e.classSlug === selectedClass && e.skillSlug === current.slug),
          ),
        ].slice(0, 10),
      ),
    );
  }
}
function pause(persist = true) {
  ++playSession;
  playing = false;
  clearTimeout(timer);
  $("#play").textContent = "Play";
  $("#play").setAttribute("aria-pressed", "false");
  if (persist) {
    updateURL();
    saveSelection();
  }
}
function updateCaptureUI() {
  $("#captureContext").textContent = frames.length
    ? `Frame ${index + 1} of ${frames.length} · Original resolution`
    : "No animation frames available for export.";
}
function play() {
  if (!framesReady || frames.length < 2) return;
  if (index >= frames.length - 1) showFrame(0);
  playing = true;
  $("#play").textContent = "Pause";
  $("#play").setAttribute("aria-pressed", "true");
  schedule();
}
function schedule() {
  clearTimeout(timer);
  if (!playing) return;
  const session = playSession;
  timer = setTimeout(async () => {
    if (session !== playSession || !playing) return;
    let next = index + 1;
    if (next >= frames.length) {
      if (!loopPlayback) { pause(); return; }
      next = 0;
    }
    await showFrame(next);
    if (session === playSession) schedule();
  }, delayOf(frames[index]));
}
$("#play").onclick = () => playing ? pause() : play();
$("#timeline").oninput = e => { pause(); showFrame(+e.target.value); };
$("#background").onchange = (e) => {
  writeLocal("mapleBackground", e.target.value);
  const s = $("#stage");
  s.style.backgroundImage = e.target.value === "checker" ? "" : "none";
  s.style.backgroundColor = {
    checker: "#f1f5f4",
    dark: "#000000",
    light: "#ffffff",
    green: "#00b140",
  }[e.target.value];
};
$("#focus").onclick = () => {
  const focused = document.body.classList.toggle("focus-mode");
  $("#focus").textContent = focused ? "← Show library" : "⛶ Focus view";
  $("#focus").setAttribute("aria-pressed", !!focused);
};
$("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($("#inspector").requestFullscreen)
      await $("#inspector").requestFullscreen();
    else $("#focus").click();
  } catch {
    toast("Full screen is unavailable. Use Focus view instead.");
  }
};
document.addEventListener("fullscreenchange", () => {
  $("#fullscreen").textContent = document.fullscreenElement
    ? "Exit full screen"
    : "Full screen";
});
$("#search").oninput = $("#job").onchange = $("#kind").onchange = renderSkills;
$("#classSearch").oninput = renderClasses;
$("#family").onchange = renderClasses;
$("#sort").onchange = $("#scope").onchange = () => {
  if ($("#scope").value === "all") $("#job").value = "All jobs";
  renderSkills();
};
$("#clearFilters").onclick = () => {
  $("#search").value = "";
  $("#job").value = "All jobs";
  $("#kind").value = "all";
  $("#sort").value = "job";
  renderSkills();
  $("#search").focus();
};
$("#favorite").onclick = () => {
  if (!current) return;
  const k = key(current);
  favorites.has(k) ? favorites.delete(k) : favorites.add(k);
  writeLocal("mapleFavorites", JSON.stringify([...favorites]));
  $("#favorite").textContent = favorites.has(k) ? "★" : "☆";
  $("#favorite").setAttribute("aria-pressed", favorites.has(k));
  renderSkills();
};
let stillBlob = null, stillURL = null, stillVersion = 0, stillSnapshot = null;
$("#still").onclick = async () => {
  if (!current || !frames[index]) { toast("Choose an available animation frame first."); return; }
  pause();
  const frame = frames[index], flipped = false;
  const name = `${selectedClass}-${current.slug}-${layer || "still"}${summonAction ? "-" + summonAction : ""}-${String(index + 1).padStart(3, "0")}.png`;
  stillSnapshot = { frame, flipped, name };
  $("#stillBackground").value = "transparent";
  $("#stillContext").textContent = `${current.name} · ${layer || "still"}${summonAction ? " / " + Summons.label(summonAction) : ""} · Frame ${index + 1}`;
  $("#stillDialog").showModal();
  await prepareStill();
};
async function prepareStill() {
  if (!stillSnapshot) return;
  const { frame, flipped, name } = stillSnapshot;
  const background = $("#stillBackground").value;
  $(".still-image").dataset.background = background;
  const token = ++stillVersion;
  stillBlob = null;
  if (stillURL) URL.revokeObjectURL(stillURL);
  stillURL = null;
  $("#stillImage").hidden = true;
  $("#stillDownload").hidden = true;
  $("#stillCopy").disabled = true;
  $("#stillStatus").textContent = "Preparing PNG…";
  try {
    const im = await imageFor(frame.file);
    const entries = [{ ...frame, image: im, width: im.width, height: im.height }];
    const plan = ExportKit.plan(entries, { mode: "frame", scale: 1, flip: flipped });
    const canvas = document.createElement("canvas");
    canvas.width = plan.width; canvas.height = plan.height;
    ExportKit.draw(canvas, entries, plan);
    if (background !== "transparent") {
      const ctx = canvas.getContext("2d");
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = background === "black" ? "#000000" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
    }
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (token !== stillVersion) return;
    if (!blob) throw new Error("PNG could not be created.");
    stillBlob = blob;
    stillURL = URL.createObjectURL(blob);
    $("#stillImage").src = stillURL;
    $("#stillImage").alt = $("#stillContext").textContent;
    $("#stillImage").hidden = false;
    $("#stillDownload").href = stillURL;
    $("#stillDownload").download = name.replace(/\.png$/, background === "transparent" ? ".png" : `-${background}.png`);
    $("#stillDownload").hidden = false;
    const canCopy = !!(navigator.clipboard?.write && window.ClipboardItem);
    $("#stillCopy").disabled = !canCopy;
    $("#stillStatus").textContent = `${plan.width} × ${plan.height} px · ${background === "transparent" ? "Transparent" : background === "black" ? "Black background" : "White background"} PNG${canCopy ? "" : " · Use the image menu or Download PNG to save."}`;
  } catch (error) {
    if (token === stillVersion) $("#stillStatus").textContent = error.message || "Could not prepare this frame. Try another frame.";
  }
}
$("#stillBackground").onchange = prepareStill;
$("#stillCopy").onclick = async () => {
  if (!stillBlob) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": stillBlob })]);
    $("#stillStatus").textContent = "Image copied. Paste it into your editor or message.";
  } catch {
    $("#stillStatus").textContent = "This browser could not copy the image. Press and hold or right-click the image, or download the PNG.";
  }
};
$("#stillClose").onclick = () => $("#stillDialog").close();
$("#stillDialog").addEventListener("close", () => {
  ++stillVersion;
  stillSnapshot = null;
  stillBlob = null;
  $("#stillImage").removeAttribute("src");
  if (stillURL) URL.revokeObjectURL(stillURL);
  stillURL = null;
});
document.addEventListener("keydown", (e) => {
  if (
    /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName) ||
    $("#sourceDialog").open ||
    $("#stillDialog").open ||
    $("#helpDialog").open
  )
    return;
  if (document.body.classList.contains("atlas-view")) return;
  if (e.key === "/") {
    e.preventDefault();
    if (Home.isVisible()) {
      $("#homeSearch").focus();
      return;
    }
    if (
      window.matchMedia?.("(max-width:850px)").matches &&
      !document.body.classList.contains("browse-open")
    )
      $("#browseToggle").click();
    $("#search").focus();
    return;
  }
  if (e.key === "?") {
    e.preventDefault();
    $("#help").click();
    return;
  }
  if (Home.isVisible() || document.body.classList.contains("atlas-view")) return;
  if (e.key === "Home" || e.key === "End") {
    e.preventDefault(); pause(); showFrame(e.key === "Home" ? 0 : frames.length - 1);
  }
  if (e.key.toLowerCase() === "f") {
    e.preventDefault();
    $("#focus").click();
  }
  if (e.code === "Space") {
    e.preventDefault();
    playing ? pause() : play();
  }
  if (e.key === "ArrowLeft") { e.preventDefault(); pause(); showFrame(index - 1); }
  if (e.key === "ArrowRight") { e.preventDefault(); pause(); showFrame(index + 1); }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
new IntersectionObserver((e) => {
  if (!e[0].isIntersecting) pause();
}).observe($("#stage"));
$("#help").onclick = () => $("#helpDialog").showModal();
$("#helpClose").onclick = () => $("#helpDialog").close();
$("#browseToggle").onclick = () => {
  const open = document.body.classList.toggle("browse-open");
  $("#browseToggle").setAttribute("aria-expanded", !!open);
  $("#browseToggle").textContent = open
    ? "↑ Close browser"
    : "☰ Browse classes & skills";
};
$("#sourceCancel").onclick = () => $("#sourceDialog").close();
$("#sourceDialog form").onsubmit = (e) => {
  e.preventDefault();
  $("#connect").click();
};
$("#summonRetry").onclick = () => setLayer("summon", summonAction);
$("#retryFrames").onclick = async () => {
  const at = index;
  await setLayer(layer, summonAction);
  await showFrame(at);
};
window.addEventListener("pagehide", saveSelection);
let routeVersion = 0,
  lastRouteHash = null;
async function routeFromURL() {
  const token = ++routeVersion;
  lastRouteHash = location.hash;
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.has("section")) { Atlas.show(p.get("section"), p.get("class")); return; }
  Atlas.hide();
  if (!p.has("class") && !p.has("skill") && p.get("view") !== "favorites") {
    await Home.show();
    return;
  }
  $("#scope").value = "class";
  $("#kind").value = "all";
  await loadClass(p.get("class") || catalog[0]?.slug, p.get("skill"));
  if (token !== routeVersion || Home.isVisible()) return;
  if (p.get("layer") === "summon" && current?._summon) await setLayer("summon", p.get("action"));
  else if (p.get("layer") && layers(current).some(([k]) => k === p.get("layer"))) await setLayer(p.get("layer"));
  if (token !== routeVersion) return;
  if (p.has("frame")) await showFrame(p.get("frame"));
  if (p.get("view") === "favorites") {
    $("#scope").value = "all";
    $("#kind").value = "saved";
    await renderSkills();
  }
}
window.addEventListener("popstate", () => routeFromURL());
window.addEventListener("hashchange", () => {
  if (location.hash !== lastRouteHash) routeFromURL();
});
$("#sourceBtn").onclick = () => {
  $("#assetRoot").value = root;
  $("#sourceDialog").showModal();
};
$("#connect").onclick = async () => {
  const next = $("#assetRoot").value.trim().replace(/\/$/, "");
  try {
    if (next && !/^https:\/\//.test(next))
      throw Error("Use a public HTTPS asset root.");
    const r = await fetch(
      (next ? next + "/" : "") +
        (next ? "hero/skills.json" : "data/hero/skills.json"),
    );
    if (!r.ok) throw Error("Could not read Hero at this address.");
    const d = await r.json();
    if (!Array.isArray(d.skills)) throw Error("Expected a skills catalog.");
    root = next;
    writeLocal("mapleAssetRoot", root);
    images.clear();
    imageSizes.clear();
    imageBytes = 0;
    classData.clear();
    globalLibrary = null;
    globalPromise = null;
    $("#sourceDialog").close();
    await init();
    toast("Asset library connected");
  } catch (e) {
    $("#sourceError").textContent = e.message;
  }
};
async function init() {
  catalog = await (await fetch("catalog.json")).json();
  $("#classCount").textContent = catalog.length;
  $("#family").innerHTML =
    '<option value="all">All class families</option>' +
    [...new Set(catalog.map(familyOf))]
      .sort()
      .map((f) => `<option>${esc(f)}</option>`)
      .join("");
  $("#catalogStatus").textContent =
    `${catalog.length} classes · ${catalog.reduce((n, c) => n + c.count, 0).toLocaleString()} skills`;
  renderClasses();
  await Home.init();
  await routeFromURL();
}
new ResizeObserver(() => {
  const c = $("#canvas"),
    r = $("#stage").getBoundingClientRect(),
    d = window.devicePixelRatio || 1;
  c.width = Math.round(r.width * d);
  c.height = Math.round(r.height * d);
  if (frames.length) showFrame(index);
}).observe($("#stage"));
const savedBackground = readLocal("mapleBackground", "checker");
if (["checker", "dark", "light"].includes(savedBackground)) {
  $("#background").value = savedBackground;
  $("#background").onchange({ target: $("#background") });
}
init().catch(() => {
  $("#stageMessage").textContent =
    "Could not load the catalog. Reload to try again.";
});
