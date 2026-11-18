const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const nodes = new Map(),
  draws = [];
function node(id) {
  if (nodes.has(id)) return nodes.get(id);
  const n = {
    value:
      {
        "#job": "All jobs",
        "#kind": "all",
        "#zoom": "fit",
        "#speed": "1",
        "#scope": "class",
        "#sort": "job",
        "#family": "all",
      }[id] || "",
    checked: ["#loop", "#pixel"].includes(id),
    textContent: "",
    innerHTML: "",
    style: {},
    classList: { toggle() {}, remove() {} },
    focus() {},
    querySelectorAll() {
      return [];
    },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    getBoundingClientRect() {
      return { width: 960, height: 430 };
    },
    getContext() {
      return {
        clearRect() {},
        save() {},
        restore() {},
        translate() {},
        scale() {},
        drawImage(im) {
          draws.push(im.src);
        },
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
      };
    },
  };
  nodes.set(id, n);
  return n;
}
const location = { href: "http://localhost/", hash: "" };
const context = {
  console,
  URL,
  URLSearchParams,
  Map,
  Set,
  Promise,
  Math,
  JSON,
  Number,
  String,
  Array,
  Object,
  Error,
  Infinity,
  setTimeout,
  clearTimeout,
  window: { devicePixelRatio: 1, addEventListener() {} },
  location,
  history: {
    replaceState(a, b, u) {
      location.href = String(u);
      location.hash = new URL(u).hash;
    },
  },
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {},
  },
  document: {
    querySelector: node,
    addEventListener() {},
    body: {
      classList: {
        remove() {},
        contains() {
          return false;
        },
        toggle() {
          return false;
        },
      },
    },
  },
  navigator: { clipboard: { writeText: async () => {} } },
  IntersectionObserver: class {
    observe() {}
  },
  ResizeObserver: class {
    constructor(cb) {
      this.cb = cb;
    }
    observe() {
      this.cb();
    }
  },
  Image: class {
    set src(v) {
      this._src = v;
      this.width = this.naturalWidth = 300;
      this.height = this.naturalHeight = 200;
      queueMicrotask(() => this.onload());
    }
    get src() {
      return this._src;
    }
  },
  fetch: async (url) => {
    const p = String(url).replace(
      "https://pub-5005fc41413846b383b14fe2d3cb7abc.r2.dev/",
      "data/",
    );
    try {
      return {
        ok: true,
        json: async () => JSON.parse(fs.readFileSync(p, "utf8")),
      };
    } catch {
      return { ok: false, status: 404 };
    }
  },
};
context.Atlas = { hide() {}, show() {} };
context.Home = {
  init: async () => {},
  show: async () => {},
  hide() {},
  isVisible: () => false,
};
vm.createContext(context);
let source = fs.readFileSync("studio.js", "utf8");
const boot = source.lastIndexOf("\ninit().catch(");
if (boot >= 0) source = source.slice(0, boot);
vm.runInContext(fs.readFileSync("exporter.js", "utf8"), context);
vm.runInContext(fs.readFileSync("summons.js", "utf8"), context);
vm.runInContext(source, context);
(async () => {
  await vm.runInContext("init()", context);
  await vm.runInContext("loadClass(catalog[0].slug)", context);
  assert.equal(node("#classCount").textContent, 59);
  assert.equal(
    node("#className").textContent,
    require("../catalog.json")[0].name,
  );
  await vm.runInContext("loadClass('hero')", context);
  assert.equal(node("#skillName").textContent, "Raging Blow");
  assert.ok(draws.length);
  await vm.runInContext("setLayer('hit')", context);
  assert.equal(node("#counter").textContent, "01 / 40");
  await vm.runInContext("showFrame(12)", context);
  assert.equal(node("#counter").textContent, "13 / 40");
  assert.ok(location.hash.includes("frame=12"));
  await vm.runInContext("loadClass('adele')", context);
  assert.equal(node("#className").textContent, "Adele");
  assert.ok(node("#classStats").textContent.includes("skills"));
  await vm.runInContext(
    "selectSkill(skills.find(s=>!layers(s).length))",
    context,
  );
  assert.ok(node("#stageMessage").textContent.includes("No animation"));
  await vm.runInContext("loadClass('not-a-class')", context);
  assert.equal(node("#skillName").textContent, "Class unavailable");
  assert.equal(node("#play").disabled, true);
  await vm.runInContext("loadClass('hero')", context);
  await vm.runInContext(
    "Promise.all([loadClass('adele'),loadClass('ren')])",
    context,
  );
  assert.equal(node("#className").textContent, "Ren");
  assert.ok(node("#skillName").textContent !== "Loading…");
  await vm.runInContext("loadClass('hero')", context);
  await vm.runInContext("setRange(2,7)", context);
  assert.equal(node("#rangeStart").value, 3);
  assert.equal(node("#rangeEnd").value, 8);
  assert.ok(node("#rangeSummary").textContent.includes("6 frames"));
  assert.equal(
    vm.runInContext("nextInRange(7,1,'forward',2,7,false).stop", context),
    true,
  );
  assert.equal(
    vm.runInContext("nextInRange(2,-1,'reverse',2,7,true).next", context),
    7,
  );
  assert.equal(
    vm.runInContext("nextInRange(7,1,'pingpong',2,7,true).next", context),
    6,
  );
  assert.equal(
    vm.runInContext("nextInRange(2,-1,'pingpong',2,7,false).stop", context),
    true,
  );
  await vm.runInContext("setRange(-50,9000)", context);
  assert.equal(node("#rangeStart").value, 1);
  node("#scope").value = "all";
  node("#search").value = "Raging Blow";
  await vm.runInContext("renderSkills()", context);
  assert.ok(Number(node("#resultCount").textContent) > 0);
  assert.ok(node("#skills").innerHTML.includes("Hero"));
  const allCount = await vm.runInContext(
    "getGlobalLibrary().then(rows=>rows.length)",
    context,
  );
  assert.equal(allCount, 6197);
  node("#search").value = "a";
  await vm.runInContext("renderSkills()", context);
  assert.ok(node("#skills").innerHTML.includes("at least 2 characters"));
  node("#scope").value = "class";
  assert.equal(vm.runInContext("readJSON('not-json',[]).length", context), 0);
  await vm.runInContext("showFrame(NaN)", context);
  assert.ok(!String(node("#counter").textContent).includes("NaN"));
  assert.ok(draws.every((x) => !x.includes("/data/")));
  console.log(
    "PASS: catalog, layer switching, frame deep links, class navigation, icon-only entries, missing classes, race handling, asset paths.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
