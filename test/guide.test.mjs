import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distanceM,
  bearingDeg,
  compass8,
  parseFloorNotes,
  usableFor,
  nearestShelters,
  walkMinutes,
  formatDistance,
} from "../js/guide.js";

const PEACE = [132.4521, 34.3925];

test("distanceM: 緯度 0.01 度はおよそ 1.11 km", () => {
  const d = distanceM(132.45, 34.39, 132.45, 34.4);
  assert.ok(Math.abs(d - 1112) < 5, String(d));
  assert.equal(distanceM(...PEACE, ...PEACE), 0);
});

test("bearingDeg: 東西南北", () => {
  assert.ok(Math.abs(bearingDeg(132.45, 34.39, 132.45, 34.4) - 0) < 0.01);
  assert.ok(Math.abs(bearingDeg(132.45, 34.39, 132.46, 34.39) - 90) < 0.1);
  assert.ok(Math.abs(bearingDeg(132.45, 34.39, 132.45, 34.38) - 180) < 0.01);
  assert.ok(Math.abs(bearingDeg(132.45, 34.39, 132.44, 34.39) - 270) < 0.1);
});

test("compass8: 境界と一周", () => {
  assert.equal(compass8(0), "N");
  assert.equal(compass8(22.4), "N");
  assert.equal(compass8(22.6), "NE");
  assert.equal(compass8(90), "E");
  assert.equal(compass8(200), "S");
  assert.equal(compass8(337.6), "N");
  assert.equal(compass8(-45), "NW");
  assert.equal(compass8(360), "N");
});

test("parseFloorNotes: GSI の備考", () => {
  assert.deepEqual(parseFloorNotes("【洪水：2階以上】，【高潮：3階以上】【津波：2階以上】"), { flood: 2, surge: 3, tsunami: 2 });
  assert.deepEqual(parseFloorNotes("【内水：２階以上】"), { inland: 2 });
  assert.deepEqual(parseFloorNotes(""), {});
  assert.deepEqual(parseFloorNotes(null), {});
});

test("usableFor: hz が無いものは除外しない", () => {
  assert.equal(usableFor({ hz: { flood: true } }, "flood"), true);
  assert.equal(usableFor({ hz: { flood: false } }, "flood"), false);
  assert.equal(usableFor({ hz: { flood: true } }, "tsunami"), false);
  assert.equal(usableFor({}, "tsunami"), true);
});

const SH = [
  { name: "北", lon: 132.4521, lat: 34.3955, hz: { flood: true, surge: true, tsunami: false, landslide: true } },
  { name: "東", lon: 132.4551, lat: 34.3925, hz: { flood: false, surge: true, tsunami: true, landslide: true }, note: "【高潮：3階以上】" },
  { name: "南西", lon: 132.4501, lat: 34.3905, hz: { flood: true, surge: false, tsunami: true, landslide: false }, note: "【洪水：2階以上】" },
  { name: "遠い", lon: 132.5, lat: 34.45, hz: { flood: true, surge: true, tsunami: true, landslide: true } },
  { name: "座標なし", lon: NaN, lat: 34.39, hz: { flood: true } },
];

test("nearestShelters: 災害種別で絞り、距離順に 3 件", () => {
  const r = nearestShelters(SH, ...PEACE, "flood");
  assert.deepEqual(r.map((s) => s.name), ["南西", "北", "遠い"]);
  assert.equal(r[0].dir, "SW");
  assert.equal(r[0].minFloor, 2);
  assert.equal(r[1].dir, "N");
  assert.equal(r[1].minFloor, null);
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].distance <= r[i].distance);
});

test("nearestShelters: 津波・高潮・土砂", () => {
  assert.deepEqual(nearestShelters(SH, ...PEACE, "tsunami").map((s) => s.name), ["東", "南西", "遠い"]);
  const surge = nearestShelters(SH, ...PEACE, "surge", 2);
  assert.deepEqual(surge.map((s) => s.name), ["東", "北"]);
  assert.equal(surge[0].dir, "E");
  assert.equal(surge[0].minFloor, 3);
  assert.deepEqual(nearestShelters(SH, ...PEACE, "landslide").map((s) => s.name), ["東", "北", "遠い"]);
});

test("nearestShelters: 入力が壊れていても落ちない", () => {
  assert.deepEqual(nearestShelters([], ...PEACE, "flood"), []);
  assert.deepEqual(nearestShelters(null, ...PEACE, "flood"), []);
  assert.deepEqual(nearestShelters(SH, NaN, 34.39, "flood"), []);
});

test("nearestShelters: 元の配列を書き換えない", () => {
  const copy = JSON.stringify(SH);
  nearestShelters(SH, ...PEACE, "flood");
  assert.equal(JSON.stringify(SH), copy);
});

test("walkMinutes / formatDistance", () => {
  assert.equal(walkMinutes(0), 1);
  assert.equal(walkMinutes(670), 10);
  assert.equal(formatDistance(3), "10 m");
  assert.equal(formatDistance(456), "460 m");
  assert.equal(formatDistance(1234), "1.2 km");
  assert.equal(formatDistance(995), "1.0 km");
});
