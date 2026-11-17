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
  assert.equal(d.querySelector("#sheet"), null);
  assert.ok(paint.length);
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
  d.querySelector("#next").click();
  await waitFor(() => d.querySelector("#counter").textContent.startsWith("02"));
  d.querySelector("#favorite").click();
  assert.equal(
    d.querySelector("#favorite").getAttribute("aria-pressed"),
    "true",
  );
  d.querySelector("#browseToggle").click();
  assert.ok(d.body.classList.contains("browse-open"));
  d.querySelector('[data-slug="slash-blast-1001005"]').click();
  await waitFor(
    () => d.querySelector("#skillName").textContent === "Slash Blast",
  );
  assert.ok(!d.body.classList.contains("browse-open"));
  await waitFor(() => !d.querySelector("#play").disabled);
  d.querySelector("#markOut").click();
  assert.ok(d.querySelector("#rangeSummary").textContent.includes("1 frame"));
  d.querySelector("#fullRange").click();
  assert.ok(d.querySelector("#rangeSummary").textContent.includes("11 frames"));
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
      .textContent.includes("Make a little room for inspiration"),
  );
  d.querySelector("#studioNav").click();
  await waitFor(
    () =>
      !d.body.classList.contains("home-view") &&
      d.querySelector("#className").textContent === "Adele",
  );
  await run("loadClass('hero', 'raging-blow-1120017')");
  await run("showFrame(0)");
  assert.ok(d.querySelector("#first").disabled);
  assert.ok(d.querySelector("#prev").disabled);
  d.querySelector("#last").click();
  await waitFor(() => run("index === frames.length - 1"));
  assert.ok(d.querySelector("#last").disabled);
  assert.ok(d.querySelector("#next").disabled);
  d.querySelector("#first").click();
  await run("setRange(1, 3)");
  assert.ok(d.querySelector("#filmstrip button").classList.contains("outside-range"));
  assert.equal(d.querySelectorAll("#filmstrip .range-edge").length, 2);
  assert.ok(d.querySelector("#captureContext").textContent.includes("Original resolution"));
  assert.ok(d.querySelector("#stage").onpointerdown == null);
  assert.ok(!d.querySelector(".preview-settings").open);
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
  w.location.hash = "section=atlas";
  await run("routeFromURL()");
  assert.ok(d.body.classList.contains("atlas-view"));
  assert.equal(d.querySelectorAll(".atlas-section-card").length, 6);
  for (const section of ["characters", "mobs", "npcs", "maps"]) {
    w.location.hash = "section=" + section;
    await run("routeFromURL()");
    assert.ok(d.querySelector("#atlasPage").textContent.includes("Planned collection"));
  }
  w.location.hash = "section=summons";
  await run("routeFromURL()");
  assert.equal(d.querySelectorAll(".atlas-class-grid a").length, 59);
  w.location.hash = "section=summons&class=adele";
  await run("routeFromURL()");
  assert.ok(d.querySelector("#atlasPage h1").textContent.includes("Adele"));
  assert.ok(d.querySelector("#atlasPage").textContent.includes("Awaiting frame import"));
  await run("showFrame(0)");
  assert.ok(w.location.hash.includes("section=summons"));
  d.querySelector("#studioNav").click();
  await waitFor(() => !d.body.classList.contains("atlas-view"));
  assert.ok(d.querySelector("#atlasPage").hidden);
  assert.ok(d.querySelector("#classSummons").href.includes("class=adele"));
  d.querySelector("#homeNav").click();
  await waitFor(() => d.body.classList.contains("home-view"));
  assert.ok(!d.body.classList.contains("atlas-view"));
  console.log("PASS: atlas collections, all class summon routes, explicit import states, and return to Studio/home.");
  console.log("PASS: static PNG image preview, download name, image clipboard payload, and denied clipboard fallback.");
  console.log("PASS: Studio boundary controls, range feedback, capture scope, removed panning, and simplified capture controls.");
  console.log(
    "PASS: home hierarchy, atlas filtering, search, home/studio routing, workbench, real HTML controls, corrupted storage, class/skill lists, stepping, favorites, range controls, mobile browse collapse, help, global search.",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  dom.window.close();
  process.exitCode = 1;
});
