# data/

Small GeoJSON files bundled with the app. The source servers do not send CORS headers, so the browser cannot fetch them directly; `scripts/build_data.py` converts them ahead of time.

Built: 2026-10-21 (DoboX shelter file is overwritten every ~5 min at the source; rebuild to refresh).

```bash
python3 -I scripts/build_data.py --raw /path/to/empty-dir --fetch
```

| File | What | Source | Licence / credit |
|---|---|---|---|
| `shelters.geojson` | 442 places in 中・東・南・西区. `kind`: `emergency` (指定緊急避難場所), `shelter` (指定避難所), `both`. `hz.{flood,surge,tsunami,landslide}` = usable for that hazard. `note` = GSI remarks (e.g. 【洪水：2階以上】). `name_en/zh/ko/kana` + `names_src` = names in other languages made by `scripts/build_shelter_names.py` (see below) | DoboX 避難所情報 (resource 109) + 国土地理院 指定緊急避難場所データ (34100_2.geojson). Matched by name | 出典：広島県インフラマネジメント基盤／広島県 危機管理課 (CC BY 4.0). 国土地理院 指定緊急避難場所データを加工して作成 |
| `tram_stops.geojson` | 61 Hiroden streetcar stops in the central area, with `name_en/zh/ko/kana` | 国土数値情報 鉄道データ N02-25 (広島電鉄). Names: 広島電鉄 GTFS-JP translations.txt (30 stops), `scripts/tram_names_manual.json` (31 stops, hand-written, `names_src: manual`) | 国土数値情報（鉄道データ）（国土交通省）CC BY 4.0. GTFS: 広島県バス協会 CC0 |
| `landslide.geojson` | 843 土砂災害警戒区域 (yellow zones: steep slope `steep_slope`, debris flow `debris_flow`) clipped to 132.40–132.52E, 34.33–34.43N, simplified to ~1.5 m | DoboX 土砂災害警戒区域・特別警戒区域情報 広島市中区・東区・南区・西区 (resources 31301–31304, 31331–31334) | 出典：広島県インフラマネジメント基盤／広島県 砂防課 (CC BY 4.0) |

| `river.json` | DoboX river water-level gauges (水位観測所) around central Hiroshima with the latest value of the daily summary: `level`, `time`, `max`, `max_time`, `date`, `thresholds.{standby,caution,evacuate,danger}` (水防団待機・氾濫注意・避難判断・氾濫危険水位), `stage` 0–4 (null = no thresholds). **Not in the repo yet** (see below). The app shows "no data yet" without it | DoboX 観測情報_観測所一覧 (dataset 1274) + 観測情報_水位日集計 (dataset 1437), built by `scripts/build_river.py` | 出典：広島県インフラマネジメント基盤（DoboX）／広島県 河川課. 利用条件はデータセットのページの表示に従う（DoboX の他のデータと同じ CC BY 4.0 の想定。**要確認**） |

Hiroden's public GTFS-JP covers buses only, so streetcar stop positions come from N02 and only the names come from GTFS.

## Shelter names in English / Chinese / Korean

No machine translation of proper nouns. `scripts/shelter_names_manual.json` holds, for each shelter, the proper-noun part (`stem`) and its reading in hiragana (written by the author with AI help; `conf: low` = unsure). `scripts/build_shelter_names.py` then builds the names mechanically:

- English: modified Hepburn romaji without macrons + facility type (`TYPES` table), e.g. 中島小学校 → Nakajima Elementary School. Official English names are used only when confirmed (`official_en`, with the source URL).
- Korean: Hangul following the Korean rules for writing Japanese (외래어 표기법) + facility type.
- Chinese: the kanji of the proper noun mapped to simplified glyphs (not translated) + facility type. Names with kana are left without a Chinese form.
- Katakana loanwords (e.g. ノートルダム) are not romanized; the app shows the Japanese name with the facility type instead.

The app always shows the Japanese name next to it so people can match it with the sign on site. Review table: `docs/translation-review-shelters.md` (generated).

## River water level (`river.json`)

DoboX refuses connections from outside Japan (HTTP 403 from AWS, checked on 2026-10-22 from GitHub-hosted runners and from a cloud container). So `river.json` has to be built on a machine in Japan:

```bash
python3 -I scripts/build_river.py --raw /path/to/empty-dir --fetch      # fetch + build
python3 -I scripts/build_river.py --raw /path/to/empty-dir --inspect    # show CSV columns (first time)
sh scripts/update_river.sh                                            # fetch, build, test, commit, push
```

The CSV column names were not visible from here, so the script looks for columns by candidate names (`COLUMNS` in the script) and stops with an error listing the real header if one is missing. Run `--inspect` once and adjust `COLUMNS` if needed. Daily updates: `docs/river-data.md`.
