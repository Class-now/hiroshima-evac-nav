# data/

Small GeoJSON files bundled with the app. The source servers do not send CORS headers, so the browser cannot fetch them directly; `scripts/build_data.py` converts them ahead of time.

Built: 2026-10-21 (DoboX shelter file is overwritten every ~5 min at the source; rebuild to refresh).

```bash
python3 -I scripts/build_data.py --raw /path/to/empty-dir --fetch
```

| File | What | Source | Licence / credit |
|---|---|---|---|
| `shelters.geojson` | 442 places in 中・東・南・西区. `kind`: `emergency` (指定緊急避難場所), `shelter` (指定避難所), `both`. `hz.{flood,surge,tsunami,landslide}` = usable for that hazard. `note` = GSI remarks (e.g. 【洪水：2階以上】) | DoboX 避難所情報 (resource 109) + 国土地理院 指定緊急避難場所データ (34100_2.geojson). Matched by name | 出典：広島県インフラマネジメント基盤／広島県 危機管理課 (CC BY 4.0). 国土地理院 指定緊急避難場所データを加工して作成 |
| `tram_stops.geojson` | 61 Hiroden streetcar stops in the central area, with `name_en/zh/ko/kana` | 国土数値情報 鉄道データ N02-25 (広島電鉄). Names: 広島電鉄 GTFS-JP translations.txt (30 stops), `scripts/tram_names_manual.json` (31 stops, hand-written, `names_src: manual`) | 国土数値情報（鉄道データ）（国土交通省）CC BY 4.0. GTFS: 広島県バス協会 CC0 |
| `landslide.geojson` | 843 土砂災害警戒区域 (yellow zones: steep slope `steep_slope`, debris flow `debris_flow`) clipped to 132.40–132.52E, 34.33–34.43N, simplified to ~1.5 m | DoboX 土砂災害警戒区域・特別警戒区域情報 広島市中区・東区・南区・西区 (resources 31301–31304, 31331–31334) | 出典：広島県インフラマネジメント基盤／広島県 砂防課 (CC BY 4.0) |

Hiroden's public GTFS-JP covers buses only, so streetcar stop positions come from N02 and only the names come from GTFS.
