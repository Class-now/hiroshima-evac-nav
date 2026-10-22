import { PLATEAU } from "./plateau-urls.js";
import { LANGS, setLang, getLang, initialLang, t } from "./i18n.js";
import { nearestShelters, distanceM, walkMinutes, formatDistance } from "./guide.js";

// ---- constants -------------------------------------------------------------

// GSI geoid height at central Hiroshima (m). PLATEAU 3D Tiles use ellipsoidal heights,
// while this app uses the flat ellipsoid as ground, so tilesets are shifted down by this.
const GEOID = 33.4;
const START = { lon: 132.4553, lat: 34.3935 };
const BOUNDS = { west: 132.39, east: 132.52, south: 34.33, north: 34.44 };
const SPOTS = {
  station: [132.4757, 34.3976],
  peace: [132.4521, 34.3925],
  hondori: [132.4582, 34.3935],
  castle: [132.4594, 34.4027],
};
const HAZARDS = ["flood", "surge", "tsunami", "landslide"];
const ONBOARDED_KEY = "evacnav.onboarded";

// 浸水深の配色（水害ハザードマップ作成の手引きの凡例色）。index = uro:rank_code
const RANK_COLORS = ["#E8ECF0", "#F7F5A9", "#FFD8C0", "#FFB7B7", "#FF9191", "#F285C9", "#DC7ADC"];
const RANK_MAX_DEPTH = [0, 0.5, 3, 5, 10, 20, 30];
const LANDSLIDE_COLOR = "#D9A35B";
const REFUGE_OK = "#2E9D5B";
const REFUGE_NG = "#D2453A";
const SHELTER_COLOR = "#1e7b3a";
const TRAM_COLOR = "#0b5cad";
// 河川水位: 平常・水防団待機・氾濫注意（レベル2 黄）・避難判断（レベル3 赤）・氾濫危険（レベル4 紫）。基準なしは灰色。
const STAGE_COLORS = ["#3A7BD5", "#9CC3E6", "#F2E700", "#FF2800", "#AA00AA"];
const STAGE_NONE = "#8A94A6";
const RIVER_LIVE_URL = "https://www.kasen-bousai.pref.hiroshima.lg.jp/";
const FLOOR_HEIGHT_M = 3.3;

// ---- state -----------------------------------------------------------------

const state = {
  hazard: "flood",
  buildings: [],
  buildingsFailed: false,
  areas: { flood: [], surge: [], tsunami: [] },
  areaStatus: { flood: "idle", surge: "idle", tsunami: "idle" }, // idle | loading | ok | partial | failed
  landslide: null,
  shelters: [],
  stops: [],
  river: null, // GeoJSON FeatureCollection or null
  sheltersDs: null,
  stopsDs: null,
  riverDs: null,
  selection: null, // { lon, lat, building, area, origin: "selected" | "here" | "center" }
  riverSel: null, // properties of a picked river gauge
  layers: { buildings: true, area: true, landslide: false, river: true, shelters: true, tram: true },
  colorMode: "depth", // "depth" | "refuge"
};

// ---- viewer ----------------------------------------------------------------

Cesium.Ion.defaultAccessToken = "";

let viewer;
try {
  viewer = new Cesium.Viewer("viewer", {
    baseLayer: new Cesium.ImageryLayer(
      new Cesium.UrlTemplateImageryProvider({
        url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
        minimumLevel: 2,
        maximumLevel: 18,
        rectangle: Cesium.Rectangle.fromDegrees(122, 20, 154, 46),
        credit: new Cesium.Credit('<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'),
      })
    ),
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
  });
} catch (e) {
  // WebGL が使えない端末など。文字だけでも案内を出す。
  console.error(e);
  document.getElementById("loading").hidden = true;
  const el = document.getElementById("toast");
  el.textContent = "This browser cannot show the 3D map (WebGL). / この ブラウザでは 3D の ちずが みられません。";
  el.hidden = false;
  throw e;
}
const scene = viewer.scene;
scene.globe.depthTestAgainstTerrain = false;
scene.skyAtmosphere.show = false;
scene.fog.enabled = false;
viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);

const markers = viewer.entities;

function isNarrow() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function flyTo(lon, lat, done) {
  // On phones the bottom sheet covers the lower part, so look a little further south.
  const back = isNarrow() ? 0.0052 : 0.0062;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon - 0.0009, lat - back, isNarrow() ? 700 : 620),
    orientation: { heading: Cesium.Math.toRadians(8), pitch: Cesium.Math.toRadians(-42), roll: 0 },
    duration: 1.6,
    complete: done,
  });
}

// ---- loading indicator ------------------------------------------------------

const pending = new Map(); // tileset -> pending requests + tiles processing
let bootDone = false;

function updateLoading() {
  const el = document.getElementById("loading");
  const txt = document.getElementById("loading-text");
  let n = 0;
  for (const v of pending.values()) n += v;
  if (!bootDone) {
    txt.textContent = t("loadingBuildings");
    el.hidden = false;
  } else if (n > 0) {
    txt.textContent = t("loadingTiles", { n });
    el.hidden = false;
  } else el.hidden = true;
}

let toastTimer = null;
function toast(msg, ms = 6000) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

// ---- tilesets --------------------------------------------------------------

function shiftDown(tileset) {
  const carto = Cesium.Cartographic.fromCartesian(tileset.boundingSphere.center);
  const surface = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 0);
  const lowered = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, -GEOID);
  tileset.modelMatrix = Cesium.Matrix4.fromTranslation(
    Cesium.Cartesian3.subtract(lowered, surface, new Cesium.Cartesian3())
  );
}

async function loadTileset(url, kind) {
  const ts = await Cesium.Cesium3DTileset.fromUrl(url, {
    maximumScreenSpaceError: kind === "bldg" ? 12 : 20,
    cacheBytes: 96 * 1024 * 1024,
    maximumCacheOverflowBytes: 64 * 1024 * 1024,
    skipLevelOfDetail: true,
  });
  ts._kind = kind;
  ts.tileLoad.addEventListener(() => scene.requestRender());
  ts.allTilesLoaded.addEventListener(() => {
    pending.set(ts, 0);
    updateLoading();
    scene.requestRender();
    // A spot picked while this hazard's area tiles were still loading can now be answered.
    const sel = state.selection;
    if (kind === state.hazard && sel && !state.riverSel && !(sel.areaHz === kind && sel.areaOk)) render();
  });
  ts.loadProgress.addEventListener((requests, processing) => {
    pending.set(ts, requests + processing);
    updateLoading();
  });
  shiftDown(ts);
  scene.primitives.add(ts);
  return ts;
}

// Property ids that hold flood depth / landslide zone on PLATEAU building features.
function hazardKeys(tileset) {
  if (tileset._hzKeys) return tileset._hzKeys;
  const ids = Object.keys(tileset.properties || {});
  const keys = {
    flood: ids.filter((n) => n.includes("L2") && n.endsWith("_浸水深")),
    floodDuration: ids.filter((n) => n.includes("L2") && n.endsWith("_浸水継続時間")),
    surge: ids.filter((n) => n.startsWith("高潮") && n.endsWith("_浸水深")),
    tsunami: ids.filter((n) => n.startsWith("津波") && n.endsWith("_浸水深")),
    landslide: ids.filter((n) => n.startsWith("土砂災害") && n.endsWith("_区域区分")),
  };
  tileset._hzKeys = keys;
  return keys;
}

function num(v) {
  const x = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(x) ? x : null;
}

function maxOf(feature, ids) {
  let max = null;
  for (const id of ids) {
    const v = num(feature.getProperty(id));
    if (v !== null && (max === null || v > max)) max = v;
  }
  return max;
}

function buildingRisk(feature, hazard) {
  const keys = hazardKeys(feature.tileset);
  if (hazard === "landslide") {
    const zone = keys.landslide.map((k) => feature.getProperty(k)).find((v) => v != null && v !== "");
    return { landslide: zone || null };
  }
  const depth = maxOf(feature, keys[hazard]);
  const duration = hazard === "flood" ? maxOf(feature, keys.floodDuration) : null;
  // known = the tileset carries this hazard's attributes at all (else "no value" means "no data", not "safe").
  return { depth, duration, known: keys[hazard].length > 0 };
}

// Floors above ground: the attribute if present, otherwise estimated from the measured height.
function floorsOf(feature) {
  const s = num(feature.getProperty("bldg:storeysAboveGround"));
  if (s) return { floors: s, estimated: false };
  const h = num(feature.getProperty("bldg:measuredHeight"));
  if (h && h > 0) return { floors: Math.max(1, Math.floor(h / FLOOR_HEIGHT_M)), estimated: true, height: h };
  return { floors: null, estimated: false };
}

// Floor that stays above the water: 0.5–3 m → 2F, 3–6 m → 3F, 6–9 m → 4F ...
function safeFloorFor(depth) {
  return Math.floor(depth / 3) + 2;
}

function rankFromDepth(d) {
  if (d === null || d <= 0) return 0;
  if (d < 0.5) return 1;
  if (d < 3) return 2;
  if (d < 5) return 3;
  if (d < 10) return 4;
  if (d < 20) return 5;
  return 6;
}

const colorCache = new Map();
function cesiumColor(hex, alpha = 1) {
  const k = hex + alpha;
  if (!colorCache.has(k)) colorCache.set(k, Cesium.Color.fromCssColorString(hex).withAlpha(alpha));
  return colorCache.get(k);
}

function buildingStyle() {
  const style = new Cesium.Cesium3DTileStyle();
  style.color = {
    evaluateColor(feature, result) {
      const r = buildingRisk(feature, state.hazard);
      let c;
      if (state.hazard === "landslide") c = r.landslide ? cesiumColor(LANDSLIDE_COLOR) : cesiumColor(RANK_COLORS[0]);
      else if (state.colorMode === "refuge") {
        if (r.depth === null || r.depth < 0.5) c = cesiumColor(RANK_COLORS[0]);
        else {
          const f = floorsOf(feature).floors;
          c = cesiumColor(f && f >= safeFloorFor(r.depth) ? REFUGE_OK : REFUGE_NG);
        }
      } else c = cesiumColor(RANK_COLORS[rankFromDepth(r.depth)]);
      return Cesium.Color.clone(c, result);
    },
  };
  return style;
}

function areaStyle() {
  const style = new Cesium.Cesium3DTileStyle();
  style.color = {
    evaluateColor(feature, result) {
      const code = num(feature.getProperty("uro:rank_code")) || 0;
      return Cesium.Color.clone(cesiumColor(RANK_COLORS[Math.min(code, 6)], 0.4), result);
    },
  };
  return style;
}

function applyStyles() {
  const bs = buildingStyle();
  for (const ts of state.buildings) {
    ts.style = bs;
    ts.show = state.layers.buildings;
  }
  for (const h of ["flood", "surge", "tsunami"]) {
    for (const ts of state.areas[h]) ts.show = state.layers.area && state.hazard === h;
  }
  if (state.landslide) state.landslide.show = state.layers.landslide || state.hazard === "landslide";
  if (state.sheltersDs) state.sheltersDs.show = state.layers.shelters;
  if (state.stopsDs) state.stopsDs.show = state.layers.tram;
  if (state.riverDs) state.riverDs.show = state.layers.river;
  scene.requestRender();
}

async function loadAreas(hazard) {
  if (state.areaStatus[hazard] !== "idle" && state.areaStatus[hazard] !== "failed") return;
  state.areaStatus[hazard] = "loading";
  const urls = PLATEAU[hazard] || [];
  const sets = await Promise.all(urls.map((u) => loadTileset(u, hazard).catch((e) => console.warn(hazard, e))));
  state.areas[hazard] = sets.filter(Boolean);
  // ok only when every river's tileset loaded; otherwise an empty pick can't mean "no flooding".
  state.areaStatus[hazard] = !state.areas[hazard].length ? "failed" : state.areas[hazard].length < urls.length ? "partial" : "ok";
  const st = areaStyle();
  for (const ts of state.areas[hazard]) ts.style = st;
}

// ---- open data (DoboX / GTFS) ----------------------------------------------

async function loadJson(path) {
  try {
    const r = await fetch(path);
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    console.warn("data not available:", path, e);
    return null;
  }
}

function pinCanvas(fill, glyph, ring = "#fff") {
  const c = document.createElement("canvas");
  c.width = 36;
  c.height = 36;
  const g = c.getContext("2d");
  g.fillStyle = fill;
  g.strokeStyle = ring;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(18, 18, 15, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = "#fff";
  g.font = "bold 17px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(glyph, 18, 19);
  return c;
}

async function loadShelters() {
  const gj = await loadJson("data/shelters.geojson");
  if (!gj) return;
  state.shelters = gj.features.map((f) => ({
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    ...f.properties,
  }));
  const ds = new Cesium.CustomDataSource("shelters");
  const icon = pinCanvas(SHELTER_COLOR, "避");
  for (const s of state.shelters) {
    ds.entities.add({
      position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat, 3),
      billboard: {
        image: icon,
        width: 22,
        height: 22,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 1.1, 8000, 0.5),
      },
      properties: { shelter: s },
    });
  }
  state.sheltersDs = ds;
  await viewer.dataSources.add(ds);
}

async function loadStops() {
  const gj = await loadJson("data/tram_stops.geojson");
  if (!gj) return;
  state.stops = gj.features.map((f) => ({
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    ...f.properties,
  }));
  const ds = new Cesium.CustomDataSource("tram");
  const icon = pinCanvas(TRAM_COLOR, "電");
  for (const s of state.stops) {
    ds.entities.add({
      position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat, 2),
      billboard: {
        image: icon,
        width: 16,
        height: 16,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 1, 8000, 0.4),
      },
    });
  }
  state.stopsDs = ds;
  await viewer.dataSources.add(ds);
}

function stageColor(stage) {
  return stage === null || stage === undefined ? STAGE_NONE : STAGE_COLORS[stage];
}

// DoboX 河川水位（scripts/build_river.py が作る data/river.json）。無ければレイヤーは空のまま。
async function loadRiver() {
  const gj = await loadJson("data/river.json");
  if (!gj || !gj.features) return;
  state.river = gj;
  // 日集計の更新が止まっていたら（3 日より古い）、色で「平常」と見せないよう灰色にする。
  const obs = Date.parse(String(gj.observed || "").replace(/\//g, "-"));
  state.riverStale = !Number.isFinite(obs) || Date.now() - obs > 3 * 86400000;
  const ds = new Cesium.CustomDataSource("river");
  const icons = new Map();
  for (const f of gj.features) {
    const p = f.properties;
    const col = state.riverStale ? STAGE_NONE : stageColor(p.stage);
    if (!icons.has(col)) icons.set(col, pinCanvas(col, "水", "#1b1f24"));
    ds.entities.add({
      position: Cesium.Cartesian3.fromDegrees(f.geometry.coordinates[0], f.geometry.coordinates[1], 4),
      billboard: {
        image: icons.get(col),
        width: 26,
        height: 26,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(500, 1.1, 12000, 0.6),
      },
      properties: { river: p },
    });
  }
  state.riverDs = ds;
  await viewer.dataSources.add(ds);
}

async function loadLandslide() {
  const gj = await loadJson("data/landslide.geojson");
  if (!gj) return;
  const ds = await Cesium.GeoJsonDataSource.load(gj, {
    fill: cesiumColor(LANDSLIDE_COLOR, 0.45),
    stroke: cesiumColor("#8a5a1f", 0.9),
    strokeWidth: 1,
    clampToGround: false,
  });
  ds.show = false;
  state.landslide = ds;
  await viewer.dataSources.add(ds);
}

// ---- geometry --------------------------------------------------------------

function nearestStop(lon, lat) {
  let best = null;
  for (const s of state.stops) {
    const d = distanceM(lon, lat, s.lon, s.lat);
    if (!best || d < best.d) best = { ...s, d };
  }
  return best;
}

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// 土砂災害警戒区域のデータの範囲（scripts/build_data.py の BBOX、中・東・南・西区だけ）。
const LANDSLIDE_BBOX = { west: 132.4, east: 132.52, south: 34.33, north: 34.43 };
let landslideGeo = null;
// true = in a zone, false = not in a zone, null = unknown (data not loaded or outside its coverage).
async function inLandslideZone(lon, lat) {
  if (lon < LANDSLIDE_BBOX.west || lon > LANDSLIDE_BBOX.east || lat < LANDSLIDE_BBOX.south || lat > LANDSLIDE_BBOX.north) return null;
  if (landslideGeo === null) landslideGeo = await loadJson("data/landslide.geojson"); // a failed load is retried next time
  if (!landslideGeo) return null;
  for (const f of landslideGeo.features) {
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const p of polys) if (pointInRing(lon, lat, p[0])) return true;
  }
  return false;
}

// ---- selection & result panel ----------------------------------------------

function pickAt(windowPos) {
  const picks = scene.drillPick(windowPos, 8);
  let building = null;
  let area = null;
  let river = null;
  for (const p of picks) {
    if (!river && p.id instanceof Cesium.Entity && p.id.properties && p.id.properties.river) {
      river = p.id.properties.river.getValue();
      continue;
    }
    if (!(p instanceof Cesium.Cesium3DTileFeature)) continue;
    if (p.tileset._kind === "bldg" && !building) building = p;
    else if (p.tileset._kind === state.hazard && !area) area = p;
  }
  return { building, area, river };
}

function cartoAt(windowPos) {
  let cart = scene.pickPositionSupported ? scene.pickPosition(windowPos) : undefined;
  if (!cart) cart = viewer.camera.pickEllipsoid(windowPos, scene.globe.ellipsoid);
  if (!cart) return null;
  const c = Cesium.Cartographic.fromCartesian(cart);
  return { lon: Cesium.Math.toDegrees(c.longitude), lat: Cesium.Math.toDegrees(c.latitude) };
}

function mapCenter() {
  const c = scene.canvas;
  return cartoAt(new Cesium.Cartesian2(c.clientWidth / 2, c.clientHeight / 2)) || { ...START };
}

function areaReady(hz) {
  return state.areaStatus[hz] === "ok" && state.layers.area && state.areas[hz].every((ts) => ts.tilesLoaded);
}

function select(lon, lat, building, area, origin = "selected") {
  const hz = state.hazard;
  // areaHz / areaOk: which hazard the area pick was made for, and whether an empty pick then meant "no flooding".
  state.selection = { lon, lat, building, area, origin, areaHz: hz, areaOk: hz !== "landslide" && areaReady(hz) };
  state.riverSel = null;
  render();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// 名前の表示: その言語の表記（無ければ施設の種類）＋日本語の名前（看板と照らし合わせるため）。
function placeLabel(x) {
  const lang = getLang();
  const local = { en: x.name_en, zh: x.name_zh, ko: x.name_ko }[lang];
  if (lang === "ja-easy") return { main: x.name, sub: x.name_kana && x.name_kana !== x.name ? x.name_kana : "" };
  if (local) return { main: local, sub: x.name };
  return { main: x.name, sub: x.cat ? t("cat_" + x.cat) : "" };
}

function placeHtml(x) {
  const l = placeLabel(x);
  return `${esc(l.main)}${l.sub ? ` <span class="ja" lang="ja">${esc(l.sub)}</span>` : ""}`;
}

const routeEntities = [];
function kindLabel(kind) {
  if (kind === "both") return `${t("kindEmergency")} / ${t("kindShelter")}`;
  return t(kind === "shelter" ? "kindShelter" : "kindEmergency");
}

function hazardName(h) {
  const s = t("hz" + h[0].toUpperCase() + h.slice(1));
  return getLang() === "en" ? s.toLowerCase() : s;
}

function cameraHeadingDeg() {
  return Cesium.Math.toDegrees(viewer.camera.heading);
}

function drawRoutes(sel, shelters) {
  for (const e of routeEntities.splice(0)) markers.remove(e);
  routeEntities.push(
    markers.add({
      position: Cesium.Cartesian3.fromDegrees(sel.lon, sel.lat, 4),
      point: { pixelSize: 14, color: Cesium.Color.fromCssColorString("#b3261e"), outlineColor: Cesium.Color.WHITE, outlineWidth: 3, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    })
  );
  shelters.forEach((s, i) => {
    routeEntities.push(
      markers.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([sel.lon, sel.lat, 4, s.lon, s.lat, 4]),
          width: i === 0 ? 5 : 3,
          material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString(i === 0 ? "#1e7b3a" : "#5b8f6a"), dashLength: 14 }),
          depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString("#1e7b3a").withAlpha(0.6), dashLength: 14 }),
        },
      }),
      markers.add({
        position: Cesium.Cartesian3.fromDegrees(s.lon, s.lat, 6),
        label: {
          text: String(i + 1),
          font: "bold 15px sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromCssColorString("#1e7b3a"),
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    );
  });
  scene.requestRender();
}

// After a hazard switch (or once the area tiles have loaded) pick the hazard area again at the selected spot.
function refreshAreaPick(sel, hz) {
  if (hz === "landslide" || (sel.areaHz === hz && sel.areaOk)) return;
  sel.area = null;
  sel.areaHz = hz;
  sel.areaOk = false;
  if (!areaReady(hz)) return;
  scene.render();
  const win = Cesium.SceneTransforms.worldToWindowCoordinates(scene, Cesium.Cartesian3.fromDegrees(sel.lon, sel.lat, 2));
  const c = scene.canvas;
  if (!win || win.x < 0 || win.y < 0 || win.x > c.clientWidth || win.y > c.clientHeight) return; // off screen: unknown
  sel.area = pickAt(win).area;
  sel.areaOk = true;
}

// Water depth for the selection: { rank, depth, duration, known }.
function depthAt(sel, hz) {
  if (sel.building) {
    const r = buildingRisk(sel.building, hz);
    if (r.known) return { rank: rankFromDepth(r.depth), depth: r.depth, duration: r.duration, known: true };
  }
  if (sel.area && sel.areaHz === hz) return { rank: Math.min(num(sel.area.getProperty("uro:rank_code")) || 0, 6), depth: null, duration: null, known: true };
  // Nothing picked: "no flooding" only if, at pick time, every area tileset of this hazard was loaded,
  // shown and drawn, and the spot is inside the app's area. Otherwise unknown.
  const known = sel.areaHz === hz && sel.areaOk && inBounds(sel.lon, sel.lat);
  return { rank: 0, depth: null, duration: null, known };
}

let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  const box = document.getElementById("result");
  const hint = document.getElementById("hint");
  if (state.riverSel) {
    hint.hidden = true;
    box.hidden = false;
    box.innerHTML = riverHtml(state.riverSel);
    bindClear(box);
    return;
  }
  const sel = state.selection;
  if (!sel) {
    box.hidden = true;
    hint.hidden = false;
    return;
  }
  hint.hidden = true;
  box.hidden = false;
  const hz = state.hazard;
  const parts = [
    `<div class="result-head"><h2>${esc(t("resultTitle"))} — ${esc(t("hz" + hz[0].toUpperCase() + hz.slice(1)))}</h2><button type="button" class="link" data-clear>${esc(t("clear"))}</button></div>`,
  ];

  let d = { rank: 0, depth: null, duration: null, known: false };
  let fl = { floors: null };
  if (sel.building) fl = floorsOf(sel.building);
  if (hz !== "landslide") {
    refreshAreaPick(sel, hz);
    d = depthAt(sel, hz);
  }

  let landslide = false;
  if (hz === "landslide") {
    landslide = (sel.building && buildingRisk(sel.building, "landslide").landslide) || (await inLandslideZone(sel.lon, sel.lat));
    if (seq !== renderSeq) return; // a newer render started while the zones were loading
  }

  if (hz === "landslide") {
    parts.push(
      landslide
        ? `<p class="warn">${esc(t("landslideWarn"))}</p>`
        : landslide === null
          ? `<p class="depth unknown">${esc(t("landslideUnknown"))}</p>`
          : `<p class="depth none">${esc(t("landslideNone"))}</p>`
    );
  } else {
    parts.push(`<p class="note">${esc(t("depthLabel"))}</p>`);
    if (!d.known) {
      parts.push(`<p class="depth unknown">${esc(t("depthUnknown"))}</p>`);
    } else if (d.rank === 0) {
      parts.push(`<p class="depth none">${esc(t("depthNone"))}</p>`);
    } else {
      const label = d.depth !== null ? t("depthM", { d: d.depth.toFixed(1) }) : t("rank")[d.rank];
      parts.push(`<p class="depth ${d.rank >= 3 ? "high" : ""}"><span class="swatch" style="background:${RANK_COLORS[d.rank]};width:18px;height:18px"></span> ${esc(label)}</p>`);
      if (d.depth !== null) parts.push(`<p class="note">${esc(t("rank")[d.rank])}</p>`);
      if (d.duration) parts.push(`<p class="note">${esc(t("duration", { h: Math.round(d.duration) }))}</p>`);
      if (hz === "flood") parts.push(`<p class="note">${esc(t("floodNote"))}</p>`);
    }
  }

  if (sel.building) {
    const bLabel = !fl.floors ? t("buildingUnknown") : fl.estimated ? t("buildingEst", { s: fl.floors, h: fl.height.toFixed(0) }) : t("building", { s: fl.floors });
    parts.push(`<p>${esc(bLabel)}</p>`);
    if (hz !== "landslide" && d.known && d.rank >= 2) {
      const safeFloor = safeFloorFor(d.depth !== null ? d.depth : RANK_MAX_DEPTH[d.rank]);
      if (fl.floors && fl.floors >= safeFloor) parts.push(`<p class="advice">${esc(t("goUp", { f: safeFloor }))}</p>`);
      else if (!fl.floors) parts.push(`<p class="advice">${esc(t("goUpUnknown", { f: safeFloor }))}</p>`);
      else parts.push(`<p class="advice urgent">${esc(t("goUpNo"))}</p>`);
    }
  }

  const shelters = nearestShelters(state.shelters, sel.lon, sel.lat, hz, 3);
  const from = { selected: "fromSelected", here: "fromHere", center: "fromCenter" }[sel.origin] || "fromSelected";
  parts.push(`<h3>${esc(t("shelterFor", { hz: hazardName(hz) }))}</h3><p class="note">${esc(t(from))}</p>`);
  if (shelters.length) {
    const heading = cameraHeadingDeg();
    parts.push(
      '<ol class="shelters">' +
        shelters
          .map(
            (s, i) =>
              `<li><button type="button" data-shelter="${i}">${placeHtml(s)}</button>` +
              `<span class="kind">${esc(kindLabel(s.kind))}</span>` +
              `<span class="dir"><span class="arrow" data-bearing="${s.bearing.toFixed(1)}" style="transform:rotate(${(s.bearing - heading).toFixed(0)}deg)" aria-hidden="true">↑</span>${esc(
                t("dirDist", { dir: t("dir_" + s.dir), dist: formatDistance(s.distance), m: walkMinutes(s.distance) })
              )}</span>` +
              (s.minFloor ? `<span class="floor">${esc(t("minFloor", { f: s.minFloor }))}</span>` : "") +
              `</li>`
          )
          .join("") +
        "</ol>"
    );
  } else {
    parts.push(`<p class="note">${esc(t("shelterNone"))}</p>`);
  }

  const stop = nearestStop(sel.lon, sel.lat);
  if (stop) {
    parts.push(`<h3>${esc(t("tramTitle"))}</h3><p>${placeHtml(stop)} · ${esc(t("walk", { m: walkMinutes(stop.d), km: (stop.d / 1000).toFixed(2) }))}</p>`);
  }

  box.innerHTML = parts.join("");
  box.querySelectorAll("button[data-shelter]").forEach((b) => {
    b.onclick = () => {
      const s = shelters[+b.dataset.shelter];
      flyTo(s.lon, s.lat);
    };
  });
  bindClear(box);
  drawRoutes(sel, shelters);
}

function bindClear(box) {
  const b = box.querySelector("[data-clear]");
  if (b)
    b.onclick = () => {
      state.selection = null;
      state.riverSel = null;
      for (const e of routeEntities.splice(0)) markers.remove(e);
      scene.requestRender();
      render();
    };
}

function fmtLevel(v) {
  return v === null || v === undefined ? "–" : Number(v).toFixed(2);
}

function riverHtml(p) {
  const stages = t("stage");
  const th = p.thresholds || {};
  const names = { standby: 1, caution: 2, evacuate: 3, danger: 4 };
  const thList = Object.entries(names)
    .filter(([k]) => th[k] !== undefined)
    .map(([k, i]) => `${stages[i]} ${fmtLevel(th[k])} m`)
    .join(" / ");
  const st = p.stage === null || p.stage === undefined ? t("stageNone") : stages[p.stage];
  const name = getLang() === "ja-easy" ? p.name : `${p.name}${p.river ? `（${p.river}）` : ""}`;
  const parts = [
    `<div class="result-head"><h2>${esc(t("riverTitle"))}</h2><button type="button" class="link" data-clear>${esc(t("clear"))}</button></div>`,
    `<p class="gauge" lang="ja">${esc(name)}</p>`,
  ];
  if (p.level !== undefined) {
    parts.push(`<p class="depth"><span class="swatch" style="background:${stageColor(p.stage)};width:18px;height:18px"></span> ${esc(st)}</p>`);
    const when = [p.date, p.time].filter(Boolean).join(" ");
    parts.push(`<p>${esc(t("riverLevel", { v: fmtLevel(p.level), t: when || "?" }))}</p>`);
    if (p.max !== undefined) parts.push(`<p class="note">${esc(t("riverMax", { v: fmtLevel(p.max), t: p.max_time || "" }))}</p>`);
  } else parts.push(`<p class="note">${esc(t("riverNoData"))}</p>`);
  parts.push(`<p class="note">${esc(thList ? t("riverThresholds", { list: thList }) : t("riverNoThreshold"))}</p>`);
  parts.push(`<p class="advice">${esc(t("riverDaily", { d: p.date || state.river?.observed || "?" }))}</p>`);
  if (state.riverStale) parts.push(`<p class="warn">${esc(t("riverStale"))}</p>`);
  parts.push(`<p><a href="${RIVER_LIVE_URL}" target="_blank" rel="noopener">${esc(t("riverLive"))}</a></p>`);
  return parts.join("");
}

// Keep the direction arrows pointing the right way on screen when the camera turns.
function updateArrows() {
  const heading = cameraHeadingDeg();
  document.querySelectorAll("#result .arrow[data-bearing]").forEach((a) => {
    a.style.transform = `rotate(${(+a.dataset.bearing - heading).toFixed(0)}deg)`;
  });
}

// Select the spot at lon/lat after the camera has arrived and tiles are loaded.
function selectAfterLoad(lon, lat, origin) {
  const target = Cesium.Cartesian3.fromDegrees(lon, lat, 2);
  let tries = 0;
  const attempt = () => {
    tries++;
    const hz = state.hazard;
    const ready = state.buildings.every((ts) => ts.tilesLoaded) && (hz === "landslide" || state.areas[hz].every((ts) => ts.tilesLoaded));
    if (!ready && tries < 40) {
      scene.requestRender();
      setTimeout(attempt, 250);
      return;
    }
    scene.render();
    const win = Cesium.SceneTransforms.worldToWindowCoordinates(scene, target);
    const { building, area } = win ? pickAt(win) : {};
    select(lon, lat, building || null, area || null, origin);
  };
  attempt();
}

function goTo(lon, lat, origin = "selected") {
  flyTo(lon, lat, () => selectAfterLoad(lon, lat, origin));
}

// ---- UI --------------------------------------------------------------------

function inBounds(lon, lat) {
  return lon > BOUNDS.west && lon < BOUNDS.east && lat > BOUNDS.south && lat < BOUNDS.north;
}

// 現在地から（許可が無い・範囲外なら地図の中心から）近くの避難場所を出す。
function nearMe() {
  const fromCenter = (msg) => {
    if (msg) toast(msg);
    const c = mapCenter();
    goTo(c.lon, c.lat, "center");
  };
  if (!navigator.geolocation) return fromCenter(t("geoDenied"));
  toast(t("locating"), 4000);
  navigator.geolocation.getCurrentPosition(
    (p) => {
      const { longitude: lon, latitude: lat } = p.coords;
      if (inBounds(lon, lat)) goTo(lon, lat, "here");
      else fromCenter(t("outsideCenter"));
    },
    () => fromCenter(t("geoDenied")),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

function fillLangSelect(sel) {
  sel.innerHTML = LANGS.map((l) => `<option value="${l.code}">${l.label}</option>`).join("");
  sel.value = getLang();
  sel.onchange = () => {
    setLang(sel.value);
    translate();
  };
}

function showOnboarding(force = false) {
  const d = document.getElementById("onboarding");
  let seen = false;
  try {
    seen = localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch (_) {}
  if (seen && !force) return;
  document.getElementById("onb-lang").value = getLang();
  d.showModal();
  d.addEventListener(
    "close",
    () => {
      try {
        localStorage.setItem(ONBOARDED_KEY, "1");
      } catch (_) {}
    },
    { once: true }
  );
}

function buildControls() {
  fillLangSelect(document.getElementById("lang-select"));
  fillLangSelect(document.getElementById("onb-lang"));

  document.getElementById("btn-near").onclick = nearMe;
  document.getElementById("btn-help").onclick = () => showOnboarding(true);

  document.getElementById("spot-select").onchange = (e) => {
    const k = e.target.value;
    if (SPOTS[k]) goTo(...SPOTS[k]);
  };

  document.getElementById("btn-sources").onclick = () => document.getElementById("sources-dialog").showModal();

  // Phones: start with the panels folded so the map stays visible.
  document.getElementById("legend-panel").open = !isNarrow();

  const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
  handler.setInputAction((e) => {
    const { building, area, river } = pickAt(e.position);
    if (river) {
      state.riverSel = river;
      render();
      return;
    }
    const c = cartoAt(e.position);
    if (!c) return;
    select(c.lon, c.lat, building, area);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  viewer.camera.moveEnd.addEventListener(updateArrows);
}

async function setHazard(h) {
  state.hazard = h;
  translate();
  if (h !== "landslide") await loadAreas(h);
  if (h !== "landslide" && (state.areaStatus[h] === "failed" || state.areaStatus[h] === "partial")) toast(t("hazardLoadFailed"));
  applyStyles();
  render();
}

const LAYER_DEFS = [
  { key: "buildings", label: "layerBuildings", swatch: RANK_COLORS[3] },
  { key: "area", label: null, swatch: RANK_COLORS[2] },
  { key: "landslide", label: "layerLandslide", swatch: LANDSLIDE_COLOR },
  { key: "river", label: "layerRiver", swatch: STAGE_COLORS[0] },
  { key: "shelters", label: "layerShelters", swatch: SHELTER_COLOR },
  { key: "tram", label: "layerTram", swatch: TRAM_COLOR },
];

function legendHtml() {
  const rows = [];
  if (state.hazard === "landslide") {
    rows.push(`<li><span class="swatch" style="background:${LANDSLIDE_COLOR}"></span>${esc(t("legendLandslide"))}</li>`);
  } else if (state.colorMode === "refuge") {
    rows.push(`<li><span class="swatch" style="background:${REFUGE_OK}"></span>${esc(t("legendOk"))}</li>`);
    rows.push(`<li><span class="swatch" style="background:${REFUGE_NG}"></span>${esc(t("legendNg"))}</li>`);
  } else {
    rows.push(
      `<li class="ramp">${RANK_COLORS.slice(1)
        .map((c, i) => `<span><span class="swatch" style="background:${c}"></span>${esc(t("rank")[i + 1])}</span>`)
        .join("")}</li>`
    );
  }
  rows.push(`<li><span class="pin" style="background:${SHELTER_COLOR}">避</span>${esc(t("legendShelter"))}</li>`);
  rows.push(`<li><span class="pin small" style="background:${TRAM_COLOR}">電</span>${esc(t("legendTram"))}</li>`);
  const stages = t("stage");
  rows.push(
    `<li class="ramp"><span class="lbl">${esc(t("legendRiver"))}</span>${STAGE_COLORS.map(
      (c, i) => `<span><span class="pin small ring" style="background:${c}">水</span>${esc(stages[i])}</span>`
    ).join("")}<span><span class="pin small ring" style="background:${STAGE_NONE}">水</span>${esc(t("stageNone"))}</span></li>`
  );
  if (!state.river) rows.push(`<li class="note">${esc(t("riverNoData"))}</li>`);
  else if (state.river.observed) rows.push(`<li class="note">${esc(t("riverDaily", { d: state.river.observed }))}</li>`);
  if (state.river && state.riverStale) rows.push(`<li class="note warn-text">${esc(t("riverStale"))}</li>`);
  return `<ul class="legend-list">${rows.join("")}</ul>`;
}

function translate() {
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
    el.title = t(el.dataset.i18nAria);
  });
  for (const id of ["lang-select", "onb-lang"]) document.getElementById(id).value = getLang();
  updateLoading();

  const spotSel = document.getElementById("spot-select");
  const prev = spotSel.value;
  spotSel.innerHTML = `<option value="">${t("spots")}</option>` + Object.keys(SPOTS).map((k) => `<option value="${k}">${t("spot_" + k)}</option>`).join("");
  spotSel.value = prev;

  const hg = document.getElementById("hazard-group");
  hg.setAttribute("aria-label", t("hazard"));
  hg.innerHTML = HAZARDS.map(
    (h) => `<button type="button" role="radio" aria-checked="${h === state.hazard}" data-hz="${h}">${t("hz" + h[0].toUpperCase() + h.slice(1))}</button>`
  ).join("");
  hg.querySelectorAll("button").forEach((b) => (b.onclick = () => setHazard(b.dataset.hz)));

  const areaLabel = { flood: "layerFlood", surge: "layerSurge", tsunami: "layerTsunami", landslide: "layerLandslide" }[state.hazard];
  const ll = document.getElementById("layer-list");
  ll.innerHTML = LAYER_DEFS.filter((d) => !(d.key === "area" && state.hazard === "landslide"))
    .map(
      (d) =>
        `<label><input type="checkbox" data-layer="${d.key}" ${state.layers[d.key] ? "checked" : ""}><span class="swatch" style="background:${d.swatch}"></span>${esc(
          t(d.label || areaLabel)
        )}</label>`
    )
    .join("");
  if (state.hazard !== "landslide") {
    ll.insertAdjacentHTML(
      "afterbegin",
      `<div class="mode" role="radiogroup">${["depth", "refuge"]
        .map((m) => `<label><input type="radio" name="cmode" value="${m}" ${state.colorMode === m ? "checked" : ""}>${esc(t(m === "depth" ? "modeDepth" : "modeRefuge"))}</label>`)
        .join("")}</div>`
    );
    ll.querySelectorAll("input[name=cmode]").forEach(
      (i) =>
        (i.onchange = () => {
          state.colorMode = i.value;
          applyStyles();
          translate();
        })
    );
  }
  ll.querySelectorAll("input[data-layer]").forEach(
    (i) =>
      (i.onchange = () => {
        state.layers[i.dataset.layer] = i.checked;
        applyStyles();
      })
  );
  document.getElementById("legend").innerHTML = legendHtml();

  document.getElementById("sources-body").innerHTML = sourcesHtml();
  render();
}

function sourcesHtml() {
  const river = state.river?.observed ? `（${esc(state.river.observed)} の水位日集計）` : "（未取得）";
  return `
<h2>Data / データ</h2>
<ul>
  <li>3D都市モデル（建築物・洪水/高潮/津波浸水想定区域）: 国土交通省 Project PLATEAU（広島市 2024年度）。<a href="https://www.mlit.go.jp/plateau/site-policy/" target="_blank" rel="noopener">利用規約</a></li>
  <li>避難所: 出典 広島県インフラマネジメント基盤（DoboX）／広島県 危機管理課「避難所情報」（CC BY 4.0、加工して作成）</li>
  <li>指定緊急避難場所: 国土地理院「指定緊急避難場所データ」（広島市）を加工して作成</li>
  <li>避難場所名の英・中・韓表記: 作者が読みから作成（ローマ字・ハングル・簡体字の字形＋施設の種類。機械翻訳は使っていない）</li>
  <li>河川水位: 出典 広島県インフラマネジメント基盤（DoboX）／広島県「観測情報_観測所一覧」「観測情報_水位日集計」${river}（加工して作成）。1 日 1 回の集計で、リアルタイムではない。最新は<a href="${RIVER_LIVE_URL}" target="_blank" rel="noopener">広島県河川防災情報システム</a></li>
  <li>土砂災害警戒区域: 出典 広島県インフラマネジメント基盤（DoboX）／広島県 砂防課（CC BY 4.0、中・東・南・西区を加工して作成）</li>
  <li>路面電車の停留場: 国土数値情報（鉄道データ N02、国土交通省、CC BY 4.0）。停留場名の英・中・韓訳: 広島電鉄 GTFS-JP（広島県バス協会、CC0）と作者による訳</li>
  <li>背景地図: 地理院タイル（淡色地図）</li>
  <li>3D 表示: CesiumJS（Apache-2.0）</li>
</ul>
<p>浸水深は想定最大規模（L2）の予測値。距離は直線距離で、実際の道のりは長くなる。避難の判断は広島市の発表に従ってください。データの作成日は data/README.md を参照。</p>`;
}

// ---- boot ------------------------------------------------------------------

async function main() {
  setLang(new URLSearchParams(location.search).get("lang") || initialLang());
  buildControls();
  translate();
  updateLoading();
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(START.lon - 0.002, START.lat - 0.016, 1500),
    orientation: { heading: Cesium.Math.toRadians(8), pitch: Cesium.Math.toRadians(-40), roll: 0 },
  });
  showOnboarding();

  const results = await Promise.allSettled(PLATEAU.buildings.map((b) => loadTileset(b.url, "bldg")));
  state.buildings = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  state.buildingsFailed = state.buildings.length === 0;
  await Promise.all([loadAreas("flood"), loadShelters(), loadStops(), loadLandslide(), loadRiver()]);
  applyStyles();
  bootDone = true;
  updateLoading();
  translate(); // legend / sources now know about the river data
  if (state.buildingsFailed) toast(t("loadFailed"), 10000);
  // Keep redrawing for a few seconds while the first tiles stream in.
  const kick = setInterval(() => scene.requestRender(), 500);
  setTimeout(() => clearInterval(kick), 8000);

  const spot = new URLSearchParams(location.search).get("spot");
  if (spot && SPOTS[spot]) goTo(...SPOTS[spot]);
}

main().catch((e) => {
  console.error(e);
  document.getElementById("loading-text").textContent = "Error: " + e.message;
});

window.__app = { state, viewer };
