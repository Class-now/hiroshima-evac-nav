#!/usr/bin/env python3
"""DoboX の河川水位（観測所一覧＋水位日集計 CSV）から data/river.json を作る（標準ライブラリだけ）。

Usage:
  python3 -I scripts/build_river.py --raw <download dir> [--fetch] [--probe]
"""
import argparse
import re
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://hiroshima-dobox.jp"
DATASETS = {"stations": 1274, "daily": 1437}
UA = {"User-Agent": "hiroshima-evac-nav (+https://github.com/class-now/hiroshima-evac-nav)"}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read(), r.headers


def decode(b):
    for enc in ("utf-8-sig", "cp932"):
        try:
            return b.decode(enc)
        except UnicodeDecodeError:
            pass
    return b.decode("utf-8", "replace")


def probe(raw: Path):
    raw.mkdir(parents=True, exist_ok=True)
    browser = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
    for url in (f"{BASE}/", f"{BASE}/robots.txt", f"{BASE}/resource_download/109", f"{BASE}/en/datasets/1437"):
        for ua in (UA["User-Agent"], browser):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept": "*/*", "Accept-Language": "ja"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    print("OK", r.status, url, ua[:20], r.headers.get("Content-Type"))
            except urllib.error.HTTPError as e:
                print("ERR", e.code, url, ua[:20], dict(e.headers).get("Server"), e.read()[:300])
            except Exception as e:
                print("ERR", url, ua[:20], e)
    for key, ds in DATASETS.items():
        for url in (f"{BASE}/datasets/{ds}", f"{BASE}/api/3/action/package_show?id={ds}"):
            try:
                b, h = get(url)
            except Exception as e:
                print("ERR", url, e)
                continue
            text = decode(b)
            print("=" * 20, url, h.get("Content-Type"), len(b))
            (raw / f"probe_{key}_{len(text)}.html").write_text(text, encoding="utf-8")
            links = sorted(set(re.findall(r'href="([^"]*(?:resource|download)[^"]*)"', text)))
            print("links:", links[:40])
            for m in re.finditer(r"(resources?/\d+)[^<]{0,200}", text):
                print("  ", m.group(0)[:200].replace("\n", " "))
            print(text[:1500])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True, type=Path)
    ap.add_argument("--probe", action="store_true")
    a = ap.parse_args()
    if a.probe:
        probe(a.raw)


if __name__ == "__main__":
    main()
