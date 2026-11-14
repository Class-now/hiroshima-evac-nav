#!/usr/bin/env python3
"""Build data/bus_stops.json from Hiroden's bus GTFS-JP (広島県バス協会, CC0).

For every bus stop in the app's area (same BBOX as build_data.py) it keeps:
  name + name_en/zh/ko/kana (from translations.txt), position (mean of the poles),
  and the routes that stop there on weekdays: route number/name, destinations,
  first and last departure, and the number of weekday departures.

The app shows this for the shelters it suggests ("bus stops near this shelter"),
so people can see how to reach a shelter or how to go on from it.

Standard library only.

    python3 -I scripts/build_bus.py --raw /path/to/empty-dir --fetch
    python3 -I scripts/build_bus.py --raw /path/with/gtfs.zip
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data"
GTFS_URL = "https://ajt-mobusta-gtfs.mcapps.jp/static/8/current_data.zip"
BBOX = (132.40, 34.33, 132.52, 34.43)
LANG_MAP = {"en": "name_en", "ko": "name_ko", "zh-cn": "name_zh", "zh-CN": "name_zh", "zh-Hans": "name_zh", "ja-Hrkt": "name_kana"}
MAX_TO = 3  # destinations kept per route at one stop


def rows(z: zipfile.ZipFile, name: str):
    return csv.DictReader(io.StringIO(z.read(name).decode("utf-8-sig")))


def hhmm(t: str) -> str:
    h, m = t.split(":")[:2]
    return f"{int(h):02d}:{m}"


def minutes(t: str) -> int:
    h, m = t.split(":")[:2]
    return int(h) * 60 + int(m)


def translations(z):
    out = {}
    for r in rows(z, "translations.txt"):
        key = r.get("trans_id") or r.get("field_value")
        if key and r.get("lang") in LANG_MAP:
            out.setdefault(key, {})[LANG_MAP[r["lang"]]] = r["translation"]
    return out


def names_for(text, tr):
    t = tr.get(text) or {}
    return {k: v for k, v in t.items() if v and v != text}


def build(z: zipfile.ZipFile):
    tr = translations(z)
    feed = next(rows(z, "feed_info.txt"), {})

    # Stops in the area, grouped into one place per (name, parent) — a stop usually has several poles.
    groups = {}
    pole_group = {}
    for r in rows(z, "stops.txt"):
        if r.get("location_type") not in ("", "0", None):
            continue
        lon, lat = float(r["stop_lon"]), float(r["stop_lat"])
        if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
            continue
        name = r["stop_name"].strip()
        # Same name but far apart (>400 m) = a different place.
        key = None
        for k, g in groups.items():
            if g["name"] == name and abs(g["lons"][0] - lon) < 0.004 and abs(g["lats"][0] - lat) < 0.004:
                key = k
                break
        if key is None:
            key = len(groups)
            groups[key] = {"name": name, "lons": [], "lats": []}
        groups[key]["lons"].append(lon)
        groups[key]["lats"].append(lat)
        pole_group[r["stop_id"]] = key

    weekday = {r["service_id"] for r in rows(z, "calendar.txt") if r["monday"] == "1"}
    routes = {}
    for r in rows(z, "routes.txt"):
        routes[r["route_id"]] = (r.get("route_short_name") or "").strip(), (r.get("route_long_name") or "").strip()
    trips = {}
    for r in rows(z, "trips.txt"):
        if r["service_id"] in weekday:
            trips[r["trip_id"]] = (r["route_id"], (r.get("trip_headsign") or "").strip())

    # Last stop of each trip (fallback destination) and the departures at our stops.
    last_stop = {}
    seen = []
    for r in rows(z, "stop_times.txt"):
        tid = r["trip_id"]
        if tid not in trips:
            continue
        seq = int(r["stop_sequence"])
        if tid not in last_stop or seq > last_stop[tid][0]:
            last_stop[tid] = (seq, r["stop_id"])
        g = pole_group.get(r["stop_id"])
        if g is None or r.get("pickup_type") == "1":
            continue
        seen.append((g, tid, r["departure_time"] or r["arrival_time"], (r.get("stop_headsign") or "").strip(), seq))

    stop_names = {r["stop_id"]: r["stop_name"].strip() for r in rows(z, "stops.txt")}
    per = defaultdict(lambda: defaultdict(lambda: {"times": [], "to": defaultdict(int)}))
    for g, tid, dep, sh, seq in seen:
        if last_stop[tid][0] == seq:  # trip ends here: nobody boards
            continue
        rid, head = trips[tid]
        dest = sh or head or stop_names.get(last_stop[tid][1], "")
        rec = per[g][rid]
        rec["times"].append(dep)
        rec["to"][dest] += 1

    out = []
    for k, g in groups.items():
        if k not in per:
            continue
        rs = []
        for rid, rec in per[k].items():
            short, long_ = routes.get(rid, ("", ""))
            times = sorted(rec["times"], key=minutes)
            to = [d for d, _ in sorted(rec["to"].items(), key=lambda x: (-x[1], x[0]))[:MAX_TO] if d]
            rs.append({"no": short, "line": long_, "to": to, "first": hhmm(times[0]), "last": hhmm(times[-1]), "n": len(times)})
        # Merge rows with the same number and destinations (one line often has several route_ids).
        merged = {}
        for x in rs:
            key = (x["no"] or x["line"], tuple(x["to"]))
            m = merged.get(key)
            if not m:
                merged[key] = dict(x)
            else:
                m["n"] += x["n"]
                if minutes(x["first"]) < minutes(m["first"]):
                    m["first"] = x["first"]
                if minutes(x["last"]) > minutes(m["last"]):
                    m["last"] = x["last"]
        rs = sorted(merged.values(), key=lambda x: (-x["n"], x["no"] or x["line"]))
        s = {
            "name": g["name"],
            "lon": round(sum(g["lons"]) / len(g["lons"]), 6),
            "lat": round(sum(g["lats"]) / len(g["lats"]), 6),
            **names_for(g["name"], tr),
            "routes": rs,
        }
        out.append(s)
    out.sort(key=lambda s: (s["name"], s["lon"]))

    dests = sorted({d for s in out for r in s["routes"] for d in r["to"]})
    dest_names = {d: names_for(d, tr) for d in dests if names_for(d, tr)}
    return {
        "source": "広島電鉄 GTFS-JP（広島県バス協会、CC0）",
        "feed_version": feed.get("feed_version", ""),
        "service": "weekday",
        "stops": out,
        "dest_names": dest_names,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--raw", required=True, type=Path, help="directory holding gtfs.zip")
    ap.add_argument("--fetch", action="store_true", help="download gtfs.zip into --raw first")
    a = ap.parse_args()
    a.raw.mkdir(parents=True, exist_ok=True)
    zp = a.raw / "gtfs.zip"
    if a.fetch:
        with urllib.request.urlopen(GTFS_URL, timeout=120) as r:
            zp.write_bytes(r.read())
    data = build(zipfile.ZipFile(zp))
    p = OUT / "bus_stops.json"
    p.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    n_en = sum(1 for s in data["stops"] if "name_en" in s)
    print(f"bus_stops.json: {len(data['stops'])} stops ({n_en} with English name), feed {data['feed_version']}, {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
