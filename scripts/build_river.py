#!/usr/bin/env python3
"""DoboX の河川水位から data/river.json を作る（標準ライブラリだけ）。

使うデータ（広島県インフラマネジメント基盤 DoboX、河川課）:
  観測情報_観測所一覧   https://hiroshima-dobox.jp/datasets/1274  （観測所の位置・基準水位。リソースは 1 つ）
  観測情報_水位日集計   https://hiroshima-dobox.jp/datasets/1437  （1 日 1 ファイル、10 分ごとの水位）

Usage:
  python3 -I scripts/build_river.py --raw <download dir> --fetch      # DoboX から取得して作る
  python3 -I scripts/build_river.py --raw <dir>                       # <dir> の CSV から作る
  python3 -I scripts/build_river.py --raw <dir> --inspect             # CSV の形と対応づけを表示するだけ
  python3 -I scripts/build_river.py --stations a.csv --daily b.csv [--daily prev.csv]

CSV の形（2026-10-22 に実物で確認。docs/river-data.md）:
- 観測所一覧: 1〜2 行目は列の区分（「（その他の各属性項目）」「水位」「ダム」「潮位」）、3 行目が列名。
  1 行 = 1 観測所。「データ種別」4 が水位（1 は雨量、7 はダム、12・13 は潮位など）。
  「観測所番号」は所管ごとの番号で、県全体では重複する（国土交通省の 1 は太田川にも芦田川にもある）。
  そのため「集計連携用事務所名・データ所管・観測所番号」の組で観測所を見分ける。
- 水位日集計: 観測所が列方向に並ぶ横持ち。1 列目が行の見出しで、事務所名・データ所管・水系名・河川名・
  観測所番号・観測所名・観測時刻 の 7 行のあと、10 分ごと（00:00〜23:50）の行が続く。観測所ごとに
  「水位[m]」「フラグ」の 2 列。欠測などは数値の代わりに「**」「--」「CC」が入る。
  当日のファイルも当日中に更新される（取得した時刻の少し前までの値が入っている）。

注意:
- DoboX は日本国外からのアクセスを 403 で拒否する（2026-10-22 に GitHub Actions の
  ubuntu-latest から確認）。取得は日本国内のマシン（本人の PC やセルフホストランナー）で行う。
- データセットのページはリソースを日付の古い順に 10 件ずつ並べる（水位日集計は 960 件以上・97 ページ）。
  最新は最後のページにあるので、1 ページ目からページ送りの最大番号を読んで最後のページを開く。
  「まとめてダウンロード」（resource_bundle_download）は件数が多くて 504 になる。
"""
import argparse
import csv
import datetime as dt
import html
import io
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "river.json"
BASE = "https://hiroshima-dobox.jp"
DATASETS = {"stations": 1274, "daily": 1437}
UA = {"User-Agent": "hiroshima-evac-nav/1.0 (+https://github.com/class-now/hiroshima-evac-nav)"}
# 地図に出す範囲（広島市の中心部とその上流側を少し広めに）。
BBOX = (132.30, 34.30, 132.62, 34.55)
# 観測所一覧の「データ種別」で水位を表す値。
KIND_WATER = "4"

# 観測所一覧の列名（前から順に、正規化した列名に完全一致 → 部分一致で探す）。
COLUMNS = {
    "kind": ["データ種別"],
    "office": ["集計連携用事務所名", "事務所名"],
    "owner": ["データ所管"],
    "code": ["観測所番号", "観測所コード"],
    "name": ["観測所名"],
    "river": ["河川名"],
    "river_disp": ["河川名(表示用)"],
    "lat": ["緯度"],
    "lon": ["経度"],
    "standby": ["水防団待機", "水防団待機水位"],
    "caution": ["氾濫注意", "氾濫注意水位", "はん濫注意水位"],
    "evacuate": ["避難判断", "避難判断水位"],
    "danger": ["氾濫危険", "氾濫危険水位", "はん濫危険水位"],
}
# 部分一致で探すとき、この語を含む列は候補にしない。
EXCLUDE = {
    "kind": ["集計"],
    "office": ["管理", "所管"],
    "name": ["事務所", "河川", "水系"],
    "river": ["表示"],
}
STATION_KEYS = ("code", "name", "lat", "lon")
THRESHOLDS = ["standby", "caution", "evacuate", "danger"]
# 水位日集計の行の見出し（1 列目）。
DAILY_LABELS = {"office": "事務所名", "owner": "データ所管", "river": "河川名", "code": "観測所番号", "name": "観測所名"}


# ---- 取得 ----------------------------------------------------------------------


def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 403:
            sys.exit(f"403 Forbidden: {url}\nDoboX は日本国外からのアクセスを拒否します。日本国内のマシンで実行してください。")
        raise


def resource_links(page):
    """データセットのページの HTML → [(日付, リソース id, 名前)]。日付はリソース名の末尾（…_2026-10-22）。"""
    out = []
    for m in re.finditer(r'href="[^"]*/resources/(\d+)"[^>]*>(.{0,2000}?)</a>', page, re.S):
        label = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", m.group(2))).split())
        d = re.search(r"(20\d\d)[-/年](\d{1,2})[-/月](\d{1,2})", label)
        out.append((dt.date(*map(int, d.groups())) if d else dt.date.min, int(m.group(1)), label))
    return out


def last_page(page, dataset_id):
    """ページ送りのリンク（/datasets/<id>?page=N）の最大の N。ページ送りが無ければ 1。"""
    nums = [int(n) for n in re.findall(rf"/datasets/{dataset_id}\?(?:[^\"']*&(?:amp;)?)?page=(\d+)", page)]
    return max(nums, default=1)


def latest_resources(dataset_id, n=1):
    """データセットのリソースのうち、日付（同じならリソース id）が新しい順に n 件の (日付, id, 名前)。"""
    page = get(f"{BASE}/datasets/{dataset_id}").decode("utf-8", "replace")
    links = resource_links(page)
    last = last_page(page, dataset_id)
    # リソースは古い順に並ぶ。最後のページが 1〜2 件しかないこともあるので、その前のページも見る。
    for p in sorted({last, last - 1} - {1}):
        if p > 1:
            links += resource_links(get(f"{BASE}/datasets/{dataset_id}?page={p}").decode("utf-8", "replace"))
    if not links:
        sys.exit(f"datasets/{dataset_id} にリソースのリンクが見つかりません（ページの形が変わった？）")
    best = sorted(set(links), reverse=True)[:n]
    for d, rid, label in best:
        print(f"datasets/{dataset_id}: resource {rid} {label!r}")
    return best


def fetch(raw: Path):
    """観測所一覧の最新 1 件と、水位日集計の最新 2 件（当日と前日）を raw に保存する。"""
    raw.mkdir(parents=True, exist_ok=True)
    plan = [("stations", r) for r in latest_resources(DATASETS["stations"], 1)]
    plan += list(zip(("daily", "daily_prev"), latest_resources(DATASETS["daily"], 2)))
    for key, (_, rid, _) in plan:
        b = get(f"{BASE}/resource_download/{rid}")
        (raw / f"{key}.csv").write_bytes(b)
        (raw / f"{key}.resource").write_text(str(rid), encoding="utf-8")
        print(f"fetched {key}: resource {rid}, {len(b)} bytes")


# ---- CSV の読み取り（純粋関数。test/test_build_river.py で検査） ------------------------------


def decode(b: bytes) -> str:
    for enc in ("utf-8-sig", "cp932"):
        try:
            return b.decode(enc)
        except UnicodeDecodeError:
            pass
    return b.decode("utf-8", "replace")


def read_rows(text: str):
    return [r for r in csv.reader(io.StringIO(text)) if any(c.strip() for c in r)]


def norm(s):
    s = re.sub(r"[(（\[［]\s*(?:m|ｍ|cm|ｃｍ|t\.?p\.?m?|度)\s*[)）\]］]", "", str(s), flags=re.I)  # 単位を先に取る
    return re.sub(r"[\s　()（）\[\]［］]", "", s).lower()


def find_col(header, key, required=False):
    names = [norm(h) for h in header]
    cands = [norm(c) for c in COLUMNS[key]]
    for c in cands:
        if c in names:
            return names.index(c)
    excl = [norm(x) for x in EXCLUDE.get(key, [])]
    for c in cands:
        hits = [i for i, n in enumerate(names) if c and c in n and not any(x in n for x in excl)]
        if hits:
            return hits[0]
    if required:
        raise KeyError(f"列 {key}（候補: {COLUMNS[key]}）が見つかりません。列名: {header}")
    return None


def find_header(rows, keys=STATION_KEYS, scan=10):
    """先頭の数行から、keys の列がすべてそろう行を列名の行とみなす → (その行の番号, 列名)。"""
    for i, r in enumerate(rows[:scan]):
        h = [c.strip() for c in r]
        if all(find_col(h, k) is not None for k in keys):
            return i, h
    head = [r[:20] for r in rows[:3]]
    raise KeyError(f"列名の行が見つかりません（探した列: {[COLUMNS[k][0] for k in keys]}）。先頭の行: {head}")


def to_float(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", "")
    s = s.translate(str.maketrans("０１２３４５６７８９．－−‐", "0123456789.---"))
    # 欠測などの記号（"**", "--", "CC", "欠測" など）は None。
    if not re.fullmatch(r"-?\d+(\.\d+)?", s):
        return None
    return float(s)


def to_deg(v):
    """10 進の度、または「34°23'45.6"」「34度23分45.6秒」「342345.6」（度分秒の数字だけ）を度にする。"""
    s = str(v).strip()
    f = to_float(s)
    if f is not None:
        if abs(f) > 1000:  # 度分秒を数字だけで書いたもの（ddmmss.s / dddmmss.s）
            sign = -1 if f < 0 else 1
            f = abs(f)
            d, rest = divmod(f, 10000)
            m, sec = divmod(rest, 100)
            return sign * (d + m / 60 + sec / 3600)
        return f
    m = re.match(r"(\d+)\s*[°度]\s*(\d+)\s*['′分]\s*([\d.]+)?", s)
    if m:
        return int(m.group(1)) + int(m.group(2)) / 60 + float(m.group(3) or 0) / 3600
    return None


def office_name(s):
    """「西部建設事務所」（観測所一覧）と「西部建設」（水位日集計）をそろえる。"""
    s = str(s).strip()
    return s[: -len("事務所")] if s.endswith("事務所") else s


def station_key(office, owner, code):
    return f"{office_name(office)}/{str(owner).strip()}/{str(code).strip()}"


def parse_stations(text: str):
    """観測所一覧 → {key: {code, name, river, lon, lat, thresholds?}}（水位の観測所だけ）。"""
    rows = read_rows(text)
    hi, header = find_header(rows)
    ci = {k: find_col(header, k, required=k in STATION_KEYS) for k in COLUMNS}
    out = {}
    for r in rows[hi + 1 :]:
        g = lambda k: r[ci[k]].strip() if ci.get(k) is not None and ci[k] < len(r) else ""
        kind = g("kind")
        # 水位の観測所だけ（データ種別が 4、または種別の名前に「水位」を含む）。
        if kind and kind != KIND_WATER and "水位" not in kind:
            continue
        lat, lon = to_deg(g("lat")), to_deg(g("lon"))
        if lat is None or lon is None or not g("code"):
            continue
        if lat > lon:  # 緯度経度の取り違え
            lat, lon = lon, lat
        key = station_key(g("office"), g("owner"), g("code"))
        st = {"code": key, "name": g("name"), "river": g("river_disp") or g("river"), "lon": round(lon, 6), "lat": round(lat, 6)}
        th = {k: to_float(g(k)) for k in THRESHOLDS}
        th = {k: v for k, v in th.items() if v is not None}
        if th:
            st["thresholds"] = th
        out[key] = st
    return out


def parse_when(s):
    """「2026/10/22 21:20」「2026-10-09」「2026年10月9日 9時」「20261009」→ ("2026-10-22", "21:20" または "")。"""
    s = str(s).strip()
    m = re.match(r"(\d{4})\D?(\d{1,2})\D?(\d{1,2})日?[\sT]*(?:(\d{1,2})[:時：](\d{2})?)?", s)
    if not m:
        return None, ""
    y, mo, d, hh, mm = m.groups()
    date = f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"
    return date, (f"{int(hh):02d}:{int(mm or 0):02d}" if hh else "")


def parse_daily(text: str):
    """水位日集計（観測所が列方向に並ぶ横持ち）→ {key: {date, time, level, max, max_time}}。

    観測所ごとに、値のある最後の時刻を「最新」、その日の最大値を「最高」（同じ値なら早い時刻）とする。
    値が 1 つも無い観測所（終日欠測）は入れない。
    """
    rows = read_rows(text)
    label = {}
    for i, r in enumerate(rows[:15]):
        h = norm(r[0]) if r else ""
        for k, name in DAILY_LABELS.items():
            if h == norm(name) and k not in label:
                label[k] = i
    for k in ("owner", "code"):
        if k not in label:
            raise KeyError(f"水位日集計に「{DAILY_LABELS[k]}」の行が見つかりません。先頭の列: {[r[0] for r in rows[:8]]}")
    cell = lambda k, c: rows[label[k]][c].strip() if k in label and c < len(rows[label[k]]) else ""
    width = max(len(r) for r in rows)
    cols = [c for c in range(1, width) if cell("code", c)]  # 観測所の「水位」の列（隣は「フラグ」）
    series = {c: [] for c in cols}
    for r in rows:
        date, time = parse_when(r[0])
        if not date or not time:
            continue  # 見出しの行
        for c in cols:
            v = to_float(r[c]) if c < len(r) else None
            if v is not None:
                series[c].append((date, time, v))
    out = {}
    for c in cols:
        vals = sorted(series[c])
        if not vals:
            continue
        date, time, level = vals[-1]
        mx = None
        for x in vals:  # 時刻順。最大値、同じ値なら早い時刻
            if x[0] == date and (mx is None or x[2] > mx[2]):
                mx = x
        key = station_key(cell("office", c), cell("owner", c), cell("code", c))
        out[key] = {"date": date, "time": time, "level": level, "max": mx[2], "max_time": mx[1]}
    return out


def merge_daily(*dailies):
    """複数日の水位日集計を、観測所ごとに日時が最も新しいものでまとめる（当日のファイルが空の早朝のため）。"""
    out = {}
    for d in dailies:
        for key, rec in d.items():
            prev = out.get(key)
            if prev is None or (rec["date"], rec["time"]) > (prev["date"], prev["time"]):
                out[key] = rec
    return out


def stage(level, th):
    """基準水位との比較 → 0 平常 / 1 水防団待機 / 2 氾濫注意 / 3 避難判断 / 4 氾濫危険。基準が無ければ None。"""
    if level is None or not th:
        return None
    s = 0
    for i, k in enumerate(THRESHOLDS, start=1):
        if th.get(k) is not None and level >= th[k]:
            s = i
    return s


def build(stations, daily, source=None, bbox=BBOX):
    feats = []
    for code, st in sorted(stations.items()):
        if not (bbox[0] <= st["lon"] <= bbox[2] and bbox[1] <= st["lat"] <= bbox[3]):
            continue
        obs = daily.get(code)
        p = {k: v for k, v in st.items() if k not in ("lon", "lat")}
        if obs:
            p.update(obs)
            p["stage"] = stage(obs.get("level"), st.get("thresholds"))
            p["stage_max"] = stage(obs.get("max"), st.get("thresholds"))
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [st["lon"], st["lat"]]}, "properties": p})
    dates = sorted({f["properties"]["date"] for f in feats if f["properties"].get("date")})
    return {
        "type": "FeatureCollection",
        "generated": dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).isoformat(timespec="minutes"),
        "observed": dates[-1] if dates else None,
        "source": source or {},
        "features": feats,
    }


# ---- main -----------------------------------------------------------------------


def inspect(sp: Path, dps):
    rows = read_rows(decode(sp.read_bytes()))
    hi, header = find_header(rows)
    print(f"== {sp} ({len(rows) - hi - 1} rows, header at line {hi + 1})")
    print("columns:", header)
    for k in COLUMNS:
        i = find_col(header, k)
        print(f"  {k:10s} -> {header[i] if i is not None else '-'}")
    st = parse_stations(decode(sp.read_bytes()))
    print(f"  water-level stations: {len(st)}")
    for dp in dps:
        d = parse_daily(decode(dp.read_bytes()))
        times = sorted((r["date"], r["time"]) for r in d.values())
        print(f"== {dp}: {len(d)} stations with values, latest {times[-1] if times else '-'}")
        missing = sorted(set(d) - set(st))
        if missing:
            print(f"  not in station list: {missing[:10]}{' …' if len(missing) > 10 else ''}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", type=Path, help="stations.csv / daily.csv / daily_prev.csv を置く（取得する）ディレクトリ")
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--inspect", action="store_true")
    ap.add_argument("--stations", type=Path)
    ap.add_argument("--daily", type=Path, action="append", help="水位日集計の CSV（複数指定可）")
    ap.add_argument("--out", type=Path, default=OUT)
    a = ap.parse_args()
    if a.fetch:
        if not a.raw:
            ap.error("--fetch には --raw が要ります")
        fetch(a.raw)
    sp = a.stations or (a.raw / "stations.csv" if a.raw else None)
    dps = a.daily or ([p for p in (a.raw / "daily.csv", a.raw / "daily_prev.csv") if p.exists()] if a.raw else [])
    if not sp or not dps:
        ap.error("--raw か --stations/--daily を指定してください")
    if a.inspect:
        inspect(sp, dps)
        return
    src = {"stations": {"dataset": f"{BASE}/datasets/{DATASETS['stations']}"}, "daily": {"dataset": f"{BASE}/datasets/{DATASETS['daily']}"}}
    rid = sp.with_suffix(".resource")
    if rid.exists():
        src["stations"]["resource"] = f"{BASE}/resources/{rid.read_text().strip()}"
    rids = [p.with_suffix(".resource") for p in dps]
    rids = [f"{BASE}/resources/{p.read_text().strip()}" for p in rids if p.exists()]
    if rids:
        src["daily"]["resources"] = rids
    stations = parse_stations(decode(sp.read_bytes()))
    daily = merge_daily(*(parse_daily(decode(p.read_bytes())) for p in reversed(dps)))
    unmatched = set(daily) - set(stations)
    if unmatched:
        print(f"warning: {len(unmatched)} stations in the daily CSV are not in the station list: {sorted(unmatched)[:5]}")
    gj = build(stations, daily, src)
    if not gj["features"]:
        sys.exit("範囲内の水位観測所が 0 件。列の対応を --inspect で確認してください")
    with_obs = sum(1 for f in gj["features"] if "level" in f["properties"])
    if not with_obs:
        sys.exit("範囲内の観測所に水位の値が 1 つもありません。--inspect で水位日集計の形を確認してください")
    # 中身が同じなら書き換えない（generated の時刻だけでコミットが毎日できないように）。
    if a.out.exists():
        try:
            old = json.loads(a.out.read_text(encoding="utf-8"))
            if {k: v for k, v in old.items() if k != "generated"} == {k: v for k, v in gj.items() if k != "generated"}:
                print(f"{a.out.name}: no change (observed {gj['observed']})")
                return
        except ValueError:
            pass
    a.out.write_text(json.dumps(gj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    latest = max((f["properties"]["date"], f["properties"]["time"]) for f in gj["features"] if "time" in f["properties"])
    print(f"{a.out.name}: {len(gj['features'])} stations ({with_obs} with water level), observed {' '.join(latest)}")


if __name__ == "__main__":
    main()
