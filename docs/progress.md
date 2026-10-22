# 進捗（広島 3D 多言語避難ナビ）

正本の状態は contest-pm/contests/1119-plateau-award/status.md。ここは開発の再開用メモ。

## 2026-10-21
- 静的サイト（CesiumJS 1.146.0 を CDN から、ビルドなし）で骨組みを作った。
- PLATEAU 広島市 2024 の 3D Tiles をストリーミングで表示（中区 LOD2・南/東/西区 LOD1、洪水 L2 ×6河川、高潮、津波）。地理院淡色地図。ion 不使用。
- ジオイド高 33.4 m（国土地理院 API、中区）だけタイルを下げて楕円体地面に合わせた。
- 建物クリック → 建物属性の浸水深（L2 の最大）・継続時間・階数（無ければ高さ÷3.3m で推定）→「N階より上へ」/「低いので避難場所へ」。
- 色分け 2 モード: 浸水深（手引きの凡例色）／上の階へ逃げられる建物（緑・赤）。
- 4 言語（やさしい日本語・English・简体中文・한국어）。?lang= と ?spot=（station/peace/hondori/castle）で直接開ける。
- GitHub Pages で公開: https://class-now.github.io/hiroshima-evac-nav/
- data/ を同梱（scripts/build_data.py、標準ライブラリだけ。出典は data/README.md）: 避難場所 442・電停 61・土砂災害警戒区域 843。元サーバーに CORS が無いので同梱が必須。
- 電停の位置は国土数値情報 N02（広電の公開 GTFS はバスのみ）。名前の訳は GTFS translations.txt → 無ければ scripts/tram_names_manual.json。
- 避難場所は日本語名だけ。英中韓では施設の種類（cat_*）を括弧で添える。
- スマホ幅 375px で表示確認済み。
- 次: 訳語の本人確認の反映（contest-pm/contests/1119-plateau-award/translation-review.md）。候補: DoboX 河川水位（日次 CSV）の表示、避難場所名の訳。

## 2026-10-22〜23（ブランチ mvp-1101、PR #1）
- **DoboX 河川水位**: `scripts/build_river.py`（標準ライブラリだけ）で「観測情報_観測所一覧」「観測情報_水位日集計」→ `data/river.json`。基準水位と比べて 0〜4 段階、地図に「水」マーカー、タップで最新・当日最高・基準水位。日集計でリアルタイムではないと明記し、県の河川防災情報システムへリンク。3 日より古いデータは灰色＋注意。
  - **DoboX は日本国外からのアクセスを 403 で拒否**（GitHub の ubuntu-latest、作業したクラウド環境の両方で確認）。10/22 に本人の PC（国内）から実データを取得し、CSV の形に合わせて取り込みを直して `data/river.json`（37 か所、10/22 21:20 の値）を入れた（`docs/river-data.md`）。
  - 毎日の更新: `scripts/update_river.sh`（手元の PC で cron）か、`.github/workflows/river-data.yml`（リポジトリ変数 `RIVER_RUNNER` に国内セルフホストランナーを設定したときだけ動く）。手順は `docs/river-data.md`。
- **最寄りの避難場所**: `js/guide.js`（純粋関数、`test/guide.test.mjs`）。災害種別に対応した避難場所を距離順に 3 件、8 方位・直線距離・徒歩の目安・「N 階以上」。「近くの避難場所」ボタンは現在地 → 許可なし／範囲外は地図の中心。
- **避難場所名の多言語化**: 機械翻訳しない。`scripts/shelter_names_manual.json`（固有名の部分と読み。AI 補助の案）→ `scripts/build_shelter_names.py` でローマ字（ヘボン式）・ハングル（外来語表記法）・簡体字の字形＋施設種別の訳。日本語名をいつも併記。確認表 `docs/translation-review-shelters.md`（conf=low 12 件）、UI 文言 `docs/translation-review-ui.md`。
- **UI/UX**: 初回の使い方（言語選択つき、「?」で再表示）、凡例、レイヤー切替（河川水位を追加）、読み込み中（残りタイル数）、3D が読めないときの案内、スマホ 375px（操作パネル上・結果下、タップ領域 36〜44px）。
- **安全面の修正**: データが読めない・区域タイルが未読込・災害を切り替えた直後に「浸水しない予想」と出ていた → 「わかりません」。土砂は範囲外・読み込み失敗を「わかりません」、範囲内でも「中・東・南・西区のデータ」と明記。施設分類の誤り（ホールディングス→ホール）。
- **品質**: `npm test`（node:test: 案内ロジック・i18n の全キー 4 言語）、`python3 -m unittest`（河川水位の取り込み・名前の作り方）、`scripts/smoke.mjs`（Playwright headless、SwiftShader で WebGL。4 言語・?spot= 4 地点・375px・現在地あり/なし・災害切替・河川水位〈架空データ〉・初回案内。全 14 シナリオ通過〈--offline〉）。GitHub Actions `test` が push/PR で単体テストを回す。テストのやり方は `docs/testing.md`。
- **提出物の下準備**: `docs/pitch/`（PLATEAU スライド 11 枚＋審査基準の対応表、3 分デモ絵コンテ、DoboX ポスター構成、UDC 100 字 3 案）。体験談・数値は【要記入】。
- 独立レビュー（サブエージェント）の指摘を反映済み。
- この作業環境からは PLATEAU・地理院タイル・CDN・DoboX に接続できず、3D 建物が出た状態の画面は確認できていない（ローカルの Cesium と `--offline` で UI だけ確認）。

## 次にやること
1. ~~**本人**: 河川水位の列名確認と `data/river.json` 作成~~ → **済（10/22、本人の PC〈国内〉から取得）**。実データの形に合わせて `build_river.py` を直した: 観測所一覧はヘッダー 3 行（3 行目が列名。データ種別 4 = 水位、観測所番号は所管ごとに重複するので「事務所/所管/番号」をキーに）、水位日集計は観測所が列に並ぶ横持ちで 10 分ごとの値（`**`・`--`・`CC` は欠測など）。最新のリソースは古い順に 10 件ずつのページの最後のページにある（1 ページ目だけ見て 2024-03-14 を選んでいた）。当日のファイルは当日中も更新される（10/22 21:29 に 21:20 まで）。`data/river.json` は範囲内 37 か所（値あり 36）、10/22 21:20 の値。利用条件はデータセットのページに個別の記載なし、DoboX 利用規約で CC BY 4.0・出典「広島県インフラマネジメント基盤」（アプリの出典表示はこれに合う）。詳細は `docs/river-data.md`。毎日の更新は、本人の Windows PC のタスクスケジューラ `hiroshima-river-update` で毎日 9:20 に実行する（10/22 に PM が設定し、試しに 1 回動かして成功）。チェックアウトしているブランチに push するので、PR #1 をマージしたら作業ツリーを main に切り替える。
2. **本人**: 訳語の確認（`docs/translation-review-shelters.md` の conf=low 12 件と施設種別、`docs/translation-review-ui.md` の新しい文言）。直したら `python3 -I scripts/build_shelter_names.py`。
3. 普通のネット環境で `npm run smoke` と目視（3D 建物ありで建物タップ → 浸水深・階数、スマホ実機で位置情報）。
4. PM が PR #1 をレビューしてマージ → GitHub Pages で確認。
5. `docs/pitch/` の【要記入】を本人が埋める（体験・統計の出典・締切）。
6. 11/2〜11/10 は別の開発期間なので触らない。

## テストのこつ
- 詳しくは docs/testing.md。
- 内蔵ブラウザのペインが隠れていると requestAnimationFrame が止まり真っ黒に見える。`window.__app.viewer.scene.render()` を JS で回してから撮る。
