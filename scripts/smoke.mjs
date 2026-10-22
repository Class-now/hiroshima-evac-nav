#!/usr/bin/env node
// Headless smoke test for the static site (Playwright + Chromium, no build, no npm deps).
//
// Usage:
//   node scripts/smoke.mjs [--offline] [--cesium <dir>] [--only <substr>] [--headed]
//   npm run smoke -- --offline --cesium /path/to/cesium/package/Build/Cesium
//
//   --offline        Abort every request that leaves the local server (PLATEAU 3D Tiles,
//                    GSI map tiles, CDN ...) so the page never hangs on a blocked network.
//                    3D buildings will not appear; the UI must still work.
//   --cesium <dir>   Serve https://cdn.jsdelivr.net/npm/cesium@x/Build/Cesium/** from a local
//                    unpacked `cesium` npm package's Build/Cesium directory (also: CESIUM_DIR env).
//                    Without it, Cesium is fetched from the CDN as-is.
//   --only <substr>  Run only scenarios whose name contains <substr> (e.g. lang, spot, mobile).
//   --headed         Show the browser window.
//
// Playwright is resolved from a local `playwright` package, else from the global npm root
// (`npm root -g`). Browsers come from PLAYWRIGHT_BROWSERS_PATH. Headless WebGL uses SwiftShader.
// Screenshots go to test-results/smoke/<scenario>.png. Exit code 1 if any hard check fails.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "test-results", "smoke");

// ---- args ------------------------------------------------------------------

const argv = process.argv.slice(2);
const opt = { offline: false, cesium: process.env.CESIUM_DIR || "", only: "", headed: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--offline") opt.offline = true;
  else if (a === "--headed") opt.headed = true;
  else if (a === "--cesium") opt.cesium = argv[++i] || "";
  else if (a.startsWith("--cesium=")) opt.cesium = a.slice(9);
  else if (a === "--only") opt.only = argv[++i] || "";
  else if (a.startsWith("--only=")) opt.only = a.slice(7);
  else if (a === "-h" || a === "--help") {
    console.log("node scripts/smoke.mjs [--offline] [--cesium <Build/Cesium dir>] [--only <name>] [--headed]");
    process.exit(0);
  } else {
    console.error("unknown argument:", a);
    process.exit(2);
  }
}
if (opt.cesium) {
  opt.cesium = path.resolve(opt.cesium);
  if (!fs.existsSync(path.join(opt.cesium, "Cesium.js"))) {
    console.error(`--cesium: ${opt.cesium}/Cesium.js not found (point it at <cesium package>/Build/Cesium)`);
    process.exit(2);
  }
}

// ---- playwright --------------------------------------------------------------

function loadPlaywright() {
  const tries = [];
  const req = createRequire(import.meta.url);
  try {
    return req("playwright");
  } catch (e) {
    tries.push("local: " + e.code);
  }
  const roots = [];
  try {
    roots.push(execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
  } catch (_) {}
  roots.push("/opt/node22/lib/node_modules", "/usr/local/lib/node_modules", "/usr/lib/node_modules");
  for (const r of roots) {
    try {
      return createRequire(path.join(r, "noop.js"))("playwright");
    } catch (e) {
      tries.push(`${r}: ${e.code}`);
    }
  }
  throw new Error("playwright not found (" + tries.join("; ") + ")");
}

const GPU_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--use-gl=angle", "--ignore-gpu-blocklist"];

function findChrome() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  try {
    const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
    for (const d of dirs) {
      for (const sub of ["chrome-linux/chrome", "chrome-linux64/chrome"]) {
        const p = path.join(base, d, sub);
        if (fs.existsSync(p)) return p;
      }
    }
  } catch (_) {}
  return null;
}

async function launch(pw) {
  const base = { headless: !opt.headed, args: GPU_ARGS };
  try {
    return await pw.chromium.launch(base);
  } catch (e) {
    const exe = findChrome();
    if (!exe) throw e;
    console.warn("default launch failed, retrying with", exe, "-", String(e.message).split("\n")[0]);
    return await pw.chromium.launch({ ...base, executablePath: exe });
  }
}

// ---- static server -----------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".geojson": "application/geo+json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".gif": "image/gif",
  ".webp": "image/webp", ".ico": "image/x-icon", ".wasm": "application/wasm", ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".ktx2": "image/ktx2",
  ".xml": "application/xml", ".woff": "font/woff", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json",
};
const mime = (p) => MIME[path.extname(p).toLowerCase()] || "application/octet-stream";

function safeJoin(root, rel) {
  const p = path.normalize(path.join(root, decodeURIComponent(rel)));
  return p === root || p.startsWith(root + path.sep) ? p : null;
}

function startServer() {
  const server = http.createServer((req, res) => {
    let rel = new URL(req.url, "http://x").pathname;
    if (rel.endsWith("/")) rel += "index.html";
    const file = safeJoin(ROOT, rel);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("not found");
    }
    res.writeHead(200, { "content-type": mime(file), "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// ---- checks ------------------------------------------------------------------

const results = []; // { scenario, ok, notes: [] }
const BLOCKED_HOST_RE = /assets\.cms\.plateau\.reearth\.io|cyberjapandata\.gsi\.go\.jp|cdn\.jsdelivr\.net|api\.cesium\.com|assets\.ion\.cesium\.com/;

class Run {
  constructor(name) {
    this.name = name;
    this.ok = true;
    this.notes = [];
    this.consoleErrors = [];
    this.pageErrors = [];
    this.failed = {}; // host -> count
    this.aborted = {}; // host -> count
  }
  check(cond, msg, { hard = true } = {}) {
    if (cond) return true;
    if (hard) this.ok = false;
    this.notes.push((hard ? "FAIL " : "warn ") + msg);
    return false;
  }
  note(msg) {
    this.notes.push(msg);
  }
}

function bump(obj, url) {
  let host = "?";
  try {
    host = new URL(url).host;
  } catch (_) {}
  obj[host] = (obj[host] || 0) + 1;
}

async function newContext(browser, base, { mobile = false, onboarded = true } = {}) {
  const ctx = await browser.newContext(
    mobile
      ? { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
      : { viewport: { width: 1280, height: 800 } }
  );
  if (onboarded) {
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("evacnav.onboarded", "1");
      } catch (_) {}
    });
  }
  // Local Cesium copy for the CDN URLs.
  if (opt.cesium) {
    await ctx.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/cesium@[^/]+\/Build\/Cesium\/(.*)$/, async (route) => {
      const u = new URL(route.request().url());
      const rel = u.pathname.replace(/^\/npm\/cesium@[^/]+\/Build\/Cesium\//, "");
      const file = safeJoin(opt.cesium, rel);
      if (!file || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "not in local cesium" });
      return route.fulfill({ status: 200, contentType: mime(file), body: fs.readFileSync(file), headers: { "access-control-allow-origin": "*" } });
    });
  }
  if (opt.offline) {
    // Everything except the local server (and the routed Cesium copy above) is aborted.
    const origin = new URL(base).host;
    await ctx.route(
      (url) => {
        if (url.protocol === "data:" || url.protocol === "blob:") return false;
        if (url.host === origin) return false;
        if (opt.cesium && url.host === "cdn.jsdelivr.net" && url.pathname.startsWith("/npm/cesium@")) return false;
        return true;
      },
      (route) => route.abort("blockedbyclient")
    );
  }
  return ctx;
}

function attach(page, run) {
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    const loc = m.location()?.url || "";
    if (opt.offline && (BLOCKED_HOST_RE.test(text) || BLOCKED_HOST_RE.test(loc) || /ERR_BLOCKED_BY_CLIENT|Failed to load resource|ERR_FAILED/.test(text))) return;
    run.consoleErrors.push(text.slice(0, 300));
  });
  page.on("pageerror", (e) => run.pageErrors.push(String(e.message || e).slice(0, 300)));
  page.on("requestfailed", (r) => {
    const f = r.failure()?.errorText || "";
    if (/BLOCKED_BY_CLIENT/.test(f)) bump(run.aborted, r.url());
    else bump(run.failed, r.url());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) bump(run.failed, r.url());
  });
}

async function renderNow(page) {
  await page.evaluate(() => {
    try {
      window.__app?.viewer?.scene?.render();
    } catch (_) {}
  });
}

async function shot(page, run) {
  await renderNow(page);
  await page.waitForTimeout(150);
  await renderNow(page);
  const file = path.join(OUT, `${run.name}.png`);
  await page.screenshot({ path: file });
  run.shot = path.relative(ROOT, file);
}

async function waitLoaded(page, run, timeout = 30000) {
  try {
    await page.waitForFunction(() => {
      const l = document.getElementById("loading");
      return !l || l.hidden || getComputedStyle(l).display === "none";
    }, null, { timeout });
    return true;
  } catch (_) {
    const txt = await page.evaluate(() => document.getElementById("loading")?.textContent || "");
    run.check(false, `#loading still visible after ${timeout / 1000}s ("${txt.slice(0, 80)}")`);
    return false;
  }
}

async function webglStatus(page) {
  return page.evaluate(() => {
    const c = document.createElement("canvas");
    const gl2 = c.getContext("webgl2");
    const gl = gl2 || document.createElement("canvas").getContext("webgl");
    let renderer = "";
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    }
    return { webgl2: !!gl2, webgl: !!gl, renderer, viewer: !!window.__app?.viewer };
  });
}

async function scenario(browser, base, name, fn, ctxOpts) {
  if (opt.only && !name.includes(opt.only)) return;
  const run = new Run(name);
  const ctx = await newContext(browser, base, ctxOpts);
  const page = await ctx.newPage();
  attach(page, run);
  const t0 = Date.now();
  try {
    await fn(page, run);
  } catch (e) {
    run.check(false, "exception: " + String(e.message || e).split("\n")[0]);
    try {
      await shot(page, run);
    } catch (_) {}
  }
  run.check(run.pageErrors.length === 0, `page errors: ${run.pageErrors.join(" | ")}`);
  run.check(run.consoleErrors.length === 0, `console errors (${run.consoleErrors.length}): ${run.consoleErrors.slice(0, 3).join(" | ")}`, { hard: false });
  const fmt = (o) => Object.entries(o).map(([h, n]) => `${h}×${n}`).join(", ");
  if (Object.keys(run.aborted).length) run.note(`aborted (offline): ${fmt(run.aborted)}`);
  if (Object.keys(run.failed).length) run.note(`failed requests: ${fmt(run.failed)}`);
  run.note(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
  results.push(run);
  console.log(`${run.ok ? "ok  " : "FAIL"} ${name}`);
  await ctx.close();
}

// ---- scenarios ---------------------------------------------------------------

let webgl = null;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const pw = loadPlaywright();
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await launch(pw);
  console.log(`serving ${ROOT} at ${base}`);
  console.log(`mode: ${opt.offline ? "offline" : "network"}, cesium: ${opt.cesium || "CDN"}, chromium ${browser.version()}`);

  const titles = {};
  for (const lang of ["ja-easy", "en", "zh", "ko"]) {
    await scenario(browser, base, `lang-${lang}`, async (page, run) => {
      await page.goto(`${base}?lang=${lang}`, { waitUntil: "domcontentloaded" });
      if (!webgl) {
        webgl = await webglStatus(page);
        console.log(`WebGL: webgl2=${webgl.webgl2} webgl=${webgl.webgl} renderer="${webgl.renderer}"`);
      }
      const w = await webglStatus(page);
      run.check(w.webgl2 || w.webgl, "no WebGL context in page");
      await waitLoaded(page, run);
      run.check(await page.evaluate(() => !!window.__app?.viewer), "window.__app.viewer missing (Cesium viewer not created)");
      const expect = { "ja-easy": "ja", en: "en", zh: "zh-Hans", ko: "ko" }[lang];
      const htmlLang = await page.evaluate(() => document.documentElement.lang);
      run.check(htmlLang === expect, `html lang = "${htmlLang}", expected "${expect}"`);
      const h1 = ((await page.textContent("#topbar h1")) || "").trim();
      run.check(h1.length > 0, "#topbar h1 is empty");
      titles[lang] = h1;
      const dup = Object.entries(titles).find(([l, tx]) => l !== lang && tx === h1);
      run.check(!dup, `h1 "${h1}" same as for ${dup?.[0]}`);
      run.note(`h1="${h1}"`);
      await shot(page, run);
    });
  }

  for (const spot of ["station", "peace", "hondori", "castle"]) {
    await scenario(browser, base, `spot-${spot}`, async (page, run) => {
      await page.goto(`${base}?lang=en&spot=${spot}`, { waitUntil: "domcontentloaded" });
      await waitLoaded(page, run);
      const shown = await page
        .waitForFunction(() => {
          const r = document.getElementById("result");
          return r && !r.hidden && r.offsetParent !== null && r.innerHTML.trim().length > 0;
        }, null, { timeout: 40000 })
        .then(() => true, () => false);
      run.check(shown, "#result not shown within 40s");
      if (shown) {
        await page.waitForTimeout(300);
        const info = await page.evaluate(() => {
          const r = document.getElementById("result");
          return {
            heading: r.querySelector("h2,h3")?.textContent?.trim() || "",
            li: r.querySelectorAll("ol li").length,
            shelters: window.__app?.state?.shelters?.length || 0,
            building: !!window.__app?.state?.selection?.building,
          };
        });
        run.check(info.heading.length > 0, "#result has no heading");
        if (info.shelters > 0) run.check(info.li >= 1, `shelters loaded (${info.shelters}) but no <li> in #result ol`);
        else run.check(false, "shelters data not loaded", { hard: false });
        run.note(`h2="${info.heading}", shelters li=${info.li}, building picked=${info.building}`);
        if (opt.offline && !info.building) run.note("no building (offline, expected)");
      }
      await shot(page, run);
    });
  }

  await scenario(
    browser,
    base,
    "mobile-peace",
    async (page, run) => {
      await page.goto(`${base}?lang=en&spot=peace`, { waitUntil: "domcontentloaded" });
      await waitLoaded(page, run);
      await page
        .waitForFunction(() => !document.getElementById("result")?.hidden, null, { timeout: 40000 })
        .catch(() => run.check(false, "#result not shown within 40s", { hard: false }));
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const box = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
        };
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
        };
        // Buttons and selects are hard checks; other tap targets (e.g. <summary>) only warn.
        const small = [];
        const smallSoft = [];
        const els = document.querySelectorAll("#topbar button, #topbar select, #controls button, #controls select, #controls summary");
        for (const el of els) {
          if (!visible(el)) continue;
          const h = el.getBoundingClientRect().height;
          if (h >= 32) continue;
          const label = `${el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.dataset.hz ? `[${el.dataset.hz}]` : "")}=${h.toFixed(0)}px`;
          (el.matches("button, select") ? small : smallSoft).push(label);
        }
        return {
          scrollWidth: document.documentElement.scrollWidth,
          controls: box("#controls"),
          sheet: box("#sheet"),
          topbar: box("#topbar"),
          small,
          smallSoft,
          checked: els.length,
        };
      });
      run.check(m.scrollWidth <= 375, `horizontal overflow: scrollWidth=${m.scrollWidth}`);
      const overlap = (a, b) => a && b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;
      run.check(m.controls && m.sheet, "#controls or #sheet missing");
      if (m.controls && m.sheet) {
        run.check(!overlap(m.controls, m.sheet), `#controls (y ${m.controls.y.toFixed(0)}–${m.controls.b.toFixed(0)}) overlaps #sheet (y ${m.sheet.y.toFixed(0)}–${m.sheet.b.toFixed(0)})`);
        if (m.topbar) run.check(!overlap(m.controls, m.topbar), `#controls overlaps #topbar`, { hard: false });
      }
      run.check(m.small.length === 0, `buttons shorter than 32px: ${m.small.join(", ")}`);
      run.check(m.smallSoft.length === 0, `tap targets shorter than 32px: ${m.smallSoft.join(", ")}`, { hard: false });
      run.note(`checked ${m.checked} controls; scrollWidth=${m.scrollWidth}`);
      await shot(page, run);
    },
    { mobile: true }
  );

  await scenario(
    browser,
    base,
    "onboarding",
    async (page, run) => {
      await page.goto(`${base}?lang=en`, { waitUntil: "domcontentloaded" });
      await waitLoaded(page, run);
      await page.waitForTimeout(500);
      const ob = await page.evaluate(() => {
        const d = document.getElementById("onboarding");
        if (!d) return null;
        return { open: !!d.open, text: (d.textContent || "").trim().slice(0, 80) };
      });
      if (!ob) {
        run.note("skipped: #onboarding not in page yet");
      } else {
        run.check(ob.open, "#onboarding exists but is not open on first visit");
        run.note(`#onboarding open=${ob.open} "${ob.text}"`);
      }
      await shot(page, run);
    },
    { onboarded: false }
  );

  await browser.close();
  server.close();

  // ---- summary ----
  console.log("");
  if (webgl) console.log(`WebGL: webgl2=${webgl.webgl2}, webgl=${webgl.webgl}, renderer="${webgl.renderer}"`);
  const w = Math.max(10, ...results.map((r) => r.name.length));
  console.log(`${"scenario".padEnd(w)}  result  notes`);
  console.log(`${"-".repeat(w)}  ------  -----`);
  for (const r of results) {
    const notes = [...r.notes, r.shot ? `shot: ${r.shot}` : ""].filter(Boolean);
    console.log(`${r.name.padEnd(w)}  ${r.ok ? "ok    " : "FAIL  "}  ${notes[0] || ""}`);
    for (const n of notes.slice(1)) console.log(`${" ".repeat(w)}          ${n}`);
  }
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - bad}/${results.length} scenarios ok`);
  process.exitCode = bad ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
