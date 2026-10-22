# 避難場所名の訳語の確認表

`python3 -I scripts/build_shelter_names.py` が作る（手で書き換えない。直すのは `scripts/shelter_names_manual.json` の読み・区切りか、`scripts/build_shelter_names.py` の TYPES）。

## 方針

- 固有名詞は機械翻訳しない。固有名の部分（stem）の読み（かな）から機械的に作る: 英語はヘボン式ローマ字（長音記号なし）、韓国語は外来語表記法のハングル、中国語は漢字を簡体字の字形に置き換えただけ。
- 施設の種類（小学校・集会所 など）は表 `TYPES` の訳を付ける（作者の訳）。
- 公式の英語名が確認できたものだけ official_en を使う（出典 URL は shelter_names_manual.json）。
- アプリでは日本語の名前をいつも併記する（現地の看板と照らし合わせられるように）。
- 読みは作者（AI 補助）の案。**conf=low は特に確認してほしい**。確認したら ✓ 欄に印を付け、直すところは右端に書く。

## 施設種別の訳

| 日本語 | English | 简体中文 | 한국어 | ✓ |
|---|---|---|---|---|
| 集会所 | Assembly Hall | 集会所 | 집회소 | |
| 学区集会所 | School District Assembly Hall | 学区集会所 | 학구 집회소 | |
| 地区集会所 | District Assembly Hall | 地区集会所 | 지구 집회소 | |
| 小学校 | Elementary School | 小学 | 초등학교 | |
| 中学校 | Junior High School | 初中 | 중학교 | |
| 高等学校 | High School | 高中 | 고등학교 | |
| 商業高等学校 | Commercial High School | 商业高中 | 상업고등학교 | |
| 工業高等学校 | Technical High School | 工业高中 | 공업고등학교 | |
| 小・中学校 | Elementary and Junior High School | 小学・初中 | 초・중학교 | |
| 小中学校 | Elementary and Junior High School | 小学・初中 | 초・중학교 | |
| 中・高等学校 | Junior and Senior High School | 初中・高中 | 중・고등학교 | |
| 附属小・中・高等学校 | Attached Elementary, Junior and Senior High School | 附属小学・初中・高中 | 부속 초・중・고등학교 | |
| 大学 | University | 大学 | 대학교 | |
| 学園 | School | 学园 | 학원 | |
| 児童館 | Children's Center | 儿童馆 | 아동관 | |
| 保育園 | Nursery School | 保育园 | 보육원 | |
| 第二保育園 | Nursery School No. 2 | 第二保育园 | 제2 보육원 | |
| 幼稚園 | Kindergarten | 幼儿园 | 유치원 | |
| 公民館 | Community Center | 公民馆 | 공민관 | |
| 会館 | Hall | 会馆 | 회관 | |
| 学区会館 | School District Hall | 学区会馆 | 학구 회관 | |
| 職員会館 | Staff Hall | 职员会馆 | 직원 회관 | |
| 地域交流センター | Community Exchange Center | 地区交流中心 | 지역 교류 센터 | |
| 歓迎交流センター | Welcome and Exchange Center | 欢迎交流中心 | 환영 교류 센터 | |
| 区民文化センター | Ward Cultural Center | 区民文化中心 | 구민 문화 센터 | |
| 文化芸術ホール | Culture and Arts Hall | 文化艺术厅 | 문화 예술 홀 | |
| 図書館 | Library | 图书馆 | 도서관 | |
| 福祉センター | Welfare Center | 福利中心 | 복지 센터 | |
| 地域福祉センター | Community Welfare Center | 地区福利中心 | 지역 복지 센터 | |
| 心身障害者福祉センター | Welfare Center for People with Disabilities | 身心障碍者福利中心 | 심신장애인 복지 센터 | |
| スポーツセンター | Sports Center | 体育中心 | 스포츠 센터 | |
| 体育館 | Gymnasium | 体育馆 | 체육관 | |
| 総合グランド | Sports Ground | 综合运动场 | 종합 운동장 | |
| 公園 | Park | 公园 | 공원 | |
| 中央公園 | Central Park | 中央公园 | 중앙 공원 | |
| 総合公園 | Park | 综合公园 | 종합 공원 | |
| 第一公園 | Park No. 1 | 第一公园 | 제1 공원 | |
| 第五公園 | Park No. 5 | 第五公园 | 제5 공원 | |
| 第六公園 | Park No. 6 | 第六公园 | 제6 공원 | |
| 第八公園 | Park No. 8 | 第八公园 | 제8 공원 | |
| 公園広場エリア | Park (Plaza Area) | 公园广场区 | 공원 광장 구역 | |
| イベント広場 | Event Plaza | 活动广场 | 이벤트 광장 | |
| 少年自然の家 | Youth Nature Center | 少年自然之家 | 소년 자연의 집 | |
| 競輪場 | Keirin Velodrome | 自行车赛场 | 경륜장 | |
| サッカースタジアム | Football Stadium | 足球场 | 축구 경기장 | |
| 国際会議場 | International Conference Center | 国际会议场 | 국제회의장 | |
| 墓園 | Cemetery Park | 墓园 | 묘원 | |

## 施設ごと（conf=low を先に）

| # | 日本語 | よみ | conf | English | 简体中文 | 한국어 | 種別 | メモ | ✓ | 直し |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 中山大堤集会所 | なかやまおおつつみ | low | Nakayamaotsutsumi Assembly Hall | 中山大堤集会所 | 나카야마오쓰쓰미 집회소 | romaji | 「大堤」の読み（おおつつみ／おおづつみ）は未確認。 | | |
| 2 | 丸山集会所 | まるやま | low | Maruyama Assembly Hall | 丸山集会所 | 마루야마 집회소 | romaji | 一般的な読みで推定。地元の読みを要確認。 | | |
| 3 | 仁保旭ケ丘集会所（旭ヶ丘会館） | にほあさひがおか | low |  |  |  | katakana | 「旭ケ丘」は あさひがおか と推定。 | | |
| 4 | 大宮集会所 | おおみや | low | Omiya Assembly Hall | 大宫集会所 | 오미야 집회소 | romaji | 一般的な読みで推定。 | | |
| 5 | 山田児童館 | やまだ | low | Yamada Children's Center | 山田儿童馆 | 야마다 아동관 | romaji | 西区山田（やまだ）と推定。 | | |
| 6 | 山田地区集会所 | やまだ | low | Yamada District Assembly Hall | 山田地区集会所 | 야마다 지구 집회소 | romaji | 西区山田（やまだ）と推定。 | | |
| 7 | 山田小学校 | やまだ | low | Yamada Elementary School | 山田小学 | 야마다 초등학교 | romaji | 西区山田（やまだ）と推定。 | | |
| 8 | 山田集会所 | やまだ | low | Yamada Assembly Hall | 山田集会所 | 야마다 집회소 | romaji | 西区山田（やまだ）と推定。 | | |
| 9 | 己斐大迫集会所 | こいおおさこ | low | Koiosako Assembly Hall | 己斐大迫集会所 | 고이오사코 집회소 | romaji | 「大迫」は おおさこ と推定（おおはさま 等の可能性あり）。 | | |
| 10 | 柞木集会所（柞木会館） | ほうそぎ | low | Hosogi Assembly Hall | 柞木集会所 | 호소기 집회소 | romaji | 「柞木」の読みは未確認（ほうそぎ／ゆすのき／ほうそのき 等の可能性）。要確認。 | | |
| 11 | 田方上集会所 | たがたかみ | low | Tagata-kami Assembly Hall | 田方上集会所 | 다가타카미 집회소 | romaji | 「田方上」の読み（たがたかみ／たがたうえ）は未確認。 | | |
| 12 | 皇ケ丘集会所 | おうがおか | low |  |  |  | katakana | 読み未確認（おうがおか／すめらがおか 等）。東区中山付近の地名と推定。要確認。 | | |
| 13 | あけぼの保育園 | あけぼの | high | Akebono Nursery School |  | 아케보노 보육원 | romaji |  | | |
| 14 | ふくしま保育園 | ふくしま | high | Fukushima Nursery School |  | 후쿠시마 보육원 | romaji |  | | |
| 15 | まんが図書館 | まんが | high | Manga Library |  | 만가 도서관 | romaji | 「まんが」は普通名詞なので Manga と訳出してよい。 | | |
| 16 | みゆき保育園 | みゆき | high | Miyuki Nursery School |  | 미유키 보육원 | romaji |  | | |
| 17 | わかくさ保育園 | わかくさ | high | Wakakusa Nursery School |  | 와카쿠사 보육원 | romaji |  | | |
| 18 | アステールプラザ（ＪＭＳアステールプラザ） | あすてーるぷらざ | high | JMS Aster Plaza |  |  | official_en | JMS はネーミングライツ。official_src は広島観光コンベンションビューローの英語ページ（施設自身のサイトではない）。 | | |
| 19 | ノートルダム清心中・高等学校 | のーとるだむせいしん | high |  |  |  | katakana |  | | |
| 20 | 三滝会館 | みたき | high | Mitaki Hall | 三泷会馆 | 미타키 회관 | romaji |  | | |
| 21 | 三滝少年自然の家 | みたき | high | Mitaki Youth Nature Center | 三泷少年自然之家 | 미타키 소년 자연의 집 | romaji |  | | |
| 22 | 三滝本町集会所 | みたきほんまち | high | Mitaki-honmachi Assembly Hall | 三泷本町集会所 | 미타키혼마치 집회소 | romaji |  | | |
| 23 | 三篠・楠木集会所 | みささ くすのき | high | Misasa Kusunoki Assembly Hall |  | 미사사 구스노키 집회소 | romaji |  | | |
| 24 | 三篠保育園 | みささ | high | Misasa Nursery School | 三篠保育园 | 미사사 보육원 | romaji |  | | |
| 25 | 三篠児童館 | みささ | high | Misasa Children's Center | 三篠儿童馆 | 미사사 아동관 | romaji |  | | |
| 26 | 三篠公民館 | みささ | high | Misasa Community Center | 三篠公民馆 | 미사사 공민관 | romaji |  | | |
| 27 | 三篠小学校 | みささ | high | Misasa Elementary School | 三篠小学 | 미사사 초등학교 | romaji |  | | |
| 28 | 三篠･楠木集会所 | みささ くすのき | high | Misasa Kusunoki Assembly Hall | 三篠･楠木集会所 | 미사사 구스노키 집회소 | romaji |  | | |
| 29 | 上東雲集会所 | かみしののめ | high | Kamishinonome Assembly Hall | 上东云集会所 | 가미시노노메 집회소 | romaji |  | | |
| 30 | 上温品児童館 | かみぬくしな | high | Kaminukushina Children's Center | 上温品儿童馆 | 가미누쿠시나 아동관 | romaji |  | | |
| 31 | 上温品小学校 | かみぬくしな | high | Kaminukushina Elementary School | 上温品小学 | 가미누쿠시나 초등학교 | romaji |  | | |
| 32 | 上温品集会所 | かみぬくしな | high | Kaminukushina Assembly Hall | 上温品集会所 | 가미누쿠시나 집회소 | romaji |  | | |
| 33 | 下温品集会所 | しもぬくしな | high | Shimonukushina Assembly Hall | 下温品集会所 | 시모누쿠시나 집회소 | romaji |  | | |
| 34 | 中区スポーツセンター（コジマホールディングス中区スポーツセンター） | なかく | high | Naka-ku Sports Center | 中区体育中心 | 나카구 스포츠 센터 | romaji | 括弧内はネーミングライツ。 | | |
| 35 | 中央公園広場エリア | ちゅうおう | high | Chuo Park (Plaza Area) | 中央公园广场区 | 주오 공원 광장 구역 | romaji | 中央公園（Central Park）の広場エリア。 | | |
| 36 | 中央公民館 | ちゅうおう | high | Chuo Community Center | 中央公民馆 | 주오 공민관 | romaji |  | | |
| 37 | 中山保育園 | なかやま | high | Nakayama Nursery School | 中山保育园 | 나카야마 보육원 | romaji |  | | |
| 38 | 中山児童館 | なかやま | high | Nakayama Children's Center | 中山儿童馆 | 나카야마 아동관 | romaji |  | | |
| 39 | 中山台集会所 | なかやまだい | high | Nakayamadai Assembly Hall | 中山台集会所 | 나카야마다이 집회소 | romaji |  | | |
| 40 | 中山小学校 | なかやま | high | Nakayama Elementary School | 中山小学 | 나카야마 초등학교 | romaji |  | | |
| 41 | 中山福祉センター | なかやま | high | Nakayama Welfare Center | 中山福利中心 | 나카야마 복지 센터 | romaji |  | | |
| 42 | 中山集会所 | なかやま | high | Nakayama Assembly Hall | 中山集会所 | 나카야마 집회소 | romaji |  | | |
| 43 | 中島小学校 | なかじま | high | Nakajima Elementary School | 中岛小学 | 나카지마 초등학교 | romaji |  | | |
| 44 | 中島集会所 | なかじま | high | Nakajima Assembly Hall | 中岛集会所 | 나카지마 집회소 | romaji |  | | |
| 45 | 中広・天満会館 | なかひろ てんま | high | Nakahiro Tenma Hall |  | 나카히로 덴마 회관 | romaji |  | | |
| 46 | 中広中学校 | なかひろ | high | Nakahiro Junior High School | 中广初中 | 나카히로 중학교 | romaji |  | | |
| 47 | 中広集会所 | なかひろ | high | Nakahiro Assembly Hall | 中广集会所 | 나카히로 집회소 | romaji |  | | |
| 48 | 丹那集会所 | たんな | high | Tanna Assembly Hall | 丹那集会所 | 단나 집회소 | romaji |  | | |
| 49 | 二葉中学校 | ふたば | high | Futaba Junior High School | 二叶初中 | 후타바 중학교 | romaji |  | | |
| 50 | 二葉公民館 | ふたば | high | Futaba Community Center | 二叶公民馆 | 후타바 공민관 | romaji |  | | |
| 51 | 二葉集会所 | ふたば | high | Futaba Assembly Hall | 二叶集会所 | 후타바 집회소 | romaji |  | | |
| 52 | 井口中学校 | いのくち | high | Inokuchi Junior High School | 井口初中 | 이노쿠치 중학교 | romaji |  | | |
| 53 | 井口保育園 | いのくち | high | Inokuchi Nursery School | 井口保育园 | 이노쿠치 보육원 | romaji |  | | |
| 54 | 井口児童館 | いのくち | high | Inokuchi Children's Center | 井口儿童馆 | 이노쿠치 아동관 | romaji |  | | |
| 55 | 井口公民館 | いのくち | high | Inokuchi Community Center | 井口公民馆 | 이노쿠치 공민관 | romaji |  | | |
| 56 | 井口台中学校 | いのくちだい | high | Inokuchidai Junior High School | 井口台初中 | 이노쿠치다이 중학교 | romaji |  | | |
| 57 | 井口台児童館 | いのくちだい | high | Inokuchidai Children's Center | 井口台儿童馆 | 이노쿠치다이 아동관 | romaji |  | | |
| 58 | 井口台公園 | いのくちだい | high | Inokuchidai Park | 井口台公园 | 이노쿠치다이 공원 | romaji |  | | |
| 59 | 井口台小学校 | いのくちだい | high | Inokuchidai Elementary School | 井口台小学 | 이노쿠치다이 초등학교 | romaji |  | | |
| 60 | 井口台集会所 | いのくちだい | high | Inokuchidai Assembly Hall | 井口台集会所 | 이노쿠치다이 집회소 | romaji |  | | |
| 61 | 井口四丁目集会所 | いのくちよんちょうめ | high | Inokuchi 4-chome Assembly Hall | 井口四丁目集会所 | 이노쿠치 4초메 집회소 | romaji |  | | |
| 62 | 井口小学校 | いのくち | high | Inokuchi Elementary School | 井口小学 | 이노쿠치 초등학교 | romaji |  | | |
| 63 | 井口明神児童館 | いのくちみょうじん | high | Inokuchimyojin Children's Center | 井口明神儿童馆 | 이노쿠치묘진 아동관 | romaji |  | | |
| 64 | 井口明神小学校 | いのくちみょうじん | high | Inokuchimyojin Elementary School | 井口明神小学 | 이노쿠치묘진 초등학교 | romaji |  | | |
| 65 | 井口集会所 | いのくち | high | Inokuchi Assembly Hall | 井口集会所 | 이노쿠치 집회소 | romaji |  | | |
| 66 | 仁保中学校 | にほ | high | Niho Junior High School | 仁保初中 | 니호 중학교 | romaji |  | | |
| 67 | 仁保保育園 | にほ | high | Niho Nursery School | 仁保保育园 | 니호 보육원 | romaji |  | | |
| 68 | 仁保児童館 | にほ | high | Niho Children's Center | 仁保儿童馆 | 니호 아동관 | romaji |  | | |
| 69 | 仁保公民館 | にほ | high | Niho Community Center | 仁保公民馆 | 니호 공민관 | romaji |  | | |
| 70 | 仁保大町集会所 | にほおおまち | high | Nihomachi Assembly Hall | 仁保大町集会所 | 니호마치 집회소 | romaji |  | | |
| 71 | 仁保小学校 | にほ | high | Niho Elementary School | 仁保小学 | 니호 초등학교 | romaji |  | | |
| 72 | 仁保新町保育園 | にほしんまち | high | Niho-shinmachi Nursery School | 仁保新町保育园 | 니호신마치 보육원 | romaji |  | | |
| 73 | 仁保新町集会所 | にほしんまち | high | Niho-shinmachi Assembly Hall | 仁保新町集会所 | 니호신마치 집회소 | romaji |  | | |
| 74 | 仁保集会所（渕崎会館） | にほ | high | Niho Assembly Hall | 仁保集会所 | 니호 집회소 | romaji |  | | |
| 75 | 介護老人保健施設ウェルフェア | うぇるふぇあ | high |  |  |  | katakana | 施設種別が前置。 | | |
| 76 | 似島中学校 | にのしま | high | Ninoshima Junior High School | 似岛初中 | 니노시마 중학교 | romaji |  | | |
| 77 | 似島中学校（似島小中一貫教育校） | にのしま | high | Ninoshima Junior High School | 似岛初中 | 니노시마 중학교 | romaji |  | | |
| 78 | 似島公民館 | にのしま | high | Ninoshima Community Center | 似岛公民馆 | 니노시마 공민관 | romaji |  | | |
| 79 | 似島学園小・中学校 | にのしまがくえん | high | Ninoshimagakuen Elementary and Junior High School | 似岛学园小学・初中 | 니노시마가쿠엔 초・중학교 | romaji |  | | |
| 80 | 似島学園小･中学校 | にのしまがくえん | high | Ninoshimagakuen Elementary and Junior High School | 似岛学园小学・初中 | 니노시마가쿠엔 초・중학교 | romaji |  | | |
| 81 | 似島小学校 | にのしま | high | Ninoshima Elementary School | 似岛小学 | 니노시마 초등학교 | romaji |  | | |
| 82 | 似島小学校（似島小中一貫教育校） | にのしま | high | Ninoshima Elementary School | 似岛小学 | 니노시마 초등학교 | romaji |  | | |
| 83 | 似島臨海公園 | にのしまりんかい | high | Ninoshimarinkai Park | 似岛临海公园 | 니노시마린카이 공원 | romaji | 「臨海」は普通名詞（seaside）。stem を 似島 にして type を 臨海公園 とする手もある。 | | |
| 84 | 似島集会所 | にのしま | high | Ninoshima Assembly Hall | 似岛集会所 | 니노시마 집회소 | romaji |  | | |
| 85 | 健康づくりセンター | けんこうづくりせんたー | high | Health promotion center |  |  | type_hint | 固有名詞部分なし。全体を翻訳扱いで可。 | | |
| 86 | 元宇品保育園 | もとうじな | high | Motojina Nursery School | 元宇品保育园 | 모토지나 보육원 | romaji |  | | |
| 87 | 元宇品小学校 | もとうじな | high | Motojina Elementary School | 元宇品小学 | 모토지나 초등학교 | romaji |  | | |
| 88 | 元宇品集会所（元宇品会館） | もとうじな | high | Motojina Assembly Hall | 元宇品集会所 | 모토지나 집회소 | romaji |  | | |
| 89 | 光南集会所 | こうなん | high | Konan Assembly Hall | 光南集会所 | 고난 집회소 | romaji |  | | |
| 90 | 出島保育園 | でじま | high | Dejima Nursery School | 出岛保育园 | 데지마 보육원 | romaji |  | | |
| 91 | 出島福祉センター | でじま | high | Dejima Welfare Center | 出岛福利中心 | 데지마 복지 센터 | romaji |  | | |
| 92 | 出島西公園 | でじまにし | high | Dejima-nishi Park | 出岛西公园 | 데지마니시 공원 | romaji |  | | |
| 93 | 出島集会所 | でじま | high | Dejima Assembly Hall | 出岛集会所 | 데지마 집회소 | romaji |  | | |
| 94 | 出汐集会所（出汐会館） | でしお | high | Deshio Assembly Hall | 出汐集会所 | 데시오 집회소 | romaji |  | | |
| 95 | 千田児童館 | せんだ | high | Senda Children's Center | 千田儿童馆 | 센다 아동관 | romaji |  | | |
| 96 | 千田公園 | せんだ | high | Senda Park | 千田公园 | 센다 공원 | romaji |  | | |
| 97 | 千田学区集会所 | せんだ | high | Senda School District Assembly Hall | 千田学区集会所 | 센다 학구 집회소 | romaji |  | | |
| 98 | 千田小学校 | せんだ | high | Senda Elementary School | 千田小学 | 센다 초등학교 | romaji |  | | |
| 99 | 南区スポーツセンター | みなみく | high | Minami-ku Sports Center | 南区体育中心 | 미나미구 스포츠 센터 | romaji |  | | |
| 100 | 南区スポーツセンター宇品体育館 | うじな | high | Ujina Gymnasium | 宇品体育馆 | 우지나 체육관 | romaji | 構造は「南区スポーツセンター」＋「宇品体育館」。stem は 宇品 とした。 | | |
| 101 | 南区民文化センター | みなみく | high | Minami-ku Cultural Center | 南区民文化中心 | 미나미구 문화 센터 | romaji | type_ja「区民文化センター」と stem の「区」が重複（Minami Ward Cultural Center の想定）。 | | |
| 102 | 南千田西集会所 | みなみせんだにし | high | Minami-senda-nishi Assembly Hall | 南千田西集会所 | 미나미센다니시 집회소 | romaji |  | | |
| 103 | 南吉島集会所 | みなみよしじま | high | Minami-yoshijima Assembly Hall | 南吉岛集会所 | 미나미요시지마 집회소 | romaji |  | | |
| 104 | 南蟹屋集会所 | みなみかにや | high | Minami-kaniya Assembly Hall | 南蟹屋集会所 | 미나미카니야 집회소 | romaji |  | | |
| 105 | 南観音会館（第一会館） | みなみかんおん | high | Minami-kanon Hall | 南观音会馆 | 미나미칸온 회관 | romaji |  | | |
| 106 | 南観音児童館 | みなみかんおん | high | Minami-kanon Children's Center | 南观音儿童馆 | 미나미칸온 아동관 | romaji |  | | |
| 107 | 南観音公民館 | みなみかんおん | high | Minami-kanon Community Center | 南观音公民馆 | 미나미칸온 공민관 | romaji |  | | |
| 108 | 南観音小学校 | みなみかんおん | high | Minami-kanon Elementary School | 南观音小学 | 미나미칸온 초등학교 | romaji |  | | |
| 109 | 南観音集会所 | みなみかんおん | high | Minami-kanon Assembly Hall | 南观音集会所 | 미나미칸온 집회소 | romaji |  | | |
| 110 | 古江集会所 | ふるえ | high | Furue Assembly Hall | 古江集会所 | 후루에 집회소 | romaji |  | | |
| 111 | 古田中学校 | ふるた | high | Furuta Junior High School | 古田初中 | 후루타 중학교 | romaji |  | | |
| 112 | 古田保育園 | ふるた | high | Furuta Nursery School | 古田保育园 | 후루타 보육원 | romaji |  | | |
| 113 | 古田児童館 | ふるた | high | Furuta Children's Center | 古田儿童馆 | 후루타 아동관 | romaji |  | | |
| 114 | 古田公民館 | ふるた | high | Furuta Community Center | 古田公民馆 | 후루타 공민관 | romaji |  | | |
| 115 | 古田台公園 | ふるただい | high | Furutadai Park | 古田台公园 | 후루타다이 공원 | romaji |  | | |
| 116 | 古田台小学校 | ふるただい | high | Furutadai Elementary School | 古田台小学 | 후루타다이 초등학교 | romaji |  | | |
| 117 | 古田台集会所 | ふるただい | high | Furutadai Assembly Hall | 古田台集会所 | 후루타다이 집회소 | romaji |  | | |
| 118 | 古田小学校 | ふるた | high | Furuta Elementary School | 古田小学 | 후루타 초등학교 | romaji |  | | |
| 119 | 吉島中学校 | よしじま | high | Yoshijima Junior High School | 吉岛初中 | 요시지마 중학교 | romaji |  | | |
| 120 | 吉島体育館 | よしじま | high | Yoshijima Gymnasium | 吉岛体育馆 | 요시지마 체육관 | romaji |  | | |
| 121 | 吉島保育園 | よしじま | high | Yoshijima Nursery School | 吉岛保育园 | 요시지마 보육원 | romaji |  | | |
| 122 | 吉島児童館 | よしじま | high | Yoshijima Children's Center | 吉岛儿童馆 | 요시지마 아동관 | romaji |  | | |
| 123 | 吉島公園 | よしじま | high | Yoshijima Park | 吉岛公园 | 요시지마 공원 | romaji |  | | |
| 124 | 吉島公民館（吉島集会所含む。） | よしじま | high | Yoshijima Community Center | 吉岛公民馆 | 요시지마 공민관 | romaji |  | | |
| 125 | 吉島小学校 | よしじま | high | Yoshijima Elementary School | 吉岛小学 | 요시지마 초등학교 | romaji |  | | |
| 126 | 吉島東児童館 | よしじまひがし | high | Yoshijima-higashi Children's Center | 吉岛东儿童馆 | 요시지마히가시 아동관 | romaji |  | | |
| 127 | 吉島東公園 | よしじまひがし | high | Yoshijima-higashi Park | 吉岛东公园 | 요시지마히가시 공원 | romaji |  | | |
| 128 | 吉島東小学校 | よしじまひがし | high | Yoshijima-higashi Elementary School | 吉岛东小学 | 요시지마히가시 초등학교 | romaji |  | | |
| 129 | 吉島東集会所 | よしじまひがし | high | Yoshijima-higashi Assembly Hall | 吉岛东集会所 | 요시지마히가시 집회소 | romaji |  | | |
| 130 | 吉島福祉センター | よしじま | high | Yoshijima Welfare Center | 吉岛福利中心 | 요시지마 복지 센터 | romaji |  | | |
| 131 | 向洋新町児童館 | むかいなだしんまち | high | Mukainada-shinmachi Children's Center | 向洋新町儿童馆 | 무카이나다신마치 아동관 | romaji |  | | |
| 132 | 向洋新町小学校 | むかいなだしんまち | high | Mukainada-shinmachi Elementary School | 向洋新町小学 | 무카이나다신마치 초등학교 | romaji |  | | |
| 133 | 向洋新町集会所（向洋新町会館） | むかいなだしんまち | high | Mukainada-shinmachi Assembly Hall | 向洋新町集会所 | 무카이나다신마치 집회소 | romaji |  | | |
| 134 | 向洋集会所 | むかいなだ | high | Mukainada Assembly Hall | 向洋集会所 | 무카이나다 집회소 | romaji |  | | |
| 135 | 国泰寺中学校 | こくたいじ | high | Kokutaiji Junior High School | 国泰寺初中 | 고쿠타이지 중학교 | romaji |  | | |
| 136 | 基町中央集会所 | もとまちちゅうおう | high | Motomachichuo Assembly Hall | 基町中央集会所 | 모토마치추오 집회소 | romaji |  | | |
| 137 | 基町保育園 | もとまち | high | Motomachi Nursery School | 基町保育园 | 모토마치 보육원 | romaji |  | | |
| 138 | 基町児童館 | もとまち | high | Motomachi Children's Center | 基町儿童馆 | 모토마치 아동관 | romaji |  | | |
| 139 | 基町小学校 | もとまち | high | Motomachi Elementary School | 基町小学 | 모토마치 초등학교 | romaji |  | | |
| 140 | 基町幼稚園 | もとまち | high | Motomachi Kindergarten | 基町幼儿园 | 모토마치 유치원 | romaji |  | | |
| 141 | 基町高等学校 | もとまち | high | Motomachi High School | 基町高中 | 모토마치 고등학교 | romaji |  | | |
| 142 | 堀越集会所（堀越会館） | ほりこし | high | Horikoshi Assembly Hall | 堀越集会所 | 호리코시 집회소 | romaji |  | | |
| 143 | 大州中学校 | おおず | high | Ozu Junior High School | 大州初中 | 오즈 중학교 | romaji |  | | |
| 144 | 大州保育園 | おおず | high | Ozu Nursery School | 大州保育园 | 오즈 보육원 | romaji |  | | |
| 145 | 大州児童館 | おおず | high | Ozu Children's Center | 大州儿童馆 | 오즈 아동관 | romaji |  | | |
| 146 | 大州小学校 | おおず | high | Ozu Elementary School | 大州小学 | 오즈 초등학교 | romaji |  | | |
| 147 | 大州集会所（大州学区集会所） | おおず | high | Ozu Assembly Hall | 大州集会所 | 오즈 집회소 | romaji |  | | |
| 148 | 大手町第一公園集会所 | おおてまちだいいちこうえん | high | Otemachidaiichikoen Assembly Hall | 大手町第一公园集会所 | 오테마치다이이치코엔 집회소 | romaji | 「大手町第一公園」（公園名）＋集会所。stem を 大手町、type を 第一公園集会所 としてもよい。 | | |
| 149 | 大河保育園 | おおこう | high | Oko Nursery School | 大河保育园 | 오코 보육원 | romaji |  | | |
| 150 | 大河児童館 | おおこう | high | Oko Children's Center | 大河儿童馆 | 오코 아동관 | romaji |  | | |
| 151 | 大河公民館 | おおこう | high | Oko Community Center | 大河公民馆 | 오코 공민관 | romaji |  | | |
| 152 | 大河小学校 | おおこう | high | Oko Elementary School | 大河小学 | 오코 초등학교 | romaji |  | | |
| 153 | 大河集会所 | おおこう | high | Oko Assembly Hall | 大河集会所 | 오코 집회소 | romaji |  | | |
| 154 | 大芝児童館 | おおしば | high | Oshiba Children's Center | 大芝儿童馆 | 오시바 아동관 | romaji |  | | |
| 155 | 大芝公園・交通ランド（広島トヨペット交通公園） | おおしば | high |  |  |  | romaji | 括弧内はネーミングライツ。 | | |
| 156 | 大芝小学校 | おおしば | high | Oshiba Elementary School | 大芝小学 | 오시바 초등학교 | romaji |  | | |
| 157 | 大芝集会所 | おおしば | high | Oshiba Assembly Hall | 大芝集会所 | 오시바 집회소 | romaji |  | | |
| 158 | 大須賀集会所 | おおすが | high | Osuga Assembly Hall | 大须贺集会所 | 오스가 집회소 | romaji |  | | |
| 159 | 天満児童館 | てんま | high | Tenma Children's Center | 天满儿童馆 | 덴마 아동관 | romaji |  | | |
| 160 | 天満小学校 | てんま | high | Tenma Elementary School | 天满小学 | 덴마 초등학교 | romaji |  | | |
| 161 | 宇品中学校 | うじな | high | Ujina Junior High School | 宇品初中 | 우지나 중학교 | romaji |  | | |
| 162 | 宇品児童館 | うじな | high | Ujina Children's Center | 宇品儿童馆 | 우지나 아동관 | romaji |  | | |
| 163 | 宇品公民館 | うじな | high | Ujina Community Center | 宇品公民馆 | 우지나 공민관 | romaji |  | | |
| 164 | 宇品小学校 | うじな | high | Ujina Elementary School | 宇品小学 | 우지나 초등학교 | romaji |  | | |
| 165 | 宇品東保育園 | うじなひがし | high | Ujina-higashi Nursery School | 宇品东保育园 | 우지나히가시 보육원 | romaji |  | | |
| 166 | 宇品東児童館 | うじなひがし | high | Ujina-higashi Children's Center | 宇品东儿童馆 | 우지나히가시 아동관 | romaji |  | | |
| 167 | 宇品東小学校 | うじなひがし | high | Ujina-higashi Elementary School | 宇品东小学 | 우지나히가시 초등학교 | romaji |  | | |
| 168 | 宇品東集会所（東宇品会館） | うじなひがし | high | Ujina-higashi Assembly Hall | 宇品东集会所 | 우지나히가시 집회소 | romaji |  | | |
| 169 | 宇品海岸集会所 | うじなかいがん | high | Ujinakaigan Assembly Hall | 宇品海岸集会所 | 우지나카이간 집회소 | romaji |  | | |
| 170 | 宇品神田集会所（東宇品神田南会館） | うじなかんだ | high | Ujinakanda Assembly Hall | 宇品神田集会所 | 우지나칸다 집회소 | romaji |  | | |
| 171 | 宇品第一公園 | うじな | high | Ujina Park No. 1 | 宇品第一公园 | 우지나 제1 공원 | romaji |  | | |
| 172 | 宇品西公園 | うじなにし | high | Ujina-nishi Park | 宇品西公园 | 우지나니시 공원 | romaji |  | | |
| 173 | 宇品集会所 | うじな | high | Ujina Assembly Hall | 宇品集会所 | 우지나 집회소 | romaji |  | | |
| 174 | 小河内保育園 | おがわち | high | Ogawachi Nursery School | 小河内保育园 | 오가와치 보육원 | romaji | 地名表記の読みは itp.ne.jp の URL（ogawachimachi）から おがわち と判断。 | | |
| 175 | 小河内集会所（小河内会館） | おがわち | high | Ogawachi Assembly Hall | 小河内集会所 | 오가와치 집회소 | romaji | 地名表記の読みは itp.ne.jp の URL（ogawachimachi）から おがわち と判断。 | | |
| 176 | 尾長児童館 | おなが | high | Onaga Children's Center | 尾长儿童馆 | 오나가 아동관 | romaji |  | | |
| 177 | 尾長小学校 | おなが | high | Onaga Elementary School | 尾长小学 | 오나가 초등학교 | romaji |  | | |
| 178 | 尾長集会所 | おなが | high | Onaga Assembly Hall | 尾长集会所 | 오나가 집회소 | romaji |  | | |
| 179 | 山手集会所 | やまて | high | Yamate Assembly Hall | 山手集会所 | 야마테 집회소 | romaji |  | | |
| 180 | 山根町東集会所 | やまねちょうひがし | high | Yamanecho-higashi Assembly Hall | 山根町东集会所 | 야마네초히가시 집회소 | romaji |  | | |
| 181 | 山陽高等学校 | さんよう | high | Sanyo High School | 山阳高中 | 산요 고등학교 | romaji |  | | |
| 182 | 崇徳高等学校 | そうとく | high | Sotoku High School | 崇德高中 | 소토쿠 고등학교 | romaji |  | | |
| 183 | 工業技術センター | こうぎょうぎじゅつせんたー | high | Industrial technology research center (Hiroshima City) |  |  | type_hint | 固有名詞部分なし。全体を翻訳扱いで可。 | | |
| 184 | 己斐上中学校 | こいうえ | high | Koiue Junior High School | 己斐上初中 | 고이우에 중학교 | romaji |  | | |
| 185 | 己斐上五丁目集会所 | こいうえごちょうめ | high | Koiue 5-chome Assembly Hall | 己斐上五丁目集会所 | 고이우에 5초메 집회소 | romaji |  | | |
| 186 | 己斐上児童館 | こいうえ | high | Koiue Children's Center | 己斐上儿童馆 | 고이우에 아동관 | romaji |  | | |
| 187 | 己斐上公民館 | こいうえ | high | Koiue Community Center | 己斐上公民馆 | 고이우에 공민관 | romaji |  | | |
| 188 | 己斐上小学校 | こいうえ | high | Koiue Elementary School | 己斐上小学 | 고이우에 초등학교 | romaji |  | | |
| 189 | 己斐上集会所 | こいうえ | high | Koiue Assembly Hall | 己斐上集会所 | 고이우에 집회소 | romaji |  | | |
| 190 | 己斐中学校 | こい | high | Koi Junior High School | 己斐初中 | 고이 중학교 | romaji |  | | |
| 191 | 己斐保育園 | こい | high | Koi Nursery School | 己斐保育园 | 고이 보육원 | romaji |  | | |
| 192 | 己斐児童館 | こい | high | Koi Children's Center | 己斐儿童馆 | 고이 아동관 | romaji |  | | |
| 193 | 己斐公民館 | こい | high | Koi Community Center | 己斐公民馆 | 고이 공민관 | romaji |  | | |
| 194 | 己斐小学校 | こい | high | Koi Elementary School | 己斐小学 | 고이 초등학교 | romaji |  | | |
| 195 | 己斐本町一丁目集会所 | こいほんまちいっちょうめ | high | Koi-honmachi 1-chome Assembly Hall | 己斐本町一丁目集会所 | 고이혼마치 1초메 집회소 | romaji |  | | |
| 196 | 己斐東児童館 | こいひがし | high | Koi-higashi Children's Center | 己斐东儿童馆 | 고이히가시 아동관 | romaji |  | | |
| 197 | 己斐東学区会館 | こいひがし | high | Koi-higashi School District Hall | 己斐东学区会馆 | 고이히가시 학구 회관 | romaji |  | | |
| 198 | 己斐東小学校 | こいひがし | high | Koi-higashi Elementary School | 己斐东小学 | 고이히가시 초등학교 | romaji |  | | |
| 199 | 己斐西町集会所 | こいにしまち | high | Koinishimachi Assembly Hall | 己斐西町集会所 | 고이니시마치 집회소 | romaji |  | | |
| 200 | 己斐集会所（己斐本町会館） | こい | high | Koi Assembly Hall | 己斐集会所 | 고이 집회소 | romaji |  | | |
| 201 | 市立広島商業高等学校 | ひろしま | high | Municipal Hiroshima Commercial High School | 市立广岛商业高中 | 시립 히로시마 상업고등학교 | romaji | 正式名は 広島市立広島商業高等学校。stem は 広島、type は 商業高等学校（commercial high school）。 | | |
| 202 | 市立広島工業高等学校 | ひろしま | high | Municipal Hiroshima Technical High School | 市立广岛工业高中 | 시립 히로시마 공업고등학교 | romaji | 正式名は 広島市立広島工業高等学校。type は 工業高等学校（technical high school）。 | | |
| 203 | 幟町中学校 | のぼりまち | high | Noborimachi Junior High School | 帜町初中 | 노보리마치 중학교 | romaji |  | | |
| 204 | 幟町児童館 | のぼりまち | high | Noborimachi Children's Center | 帜町儿童馆 | 노보리마치 아동관 | romaji |  | | |
| 205 | 幟町小学校 | のぼりまち | high | Noborimachi Elementary School | 帜町小学 | 노보리마치 초등학교 | romaji |  | | |
| 206 | 平和記念公園 | へいわきねん | high | Peace Memorial Park | 平和记念公园 | 헤이와키넨 공원 | official_en | 「平和記念」は固有名詞的だが意味を持つ語。英語は Peace Memorial Park が定着。 | | |
| 207 | 広島みらい創生高等学校 | ひろしまみらいそうせい | high | Hiroshima Miraisosei High School |  | 히로시마미라이소세이 고등학교 | romaji |  | | |
| 208 | 広島サッカースタジアム（エディオンピースウイング広島） | ひろしま | high | EDION PEACE WING HIROSHIMA | 广岛足球场 | 히로시마 축구 경기장 | official_en | official_en はネーミングライツ呼称（2024-02-01〜2034-01-31）。 | | |
| 209 | 広島サンプラザ | ひろしまさんぷらざ | high |  |  |  | katakana |  | | |
| 210 | 広島刑務所 | ひろしま | high |  |  |  | romaji |  | | |
| 211 | 広島国際会議場 | ひろしま | high | International Conference Center Hiroshima | 广岛国际会议场 | 히로시마 국제회의장 | official_en |  | | |
| 212 | 広島城北学園 | ひろしまじょうほく | high | Hiroshima Johoku School | 广岛城北学园 | 히로시마조호쿠 학원 | romaji | 学校法人名。実体は 広島城北中・高等学校。 | | |
| 213 | 広島城跡 | ひろしまじょう | high |  |  |  | romaji | 英語は Hiroshima Castle (site) が一般的だが公式英語名は未確認。 | | |
| 214 | 広島大学附属小･中･高等学校 | ひろしまだいがく | high | Hiroshima Daigaku Attached Elementary, Junior and Senior High School | 广岛大学附属小学・初中・高中 | 히로시마다이가쿠 부속 초・중・고등학교 | romaji |  | | |
| 215 | 広島大学附属東雲小中学校 | ひろしまだいがくふぞくしののめ | high | Hiroshima Daigakufuzokushinonome Elementary and Junior High School | 广岛大学附属东云小学・初中 | 히로시마다이가쿠후조쿠시노노메 초・중학교 | romaji | stem に「附属」を含む（Hiroshima University ... Shinonome ...）。 | | |
| 216 | 広島女学院大学 | ひろしまじょがくいん | high | Hiroshima Jogakuin University | 广岛女学院大学 | 히로시마조가쿠인 대학교 | romaji |  | | |
| 217 | 広島工業大学高等学校 | ひろしまこうぎょうだいがく | high | Hiroshima Kogyodaigaku High School | 广岛工业大学高中 | 히로시마코교다이가쿠 고등학교 | romaji |  | | |
| 218 | 広島市似島歓迎交流センター | ひろしましにのしま | high | Hiroshima Shininoshima Welcome and Exchange Center | 广岛市似岛欢迎交流中心 | 히로시마시니노시마 환영 교류 센터 | romaji |  | | |
| 219 | 広島市心身障害者福祉センター | ひろしまし | high | Hiroshimashi Welfare Center for People with Disabilities | 广岛市身心障碍者福利中心 | 히로시마시 심신장애인 복지 센터 | romaji |  | | |
| 220 | 広島市東地域交流センター | ひろしましひがし | high | Hiroshimashi-higashi Community Exchange Center | 广岛市东地区交流中心 | 히로시마시히가시 지역 교류 센터 | romaji |  | | |
| 221 | 広島市民球場（マツダスタジアム） | ひろしま | high |  |  |  | romaji | 括弧内はネーミングライツ（MAZDA Zoom-Zoom スタジアム広島）。公式英語名は未確認。 | | |
| 222 | 広島県立文化芸術ホール | ひろしまけんりつ | high | Hiroshima Kenritsu Culture and Arts Hall | 广岛县立文化艺术厅 | 히로시마켄리쓰 문화 예술 홀 | romaji | ネーミングライツ呼称（上野学園ホール等）があるはず。要確認。 | | |
| 223 | 広島競輪場 | ひろしま | high | Hiroshima Keirin Velodrome | 广岛自行车赛场 | 히로시마 경륜장 | romaji |  | | |
| 224 | 広瀬小学校 | ひろせ | high | Hirose Elementary School | 广濑小学 | 히로세 초등학교 | romaji |  | | |
| 225 | 広瀬集会所 | ひろせ | high | Hirose Assembly Hall | 广濑集会所 | 히로세 집회소 | romaji |  | | |
| 226 | 庚午中三丁目集会所 | こうごなかさんちょうめ | high | Kogonaka 3-chome Assembly Hall | 庚午中三丁目集会所 | 고고나카 3초메 집회소 | romaji |  | | |
| 227 | 庚午中央会館 | こうごちゅうおう | high | Kogochuo Hall | 庚午中央会馆 | 고고추오 회관 | romaji |  | | |
| 228 | 庚午中学校 | こうご | high | Kogo Junior High School | 庚午初中 | 고고 중학교 | romaji |  | | |
| 229 | 庚午保育園 | こうご | high | Kogo Nursery School | 庚午保育园 | 고고 보육원 | romaji |  | | |
| 230 | 庚午児童館 | こうご | high | Kogo Children's Center | 庚午儿童馆 | 고고 아동관 | romaji |  | | |
| 231 | 庚午北集会所 | こうごきた | high | Kogo-kita Assembly Hall | 庚午北集会所 | 고고키타 집회소 | romaji |  | | |
| 232 | 庚午南集会所 | こうごみなみ | high | Kogo-minami Assembly Hall | 庚午南集会所 | 고고미나미 집회소 | romaji |  | | |
| 233 | 庚午小学校 | こうご | high | Kogo Elementary School | 庚午小学 | 고고 초등학교 | romaji |  | | |
| 234 | 庚午集会所（庚午福祉会館） | こうご | high | Kogo Assembly Hall | 庚午集会所 | 고고 집회소 | romaji |  | | |
| 235 | 戸坂中学校 | へさか | high | Hesaka Junior High School | 户坂初中 | 헤사카 중학교 | romaji |  | | |
| 236 | 戸坂中学校・戸坂庭球場・戸坂運動広場 | へさか | high |  |  |  | romaji | 複数施設（中学校・テニスコート・運動広場）。 | | |
| 237 | 戸坂保育園 | へさか | high | Hesaka Nursery School | 户坂保育园 | 헤사카 보육원 | romaji |  | | |
| 238 | 戸坂児童館 | へさか | high | Hesaka Children's Center | 户坂儿童馆 | 헤사카 아동관 | romaji |  | | |
| 239 | 戸坂公民館 | へさか | high | Hesaka Community Center | 户坂公民馆 | 헤사카 공민관 | romaji |  | | |
| 240 | 戸坂千足集会所 | へさかせんぞく | high | Hesakasenzoku Assembly Hall | 户坂千足集会所 | 헤사카센조쿠 집회소 | romaji | itp.ne.jp の URL（hesakasenzoku）で確認。 | | |
| 241 | 戸坂南集会所（戸坂南会館） | へさかみなみ | high | Hesaka-minami Assembly Hall | 户坂南集会所 | 헤사카미나미 집회소 | romaji |  | | |
| 242 | 戸坂城山児童館 | へさかしろやま | high | Hesakashiroyama Children's Center | 户坂城山儿童馆 | 헤사카시로야마 아동관 | romaji |  | | |
| 243 | 戸坂城山小学校 | へさかしろやま | high | Hesakashiroyama Elementary School | 户坂城山小学 | 헤사카시로야마 초등학교 | romaji |  | | |
| 244 | 戸坂城山集会所 | へさかしろやま | high | Hesakashiroyama Assembly Hall | 户坂城山集会所 | 헤사카시로야마 집회소 | romaji |  | | |
| 245 | 戸坂小学校 | へさか | high | Hesaka Elementary School | 户坂小学 | 헤사카 초등학교 | romaji |  | | |
| 246 | 戸坂惣田集会所 | へさかそうだ | high | Hesakasoda Assembly Hall | 户坂惣田集会所 | 헤사카소다 집회소 | romaji | 「惣田」は 日本歴史地名大系（kotobank）で そうだ。 | | |
| 247 | 戸坂新町公園 | へさかしんまち | high | Hesaka-shinmachi Park | 户坂新町公园 | 헤사카신마치 공원 | romaji |  | | |
| 248 | 戸坂福祉センター | へさか | high | Hesaka Welfare Center | 户坂福利中心 | 헤사카 복지 센터 | romaji |  | | |
| 249 | 戸坂集会所 | へさか | high | Hesaka Assembly Hall | 户坂集会所 | 헤사카 집회소 | romaji |  | | |
| 250 | 文化交流会館（広島文化学園HBGホール） | ぶんかこうりゅうかいかん | high | Cultural exchange hall (concert hall) |  |  | type_hint | 正式名 広島市文化交流会館。括弧内はネーミングライツ（Hiroshima Bunka Gakuen HBG Hall）。 | | |
| 251 | 文化交流会館（広島文化学園ＨＢＧホール） | ぶんかこうりゅうかいかん | high | Cultural exchange hall (concert hall) |  |  | type_hint | 正式名 広島市文化交流会館。括弧内はネーミングライツ。全角 ＨＢＧ 版。 | | |
| 252 | 新庄集会所 | しんじょう | high | Shinjo Assembly Hall | 新庄集会所 | 신조 집회소 | romaji |  | | |
| 253 | 新牛田公園 | しんうした | high | Shinushita Park | 新牛田公园 | 신우시타 공원 | romaji |  | | |
| 254 | 日宇那集会所（日宇那会館） | ひうな | high | Hiuna Assembly Hall | 日宇那集会所 | 히우나 집회소 | romaji |  | | |
| 255 | 旧広島市民球場跡地イベント広場（ひろしまゲートパークプラザ） | きゅうひろしましみんきゅうじょうあとち | high | Kyuhiroshimashiminkyujoatochi Event Plaza | 旧广岛市民球场迹地活动广场 | 규히로시마시민큐조아토치 이벤트 광장 | romaji | 「旧…跡地」は説明語。愛称 ひろしまゲートパークプラザ を使う方が自然かもしれない。 | | |
| 256 | 早稲田中学校 | わせだ | high | Waseda Junior High School | 早稻田初中 | 와세다 중학교 | romaji |  | | |
| 257 | 早稲田公民館 | わせだ | high | Waseda Community Center | 早稻田公民馆 | 와세다 공민관 | romaji |  | | |
| 258 | 早稲田小学校 | わせだ | high | Waseda Elementary School | 早稻田小学 | 와세다 초등학교 | romaji |  | | |
| 259 | 早稲田集会所 | わせだ | high | Waseda Assembly Hall | 早稻田集会所 | 와세다 집회소 | romaji |  | | |
| 260 | 旭三丁目集会所（旭三丁目会館） | あさひさんちょうめ | high | Asahi 3-chome Assembly Hall | 旭三丁目集会所 | 아사히 3초메 집회소 | romaji |  | | |
| 261 | 明神三丁目集会所 | みょうじんさんちょうめ | high | Myojin 3-chome Assembly Hall | 明神三丁目集会所 | 묘진 3초메 집회소 | romaji |  | | |
| 262 | 明神中央集会所 | みょうじんちゅうおう | high | Myojinchuo Assembly Hall | 明神中央集会所 | 묘진추오 집회소 | romaji |  | | |
| 263 | 明神二丁目集会所 | みょうじんにちょうめ | high | Myojin 2-chome Assembly Hall | 明神二丁目集会所 | 묘진 2초메 집회소 | romaji |  | | |
| 264 | 本川・広瀬集会所 | ほんかわ ひろせ | high | Honkawa Hirose Assembly Hall |  | 혼카와 히로세 집회소 | romaji |  | | |
| 265 | 本川保育園 | ほんかわ | high | Honkawa Nursery School | 本川保育园 | 혼카와 보육원 | romaji |  | | |
| 266 | 本川児童館 | ほんかわ | high | Honkawa Children's Center | 本川儿童馆 | 혼카와 아동관 | romaji |  | | |
| 267 | 本川小学校 | ほんかわ | high | Honkawa Elementary School | 本川小学 | 혼카와 초등학교 | romaji |  | | |
| 268 | 本浦集会所（本浦会館） | ほんうら | high | Honura Assembly Hall | 本浦集会所 | 혼라 집회소 | romaji |  | | |
| 269 | 東区スポーツセンター（マエダハウジング東区スポーツセンター） | ひがしく | high | Higashi-ku Sports Center | 东区体育中心 | 히가시구 스포츠 센터 | romaji | 括弧内はネーミングライツ。 | | |
| 270 | 東区図書館 | ひがしく | high | Higashi-ku Library | 东区图书馆 | 히가시구 도서관 | romaji |  | | |
| 271 | 東区民文化センター | ひがしく | high | Higashi-ku Cultural Center | 东区民文化中心 | 히가시구 문화 센터 | romaji | type_ja「区民文化センター」と stem の「区」が重複。 | | |
| 272 | 東千田公園 | ひがしせんだ | high | Higashi-senda Park | 东千田公园 | 히가시센다 공원 | romaji |  | | |
| 273 | 東浄保育園 | とうじょう | high | Tojo Nursery School | 东净保育园 | 도조 보육원 | romaji | とうじょう と認識しているが念のため確認推奨。 | | |
| 274 | 東浄児童館 | とうじょう | high | Tojo Children's Center | 东净儿童馆 | 도조 아동관 | romaji | とうじょう と認識しているが念のため確認推奨。 | | |
| 275 | 東浄小学校 | とうじょう | high | Tojo Elementary School | 东净小学 | 도조 초등학교 | romaji | とうじょう と認識しているが念のため確認推奨。 | | |
| 276 | 東浄集会所 | とうじょう | high | Tojo Assembly Hall | 东净集会所 | 도조 집회소 | romaji | とうじょう と認識しているが念のため確認推奨。 | | |
| 277 | 東雲一丁目集会所 | しののめいっちょうめ | high | Shinonome 1-chome Assembly Hall | 东云一丁目集会所 | 시노노메 1초메 집회소 | romaji |  | | |
| 278 | 東雲三丁目集会所 | しののめさんちょうめ | high | Shinonome 3-chome Assembly Hall | 东云三丁目集会所 | 시노노메 3초메 집회소 | romaji |  | | |
| 279 | 東雲児童館 | しののめ | high | Shinonome Children's Center | 东云儿童馆 | 시노노메 아동관 | romaji |  | | |
| 280 | 東雲本町一・二丁目集会所（東雲本町会館） | しののめほんまち いち にちょうめ | high | Shinonomehonmachi Ichi 2-chome Assembly Hall |  | 시노노메혼마치 이치 2초메 집회소 | romaji |  | | |
| 281 | 東雲本町一･二丁目集会所（東雲本町会館） | しののめほんまち いち にちょうめ | high | Shinonomehonmachi Ichi 2-chome Assembly Hall | 东云本町一･二丁目集会所 | 시노노메혼마치 이치 2초메 집회소 | romaji |  | | |
| 282 | 東雲本町三丁目集会所（東雲本町三丁目会館） | しののめほんまちさんちょうめ | high | Shinonome-honmachi 3-chome Assembly Hall | 东云本町三丁目集会所 | 시노노메혼마치 3초메 집회소 | romaji |  | | |
| 283 | 東雲集会所（東雲会館） | しののめ | high | Shinonome Assembly Hall | 东云集会所 | 시노노메 집회소 | romaji |  | | |
| 284 | 東青崎集会所 | ひがしあおさき | high | Higashi-aosaki Assembly Hall | 东青崎集会所 | 히가시아오사키 집회소 | romaji |  | | |
| 285 | 楠木集会所（楠木会館） | くすのき | high | Kusunoki Assembly Hall | 楠木集会所 | 구스노키 집회소 | romaji |  | | |
| 286 | 楠那中学校 | くすな | high | Kusuna Junior High School | 楠那初中 | 구스나 중학교 | romaji |  | | |
| 287 | 楠那保育園 | くすな | high | Kusuna Nursery School | 楠那保育园 | 구스나 보육원 | romaji |  | | |
| 288 | 楠那公民館 | くすな | high | Kusuna Community Center | 楠那公民馆 | 구스나 공민관 | romaji |  | | |
| 289 | 楠那小学校 | くすな | high | Kusuna Elementary School | 楠那小学 | 구스나 초등학교 | romaji |  | | |
| 290 | 横川会館 | よこがわ | high | Yokogawa Hall | 横川会馆 | 요코가와 회관 | romaji |  | | |
| 291 | 横川保育園 | よこがわ | high | Yokogawa Nursery School | 横川保育园 | 요코가와 보육원 | romaji |  | | |
| 292 | 段原中学校 | だんばら | high | Danbara Junior High School | 段原初中 | 단바라 중학교 | romaji |  | | |
| 293 | 段原公民館 | だんばら | high | Danbara Community Center | 段原公民馆 | 단바라 공민관 | romaji |  | | |
| 294 | 段原南一丁目集会所 | だんばらみなみいっちょうめ | high | Danbara-minami 1-chome Assembly Hall | 段原南一丁目集会所 | 단바라미나미 1초메 집회소 | romaji |  | | |
| 295 | 段原南二丁目集会所 | だんばらみなみにちょうめ | high | Danbara-minami 2-chome Assembly Hall | 段原南二丁目集会所 | 단바라미나미 2초메 집회소 | romaji |  | | |
| 296 | 段原小学校 | だんばら | high | Danbara Elementary School | 段原小学 | 단바라 초등학교 | romaji |  | | |
| 297 | 段原山崎集会所 | だんばらやまさき | high | Danbarayamasaki Assembly Hall | 段原山崎集会所 | 단바라야마사키 집회소 | romaji |  | | |
| 298 | 段原東集会所 | だんばらひがし | high | Danbara-higashi Assembly Hall | 段原东集会所 | 단바라히가시 집회소 | romaji |  | | |
| 299 | 段原西集会所 | だんばらにし | high | Danbara-nishi Assembly Hall | 段原西集会所 | 단바라니시 집회소 | romaji |  | | |
| 300 | 段原集会所 | だんばら | high | Danbara Assembly Hall | 段原集会所 | 단바라 집회소 | romaji |  | | |
| 301 | 比治山下公園 | ひじやました | high | Hijiyamashita Park | 比治山下公园 | 히지야마시타 공원 | romaji |  | | |
| 302 | 比治山公園 | ひじやま | high | Hijiyama Park | 比治山公园 | 히지야마 공원 | romaji |  | | |
| 303 | 比治山小学校 | ひじやま | high | Hijiyama Elementary School | 比治山小学 | 히지야마 초등학교 | romaji |  | | |
| 304 | 比治山本町集会所 | ひじやまほんまち | high | Hijiyama-honmachi Assembly Hall | 比治山本町集会所 | 히지야마혼마치 집회소 | romaji |  | | |
| 305 | 比治山集会所（比治山会館） | ひじやま | high | Hijiyama Assembly Hall | 比治山集会所 | 히지야마 집회소 | romaji |  | | |
| 306 | 江波中学校 | えば | high | Eba Junior High School | 江波初中 | 에바 중학교 | romaji |  | | |
| 307 | 江波二本松集会所 | えばにほんまつ | high | Ebanihonmatsu Assembly Hall | 江波二本松集会所 | 에바니혼마쓰 집회소 | romaji |  | | |
| 308 | 江波保育園 | えば | high | Eba Nursery School | 江波保育园 | 에바 보육원 | romaji |  | | |
| 309 | 江波児童館 | えば | high | Eba Children's Center | 江波儿童馆 | 에바 아동관 | romaji |  | | |
| 310 | 江波南集会所 | えばみなみ | high | Eba-minami Assembly Hall | 江波南集会所 | 에바미나미 집회소 | romaji |  | | |
| 311 | 江波小学校 | えば | high | Eba Elementary School | 江波小学 | 에바 초등학교 | romaji |  | | |
| 312 | 江波山公園 | えばやま | high | Ebayama Park | 江波山公园 | 에바야마 공원 | romaji |  | | |
| 313 | 江波東集会所（舟入江波町民会館） | えばひがし | high | Eba-higashi Assembly Hall | 江波东集会所 | 에바히가시 집회소 | romaji |  | | |
| 314 | 江波栄町集会所 | えばさかえまち | high | Ebasakaemachi Assembly Hall | 江波荣町集会所 | 에바사카에마치 집회소 | romaji |  | | |
| 315 | 江波皿山公園 | えばさらやま | high | Ebasarayama Park | 江波皿山公园 | 에바사라야마 공원 | romaji |  | | |
| 316 | 江波第二保育園 | えば | high | Eba Nursery School No. 2 | 江波第二保育园 | 에바 제2 보육원 | romaji |  | | |
| 317 | 江波集会所 | えば | high | Eba Assembly Hall | 江波集会所 | 에바 집회소 | romaji |  | | |
| 318 | 渕崎公園 | ふちざき | high | Fuchizaki Park | 渊崎公园 | 후치자키 공원 | romaji |  | | |
| 319 | 渕﨑公園 | ふちざき | high | Fuchizaki Park | 渊崎公园 | 후치자키 공원 | romaji |  | | |
| 320 | 温品中学校 | ぬくしな | high | Nukushina Junior High School | 温品初中 | 누쿠시나 중학교 | romaji |  | | |
| 321 | 温品保育園 | ぬくしな | high | Nukushina Nursery School | 温品保育园 | 누쿠시나 보육원 | romaji |  | | |
| 322 | 温品児童館 | ぬくしな | high | Nukushina Children's Center | 温品儿童馆 | 누쿠시나 아동관 | romaji |  | | |
| 323 | 温品公民館 | ぬくしな | high | Nukushina Community Center | 温品公民馆 | 누쿠시나 공민관 | romaji |  | | |
| 324 | 温品小学校 | ぬくしな | high | Nukushina Elementary School | 温品小学 | 누쿠시나 초등학교 | romaji |  | | |
| 325 | 温品幼稚園 | ぬくしな | high | Nukushina Kindergarten | 温品幼儿园 | 누쿠시나 유치원 | romaji |  | | |
| 326 | 温品福祉センター | ぬくしな | high | Nukushina Welfare Center | 温品福利中心 | 누쿠시나 복지 센터 | romaji |  | | |
| 327 | 温品集会所 | ぬくしな | high | Nukushina Assembly Hall | 温品集会所 | 누쿠시나 집회소 | romaji |  | | |
| 328 | 片河集会所 | かたこう | high | Katako Assembly Hall | 片河集会所 | 가타코 집회소 | romaji |  | | |
| 329 | 牛田中学校 | うした | high | Ushita Junior High School | 牛田初中 | 우시타 중학교 | romaji |  | | |
| 330 | 牛田公民館 | うした | high | Ushita Community Center | 牛田公民馆 | 우시타 공민관 | romaji |  | | |
| 331 | 牛田小学校 | うした | high | Ushita Elementary School | 牛田小学 | 우시타 초등학교 | romaji |  | | |
| 332 | 牛田新町児童館 | うしたしんまち | high | Ushita-shinmachi Children's Center | 牛田新町儿童馆 | 우시타신마치 아동관 | romaji |  | | |
| 333 | 牛田新町小学校 | うしたしんまち | high | Ushita-shinmachi Elementary School | 牛田新町小学 | 우시타신마치 초등학교 | romaji |  | | |
| 334 | 牛田新町集会所（老人集会所） | うしたしんまち | high | Ushita-shinmachi Assembly Hall | 牛田新町集会所 | 우시타신마치 집회소 | romaji |  | | |
| 335 | 牛田総合公園 | うした | high | Ushita Park | 牛田综合公园 | 우시타 종합 공원 | romaji |  | | |
| 336 | 牛田集会所 | うした | high | Ushita Assembly Hall | 牛田集会所 | 우시타 집회소 | romaji |  | | |
| 337 | 環境局中工場 | かんきょうきょくなか | high |  |  |  | romaji | 「環境局」は組織名、「中」は中区の意。stem を 中 だけにする方がよいかも。 | | |
| 338 | 田方集会所 | たがた | high | Tagata Assembly Hall | 田方集会所 | 다가타 집회소 | romaji |  | | |
| 339 | 男女共同参画推進センター（ゆいぽーと） | だんじょきょうどうさんかくすいしんせんたー | high | Gender equality promotion center |  |  | type_hint | 固有名詞部分なし。愛称 ゆいぽーと（Yui Port）を併記してもよい。 | | |
| 340 | 白島児童館 | はくしま | high | Hakushima Children's Center | 白岛儿童馆 | 하쿠시마 아동관 | romaji |  | | |
| 341 | 白島小学校 | はくしま | high | Hakushima Elementary School | 白岛小学 | 하쿠시마 초등학교 | romaji |  | | |
| 342 | 白島集会所 | はくしま | high | Hakushima Assembly Hall | 白岛集会所 | 하쿠시마 집회소 | romaji |  | | |
| 343 | 皆実保育園 | みなみ | high | Minami Nursery School | 皆实保育园 | 미나미 보육원 | romaji |  | | |
| 344 | 皆実児童館 | みなみ | high | Minami Children's Center | 皆实儿童馆 | 미나미 아동관 | romaji |  | | |
| 345 | 皆実南部集会所 | みなみなんぶ | high | Minaminanbu Assembly Hall | 皆实南部集会所 | 미나미난부 집회소 | romaji |  | | |
| 346 | 皆実小学校 | みなみ | high | Minami Elementary School | 皆实小学 | 미나미 초등학교 | romaji |  | | |
| 347 | 皆実東部集会所 | みなみとうぶ | high | Minamitobu Assembly Hall | 皆实东部集会所 | 미나미토부 집회소 | romaji |  | | |
| 348 | 皆実西部集会所 | みなみせいぶ | high | Minamiseibu Assembly Hall | 皆实西部集会所 | 미나미세이부 집회소 | romaji |  | | |
| 349 | 皆実集会所（皆実学区集会所） | みなみ | high | Minami Assembly Hall | 皆实集会所 | 미나미 집회소 | romaji |  | | |
| 350 | 県立広島井口高等学校・井口中学校・西部埋立第二公園 | ひろしまいのくち | high | Prefectural Hiroshima Inokuchi High School | 县立广岛井口高中 | 현립 히로시마이노쿠치 고등학교 | romaji | 複数施設（県立広島井口高校＋井口中学校＋西部埋立第二公園）。stem は先頭施設のみ。分割して表示する方がよい。 | | |
| 351 | 県立広島大学広島キャンパス | けんりつひろしまだいがく | high |  |  |  | romaji | 大学の公式英語名は Prefectural University of Hiroshima と思われるが公式サイトで未確認のため official_en は空。 | | |
| 352 | 県立広島工業高等学校 | ひろしま | high | Prefectural Hiroshima Technical High School | 县立广岛工业高中 | 현립 히로시마 공업고등학교 | romaji | 正式名は 広島県立広島工業高等学校。 | | |
| 353 | 県立広島皆実高等学校 | ひろしまみなみ | high | Prefectural Hiroshima Minami High School | 县立广岛皆实高中 | 현립 히로시마미나미 고등학교 | romaji |  | | |
| 354 | 県立広島皆実高等学校・県立広島工業高等学校 | ひろしまみなみ | high | Prefectural Hiroshima Minami High School | 县立广岛皆实高中 | 현립 히로시마미나미 고등학교 | romaji | 複数施設（県立広島皆実高校＋県立広島工業高校）。stem は先頭施設のみ。分割して表示する方がよい。 | | |
| 355 | 県立広島観音高等学校 | ひろしまかんおん | high | Prefectural Hiroshima Kanon High School | 县立广岛观音高中 | 현립 히로시마칸온 고등학교 | romaji |  | | |
| 356 | 県総合グランド | けん | high | Ken Sports Ground | 县综合运动场 | 겐 종합 운동장 | romaji | 「広島県総合グランド」の略。固有名詞部分は 県 のみで、実質的に全体を翻訳扱いが妥当。 | | |
| 357 | 矢賀児童館 | やが | high | Yaga Children's Center | 矢贺儿童馆 | 야가 아동관 | romaji |  | | |
| 358 | 矢賀小学校 | やが | high | Yaga Elementary School | 矢贺小学 | 야가 초등학교 | romaji |  | | |
| 359 | 矢賀幼稚園 | やが | high | Yaga Kindergarten | 矢贺幼儿园 | 야가 유치원 | romaji |  | | |
| 360 | 矢賀新町集会所 | やがしんまち | high | Yaga-shinmachi Assembly Hall | 矢贺新町集会所 | 야가신마치 집회소 | romaji |  | | |
| 361 | 矢賀集会所 | やが | high | Yaga Assembly Hall | 矢贺集会所 | 야가 집회소 | romaji |  | | |
| 362 | 神崎保育園 | かんざき | high | Kanzaki Nursery School | 神崎保育园 | 간자키 보육원 | romaji |  | | |
| 363 | 神崎南集会所 | かんざきみなみ | high | Kanzaki-minami Assembly Hall | 神崎南集会所 | 간자키미나미 집회소 | romaji |  | | |
| 364 | 神崎小学校 | かんざき | high | Kanzaki Elementary School | 神崎小学 | 간자키 초등학교 | romaji |  | | |
| 365 | 福木中学校 | ふくぎ | high | Fukugi Junior High School | 福木初中 | 후쿠기 중학교 | romaji |  | | |
| 366 | 福木保育園 | ふくぎ | high | Fukugi Nursery School | 福木保育园 | 후쿠기 보육원 | romaji |  | | |
| 367 | 福木児童館 | ふくぎ | high | Fukugi Children's Center | 福木儿童馆 | 후쿠기 아동관 | romaji |  | | |
| 368 | 福木公園 | ふくぎ | high | Fukugi Park | 福木公园 | 후쿠기 공원 | romaji |  | | |
| 369 | 福木小学校 | ふくぎ | high | Fukugi Elementary School | 福木小学 | 후쿠기 초등학교 | romaji |  | | |
| 370 | 福木幼稚園 | ふくぎ | high | Fukugi Kindergarten | 福木幼儿园 | 후쿠기 유치원 | romaji |  | | |
| 371 | 福木集会所 | ふくぎ | high | Fukugi Assembly Hall | 福木集会所 | 후쿠기 집회소 | romaji |  | | |
| 372 | 福田公民館 | ふくだ | high | Fukuda Community Center | 福田公民馆 | 후쿠다 공민관 | romaji |  | | |
| 373 | 竜王公園 | りゅうおう | high | Ryuo Park | 龙王公园 | 류오 공원 | romaji |  | | |
| 374 | 竜王集会所 | りゅうおう | high | Ryuo Assembly Hall | 龙王集会所 | 류오 집회소 | romaji |  | | |
| 375 | 竹屋保育園 | たけや | high | Takeya Nursery School | 竹屋保育园 | 다케야 보육원 | romaji |  | | |
| 376 | 竹屋公民館 | たけや | high | Takeya Community Center | 竹屋公民馆 | 다케야 공민관 | romaji |  | | |
| 377 | 竹屋小学校 | たけや | high | Takeya Elementary School | 竹屋小学 | 다케야 초등학교 | romaji |  | | |
| 378 | 第二南観音会館 | みなみかんおん | high |  |  |  | romaji | 「第二南観音会館」= Minami-Kanon Hall No. 2 の想定。stem は 南観音。 | | |
| 379 | 縮景園 | しゅっけいえん | high | Shukkeien (historic Japanese garden) |  |  | romaji | 英語は Shukkeien Garden が一般的だが公式サイト英語ページは未確認。 | | |
| 380 | 翠町中学校 | みどりまち | high | Midorimachi Junior High School | 翠町初中 | 미도리마치 중학교 | romaji |  | | |
| 381 | 翠町小学校 | みどりまち | high | Midorimachi Elementary School | 翠町小学 | 미도리마치 초등학교 | romaji |  | | |
| 382 | 翠町集会所（翠町会館） | みどりまち | high | Midorimachi Assembly Hall | 翠町集会所 | 미도리마치 집회소 | romaji |  | | |
| 383 | 舟入保育園 | ふないり | high | Funairi Nursery School | 舟入保育园 | 후나이리 보육원 | romaji |  | | |
| 384 | 舟入児童館 | ふないり | high | Funairi Children's Center | 舟入儿童馆 | 후나이리 아동관 | romaji |  | | |
| 385 | 舟入公民館 | ふないり | high | Funairi Community Center | 舟入公民馆 | 후나이리 공민관 | romaji |  | | |
| 386 | 舟入南集会所 | ふないりみなみ | high | Funairi-minami Assembly Hall | 舟入南集会所 | 후나이리미나미 집회소 | romaji |  | | |
| 387 | 舟入小学校 | ふないり | high | Funairi Elementary School | 舟入小学 | 후나이리 초등학교 | romaji |  | | |
| 388 | 舟入集会所（操会館） | ふないり | high | Funairi Assembly Hall | 舟入集会所 | 후나이리 집회소 | romaji |  | | |
| 389 | 舟入高等学校 | ふないり | high | Funairi High School | 舟入高中 | 후나이리 고등학교 | romaji |  | | |
| 390 | 若草集会所 | わかくさ | high | Wakakusa Assembly Hall | 若草集会所 | 와카쿠사 집회소 | romaji |  | | |
| 391 | 草津保育園 | くさつ | high | Kusatsu Nursery School | 草津保育园 | 구사쓰 보육원 | romaji |  | | |
| 392 | 草津児童館 | くさつ | high | Kusatsu Children's Center | 草津儿童馆 | 구사쓰 아동관 | romaji |  | | |
| 393 | 草津公園 | くさつ | high | Kusatsu Park | 草津公园 | 구사쓰 공원 | romaji |  | | |
| 394 | 草津公民館・草津東集会所 | くさつ | high |  |  |  | romaji | 複数施設（草津公民館＋草津東集会所）。草津東 は くさつひがし。 | | |
| 395 | 草津小学校 | くさつ | high | Kusatsu Elementary School | 草津小学 | 구사쓰 초등학교 | romaji |  | | |
| 396 | 草津新町一丁目集会所 | くさつしんまちいっちょうめ | high | Kusatsu-shinmachi 1-chome Assembly Hall | 草津新町一丁目集会所 | 구사쓰신마치 1초메 집회소 | romaji |  | | |
| 397 | 草津新町二丁目集会所 | くさつしんまちにちょうめ | high | Kusatsu-shinmachi 2-chome Assembly Hall | 草津新町二丁目集会所 | 구사쓰신마치 2초메 집회소 | romaji |  | | |
| 398 | 草津本町集会所 | くさつほんまち | high | Kusatsu-honmachi Assembly Hall | 草津本町集会所 | 구사쓰혼마치 집회소 | romaji |  | | |
| 399 | 草津浜町集会所 | くさつはままち | high | Kusatsuhamamachi Assembly Hall | 草津滨町集会所 | 구사쓰하마마치 집회소 | romaji |  | | |
| 400 | 荒神保育園 | こうじん | high | Kojin Nursery School | 荒神保育园 | 고진 보육원 | romaji |  | | |
| 401 | 荒神町小学校 | こうじんまち | high | Kojinmachi Elementary School | 荒神町小学 | 고진마치 초등학교 | romaji |  | | |
| 402 | 荒神集会所（荒神地区集会所） | こうじん | high | Kojin Assembly Hall | 荒神集会所 | 고진 집회소 | romaji |  | | |
| 403 | 袋町学区会館（国泰寺集会所） | ふくろまち | high | Fukuromachi School District Hall | 袋町学区会馆 | 후쿠로마치 학구 회관 | romaji |  | | |
| 404 | 袋町小学校（袋町児童館含む） | ふくろまち | high | Fukuromachi Elementary School | 袋町小学 | 후쿠로마치 초등학교 | romaji |  | | |
| 405 | 西区スポーツセンター | にしく | high | Nishi-ku Sports Center | 西区体育中心 | 니시구 스포츠 센터 | romaji |  | | |
| 406 | 西区地域福祉センター | にしく | high | Nishi-ku Community Welfare Center | 西区地区福利中心 | 니시구 지역 복지 센터 | romaji |  | | |
| 407 | 西区民文化センター（コジマホールディングス西区民文化センター） | にしく | high | Nishi-ku Cultural Center | 西区民文化中心 | 니시구 문화 센터 | romaji | type_ja「区民文化センター」と stem の「区」が重複。括弧内はネーミングライツ。 | | |
| 408 | 西地域交流センター | にし | high | Nishi Community Exchange Center | 西地区交流中心 | 니시 지역 교류 센터 | romaji |  | | |
| 409 | 西部埋立第五公園 | せいぶうめたて | high | Seibumetate Park No. 5 | 西部埋立第五公园 | 세이부메타테 제5 공원 | romaji | 「西部埋立」は西部埋立地（Seibu Umetate）の意。 | | |
| 410 | 西部埋立第八公園 | せいぶうめたて | high | Seibumetate Park No. 8 | 西部埋立第八公园 | 세이부메타테 제8 공원 | romaji |  | | |
| 411 | 西部埋立第六公園 | せいぶうめたて | high | Seibumetate Park No. 6 | 西部埋立第六公园 | 세이부메타테 제6 공원 | romaji |  | | |
| 412 | 西霞町集会所 | にしかすみちょう | high | Nishi-kasumicho Assembly Hall | 西霞町集会所 | 니시카스미초 집회소 | romaji |  | | |
| 413 | 観音中学校 | かんおん | high | Kanon Junior High School | 观音初中 | 간온 중학교 | romaji |  | | |
| 414 | 観音会館 | かんおん | high | Kanon Hall | 观音会馆 | 간온 회관 | romaji |  | | |
| 415 | 観音児童館 | かんおん | high | Kanon Children's Center | 观音儿童馆 | 간온 아동관 | romaji |  | | |
| 416 | 観音公民館 | かんおん | high | Kanon Community Center | 观音公民馆 | 간온 공민관 | romaji |  | | |
| 417 | 観音小学校 | かんおん | high | Kanon Elementary School | 观音小学 | 간온 초등학교 | romaji |  | | |
| 418 | 観音新町会館 | かんおんしんまち | high | Kanon-shinmachi Hall | 观音新町会馆 | 간온신마치 회관 | romaji |  | | |
| 419 | 観音本町集会所 | かんおんほんまち | high | Kanon-honmachi Assembly Hall | 观音本町集会所 | 간온혼마치 집회소 | romaji |  | | |
| 420 | 金輪島集会所 | かなわじま | high | Kanawajima Assembly Hall | 金轮岛集会所 | 가나와지마 집회소 | romaji |  | | |
| 421 | 鈴が丘集会所 | すずがおか | high | Suzugaoka Assembly Hall |  | 스즈가오카 집회소 | romaji |  | | |
| 422 | 鈴が台会館 | すずがだい | high | Suzugadai Hall |  | 스즈가다이 회관 | romaji |  | | |
| 423 | 鈴が峰会館 | すずがみね | high | Suzugamine Hall |  | 스즈가미네 회관 | romaji |  | | |
| 424 | 鈴が峰児童館 | すずがみね | high | Suzugamine Children's Center |  | 스즈가미네 아동관 | romaji |  | | |
| 425 | 鈴が峰公園 | すずがみね | high | Suzugamine Park |  | 스즈가미네 공원 | romaji |  | | |
| 426 | 鈴が峰公民館 | すずがみね | high | Suzugamine Community Center |  | 스즈가미네 공민관 | romaji |  | | |
| 427 | 鈴が峰小学校 | すずがみね | high | Suzugamine Elementary School |  | 스즈가미네 초등학교 | romaji |  | | |
| 428 | 青崎保育園 | あおさき | high | Aosaki Nursery School | 青崎保育园 | 아오사키 보육원 | romaji |  | | |
| 429 | 青崎児童館 | あおさき | high | Aosaki Children's Center | 青崎儿童馆 | 아오사키 아동관 | romaji |  | | |
| 430 | 青崎公民館 | あおさき | high | Aosaki Community Center | 青崎公民馆 | 아오사키 공민관 | romaji |  | | |
| 431 | 青崎小学校 | あおさき | high | Aosaki Elementary School | 青崎小学 | 아오사키 초등학교 | romaji |  | | |
| 432 | 青崎集会所 | あおさき | high | Aosaki Assembly Hall | 青崎集会所 | 아오사키 집회소 | romaji |  | | |
| 433 | 馬木公民館 | うまき | high | Umaki Community Center | 马木公民馆 | 우마키 공민관 | romaji |  | | |
| 434 | 高天原墓園 | たかまがはら | high | Takamagahara Cemetery Park | 高天原墓园 | 다카마가하라 묘원 | romaji | 広島市の墓園募集資料（2026takamagahara）で確認。 | | |
| 435 | 高須児童館 | たかす | high | Takasu Children's Center | 高须儿童馆 | 다카스 아동관 | romaji |  | | |
| 436 | 高須台中央公園 | たかすだい | high | Takasudai Central Park | 高须台中央公园 | 다카스다이 중앙 공원 | romaji |  | | |
| 437 | 高須台集会所 | たかすだい | high | Takasudai Assembly Hall | 高须台集会所 | 다카스다이 집회소 | romaji |  | | |
| 438 | 高須小学校 | たかす | high | Takasu Elementary School | 高须小学 | 다카스 초등학교 | romaji |  | | |
| 439 | 高須集会所（高須会館） | たかす | high | Takasu Assembly Hall | 高须集会所 | 다카스 집회소 | romaji |  | | |
| 440 | 鷹野橋職員会館 | たかのばし | high | Takanobashi Staff Hall | 鹰野桥职员会馆 | 다카노바시 직원 회관 | romaji |  | | |
| 441 | 黄金山小学校 | おうごんざん | high | Ogonzan Elementary School | 黄金山小学 | 오곤잔 초등학교 | romaji |  | | |
| 442 | 黄金山集会所（黄金山会館） | おうごんざん | high | Ogonzan Assembly Hall | 黄金山集会所 | 오곤잔 집회소 | romaji |  | | |
