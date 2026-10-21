import { PLATEAU } from "./plateau-urls.js";
import { LANGS, setLang, getLang, initialLang, t } from "./i18n.js";

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
const WALK_M_PER_MIN = 67; // slower than the usual 80 m/min: unfamiliar visitors, luggage

// 浸水深の配色（水害ハザードマップ作成の手引きの凡例色）。index = uro:rank_code
const RANK_COLORS = ["#E8ECF0", "#F7F5A9", "#FFD8C0", "#FFB7B7", "#FF9191", "#F285C9", "#DC7ADC"];
const RANK_MAX_DEPTH = [0, 0.5, 3, 5, 10, 20, 30];
const LANDSLIDE_COLOR = "#D9A35B";
const REFUGE_OK = "#2E9D5B";
const REFUGE_NG = "#D2453A";
const FLOOR_HEIGHT_M = 3.3;

// ---- state -----------------------------------------------------------------

const state = {
  hazard: "flood",
  buildings: [],
  areas: { flood: [], surge: [], tsunami: [] },
  landslide: null,
  shelters: [],
  stops: [],
  sheltersDs: null,
  stopsDs: null,
  selection: null, // { lon, lat, building, area }
  layers: { buildings: true, area: true, landslide: false, shelters: true, tram: true },
  colorMode: "depth", // "depth" | "refuge"
};

// ---- viewer ----------------------------------------------------------------

Cesium.Ion.defaultAccessToken = "";

const viewer = new Cesium.Viewer("viewer", {
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
const scene = viewer.scene;
scene.globe.depthTestAgainstTerrain = false;
scene.skyAtmosphere.show = false;
scene.fog.enabled = false;
viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);

const markers = viewer.entities;

function flyTo(lon, lat, done) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon - 0.0009, lat - 0.0062, 620),
    orientation: { heading: Cesium.Math.toRadians(8), pitch: Cesium.Math.toRadians(-42), roll: 0 },
    duration: 1.6,
    complete: done,
  });
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
  ts.allTilesLoaded.addEventListener(() => scene.requestRender());
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
  return { depth, duration };
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
  scene.requestRender();
}

async function loadAreas(hazard) {
  if (state.areas[hazard].length) return;
  const urls = PLATEAU[hazard] || [];
  const sets = await Promise.all(urls.map((u) => loadTileset(u, hazard).catch((e) => console.warn(hazard, e))));
  state.areas[hazard] = sets.filter(Boolean);
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

function pinCanvas(fill, glyph) {
  const c = document.createElement("canvas");
  c.width = 36;
  c.height = 36;
  const g = c.getContext("2d");
  g.fillStyle = fill;
  g.strokeStyle = "#fff";
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
  const icon = pinCanvas("#1e7b3a", "避");
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
  const icon = pinCanvas("#0b5cad", "電");
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

function distM(aLon, aLat, bLon, bLat) {
  const R = 6371000;
  const toR = Math.PI / 180;
  const dLat = (bLat - aLat) * toR;
  const dLon = (bLon - aLon) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toR) * Math.cos(bLat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearest(list, lon, lat, n, filter = () => true) {
  return list
    .filter(filter)
    .map((x) => ({ ...x, d: distM(lon, lat, x.lon, x.lat) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n);
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

let landslideGeo = null;
async function inLandslideZone(lon, lat) {
  if (landslideGeo === null) landslideGeo = (await loadJson("data/landslide.geojson")) || { features: [] };
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
  for (const p of picks) {
    if (!(p instanceof Cesium.Cesium3DTileFeature)) continue;
    if (p.tileset._kind === "bldg" && !building) building = p;
    else if (p.tileset._kind === state.hazard && !area) area = p;
  }
  return { building, area };
}

function cartoAt(windowPos) {
  let cart = scene.pickPositionSupported ? scene.pickPosition(windowPos) : undefined;
  if (!cart) cart = viewer.camera.pickEllipsoid(windowPos, scene.globe.ellipsoid);
  if (!cart) return null;
  const c = Cesium.Cartographic.fromCartesian(cart);
  return { lon: Cesium.Math.toDegrees(c.longitude), lat: Cesium.Math.toDegrees(c.latitude) };
}

function select(lon, lat, building, area) {
  state.selection = { lon, lat, building, area };
  render();
}

function walkMin(d) {
  return Math.max(1, Math.round(d / WALK_M_PER_MIN));
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function placeName(x) {
  const lang = getLang();
  if (lang === "en" && x.name_en) return x.name_en;
  if (lang === "zh" && x.name_zh) return x.name_zh;
  if (lang === "ko" && x.name_ko) return x.name_ko;
  if (lang === "ja-easy" && x.name_kana) return `${x.name}（${x.name_kana}）`;
  if (lang !== "ja-easy" && x.name_en) return `${x.name_en}（${x.name}）`;
  return x.name;
}

const routeEntities = [];
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
      })
    );
  });
  scene.requestRender();
}

async function render() {
  const sel = state.selection;
  const box = document.getElementById("result");
  const hint = document.getElementById("hint");
  if (!sel) {
    box.hidden = true;
    hint.hidden = false;
    return;
  }
  hint.hidden = true;
  box.hidden = false;
  const hz = state.hazard;
  const parts = [`<h2>${esc(t("resultTitle"))} — ${esc(t("hz" + hz[0].toUpperCase() + hz.slice(1)))}</h2>`];

  let depth = null;
  let duration = null;
  let rank = 0;
  let fl = { floors: null };
  if (sel.building) {
    fl = floorsOf(sel.building);
    if (hz !== "landslide") {
      const r = buildingRisk(sel.building, hz);
      depth = r.depth;
      duration = r.duration;
      rank = rankFromDepth(depth);
    }
  } else if (sel.area && hz !== "landslide") {
    rank = Math.min(num(sel.area.getProperty("uro:rank_code")) || 0, 6);
  }

  const landslide = hz === "landslide"
    ? (sel.building && buildingRisk(sel.building, "landslide").landslide) || (await inLandslideZone(sel.lon, sel.lat))
    : false;

  if (hz === "landslide") {
    parts.push(landslide ? `<p class="warn">${esc(t("landslideWarn"))}</p>` : `<p class="depth none">${esc(t("depthNone"))}</p>`);
  } else {
    parts.push(`<p class="note">${esc(t("depthLabel"))}</p>`);
    if (rank === 0) {
      parts.push(`<p class="depth none">${esc(t("depthNone"))}</p>`);
    } else {
      const label = depth !== null ? t("depthM", { d: depth.toFixed(1) }) : t("rank")[rank];
      parts.push(`<p class="depth ${rank >= 3 ? "high" : ""}"><span class="swatch" style="background:${RANK_COLORS[rank]};width:18px;height:18px"></span> ${esc(label)}</p>`);
      if (depth !== null) parts.push(`<p class="note">${esc(t("rank")[rank])}</p>`);
      if (duration) parts.push(`<p class="note">${esc(t("duration", { h: Math.round(duration) }))}</p>`);
      if (hz === "flood") parts.push(`<p class="note">${esc(t("floodNote"))}</p>`);
    }
  }

  if (sel.building) {
    const bLabel = !fl.floors ? t("buildingUnknown") : fl.estimated ? t("buildingEst", { s: fl.floors, h: fl.height.toFixed(0) }) : t("building", { s: fl.floors });
    parts.push(`<p>${esc(bLabel)}</p>`);
    if (hz !== "landslide" && rank >= 2) {
      const safeFloor = safeFloorFor(depth !== null ? depth : RANK_MAX_DEPTH[rank]);
      if (fl.floors && fl.floors >= safeFloor) parts.push(`<p class="advice">${esc(t("goUp", { f: safeFloor }))}</p>`);
      else if (!fl.floors) parts.push(`<p class="advice">${esc(t("goUpUnknown", { f: safeFloor }))}</p>`);
      else parts.push(`<p class="advice urgent">${esc(t("goUpNo"))}</p>`);
    }
  }

  const hzKey = hz === "surge" ? "surge" : hz;
  const shelters = nearest(state.shelters, sel.lon, sel.lat, 3, (s) => !s.hz || s.hz[hzKey] !== false);
  parts.push(`<h3>${esc(t("shelterTitle"))}</h3>`);
  if (shelters.length) {
    parts.push(
      "<ol>" +
        shelters
          .map(
            (s, i) =>
              `<li><button type="button" data-shelter="${i}">${esc(placeName(s))}</button><br><span class="kind">${esc(t(s.kind === "shelter" ? "kindShelter" : "kindEmergency"))}</span> · ${esc(
                t("walk", { m: walkMin(s.d), km: (s.d / 1000).toFixed(2) })
              )}</li>`
          )
          .join("") +
        "</ol>"
    );
  } else {
    parts.push(`<p class="note">${esc(t("shelterNone"))}</p>`);
  }

  const stop = nearest(state.stops, sel.lon, sel.lat, 1)[0];
  if (stop) {
    parts.push(`<h3>${esc(t("tramTitle"))}</h3><p>${esc(placeName(stop))} · ${esc(t("walk", { m: walkMin(stop.d), km: (stop.d / 1000).toFixed(2) }))}</p>`);
  }

  box.innerHTML = parts.join("");
  box.querySelectorAll("button[data-shelter]").forEach((b) => {
    b.onclick = () => {
      const s = shelters[+b.dataset.shelter];
      flyTo(s.lon, s.lat);
    };
  });
  drawRoutes(sel, shelters);
}

// Select the spot at lon/lat after the camera has arrived and tiles are loaded.
function selectAfterLoad(lon, lat) {
  const target = Cesium.Cartesian3.fromDegrees(lon, lat, 2);
  let tries = 0;
  const attempt = () => {
    tries++;
    const ready = state.buildings.every((ts) => ts.tilesLoaded);
    if (!ready && tries < 40) {
      scene.requestRender();
      setTimeout(attempt, 250);
      return;
    }
    scene.render();
    const win = Cesium.SceneTransforms.worldToWindowCoordinates(scene, target);
    const { building, area } = win ? pickAt(win) : {};
    select(lon, lat, building || null, area || null);
  };
  attempt();
}

function goTo(lon, lat) {
  flyTo(lon, lat, () => selectAfterLoad(lon, lat));
}

// ---- UI --------------------------------------------------------------------

function inBounds(lon, lat) {
  return lon > BOUNDS.west && lon < BOUNDS.east && lat > BOUNDS.south && lat < BOUNDS.north;
}

function buildControls() {
  const langSel = document.getElementById("lang-select");
  langSel.innerHTML = LANGS.map((l) => `<option value="${l.code}">${l.label}</option>`).join("");
  langSel.value = getLang();
  langSel.onchange = () => {
    setLang(langSel.value);
    translate();
  };

  document.getElementById("btn-locate").onclick = () => {
    if (!navigator.geolocation) return alert(t("geoError"));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { longitude: lon, latitude: lat } = p.coords;
        if (inBounds(lon, lat)) goTo(lon, lat);
        else {
          alert(t("outside"));
          goTo(...SPOTS.peace);
        }
      },
      () => alert(t("geoError")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  document.getElementById("spot-select").onchange = (e) => {
    const k = e.target.value;
    if (SPOTS[k]) goTo(...SPOTS[k]);
  };

  document.getElementById("btn-sources").onclick = () => document.getElementById("sources-dialog").showModal();

  const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
  handler.setInputAction((e) => {
    const c = cartoAt(e.position);
    if (!c) return;
    const { building, area } = pickAt(e.position);
    select(c.lon, c.lat, building, area);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

async function setHazard(h) {
  state.hazard = h;
  if (h !== "landslide") await loadAreas(h);
  applyStyles();
  translate();
  render();
}

const LAYER_DEFS = [
  { key: "buildings", label: "layerBuildings", swatch: RANK_COLORS[3] },
  { key: "area", label: null, swatch: RANK_COLORS[2] },
  { key: "landslide", label: "layerLandslide", swatch: LANDSLIDE_COLOR },
  { key: "shelters", label: "layerShelters", swatch: "#1e7b3a" },
  { key: "tram", label: "layerTram", swatch: "#0b5cad" },
];

function translate() {
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));

  const spotSel = document.getElementById("spot-select");
  const prev = spotSel.value;
  spotSel.innerHTML = `<option value="">${t("spots")}</option>` + Object.keys(SPOTS).map((k) => `<option value="${k}">${t("spot_" + k)}</option>`).join("");
  spotSel.value = prev;

  const hg = document.getElementById("hazard-group");
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
        .join("")}</div>` +
        (state.colorMode === "refuge"
          ? `<p class="legend"><span class="swatch" style="background:${REFUGE_OK}"></span>${esc(t("legendOk"))} <span class="swatch" style="background:${REFUGE_NG}"></span>${esc(t("legendNg"))}</p>`
          : `<p class="legend">${RANK_COLORS.slice(1).map((c, i) => `<span class="swatch" style="background:${c}"></span>${esc(t("rank")[i + 1])}`).join(" ")}</p>`)
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

  document.getElementById("sources-body").innerHTML = SOURCES_HTML;
  render();
}

const SOURCES_HTML = `
<h2>Data / データ</h2>
<ul>
  <li>3D都市モデル（建築物・洪水/高潮/津波浸水想定区域）: 国土交通省 Project PLATEAU（広島市 2024年度）。<a href="https://www.mlit.go.jp/plateau/site-policy/" target="_blank">利用規約</a></li>
  <li>避難場所・土砂災害警戒区域: 広島県 DoboX（<a href="https://hiroshima-dobox.jp/" target="_blank">hiroshima-dobox.jp</a>）。出典は data/README.md を参照</li>
  <li>路面電車の停留所: 広島電鉄 GTFS-JP</li>
  <li>背景地図: 地理院タイル（淡色地図）</li>
  <li>3D 表示: CesiumJS（Apache-2.0）</li>
</ul>
<p>浸水深は想定最大規模（L2）の予測値。避難の判断は広島市の発表に従ってください。</p>`;

// ---- boot ------------------------------------------------------------------

async function main() {
  setLang(new URLSearchParams(location.search).get("lang") || initialLang());
  buildControls();
  translate();
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(START.lon - 0.002, START.lat - 0.016, 1500),
    orientation: { heading: Cesium.Math.toRadians(8), pitch: Cesium.Math.toRadians(-40), roll: 0 },
  });

  const loading = document.getElementById("loading");
  const results = await Promise.allSettled(PLATEAU.buildings.map((b) => loadTileset(b.url, "bldg")));
  state.buildings = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  await Promise.all([loadAreas("flood"), loadShelters(), loadStops(), loadLandslide()]);
  applyStyles();
  loading.hidden = true;
  // Keep redrawing for a few seconds while the first tiles stream in.
  const kick = setInterval(() => scene.requestRender(), 500);
  setTimeout(() => clearInterval(kick), 8000);

  const spot = new URLSearchParams(location.search).get("spot");
  if (spot && SPOTS[spot]) goTo(...SPOTS[spot]);
}

main().catch((e) => {
  console.error(e);
  document.getElementById("loading").textContent = "Error: " + e.message;
});

window.__app = { state, viewer };
