"""scripts/build_shelter_names.py の単体テスト。python3 -m unittest discover -s test -p "test_*.py" """
import importlib.util
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("build_shelter_names", SCRIPTS / "build_shelter_names.py")
bn = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bn)


class TestKana(unittest.TestCase):
    def test_romaji(self):
        cases = {
            "なかじま": "Nakajima", "とうじょう": "Tojo", "おおしば": "Oshiba", "ちゅうおう": "Chuo",
            "てっぽうちょう": "Teppocho", "しののめ": "Shinonome", "ふないり": "Funairi", "みっちゃん": "Mitchan",
            "きょうばし": "Kyobashi", "ほんかわ ひろせ": "Honkawa Hirose",
            "かんおん": "Kan'on", "さんよう": "San'yo", "にほおおまち": "Nihoomachi", "おお|うら": "Oura",
        }
        for k, v in cases.items():
            self.assertEqual(bn.romaji(k), v, k)

    def test_hangul(self):
        cases = {
            "なかじま": "나카지마", "とうじょう": "도조", "こうご": "고고", "かんおん": "간온",
            "てっぽうちょう": "뎃포초", "つるみ": "쓰루미", "きょうばし": "교바시", "うじな": "우지나",
            "にほおおまち": "니호오마치", "おおしば": "오시바",
        }
        for k, v in cases.items():
            self.assertEqual(bn.hangul(k), v, k)


class TestNames(unittest.TestCase):
    def n(self, stem, kana, typ, **kw):
        return bn.names_for("x", {"stem": stem, "kana": kana, "type_ja": typ, **kw})

    def test_school(self):
        r = self.n("中島", "なかじま", "小学校")
        self.assertEqual((r["name_en"], r["name_zh"], r["name_ko"]), ("Nakajima Elementary School", "中岛小学", "나카지마 초등학교"))

    def test_ward_and_chome(self):
        self.assertEqual(self.n("中区", "なかく", "スポーツセンター")["name_en"], "Naka-ku Sports Center")
        self.assertEqual(self.n("中区", "なかく", "スポーツセンター")["name_ko"], "나카구 스포츠 센터")
        r = self.n("東雲本町三丁目", "しののめほんまちさんちょうめ", "集会所")
        self.assertEqual(r["name_en"], "Shinonome-honmachi 3-chome Assembly Hall")
        self.assertEqual(r["name_ko"], "시노노메혼마치 3초메 집회소")
        self.assertEqual(self.n("江波東", "えばひがし", "集会所")["name_en"], "Eba-higashi Assembly Hall")
        # 読みが合わないときは区切らない（東雲 は ひがし ではない）
        self.assertEqual(self.n("東雲", "しののめ", "集会所")["name_en"], "Shinonome Assembly Hall")

    def test_no_machine_translation_of_loanwords(self):
        r = self.n("ノートルダム清心", "のーとるだむせいしん", "中・高等学校")
        self.assertNotIn("name_en", r)
        self.assertNotIn("name_ko", r)
        self.assertNotIn("name_zh", r)
        r = self.n("あけぼの", "あけぼの", "保育園")
        self.assertEqual(r["name_en"], "Akebono Nursery School")
        self.assertNotIn("name_zh", r)  # 仮名の固有名は簡体字にできない

    def test_official_and_unknown_type(self):
        r = self.n("平和記念", "へいわきねん", "公園", official_en="Peace Memorial Park")
        self.assertEqual(r["name_en"], "Peace Memorial Park")
        self.assertEqual(r["names_src"], "official_en")
        r = self.n("広島", "ひろしま", "刑務所")
        self.assertNotIn("name_en", r)
        self.assertNotIn("name_zh", r)


if __name__ == "__main__":
    unittest.main()
