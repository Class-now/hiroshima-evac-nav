# UI 文言の訳語の確認表

`node scripts/translation-table.mjs > docs/translation-review-ui.md` で作り直す（手で書き換えない。直すのは js/i18n.js）。10/22 に足したキー: dir_*・dirDist・minFloor・shelterFor・from*・nearMe・geoDenied・outsideCenter・river*・stage・legend*・help・onb*・loading*・loadFailed・hazardLoadFailed・depthUnknown・landslideNone・dataDate・selectedPoint・clear、やさしい日本語の cat_*。

| key | やさしい にほんご | English | 简体中文 | 한국어 |
|---|---|---|---|---|
| landslideNone | どしゃくずれに ちゅういする ばしょ では ありません | Not in a landslide warning zone | 不在山体滑坡警戒区内 | 토사 재해 경계 구역이 아닙니다 |
| depthUnknown | わかりません（データを よみこめません でした）。たてものを タップして ください | Unknown (data not loaded). Try tapping a building | 不明（数据未能加载）。请点击建筑物 | 알 수 없음 (데이터를 불러오지 못했습니다). 건물을 눌러 보세요 |
| outsideCenter | ひろしましの まんなかの そとに います。ちずの まんなかから さがします | You are outside central Hiroshima. Searching from the map center | 您不在广岛市中心。改为从地图中心搜索 | 히로시마시 중심부 밖에 있습니다. 지도 중심에서 찾습니다 |
| hazardLoadFailed | この さいがいの データを よみこめません でした | Could not load the data for this hazard | 无法加载此灾害的数据 | 이 재해의 데이터를 불러오지 못했습니다 |
| dir_N | きた | north | 北 | 북쪽 |
| dir_NE | きたひがし | northeast | 东北 | 북동쪽 |
| dir_E | ひがし | east | 东 | 동쪽 |
| dir_SE | みなみひがし | southeast | 东南 | 남동쪽 |
| dir_S | みなみ | south | 南 | 남쪽 |
| dir_SW | みなみにし | southwest | 西南 | 남서쪽 |
| dir_W | にし | west | 西 | 서쪽 |
| dir_NW | きたにし | northwest | 西北 | 북서쪽 |
| dirDist | {dir} へ {dist}（まっすぐの きょり）・あるいて やく {m} ふん | {dist} to the {dir} (straight line) · about {m} min walk | 向{dir} {dist}（直线距离）・步行约 {m} 分钟 | {dir}으로 {dist} (직선 거리) · 도보 약 {m}분 |
| minFloor | {f} かい より うえを つかう | Use floor {f} or higher | 请使用 {f} 层或更高 | {f}층 이상을 이용하세요 |
| shelterFor | {hz} の ときに つかえる ひなんばしょ | Sites usable in a {hz} | {hz}时可使用的避难场所 | {hz} 시 이용 가능한 대피 장소 |
| fromSelected | えらんだ ばしょ から | From the selected spot | 从所选地点 | 선택한 장소에서 |
| fromHere | いまの ばしょ から | From your location | 从您的位置 | 현재 위치에서 |
| fromCenter | ちずの まんなか から | From the map center | 从地图中心 | 지도 중심에서 |
| nearMe | ちかくの ひなんばしょ | Nearest sites | 附近的避难场所 | 가까운 대피 장소 |
| geoDenied | いまの ばしょが わかりません。ちずの まんなかから さがします | Location not available. Searching from the map center | 无法获取位置。改为从地图中心搜索 | 위치를 알 수 없습니다. 지도 중심에서 찾습니다 |
| layerRiver | かわの みずの たかさ（かんそくじょ） | River water level (gauges) | 河流水位（观测站） | 하천 수위 (관측소) |
| riverTitle | かわの みずの たかさ | River water level | 河流水位 | 하천 수위 |
| riverLevel | みずの たかさ: {v} m（{t}） | Water level: {v} m ({t}) | 水位：{v} 米（{t}） | 수위: {v} m ({t}) |
| riverMax | この ひ いちばん たかかった とき: {v} m（{t}） | Highest that day: {v} m ({t}) | 当天最高：{v} 米（{t}） | 당일 최고: {v} m ({t}) |
| riverDaily | {d} の きろくです（1にち 1かい こうしん）。いまの みずの たかさでは ありません | Daily record for {d} (updated once a day). Not a live reading | {d} 的日记录（每天更新一次），不是实时水位 | {d}의 일별 기록입니다 (하루 1회 갱신). 실시간 수위가 아닙니다 |
| riverLive | いまの みずの たかさ（ひろしまけん） | Live water levels (Hiroshima Prefecture, Japanese) | 实时水位（广岛县，日语） | 실시간 수위 (히로시마현, 일본어) |
| riverNoData | かわの みずの データは まだ ありません | No river level data yet | 暂无河流水位数据 | 하천 수위 데이터가 아직 없습니다 |
| riverThresholds | めやす: {list} | Reference levels: {list} | 参考水位：{list} | 기준 수위: {list} |
| riverNoThreshold | めやすの たかさは ありません | No reference levels for this gauge | 此观测站没有参考水位 | 이 관측소에는 기준 수위가 없습니다 |
| stage | ふつう / すこし たかい / ちゅうい / にげる じゅんびを / あぶない | Normal / Standby level / Flood caution level / Evacuation judgment level / Flood danger level | 正常 / 待命水位 / 泛滥注意水位 / 避难判断水位 / 泛滥危险水位 | 평상시 / 대기 수위 / 범람 주의 수위 / 피난 판단 수위 / 범람 위험 수위 |
| stageNone | めやす なし | No reference | 无参考 | 기준 없음 |
| legend | いろの いみ | Legend | 图例 | 범례 |
| legendShelter | ひなんばしょ | Evacuation site | 避难场所 | 대피 장소 |
| legendTram | でんしゃの えき | Streetcar stop | 有轨电车站 | 노면전차 정류장 |
| legendRiver | かわの かんそくじょ（いろ = みずの たかさ） | River gauge (color = level) | 河流观测站（颜色＝水位） | 하천 관측소 (색 = 수위) |
| legendLandslide | どしゃくずれに ちゅうい | Landslide warning zone | 山体滑坡警戒区 | 토사 재해 경계 구역 |
| help | つかいかた | How to use | 使用方法 | 사용 방법 |
| onbTitle | つかいかた | How to use this map | 使用方法 | 사용 방법 |
| onb1 | 1. うえで「なにから にげる？」を えらぶ（こうずい・たかしお・つなみ・どしゃくずれ） | 1. Choose the danger at the top: flood, storm surge, tsunami or landslide. | 1. 在上方选择灾害种类：洪水、风暴潮、海啸、山体滑坡。 | 1. 위에서 재해 종류를 고르세요: 홍수, 고조, 쓰나미, 토사 재해. |
| onb2 | 2. ちずの たてものを タップする → みずの たかさと、なんかいより うえへ にげるかが でます | 2. Tap a building to see the expected water depth and which floor is high enough. | 2. 点击建筑物，查看预计浸水深度以及应避难到几层。 | 2. 건물을 누르면 예상 침수 깊이와 몇 층 이상으로 대피해야 하는지 나옵니다. |
| onb3 | 3. 「ちかくの ひなんばしょ」で、ちかい ひなんばしょ 3つと ほうがくが でます | 3. “Nearest sites” shows the 3 closest evacuation sites with direction and distance. | 3. “附近的避难场所”显示最近的 3 个避难场所及方向和距离。 | 3. “가까운 대피 장소”에서 가장 가까운 대피 장소 3곳의 방향과 거리를 볼 수 있습니다. |
| onb4 | これは よそうです。ほんとうに にげるときは、ひろしましの じょうほうに したがって ください | These are estimates. In a real emergency, follow Hiroshima City’s alerts. | 以上为预测。发生紧急情况时，请遵从广岛市发布的信息。 | 이 정보는 예측입니다. 실제 재해 시에는 히로시마시의 발표를 따르세요. |
| onbStart | はじめる | Start | 开始 | 시작 |
| loadingBuildings | 3D の たてものを よみこみちゅう… | Loading 3D buildings… | 正在加载 3D 建筑… | 3D 건물을 불러오는 중… |
| loadingTiles | よみこみちゅう… のこり {n} | Loading… {n} left | 加载中… 剩余 {n} | 불러오는 중… 남은 {n} |
| loadFailed | 3D の たてものを よみこめません でした。ひなんばしょの あんないは つかえます | Could not load 3D buildings. Evacuation site guidance still works | 无法加载 3D 建筑。避难场所指引仍可使用 | 3D 건물을 불러오지 못했습니다. 대피 장소 안내는 이용할 수 있습니다 |
| dataDate | データの ひづけ: {d} | Data date: {d} | 数据日期：{d} | 데이터 날짜: {d} |
| selectedPoint | えらんだ ばしょ | Selected spot | 所选地点 | 선택한 장소 |
| clear | けす | Clear | 清除 | 지우기 |
| cat_elementary | しょうがっこう | elementary school | 小学 | 초등학교 |
| cat_juniorhigh | ちゅうがっこう | junior high school | 初中 | 중학교 |
| cat_highschool | こうこう | high school | 高中 | 고등학교 |
| cat_university | だいがく | university | 大学 | 대학교 |
| cat_school | がっこう | school | 学校 | 학교 |
| cat_children | じどうかん（こどもの たてもの） | children's center | 儿童馆 | 아동관 |
| cat_nursery | ほいくえん・ようちえん | nursery / kindergarten | 保育园／幼儿园 | 보육원/유치원 |
| cat_hall | しゅうかいしょ | community meeting hall | 社区集会所 | 마을 집회소 |
| cat_community | こうみんかん など | community center | 社区中心 | 커뮤니티 센터 |
| cat_library | としょかん | library | 图书馆 | 도서관 |
| cat_culture | ホール | cultural hall | 文化会馆 | 문화회관 |
| cat_park | こうえん・ひろば | park / open space | 公园／广场 | 공원/광장 |
| cat_sports | スポーツの しせつ | sports facility | 体育设施 | 체육 시설 |
| cat_welfare | ふくしの しせつ | welfare facility | 福利设施 | 복지 시설 |
| buildingEst | この たてもの: やく {s} かいだて（たかさ {h} m から けいさん） | This building: about {s} floors (estimated from its {h} m height) | 此建筑：约 {s} 层（根据高度 {h} 米推算） | 이 건물: 약 {s}층 (높이 {h} m로 추정) |
| goUpUnknown | にげる じかんが ないとき: たかい たてものの {f} かい より うえへ | If there is no time to leave: go up to floor {f} or higher in a tall building | 来不及撤离时：请到高层建筑的 {f} 层或更高 | 대피할 시간이 없을 때: 높은 건물의 {f}층 이상으로 올라가세요 |
| modeDepth | みずの たかさで いろ | Color by water depth | 按浸水深度着色 | 침수 깊이별 색상 |
| modeRefuge | うえの かいへ にげられる たてもの | Buildings tall enough to go up | 可向高层避难的建筑 | 위층으로 대피할 수 있는 건물 |
| legendOk | うえへ にげられる | Tall enough | 高度足够 | 충분히 높음 |
| legendNg | ひくい（ひなんばしょへ） | Too low (go to a site) | 太低（请去避难场所） | 낮음 (대피 장소로) |
| title | ひろしま 3D ひなん マップ | Hiroshima 3D Evacuation Map | 广岛 3D 避难地图 | 히로시마 3D 대피 지도 |
| subtitle | みずが くる たかさと にげる ばしょ | Flood depth and where to go | 浸水深度与避难地点 | 침수 깊이와 대피 장소 |
| tapHint | ちずの たてものを タップして ください | Tap a building on the map | 请点击地图上的建筑物 | 지도에서 건물을 눌러 주세요 |
| myLocation | いまの ばしょ | My location | 我的位置 | 내 위치 |
| spots | ばしょを えらぶ | Pick a place | 选择地点 | 장소 선택 |
| layers | ちずに だすもの | Layers | 图层 | 레이어 |
| layerBuildings | たてもの（みずの たかさで いろ） | Buildings (colored by flood depth) | 建筑物（按浸水深度着色） | 건물 (침수 깊이별 색상) |
| layerFlood | かわが あふれた とき | River flooding | 河流泛滥 | 하천 범람 |
| layerSurge | たかしお（うみの みずが あがる） | Storm surge | 风暴潮 | 해일 (고조) |
| layerTsunami | つなみ | Tsunami | 海啸 | 쓰나미 |
| layerLandslide | どしゃくずれに ちゅうい | Landslide warning zones | 泥石流・山体滑坡警戒区 | 토사 재해 경계 구역 |
| layerShelters | ひなんばしょ | Evacuation sites | 避难场所 | 대피 장소 |
| layerTram | ろめんでんしゃの えき（ひろでん） | Streetcar stops (Hiroden) | 有轨电车站（广电） | 노면전차 정류장 (히로덴) |
| hazard | なにから にげる？ | Which danger? | 哪种灾害？ | 어떤 재해? |
| hzFlood | こうずい | Flood | 洪水 | 홍수 |
| hzSurge | たかしお | Storm surge | 风暴潮 | 고조 |
| hzTsunami | つなみ | Tsunami | 海啸 | 쓰나미 |
| hzLandslide | どしゃくずれ | Landslide | 山体滑坡 | 토사 재해 |
| resultTitle | ここの きけん | Risk at this spot | 此处的风险 | 이곳의 위험 |
| depthLabel | みずの たかさ（いちばん おおきい とき） | Water depth (worst case) | 浸水深度（最严重情况） | 침수 깊이 (최악의 경우) |
| depthNone | みずは こない よそうです | No flooding expected | 预计不会浸水 | 침수가 예상되지 않습니다 |
| depthM | やく {d} m | about {d} m | 约 {d} 米 | 약 {d} m |
| duration | みずが ひくまで: やく {h} じかん | Water may stay for about {h} hours | 积水可能持续约 {h} 小时 | 물이 빠질 때까지 약 {h} 시간 |
| building | この たてもの: {s} かいだて | This building: {s} floors | 此建筑：{s} 层 | 이 건물: {s}층 |
| buildingUnknown | この たてもの: なんかいだてか わかりません | This building: number of floors unknown | 此建筑：层数不明 | 이 건물: 층수 정보 없음 |
| goUp | にげる じかんが ないとき: この たてものの {f} かい より うえへ | If there is no time to leave: go up to floor {f} or higher in this building | 来不及撤离时：请到此建筑 {f} 层或更高的楼层 | 대피할 시간이 없을 때: 이 건물의 {f}층 이상으로 올라가세요 |
| goUpNo | この たてものは ひくいです。はやく ひなんばしょへ いって ください | This building is too low. Go to an evacuation site now | 此建筑太低。请立即前往避难场所 | 이 건물은 낮습니다. 지금 바로 대피 장소로 가세요 |
| shelterTitle | ちかくの ひなんばしょ | Nearest evacuation sites | 附近的避难场所 | 가까운 대피 장소 |
| shelterNone | ちかくに ひなんばしょが みつかりません | No evacuation site found nearby | 附近没有找到避难场所 | 근처에 대피 장소가 없습니다 |
| walk | あるいて やく {m} ふん（{km} km、まっすぐの きょり） | About {m} min walk ({km} km, straight line) | 步行约 {m} 分钟（{km} 公里，直线距离） | 도보 약 {m}분 ({km} km, 직선 거리) |
| tramTitle | ちかくの ろめんでんしゃの えき | Nearest streetcar stop | 最近的有轨电车站 | 가까운 노면전차 정류장 |
| landslideWarn | どしゃくずれに ちゅういする ばしょです | This spot is in a landslide warning zone | 此处位于山体滑坡警戒区 | 이곳은 토사 재해 경계 구역입니다 |
| outside | ひろしましの まんなかで つかって ください。いまは れいの ばしょを だします | This map works in central Hiroshima. Showing a sample spot instead | 本地图适用于广岛市中心。现在显示示例地点 | 이 지도는 히로시마시 중심부에서 사용할 수 있습니다. 예시 장소를 표시합니다 |
| geoError | いまの ばしょが わかりません | Could not get your location | 无法获取您的位置 | 현재 위치를 알 수 없습니다 |
| disclaimer | これは よそうです。ほんとうに にげるときは、ひろしまし の じょうほうと ちかくの ひとの いうことを きいて ください。 | These are estimates. In a real emergency, follow Hiroshima City's alerts and instructions from local staff. | 以上为预测。发生紧急情况时，请遵从广岛市发布的信息和现场工作人员的指示。 | 이 정보는 예측입니다. 실제 재해 시에는 히로시마시의 발표와 현장 직원의 안내를 따르세요. |
| sources | データ | Data | 数据来源 | 데이터 출처 |
| close | とじる | Close | 关闭 | 닫기 |
| loading | よみこみちゅう… | Loading… | 加载中… | 불러오는 중… |
| floodNote | こうずいは「いちばん おおきい あめ」の よそう | Flood = worst-case rainfall scenario | 洪水为最大降雨量的预测 | 홍수는 최대 강우량을 가정한 예측입니다 |
| rank | みずは こない / 0.5 m より ひくい / 0.5〜3 m / 3〜5 m / 5〜10 m / 10〜20 m / 20 m より たかい | No flooding / under 0.5 m / 0.5–3 m / 3–5 m / 5–10 m / 10–20 m / over 20 m | 不会浸水 / 不足 0.5 米 / 0.5–3 米 / 3–5 米 / 5–10 米 / 10–20 米 / 超过 20 米 | 침수 없음 / 0.5 m 미만 / 0.5–3 m / 3–5 m / 5–10 m / 10–20 m / 20 m 이상 |
| spot_station | ひろしまえき | Hiroshima Station | 广岛站 | 히로시마역 |
| spot_peace | へいわきねんこうえん | Peace Memorial Park | 和平纪念公园 | 평화기념공원 |
| spot_hondori | ほんどおり | Hondori Street | 本通商店街 | 혼도리 상점가 |
| spot_castle | ひろしまじょう | Hiroshima Castle | 广岛城 | 히로시마성 |
| kindEmergency | すぐに にげる ばしょ | Emergency evacuation area | 紧急避难场所 | 긴급 대피 장소 |
| kindShelter | とまれる ひなんじょ | Evacuation shelter (stay overnight) | 避难所（可过夜） | 대피소 (숙박 가능) |
