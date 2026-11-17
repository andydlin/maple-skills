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
let catalog = [],
  meta = {},
  skills = [],
  current = null,
  selectedClass = "hero",
  layer = "",
  frames = [],
  index = 0,
  playing = false,
  timer,
  loadVersion = 0,
  drawVersion = 0,
  bounds = null,
  pan = { x: 0, y: 0 },
  root =
    localStorage.getItem("mapleAssetRoot") ??
    "https://pub-5005fc41413846b383b14fe2d3cb7abc.r2.dev",
  favorites = new Set(
    JSON.parse(localStorage.getItem("mapleFavorites") || "[]"),
  );
let rangeStart = 0,
  rangeEnd = 0,
  pingDirection = 1,
  playSession = 0,
  framesReady = false;
const delayOf = (f) => (Number.isFinite(f?.delay) ? Math.max(1, f.delay) : 90);
const images = new Map();
const classData = new Map();
let searchVersion = 0,
  globalLibrary = null,
  globalPromise = null,
  globalFailures = 0;
let recentClasses = JSON.parse(
  localStorage.getItem("mapleRecentClasses") || "[]",
);
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
const frameCount = (s) => layers(s).reduce((n, [, f]) => n + f.length, 0);
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
        return d;
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
        k !== "fallback",
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
  if (images.has(url)) return images.get(url);
  const p = new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => {
      images.delete(url);
      reject(new Error("Frame unavailable"));
    };
    im.src = url;
  });
  images.set(url, p);
  if (images.size > 600) images.delete(images.keys().next().value);
  return p;
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
          loadClass(b.dataset.class);
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
          loadClass(b.dataset.class);
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
        (kind === "animated" && layers(s).length) ||
        (kind === "still" && !layers(s).length)),
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
    if ($("#search").value.trim().length < 2 && $("#kind").value !== "saved") {
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
            `<button class="skill-card ${s === current ? "active" : ""}" aria-pressed="${s === current}" data-slug="${esc(s.slug)}" data-class="${esc(classSlug)}">${s.icon ? `<img loading="lazy" src="${esc(asset(s.icon))}" alt="">` : '<span class="icon-placeholder">✦</span>'}<span><strong>${esc(s.name)}</strong><small>${global ? esc(className) + " · " : ""}${esc(s.job || "Other")} · ${frameCount(s) || "No"} frames</small></span>${favorites.has(skillKey(classSlug, s)) ? '<span class="dot">★</span>' : ""}</button>`,
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
            loadClass(b.dataset.class, b.dataset.slug);
          } else selectSkill(skills.find((s) => s.slug === b.dataset.slug));
        }),
    );
}
async function loadClass(slug, skillSlug) {
  pause();
  const token = ++loadVersion;
  selectedClass = slug;
  current = null;
  frames = [];
  ++drawVersion;
  ++showFrame.token;
  $("#export").disabled = true;
  $("#sheet").disabled = true;
  $("#play").disabled = true;
  renderClasses();
  $("#skills").innerHTML = '<p class="empty">Loading class…</p>';
  $("#skillName").textContent = "Loading…";
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
    localStorage.setItem("mapleRecentClasses", JSON.stringify(recentClasses));
    renderClasses();
    meta = data;
    skills = data.skills;
    $("#className").textContent = data.class || slug;
    $("#classLine").textContent = data.classLine || "MapleStory";
    $("#crumb").textContent = (data.class || slug).toUpperCase();
    $("#classStats").textContent =
      `${skills.length} skills · ${skills.filter((s) => layers(s).length).length} with frames`;
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
    $("#export").disabled = true;
    $("#sheet").disabled = true;
    $("#layers").innerHTML = "";
    $("#filmstrip").innerHTML = "";
    $("#counter").textContent = "0 / 0";
  }
}
function updateURL() {
  if (!current) return;
  const u = new URL(location.href);
  u.hash = new URLSearchParams({
    class: selectedClass,
    skill: current.slug,
    layer,
    frame: index,
  }).toString();
  history.replaceState(null, "", u);
}
async function selectSkill(s) {
  if (!s) return;
  pause();
  current = s;
  $("#skillName").textContent = s.name;
  $("#skillJob").textContent = `${s.job || "OTHER"} JOB / #${s.id || "—"}`;
  $("#search").placeholder = `Search ${meta.class || "class"} skills…`;
  $("#description").textContent = s.description || "No description available.";
  $("#availability").textContent = !layers(s).length
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
      .join("") || '<span class="muted">No animation layers</span>';
  $("#layers")
    .querySelectorAll("button")
    .forEach((b) => (b.onclick = () => setLayer(b.dataset.layer)));
  renderSkills();
  await setLayer(ls[0]?.[0] || "");
}
async function setLayer(name) {
  pause();
  framesReady = false;
  layer = name;
  frames =
    layers(current).find(([k]) => k === name)?.[1] || current?.fallback || [];
  index = 0;
  rangeStart = 0;
  rangeEnd = Math.max(0, frames.length - 1);
  pingDirection = 1;
  updateRangeUI();
  bounds = null;
  pan = { x: 0, y: 0 };
  ++showFrame.token;
  const token = ++drawVersion;
  $("#layers")
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("active", b.dataset.layer === name));
  $("#filmstrip").innerHTML = frames
    .map(
      (f, i) =>
        `<button class="frame" data-frame="${i}" aria-label="Frame ${i + 1}"><img loading="lazy" src="${esc(asset(f.file))}" alt=""><span>${String(i + 1).padStart(2, "0")} · ${f.delay || 0}ms</span></button>`,
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
  $("#prev").disabled = $("#next").disabled = !frames.length;
  $("#export").disabled = true;
  $("#sheet").disabled = true;
  $("#duration").textContent =
    frames.reduce((n, f) => n + (f.delay || 90), 0) + " ms";
  if (!frames.length) {
    $("#canvas")
      .getContext("2d")
      .clearRect(0, 0, $("#canvas").width, $("#canvas").height);
    $("#stageMessage").textContent =
      "No animation frames available for this skill.";
    $("#frameSize").textContent = "";
    $("#counter").textContent = "0 / 0";
    $("#time").textContent = "0 ms";
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
            value: await imageFor(sequence[i].file),
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
  framesReady = true;
  $("#play").disabled = frames.length < 2;
  await showFrame(0);
}
function originFor(f, im) {
  return f.origin && !f.origin.isEmpty
    ? f.origin
    : { x: im.width / 2, y: im.height / 2 };
}
async function showFrame(i) {
  index = Math.max(0, Math.min(i, frames.length - 1));
  const f = frames[index],
    token = ++showFrame.token;
  if (!f) return;
  $("#timeline").value = index;
  $("#frameJump").value = index + 1;
  $("#frameJump").max = frames.length;
  $("#frameInfo").textContent =
    `${f.delay ?? 90} ms · origin ${f.origin?.x ?? "—"}, ${f.origin?.y ?? "—"}`;
  $("#canvas").setAttribute(
    "aria-label",
    `${current?.name || "Skill"}, ${layer || "still"}, frame ${index + 1} of ${frames.length}`,
  );
  $("#counter").textContent =
    `${String(index + 1).padStart(2, "0")} / ${frames.length}`;
  $("#time").textContent =
    frames.slice(0, index).reduce((n, f) => n + (f.delay || 90), 0) + " ms";
  $("#filmstrip")
    .querySelectorAll("button")
    .forEach((b, j) => {
      b.classList.toggle("active", index === j);
      b.setAttribute("aria-pressed", index === j);
    });
  updateURL();
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
      ),
      scale = $("#zoom").value === "fit" ? fit : Number($("#zoom").value) * dpr;
    ctx.save();
    ctx.translate(c.width / 2 + pan.x * dpr, c.height / 2 + pan.y * dpr);
    ctx.scale($("#flip").checked ? -scale : scale, scale);
    ctx.translate(-(b.minX + b.maxX) / 2, -(b.minY + b.maxY) / 2);
    ctx.imageSmoothingEnabled = !$("#pixel").checked;
    if ($("#onion").checked && index > 0) {
      try {
        const previous = await imageFor(frames[index - 1].file);
        if (token !== showFrame.token) {
          ctx.restore();
          return;
        }
        const po = originFor(frames[index - 1], previous);
        ctx.globalAlpha = 0.24;
        ctx.drawImage(previous, -po.x, -po.y);
        ctx.globalAlpha = 1;
      } catch {}
    }
    ctx.drawImage(im, -o.x, -o.y);
    if ($("#origin").checked) {
      ctx.strokeStyle = "#db5314";
      ctx.lineWidth = 1.5 / scale;
      ctx.beginPath();
      ctx.moveTo(-12 / scale, 0);
      ctx.lineTo(12 / scale, 0);
      ctx.moveTo(0, -12 / scale);
      ctx.lineTo(0, 12 / scale);
      ctx.stroke();
    }
    ctx.restore();
    $("#stageMessage").textContent = "";
    $("#stageLabel").textContent = layer
      ? layer.toUpperCase() + " / FRAME PREVIEW"
      : "STILL REFERENCE";
    $("#frameSize").textContent = `${im.width} × ${im.height} PX`;
    $("#export").disabled = false;
    $("#sheet").disabled = !framesReady;
  } catch (e) {
    if (token !== showFrame.token) return;
    $("#canvas")
      .getContext("2d")
      .clearRect(0, 0, $("#canvas").width, $("#canvas").height);
    $("#stageMessage").textContent =
      "Frame unavailable. Try another frame or check the asset source.";
    $("#export").disabled = true;
    $("#sheet").disabled = true;
  }
}
showFrame.token = 0;
function resetView() {
  pan = { x: 0, y: 0 };
  $("#zoom").value = "fit";
  $("#viewLabel").textContent = "Fit to view";
  showFrame(index);
}
function pause() {
  ++playSession;
  playing = false;
  clearTimeout(timer);
  $("#play").textContent = "▶ Play";
  $("#playState").textContent = "PAUSED";
}
function nextInRange(i, direction, mode, start, end, loop) {
  if (end <= start) return { stop: true, next: start, direction };
  if (mode === "reverse")
    return i <= start
      ? { stop: !loop, next: end, direction: -1 }
      : { next: i - 1, direction: -1 };
  if (mode === "pingpong") {
    if (direction > 0 && i >= end) return { next: end - 1, direction: -1 };
    if (direction < 0 && i <= start)
      return { stop: !loop, next: start + 1, direction: 1 };
    return { next: i + direction, direction };
  }
  return i >= end
    ? { stop: !loop, next: start, direction: 1 }
    : { next: i + 1, direction: 1 };
}
function updateRangeUI() {
  $("#rangeStart").value = rangeStart + 1;
  $("#rangeEnd").value = rangeEnd + 1;
  for (const id of ["rangeStart", "rangeEnd"]) {
    $("#" + id).max = Math.max(1, frames.length);
    $("#" + id).disabled = !frames.length;
  }
  $("#rangeSummary").textContent = frames.length
    ? `${rangeStart + 1}–${rangeEnd + 1} · ${rangeEnd - rangeStart + 1} frames · ${frames.slice(rangeStart, rangeEnd + 1).reduce((n, f) => n + delayOf(f), 0)} ms`
    : "No frames";
  for (const id of ["frameJump", "markIn", "markOut", "fullRange"])
    $("#" + id).disabled = !frames.length;
}
function setRange(start, end) {
  pause();
  rangeStart = Math.max(
    0,
    Math.min(Math.trunc(Number(start)) || 0, frames.length - 1),
  );
  rangeEnd = Math.max(
    rangeStart,
    Math.min(Math.trunc(Number(end)) || 0, frames.length - 1),
  );
  pingDirection = 1;
  updateRangeUI();
}
function play() {
  if (!framesReady || frames.length < 2 || rangeEnd <= rangeStart) {
    if (frames.length) toast("Choose at least two frames to play.");
    return;
  }
  const mode = $("#playMode").value || "forward";
  pingDirection = 1;
  if (
    index < rangeStart ||
    index > rangeEnd ||
    (mode !== "reverse" && index === rangeEnd)
  )
    showFrame(mode === "reverse" ? rangeEnd : rangeStart);
  if (mode === "reverse" && index === rangeStart) showFrame(rangeEnd);
  playing = true;
  $("#play").textContent = "Ⅱ Pause";
  $("#playState").textContent = "PLAYING";
  schedule();
}
function schedule() {
  clearTimeout(timer);
  if (!playing) return;
  const session = playSession;
  timer = setTimeout(
    async () => {
      if (session !== playSession || !playing) return;
      const step = nextInRange(
        index,
        pingDirection,
        $("#playMode").value || "forward",
        rangeStart,
        rangeEnd,
        $("#loop").checked,
      );
      if (step.stop) {
        pause();
        return;
      }
      pingDirection = step.direction;
      await showFrame(step.next);
      if (session === playSession) schedule();
    },
    Math.max(1, delayOf(frames[index]) / Number($("#speed").value)),
  );
}
$("#play").onclick = () => (playing ? pause() : play());
$("#prev").onclick = () => {
  pause();
  showFrame((index - 1 + frames.length) % frames.length);
};
$("#next").onclick = () => {
  pause();
  showFrame((index + 1) % frames.length);
};
$("#timeline").oninput = (e) => {
  pause();
  showFrame(+e.target.value);
};
$("#speed").onchange = () => {
  if (playing) schedule();
};
for (const id of ["zoom", "origin", "flip", "pixel", "onion"])
  $("#" + id).onchange = () => {
    showFrame(index);
    $("#viewLabel").textContent =
      $("#zoom").value === "fit"
        ? "Fit to view"
        : Number($("#zoom").value) * 100 + "% scale";
  };
$("#background").onchange = (e) => {
  const s = $("#stage");
  s.style.backgroundImage = e.target.value === "checker" ? "" : "none";
  s.style.backgroundColor = {
    checker: "#f1f5f4",
    dark: "#101210",
    light: "#fffdf4",
    green: "#00b140",
  }[e.target.value];
};
$("#frameJump").onchange = (e) => {
  pause();
  showFrame(
    Math.max(0, Math.min(frames.length - 1, (Number(e.target.value) || 1) - 1)),
  );
};
$("#playMode").onchange = () => {
  pause();
  pingDirection = 1;
};
$("#rangeStart").onchange = (e) =>
  setRange(
    Number(e.target.value) - 1,
    Math.max(rangeEnd, Number(e.target.value) - 1),
  );
$("#rangeEnd").onchange = (e) =>
  setRange(
    Math.min(rangeStart, Number(e.target.value) - 1),
    Number(e.target.value) - 1,
  );
$("#markIn").onclick = () => setRange(index, Math.max(index, rangeEnd));
$("#markOut").onclick = () => setRange(Math.min(index, rangeStart), index);
$("#fullRange").onclick = () => setRange(0, frames.length - 1);
$("#focus").onclick = () => {
  const focused = document.body.classList.toggle("focus-mode");
  $("#focus").textContent = focused ? "← Show library" : "⛶ Focus view";
  $("#focus").setAttribute("aria-pressed", !!focused);
};
$("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($("main").requestFullscreen) await $("main").requestFullscreen();
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
  localStorage.setItem("mapleFavorites", JSON.stringify([...favorites]));
  $("#favorite").textContent = favorites.has(k) ? "★" : "☆";
  $("#favorite").setAttribute("aria-pressed", favorites.has(k));
  renderSkills();
};
let exportSnapshot = null,
  exportPrepared = null,
  exportVersion = 0;
function downloadBlob(blob, name) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function openExport(mode) {
  if (!current || !frames.length || !framesReady) return;
  pause();
  exportSnapshot = {
    classSlug: selectedClass,
    className: meta.class,
    skill: current.name,
    skillSlug: current.slug,
    layer,
    version: meta.version,
    flip: $("#flip").checked,
    current: index,
    rangeStart,
    rangeEnd,
    frames: frames.slice(),
  };
  $("#exportMode").value = mode;
  $("#exportContext").textContent =
    `${meta.class} / ${current.name} / ${layer || "still reference"}`;
  $("#exportDialog").showModal();
  prepareExport();
}
async function prepareExport() {
  const token = ++exportVersion,
    s = exportSnapshot;
  if (!s) return;
  exportPrepared = null;
  $("#downloadExport").disabled = true;
  $("#exportMetadata").disabled = true;
  $("#exportSummary").textContent = "Preparing export…";
  const mode = $("#exportMode").value || "frame",
    entries = (
      mode === "frame"
        ? s.frames.slice(s.current, s.current + 1)
        : s.frames.slice(s.rangeStart, s.rangeEnd + 1)
    ).map((f, i) => ({
      ...f,
      frameNumber: (mode === "frame" ? s.current : s.rangeStart) + i + 1,
    }));
  $("#exportCols").disabled = $("#exportPad").disabled = mode === "frame";
  try {
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(6, entries.length) }, async () => {
        while (cursor < entries.length && token === exportVersion) {
          const i = cursor++,
            im = await imageFor(entries[i].file);
          entries[i] = {
            ...entries[i],
            image: im,
            width: im.width,
            height: im.height,
          };
        }
      }),
    );
    if (token !== exportVersion) return;
    const plan = ExportKit.plan(entries, {
      mode,
      scale: $("#exportScale").value,
      columns: $("#exportCols").value,
      padding: $("#exportPad").value,
      flip: s.flip,
    });
    exportPrepared = { entries, plan, snapshot: s };
    $("#exportSummary").textContent =
      `${plan.width.toLocaleString()} × ${plan.height.toLocaleString()} px · ${entries.length} frame${entries.length === 1 ? "" : "s"} · ${mode === "contact" ? "Labeled background" : "Transparent"}${s.flip ? " · Mirrored" : ""}`;
    $("#downloadExport").disabled = false;
    $("#exportMetadata").disabled = false;
  } catch (e) {
    if (token === exportVersion)
      $("#exportSummary").textContent =
        e.message || "Could not prepare this export.";
  }
}
$("#export").onclick = () => openExport("frame");
$("#sheet").onclick = () => openExport("sprite");
for (const id of ["exportMode", "exportScale", "exportCols", "exportPad"])
  $("#" + id).onchange = prepareExport;
$("#exportDialog").addEventListener("close", () => {
  ++exportVersion;
  exportSnapshot = null;
  exportPrepared = null;
});
$("#downloadExport").onclick = async () => {
  const prepared = exportPrepared,
    token = exportVersion;
  if (!prepared) return;
  $("#downloadExport").disabled = true;
  try {
    const { entries, plan, snapshot: s } = prepared,
      c = ExportKit.draw(
        document.createElement("canvas"),
        entries,
        plan,
        `${s.className} / ${s.skill} / ${s.layer || "still"}`,
      );
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    if (token !== exportVersion) return;
    if (!blob) throw Error("Could not encode the image. Try a smaller sheet.");
    downloadBlob(
      blob,
      `${s.classSlug}-${s.skillSlug}-${s.layer || "still"}-${plan.mode}-${entries[0].frameNumber}-${entries[entries.length - 1].frameNumber}.png`,
    );
    $("#exportDialog").close();
    toast("Your PNG is ready.");
  } catch (e) {
    if (token === exportVersion) {
      $("#exportSummary").textContent =
        e.message || "Export failed. Check the asset connection and try again.";
      $("#downloadExport").disabled = false;
    }
  }
};
$("#exportMetadata").onclick = () => {
  if (!exportPrepared) return;
  const { entries, plan, snapshot: s } = exportPrepared;
  const data = ExportKit.metadata(entries, plan, {
    class: s.className,
    skill: s.skill,
    skillSlug: s.skillSlug,
    layer: s.layer,
    sourceVersion: s.version,
  });
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    `${s.classSlug}-${s.skillSlug}-${plan.mode}.json`,
  );
  toast("Timing and origin data saved.");
};
$("#link").onclick = async () => {
  updateURL();
  try {
    await navigator.clipboard.writeText(location.href);
    toast("Skill link copied");
  } catch {
    toast("Copy the URL from your address bar");
  }
};
document.addEventListener("keydown", (e) => {
  if (
    /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName) ||
    $("#sourceDialog").open ||
    $("#exportDialog").open
  )
    return;
  if (e.key.toLowerCase() === "r") {
    e.preventDefault();
    resetView();
  }
  if (e.key.toLowerCase() === "f") {
    e.preventDefault();
    $("#focus").click();
  }
  if (e.code === "Space") {
    e.preventDefault();
    playing ? pause() : play();
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    $("#prev").click();
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    $("#next").click();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
new IntersectionObserver((e) => {
  if (!e[0].isIntersecting) pause();
}).observe($("#stage"));
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
    localStorage.setItem("mapleAssetRoot", root);
    images.clear();
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
    `${catalog.length} classes · ${root ? "Connected assets" : "Local collection"}`;
  renderClasses();
  const p = new URLSearchParams(location.hash.slice(1));
  await loadClass(p.get("class") || "hero", p.get("skill"));
  if (p.get("layer") && layers(current).some(([k]) => k === p.get("layer")))
    await setLayer(p.get("layer"));
  if (p.has("frame")) await showFrame(+p.get("frame") || 0);
}
new ResizeObserver(() => {
  const c = $("#canvas"),
    r = $("#stage").getBoundingClientRect(),
    d = window.devicePixelRatio || 1;
  c.width = Math.round(r.width * d);
  c.height = Math.round(r.height * d);
  if (frames.length) showFrame(index);
}).observe($("#stage"));
let drag = null;
$("#stage").onpointerdown = (e) => {
  drag = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  $("#stage").setPointerCapture(e.pointerId);
};
$("#stage").onpointermove = (e) => {
  if (!drag) return;
  pan = { x: drag.px + e.clientX - drag.x, y: drag.py + e.clientY - drag.y };
  showFrame(index);
};
$("#stage").onpointerup = $("#stage").onpointercancel = () => {
  drag = null;
};
$("#stage").ondblclick = resetView;
$("#reset").onclick = resetView;
init().catch(() => {
  $("#stageMessage").textContent =
    "Could not load the catalog. Reload to try again.";
});
