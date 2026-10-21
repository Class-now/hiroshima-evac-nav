#!/usr/bin/env python3
"""Build the small GeoJSON files in data/ from open data (stdlib only).

Usage:
  python3 -I scripts/build_data.py --raw <download dir> [--fetch]

--fetch downloads the sources into <download dir> first (about 33 MB in total).
Outputs (central Hiroshima: Naka, Higashi, Minami, Nishi wards):
  data/shelters.geojson   DoboX shelters + GSI designated emergency evacuation sites
  data/tram_stops.geojson Hiroden streetcar stops (MLIT N02) with names from Hiroden GTFS-JP
  data/landslide.geojson  DoboX sediment-disaster warning zones (yellow), clipped to the centre
"""
import argparse
import csv
import io
import json
import math
import re
import struct
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data"

WARDS = {"341011": "中区", "341029": "東区", "341037": "南区", "341045": "西区"}
# Landslide zones are only kept inside this box (the area the app shows).
BBOX = (132.40, 34.33, 132.52, 34.43)

SOURCES = {
    "dobox_shelters.json": "https://hiroshima-dobox.jp/resource_download/109",
    "gsi_34100_2.geojson": "https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData/geoJSON/34100_2.geojson",
    "n02.zip": "https://nlftp.mlit.go.jp/ksj/gml/data/N02/N02-25/N02-25_GML.zip",
    "gtfs.zip": "https://ajt-mobusta-gtfs.mcapps.jp/static/8/current_data.zip",
}
# DoboX resource ids per ward: debris flow / steep slope (landslide layers are empty here).
for code, (debris, steep) in {
    "341011": (31301, 31331),
    "341029": (31302, 31332),
    "341037": (31303, 31333),
    "341045": (31304, 31334),
}.items():
    SOURCES[f"ls_{debris}.zip"] = f"https://hiroshima-dobox.jp/resource_download/{debris}"
    SOURCES[f"ls_{steep}.zip"] = f"https://hiroshima-dobox.jp/resource_download/{steep}"


def fetch(raw: Path):
    raw.mkdir(parents=True, exist_ok=True)
    for name, url in SOURCES.items():
        print("fetch", url)
        with urllib.request.urlopen(url, timeout=300) as r:
            (raw / name).write_bytes(r.read())


def r6(x):
    return round(x, 6)


def write(name, features):
    gj = {"type": "FeatureCollection", "features": features}
    p = OUT / name
    p.write_text(json.dumps(gj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{name}: {len(features)} features, {p.stat().st_size // 1024} KB")


# ---- shelters ---------------------------------------------------------------

WARD_RE = re.compile(r"(^|県|市)(中|東|南|西)区")


CATEGORIES = [
    ("elementary", r"小学校"),
    ("juniorhigh", r"中学校"),
    ("highschool", r"(高等学校|高校)"),
    ("university", r"大学"),
    ("school", r"(学校|学園|学院)"),
    ("children", r"児童館"),
    ("nursery", r"(保育園|幼稚園|こども園|保育所)"),
    ("hall", r"(集会所|集会場)"),
    ("community", r"(公民館|コミュニティ|市民センター|交流センター|会館)"),
    ("library", r"図書館"),
    ("culture", r"(文化センター|ホール|プラザ)"),
    ("park", r"(公園|広場|緑地|城跡|縮景園)"),
    ("sports", r"(体育館|スポーツ|運動場|グラウンド|グランド|スタジアム|球場|競輪場)"),
    ("welfare", r"(福祉|老人|ケア)"),
]


def category(name):
    return next((k for k, rx in CATEGORIES if re.search(rx, name)), None)


def norm(name):
    return re.sub(r"[\s　（）()・]", "", name)


def build_shelters(raw: Path):
    places = {}

    gsi = json.loads((raw / "gsi_34100_2.geojson").read_text(encoding="utf-8"))
    for f in gsi["features"]:
        p = f["properties"]
        if not WARD_RE.search(p.get("住所", "")):
            continue
        lon, lat = f["geometry"]["coordinates"]
        yes = lambda k: p.get(k) == "1"
        places[norm(p["施設・場所名"])] = {
            "lon": lon,
            "lat": lat,
            "name": p["施設・場所名"],
            "kind": "emergency",
            "hz": {
                "flood": yes("洪水"),
                "surge": yes("高潮"),
                "tsunami": yes("津波"),
                "landslide": yes("崖崩れ、土石流及び地滑り"),
            },
            "note": p.get("備考") or "",
            "src": "gsi",
        }

    dobox = json.loads((raw / "dobox_shelters.json").read_text(encoding="utf-8"))
    for s in dobox["items"]:
        if s["municipalityCd"] not in WARDS:
            continue
        key = norm(s["name"])
        if key in places:
            # Same facility is both an emergency site and an overnight shelter.
            places[key]["kind"] = "both"
            places[key]["capacity"] = s.get("capacity")
            places[key]["src"] = "gsi+dobox"
            continue
        places[key] = {
            "lon": float(s["longitude"]),
            "lat": float(s["latitude"]),
            "name": s["name"],
            "kind": "shelter",
            "hz": {
                "flood": s["floodShFlg"] == "1",
                "surge": s["stormSurgeShFlg"] == "1",
                "tsunami": s["tsunamiShFlg"] == "1",
                "landslide": s["sedimentDisasterShFlg"] == "1",
            },
            "capacity": s.get("capacity"),
            "src": "dobox",
        }

    feats = []
    for v in sorted(places.values(), key=lambda v: v["name"]):
        lon, lat = v.pop("lon"), v.pop("lat")
        if category(v["name"]):
            v["cat"] = category(v["name"])
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [r6(lon), r6(lat)]}, "properties": v})
    write("shelters.geojson", feats)


# ---- streetcar stops ----------------------------------------------------------


def gtfs_names(raw: Path):
    z = zipfile.ZipFile(raw / "gtfs.zip")
    rows = csv.DictReader(io.StringIO(z.read("translations.txt").decode("utf-8-sig")))
    names = {}
    for r in rows:
        # GTFS-JP style (trans_id = Japanese text) and GTFS style (field_value) both appear in the wild.
        key = r.get("trans_id") or r.get("field_value")
        if key:
            names.setdefault(key, {})[r["lang"]] = r["translation"]
    return names


def build_stops(raw: Path):
    z = zipfile.ZipFile(raw / "n02.zip")
    st = json.loads(z.read("N02-25_GML/UTF-8/N02-25_Station.geojson"))
    tr = gtfs_names(raw)
    manual = json.loads((ROOT / "scripts" / "tram_names_manual.json").read_text(encoding="utf-8"))
    lang_map = {"en": "name_en", "ko": "name_ko", "zh-cn": "name_zh", "zh-CN": "name_zh", "ja-Hrkt": "name_kana"}

    stops = []
    for f in st["features"]:
        p = f["properties"]
        if p.get("N02_004") != "広島電鉄":
            continue
        cs = f["geometry"]["coordinates"]
        lon = sum(c[0] for c in cs) / len(cs)
        lat = sum(c[1] for c in cs) / len(cs)
        if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
            continue
        name = p["N02_005"]
        dup = next((s for s in stops if s["name"] == name and abs(s["lon"] - lon) < 0.002 and abs(s["lat"] - lat) < 0.002), None)
        if dup:
            dup["lines"].append(p["N02_003"])
            continue
        s = {"lon": lon, "lat": lat, "name": name, "lines": [p["N02_003"]]}
        t = tr.get(name) or tr.get(name + "（電停）") or tr.get(name + "電停")
        for lang, field in lang_map.items():
            if t and t.get(lang):
                s[field] = t[lang]
        if "name_en" not in s and name in manual:
            s.update(manual[name])
            s["names_src"] = "manual"
        stops.append(s)

    feats = []
    for s in sorted(stops, key=lambda s: s["name"]):
        lon, lat = s.pop("lon"), s.pop("lat")
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [r6(lon), r6(lat)]}, "properties": s})
    named = sum(1 for f in feats if "name_en" in f["properties"])
    print(f"tram stops with English name from GTFS: {named}/{len(feats)}")
    write("tram_stops.geojson", feats)


# ---- landslide zones (minimal Shapefile reader) -----------------------------


def read_dbf(b):
    n, hlen, rlen = struct.unpack("<IHH", b[4:12])
    fields, pos = [], 32
    while b[pos] != 0x0D:
        name = b[pos : pos + 11].split(b"\0")[0].decode("ascii")
        fields.append((name, b[pos + 16]))
        pos += 32
    out = []
    for i in range(n):
        rec = b[hlen + i * rlen : hlen + (i + 1) * rlen]
        off, row = 1, {}
        for name, size in fields:
            row[name] = rec[off : off + size].decode("utf-8", "replace").strip()
            off += size
        out.append(row)
    return out


def read_shp_polygons(b):
    pos, polys = 100, []
    while pos < len(b):
        _, clen = struct.unpack(">ii", b[pos : pos + 8])
        rec = b[pos + 8 : pos + 8 + clen * 2]
        pos += 8 + clen * 2
        stype = struct.unpack("<i", rec[:4])[0]
        if stype == 0:
            polys.append([])
            continue
        nparts, npts = struct.unpack("<ii", rec[36:44])
        parts = list(struct.unpack(f"<{nparts}i", rec[44 : 44 + 4 * nparts])) + [npts]
        base = 44 + 4 * nparts
        pts = [struct.unpack("<dd", rec[base + 16 * k : base + 16 * k + 16]) for k in range(npts)]
        polys.append([[[r6(x), r6(y)] for x, y in pts[parts[k] : parts[k + 1]]] for k in range(nparts)])
    return polys


def simplify(ring, tol=1.5e-5):
    """Douglas-Peucker on a closed ring (tol in degrees, about 1.5 m)."""
    if len(ring) <= 5:
        return ring

    def dp(pts):
        (x1, y1), (x2, y2) = pts[0], pts[-1]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy) or 1e-12
        best, idx = 0, 0
        for i in range(1, len(pts) - 1):
            d = abs(dy * (pts[i][0] - x1) - dx * (pts[i][1] - y1)) / L
            if d > best:
                best, idx = d, i
        if best <= tol:
            return [pts[0], pts[-1]]
        return dp(pts[: idx + 1])[:-1] + dp(pts[idx:])

    mid = len(ring) // 2
    out = dp(ring[: mid + 1])[:-1] + dp(ring[mid:])
    return out if len(out) >= 4 else ring


def ring_area(r):
    return sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1)) / 2


def build_landslide(raw: Path):
    kinds = {"ky": "steep_slope", "dy": "debris_flow", "jy": "landslide"}
    feats = []
    for zp in sorted(raw.glob("ls_*.zip")):
        outer = zipfile.ZipFile(zp)
        for name in outer.namelist():
            m = re.search(r"\d(ky|dy|jy)_\d+_\d+\.shp$", name)
            if not m:
                continue
            shp = outer.read(name)
            dbf = outer.read(name[:-4] + ".dbf")
            for rings, attrs in zip(read_shp_polygons(shp), read_dbf(dbf)):
                rings = [simplify(r) for r in rings if len(r) >= 4]
                if not rings:
                    continue
                xs = [c[0] for r in rings for c in r]
                ys = [c[1] for r in rings for c in r]
                if max(xs) < BBOX[0] or min(xs) > BBOX[2] or max(ys) < BBOX[1] or min(ys) > BBOX[3]:
                    continue
                # Shapefile: outer rings clockwise, holes counter-clockwise.
                polys = []
                for r in rings:
                    if ring_area(r) <= 0 or not polys:
                        polys.append([r])
                    else:
                        polys[-1].append(r)
                geom = {"type": "Polygon", "coordinates": polys[0]} if len(polys) == 1 else {"type": "MultiPolygon", "coordinates": polys}
                feats.append(
                    {
                        "type": "Feature",
                        "geometry": geom,
                        "properties": {"type": kinds[m.group(1)], "zone": attrs.get("kuiki_nm", ""), "city": attrs.get("city", "")},
                    }
                )
    write("landslide.geojson", feats)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True, type=Path)
    ap.add_argument("--fetch", action="store_true")
    a = ap.parse_args()
    if a.fetch:
        fetch(a.raw)
    OUT.mkdir(exist_ok=True)
    build_shelters(a.raw)
    build_stops(a.raw)
    build_landslide(a.raw)


if __name__ == "__main__":
    main()
