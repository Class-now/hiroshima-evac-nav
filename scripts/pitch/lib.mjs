// 応募資料づくり（scripts/pitch/*.mjs）の共通部品: 静的サーバー、Chromium の起動、
// オフライン時の通信遮断、3D タイルの読み込み待ち。scripts/smoke.mjs と同じ考え方。
//
// 共通のオプション:
//   --offline        PLATEAU・地理院タイル・CDN に出ない（建物と背景地図は出ない）。
//   --cesium <dir>   CDN の Cesium をローカルの <cesium パッケージ>/Build/Cesium で代用（CESIUM_DIR でも可）。
//   --url <base>     ローカル配信の代わりにこの URL を撮る（例: 公開版 https://class-now.github.io/hiroshima-evac-nav/）。
//   --only <substr>  名前にこの文字列を含む場面だけ。

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const OUT = path.join(ROOT, "docs", "pitch", "out");

export function parseArgs(extra = {}) {
  const argv = process.argv.slice(2);
  const opt = { offline: false, cesium: process.env.CESIUM_DIR || "", url: "", only: "", ...extra };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => (a.includes("=") ? a.slice(a.indexOf("=") + 1) : argv[++i] || "");
    if (a === "--offline") opt.offline = true;
    else if (a.startsWith("--cesium")) opt.cesium = val();
    else if (a.startsWith("--url")) opt.url = val();
    else if (a.startsWith("--only")) opt.only = val();
    else if (a.startsWith("--") && a.slice(2).split("=")[0] in extra) {
      const k = a.slice(2).split("=")[0];
      opt[k] = typeof extra[k] === "boolean" ? true : val();
    } else {
      console.error("unknown argument:", a);
      process.exit(2);
    }
  }
  if (opt.cesium) {
    opt.cesium = path.resolve(opt.cesium);
    if (!fs.existsSync(path.join(opt.cesium, "Cesium.js"))) {
      console.error(`--cesium: ${opt.cesium}/Cesium.js が見つからない（<cesium パッケージ>/Build/Cesium を指定）`);
      process.exit(2);
    }
  }
  return opt;
}

export function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try {
    return req("playwright");
  } catch (_) {}
  const roots = [];
  try {
    roots.push(execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
  } catch (_) {}
  roots.push("/opt/node22/lib/node_modules", "/usr/local/lib/node_modules", "/usr/lib/node_modules");
  for (const r of roots) {
    try {
      return createRequire(path.join(r, "noop.js"))("playwright");
    } catch (_) {}
  }
  throw new Error("playwright が見つからない（npm i -g playwright）");
}

const GPU_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--use-gl=angle", "--ignore-gpu-blocklist"];

function findChrome() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  try {
    for (const d of fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      for (const sub of ["chrome-linux/chrome", "chrome-linux64/chrome"]) {
        const p = path.join(base, d, sub);
        if (fs.existsSync(p)) return p;
      }
    }
  } catch (_) {}
  return null;
}

export async function launch(pw, { gpu = true } = {}) {
  const base = { headless: true, args: gpu ? GPU_ARGS : [] };
  try {
    return await pw.chromium.launch(base);
  } catch (e) {
    const exe = findChrome();
    if (!exe) throw e;
    return await pw.chromium.launch({ ...base, executablePath: exe });
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".geojson": "application/geo+json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".wasm": "application/wasm",
  ".woff": "font/woff", ".woff2": "font/woff2", ".glb": "model/gltf-binary", ".ktx2": "image/ktx2", ".xml": "application/xml",
};
export const mime = (p) => MIME[path.extname(p).toLowerCase()] || "application/octet-stream";

export function safeJoin(root, rel) {
  const p = path.normalize(path.join(root, decodeURIComponent(rel)));
  return p === root || p.startsWith(root + path.sep) ? p : null;
}

export function startServer(root = ROOT) {
  const server = http.createServer((req, res) => {
    let rel = new URL(req.url, "http://x").pathname;
    if (rel.endsWith("/")) rel += "index.html";
    const file = safeJoin(root, rel);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("not found");
    }
    res.writeHead(200, { "content-type": mime(file), "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

// 撮影用のブラウザコンテキスト。onboarded=false で初回の使い方を出す。
export async function newContext(browser, base, opt, { mobile = false, onboarded = true, geolocation = null, scale = 2, size = null, video = null } = {}) {
  const ctx = await browser.newContext({
    ...(mobile
      ? { viewport: size || { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: scale }
      : { viewport: size || { width: 1600, height: 900 }, deviceScaleFactor: scale }),
    ...(geolocation ? { geolocation, permissions: ["geolocation"] } : {}),
    ...(video ? { recordVideo: video } : {}),
    locale: "ja-JP",
  });
  await ctx.addInitScript((ob) => {
    try {
      if (ob) localStorage.setItem("evacnav.onboarded", "1");
      else localStorage.removeItem("evacnav.onboarded");
    } catch (_) {}
  }, onboarded);
  if (opt.cesium) {
    await ctx.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/cesium@[^/]+\/Build\/Cesium\/(.*)$/, async (route) => {
      const rel = new URL(route.request().url()).pathname.replace(/^\/npm\/cesium@[^/]+\/Build\/Cesium\//, "");
      const file = safeJoin(opt.cesium, rel);
      if (!file || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "not in local cesium" });
      return route.fulfill({ status: 200, contentType: mime(file), body: fs.readFileSync(file), headers: { "access-control-allow-origin": "*" } });
    });
  }
  if (opt.offline) {
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

export async function renderNow(page) {
  await page.evaluate(() => {
    try {
      window.__app?.viewer?.scene?.render();
    } catch (_) {}
  });
}

// アプリの起動（#loading が消える）を待つ。
export async function waitBoot(page, timeout = 90000) {
  await page.waitForFunction(() => window.__app?.viewer, null, { timeout });
  await page.waitForFunction(() => {
    const l = document.getElementById("loading");
    return !l || l.hidden;
  }, null, { timeout });
}

// 3D タイル（建物・浸水区域）と背景地図の読み込み完了を待つ。scene.render() を回し続ける。
export async function waitTiles(page, timeout = 90000) {
  const t0 = Date.now();
  let stable = 0;
  while (Date.now() - t0 < timeout) {
    const done = await page.evaluate(() => {
      const { viewer } = window.__app || {};
      if (!viewer) return false;
      viewer.scene.render();
      let ok = viewer.scene.globe.tilesLoaded;
      const prims = viewer.scene.primitives;
      for (let i = 0; i < prims.length; i++) {
        const p = prims.get(i);
        if (p && p.show !== false && "tilesLoaded" in p && !p.tilesLoaded) ok = false;
      }
      const l = document.getElementById("loading");
      return ok && (!l || l.hidden);
    });
    stable = done ? stable + 1 : 0;
    if (stable >= 3) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

// オフライン撮影の見た目: 背景地図が無いので地球を薄い灰色にし、「3D を読めない」通知を隠す。
// （データ・判定結果には手を入れない。）
export async function offlineCosmetics(page) {
  await page.evaluate(() => {
    const { viewer } = window.__app || {};
    if (!viewer) return;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#e6ebef");
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#dfe6ec");
    const t = document.getElementById("toast");
    if (t) t.hidden = true;
    viewer.scene.render();
  });
}

export async function settle(page, opt, ms = 600) {
  if (!opt.offline) await waitTiles(page, 60000);
  else await offlineCosmetics(page);
  await page.waitForTimeout(ms);
  await renderNow(page);
}

export function baseUrl(opt, server) {
  if (opt.url) return opt.url.endsWith("/") ? opt.url : opt.url + "/";
  return `http://127.0.0.1:${server.address().port}/`;
}
