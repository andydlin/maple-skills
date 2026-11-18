const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const dom = new JSDOM(fs.readFileSync("index.html", "utf8"), {
  url: "https://www.andydlin.com/maple-skills/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
const w = dom.window,
  d = w.document;
const paint = [];
w.HTMLCanvasElement.prototype.getContext = function () {
  return {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    drawImage() {
      paint.push("image");
    },
    fillRect() { paint.push({ fill: this.fillStyle, composite: this.globalCompositeOperation }); },
    fillText() {},
  };
};
w.HTMLCanvasElement.prototype.toBlob = function (cb) {
  cb(new w.Blob(["png"], { type: "image/png" }));
};
w.HTMLElement.prototype.getBoundingClientRect = () => ({
  width: 960,
  height: 430,
});
w.Image = class {
  set src(v) {
    this._src = v;
    this.width = 120;
    this.height = 90;
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
};
w.ResizeObserver = class {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {
    this.cb();
  }
};
w.IntersectionObserver = class {
  observe() {}
};
for (const dialog of d.querySelectorAll("dialog")) {
  dialog.showModal = function () {
    this.open = true;
  };
  dialog.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event("close"));
  };
}
w.matchMedia = () => ({ matches: false });
w.fetch = async (url) => {
  const path = String(url).replace(
    "https://pub-5005fc41413846b383b14fe2d3cb7abc.r2.dev/",
    "data/",
  );
  try {
    return {
      ok: true,
      json: async () => JSON.parse(fs.readFileSync(path, "utf8")),
    };
  } catch {
    return { ok: false, status: 404 };
  }
};
w.URL.createObjectURL = () => "blob:test";
w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () {
  if (!this.download)
    this.dispatchEvent(
      new w.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );
};
Object.defineProperty(w.navigator, "clipboard", {
  value: { writeText: async () => {} },
});
w.localStorage.setItem("mapleFavorites", "{broken json");
w.localStorage.setItem("mapleRecentClasses", '{"bad":"shape"}');
w.localStorage.setItem(
  "mapleLastSelection",
  JSON.stringify({ class: "hero", skill: "raging-blow-1120017" }),
);
const ctx = dom.getInternalVMContext();
vm.runInContext(fs.readFileSync("exporter.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("summons.js", "utf8"), ctx);
let source = fs.readFileSync("studio.js", "utf8");
source = source.slice(0, source.lastIndexOf("\ninit().catch("));
vm.runInContext(fs.readFileSync("atlas.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("home.js", "utf8"), ctx);
vm.runInContext(source, ctx);
const run = (s) => vm.runInContext(s, ctx);
const waitFor = async (fn) => {
  for (let i = 0; i < 150; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw Error("Timed out waiting for control state");
};
(async () => {
  await run("init()");
  assert.ok(d.body.classList.contains("home-view"));
  assert.equal(d.querySelectorAll("#homeClassGrid .atlas-card").length, 12);
  assert.equal(d.querySelectorAll("#discoveryGrid .discovery-card").length, 8);
  d.querySelector("#showAllClasses").click();
  assert.equal(d.querySelectorAll("#homeClassGrid .atlas-card").length, 59);
  d.querySelector('#homeFamilies [data-family="Nova"]').click();
  assert.ok(d.querySelectorAll("#homeClassGrid .atlas-card").length > 0);
  assert.ok(d.querySelectorAll("#homeClassGrid .atlas-card").length < 59);
  d.querySelector('#homeFamilies [data-family="all"]').click();
  d.querySelector("#homeSearch").value = "Adele";
  d.querySelector("#homeSearch").dispatchEvent(new w.Event("input"));
  await run("Home.search()");
  assert.equal(d.querySelectorAll("#homeClassGrid .atlas-card").length, 1);
  assert.ok(
    d.querySelector("#homeSearchResults").textContent.includes("Adele"),
  );
  d.querySelector("#homeClearSearch").click();
  await run("loadClass(catalog[0].slug)");
  assert.ok(!d.body.classList.contains("home-view"));
  assert.equal(d.querySelectorAll("#classes button").length, 59);
  assert.equal(
    d.querySelector("#className").textContent,
    require("../catalog.json")[0].name,
  );
  assert.equal(
    d.querySelectorAll("#skills button").length,
    require("../catalog.json")[0].count,
  );
  w.history.replaceState(
    null,
    "",
    "#class=hero&skill=raging-blow-1120017&layer=hit&frame=12",
  );
  await run("init()");
  assert.equal(d.querySelector("#className").textContent, "Hero");
  assert.equal(d.querySelector("#counter").textContent, "13 / 40");
  await run("loadClass('hero')");
  assert.equal(d.querySelectorAll("#skills button").length, 83);
  const jobHeaders = [...d.querySelectorAll("#skills .skill-job-heading")].map(h => h.textContent);
  assert.ok(jobHeaders.includes("1st Job") && jobHeaders.includes("2nd Job"));
  assert.equal(new Set(jobHeaders).size, jobHeaders.length);
  assert.equal(d.querySelector("#sheet"), null);
  assert.ok(paint.length);
  const strip = d.querySelector("#filmstrip");
  Object.defineProperty(strip, "clientWidth", { configurable: true, value: 200 });
  strip.getBoundingClientRect = () => ({ left: 100, right: 300, width: 200 });
  strip.querySelectorAll("button").forEach((button, i) => {
    button.getBoundingClientRect = () => ({ left: 100 + i * 84 - strip.scrollLeft, right: 176 + i * 84 - strip.scrollLeft });
  });
  await run("playing=true;showFrame(5)");
  assert.equal(strip.scrollLeft, 304);
  await run("showFrame(6)");
  assert.equal(strip.scrollLeft, 388);
  await run("showFrame(5)");
  assert.equal(strip.scrollLeft, 388, "Visible frames should not move the strip");
  await run("showFrame(0)");
  assert.equal(strip.scrollLeft, 0, "Following should reset when playback loops");
  await run("playing=false");
  Object.defineProperty(strip, "clientWidth", { configurable: true, value: 0 });
  console.log("PASS: filmstrip follows playback horizontally, keeps visible frames steady, and returns at loop start.");
  let historyWrites = 0;
  const originalReplace = w.history.replaceState.bind(w.history);
  w.history.replaceState = (...args) => {
    historyWrites++;
    return originalReplace(...args);
  };
  const before = historyWrites;
  await run("playing=true;showFrame(1)");
  assert.equal(historyWrites, before);
  await run("playing=false;showFrame(0)");
  d.querySelector('#filmstrip [data-frame="1"]').click();
  await waitFor(() => d.querySelector("#counter").textContent.startsWith("02"));
  for (const id of ["favorite", "focus", "fullscreen"]) assert.equal(d.getElementById(id), null);
  d.querySelector("#browseToggle").click();
  assert.ok(d.querySelector("#browseDialog").open);
  assert.equal(d.querySelector("#classBrowser").parentElement.id, "browsePanels");
  assert.equal(d.querySelector("#skillBrowser").parentElement.id, "browsePanels");
  assert.ok(d.documentElement.classList.contains("browse-modal-open"));
  d.querySelector('#classes [data-class="adele"]').click();
  await waitFor(() => d.querySelector("#className").textContent === "Adele");
  assert.equal(d.querySelector("#browseDialog").dataset.panel, "skills");
  d.querySelector("#browseClassesTab").click();
  assert.equal(d.querySelector("#browseDialog").dataset.panel, "classes");
  d.querySelector("#browseClose").click();
  assert.ok(!d.querySelector("#browseDialog").open);
  assert.ok(!d.documentElement.classList.contains("browse-modal-open"));
  assert.equal(d.querySelector(".workspace").firstElementChild.id, "classBrowser");
  assert.equal(d.querySelector("#classBrowser").nextElementSibling.id, "skillBrowser");
  await run("loadClass('hero')");
  d.querySelector("#browseToggle").click();
  d.querySelector("#browseDialog").dispatchEvent(new w.Event("cancel", { cancelable: true }));
  assert.ok(!d.querySelector("#browseDialog").open);
  assert.equal(d.querySelector("#skillBrowser").parentElement.className, "workspace");
  d.querySelector("#browseToggle").click();
  d.querySelector("#browseSkillsTab").click();
  assert.ok(d.body.classList.contains("browse-open"));
  d.querySelector('[data-slug="slash-blast-1001005"]').click();
  await waitFor(
    () => d.querySelector("#skillName").textContent === "Slash Blast",
  );
  assert.ok(!d.body.classList.contains("browse-open"));
  assert.ok(!d.querySelector("#browseDialog").open);
  assert.equal(d.querySelector("#skillBrowser").parentElement.className, "workspace");
  console.log("PASS: full-screen browser panel ownership, class-to-skill switch, Close/Escape, skill selection, scroll lock and desktop restoration.");
  await waitFor(() => !d.querySelector("#play").disabled);
  d.querySelector("#help").click();
  assert.ok(d.querySelector("#helpDialog").open);
  d.querySelector("#helpClose").click();
  assert.ok(!d.querySelector("#helpDialog").open);
  d.querySelector("#scope").value = "all";
  d.querySelector("#search").value = "Raging Blow";
  await run("renderSkills()");
  assert.ok(d.querySelector("#skills").textContent.includes("Hero"));
  assert.ok(d.querySelectorAll("#skills button").length > 0);
  d.querySelector("#homeNav").click();
  await waitFor(() =>
    d.querySelector("#personalContent").textContent.includes("Slash Blast"),
  );
  assert.ok(d.body.classList.contains("home-view"));
  assert.equal(w.location.hash, "");
  d.querySelector("#homeSearchType").value = "skills";
  d.querySelector("#homeSearch").value = "Raging Blow";
  await run("Home.search()");
  assert.ok(d.querySelector("#homeSearchResults").textContent.includes("Hero"));
  d.querySelector("#homeSearchResults a").click();
  await waitFor(
    () =>
      !d.body.classList.contains("home-view") &&
      d.querySelector("#skillName").textContent.includes("Raging Blow"),
  );
  w.localStorage.removeItem("mapleRecentSkills");
  w.localStorage.removeItem("mapleLastSelection");
  await run("favorites.clear();recentClasses=[];Home.show()");
  assert.ok(
    d
      .querySelector("#personalContent")
      .textContent.includes("Your next frame starts here"),
  );
  d.querySelector("#studioNav").click();
  await waitFor(
    () =>
      !d.body.classList.contains("home-view") &&
      d.querySelector("#className").textContent === "Adele",
  );
  await run("loadClass('hero', 'raging-blow-1120017')");
  await run("showFrame(0)");
  assert.equal(d.querySelector("#stage").nextElementSibling.id, "filmstrip");
  assert.equal(d.querySelector("#stage").children.length, 1);
  assert.equal(d.querySelector("#stage").firstElementChild.id, "canvas");
  for (const id of ["first", "prev", "next", "last", "frameJump", "frameInfo", "loop", "speed", "playMode", "rangeStart", "rangeEnd", "origin", "zoom", "pixel", "onion", "flip", "time", "duration", "stageLabel", "frameSize", "playState", "viewLabel"]) assert.equal(d.getElementById(id), null);
  assert.ok(!d.querySelector("#filmstrip").textContent.includes("ms"));
  d.querySelector("#background").value = "dark";
  d.querySelector("#background").dispatchEvent(new w.Event("change"));
  assert.equal(d.querySelector("#stage").style.backgroundColor, "rgb(0, 0, 0)");
  d.querySelector("#timeline").value = 2;
  d.querySelector("#timeline").dispatchEvent(new w.Event("input"));
  assert.equal(run("index"), 2);
  assert.equal(d.querySelector(".capture-panel"), null);
  assert.equal(d.querySelector("#play").nextElementSibling.id, "still");
  assert.equal(d.querySelector("#play").textContent, "");
  assert.equal(d.querySelector("#play").getAttribute("aria-label"), "Play animation");
  assert.ok(d.querySelector("#stage").onpointerdown == null);
  assert.equal(d.querySelector(".preview-settings"), null);
  w.ClipboardItem = class { constructor(data) { this.data = data; } };
  let copiedImage;
  w.navigator.clipboard.write = async items => { copiedImage = items[0]; };
  await d.querySelector("#still").onclick();
  assert.ok(d.querySelector("#stillDialog").open);
  assert.ok(!d.querySelector("#stillImage").hidden);
  assert.equal(d.querySelector("#stillImage").src, "blob:test");
  assert.ok(d.querySelector("#stillDownload").download.endsWith(".png"));
  for (const background of ["black", "white", "transparent"]) {
    const before = paint.length;
    d.querySelector("#stillBackground").value = background;
    await d.querySelector("#stillBackground").onchange();
    assert.equal(d.querySelector(".still-image").dataset.background, background);
    assert.ok(!d.querySelector("#stillImage").hidden);
    const fills = paint.slice(before).filter(item => item && item.fill);
    if (background !== "transparent") {
      assert.ok(d.querySelector("#stillDownload").download.endsWith(`-${background}.png`));
      assert.deepEqual(fills, [{ fill: background === "black" ? "#000000" : "#ffffff", composite: "destination-over" }]);
    } else assert.equal(fills.length, 0);
  }
  assert.equal(d.querySelector("#export"), null);
  assert.equal(d.querySelector("#link"), null);
  await d.querySelector("#stillCopy").onclick();
  assert.equal(copiedImage.data["image/png"].type, "image/png");
  w.navigator.clipboard.write = async () => { throw new Error("Denied"); };
  await d.querySelector("#stillCopy").onclick();
  assert.ok(d.querySelector("#stillStatus").textContent.includes("download"));
  d.querySelector("#stillClose").click();
  assert.ok(!d.querySelector("#stillDialog").open);
  await run("loadClass('hero', 'burning-soul-blade-400011001')");
  assert.ok(d.querySelector('[data-layer="summon"]'));
  assert.equal(run("layer"), "summon");
  assert.equal(run("frames.length"), 11);
  assert.ok(d.querySelector("#classStats").textContent.includes("2 summons"));
  d.querySelector('[data-action="stand"]').click();
  await waitFor(() => run("summonAction === 'stand' && framesReady"));
  assert.equal(run("frames.length"), 8);
  assert.ok(run("loopPlayback"));
  d.querySelector('[data-action="die"]').click();
  await waitFor(() => run("summonAction === 'die' && framesReady"));
  assert.ok(!run("loopPlayback"));
  await run("frames=frames.map(f=>({...f,delay:1}));play()");
  assert.equal(d.querySelector("#play").getAttribute("aria-label"), "Pause animation");
  await waitFor(() => run("!playing"));
  assert.equal(run("index"), 7);
  await d.querySelector("#still").onclick();
  assert.ok(d.querySelector("#stillContext").textContent.includes("Die"));
  assert.ok(d.querySelector("#stillDownload").download.includes("summon-die"));
  d.querySelector("#stillClose").click();
  w.location.hash = "class=hero&skill=burning-soul-blade-400011001&layer=summon&action=move&frame=3";
  await run("routeFromURL()");
  assert.equal(run("summonAction"), "move");
  assert.equal(run("index"), 3);
  assert.ok(w.location.hash.includes("action=move"));
  assert.equal(JSON.parse(w.localStorage.getItem("mapleRecentSkills"))[0].action, "move");
  d.querySelector("#kind").value = "summons";
  await run("renderSkills()");
  assert.equal(d.querySelectorAll("#skills .skill-card").length, 2);
  await run("loadClass('adele', 'hexa-reign-of-destruction-151141015')");
  await run("setLayer('summon')");
  assert.ok(d.querySelector("#summonStatus").textContent.includes("PARTIAL"));
  assert.ok(d.querySelector("#summonStatus").textContent.includes("bad-base64"));
  assert.ok(d.querySelector('[data-action="attack1"]').disabled);
  assert.ok(run("frames.every(f=>!f.placeholder)"));
  await run("loadClass('hero', 'burning-soul-blade-400011001')");
  const fixture = await run("Summons.get('hero', 400011001)");
  const originalGet = run("Summons.get");
  let releaseSummon;
  run("Summons").get = () => new Promise(resolve => { releaseSummon = resolve; });
  const pendingSummon = run("setLayer('summon')");
  await run("loadClass('hero', 'raging-blow-1120017')");
  releaseSummon(fixture);
  await pendingSummon;
  run("Summons").get = originalGet;
  assert.equal(d.querySelector("#skillName").textContent, "Raging Blow");
  assert.equal(run("frames.length"), 14);
  assert.ok(d.querySelector("#summonControls").hidden);
  await run("loadClass('hero', 'burning-soul-blade-400011001')");
  run("Summons").get = async () => { throw Error("Temporary failure"); };
  await run("setLayer('summon')");
  assert.ok(!d.querySelector("#summonRetry").hidden);
  assert.ok(d.querySelector("#stageMessage").textContent.includes("unavailable"));
  run("Summons").get = originalGet;
  d.querySelector("#summonRetry").click();
  await waitFor(() => run("framesReady"));
  assert.equal(run("frames.length"), 11);
  console.log("PASS: summon tabs/actions, class filter, partials, excluded placeholders, death play-once, PNG, deep links, and stale-load protection.");
  w.location.hash = "section=atlas";
  await run("routeFromURL()");
  assert.ok(d.body.classList.contains("atlas-view"));
  assert.equal(d.querySelectorAll(".atlas-section-card").length, 4);
  for (const section of ["characters", "monsters", "npcs", "map-art", "maps"]) {
    w.location.hash = "section=" + section;
    await run("routeFromURL()");
    assert.ok(d.querySelector("#atlasPage").textContent.includes("No source catalog"));
  }
  w.location.hash = "section=summons";
  await run("routeFromURL()");
  assert.equal(d.querySelectorAll(".atlas-class-grid a").length, 0);
  assert.ok(d.querySelector("#atlasPage h1").textContent.includes("Summons live with their skills"));
  w.location.hash = "section=summons&class=adele";
  await run("routeFromURL()");
  assert.ok(d.querySelector('#atlasPage a[href="#class=adele"]'));
  assert.ok(d.querySelector("#atlasPage").textContent.includes("Connected"));
  await run("showFrame(0)");
  assert.ok(w.location.hash.includes("section=summons"));
  d.querySelector("#studioNav").click();
  await waitFor(() => !d.body.classList.contains("atlas-view"));
  assert.ok(d.querySelector("#atlasPage").hidden);
  assert.equal(d.querySelector("#classSummons"), null);
  d.querySelector("#homeNav").click();
  await waitFor(() => d.body.classList.contains("home-view"));
  assert.ok(!d.body.classList.contains("atlas-view"));
  console.log("PASS: atlas collections, skill-owned summons, explicit import and blocked states, and return to Studio/home.");
  console.log("PASS: static PNG image preview, download name, image clipboard payload, and denied clipboard fallback.");
  console.log("PASS: simplified Studio hierarchy, removed controls and overlays, background selection, filmstrip selection, scrubber, and PNG capture.");
  console.log(
    "PASS: home hierarchy, atlas filtering, search, home/studio routing, workbench, real HTML controls, corrupted storage, class/skill lists, filmstrip selection, favorites, mobile browse collapse, help, global search.",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  dom.window.close();
  process.exitCode = 1;
});
