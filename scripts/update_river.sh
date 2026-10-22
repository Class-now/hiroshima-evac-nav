#!/bin/sh
# 河川水位を手元（日本国内の PC）で更新してコミット・push する。セルフホストランナーを使わない場合の代わり。
#   sh scripts/update_river.sh            # 取得 → data/river.json → テスト → コミット → push
#   sh scripts/update_river.sh --no-push  # push しない
# cron / launchd で毎日動かすこともできる（docs/river-data.md）。
set -eu
# 途中の git pull でこのファイル自体が書き換わっても崩れないよう、全体を { } で先に読み込んでから実行する。
{
  cd "$(dirname "$0")/.."
  PY="${PYTHON:-python3}"  # Windows は python3 が Store のスタブなので PYTHON=python を渡す
  # リモートが先に進んでいると最後の push が拒否されるので、先に追いつく（分岐していたら止まる）。
  git pull --ff-only --quiet
  RAW="${TMPDIR:-/tmp}/hiroshima-evac-nav-river"
  rm -rf "$RAW"
  "$PY" -I scripts/build_river.py --raw "$RAW" --fetch
  "$PY" -m unittest discover -s test -p "test_*.py"
  if git diff --quiet -- data/river.json && git ls-files --error-unmatch data/river.json >/dev/null 2>&1; then
    echo "no change"; exit 0
  fi
  git add data/river.json
  git commit -m "河川水位を更新（DoboX 水位日集計）" -- data/river.json
  [ "${1:-}" = "--no-push" ] || git push
  exit 0
}
