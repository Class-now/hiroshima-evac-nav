# テストのやり方

## 単体テスト（依存なし）

```bash
npm test                                             # node:test: js/guide.js（最寄りの避難場所）・i18n の欠け・data/river.json の形
python3 -m unittest discover -s test -p "test_*.py"  # scripts/build_river.py と scripts/build_shelter_names.py
```

GitHub Actions の `test` ワークフローが push・PR ごとに両方を回す。

- `test/i18n.test.mjs`: 4 言語で全キーがそろっているか、空でないか、`{変数}` が英語と同じか、コードで使っているキーが辞書にあるか。
- `test/fixtures/dobox_*` は DoboX の実データの抜粋（観測所一覧・水位日集計・データセットのページ）。`test/river-data.test.mjs` は、入っている `data/river.json` が `js/app.js` の読む形か（位置・名前・水位・時刻・段階）を確かめる。
- `test/fixtures/river_sample.json` は架空の観測所データ（スモーク用）。

## スモークテスト（Playwright、headless Chromium）

Playwright は依存に入れていない。グローバルに入っているもの（`npm i -g playwright` と `npx playwright install chromium`）を使う。

```bash
npm run smoke                       # 普通のネット環境（CDN・PLATEAU・地理院タイルを読む）
npm run smoke -- --only spot        # 名前に spot を含むシナリオだけ
npm run smoke -- --offline --cesium <cesium パッケージ>/Build/Cesium   # 外に出られない環境
```

- シナリオ: 4 言語・`?spot=` の 4 地点・スマホ幅 375px・現在地（許可なし→地図の中心／許可あり）・災害の切り替え・河川水位（架空の観測所データ `test/fixtures/river_sample.json` を差し込む）・初回の使い方。
- スクリーンショットは `test-results/smoke/*.png`（git には入れない）。
- WebGL は SwiftShader で出す（`--use-angle=swiftshader --enable-unsafe-swiftshader`）。
- `--offline` では PLATEAU の 3D Tiles と地理院タイルを読まないので、建物は出ない（背景は無地）。それでも UI と避難場所の案内が動くことを確かめる。
- Cesium のパッケージは `npm pack cesium@1.146.0 && tar xzf cesium-1.146.0.tgz` で手に入る（`package/Build/Cesium` を渡す）。

## こつ

- 内蔵ブラウザのペインが隠れていると requestAnimationFrame が止まり真っ黒に見える。`window.__app.viewer.scene.render()` を JS で回してから撮る（スモークも同じことをしている）。
- 初回の使い方を出さずに撮るときは `localStorage.setItem("evacnav.onboarded", "1")`。出したいときはサイトデータを消すか、右上の「?」。
