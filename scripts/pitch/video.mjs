#!/usr/bin/env node
// 3 分デモ動画（docs/pitch/demo-storyboard.md の 12 カット）を録画し、ffmpeg で字幕を焼き込む。
//
//   node scripts/pitch/video.mjs                       # 普通のネット環境（3D 建物・背景地図あり）
//   node scripts/pitch/video.mjs --offline --cesium <cesium>/Build/Cesium   # 外に出られない環境（暫定版）
//   node scripts/pitch/video.mjs --only 05             # カット 05 だけ録り直す（他は前回の録画を使う）
//
// 出力: docs/pitch/out/demo.mp4（日本語字幕を焼き込み、音声なし）、demo-ja.srt、demo-en.srt。
// 録画の途中ファイルは docs/pitch/out/_work/（git に入れない）。ffmpeg（libass・libx264 つき）が要る。
//
// 画面: 1280×640 のブラウザを録画し、下に 80px の字幕帯を足して 1280×720 にする（字幕が画面に重ならない）。

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, OUT, parseArgs, loadPlaywright, launch, startServer, newContext, waitBoot, offlineCosmetics, waitTiles, baseUrl } from "./lib.mjs";

const opt = parseArgs({ keep: false });
const WORK = path.join(OUT, "_work");
const W = 1280;
const H = 640; // ブラウザ部分
const BAND = 80; // 字幕帯
const FPS = 25;
const URL_PUBLIC = "https://class-now.github.io/hiroshima-evac-nav/";

const PEACE = [132.4521, 34.3925];
const CASTLE_NORTH = [132.4934, 34.4206]; // 東区の山側（土砂災害警戒区域がある）

// ---- カット（秒数・字幕は demo-storyboard.md と同じ） ---------------------------

const CUTS = [
  { id: "01", sec: 8, ja: "広島 3D 多言語避難ナビ", en: "Hiroshima 3D Evacuation Map", card: "title" },
  {
    id: "02", sec: 12,
    ja: "平面のハザードマップでは「この建物の何階なら安全か」が分からない",
    en: "A flat hazard map can't tell you which floor is safe",
    setup: (p, b) => boot(p, `${b}?lang=ja-easy`),
    run: async (p) => {
      await p.waitForTimeout(1500);
      await p.selectOption("#spot-select", "peace");
      await p.waitForSelector("#result:not([hidden]) ol.shelters li", { timeout: 60000 });
    },
  },
  {
    id: "03", sec: 15,
    ja: "建物をタップすると、水の深さと「何階より上へ」が出る",
    en: "Tap a building: water depth and which floor to go up to",
    setup: (p, b) => boot(p, `${b}?lang=ja-easy`, { flyTo: PEACE }),
    run: async (p) => {
      await p.waitForTimeout(1500);
      await tapLonLat(p, PEACE);
      await p.waitForSelector("#result:not([hidden])", { timeout: 30000 });
      await p.waitForTimeout(6000);
      await p.evaluate(() => document.getElementById("sheet")?.scrollBy({ top: 300, behavior: "smooth" }));
    },
  },
  {
    id: "04", sec: 15,
    ja: "緑は上の階へ逃げられる建物、赤は避難場所へ",
    en: "Green: go upstairs. Red: go to an evacuation site",
    setup: (p, b) => boot(p, `${b}?lang=ja-easy`, { flyTo: PEACE }),
    run: async (p) => {
      await p.waitForTimeout(1000);
      await p.evaluate(() => (document.getElementById("layer-panel").open = true));
      await p.waitForTimeout(1200);
      await p.check("#layer-list input[name=cmode][value=refuge]");
      await p.waitForTimeout(1500);
      await orbit(p, PEACE, 9000);
    },
  },
  {
    id: "05", sec: 15,
    ja: "洪水・高潮・津波を切り替えられる",
    en: "Switch between flood, storm surge and tsunami",
    setup: (p, b) => boot(p, `${b}?lang=ja-easy&spot=peace`, { result: true }),
    run: async (p) => {
      for (const hz of ["surge", "tsunami", "flood"]) {
        await p.waitForTimeout(1500);
        await p.click(`#hazard-group button[data-hz=${hz}]`);
        await p.waitForTimeout(2500);
        await cosmetics(p);
      }
    },
  },
  {
    id: "06", sec: 15,
    ja: "土砂災害警戒区域は広島県 DoboX のデータ",
    en: "Landslide zones from Hiroshima Prefecture's DoboX",
    setup: (p, b) => boot(p, `${b}?lang=ja-easy&spot=castle`, { result: true }),
    run: async (p) => {
      await p.waitForTimeout(1000);
      await p.click("#hazard-group button[data-hz=landslide]");
      await p.waitForTimeout(1500);
      await p.evaluate(([lon, lat]) => {
        window.__app.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon - 0.004, lat - 0.03, 2600),
          orientation: { heading: Cesium.Math.toRadians(8), pitch: Cesium.Math.toRadians(-40), roll: 0 },
          duration: 4,
        });
      }, CASTLE_NORTH);
      await p.waitForTimeout(5000);
      await tapLonLat(p, [132.4935, 34.4205]);
    },
  },
  {
    id: "07", sec: 20,
    ja: "その災害に使える避難場所を近い順に 3 件",
    en: "The 3 nearest sites usable for this hazard",
    ctx: { geolocation: { latitude: PEACE[1], longitude: PEACE[0] } },
    setup: (p, b) => boot(p, `${b}?lang=ja-easy`),
    run: async (p) => {
      await p.waitForTimeout(1500);
      await p.click("#btn-near");
      await p.waitForSelector("#result:not([hidden]) ol.shelters li", { timeout: 60000 });
      await p.waitForTimeout(7000);
      await p.click("#result ol.shelters li:first-child button");
    },
  },
  {
    id: "08", sec: 20,
    ja: "DoboX の河川水位を毎日取り込み、基準水位と比べて表示",
    en: "Daily river levels from DoboX, compared with alert levels",
    setup: (p, b) => boot(p, `${b}?lang=ja-easy`),
    run: async (p) => {
      await p.waitForFunction(() => window.__app?.state?.riverDs, null, { timeout: 30000 });
      await p.evaluate(() => {
        const f = window.__app.state.river.features.find((x) => x.properties.name === "三篠橋(国)") || window.__app.state.river.features[0];
        const [lon, lat] = f.geometry.coordinates;
        window.__app.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon - 0.001, lat - 0.008, 800),
          orientation: { heading: Cesium.Math.toRadians(8), pitch: Cesium.Math.toRadians(-45), roll: 0 },
          duration: 3,
        });
      });
      await p.waitForTimeout(4500);
      const pos = await p.evaluate(() => {
        const f = window.__app.state.river.features.find((x) => x.properties.name === "三篠橋(国)") || window.__app.state.river.features[0];
        const [lon, lat] = f.geometry.coordinates;
        const { viewer } = window.__app;
        const w = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, Cesium.Cartesian3.fromDegrees(lon, lat, 4));
        return { x: w.x, y: w.y };
      });
      await p.mouse.move(pos.x - 80, pos.y - 60);
      await p.mouse.move(pos.x, pos.y, { steps: 15 });
      await p.waitForTimeout(500);
      await p.mouse.click(pos.x, pos.y);
      await p.waitForTimeout(3000);
      await p.evaluate(() => (document.getElementById("legend-panel").open = true));
    },
  },
  {
    id: "09", sec: 20,
    ja: "やさしい日本語・英語・中国語・韓国語",
    en: "Easy Japanese, English, Chinese, Korean",
    setup: (p, b) => boot(p, `${b}?lang=ja-easy&spot=peace`, { result: true }),
    run: async (p) => {
      for (const lang of ["en", "zh", "ko"]) {
        await p.waitForTimeout(lang === "en" ? 2000 : 5000);
        await p.selectOption("#lang-select", lang);
      }
    },
  },
  {
    id: "10", sec: 15,
    ja: "スマホでも、初めてでも使える",
    en: "Works on phones, even for first-time users",
    mobile: true,
    ctx: { mobile: true, onboarded: false },
    setup: (p, b) => boot(p, `${b}?lang=ja-easy`),
    run: async (p) => {
      await p.waitForTimeout(4000);
      await p.click("#onboarding form button");
      await p.waitForTimeout(1500);
      await p.selectOption("#spot-select", "peace");
      await p.waitForTimeout(4500);
      await p.evaluate(() => {
        document.getElementById("legend-panel").open = true;
      });
      await p.waitForTimeout(2000);
      await p.evaluate(() => (document.getElementById("layer-panel").open = true));
    },
  },
  {
    id: "11", sec: 13,
    ja: "PLATEAU・DoboX・国土地理院・国土数値情報を使用",
    en: "Built on open data",
    setup: (p, b) => boot(p, `${b}?lang=ja-easy&spot=peace`, { result: true }),
    run: async (p) => {
      await p.waitForTimeout(1500);
      await p.click("#btn-sources");
    },
  },
  {
    id: "12", sec: 12,
    ja: "これは予測です。避難は広島市の情報に従ってください",
    en: "These are estimates. Follow Hiroshima City's instructions.",
    card: "end",
  },
];

// ---- 操作の部品 ------------------------------------------------------------------

async function cosmetics(p) {
  if (opt.offline) await offlineCosmetics(p);
}

// ページを開いて準備（ここまでは動画に使わない）。
async function boot(p, url, { result = false, flyTo = null } = {}) {
  await p.goto(url, { waitUntil: "domcontentloaded" });
  await waitBoot(p);
  if (result) await p.waitForSelector("#result:not([hidden]) ol.shelters li", { timeout: 90000 });
  if (flyTo) {
    await p.evaluate(([lon, lat]) => {
      const narrow = window.matchMedia("(max-width: 640px)").matches;
      window.__app.viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(lon - 0.0009, lat - (narrow ? 0.0052 : 0.0062), narrow ? 700 : 620),
        orientation: { heading: Cesium.Math.toRadians(8), pitch: Cesium.Math.toRadians(-42), roll: 0 },
      });
    }, flyTo);
  }
  // 録画中は描き続ける（requestRenderMode だと止まって見える）。SwiftShader では重いので 0.2 秒ごとに要求する。
  await p.evaluate(() => setInterval(() => window.__app.viewer.scene.requestRender(), 200));
  if (!opt.offline) await waitTiles(p, 90000);
  await cosmetics(p);
  // 通知（オフラインの「3D を読めない」）が録画中に出たら隠す。
  if (opt.offline)
    await p.evaluate(() => {
      const t = document.getElementById("toast");
      new MutationObserver(() => { if (!t.hidden) t.hidden = true; }).observe(t, { attributes: true, childList: true });
      t.hidden = true;
    });
}

async function tapLonLat(p, [lon, lat]) {
  const pos = await p.evaluate(([lon, lat]) => {
    const { viewer } = window.__app;
    const w = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, Cesium.Cartesian3.fromDegrees(lon, lat, 10));
    return w ? { x: w.x, y: w.y } : null;
  }, [lon, lat]);
  if (!pos) return;
  await p.mouse.move(pos.x - 120, pos.y + 40);
  await p.mouse.move(pos.x, pos.y, { steps: 20 });
  await p.waitForTimeout(500);
  await p.mouse.click(pos.x, pos.y);
}

// 地点のまわりをゆっくり回る。
async function orbit(p, [lon, lat], ms) {
  await p.evaluate(
    ([lon, lat, ms]) =>
      new Promise((resolve) => {
        const { viewer } = window.__app;
        const center = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
        const h0 = viewer.camera.heading;
        const t0 = performance.now();
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / ms);
          viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(h0 + k * Math.PI * 0.6, Cesium.Math.toRadians(-38), 900));
          if (k < 1) requestAnimationFrame(step);
          else {
            viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            resolve();
          }
        };
        step();
      }),
    [lon, lat, ms]
  );
}

// ---- 録画 ------------------------------------------------------------------------

async function recordCut(browser, base, cut) {
  const dir = path.join(WORK, `rec-${cut.id}`);
  fs.rmSync(dir, { recursive: true, force: true });
  const size = cut.mobile ? { width: 375, height: H } : { width: W, height: H };
  const ctx = await newContext(browser, base, opt, { ...(cut.ctx || {}), scale: 1, size, video: { dir, size } });
  const page = await ctx.newPage();
  const t0 = Date.now();
  console.log(`  ${cut.id} 準備中`);
  await cut.setup(page, base);
  console.log(`  ${cut.id} 操作中`);
  const start = (Date.now() - t0) / 1000;
  await cut.run(page);
  const used = (Date.now() - t0) / 1000 - start;
  if (used < cut.sec + 0.5) await page.waitForTimeout((cut.sec + 0.5 - used) * 1000);
  const video = page.video();
  await ctx.close();
  const src = await video.path();
  fs.writeFileSync(path.join(WORK, `rec-${cut.id}.json`), JSON.stringify({ src, start, used }));
  console.log(`rec  ${cut.id}  準備 ${start.toFixed(1)}s  操作 ${used.toFixed(1)}s`);
}

// ---- カード（タイトル・エンド） ----------------------------------------------------

function cardHtml(kind, bg) {
  const bgCss = bg ? `background:#0b2540 url('${bg}') center/cover` : "background:#0b2540";
  const common = `
    <style>
      body{margin:0;width:${W}px;height:${H}px;font-family:"IPAGothic","WenQuanYi Zen Hei",sans-serif;color:#fff;overflow:hidden}
      .bg{position:absolute;inset:0;${bgCss};filter:brightness(.55)}
      .c{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 90px}
      h1{font-size:64px;margin:0 0 14px;letter-spacing:.02em}
      h2{font-size:28px;margin:0 0 30px;font-weight:normal;opacity:.9}
      p{font-size:24px;margin:6px 0;line-height:1.5}
      .url{font-family:monospace;font-size:26px;background:rgba(0,0,0,.45);display:inline-block;padding:8px 14px;border-radius:8px}
      .tag{display:inline-block;background:#0b5cad;padding:4px 12px;border-radius:6px;font-size:20px;margin-right:8px}
    </style>`;
  if (kind === "title")
    return `${common}<div class="bg"></div><div class="c">
      <h1>広島 3D 多言語避難ナビ</h1><h2>Hiroshima 3D Evacuation Map</h2>
      <p><span class="tag">PLATEAU 広島市 2024</span><span class="tag">DoboX</span><span class="tag">4 言語</span></p></div>`;
  return `${common}<div class="bg"></div><div class="c">
    <h1 style="font-size:46px">これは予測です。<br>避難は広島市の情報に従ってください。</h1>
    <h2>These are estimates. Follow Hiroshima City's instructions.</h2>
    <p class="url">${URL_PUBLIC}</p>
    <p style="font-size:18px;opacity:.85;margin-top:24px">3D 都市モデル: 国土交通省 Project PLATEAU ／ 出典: 広島県インフラマネジメント基盤（DoboX）CC BY 4.0 ／ 国土地理院 ／ 国土数値情報</p></div>`;
}

async function renderCards(browser) {
  const bgFile = path.join(OUT, "screens", "overview.png");
  const bg = fs.existsSync(bgFile) ? "data:image/png;base64," + fs.readFileSync(bgFile).toString("base64") : "";
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  for (const kind of ["title", "end"]) {
    await page.setContent(cardHtml(kind, bg));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(WORK, `card-${kind}.png`) });
  }
  await ctx.close();
}

// ---- 字幕・結合 ------------------------------------------------------------------

function ts(sec, sep) {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p2 = (n) => String(n).padStart(2, "0");
  return sep === "ass" ? `${h}:${p2(m)}:${p2(s)}.${String(Math.floor(r / 10)).padStart(2, "0")}` : `${p2(h)}:${p2(m)}:${p2(s)},${String(r).padStart(3, "0")}`;
}

function writeSubs() {
  let t = 0;
  const srt = { ja: [], en: [] };
  const ass = [];
  CUTS.forEach((c, i) => {
    const a = t + 0.3;
    const b = t + c.sec - 0.2;
    for (const l of ["ja", "en"]) srt[l].push(`${i + 1}\n${ts(a)} --> ${ts(b)}\n${c[l]}\n`);
    if (!c.card) ass.push(`Dialogue: 0,${ts(a, "ass")},${ts(b, "ass")},Sub,,0,0,0,,${c.ja}`);
    t += c.sec;
  });
  fs.writeFileSync(path.join(OUT, "demo-ja.srt"), srt.ja.join("\n"));
  fs.writeFileSync(path.join(OUT, "demo-en.srt"), srt.en.join("\n"));
  const draft = opt.offline ? "暫定版：撮影環境の制限で 3D 建物・背景地図なし" : "";
  const head = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H + BAND}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,IPAGothic,34,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,40,40,22,1
Style: Draft,IPAGothic,18,&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0000000,0,0,0,0,100,100,0,0,3,4,0,9,12,12,72,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const total = CUTS.reduce((s, c) => s + c.sec, 0);
  const lines = [...ass];
  if (draft) lines.push(`Dialogue: 1,${ts(CUTS[0].sec, "ass")},${ts(total - CUTS.at(-1).sec, "ass")},Draft,,0,0,0,,${draft}`);
  fs.writeFileSync(path.join(WORK, "subs.ass"), head + lines.join("\n") + "\n");
  return total;
}

function ff(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}

// 各カットを 1280×640・25fps・指定の秒数にそろえる。
function normalizeCut(cut) {
  const out = path.join(WORK, `cut-${cut.id}.mp4`);
  const pad = `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x1d2a36`;
  const vf = `fps=${FPS},scale=${cut.mobile ? `-2:${H}` : `${W}:${H}`},${pad},setsar=1,format=yuv420p`;
  if (cut.card) {
    ff(["-loop", "1", "-t", String(cut.sec), "-i", path.join(WORK, `card-${cut.card}.png`), "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-an", out]);
  } else {
    const { src, start } = JSON.parse(fs.readFileSync(path.join(WORK, `rec-${cut.id}.json`), "utf8"));
    ff([
      "-ss", start.toFixed(2), "-i", src, "-t", String(cut.sec),
      "-vf", `${vf},tpad=stop_mode=clone:stop_duration=${cut.sec}`, "-t", String(cut.sec),
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-an", out,
    ]);
  }
  return out;
}

function compose(total) {
  const list = path.join(WORK, "list.txt");
  fs.writeFileSync(list, CUTS.map((c) => `file '${path.join(WORK, `cut-${c.id}.mp4`)}'`).join("\n") + "\n");
  const joined = path.join(WORK, "joined.mp4");
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined]);
  const assPath = path.join(WORK, "subs.ass").replace(/\\/g, "/").replace(/:/g, "\\:");
  const out = path.join(OUT, "demo.mp4");
  ff([
    "-i", joined,
    "-vf", `pad=${W}:${H + BAND}:0:0:color=0x111820,subtitles='${assPath}'`,
    "-t", String(total), "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out,
  ]);
  return out;
}

async function main() {
  fs.mkdirSync(WORK, { recursive: true });
  const pw = loadPlaywright();
  const server = opt.url ? null : await startServer();
  const base = baseUrl(opt, server);
  const browser = await launch(pw);
  console.log(`base ${base}  mode ${opt.offline ? "offline（3D 建物・背景地図なし）" : "network"}`);
  await renderCards(browser);
  for (const cut of CUTS) {
    if (cut.card) continue;
    if (opt.only && !opt.only.split(",").includes(cut.id) && fs.existsSync(path.join(WORK, `rec-${cut.id}.json`))) continue;
    await recordCut(browser, base, cut);
  }
  await browser.close();
  server?.close();
  const total = writeSubs();
  for (const cut of CUTS) normalizeCut(cut);
  const out = compose(total);
  const mb = fs.statSync(out).size / 1e6;
  console.log(`${path.relative(ROOT, out)}  ${total}s  ${mb.toFixed(1)} MB`);
  if (!opt.keep) for (const f of fs.readdirSync(WORK)) if (f.startsWith("cut-") || f === "joined.mp4") fs.rmSync(path.join(WORK, f));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
