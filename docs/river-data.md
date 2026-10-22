# 河川水位（DoboX）の取り込みと毎日の更新

## 何をしているか

`scripts/build_river.py` が DoboX の 2 つのデータセットから `data/river.json` を作る（標準ライブラリだけ）。

| データセット | 中身 | 使い方 |
|---|---|---|
| [観測情報_観測所一覧](https://hiroshima-dobox.jp/datasets/1274)（河川課） | 観測所のコード・名前・位置・基準水位（あれば） | 地図の「水」マーカーの位置と、基準水位との比較 |
| [観測情報_水位日集計](https://hiroshima-dobox.jp/datasets/1437)（河川課） | 1 日 1 ファイルの水位の集計 CSV | 最新の値（毎時の列があれば値のある最後の時刻）と、その日の最高値 |

- 範囲は広島市の中心部とその上流側（`BBOX`）。
- 基準水位（水防団待機・氾濫注意・避難判断・氾濫危険）との比較で `stage` 0〜4 を付け、地図の色にする（レベル2 黄・レベル3 赤・レベル4 紫に合わせた）。基準水位が無い観測所は灰色。
- **日集計なのでリアルタイムではない。** アプリでは「◯月◯日の記録です。いまの水位ではありません」と出し、[広島県河川防災情報システム](https://www.kasen-bousai.pref.hiroshima.lg.jp/)へのリンクを付けている。

## 2026-10-22 時点で分かっていること・分かっていないこと

- DoboX は **日本国外からのアクセスを 403 で拒否する**（AWS のロードバランサーが返す。GitHub の `ubuntu-latest` ランナー〈米国〉からも、このリポジトリを作業したクラウド環境からも同じ）。日本国内のマシンでは `scripts/build_data.py` で取得できている（10/21 に避難所・土砂災害警戒区域を取得済み）。
- そのため **CSV の実物の列名はまだ確認できていない**。`build_river.py` は列名の候補（`COLUMNS`）で列を探し、見つからなければ実際の列名を表示してエラーで止まる。
- データセットのページの HTML の形も未確認。最新のリソースは「リンクの近くにある日付が最も新しいもの」で選んでいる（`latest_resource`）。うまくいかなければ `--stations` / `--daily` で CSV を直接渡せる。
- 利用条件（ライセンス）はデータセットのページで確認すること（DoboX の他のデータと同じ CC BY 4.0 の想定）。

## 最初の 1 回（本人の PC で）

```bash
cd hiroshima-evac-nav
python3 -I scripts/build_river.py --raw /tmp/river --fetch --inspect   # 取得して列名を表示
```

1. 表示された列名が `COLUMNS` の候補で拾えているか見る（`code -> 観測所コード` のように出る）。拾えていない列は `scripts/build_river.py` の `COLUMNS` に実際の列名を足す。
2. `python3 -I scripts/build_river.py --raw /tmp/river` で `data/river.json` を作る。
3. `python3 -m unittest discover -s test -p "test_*.py"` が通ることを確かめる。
4. `python3 -m http.server` で開き、地図の「水」マーカーと凡例を確認してコミットする。

## 毎日の更新（どれか 1 つ）

### A. 手元の PC で cron / launchd（いちばん簡単）

`sh scripts/update_river.sh` が 取得 → 生成 → テスト → コミット → push をする。Mac の例（毎日 9:20）:

```
crontab -e
20 9 * * * cd $HOME/path/to/hiroshima-evac-nav && /bin/sh scripts/update_river.sh >> /tmp/river.log 2>&1
```

PC が起きている日だけ更新される。push 先のブランチ（main に直接か、更新用ブランチか）は PM と決める。

### B. GitHub Actions ＋日本国内のセルフホストランナー

`.github/workflows/river-data.yml` は毎日 09:17 JST に動く。ただし **リポジトリ変数 `RIVER_RUNNER` が空のあいだはジョブを飛ばす**（GitHub のランナーでは 403 になるため）。

1. 日本国内のマシンにセルフホストランナーを登録する（Settings → Actions → Runners）。
2. Settings → Secrets and variables → Actions → Variables に `RIVER_RUNNER` = `self-hosted`（またはランナーに付けたラベル）を作る。
3. Actions タブから `river-data` を手動実行（workflow_dispatch）して確かめる。

注意: **public リポジトリでのセルフホストランナーは、フォークからの PR でランナー上のコードが動く危険がある**。使う場合は Settings → Actions → General で「Fork pull request workflows」の承認を必須にし、ランナーをこのワークフロー専用のラベルにする。心配なら A を使う。

### C. 日本リージョンのクラウドで動かす

GitHub ではなく日本リージョンの実行環境（クラウドの定期実行など）で `update_river.sh` を動かす方法もある。費用と鍵の管理が増えるので、MVP では A を推す。
