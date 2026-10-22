"""scripts/build_river.py の単体テスト（標準ライブラリの unittest）。

  python3 -m unittest discover -s test -p "test_*.py"

使う CSV は test/fixtures/ の架空データ（README.md 参照）。
"""
import importlib.util
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("build_river", HERE.parent / "scripts" / "build_river.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)


def fixture(name):
    return br.decode((HERE / "fixtures" / name).read_bytes())


class TestValues(unittest.TestCase):
    def test_to_float(self):
        self.assertEqual(br.to_float("1.25"), 1.25)
        self.assertEqual(br.to_float("－０．５"), -0.5)
        for v in ("", "-", "欠測", "*", None, "閉局"):
            self.assertIsNone(br.to_float(v))

    def test_to_deg(self):
        self.assertAlmostEqual(br.to_deg("34.4"), 34.4)
        self.assertAlmostEqual(br.to_deg('34°24\'00"'), 34.4)
        self.assertAlmostEqual(br.to_deg("34度24分36秒"), 34.41)
        self.assertAlmostEqual(br.to_deg("1322700"), 132.45)

    def test_stage(self):
        th = {"standby": 1.0, "caution": 1.5, "evacuate": 2.0, "danger": 2.5}
        self.assertEqual(br.stage(0.5, th), 0)
        self.assertEqual(br.stage(1.0, th), 1)
        self.assertEqual(br.stage(2.2, th), 3)
        self.assertEqual(br.stage(3.0, th), 4)
        self.assertEqual(br.stage(1.7, {"danger": 2.5}), 0)
        self.assertIsNone(br.stage(1.0, {}))
        self.assertIsNone(br.stage(None, th))


class TestParse(unittest.TestCase):
    def test_stations(self):
        st = br.parse_stations(fixture("river_stations.csv"))
        self.assertEqual(sorted(st), ["T001", "T002", "T004"])  # 雨量の観測所は除く
        self.assertEqual(st["T001"]["thresholds"], {"standby": 1.0, "caution": 1.5, "evacuate": 2.0, "danger": 2.5})
        self.assertAlmostEqual(st["T002"]["lon"], 132.45)
        self.assertNotIn("thresholds", st["T002"])

    def test_daily_hourly(self):
        d = br.parse_daily(fixture("river_daily_hourly.csv"))
        self.assertEqual(d["T001"]["time"], "20:00")  # 21 時以降は欠測
        self.assertEqual(d["T001"]["level"], 0.77)
        self.assertEqual((d["T001"]["max"], d["T001"]["max_time"]), (1.6, "04:00"))
        self.assertEqual(d["T002"]["level"], 0.12)
        self.assertEqual(d["T002"]["time"], "24:00")

    def test_daily_long_and_sjis(self):
        for name in ("river_daily_long.csv", "river_daily_long_sjis.csv"):
            d = br.parse_daily(fixture(name))
            self.assertEqual(d["T001"]["level"], 1.7, name)
            self.assertEqual(d["T001"]["max"], 2.1, name)
            self.assertEqual(d["T002"]["level"], 0.3, name)

    def test_missing_column_is_an_error(self):
        with self.assertRaises(KeyError):
            br.parse_daily("日付,値\n2026/10/21,1\n")

    def test_build(self):
        gj = br.build(br.parse_stations(fixture("river_stations.csv")), br.parse_daily(fixture("river_daily_hourly.csv")))
        codes = [f["properties"]["code"] for f in gj["features"]]
        self.assertEqual(codes, ["T001", "T002"])  # 範囲外の T004 は除く
        p = gj["features"][0]["properties"]
        self.assertEqual((p["stage"], p["stage_max"]), (0, 2))
        self.assertIsNone(gj["features"][1]["properties"]["stage"])
        self.assertEqual(gj["observed"], "2026/10/21")


if __name__ == "__main__":
    unittest.main()
