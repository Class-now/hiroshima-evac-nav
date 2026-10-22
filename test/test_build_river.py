"""scripts/build_river.py の単体テスト（標準ライブラリの unittest）。

  python3 -m unittest discover -s test -p "test_*.py"

使う CSV・HTML は test/fixtures/dobox_* の実データの抜粋（README.md 参照）。
"""
import importlib.util
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("build_river", HERE.parent / "scripts" / "build_river.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)

MISASA = "西部建設/国土交通省/1"  # 三篠橋(国)
YAMATE = "東部建設/国土交通省/1"  # 山手(国)。芦田川で観測所番号が三篠橋と同じ
NUKUSHINA = "西部建設/河川課/180"  # 温品
KUSATSU = "西部建設/国土交通省/19"  # 草津(国)。基準水位なし、14:40 は「**」
NAGAWAKU = "西部建設/国土交通省/17"  # 長和久(国)。終日「CC」


def raw(name):
    return (HERE / "fixtures" / name).read_bytes()


def fixture(name):
    return br.decode(raw(name))


class TestValues(unittest.TestCase):
    def test_to_float(self):
        self.assertEqual(br.to_float("1.25"), 1.25)
        self.assertEqual(br.to_float("-0.50 "), -0.5)
        self.assertEqual(br.to_float("－０．５"), -0.5)
        self.assertEqual(br.to_float("−0.52"), -0.52)
        # DoboX の欠測などの記号
        for v in ("", "**", "--", "CC", "欠測", None):
            self.assertIsNone(br.to_float(v))

    def test_to_deg(self):
        self.assertAlmostEqual(br.to_deg("34.407222222222224"), 34.407222222222224)
        self.assertAlmostEqual(br.to_deg('34°24\'00"'), 34.4)
        self.assertAlmostEqual(br.to_deg("1322700"), 132.45)

    def test_stage(self):
        th = {"standby": 2.5, "caution": 2.7, "evacuate": 2.8, "danger": 3.2}  # 三篠橋(国)
        self.assertEqual(br.stage(1.01, th), 0)
        self.assertEqual(br.stage(2.5, th), 1)
        self.assertEqual(br.stage(2.8, th), 3)
        self.assertEqual(br.stage(3.3, th), 4)
        self.assertEqual(br.stage(1.7, {"danger": 2.15}), 0)
        self.assertIsNone(br.stage(1.0, {}))
        self.assertIsNone(br.stage(None, th))

    def test_parse_when(self):
        self.assertEqual(br.parse_when("2026/10/22 21:20"), ("2026-10-22", "21:20"))
        self.assertEqual(br.parse_when("2026/10/9 0:00"), ("2026-10-09", "00:00"))
        self.assertEqual(br.parse_when("2026-10-21"), ("2026-10-21", ""))
        self.assertEqual(br.parse_when("観測時刻"), (None, ""))

    def test_decode(self):
        self.assertTrue(fixture("dobox_daily.csv").startswith("事務所名,"))  # UTF-8 の BOM を取る
        self.assertEqual(br.decode("観測所名".encode("cp932")), "観測所名")


class TestStations(unittest.TestCase):
    def setUp(self):
        self.st = br.parse_stations(fixture("dobox_stations.csv"))

    def test_header_is_third_line(self):
        rows = br.read_rows(fixture("dobox_stations.csv"))
        i, header = br.find_header(rows)
        self.assertEqual(i, 2)
        self.assertEqual(header[br.find_col(header, "code")], "観測所番号")
        self.assertEqual(header[br.find_col(header, "river")], "河川名")
        self.assertEqual(header[br.find_col(header, "office")], "集計連携用事務所名")
        self.assertEqual(header[br.find_col(header, "standby")], "水防団待機[m]")
        self.assertEqual(header[br.find_col(header, "danger")], "氾濫危険[m]")

    def test_only_water_level_stations(self):
        # 雨量（データ種別 1。戸山(国) は三篠橋と同じ国土交通省の 1 番）とダム（7）は除く
        self.assertEqual(sorted(self.st), sorted([MISASA, NUKUSHINA, KUSATSU, NAGAWAKU, YAMATE]))

    def test_same_number_in_other_office(self):
        self.assertEqual(self.st[MISASA]["name"], "三篠橋(国)")
        self.assertEqual(self.st[YAMATE]["name"], "山手(国)")
        self.assertEqual(self.st[MISASA]["river"], "旧太田川")

    def test_thresholds(self):
        self.assertEqual(self.st[MISASA]["thresholds"], {"standby": 2.5, "caution": 2.7, "evacuate": 2.8, "danger": 3.2})
        self.assertEqual(self.st[NUKUSHINA]["thresholds"], {"caution": 1.0, "evacuate": 1.15, "danger": 1.45})
        self.assertNotIn("thresholds", self.st[KUSATSU])
        self.assertAlmostEqual(self.st[MISASA]["lat"], 34.407222)
        self.assertAlmostEqual(self.st[MISASA]["lon"], 132.457222)

    def test_missing_header_is_an_error(self):
        with self.assertRaises(KeyError):
            br.parse_stations("（その他の各属性項目）,水位\n名前,値\nA,1\n")


class TestDaily(unittest.TestCase):
    def setUp(self):
        self.d = br.parse_daily(fixture("dobox_daily.csv"))

    def test_latest_and_max(self):
        self.assertEqual(self.d[MISASA], {"date": "2026-10-22", "time": "21:20", "level": 1.01, "max": 1.55, "max_time": "19:20"})
        self.assertEqual(self.d[YAMATE]["level"], -0.11)

    def test_max_tie_takes_earliest(self):
        self.assertEqual((self.d[NUKUSHINA]["max"], self.d[NUKUSHINA]["max_time"]), (0.19, "00:00"))

    def test_missing_marks(self):
        self.assertEqual(self.d[KUSATSU]["level"], 1.01)  # 「**」の行は飛ばす
        self.assertNotIn(NAGAWAKU, self.d)  # 終日「CC」

    def test_latest_value_before_missing_tail(self):
        text = "\n".join([
            "事務所名,西部建設,",
            "データ所管,河川課,",
            "観測所番号,5,",
            "観測時刻,水位[m],フラグ",
            "2026/10/22 00:00,0.50,0x00000000",
            "2026/10/22 00:10,0.70,0x00000000",
            "2026/10/22 00:20,**,0xbe000000",
            "2026/10/22 00:30,--,0xa0000000",
        ])
        self.assertEqual(br.parse_daily(text)["西部建設/河川課/5"], {"date": "2026-10-22", "time": "00:10", "level": 0.7, "max": 0.7, "max_time": "00:10"})

    def test_merge_with_previous_day(self):
        prev = br.parse_daily(fixture("dobox_daily_prev.csv"))
        self.assertEqual((prev[MISASA]["date"], prev[MISASA]["time"]), ("2026-10-21", "20:50"))
        today = dict(self.d)
        del today[NUKUSHINA]  # 当日の値がまだ無い観測所は前日の最後の値を使う
        m = br.merge_daily(prev, today)
        self.assertEqual(m[MISASA], self.d[MISASA])
        self.assertEqual((m[NUKUSHINA]["date"], m[NUKUSHINA]["time"], m[NUKUSHINA]["level"]), ("2026-10-21", "20:50", 0.19))
        self.assertEqual(br.merge_daily(today, prev)[MISASA], self.d[MISASA])  # 渡す順に関係しない

    def test_missing_label_is_an_error(self):
        with self.assertRaises(KeyError):
            br.parse_daily("日付,値\n2026/10/21 00:00,1\n")


class TestBuild(unittest.TestCase):
    def test_build(self):
        gj = br.build(br.parse_stations(fixture("dobox_stations.csv")), br.parse_daily(fixture("dobox_daily.csv")))
        codes = [f["properties"]["code"] for f in gj["features"]]
        self.assertEqual(sorted(codes), sorted([MISASA, NUKUSHINA, KUSATSU, NAGAWAKU]))  # 範囲外の山手は除く
        p = {f["properties"]["code"]: f["properties"] for f in gj["features"]}
        self.assertEqual((p[MISASA]["stage"], p[MISASA]["stage_max"]), (0, 0))
        self.assertIsNone(p[KUSATSU]["stage"])
        self.assertNotIn("level", p[NAGAWAKU])
        self.assertEqual(gj["observed"], "2026-10-22")
        f = next(f for f in gj["features"] if f["properties"]["code"] == MISASA)
        self.assertEqual(f["geometry"]["coordinates"], [132.457222, 34.407222])


class TestDatasetPage(unittest.TestCase):
    def test_first_page(self):
        page = fixture("dobox_dataset_page1.html")
        links = br.resource_links(page)
        self.assertEqual(len(links), 10)
        self.assertEqual(max(links)[1], 93941)  # 1 ページ目は古い順の先頭 10 件（〜2024-03-14）
        self.assertEqual(str(max(links)[0]), "2024-03-14")
        self.assertEqual(br.last_page(page, 1437), 97)

    def test_last_page(self):
        links = br.resource_links(fixture("dobox_dataset_last.html"))
        self.assertEqual([(str(d), rid) for d, rid, _ in sorted(links)], [("2026-10-21", 181124), ("2026-10-22", 181129)])

    def test_latest_resources_follows_pagination(self):
        pages = {
            "https://hiroshima-dobox.jp/datasets/1437": raw("dobox_dataset_page1.html"),
            "https://hiroshima-dobox.jp/datasets/1437?page=97": raw("dobox_dataset_last.html"),
            "https://hiroshima-dobox.jp/datasets/1437?page=96": b"",
        }
        seen = []
        orig = br.get
        br.get = lambda url: seen.append(url) or pages[url]
        try:
            best = br.latest_resources(1437, 2)
        finally:
            br.get = orig
        self.assertEqual([rid for _, rid, _ in best], [181129, 181124])
        self.assertIn("https://hiroshima-dobox.jp/datasets/1437?page=97", seen)


if __name__ == "__main__":
    unittest.main()
