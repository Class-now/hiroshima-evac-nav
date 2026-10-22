#!/usr/bin/env python3
"""DoboX の河川水位から data/river.json を作る（標準ライブラリだけ）。

使うデータ（広島県インフラマネジメント基盤 DoboX、河川課）:
  観測情報_観測所一覧   https://hiroshima-dobox.jp/datasets/1274  （観測所の位置・基準水位）
  観測情報_水位日集計   https://hiroshima-dobox.jp/datasets/1437  （1 日 1 ファイルの CSV）

Usage:
  python3 -I scripts/build_river.py --raw <download dir> --fetch      # DoboX から取得して作る
  python3 -I scripts/build_river.py --raw <dir>                       # <dir> の CSV から作る
  python3 -I scripts/build_river.py --raw <dir> --inspect             # CSV の列名と先頭行を表示するだけ
  python3 -I scripts/build_river.py --stations a.csv --daily b.csv    # ファイルを直接指定

注意:
- DoboX は日本国外からのアクセスを 403 で拒否する（2026-10-22 に GitHub Actions の
  ubuntu-latest から確認）。取得は日本国内のマシン（本人の PC やセルフホストランナー）で行う。
- CSV の列名はまだ実物で確認できていない。COLUMNS の候補名で列を探し、見つからない列は
  エラーで止める（--inspect で列名を見て COLUMNS に足す）。
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

# 列名の候補（前から順に、正規化した列名に完全一致 → 部分一致で探す）。
COLUMNS = {
    "code": ["観測所コード", "観測所番号", "観測所ID", "観測所id", "局コード", "観測局コード", "コード"],
    "name": ["観測所名", "観測所名称", "観測局名", "名称"],
    "river": ["河川名", "河川"],
    "lat": ["緯度", "北緯", "lat", "latitude"],
    "lon": ["経度", "東経", "lon", "lng", "longitude"],
    "kind": ["観測種別", "観測種類", "観測項目", "種別", "観測所種別"],
    "standby": ["水防団待機水位", "待機水位", "通報水位"],
    "caution": ["氾濫注意水位", "はん濫注意水位", "警戒水位"],
    "evacuate": ["避難判断水位"],
    "danger": ["氾濫危険水位", "はん濫危険水位", "危険水位"],
    "date": ["観測日", "年月日", "日付", "観測年月日", "観測日時", "日時"],
    "level": ["最新水位", "水位", "現在水位", "日平均水位", "平均水位"],
    "max": ["日最高水位", "最高水位", "最大水位", "日最大水位"],
    "maxtime": ["最高水位時刻", "最高水位発生時刻", "最大水位時刻", "最高時刻"],
}
# 部分一致で探すとき、この語を含む列は候補にしない（「水位」で「最高水位」「氾濫危険水位」を拾わないように）。
EXCLUDE = {
    "code": ["河川", "水系", "事務所"],
    "name": ["河川", "水系", "事務所", "よみ", "カナ", "かな", "英"],
    "lat": ["日本測地"],
    "lon": ["日本測地"],
    "level": ["最高", "最大", "最低", "最小", "危険", "注意", "待機", "判断", "通報", "警戒", "計画", "基準", "時刻", "時間", "標高", "零点"],
    "max": ["時刻", "時間", "発生"],
    "date": ["更新", "作成", "登録"],
}
THRESHOLDS = ["standby", "caution", "evacuate", "danger"]
HOUR_RE = re.compile(r"^(\d{1,2})(?:時|:00|：00|h)?$")


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


def latest_resource(dataset_id):
    """データセットのページから、名前に日付が入ったリソースのうち最新のものの id を返す。"""
    page = get(f"{BASE}/datasets/{dataset_id}").decode("utf-8", "replace")
    best = None
    # リソースへのリンク（/resources/<id> または /resource_download/<id>）と、その近くの日付を拾う。
    for m in re.finditer(r'href="[^"]*/(?:resources|resource_download)/(\d+)[^"]*"[^>]*>(.{0,300}?)</a>', page, re.S):
        rid, label = m.group(1), html.unescape(re.sub(r"<[^>]+>", " ", m.group(2)))
        d = re.search(r"(20\d\d)[-/年](\d{1,2})[-/月](\d{1,2})", label)
        key = (dt.date(*map(int, d.groups())) if d else dt.date.min, int(rid))
        if best is None or key > best[0]:
            best = (key, rid, label.strip())
    if not best:
        sys.exit(f"datasets/{dataset_id} にリソースのリンクが見つかりません（ページの形が変わった？）")
    print(f"datasets/{dataset_id}: latest resource {best[1]} {best[2]!r}")
    return best[1]


def fetch(raw: Path):
    raw.mkdir(parents=True, exist_ok=True)
    for key, ds in DATASETS.items():
        rid = latest_resource(ds)
        b = get(f"{BASE}/resource_download/{rid}")
        (raw / f"{key}.csv").write_bytes(b)
        (raw / f"{key}.resource").write_text(rid, encoding="utf-8")
        print(f"fetched {key}: resource {rid}, {len(b)} bytes")


# ---- CSV の読み取り（純粋関数。test/test_build_river.py で検査） ------------------------------


def decode(b: bytes) -> str:
    for enc in ("utf-8-sig", "cp932"):
        try:
            return b.decode(enc)
        except UnicodeDecodeError:
            pass
    return b.decode("utf-8", "replace")


def read_csv(text: str):
    rows = list(csv.reader(io.StringIO(text)))
    rows = [r for r in rows if any(c.strip() for c in r)]
    if not rows:
        return [], []
    return [c.strip() for c in rows[0]], rows[1:]


def norm(s):
    s = re.sub(r"[(（\[［]\s*(?:m|ｍ|cm|ｃｍ|t\.p\.?m?|度)\s*[)）\]］]", "", str(s), flags=re.I)  # 単位を先に取る
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
            # 緯度経度が測地系ごとにあれば世界測地系を選ぶ
            world = [i for i in hits if "世界" in names[i] or "jgd" in names[i] or "wgs" in names[i]]
            return (world or hits)[0]
    if required:
        raise KeyError(f"列 {key}（候補: {COLUMNS[key]}）が見つかりません。列名: {header}")
    return None


def to_float(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", "")
    s = s.translate(str.maketrans("０１２３４５６７８９．－−‐", "0123456789.---"))
    # 欠測・未観測の記号（"-", "欠測", "*" など）は None。
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


def parse_stations(text: str):
    header, rows = read_csv(text)
    ci = {k: find_col(header, k, required=k in ("code", "name", "lat", "lon")) for k in COLUMNS if k not in ("date", "level", "max", "maxtime")}
    out = {}
    for r in rows:
        g = lambda k: r[ci[k]].strip() if ci.get(k) is not None and ci[k] < len(r) else ""
        kind = g("kind")
        # 水位の観測所だけ（種別の列があって「水位」を含まないものは除く）。
        if kind and "水位" not in kind:
            continue
        lat, lon = to_deg(g("lat")), to_deg(g("lon"))
        if lat is None or lon is None:
            continue
        if lat > lon:  # 緯度経度の取り違え
            lat, lon = lon, lat
        if not g("code"):
            continue
        st = {"code": g("code"), "name": g("name"), "river": g("river"), "lon": round(lon, 6), "lat": round(lat, 6)}
        th = {k: to_float(g(k)) for k in THRESHOLDS}
        th = {k: v for k, v in th.items() if v is not None}
        if th:
            st["thresholds"] = th
        out[st["code"]] = st
    return out


def parse_when(s):
    """「2026/10/9 23:00」「2026-10-09」「2026年10月9日 9時」「20261009」→ ("2026-10-09", "23:00" または "")。"""
    s = str(s).strip()
    m = re.match(r"(\d{4})\D?(\d{1,2})\D?(\d{1,2})日?[\sT]*(?:(\d{1,2})[:時：](\d{2})?)?", s)
    if not m:
        return s, ""
    y, mo, d, hh, mm = m.groups()
    date = f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"
    return date, (f"{int(hh):02d}:{int(mm or 0):02d}" if hh else "")


def hour_columns(header):
    """「1時」「01:00」「24時」のような毎時の列 → [(hour, index)]。"""
    cols = []
    for i, h in enumerate(header):
        m = HOUR_RE.match(norm(h).replace("時", "時"))
        if m and 0 <= int(m.group(1)) <= 24:
            cols.append((int(m.group(1)), i))
    return cols if len(cols) >= 6 else []


def parse_daily(text: str):
    """水位日集計 → {code: {date, level, time, max, max_time}}。

    2 つの形に対応する:
    - 横持ち: 1 行 = 1 観測所 1 日。毎時の列（1時〜24時）があれば、値のある最後の時刻を「最新」とする。
      毎時の列が無ければ「水位」「最高水位」などの列を使う。
    - 縦持ち: 1 行 = 1 観測所の 1 時刻。観測所ごとに日時が最も新しい行を「最新」とする。
    """
    header, rows = read_csv(text)
    i_code = find_col(header, "code", required=True)
    i_date = find_col(header, "date")
    hours = hour_columns(header)
    i_level = None if hours else find_col(header, "level", required=True)
    i_max = find_col(header, "max")
    i_maxt = find_col(header, "maxtime")
    out = {}
    peaks = {}  # 縦持ち: code -> (最高値, その時刻)
    for r in rows:
        if i_code >= len(r) or not r[i_code].strip():
            continue
        code = r[i_code].strip()
        date, time = parse_when(r[i_date]) if i_date is not None and i_date < len(r) else ("", "")
        rec = {"date": date}
        if time:
            rec["time"] = time
        if hours:
            vals = [(h, to_float(r[i])) for h, i in hours if i < len(r)]
            vals = [(h, v) for h, v in vals if v is not None]
            if not vals:
                continue
            rec["time"] = f"{vals[-1][0]:02d}:00"
            rec["level"] = vals[-1][1]
            mh, mv = max(vals, key=lambda x: x[1])
            rec["max"], rec["max_time"] = mv, f"{mh:02d}:00"
        else:
            lv = to_float(r[i_level]) if i_level < len(r) else None
            if lv is None:
                continue
            rec["level"] = lv
            if i_max is not None and i_max < len(r) and to_float(r[i_max]) is not None:
                rec["max"] = to_float(r[i_max])
            if i_maxt is not None and i_maxt < len(r) and r[i_maxt].strip():
                rec["max_time"] = r[i_maxt].strip()
        prev = out.get(code)
        if not hours:
            # 縦持ちでは行の順が時刻順とは限らないので、最高値とその時刻は全行から取る。
            cand = (rec.get("max", rec["level"]), rec.get("max_time") if "max" in rec else rec.get("time", ""))
            if code not in peaks or cand[0] > peaks[code][0]:
                peaks[code] = cand
        if prev is None or (rec["date"], rec.get("time", "")) >= (prev["date"], prev.get("time", "")):
            out[code] = rec
    for code, (v, tm) in peaks.items():
        out[code]["max"] = v
        if tm:
            out[code]["max_time"] = tm
        else:
            out[code].pop("max_time", None)
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


def inspect(path: Path):
    header, rows = read_csv(decode(path.read_bytes()))
    print(f"== {path} ({len(rows)} rows)")
    print("columns:", header)
    for r in rows[:3]:
        print("  ", r)
    for k in COLUMNS:
        i = find_col(header, k)
        if i is not None:
            print(f"  {k:9s} -> {header[i]}")
    if hour_columns(header):
        print("  hourly columns:", [header[i] for _, i in hour_columns(header)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", type=Path, help="stations.csv / daily.csv を置く（取得する）ディレクトリ")
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--inspect", action="store_true")
    ap.add_argument("--stations", type=Path)
    ap.add_argument("--daily", type=Path)
    ap.add_argument("--out", type=Path, default=OUT)
    a = ap.parse_args()
    if a.fetch:
        if not a.raw:
            ap.error("--fetch には --raw が要ります")
        fetch(a.raw)
    sp = a.stations or (a.raw / "stations.csv" if a.raw else None)
    dp = a.daily or (a.raw / "daily.csv" if a.raw else None)
    if not sp or not dp:
        ap.error("--raw か --stations/--daily を指定してください")
    if a.inspect:
        inspect(sp)
        inspect(dp)
        return
    src = {}
    for key, p in (("stations", sp), ("daily", dp)):
        rid = p.with_suffix(".resource")
        src[key] = {"dataset": f"{BASE}/datasets/{DATASETS[key]}"}
        if rid.exists():
            src[key]["resource"] = f"{BASE}/resources/{rid.read_text().strip()}"
    gj = build(parse_stations(decode(sp.read_bytes())), parse_daily(decode(dp.read_bytes())), src)
    if not gj["features"]:
        sys.exit("範囲内の水位観測所が 0 件。列の対応を --inspect で確認してください")
    with_obs = sum(1 for f in gj["features"] if "level" in f["properties"])
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
    print(f"{a.out.name}: {len(gj['features'])} stations ({with_obs} with water level), observed {gj['observed']}")


if __name__ == "__main__":
    main()
