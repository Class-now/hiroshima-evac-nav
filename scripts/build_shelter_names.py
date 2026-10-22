#!/usr/bin/env python3
"""避難場所名の英・中・韓の表記を data/shelters.geojson に足す（標準ライブラリだけ）。

固有名詞は機械翻訳しない。scripts/shelter_names_manual.json の「固有名の部分（stem）とその読み（kana）」から
  英語: ヘボン式ローマ字（長音記号なし）＋施設種別の英語
  韓国語: 外来語表記法（日本語の仮名）に沿ったハングル＋施設種別
  中国語: 固有名の漢字を簡体字の字形に置き換えたもの＋施設種別（仮名を含む名前は字形のまま）
を機械的に作る。施設種別の訳は TYPES の表（作者の訳。本人が docs/translation-review-shelters.md で確認する）。
公式の英語名が確認できた施設は official_en を使う。日本語の名前はアプリでいつも併記する（看板と照合できるように）。

Usage:
  python3 -I scripts/build_shelter_names.py            # data/shelters.geojson を書き換え、確認表を作る
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_data import category  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
GEOJSON = ROOT / "data" / "shelters.geojson"
MANUAL = ROOT / "scripts" / "shelter_names_manual.json"
REVIEW = ROOT / "docs" / "translation-review-shelters.md"

# 施設種別: 日本語 → (English, 简体中文, 한국어)
TYPES = {
    "集会所": ("Assembly Hall", "集会所", "집회소"),
    "学区集会所": ("School District Assembly Hall", "学区集会所", "학구 집회소"),
    "地区集会所": ("District Assembly Hall", "地区集会所", "지구 집회소"),
    "小学校": ("Elementary School", "小学", "초등학교"),
    "中学校": ("Junior High School", "初中", "중학교"),
    "高等学校": ("High School", "高中", "고등학교"),
    "商業高等学校": ("Commercial High School", "商业高中", "상업고등학교"),
    "工業高等学校": ("Technical High School", "工业高中", "공업고등학교"),
    "小・中学校": ("Elementary and Junior High School", "小学・初中", "초・중학교"),
    "小中学校": ("Elementary and Junior High School", "小学・初中", "초・중학교"),
    "中・高等学校": ("Junior and Senior High School", "初中・高中", "중・고등학교"),
    "附属小・中・高等学校": ("Attached Elementary, Junior and Senior High School", "附属小学・初中・高中", "부속 초・중・고등학교"),
    "大学": ("University", "大学", "대학교"),
    "学園": ("School", "学园", "학원"),
    "児童館": ("Children's Center", "儿童馆", "아동관"),
    "保育園": ("Nursery School", "保育园", "보육원"),
    "第二保育園": ("Nursery School No. 2", "第二保育园", "제2 보육원"),
    "幼稚園": ("Kindergarten", "幼儿园", "유치원"),
    "公民館": ("Community Center", "公民馆", "공민관"),
    "会館": ("Hall", "会馆", "회관"),
    "学区会館": ("School District Hall", "学区会馆", "학구 회관"),
    "職員会館": ("Staff Hall", "职员会馆", "직원 회관"),
    "地域交流センター": ("Community Exchange Center", "地区交流中心", "지역 교류 센터"),
    "歓迎交流センター": ("Welcome and Exchange Center", "欢迎交流中心", "환영 교류 센터"),
    "区民文化センター": ("Ward Cultural Center", "区民文化中心", "구민 문화 센터"),
    "文化芸術ホール": ("Culture and Arts Hall", "文化艺术厅", "문화 예술 홀"),
    "図書館": ("Library", "图书馆", "도서관"),
    "福祉センター": ("Welfare Center", "福利中心", "복지 센터"),
    "地域福祉センター": ("Community Welfare Center", "地区福利中心", "지역 복지 센터"),
    "心身障害者福祉センター": ("Welfare Center for People with Disabilities", "身心障碍者福利中心", "심신장애인 복지 센터"),
    "スポーツセンター": ("Sports Center", "体育中心", "스포츠 센터"),
    "体育館": ("Gymnasium", "体育馆", "체육관"),
    "総合グランド": ("Sports Ground", "综合运动场", "종합 운동장"),
    "公園": ("Park", "公园", "공원"),
    "中央公園": ("Central Park", "中央公园", "중앙 공원"),
    "総合公園": ("Park", "综合公园", "종합 공원"),
    "第一公園": ("Park No. 1", "第一公园", "제1 공원"),
    "第五公園": ("Park No. 5", "第五公园", "제5 공원"),
    "第六公園": ("Park No. 6", "第六公园", "제6 공원"),
    "第八公園": ("Park No. 8", "第八公园", "제8 공원"),
    "公園広場エリア": ("Park (Plaza Area)", "公园广场区", "공원 광장 구역"),
    "イベント広場": ("Event Plaza", "活动广场", "이벤트 광장"),
    "少年自然の家": ("Youth Nature Center", "少年自然之家", "소년 자연의 집"),
    "競輪場": ("Keirin Velodrome", "自行车赛场", "경륜장"),
    "サッカースタジアム": ("Football Stadium", "足球场", "축구 경기장"),
    "国際会議場": ("International Conference Center", "国际会议场", "국제회의장"),
    "墓園": ("Cemetery Park", "墓园", "묘원"),
}
PREFIX = {"県立": ("Prefectural", "县立", "현립"), "市立": ("Municipal", "市立", "시립")}

# 日本の字形 → 簡体字（避難場所名に出てくる字だけ）。
SIMPLIFIED = str.maketrans(
    "広島東県園実宮創場幟徳戸栄業橋浄浜渕満滝瀬環縮臨葉術観記賀跡輪進鈴長陽雲須館馬鷹稲竜﨑区会旧単",
    "广岛东县园实宫创场帜德户荣业桥净滨渊满泷濑环缩临叶术观记贺迹轮进铃长阳云须馆马鹰稻龙崎区会旧单",
)

# ---- 仮名 → ローマ字（ヘボン式、長音記号なし） ----------------------------------------------

_K = "あいうえお かきくけこ さしすせそ たちつてと なにぬねの はひふへほ まみむめも や ゆ よ らりるれろ わ を がぎぐげご ざじずぜぞ だぢづでど ばびぶべぼ ぱぴぷぺぽ ん"
_R = "a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa o ga gi gu ge go za ji zu ze zo da ji zu de do ba bi bu be bo pa pi pu pe po n"
ROMA = dict(zip(_K.replace(" ", ""), _R.split()))
YOON = {"ゃ": "a", "ゅ": "u", "ょ": "o"}


def kana_syllables(word):
    """ひらがなを音節の列に。拗音（きゃ）は 1 音節、っ・ん・ー はそのまま。"""
    out = []
    for ch in word:
        if ch in YOON and out:
            out[-1] += ch
        else:
            out.append(ch)
    return out


def syl_roma(s):
    if len(s) == 2 and s[1] in YOON:
        base = ROMA[s[0]]
        v = YOON[s[1]]
        if base in ("shi", "chi", "ji"):
            return base[:-1] + v
        return base[:-1] + "y" + v
    return ROMA.get(s, "")


def romaji_word(word):
    syl = kana_syllables(word)
    out = ""
    i = 0
    while i < len(syl):
        s = syl[i]
        if s == "っ":
            nxt = syl_roma(syl[i + 1]) if i + 1 < len(syl) else ""
            out += "t" if nxt.startswith("ch") else nxt[:1]
        elif s == "ー":
            pass
        else:
            r = syl_roma(s)
            # 長音: おう → o、うう → u、おお → o（ヘボン式の長音記号は付けない）。
            # ほお のように前の音節が お 段の別の字なら残す（仁保大町 にほおおまち → Nihoomachi）。
            if s == "う" and out[-1:] in ("o", "u"):
                r = ""
            elif s == "お" and i > 0 and syl[i - 1] == "お":
                r = ""
            # ん の後に母音・y が来るときは n' と書く（観音 Kan'on）
            if out.endswith("n") and syl[i - 1] == "ん" and r[:1] in ("a", "i", "u", "e", "o", "y"):
                out += "'"
            out += r
        i += 1
    return out


def romaji(kana):
    """スペース・中黒は語の区切り。| は語の中の切れ目（長音をまたいでまとめない。大浦 おお|うら → Oura）。"""
    words = [w for w in re.split(r"[\s・]+", kana) if w]
    return " ".join("".join(romaji_word(p) for p in w.split("|")).capitalize() for w in words)


# ---- 仮名 → ハングル（外来語表記法「日本語の仮名と한글 대조표」） -------------------------------

# 仮名: 語頭 / 語中（1 字なら同じ）
_HG = {
    "あ": "아", "い": "이", "う": "우", "え": "에", "お": "오",
    "か": "가카", "き": "기키", "く": "구쿠", "け": "게케", "こ": "고코",
    "さ": "사", "し": "시", "す": "스", "せ": "세", "そ": "소",
    "た": "다타", "ち": "지치", "つ": "쓰", "て": "데테", "と": "도토",
    "な": "나", "に": "니", "ぬ": "누", "ね": "네", "の": "노",
    "は": "하", "ひ": "히", "ふ": "후", "へ": "헤", "ほ": "호",
    "ま": "마", "み": "미", "む": "무", "め": "메", "も": "모",
    "や": "야", "ゆ": "유", "よ": "요",
    "ら": "라", "り": "리", "る": "루", "れ": "레", "ろ": "로",
    "わ": "와", "を": "오",
    "が": "가", "ぎ": "기", "ぐ": "구", "げ": "게", "ご": "고",
    "ざ": "자", "じ": "지", "ず": "즈", "ぜ": "제", "ぞ": "조",
    "だ": "다", "ぢ": "지", "づ": "즈", "で": "데", "ど": "도",
    "ば": "바", "び": "비", "ぶ": "부", "べ": "베", "ぼ": "보",
    "ぱ": "파", "ぴ": "피", "ぷ": "푸", "ぺ": "페", "ぽ": "포",
    "きゃ": "갸캬", "きゅ": "규큐", "きょ": "교쿄",
    "ぎゃ": "갸", "ぎゅ": "규", "ぎょ": "교",
    "しゃ": "샤", "しゅ": "슈", "しょ": "쇼",
    "じゃ": "자", "じゅ": "주", "じょ": "조",
    "ちゃ": "자차", "ちゅ": "주추", "ちょ": "조초",
    "にゃ": "냐", "にゅ": "뉴", "にょ": "뇨",
    "ひゃ": "햐", "ひゅ": "휴", "ひょ": "효",
    "びゃ": "뱌", "びゅ": "뷰", "びょ": "뵤",
    "ぴゃ": "퍄", "ぴゅ": "퓨", "ぴょ": "표",
    "みゃ": "먀", "みゅ": "뮤", "みょ": "묘",
    "りゃ": "랴", "りゅ": "류", "りょ": "료",
}


def _add_final(ch, t):
    """ハングル 1 字に終声を付ける（t: ㄴ=4, ㅅ=19）。"""
    c = ord(ch) - 0xAC00
    return chr(0xAC00 + c - c % 28 + t)


def hangul_word(word):
    out = []
    prev_vowel = ""
    prev = ""
    for s in kana_syllables(word):
        if s in ("ん", "っ"):
            if out:
                out[-1] = _add_final(out[-1], 4 if s == "ん" else 19)
            continue
        if s == "ー" or s not in _HG:
            continue
        # 長音は書かない: おう → 오、うう → 우、語頭の おお → 오（romaji_word と同じ規則）
        if (s == "う" and prev_vowel in ("o", "u")) or (s == "お" and prev == "お"):
            prev = s
            continue
        prev = s
        h = _HG[s]
        out.append(h[0] if not out or len(h) == 1 else h[1])
        prev_vowel = syl_roma(s)[-1:]
    return "".join(out)


def hangul(kana):
    return " ".join("".join(hangul_word(p) for p in w.split("|")) for w in re.split(r"[\s・]+", kana) if w)


# ---- 名前の組み立て ------------------------------------------------------------------------


def has_kana(s):
    return bool(re.search(r"[぀-ヿ]", s))


NUM = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
CHOME = re.compile(r"(?:いっ|に|さん|よん|ご|ろく|なな|はっ|きゅう)ちょうめ$")
# 前後に付く地名の要素（漢字, 読み, ローマ字）。読みが一致したときだけ区切る。
AFFIX = [("東", "ひがし", "Higashi"), ("西", "にし", "Nishi"), ("南", "みなみ", "Minami"), ("北", "きた", "Kita"),
         ("本町", "ほんまち", "Honmachi"), ("新町", "しんまち", "Shinmachi"), ("上", "かみ", "Kami"), ("下", "しも", "Shimo")]
PREFIXES = AFFIX[:4] + [("広島", "ひろしま", "Hiroshima")]


def segments(stem, kana):
    """固有名を読みやすく区切る → (前, 本体, 後, 丁目)。例: 東雲本町三丁目 → ('', 'しののめ', 'Honmachi', 3)。"""
    kana = kana.replace(" ", "・") if "・" in stem else kana
    chome = None
    m = re.search(r"([一二三四五六七八九])丁目$", stem)
    if m and CHOME.search(kana):
        chome = NUM[m.group(1)]
        stem, kana = stem[: m.start()], CHOME.sub("", kana)
    pre = post = ""
    for k, r, ro in AFFIX:
        if stem.endswith(k) and len(stem) > len(k) and kana.endswith(r) and len(kana) > len(r):
            post, stem, kana = ro, stem[: -len(k)], kana[: -len(r)]
            break
    for k, r, ro in PREFIXES:
        if stem.startswith(k) and len(stem) > len(k) + 1 and kana.startswith(r) and len(kana) > len(r):
            pre, stem, kana = ro, stem[len(k):], kana[len(r):]
            break
    return pre, kana, post, chome


def stem_romaji(stem, kana):
    """中区 → Naka-ku、東雲本町三丁目 → Shinonome-honmachi 3-chome、江波東 → Eba-higashi。"""
    if stem.endswith("区") and kana.endswith("く") and len(kana) > 1:
        return romaji(kana[:-1]) + "-ku"
    pre, body, post, chome = segments(stem, kana)
    r = romaji(body)
    if pre:
        r = pre + (" " + r if pre == "Hiroshima" else "-" + r.lower())
    if post:
        r = r + "-" + post.lower()
    if chome:
        r += f" {chome}-chome"
    return r


def stem_hangul(stem, kana):
    if stem.endswith("区") and kana.endswith("く") and len(kana) > 1:
        return hangul(kana[:-1]) + "구"  # 区 は 구（한자음）で書く習慣に合わせる
    pre, body, post, chome = segments(stem, kana)
    rd = {ro: r for _, r, ro in AFFIX + PREFIXES}
    h = hangul((rd[pre] if pre else "") + body + (rd[post] if post else ""))
    return h + (f" {chome}초메" if chome else "")


def has_katakana(s):
    return bool(re.search(r"[\u30a1-\u30fa]", s))


def names_for(name, m, cat=None):
    """manual の 1 件から {name_en, name_zh, name_ko, name_kana, names_src} を作る。作れないものは入れない。"""
    out = {"name_kana": m["kana"].replace(" ", "").replace("|", "")}
    stem, typ, prefix = m["stem"], m.get("type_ja", ""), m.get("prefix_ja", "")
    t = TYPES.get(typ)
    pre = PREFIX.get(prefix)
    if m.get("official_en"):
        out["name_en"] = m["official_en"]
        out["names_src"] = "official_en"
    elif m.get("no_proper_noun"):
        if m.get("type_hint"):
            out["name_en"] = m["type_hint"][0].upper() + m["type_hint"][1:]
        out["names_src"] = "type_hint"
    elif has_katakana(stem):
        # 外来語（ノートルダム など）はローマ字にすると元の綴りと違ってしまうので、英語名を作らない。
        out["names_src"] = "katakana"
    else:
        en_stem = stem_romaji(stem, m["kana"])
        if t:
            ty = t[0]
            # 区民文化センター: 南区 + Ward Cultural Center → Minami-ku Cultural Center
            if typ.startswith("区") and en_stem.endswith("-ku"):
                ty = ty.replace("Ward ", "")
            out["name_en"] = " ".join(x for x in ((pre[0] if pre else ""), en_stem, ty) if x)
        elif typ == "":
            hint = m.get("type_hint")
            out["name_en"] = en_stem + (f" ({hint})" if hint else "")
        out["names_src"] = "romaji"
    if not m.get("no_proper_noun") and t and not has_katakana(stem):
        ko_stem = stem_hangul(stem, m["kana"])
        ko_type = t[2]
        if typ.startswith("区") and ko_stem.endswith("구"):
            ko_type = ko_type.replace("구민 ", "")
        out["name_ko"] = " ".join(x for x in ((pre[2] if pre else ""), ko_stem, ko_type) if x)
    if not m.get("no_proper_noun") and t and not has_kana(stem):
        zh_stem = stem.translate(SIMPLIFIED)
        zh_type = t[1]
        if typ.startswith("区") and zh_stem.endswith("区"):
            zh_type = zh_type[1:]
        out["name_zh"] = (pre[1] if pre else "") + zh_stem + zh_type
    return out


def main():
    manual = json.loads(MANUAL.read_text(encoding="utf-8"))
    gj = json.loads(GEOJSON.read_text(encoding="utf-8"))
    rows = []
    for f in gj["features"]:
        p = f["properties"]
        for k in ("name_en", "name_zh", "name_ko", "name_kana", "names_src"):
            p.pop(k, None)
        cat = category(p["name"])
        if cat:
            p["cat"] = cat
        else:
            p.pop("cat", None)
        m = manual.get(p["name"])
        if not m:
            continue
        p.update(names_for(p["name"], m, p.get("cat")))
        rows.append((p, m))
    GEOJSON.write_text(json.dumps(gj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"shelters.geojson: names for {len(rows)}/{len(gj['features'])}, en {sum('name_en' in p for p, _ in rows)}, ko {sum('name_ko' in p for p, _ in rows)}")
    write_review(rows)


def write_review(rows):
    esc = lambda s: str(s or "").replace("|", "\\|")
    lines = [
        "# 避難場所名の訳語の確認表",
        "",
        "`python3 -I scripts/build_shelter_names.py` が作る（手で書き換えない。直すのは `scripts/shelter_names_manual.json` の読み・区切りか、`scripts/build_shelter_names.py` の TYPES）。",
        "",
        "## 方針",
        "",
        "- 固有名詞は機械翻訳しない。固有名の部分（stem）の読み（かな）から機械的に作る: 英語はヘボン式ローマ字（長音記号なし）、韓国語は外来語表記法のハングル、中国語は漢字を簡体字の字形に置き換えただけ。",
        "- 施設の種類（小学校・集会所 など）は表 `TYPES` の訳を付ける（作者の訳）。",
        "- 公式の英語名が確認できたものだけ official_en を使う（出典 URL は shelter_names_manual.json）。",
        "- アプリでは日本語の名前をいつも併記する（現地の看板と照らし合わせられるように）。",
        "- 読みは作者（AI 補助）の案。**conf=low は特に確認してほしい**。確認したら ✓ 欄に印を付け、直すところは右端に書く。",
        "",
        "## 施設種別の訳",
        "",
        "| 日本語 | English | 简体中文 | 한국어 | ✓ |",
        "|---|---|---|---|---|",
    ]
    used = {m.get("type_ja", "") for _, m in rows}
    for k, (en, zh, ko) in TYPES.items():
        if k in used:
            lines.append(f"| {k} | {en} | {zh} | {ko} | |")
    lines += [
        "",
        "## 施設ごと（conf=low を先に）",
        "",
        "| # | 日本語 | よみ | conf | English | 简体中文 | 한국어 | 種別 | メモ | ✓ | 直し |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    rows = sorted(rows, key=lambda r: (r[1].get("conf") != "low", r[0]["name"]))
    for i, (p, m) in enumerate(rows, 1):
        lines.append(
            f"| {i} | {esc(p['name'])} | {esc(m['kana'])} | {m.get('conf', '')} | {esc(p.get('name_en'))} | {esc(p.get('name_zh'))} | {esc(p.get('name_ko'))} | {esc(p.get('names_src'))} | {esc(m.get('note'))} | | |"
        )
    REVIEW.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{REVIEW.relative_to(ROOT)}: {len(rows)} rows")


if __name__ == "__main__":
    main()
