// data/river.json（scripts/build_river.py が作る）が js/app.js の河川水位レイヤーの読む形になっているか。
// ファイルが無いあいだ（未取得）は飛ばす。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const url = new URL("../data/river.json", import.meta.url);
const has = fs.existsSync(url);
const gj = has ? JSON.parse(fs.readFileSync(url, "utf8")) : null;
const num = (v) => typeof v === "number" && Number.isFinite(v);
const STAGES = [0, 1, 2, 3, 4];

test("river.json: FeatureCollection と observed（日付）", { skip: !has }, () => {
  assert.equal(gj.type, "FeatureCollection");
  assert.ok(gj.features.length > 0);
  assert.match(gj.observed, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isFinite(Date.parse(gj.observed)));
});

test("river.json: 各観測所の位置・名前・水位・段階", { skip: !has }, () => {
  const codes = new Set();
  for (const f of gj.features) {
    const p = f.properties;
    assert.equal(f.geometry.type, "Point");
    const [lon, lat] = f.geometry.coordinates;
    assert.ok(lon > 132 && lon < 133 && lat > 34 && lat < 35, `${p.code}: ${lon},${lat}`);
    assert.ok(p.code && !codes.has(p.code), `code が空か重複: ${p.code}`);
    codes.add(p.code);
    assert.ok(p.name, p.code);
    for (const v of Object.values(p.thresholds || {})) assert.ok(num(v), p.code);
    if (p.level === undefined) continue;
    assert.ok(num(p.level) && num(p.max) && p.max >= p.level, p.code);
    assert.match(p.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(p.time, /^\d{2}:\d{2}$/);
    assert.match(p.max_time, /^\d{2}:\d{2}$/);
    assert.ok(p.stage === null || STAGES.includes(p.stage), p.code);
    assert.equal(p.stage === null, !p.thresholds, `${p.code}: 基準水位があるときだけ段階がある`);
  }
});
