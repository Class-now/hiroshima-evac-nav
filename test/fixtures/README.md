# テスト用データ

- `dobox_*.csv` は DoboX の **実データの抜粋**（2026-10-22 に取得。公開データで個人情報は無い）。
  - `dobox_stations.csv`: 「観測情報_観測所一覧」（datasets/1274、resource 39775）のヘッダー 3 行と 8 行（雨量 2・水位 5・ダム 1）。
  - `dobox_daily.csv`: 「観測情報_水位日集計」2026-10-22（resource 181129）の見出し 7 行と 8 時刻、観測所 5 か所の列。
  - `dobox_daily_prev.csv`: 同じく 2026-10-21（resource 181124）の最後の 2 時刻。
- `dobox_dataset_page1.html` / `dobox_dataset_last.html`: datasets/1437 の 1 ページ目と最後（97 ページ目）の、リソース一覧とページ送りの部分だけ。
- `river_sample.json` は **架空** の観測所データ（スモークテストで河川水位の画面を確かめるためだけのもの。地図や資料には使わない）。
