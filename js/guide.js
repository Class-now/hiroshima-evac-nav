// 最寄りの避難場所の案内（純粋関数だけ。DOM・Cesium に依存しない。test/guide.test.mjs で検査）。
// 経路検索 API は使わず、直線距離と方角で示す。

export const HAZARD_KEYS = ["flood", "surge", "tsunami", "landslide"];

// 8 方位。i18n のキーは dir_N, dir_NE, ...
export const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const R = 6371000;
const toRad = Math.PI / 180;

// 2 点間の距離（m、球面）。
export function distanceM(aLon, aLat, bLon, bLat) {
  const dLat = (bLat - aLat) * toRad;
  const dLon = (bLon - aLon) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// a から b への方位角（度、北=0・時計回り、0 以上 360 未満）。
export function bearingDeg(aLon, aLat, bLon, bLat) {
  const p1 = aLat * toRad;
  const p2 = bLat * toRad;
  const dl = (bLon - aLon) * toRad;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const deg = Math.atan2(y, x) / toRad;
  return (deg + 360) % 360;
}

// 方位角 → 8 方位の記号。
export function compass8(deg) {
  const d = ((deg % 360) + 360) % 360;
  return DIRECTIONS[Math.round(d / 45) % 8];
}

// GSI の備考「【洪水：2階以上】【高潮：3階以上】」→ { flood: 2, surge: 3 }（内水は inland）。
const NOTE_HAZARD = { 洪水: "flood", 高潮: "surge", 津波: "tsunami", 内水: "inland" };
export function parseFloorNotes(note) {
  const out = {};
  if (!note) return out;
  const s = String(note).replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  for (const m of s.matchAll(/【(洪水|高潮|津波|内水)：(\d+)階以上】/g)) out[NOTE_HAZARD[m[1]]] = Number(m[2]);
  return out;
}

// その災害で使える避難場所か。hz が無いデータは「不明」として除外しない。
export function usableFor(shelter, hazard) {
  if (!shelter || !shelter.hz) return true;
  return shelter.hz[hazard] === true;
}

/**
 * 地点 (lon, lat) から、災害 hazard に対応した避難場所を近い順に n 件返す。
 * 返り値の各要素は元の属性に加えて distance（m）・bearing（度）・dir（8 方位）・minFloor（階、無ければ null）を持つ。
 * @param {Array<{lon:number, lat:number, hz?:object, note?:string}>} shelters
 */
export function nearestShelters(shelters, lon, lat, hazard, n = 3) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return [];
  return (shelters || [])
    .filter((s) => Number.isFinite(s.lon) && Number.isFinite(s.lat) && usableFor(s, hazard))
    .map((s) => {
      const distance = distanceM(lon, lat, s.lon, s.lat);
      const bearing = bearingDeg(lon, lat, s.lon, s.lat);
      return { ...s, distance, bearing, dir: compass8(bearing), minFloor: parseFloorNotes(s.note)[hazard] ?? null };
    })
    .sort((a, b) => a.distance - b.distance || String(a.name).localeCompare(String(b.name)))
    .slice(0, n);
}

// 徒歩の分数（訪日客・荷物ありを想定して 67 m/分。最低 1 分）。
export const WALK_M_PER_MIN = 67;
export function walkMinutes(distance) {
  return Math.max(1, Math.round(distance / WALK_M_PER_MIN));
}

// 距離の表示（1 km 未満は 10 m 単位、それ以上は 0.1 km 単位）。
export function formatDistance(distance) {
  if (distance < 1000) return `${Math.max(10, Math.round(distance / 10) * 10)} m`;
  return `${(distance / 1000).toFixed(1)} km`;
}
