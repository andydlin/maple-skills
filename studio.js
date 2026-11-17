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
const images = new Map();
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
  const q = $("#classSearch").value.toLowerCase();
  $("#classes").innerHTML = catalog
    .filter((c) => c.name.toLowerCase().includes(q))
    .map(
      (c) =>
        `<button class="class-button ${c.slug === selectedClass ? "active" : ""}" data-class="${esc(c.slug)}">${esc(c.name)}<span>${c.count ?? ""}</span></button>`,
    )
    .join("");
  $("#classes")
    .querySelectorAll("button")
    .forEach((b) => (b.onclick = () => loadClass(b.dataset.class)));
}
function renderSkills() {
  const q = $("#search").value.toLowerCase(),
    job = $("#job").value,
    kind = $("#kind").value;
  const list = skills.filter(
    (s) =>
      (job === "All jobs" || s.job === job) &&
      (!q ||
        `${s.name} ${s.id} ${s.description || ""}`.toLowerCase().includes(q)) &&
      (kind === "all" ||
        (kind === "saved" && favorites.has(key(s))) ||
        (kind === "animated" && layers(s).length) ||
        (kind === "still" && !layers(s).length)),
  );
  $("#resultCount").textContent = list.length;
  $("#skills").innerHTML = list.length
    ? list
        .map(
          (s) =>
            `<button class="skill-card ${s === current ? "active" : ""}" data-slug="${esc(s.slug)}">${s.icon ? `<img loading="lazy" src="${esc(asset(s.icon))}" alt="">` : '<span class="icon-placeholder">✦</span>'}<span><strong>${esc(s.name)}</strong><small>${esc(s.job || "Other")} · ${layers(s).reduce((n, [, f]) => n + f.length, 0) || "No"} frames</small></span>${favorites.has(key(s)) ? '<span class="dot">★</span>' : ""}</button>`,
        )
        .join("")
    : '<p class="empty">No matching skills. Try another search or filter.</p>';
  $("#skills")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () =>
          selectSkill(skills.find((s) => s.slug === b.dataset.slug))),
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
  $("#play").disabled = true;
  renderClasses();
  $("#skills").innerHTML = '<p class="empty">Loading class…</p>';
  $("#skillName").textContent = "Loading…";
  $("#stageMessage").textContent = "Loading class…";
  $("#canvas")
    .getContext("2d")
    .clearRect(0, 0, $("#canvas").width, $("#canvas").height);
  try {
    const res = await fetch(asset(`data/${slug}/skills.json`));
    if (!res.ok) throw Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (token !== loadVersion) return;
    if (!Array.isArray(data.skills)) throw Error("Invalid class catalog");
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
  layer = name;
  frames =
    layers(current).find(([k]) => k === name)?.[1] || current?.fallback || [];
  index = 0;
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
  $("#play").disabled = frames.length < 2;
  $("#prev").disabled = $("#next").disabled = !frames.length;
  $("#export").disabled = true;
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
  showFrame(0);
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
    ctx.drawImage(im, -o.x, -o.y);
    if ($("#origin").checked) {
      ctx.strokeStyle = "#d6ec98";
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
  } catch (e) {
    if (token !== showFrame.token) return;
    $("#canvas")
      .getContext("2d")
      .clearRect(0, 0, $("#canvas").width, $("#canvas").height);
    $("#stageMessage").textContent =
      "Frame unavailable. Try another frame or check the asset source.";
    $("#export").disabled = true;
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
  playing = false;
  clearTimeout(timer);
  $("#play").textContent = "▶ Play";
  $("#playState").textContent = "PAUSED";
}
function play() {
  if (frames.length < 2) return;
  playing = true;
  $("#play").textContent = "Ⅱ Pause";
  $("#playState").textContent = "PLAYING";
  schedule();
}
function schedule() {
  clearTimeout(timer);
  if (!playing) return;
  timer = setTimeout(
    async () => {
      if (index === frames.length - 1 && !$("#loop").checked) {
        pause();
        return;
      }
      await showFrame((index + 1) % frames.length);
      schedule();
    },
    Math.max(1, (frames[index]?.delay || 90) / Number($("#speed").value)),
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
for (const id of ["zoom", "origin", "flip", "pixel"])
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
    checker: "#1b201b",
    dark: "#101210",
    light: "#eee9df",
    green: "#00b140",
  }[e.target.value];
};
$("#search").oninput = $("#job").onchange = $("#kind").onchange = renderSkills;
$("#classSearch").oninput = renderClasses;
$("#favorite").onclick = () => {
  if (!current) return;
  const k = key(current);
  favorites.has(k) ? favorites.delete(k) : favorites.add(k);
  localStorage.setItem("mapleFavorites", JSON.stringify([...favorites]));
  $("#favorite").textContent = favorites.has(k) ? "★" : "☆";
  $("#favorite").setAttribute("aria-pressed", favorites.has(k));
  renderSkills();
};
$("#export").onclick = async () => {
  pause();
  try {
    const f = frames[index],
      im = await imageFor(f.file),
      c = document.createElement("canvas");
    c.width = im.width;
    c.height = im.height;
    const ctx = c.getContext("2d");
    if ($("#flip").checked) {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(im, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    if (!blob) throw Error();
    const a = document.createElement("a"),
      url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${selectedClass}-${current.slug}-${layer || "still"}-${String(index + 1).padStart(3, "0")}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast("Frame saved as transparent PNG");
  } catch (e) {
    toast("Export failed. The asset host must allow CORS for this site.");
  }
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
    $("#sourceDialog").open
  )
    return;
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
