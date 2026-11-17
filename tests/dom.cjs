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
    fillRect() {},
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
w.HTMLAnchorElement.prototype.click = function () {};
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
  assert.equal(d.querySelector("#sheet").disabled, false);
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
  d.querySelector("#sheet").click();
  await waitFor(() => !d.querySelector("#downloadExport").disabled);
  assert.ok(d.querySelector("#exportDialog").open);
  assert.equal(d.querySelector("#exportMode").value, "sprite");
  assert.ok(
    d.querySelector("#exportSummary").textContent.includes("14 frames"),
  );
  d.querySelector("#exportCancel").click();
  assert.equal(d.querySelector("#exportDialog").open, false);
  d.querySelector("#export").click();
  await waitFor(() => !d.querySelector("#downloadExport").disabled);
  assert.ok(d.querySelector("#exportSummary").textContent.includes("120 × 90"));
  d.querySelector("#exportMode").value = "contact";
  d.querySelector("#exportMode").dispatchEvent(new w.Event("change"));
  await waitFor(() =>
    d.querySelector("#exportSummary").textContent.includes("Labeled"),
  );
  d.querySelector("#exportCancel").click();
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
  console.log(
    "PASS: real HTML controls, corrupted storage, class/skill lists, stepping, favorites, both export dialogs, range controls, mobile browse collapse, help, global search.",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  dom.window.close();
  process.exitCode = 1;
});
