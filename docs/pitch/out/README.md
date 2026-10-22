# docs/pitch/out — 応募用の成果物（初版）

**この初版の画面は暫定版です。** 作った作業環境（クラウド）のネットワーク設定で、PLATEAU の 3D Tiles・地理院タイル・CesiumJS の CDN・公開版（GitHub Pages）に接続できなかった。そのため、すべての画面と動画は `--offline`（ローカルの Cesium、通信なし）で撮っており、**3D 建物・浸水想定区域・背景地図が写っていない**。避難場所・土砂災害警戒区域・河川水位（data/ に同梱した実データ）と UI は本物。

国内の普通のネット環境で次を実行すると、3D ありで全部作り直せる（スライド・ポスターの HTML は同じ画像名を参照しているので、そのまま差し替わる）。

```bash
npm i -g playwright            # まだなら。Chromium も要る: npx playwright install chromium
# ffmpeg（libass・libx264 つき）を入れておく。Windows は winget install Gyan.FFmpeg など
npm run pitch:capture          # 画面 22 枚 → screens/（3D タイルの読み込み完了を待って撮る）
npm run pitch:pdf              # スライド・ポスター → PDF と preview/
npm run pitch:video            # 3 分デモ動画 → demo.mp4・demo-ja.srt・demo-en.srt
# 公開版を撮るなら: npm run pitch:capture -- --url https://class-now.github.io/hiroshima-evac-nav/
```

撮り直したら、スライド・ポスターの「暫定画面【本人】差し替え」の札と、動画右上の「暫定版」表示は不要になる（スライド・ポスターの札は HTML から消す。動画の表示は `--offline` のときだけ出る）。

## 一覧

| ファイル | 中身 | 提出先 |
|---|---|---|
| `plateau-slides.pdf` | スライド 12 枚（16:9）。ソース `../src/slides.html`。審査基準 5 項目の対応表つき | PLATEAU AWARD 2026（10MB まで） |
| `demo.mp4` | 3 分デモ動画（180 秒、1280×720、音声なし、日本語字幕を焼き込み）。絵コンテ `../demo-storyboard.md` | PLATEAU AWARD 2026（3 分まで） |
| `demo-ja.srt` / `demo-en.srt` | 字幕ファイル（日本語・英語） | 同上（英語字幕が要るとき） |
| `dobox-poster.pdf` | A4 縦ポスター。ソース `../src/poster.html` | DoboX データチャレンジ 2026 |
| `screens/*.png` | スクリーンショット（PC 3200×1800、スマホ 1125×2436）。`screens/manifest.json` に場面の説明と撮影条件 | 素材 |
| `preview/*.png` | PDF の確認用画像 | — |

UDC2026 の 100 字概要の最終案は `../udc-summary.md` の「最終案」。

## 作り方（スクリプト）

- `scripts/pitch/capture.mjs` — 場面ごとにアプリを開いて撮る。`--offline --cesium <cesium>/Build/Cesium` で通信なし、`--url` で公開版、`--only <名前>` で一部だけ。
- `scripts/pitch/video.mjs` — 12 カットを Playwright で録画（1280×640）→ ffmpeg で秒数をそろえて結合 → 下に字幕帯 80px を足して日本語字幕を焼き込み。`--only 05` で 1 カットだけ録り直し。途中ファイルは `_work/`（git に入れない）。
- `scripts/pitch/pdf.mjs` — `../src/*.html` を Playwright の `page.pdf` で PDF に。画像は幅 1600px の JPEG に縮めて埋め込む。

動画のサイズが 50MB を超えたら git に入れず、置き場所をここに書く。
