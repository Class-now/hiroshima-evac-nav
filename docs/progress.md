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

## テストのこつ
- 内蔵ブラウザのペインが隠れていると requestAnimationFrame が止まり真っ黒に見える。`window.__app.viewer.scene.render()` を JS で回してから撮る。
