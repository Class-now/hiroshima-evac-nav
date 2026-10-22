#!/usr/bin/env node
// docs/pitch/src/*.html を PDF にする（Playwright の page.pdf）。
//
//   node scripts/pitch/pdf.mjs            # slides と poster の両方
//   node scripts/pitch/pdf.mjs slides     # どちらかだけ
//
// 出力: docs/pitch/out/plateau-slides.pdf（16:9）、docs/pitch/out/dobox-poster.pdf（A4 縦）と
//       確認用の PNG（docs/pitch/out/preview/）。
// PDF を軽くするため、../out/screens/*.png は幅 1600px の JPEG に縮めて読み込ませる（ffmpeg を使う）。

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ROOT, OUT, loadPlaywright, launch } from "./lib.mjs";

const SRC = path.join(ROOT, "docs", "pitch", "src");
const WORK = path.join(OUT, "_work", "jpg");
const PREVIEW = path.join(OUT, "preview");

const DOCS = {
  slides: { html: "slides.html", pdf: "plateau-slides.pdf", viewport: { width: 1280, height: 720 }, pdfOpt: { width: "1280px", height: "720px" } },
  poster: { html: "poster.html", pdf: "dobox-poster.pdf", viewport: { width: 794, height: 1123 }, pdfOpt: { format: "A4" } },
};

function jpegFor(png) {
  fs.mkdirSync(WORK, { recursive: true });
  const out = path.join(WORK, path.basename(png, ".png") + ".jpg");
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(png).mtimeMs) {
    const w = /mobile-/.test(png) ? 750 : 1600;
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", png, "-vf", `scale='min(${w},iw)':-2`, "-q:v", "3", out]);
  }
  return out;
}

async function main() {
  const which = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const names = which.length ? which : Object.keys(DOCS);
  const pw = loadPlaywright();
  const browser = await launch(pw, { gpu: false });
  fs.mkdirSync(PREVIEW, { recursive: true });
  for (const name of names) {
    const d = DOCS[name];
    const file = path.join(SRC, d.html);
    if (!fs.existsSync(file)) {
      console.log(`skip ${name}: ${d.html} が無い`);
      continue;
    }
    const ctx = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: 1 });
    await ctx.route(/\/out\/screens\/[^/]+\.png$/, (route) => {
      const png = path.join(OUT, "screens", path.basename(new URL(route.request().url()).pathname));
      if (!fs.existsSync(png)) return route.continue();
      return route.fulfill({ status: 200, contentType: "image/jpeg", body: fs.readFileSync(jpegFor(png)) });
    });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: "print" });
    const out = path.join(OUT, d.pdf);
    await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true, ...d.pdfOpt });
    // 確認用 PNG（1 ページ目〜）
    const pages = await page.$$("section.slide, .page");
    let i = 0;
    for (const el of pages) {
      i++;
      await el.screenshot({ path: path.join(PREVIEW, `${name}-${String(i).padStart(2, "0")}.png`) });
    }
    if (!pages.length) await page.screenshot({ path: path.join(PREVIEW, `${name}.png`), fullPage: true });
    await ctx.close();
    console.log(`${path.relative(ROOT, out)}  ${(fs.statSync(out).size / 1e6).toFixed(2)} MB  ${pages.length || 1} ページ相当`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
