#!/usr/bin/env node
// 応募資料用のスクリーンショットを撮る（docs/pitch/out/screens/*.png と manifest.json）。
//
//   node scripts/pitch/capture.mjs                       # 普通のネット環境（3D 建物・背景地図あり）
//   node scripts/pitch/capture.mjs --url https://class-now.github.io/hiroshima-evac-nav/
//   node scripts/pitch/capture.mjs --offline --cesium <cesium>/Build/Cesium   # 外に出られない環境
//
// PC は 1600×900（2 倍で 3200×1800）、スマホは 375×812（3 倍）。

import fs from "node:fs";
import path from "node:path";
import { ROOT, OUT, parseArgs, loadPlaywright, launch, startServer, newContext, waitBoot, settle, baseUrl, renderNow } from "./lib.mjs";

const opt = parseArgs();
const DIR = path.join(OUT, "screens");

// 河川水位の場面で使う観測所（中区の近く、data/river.json にあるもの）。
const RIVER_GAUGE = "三篠橋(国)";

async function openSpot(page, base, { spot = "peace", lang = "ja-easy", extra = "" } = {}) {
  await page.goto(`${base}?lang=${lang}&spot=${spot}${extra}`, { waitUntil: "domcontentloaded" });
  await waitBoot(page);
  await page.waitForSelector("#result:not([hidden]) ol.shelters li", { timeout: 90000 });
}

async function setColorMode(page, mode) {
  await page.evaluate(() => (document.getElementById("layer-panel").open = true));
  await page.check(`#layer-list input[name=cmode][value=${mode}]`);
}

async function setHazard(page, hz) {
  await page.click(`#hazard-group button[data-hz=${hz}]`);
  await page.waitForTimeout(1500);
}

async function clickRiverGauge(page, name) {
  const pos = await page.evaluate((name) => {
    const { viewer, state } = window.__app;
    const f = state.river.features.find((x) => x.properties.name === name) || state.river.features[0];
    const [lon, lat] = f.geometry.coordinates;
    const narrow = window.matchMedia("(max-width: 640px)").matches;
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(lon - 0.001, lat - (narrow ? 0.006 : 0.008), narrow ? 900 : 800),
      orientation: { heading: Cesium.Math.toRadians(8), pitch: Cesium.Math.toRadians(-45), roll: 0 },
    });
    viewer.scene.render();
    const w = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, Cesium.Cartesian3.fromDegrees(lon, lat, 4));
    const r = viewer.scene.canvas.getBoundingClientRect();
    return { x: r.left + w.x, y: r.top + w.y };
  }, name);
  await renderNow(page);
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(600);
}

// [名前, 説明, コンテキストの設定, 操作]
const SCENES = [
  ["overview", "中区を引きで（浸水深の色）", {}, async (page, base) => {
    await page.goto(`${base}?lang=ja-easy`, { waitUntil: "domcontentloaded" });
    await waitBoot(page);
  }],
  ["peace-depth-ja", "平和記念公園付近・浸水深の色・建物の結果（やさしい日本語）", {}, (p, b) => openSpot(p, b)],
  ["peace-refuge-ja", "上の階へ逃げられる建物（緑・赤）", {}, async (p, b) => {
    await openSpot(p, b);
    await setColorMode(p, "refuge");
  }],
  ...["en", "zh", "ko"].map((lang) => [`peace-depth-${lang}`, `同じ地点の結果（${lang}）`, {}, (p, b) => openSpot(p, b, { lang })]),
  ...["station", "hondori", "castle"].map((spot) => [`spot-${spot}-ja`, `?spot=${spot}`, {}, (p, b) => openSpot(p, b, { spot })]),
  ...["surge", "tsunami", "landslide"].map((hz) => [`hazard-${hz}-ja`, `災害の切り替え: ${hz}`, {}, async (p, b) => {
    await openSpot(p, b);
    await setHazard(p, hz);
  }]),
  ["landslide-castle-en", "土砂災害警戒区域（DoboX）・広島城付近から北側", {}, async (p, b) => {
    await openSpot(p, b, { spot: "castle", lang: "en" });
    await setHazard(p, "landslide");
  }],
  ["river-ja", `河川水位（DoboX、data/river.json の実データ）: ${RIVER_GAUGE}`, {}, async (p, b) => {
    await p.goto(`${b}?lang=ja-easy`, { waitUntil: "domcontentloaded" });
    await waitBoot(p);
    await p.waitForFunction(() => window.__app?.state?.riverDs, null, { timeout: 30000 });
    await clickRiverGauge(p, RIVER_GAUGE);
  }],
  ["river-en", "河川水位（English）", {}, async (p, b) => {
    await p.goto(`${b}?lang=en`, { waitUntil: "domcontentloaded" });
    await waitBoot(p);
    await p.waitForFunction(() => window.__app?.state?.riverDs, null, { timeout: 30000 });
    await clickRiverGauge(p, RIVER_GAUGE);
  }],
  ["near-here-ja", "現在地（平和記念公園に設定）→ 最寄りの避難場所 3 件", { geolocation: { latitude: 34.3925, longitude: 132.4521 } }, async (p, b) => {
    await p.goto(`${b}?lang=ja-easy`, { waitUntil: "domcontentloaded" });
    await waitBoot(p);
    await p.click("#btn-near");
    await p.waitForSelector("#result:not([hidden]) ol.shelters li", { timeout: 60000 });
    await p.waitForTimeout(2500);
  }],
  ["sources-ja", "データの出典ダイアログ", {}, async (p, b) => {
    await openSpot(p, b);
    await p.click("#btn-sources");
  }],
  ["mobile-onboarding-ja", "スマホ 375px: 初回の使い方", { mobile: true, scale: 3, onboarded: false }, async (p, b) => {
    await p.goto(`${b}?lang=ja-easy`, { waitUntil: "domcontentloaded" });
    await waitBoot(p);
  }],
  ["mobile-result-ja", "スマホ 375px: 建物の結果", { mobile: true, scale: 3 }, (p, b) => openSpot(p, b)],
  ["mobile-result-en", "スマホ 375px: 建物の結果（English）", { mobile: true, scale: 3 }, (p, b) => openSpot(p, b, { lang: "en" })],
  ["mobile-layers-ja", "スマホ 375px: レイヤー切替と凡例", { mobile: true, scale: 3 }, async (p, b) => {
    await openSpot(p, b);
    await p.evaluate(() => {
      document.getElementById("layer-panel").open = true;
      document.getElementById("legend-panel").open = true;
    });
  }],
  ["mobile-river-ja", "スマホ 375px: 河川水位", { mobile: true, scale: 3 }, async (p, b) => {
    await p.goto(`${b}?lang=ja-easy`, { waitUntil: "domcontentloaded" });
    await waitBoot(p);
    await p.waitForFunction(() => window.__app?.state?.riverDs, null, { timeout: 30000 });
    await clickRiverGauge(p, RIVER_GAUGE);
  }],
];

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const pw = loadPlaywright();
  const server = opt.url ? null : await startServer();
  const base = baseUrl(opt, server);
  const browser = await launch(pw);
  console.log(`base ${base}  mode ${opt.offline ? "offline（3D 建物・背景地図なし）" : "network"}`);
  const manifest = {
    taken: new Date().toISOString(),
    mode: opt.offline ? "offline" : "network",
    base: opt.url || "local",
    note: opt.offline ? "PLATEAU 3D Tiles・地理院タイルに接続できない環境で撮影。建物と背景地図は写っていない（暫定）。" : "",
    river_observed: JSON.parse(fs.readFileSync(path.join(ROOT, "data", "river.json"), "utf8")).observed || null,
    scenes: [],
  };
  let failed = 0;
  for (const [name, desc, ctxOpts, fn] of SCENES) {
    if (opt.only && !name.includes(opt.only)) continue;
    const ctx = await newContext(browser, base, opt, ctxOpts);
    const page = await ctx.newPage();
    const t0 = Date.now();
    try {
      await fn(page, base);
      await settle(page, opt, 800);
      const file = path.join(DIR, `${name}.png`);
      await page.screenshot({ path: file });
      manifest.scenes.push({ name, desc, file: `screens/${name}.png` });
      console.log(`ok   ${name}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${name}: ${String(e.message || e).split("\n")[0]}`);
    }
    await ctx.close();
  }
  await browser.close();
  server?.close();
  const mf = path.join(DIR, "manifest.json");
  if (opt.only && fs.existsSync(mf)) {
    const old = JSON.parse(fs.readFileSync(mf, "utf8"));
    const names = new Set(manifest.scenes.map((s) => s.name));
    manifest.scenes = [...old.scenes.filter((s) => !names.has(s.name)), ...manifest.scenes];
  }
  fs.writeFileSync(mf, JSON.stringify(manifest, null, 2) + "\n");
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
