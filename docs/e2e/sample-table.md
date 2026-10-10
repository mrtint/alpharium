# e2e 표본 표 — 30일치 가상의 하루 (070)

층 1 실행 앞단의 「표본 보장」이 전용 테스트 기기의 `PocketlogSeed/` 아래에 심는 사진의 정본 표다. 이 문서는 `scripts/e2e-sample/manifest.ts`·`photos.json`에서 그려지고 (`scripts/sample-doc.mts`), 둘이 어긋나면 `__tests__/e2e-sample/doc-match.test.ts`가 실패한다.

- 범위: 오늘로부터 1~30일 전 **30일**, 사진 **129장**. 오늘은 심지 않는다(층 1 쓴 날 픽스처가 오늘을 차지한다).
- **「장소 N곳」은 군집 수가 아니라 순차 방문 수다** — 사진을 시각순으로 놓고 직전 자리와 100m를 넘으면 새 자리로 센다(집→직장→집 = 3곳). 기대 장소 수는 사람이 적은 값이다.
- 방문 안 위치 흔들림은 40m 이내(한 자리로 묶임), 군집 사이는 1km 이상.
- 일기 품질을 결론짓지 않는다. 얻는 것은 「사진 수집 → 재료 판정 → 장소 묶기 경로가 도는가」다(010, 원칙 V).
- **iOS 시뮬레이터는 범위 밖이다(미검증)** — 표는 플랫폼에 중립이다.

## 군집

| 이름 | 위치 | 위도 | 경도 | 흔들림 |
| --- | --- | --- | --- | --- |
| home | 집 (망원한강공원 근처) | 37.5547 | 126.8977 | ≤ 40m |
| work | 직장 (강남역 근처) | 37.4979 | 127.0276 | ≤ 40m |
| cafe | 단골 가게 (서울숲 근처) | 37.5444 | 127.0374 | ≤ 40m |
| weekend | 주말 나들이 (양평 두물머리 근처) | 37.5446 | 127.3226 | ≤ 40m |

## 상황

| 상황 | 설명 | 사진 | 방문 순서 | 기대 장소 |
| --- | --- | --- | --- | --- |
| zero | 사진 0장 — 사진·장소 모두 관측된 0 | 0 | — | 0 |
| single | 집에서 점심 한 장 | 1 | home | 1 |
| few-home | 집에서만 세 장 — 장소 1곳 | 3 | home | 1 |
| commute | 집→직장→집, 다섯 장 — 장소 3곳 | 5 | home → work → home | 3 |
| full-day-over-limit | 하루 종일 열두 장(상한 8장 초과) — 집→직장→단골 가게→집, 장소 4곳 | 12 | home → work → cafe → home | 4 |
| night-only | 밤에만 세 장 — 장소 1곳 | 3 | home | 1 |
| noon-only | 점심때만 두 장 — 장소 1곳 | 2 | work | 1 |
| no-gps | 위치 정보 없는 네 장 — 사진은 있고 장소는 관측된 0 | 4 | — | 0 |
| clutter | 카메라 3장 + 스크린샷 2장 + 다운로드 1장 — 잡사진은 좌표 없음, 장소 2곳 | 6 | work → home | 2 |
| weekend | 주말 나들이 여섯 장 — 장소 1곳 | 6 | weekend | 1 |
| walking | 걸어 다닌 날 — 같은 군집에서 150m씩 떨어져 다섯 장, 장소 5곳(순차 방문 수) | 5 | home → home → home → home → home | 5 |
| screenshots-only | 스크린샷만 세 장 — 좌표 없음, 사진 3장·장소 0곳 | 3 | — | 0 |

## 날 표

오프셋 = 오늘로부터 며칠 전. **대표 날**은 `sample-days` 흐름이 달력으로 이동해 사진 칸·장소 칸을 확인하는 날이다.

| 오프셋 | 상황 | 사진 | 기대 장소 | 대표 날 | 심은 촬영 시각 · 폴더 · 위치 |
| --- | --- | --- | --- | --- | --- |
| 1 | commute | 5 | 3 | — | 08:10 home, 09:20 work, 12:30 work, 18:40 work, 20:30 home |
| 2 | few-home | 3 | 1 | — | 09:10 home, 13:40 home, 20:15 home |
| 3 | zero | 0 | 0 | ○ | — |
| 4 | single | 1 | 1 | ○ | 12:30 home |
| 5 | full-day-over-limit | 12 | 4 | ○ | 07:30 home, 08:00 home, 09:30 work, 10:30 work, 12:15 work, 14:00 work, 16:20 work, 17:30 cafe, 17:50 cafe, 18:10 cafe, 20:00 home, 22:10 home |
| 6 | weekend | 6 | 1 | — | 10:30 weekend, 11:15 weekend, 12:40 weekend, 14:10 weekend, 15:30 weekend, 17:00 weekend |
| 7 | no-gps | 4 | 0 | ○ | 10:00 위치 없음, 12:30 위치 없음, 15:00 위치 없음, 19:00 위치 없음 |
| 8 | clutter | 6 | 2 | ○ | 09:30 work, 11:45 work, 13:10 Screenshots 위치 없음, 14:00 Screenshots 위치 없음, 15:20 Download 위치 없음, 18:30 home |
| 9 | night-only | 3 | 1 | ○ | 22:05 home, 22:40 home, 23:30 home |
| 10 | commute | 5 | 3 | — | 08:10 home, 09:20 work, 12:30 work, 18:40 work, 20:30 home |
| 11 | zero | 0 | 0 | — | — |
| 12 | walking | 5 | 5 | ○ | 10:00 home, 11:00 home, 12:00 home, 13:00 home, 14:00 home |
| 13 | few-home | 3 | 1 | — | 09:10 home, 13:40 home, 20:15 home |
| 14 | noon-only | 2 | 1 | — | 12:05 work, 12:20 work |
| 15 | full-day-over-limit | 12 | 4 | — | 07:30 home, 08:00 home, 09:30 work, 10:30 work, 12:15 work, 14:00 work, 16:20 work, 17:30 cafe, 17:50 cafe, 18:10 cafe, 20:00 home, 22:10 home |
| 16 | weekend | 6 | 1 | — | 10:30 weekend, 11:15 weekend, 12:40 weekend, 14:10 weekend, 15:30 weekend, 17:00 weekend |
| 17 | single | 1 | 1 | — | 12:30 home |
| 18 | screenshots-only | 3 | 0 | — | 21:00 Screenshots 위치 없음, 21:05 Screenshots 위치 없음, 21:10 Screenshots 위치 없음 |
| 19 | commute | 5 | 3 | — | 08:10 home, 09:20 work, 12:30 work, 18:40 work, 20:30 home |
| 20 | zero | 0 | 0 | — | — |
| 21 | no-gps | 4 | 0 | — | 10:00 위치 없음, 12:30 위치 없음, 15:00 위치 없음, 19:00 위치 없음 |
| 22 | clutter | 6 | 2 | — | 09:30 work, 11:45 work, 13:10 Screenshots 위치 없음, 14:00 Screenshots 위치 없음, 15:20 Download 위치 없음, 18:30 home |
| 23 | night-only | 3 | 1 | — | 22:05 home, 22:40 home, 23:30 home |
| 24 | few-home | 3 | 1 | — | 09:10 home, 13:40 home, 20:15 home |
| 25 | full-day-over-limit | 12 | 4 | — | 07:30 home, 08:00 home, 09:30 work, 10:30 work, 12:15 work, 14:00 work, 16:20 work, 17:30 cafe, 17:50 cafe, 18:10 cafe, 20:00 home, 22:10 home |
| 26 | weekend | 6 | 1 | ○ | 10:30 weekend, 11:15 weekend, 12:40 weekend, 14:10 weekend, 15:30 weekend, 17:00 weekend |
| 27 | commute | 5 | 3 | — | 08:10 home, 09:20 work, 12:30 work, 18:40 work, 20:30 home |
| 28 | single | 1 | 1 | — | 12:30 home |
| 29 | walking | 5 | 5 | — | 10:00 home, 11:00 home, 12:00 home, 13:00 home, 14:00 home |
| 30 | noon-only | 2 | 1 | — | 12:05 work, 12:20 work |

## 사진 출처

Wikimedia Commons의 CC0·퍼블릭 도메인 파일 210장(소유자가 풀을 200장 이상으로 정했다, 2026-10-10). 직접 URL은 upload.wikimedia.org의 960px 축소본이다. 받은 파일은 `scripts/e2e-sample/.cache/`(gitignore)에만 있고 저장소에는 `photos.json` 목록만 있다. 심을 때 원래 EXIF는 걷고 표가 정한 촬영 시각·GPS만 새로 쓴다.

| 목록 파일 | 태그 | 라이선스 | 확인 일자 | Commons 파일 |
| --- | --- | --- | --- | --- |
| commons-indoor-01.jpg | indoor | CC0 | 2026-10-10 | [Living room (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Living_room_(Unsplash).jpg) |
| commons-indoor-02.jpg | indoor | CC0 | 2026-10-10 | [Living room of a typical rural house in northeast Brazil.jpg](https://commons.wikimedia.org/wiki/File:Living_room_of_a_typical_rural_house_in_northeast_Brazil.jpg) |
| commons-indoor-03.jpg | indoor | CC0 | 2026-10-10 | [The living room that needs houseplants.jpg](https://commons.wikimedia.org/wiki/File:The_living_room_that_needs_houseplants.jpg) |
| commons-indoor-04.jpg | indoor | CC0 | 2026-10-10 | [Apartment hotel Nice.jpg](https://commons.wikimedia.org/wiki/File:Apartment_hotel_Nice.jpg) |
| commons-indoor-05.jpg | indoor | CC0 | 2026-10-10 | [Empty apartment in Berlin with white desk, chair and ladder 01.jpg](https://commons.wikimedia.org/wiki/File:Empty_apartment_in_Berlin_with_white_desk,_chair_and_ladder_01.jpg) |
| commons-indoor-06.jpg | indoor | CC0 | 2026-10-10 | [Empty apartment in Berlin with fitted kitchen and chair 2.jpg](https://commons.wikimedia.org/wiki/File:Empty_apartment_in_Berlin_with_fitted_kitchen_and_chair_2.jpg) |
| commons-indoor-07.jpg | indoor | CC0 | 2026-10-10 | [Living Room Interior Designer - Picker Online.jpg](https://commons.wikimedia.org/wiki/File:Living_Room_Interior_Designer_-_Picker_Online.jpg) |
| commons-indoor-08.jpg | indoor | CC0 | 2026-10-10 | [LeHavre MaisonDel'Armateur Bedroom 1.jpg](https://commons.wikimedia.org/wiki/File:LeHavre_MaisonDel%27Armateur_Bedroom_1.jpg) |
| commons-indoor-09.jpg | indoor | CC0 | 2026-10-10 | [Apartment building facing the Eiffel Tower.jpg](https://commons.wikimedia.org/wiki/File:Apartment_building_facing_the_Eiffel_Tower.jpg) |
| commons-indoor-10.jpg | indoor | CC0 | 2026-10-10 | [Blue white kitchen interior (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Blue_white_kitchen_interior_(Unsplash).jpg) |
| commons-indoor-11.jpg | indoor | CC0 | 2026-10-10 | [Minimalist office (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Minimalist_office_(Unsplash).jpg) |
| commons-indoor-12.jpg | indoor | CC0 | 2026-10-10 | [Furnished living room. (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Furnished_living_room._(Unsplash).jpg) |
| commons-indoor-13.jpg | indoor | CC0 | 2026-10-10 | [Дом Шрёдер - комната сына (1).jpg](https://commons.wikimedia.org/wiki/File:%D0%94%D0%BE%D0%BC_%D0%A8%D1%80%D1%91%D0%B4%D0%B5%D1%80_-_%D0%BA%D0%BE%D0%BC%D0%BD%D0%B0%D1%82%D0%B0_%D1%81%D1%8B%D0%BD%D0%B0_(1).jpg) |
| commons-indoor-14.jpg | indoor | CC0 | 2026-10-10 | [Kitchen in Earthship Brighton.jpg](https://commons.wikimedia.org/wiki/File:Kitchen_in_Earthship_Brighton.jpg) |
| commons-indoor-15.jpg | indoor | CC0 | 2026-10-10 | [Home office (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Home_office_(Unsplash).jpg) |
| commons-indoor-16.jpg | indoor | CC0 | 2026-10-10 | [Paleis Het Loo, interior pic28.JPG](https://commons.wikimedia.org/wiki/File:Paleis_Het_Loo,_interior_pic28.JPG) |
| commons-indoor-17.jpg | indoor | CC0 | 2026-10-10 | [Spiral staircase State Library of Victoria 20180724-003.jpg](https://commons.wikimedia.org/wiki/File:Spiral_staircase_State_Library_of_Victoria_20180724-003.jpg) |
| commons-indoor-18.jpg | indoor | CC0 | 2026-10-10 | [Reading room of the Bibliothèque Sainte-Geneviève in 2016.jpg](https://commons.wikimedia.org/wiki/File:Reading_room_of_the_Biblioth%C3%A8que_Sainte-Genevi%C3%A8ve_in_2016.jpg) |
| commons-indoor-19.jpg | indoor | CC0 | 2026-10-10 | [Cafe Baba, Tanger.jpg](https://commons.wikimedia.org/wiki/File:Cafe_Baba,_Tanger.jpg) |
| commons-indoor-20.jpg | indoor | CC0 | 2026-10-10 | [Interior of JUSCO Shingu Shopping Center 20100213a.JPG](https://commons.wikimedia.org/wiki/File:Interior_of_JUSCO_Shingu_Shopping_Center_20100213a.JPG) |
| commons-indoor-21.jpg | indoor | CC0 | 2026-10-10 | [UIUC Library Hallway.jpg](https://commons.wikimedia.org/wiki/File:UIUC_Library_Hallway.jpg) |
| commons-indoor-22.jpg | indoor | CC0 | 2026-10-10 | [GD 廣東 Guangdong ZS 中山 Zhongshan 古鎮 Guzhen 燈都時代酒店 Light Era Hotel room window white curtain 晨早 morning November 2024 R12S 01.jpg](https://commons.wikimedia.org/wiki/File:GD_%E5%BB%A3%E6%9D%B1_Guangdong_ZS_%E4%B8%AD%E5%B1%B1_Zhongshan_%E5%8F%A4%E9%8E%AE_Guzhen_%E7%87%88%E9%83%BD%E6%99%82%E4%BB%A3%E9%85%92%E5%BA%97_Light_Era_Hotel_room_window_white_curtain_%E6%99%A8%E6%97%A9_morning_November_2024_R12S_01.jpg) |
| commons-indoor-23.jpg | indoor | CC0 | 2026-10-10 | [Dining room at the inn Dans les bras de Morphée, located on Île d'Orléans.jpg](https://commons.wikimedia.org/wiki/File:Dining_room_at_the_inn_Dans_les_bras_de_Morph%C3%A9e,_located_on_%C3%8Ele_d%27Orl%C3%A9ans.jpg) |
| commons-indoor-24.jpg | indoor | CC0 | 2026-10-10 | [Living room in apartment of Condomínio do Edifício Zaher, Le Blond, Rio de Janeiro, Brazil.jpg](https://commons.wikimedia.org/wiki/File:Living_room_in_apartment_of_Condom%C3%ADnio_do_Edif%C3%ADcio_Zaher,_Le_Blond,_Rio_de_Janeiro,_Brazil.jpg) |
| commons-indoor-25.jpg | indoor | CC0 | 2026-10-10 | [LeHavre MaisonDel'Armateur Bedroom 2.jpg](https://commons.wikimedia.org/wiki/File:LeHavre_MaisonDel%27Armateur_Bedroom_2.jpg) |
| commons-indoor-26.jpg | indoor | CC0 | 2026-10-10 | [Inside-apartment-design-home (24244145021).jpg](https://commons.wikimedia.org/wiki/File:Inside-apartment-design-home_(24244145021).jpg) |
| commons-indoor-27.jpg | indoor | CC0 | 2026-10-10 | [Standen House kitchen 2024-10-08.jpg](https://commons.wikimedia.org/wiki/File:Standen_House_kitchen_2024-10-08.jpg) |
| commons-indoor-28.jpg | indoor | PD | 2026-10-10 | [Titanic Marconi Wireless Radio Room.jpg](https://commons.wikimedia.org/wiki/File:Titanic_Marconi_Wireless_Radio_Room.jpg) |
| commons-indoor-29.jpg | indoor | CC0 | 2026-10-10 | [Laptop in the living room (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Laptop_in_the_living_room_(Unsplash).jpg) |
| commons-indoor-30.jpg | indoor | CC0 | 2026-10-10 | [Bedroom in Standen House 2024-10-08.jpg](https://commons.wikimedia.org/wiki/File:Bedroom_in_Standen_House_2024-10-08.jpg) |
| commons-food-01.jpg | food | CC0 | 2026-10-10 | [Food-plate-toast-restaurant (24031208550).jpg](https://commons.wikimedia.org/wiki/File:Food-plate-toast-restaurant_(24031208550).jpg) |
| commons-food-02.jpg | food | CC0 | 2026-10-10 | [Food-plate-rucola-salad (23699968653).jpg](https://commons.wikimedia.org/wiki/File:Food-plate-rucola-salad_(23699968653).jpg) |
| commons-food-03.jpg | food | CC0 | 2026-10-10 | [Food-plate-wood-restaurant (23696743244).jpg](https://commons.wikimedia.org/wiki/File:Food-plate-wood-restaurant_(23696743244).jpg) |
| commons-food-04.jpg | food | CC0 | 2026-10-10 | [Grilled beef kalbi on iron plate set meal of Yoshinoya.jpg](https://commons.wikimedia.org/wiki/File:Grilled_beef_kalbi_on_iron_plate_set_meal_of_Yoshinoya.jpg) |
| commons-food-05.jpg | food | CC0 | 2026-10-10 | [Vegetarian creamy pasta - Jollof Café 2023-06-28.jpg](https://commons.wikimedia.org/wiki/File:Vegetarian_creamy_pasta_-_Jollof_Caf%C3%A9_2023-06-28.jpg) |
| commons-food-06.jpg | food | CC0 | 2026-10-10 | [American Breakfast 1.jpg](https://commons.wikimedia.org/wiki/File:American_Breakfast_1.jpg) |
| commons-food-07.jpg | food | CC0 | 2026-10-10 | [Light meal in Famous Cake Company 2024-07-31.jpg](https://commons.wikimedia.org/wiki/File:Light_meal_in_Famous_Cake_Company_2024-07-31.jpg) |
| commons-food-08.jpg | food | CC0 | 2026-10-10 | [Sour pasta with tomatoes and spinach.jpg](https://commons.wikimedia.org/wiki/File:Sour_pasta_with_tomatoes_and_spinach.jpg) |
| commons-food-09.jpg | food | CC0 | 2026-10-10 | [Breakfast in Île d'Orléans 072.jpg](https://commons.wikimedia.org/wiki/File:Breakfast_in_%C3%8Ele_d%27Orl%C3%A9ans_072.jpg) |
| commons-food-10.jpg | food | CC0 | 2026-10-10 | [Cake in Seoul, Korea - DSC00769.JPG](https://commons.wikimedia.org/wiki/File:Cake_in_Seoul,_Korea_-_DSC00769.JPG) |
| commons-food-11.jpg | food | CC0 | 2026-10-10 | [Two Three Bowl Cart Noodle, Sham Shui Po.jpg](https://commons.wikimedia.org/wiki/File:Two_Three_Bowl_Cart_Noodle,_Sham_Shui_Po.jpg) |
| commons-food-12.jpg | food | CC0 | 2026-10-10 | [Ham and cheese sandwich - Kanazawa, Japan - DSC00123.jpg](https://commons.wikimedia.org/wiki/File:Ham_and_cheese_sandwich_-_Kanazawa,_Japan_-_DSC00123.jpg) |
| commons-food-13.jpg | food | CC0 | 2026-10-10 | [Salad with lettuce and nuts and sliced pears.JPG](https://commons.wikimedia.org/wiki/File:Salad_with_lettuce_and_nuts_and_sliced_pears.JPG) |
| commons-food-14.jpg | food | CC0 | 2026-10-10 | [Pizza with mushrooms and cheese.jpg](https://commons.wikimedia.org/wiki/File:Pizza_with_mushrooms_and_cheese.jpg) |
| commons-food-15.jpg | food | CC0 | 2026-10-10 | [Autumn Soup (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Autumn_Soup_(Unsplash).jpg) |
| commons-food-16.jpg | food | CC0 | 2026-10-10 | [Coffee cup kaffe - 1.JPG](https://commons.wikimedia.org/wiki/File:Coffee_cup_kaffe_-_1.JPG) |
| commons-food-17.jpg | food | CC0 | 2026-10-10 | [Blueberries-In-Pack.jpg](https://commons.wikimedia.org/wiki/File:Blueberries-In-Pack.jpg) |
| commons-food-18.jpg | food | CC0 | 2026-10-10 | [Burger Leifers 2.JPG](https://commons.wikimedia.org/wiki/File:Burger_Leifers_2.JPG) |
| commons-food-19.jpg | food | CC0 | 2026-10-10 | [Sashimi Rolls (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Sashimi_Rolls_(Unsplash).jpg) |
| commons-food-20.jpg | food | CC0 | 2026-10-10 | [Rice dish at a party in a round bowl.JPG](https://commons.wikimedia.org/wiki/File:Rice_dish_at_a_party_in_a_round_bowl.JPG) |
| commons-food-21.jpg | food | CC0 | 2026-10-10 | [Bread-wood-knife-paper (24244388631).jpg](https://commons.wikimedia.org/wiki/File:Bread-wood-knife-paper_(24244388631).jpg) |
| commons-food-22.jpg | food | CC0 | 2026-10-10 | [Trinidad iftar plate date, pholourie, channa.jpg](https://commons.wikimedia.org/wiki/File:Trinidad_iftar_plate_date,_pholourie,_channa.jpg) |
| commons-food-23.jpg | food | CC0 | 2026-10-10 | [Smoked salmon pasta - Figaros, Brighton 2024-04-19.jpg](https://commons.wikimedia.org/wiki/File:Smoked_salmon_pasta_-_Figaros,_Brighton_2024-04-19.jpg) |
| commons-food-24.jpg | food | CC0 | 2026-10-10 | [Garden breakfast - Garden Café Brighton 2023-12-30.jpg](https://commons.wikimedia.org/wiki/File:Garden_breakfast_-_Garden_Caf%C3%A9_Brighton_2023-12-30.jpg) |
| commons-food-25.jpg | food | CC0 | 2026-10-10 | [Brownie-dessert-cake-sweet-45202.jpg](https://commons.wikimedia.org/wiki/File:Brownie-dessert-cake-sweet-45202.jpg) |
| commons-food-26.jpg | food | CC0 | 2026-10-10 | [Dinner in Two Three Bowl Cart Noodle, Sham Shui Po.jpg](https://commons.wikimedia.org/wiki/File:Dinner_in_Two_Three_Bowl_Cart_Noodle,_Sham_Shui_Po.jpg) |
| commons-food-27.jpg | food | CC0 | 2026-10-10 | [Egg Sandwich 001.jpg](https://commons.wikimedia.org/wiki/File:Egg_Sandwich_001.jpg) |
| commons-food-28.jpg | food | CC0 | 2026-10-10 | [Burger and a Salad (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Burger_and_a_Salad_(Unsplash).jpg) |
| commons-food-29.jpg | food | CC0 | 2026-10-10 | [Pizza 10.jpg](https://commons.wikimedia.org/wiki/File:Pizza_10.jpg) |
| commons-food-30.jpg | food | CC0 | 2026-10-10 | [Empty tomato soup dish and wine glass.jpg](https://commons.wikimedia.org/wiki/File:Empty_tomato_soup_dish_and_wine_glass.jpg) |
| commons-document-01.jpg | document | CC0 | 2026-10-10 | [Left-handed writing with wristwatch.jpg](https://commons.wikimedia.org/wiki/File:Left-handed_writing_with_wristwatch.jpg) |
| commons-document-02.jpg | document | CC0 | 2026-10-10 | [Small blue notepad - 8 x 11 cm - D.jpg](https://commons.wikimedia.org/wiki/File:Small_blue_notepad_-_8_x_11_cm_-_D.jpg) |
| commons-document-03.jpg | document | CC0 | 2026-10-10 | [Pen-writing-notes-studying.jpg](https://commons.wikimedia.org/wiki/File:Pen-writing-notes-studying.jpg) |
| commons-document-04.jpg | document | CC0 | 2026-10-10 | [Coffee-desk-laptop-notebook (24244320481).jpg](https://commons.wikimedia.org/wiki/File:Coffee-desk-laptop-notebook_(24244320481).jpg) |
| commons-document-05.jpg | document | CC0 | 2026-10-10 | [Desk-laptop-notebook-pen (23958719819).jpg](https://commons.wikimedia.org/wiki/File:Desk-laptop-notebook-pen_(23958719819).jpg) |
| commons-document-06.jpg | document | CC0 | 2026-10-10 | [Camera keys notebook coffee (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Camera_keys_notebook_coffee_(Unsplash).jpg) |
| commons-document-07.jpg | document | CC0 | 2026-10-10 | [White office space (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:White_office_space_(Unsplash).jpg) |
| commons-document-08.jpg | document | CC0 | 2026-10-10 | [Books, pencils, laptop, and iphone on a desk (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Books,_pencils,_laptop,_and_iphone_on_a_desk_(Unsplash).jpg) |
| commons-document-09.jpg | document | CC0 | 2026-10-10 | [AOC Office Exterior.jpg](https://commons.wikimedia.org/wiki/File:AOC_Office_Exterior.jpg) |
| commons-document-10.jpg | document | CC0 | 2026-10-10 | [Book-book-pages-burned-pages (23697760124).jpg](https://commons.wikimedia.org/wiki/File:Book-book-pages-burned-pages_(23697760124).jpg) |
| commons-document-11.jpg | document | PD | 2026-10-10 | [VAZ-21213 purchase receipt in Russian, 1999.jpg](https://commons.wikimedia.org/wiki/File:VAZ-21213_purchase_receipt_in_Russian,_1999.jpg) |
| commons-document-12.jpg | document | CC0 | 2026-10-10 | [Man writing on paper (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Man_writing_on_paper_(Unsplash).jpg) |
| commons-document-13.jpg | document | CC0 | 2026-10-10 | [Video editing color keyboard with Yamaha AW4416 Recording Workstation (2014-03-01 by Ben2742) pixabay - 660070.jpg](https://commons.wikimedia.org/wiki/File:Video_editing_color_keyboard_with_Yamaha_AW4416_Recording_Workstation_(2014-03-01_by_Ben2742)_pixabay_-_660070.jpg) |
| commons-document-14.jpg | document | CC0 | 2026-10-10 | [Japanese Desk (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Japanese_Desk_(Unsplash).jpg) |
| commons-document-15.jpg | document | CC0 | 2026-10-10 | [North expense magazine.jpg](https://commons.wikimedia.org/wiki/File:North_expense_magazine.jpg) |
| commons-document-16.jpg | document | CC0 | 2026-10-10 | [A journal writing book.jpg](https://commons.wikimedia.org/wiki/File:A_journal_writing_book.jpg) |
| commons-document-17.jpg | document | CC0 | 2026-10-10 | [Sticky notes at Hong Kong Strategy Salon.jpg](https://commons.wikimedia.org/wiki/File:Sticky_notes_at_Hong_Kong_Strategy_Salon.jpg) |
| commons-document-18.jpg | document | CC0 | 2026-10-10 | [Ruler and laptop on a desk (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Ruler_and_laptop_on_a_desk_(Unsplash).jpg) |
| commons-document-19.jpg | document | CC0 | 2026-10-10 | [Example of limited edition book with marking.jpg](https://commons.wikimedia.org/wiki/File:Example_of_limited_edition_book_with_marking.jpg) |
| commons-document-20.jpg | document | CC0 | 2026-10-10 | [Ostracon with a Demotic payment receipt written by Esmin, son of Harkhonsu, baked clay - Museo Egizio Turin S 12661 B p01.jpg](https://commons.wikimedia.org/wiki/File:Ostracon_with_a_Demotic_payment_receipt_written_by_Esmin,_son_of_Harkhonsu,_baked_clay_-_Museo_Egizio_Turin_S_12661_B_p01.jpg) |
| commons-document-21.jpg | document | CC0 | 2026-10-10 | [Scattered white paper (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Scattered_white_paper_(Unsplash).jpg) |
| commons-document-22.jpg | document | CC0 | 2026-10-10 | [Hands-woman-apple-desk.jpg](https://commons.wikimedia.org/wiki/File:Hands-woman-apple-desk.jpg) |
| commons-document-23.jpg | document | CC0 | 2026-10-10 | [LOOM office workspaces.jpg](https://commons.wikimedia.org/wiki/File:LOOM_office_workspaces.jpg) |
| commons-document-24.jpg | document | CC0 | 2026-10-10 | [South expense magazine.jpg](https://commons.wikimedia.org/wiki/File:South_expense_magazine.jpg) |
| commons-document-25.jpg | document | CC0 | 2026-10-10 | [Woman writing on a notebook with a pen.jpg](https://commons.wikimedia.org/wiki/File:Woman_writing_on_a_notebook_with_a_pen.jpg) |
| commons-document-26.jpg | document | CC0 | 2026-10-10 | [Laptop on a neat desk (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Laptop_on_a_neat_desk_(Unsplash).jpg) |
| commons-document-27.jpg | document | CC0 | 2026-10-10 | [Book of Knowledge 1919 Vol 1 Page 110.jpg](https://commons.wikimedia.org/wiki/File:Book_of_Knowledge_1919_Vol_1_Page_110.jpg) |
| commons-document-28.jpg | document | CC0 | 2026-10-10 | [Ostracon with a Demotic payment receipt, baked clay - Museo Egizio, Turin S 12701 B p01.jpg](https://commons.wikimedia.org/wiki/File:Ostracon_with_a_Demotic_payment_receipt,_baked_clay_-_Museo_Egizio,_Turin_S_12701_B_p01.jpg) |
| commons-document-29.jpg | document | CC0 | 2026-10-10 | [Ernest A. Towers, Jr., Pen and ink on paper, c. 1936, NGA 22525.jpg](https://commons.wikimedia.org/wiki/File:Ernest_A._Towers,_Jr.,_Pen_and_ink_on_paper,_c._1936,_NGA_22525.jpg) |
| commons-document-30.jpg | document | CC0 | 2026-10-10 | [Desk Setup (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Desk_Setup_(Unsplash).jpg) |
| commons-street-01.jpg | street | CC0 | 2026-10-10 | [Unmarked pedestrian crossing 2.jpg](https://commons.wikimedia.org/wiki/File:Unmarked_pedestrian_crossing_2.jpg) |
| commons-street-02.jpg | street | CC0 | 2026-10-10 | [Crosswalk in Sonoma - March 2025 - Sarah Stierch.jpg](https://commons.wikimedia.org/wiki/File:Crosswalk_in_Sonoma_-_March_2025_-_Sarah_Stierch.jpg) |
| commons-street-03.jpg | street | CC0 | 2026-10-10 | [Pedestrian crossings in Stockton Lane York Jun26.jpg](https://commons.wikimedia.org/wiki/File:Pedestrian_crossings_in_Stockton_Lane_York_Jun26.jpg) |
| commons-street-04.jpg | street | CC0 | 2026-10-10 | [Masonic Home Road crosswalk at Meadowview Drive, Charlton MA 2026-08-01.jpg](https://commons.wikimedia.org/wiki/File:Masonic_Home_Road_crosswalk_at_Meadowview_Drive,_Charlton_MA_2026-08-01.jpg) |
| commons-street-05.jpg | street | CC0 | 2026-10-10 | [Teakle Alley Baltimore.jpg](https://commons.wikimedia.org/wiki/File:Teakle_Alley_Baltimore.jpg) |
| commons-street-06.jpg | street | CC0 | 2026-10-10 | [Public transport share taxi in Maracaibo city, Zulia, Venezuela.jpg](https://commons.wikimedia.org/wiki/File:Public_transport_share_taxi_in_Maracaibo_city,_Zulia,_Venezuela.jpg) |
| commons-street-07.jpg | street | CC0 | 2026-10-10 | [Pedestrian crossing at the intersection of Mazowiecka - Jałowcowa streets in Tomaszów Mazowiecki, Poland.jpg](https://commons.wikimedia.org/wiki/File:Pedestrian_crossing_at_the_intersection_of_Mazowiecka_-_Ja%C5%82owcowa_streets_in_Tomasz%C3%B3w_Mazowiecki,_Poland.jpg) |
| commons-street-08.jpg | street | CC0 | 2026-10-10 | [20200925-dutch-alley-2010s.jpg](https://commons.wikimedia.org/wiki/File:20200925-dutch-alley-2010s.jpg) |
| commons-street-09.jpg | street | CC0 | 2026-10-10 | [Bangkok traffic. (8098425276).jpg](https://commons.wikimedia.org/wiki/File:Bangkok_traffic._(8098425276).jpg) |
| commons-street-10.jpg | street | CC0 | 2026-10-10 | [Typical colonial house from downtown Maracaibo.jpg](https://commons.wikimedia.org/wiki/File:Typical_colonial_house_from_downtown_Maracaibo.jpg) |
| commons-street-11.jpg | street | CC0 | 2026-10-10 | [Minamiboso City Bus stop at Tomiura Station.jpg](https://commons.wikimedia.org/wiki/File:Minamiboso_City_Bus_stop_at_Tomiura_Station.jpg) |
| commons-street-12.jpg | street | CC0 | 2026-10-10 | [Teufelsseechaussee.jpg](https://commons.wikimedia.org/wiki/File:Teufelsseechaussee.jpg) |
| commons-street-13.jpg | street | CC0 | 2026-10-10 | [Sidewalk of Shariati ave 2. - Nishapur.jpg](https://commons.wikimedia.org/wiki/File:Sidewalk_of_Shariati_ave_2._-_Nishapur.jpg) |
| commons-street-14.jpg | street | CC0 | 2026-10-10 | [Upper Gardner Street Saturday Market Oct 2022.jpg](https://commons.wikimedia.org/wiki/File:Upper_Gardner_Street_Saturday_Market_Oct_2022.jpg) |
| commons-street-15.jpg | street | CC0 | 2026-10-10 | [Dmitry Ratushny 2015-07-08 (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Dmitry_Ratushny_2015-07-08_(Unsplash).jpg) |
| commons-street-16.jpg | street | CC0 | 2026-10-10 | [Crowded Asian intersection (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Crowded_Asian_intersection_(Unsplash).jpg) |
| commons-street-17.jpg | street | CC0 | 2026-10-10 | [Moscow, Shabolovka Street tram parade April 2025 (3).jpg](https://commons.wikimedia.org/wiki/File:Moscow,_Shabolovka_Street_tram_parade_April_2025_(3).jpg) |
| commons-street-18.jpg | street | CC0 | 2026-10-10 | [Shopfront of HISBE, Brighton.jpg](https://commons.wikimedia.org/wiki/File:Shopfront_of_HISBE,_Brighton.jpg) |
| commons-street-19.jpg | street | CC0 | 2026-10-10 | [Bike parking at 19th Street Oakland (2), March 2012.jpg](https://commons.wikimedia.org/wiki/File:Bike_parking_at_19th_Street_Oakland_(2),_March_2012.jpg) |
| commons-street-20.jpg | street | CC0 | 2026-10-10 | [Snowy Sainte-Famille Street in Quebec City.jpg](https://commons.wikimedia.org/wiki/File:Snowy_Sainte-Famille_Street_in_Quebec_City.jpg) |
| commons-street-21.jpg | street | CC0 | 2026-10-10 | [An Australian pedestrian crossing button.jpg](https://commons.wikimedia.org/wiki/File:An_Australian_pedestrian_crossing_button.jpg) |
| commons-street-22.jpg | street | CC0 | 2026-10-10 | [20200925-dutch-alley-1930s.jpg](https://commons.wikimedia.org/wiki/File:20200925-dutch-alley-1930s.jpg) |
| commons-street-23.jpg | street | CC0 | 2026-10-10 | [Moscow, Bolshaya Polyanka Street, evening northbound traffic (199741007).jpg](https://commons.wikimedia.org/wiki/File:Moscow,_Bolshaya_Polyanka_Street,_evening_northbound_traffic_(199741007).jpg) |
| commons-street-24.jpg | street | CC0 | 2026-10-10 | [Mill Street downtown Hardwick VT March 2013.jpg](https://commons.wikimedia.org/wiki/File:Mill_Street_downtown_Hardwick_VT_March_2013.jpg) |
| commons-street-25.jpg | street | CC0 | 2026-10-10 | [Bus stop Lukasova, Prague, The Czech republic.jpg](https://commons.wikimedia.org/wiki/File:Bus_stop_Lukasova,_Prague,_The_Czech_republic.jpg) |
| commons-street-26.jpg | street | CC0 | 2026-10-10 | [Fahrradstrasse-1.jpg](https://commons.wikimedia.org/wiki/File:Fahrradstrasse-1.jpg) |
| commons-street-27.jpg | street | CC0 | 2026-10-10 | [Stone sidewalk, Brattle Street - Cambridge, MA.jpg](https://commons.wikimedia.org/wiki/File:Stone_sidewalk,_Brattle_Street_-_Cambridge,_MA.jpg) |
| commons-street-28.jpg | street | CC0 | 2026-10-10 | [Traffic light red and yellow Drammen (3).jpg](https://commons.wikimedia.org/wiki/File:Traffic_light_red_and_yellow_Drammen_(3).jpg) |
| commons-street-29.jpg | street | CC0 | 2026-10-10 | [2159Elpidio Quirino Avenue Airport Road Intersection 03.jpg](https://commons.wikimedia.org/wiki/File:2159Elpidio_Quirino_Avenue_Airport_Road_Intersection_03.jpg) |
| commons-street-30.jpg | street | CC0 | 2026-10-10 | [Moscow, Shabolovka Street tram parade April 2025 (9).jpg](https://commons.wikimedia.org/wiki/File:Moscow,_Shabolovka_Street_tram_parade_April_2025_(9).jpg) |
| commons-people-01.jpg | people | CC0 | 2026-10-10 | [People walking in Maracaibo center.jpg](https://commons.wikimedia.org/wiki/File:People_walking_in_Maracaibo_center.jpg) |
| commons-people-02.jpg | people | CC0 | 2026-10-10 | [People walking in Toronto, May 2018.jpg](https://commons.wikimedia.org/wiki/File:People_walking_in_Toronto,_May_2018.jpg) |
| commons-people-03.jpg | people | CC0 | 2026-10-10 | [People, walking to the exposition halls of RAI, Amsterdam.jpg](https://commons.wikimedia.org/wiki/File:People,_walking_to_the_exposition_halls_of_RAI,_Amsterdam.jpg) |
| commons-people-04.jpg | people | CC0 | 2026-10-10 | [Throngs of people walking towards Himeji Castle, Himeji, 2016.jpg](https://commons.wikimedia.org/wiki/File:Throngs_of_people_walking_towards_Himeji_Castle,_Himeji,_2016.jpg) |
| commons-people-05.jpg | people | CC0 | 2026-10-10 | [Silhouette of people walking towards the iconic Tower.jpg](https://commons.wikimedia.org/wiki/File:Silhouette_of_people_walking_towards_the_iconic_Tower.jpg) |
| commons-people-06.jpg | people | CC0 | 2026-10-10 | [Street view in the quite Utrechtsestraat with people walking & talking; free photo Amsterdam, Fons Heijnsbroek 12-10-2021.jpg](https://commons.wikimedia.org/wiki/File:Street_view_in_the_quite_Utrechtsestraat_with_people_walking_%26_talking;_free_photo_Amsterdam,_Fons_Heijnsbroek_12-10-2021.jpg) |
| commons-people-07.jpg | people | CC0 | 2026-10-10 | [A crowded scene in Esplanade line 2 metro station platform.jpg](https://commons.wikimedia.org/wiki/File:A_crowded_scene_in_Esplanade_line_2_metro_station_platform.jpg) |
| commons-people-08.jpg | people | CC0 | 2026-10-10 | [People crossing the crosswalk in a city center (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:People_crossing_the_crosswalk_in_a_city_center_(Unsplash).jpg) |
| commons-people-09.jpg | people | CC0 | 2026-10-10 | [SILHOUETTE SKY (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:SILHOUETTE_SKY_(Unsplash).jpg) |
| commons-people-10.jpg | people | CC0 | 2026-10-10 | [Market Kenya.jpg](https://commons.wikimedia.org/wiki/File:Market_Kenya.jpg) |
| commons-people-11.jpg | people | CC0 | 2026-10-10 | [People in park 001.jpg](https://commons.wikimedia.org/wiki/File:People_in_park_001.jpg) |
| commons-people-12.jpg | people | CC0 | 2026-10-10 | [Tourists walking through a village street in Ben Tre.JPG](https://commons.wikimedia.org/wiki/File:Tourists_walking_through_a_village_street_in_Ben_Tre.JPG) |
| commons-people-13.jpg | people | CC0 | 2026-10-10 | [Beach-holiday-vacation-people (24243831561).jpg](https://commons.wikimedia.org/wiki/File:Beach-holiday-vacation-people_(24243831561).jpg) |
| commons-people-14.jpg | people | CC0 | 2026-10-10 | [Festival Para el Buen Vivir (23944584103).jpg](https://commons.wikimedia.org/wiki/File:Festival_Para_el_Buen_Vivir_(23944584103).jpg) |
| commons-people-15.jpg | people | CC0 | 2026-10-10 | [People in MRT Ximen Station 20160610.jpg](https://commons.wikimedia.org/wiki/File:People_in_MRT_Ximen_Station_20160610.jpg) |
| commons-people-16.jpg | people | CC0 | 2026-10-10 | [Queue of Buying Mantou in Ziqiang Community Center, Songshan District, Taipei 20160307b.JPG](https://commons.wikimedia.org/wiki/File:Queue_of_Buying_Mantou_in_Ziqiang_Community_Center,_Songshan_District,_Taipei_20160307b.JPG) |
| commons-people-17.jpg | people | CC0 | 2026-10-10 | [People of São Paulo Center.jpg](https://commons.wikimedia.org/wiki/File:People_of_S%C3%A3o_Paulo_Center.jpg) |
| commons-people-18.jpg | people | CC0 | 2026-10-10 | [1021Men walking with bicycles.jpg](https://commons.wikimedia.org/wiki/File:1021Men_walking_with_bicycles.jpg) |
| commons-people-19.jpg | people | CC0 | 2026-10-10 | [Pedestrians Walking (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Pedestrians_Walking_(Unsplash).jpg) |
| commons-people-20.jpg | people | CC0 | 2026-10-10 | [Orange sunrise and mountain silhouette (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Orange_sunrise_and_mountain_silhouette_(Unsplash).jpg) |
| commons-people-21.jpg | people | CC0 | 2026-10-10 | [Market In Africa.jpg](https://commons.wikimedia.org/wiki/File:Market_In_Africa.jpg) |
| commons-people-22.jpg | people | CC0 | 2026-10-10 | [Tagaytay People's Park in the Sky road 2Nov2025 02.jpg](https://commons.wikimedia.org/wiki/File:Tagaytay_People%27s_Park_in_the_Sky_road_2Nov2025_02.jpg) |
| commons-people-23.jpg | people | CC0 | 2026-10-10 | [Tourists Walking across Songshou Road, Xinyi District, Taipei 20150216.jpg](https://commons.wikimedia.org/wiki/File:Tourists_Walking_across_Songshou_Road,_Xinyi_District,_Taipei_20150216.jpg) |
| commons-people-24.jpg | people | CC0 | 2026-10-10 | [People at Bondi Beach, Sydney, Australia.jpg](https://commons.wikimedia.org/wiki/File:People_at_Bondi_Beach,_Sydney,_Australia.jpg) |
| commons-people-25.jpg | people | CC0 | 2026-10-10 | [Looking into festival crowd (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Looking_into_festival_crowd_(Unsplash).jpg) |
| commons-people-26.jpg | people | CC0 | 2026-10-10 | [People waiting for the train (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:People_waiting_for_the_train_(Unsplash).jpg) |
| commons-people-27.jpg | people | CC0 | 2026-10-10 | [Queue of Visitors waiting Shuttle Buses to Gangshan Air Force Base 20170812a.jpg](https://commons.wikimedia.org/wiki/File:Queue_of_Visitors_waiting_Shuttle_Buses_to_Gangshan_Air_Force_Base_20170812a.jpg) |
| commons-people-28.jpg | people | CC0 | 2026-10-10 | [Recife Favela Detran street.jpg](https://commons.wikimedia.org/wiki/File:Recife_Favela_Detran_street.jpg) |
| commons-people-29.jpg | people | CC0 | 2026-10-10 | [People, walking over the famous bridge De Blauwbrug over the Amstel river; free photo Amsterdam by Fons Heijnsbroek, 12-10-2021.jpg](https://commons.wikimedia.org/wiki/File:People,_walking_over_the_famous_bridge_De_Blauwbrug_over_the_Amstel_river;_free_photo_Amsterdam_by_Fons_Heijnsbroek,_12-10-2021.jpg) |
| commons-people-30.jpg | people | CC0 | 2026-10-10 | [7740Kapampangan pedestrians crossing roads or streets 48.jpg](https://commons.wikimedia.org/wiki/File:7740Kapampangan_pedestrians_crossing_roads_or_streets_48.jpg) |
| commons-landscape-01.jpg | landscape | CC0 | 2026-10-10 | [Clouds mirrored in a mountain lake (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Clouds_mirrored_in_a_mountain_lake_(Unsplash).jpg) |
| commons-landscape-02.jpg | landscape | CC0 | 2026-10-10 | [Mountain lake dam.jpg](https://commons.wikimedia.org/wiki/File:Mountain_lake_dam.jpg) |
| commons-landscape-03.jpg | landscape | CC0 | 2026-10-10 | [Lake Mountain Landscape.jpg](https://commons.wikimedia.org/wiki/File:Lake_Mountain_Landscape.jpg) |
| commons-landscape-04.jpg | landscape | CC0 | 2026-10-10 | [Bierstadt Lake Trail, Rocky Mountain National Park, 2009.jpg](https://commons.wikimedia.org/wiki/File:Bierstadt_Lake_Trail,_Rocky_Mountain_National_Park,_2009.jpg) |
| commons-landscape-05.jpg | landscape | CC0 | 2026-10-10 | [A photo of evening sunset over the grass fields in Laaghalerveen; Drenthe, 2012.jpg](https://commons.wikimedia.org/wiki/File:A_photo_of_evening_sunset_over_the_grass_fields_in_Laaghalerveen;_Drenthe,_2012.jpg) |
| commons-landscape-06.jpg | landscape | CC0 | 2026-10-10 | [Mountain Lake at Night (30608832416).jpg](https://commons.wikimedia.org/wiki/File:Mountain_Lake_at_Night_(30608832416).jpg) |
| commons-landscape-07.jpg | landscape | CC0 | 2026-10-10 | [North-Saskatchewan-River-Valley-Edmonton-Alberta-Canada-01A.jpg](https://commons.wikimedia.org/wiki/File:North-Saskatchewan-River-Valley-Edmonton-Alberta-Canada-01A.jpg) |
| commons-landscape-08.jpg | landscape | CC0 | 2026-10-10 | [Matterhorn sunset 2016 (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Matterhorn_sunset_2016_(Unsplash).jpg) |
| commons-landscape-09.jpg | landscape | CC0 | 2026-10-10 | [Black Forest Trail (Revisited) (10) (21013184359).jpg](https://commons.wikimedia.org/wiki/File:Black_Forest_Trail_(Revisited)_(10)_(21013184359).jpg) |
| commons-landscape-10.jpg | landscape | CC0 | 2026-10-10 | [Shore west beach waves.jpg](https://commons.wikimedia.org/wiki/File:Shore_west_beach_waves.jpg) |
| commons-landscape-11.jpg | landscape | CC0 | 2026-10-10 | [Painted Hills Oregon Landscape 1 May 2018.jpg](https://commons.wikimedia.org/wiki/File:Painted_Hills_Oregon_Landscape_1_May_2018.jpg) |
| commons-landscape-12.jpg | landscape | CC0 | 2026-10-10 | [Meadow in Niederfinow 2021-07-17 02.jpg](https://commons.wikimedia.org/wiki/File:Meadow_in_Niederfinow_2021-07-17_02.jpg) |
| commons-landscape-13.jpg | landscape | CC0 | 2026-10-10 | [Peaceful waterfall (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Peaceful_waterfall_(Unsplash).jpg) |
| commons-landscape-14.jpg | landscape | CC0 | 2026-10-10 | [Promontoire rocheux Calahonda.jpg](https://commons.wikimedia.org/wiki/File:Promontoire_rocheux_Calahonda.jpg) |
| commons-landscape-15.jpg | landscape | CC0 | 2026-10-10 | [Park Pond beside Yuchen Swimming Pool 20140817a.jpg](https://commons.wikimedia.org/wiki/File:Park_Pond_beside_Yuchen_Swimming_Pool_20140817a.jpg) |
| commons-landscape-16.jpg | landscape | CC0 | 2026-10-10 | [Springer Mountain and Black Mountain covered in snow (24268378939).jpg](https://commons.wikimedia.org/wiki/File:Springer_Mountain_and_Black_Mountain_covered_in_snow_(24268378939).jpg) |
| commons-landscape-17.jpg | landscape | CC0 | 2026-10-10 | [View from countryside road near Banfora 29.jpg](https://commons.wikimedia.org/wiki/File:View_from_countryside_road_near_Banfora_29.jpg) |
| commons-landscape-18.jpg | landscape | CC0 | 2026-10-10 | [Autumn forest floor (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Autumn_forest_floor_(Unsplash).jpg) |
| commons-landscape-19.jpg | landscape | CC0 | 2026-10-10 | [Lake Reflection Landscape.jpg](https://commons.wikimedia.org/wiki/File:Lake_Reflection_Landscape.jpg) |
| commons-landscape-20.jpg | landscape | CC0 | 2026-10-10 | [Mountain Lake at Night (30557164961).jpg](https://commons.wikimedia.org/wiki/File:Mountain_Lake_at_Night_(30557164961).jpg) |
| commons-landscape-21.jpg | landscape | CC0 | 2026-10-10 | [Santa-Clara-River-Valley-with-Piru-Aerial-from-west-August-2014 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Santa-Clara-River-Valley-with-Piru-Aerial-from-west-August-2014_(cropped).jpg) |
| commons-landscape-22.jpg | landscape | CC0 | 2026-10-10 | [Sunset field (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Sunset_field_(Unsplash).jpg) |
| commons-landscape-23.jpg | landscape | CC0 | 2026-10-10 | [Black Forest Trail (Revisited) (17) (21012951939).jpg](https://commons.wikimedia.org/wiki/File:Black_Forest_Trail_(Revisited)_(17)_(21012951939).jpg) |
| commons-landscape-24.jpg | landscape | CC0 | 2026-10-10 | [Shore 4.jpg](https://commons.wikimedia.org/wiki/File:Shore_4.jpg) |
| commons-landscape-25.jpg | landscape | CC0 | 2026-10-10 | [Painted Hills Oregon Landscape 3 May 2018.jpg](https://commons.wikimedia.org/wiki/File:Painted_Hills_Oregon_Landscape_3_May_2018.jpg) |
| commons-landscape-26.jpg | landscape | CC0 | 2026-10-10 | [Meadow in Niederfinow 2021-07-17 03.jpg](https://commons.wikimedia.org/wiki/File:Meadow_in_Niederfinow_2021-07-17_03.jpg) |
| commons-landscape-27.jpg | landscape | CC0 | 2026-10-10 | [Waterfall on a green cliff (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Waterfall_on_a_green_cliff_(Unsplash).jpg) |
| commons-landscape-28.jpg | landscape | CC0 | 2026-10-10 | [Drift till marl flint outcrop Baltic Sea coast, germany.JPG](https://commons.wikimedia.org/wiki/File:Drift_till_marl_flint_outcrop_Baltic_Sea_coast,_germany.JPG) |
| commons-landscape-29.jpg | landscape | CC0 | 2026-10-10 | [Lower Pond, Ashtead Park (June 2021).jpg](https://commons.wikimedia.org/wiki/File:Lower_Pond,_Ashtead_Park_(June_2021).jpg) |
| commons-landscape-30.jpg | landscape | CC0 | 2026-10-10 | [Pine Log Mountain and Bear Mountain covered in snow (24268311899).jpg](https://commons.wikimedia.org/wiki/File:Pine_Log_Mountain_and_Bear_Mountain_covered_in_snow_(24268311899).jpg) |
| commons-night-01.jpg | night | CC0 | 2026-10-10 | [Széchenyi Chain Bridge in Budapest at night.jpg](https://commons.wikimedia.org/wiki/File:Sz%C3%A9chenyi_Chain_Bridge_in_Budapest_at_night.jpg) |
| commons-night-02.jpg | night | CC0 | 2026-10-10 | [Price Building illuminated at night in Quebec City.jpg](https://commons.wikimedia.org/wiki/File:Price_Building_illuminated_at_night_in_Quebec_City.jpg) |
| commons-night-03.jpg | night | CC0 | 2026-10-10 | [Avenue Cartier illuminated at night in Quebec City.jpg](https://commons.wikimedia.org/wiki/File:Avenue_Cartier_illuminated_at_night_in_Quebec_City.jpg) |
| commons-night-04.jpg | night | CC0 | 2026-10-10 | [City-lights-night-street (24326520255).jpg](https://commons.wikimedia.org/wiki/File:City-lights-night-street_(24326520255).jpg) |
| commons-night-05.jpg | night | CC0 | 2026-10-10 | [Street lights on a busy night in Midtown (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Street_lights_on_a_busy_night_in_Midtown_(Unsplash).jpg) |
| commons-night-06.jpg | night | CC0 | 2026-10-10 | [Place Royale and Notre-Dame-des-Victoires at night.jpg](https://commons.wikimedia.org/wiki/File:Place_Royale_and_Notre-Dame-des-Victoires_at_night.jpg) |
| commons-night-07.jpg | night | CC0 | 2026-10-10 | [Houses-lights-night-street (24326901915).jpg](https://commons.wikimedia.org/wiki/File:Houses-lights-night-street_(24326901915).jpg) |
| commons-night-08.jpg | night | CC0 | 2026-10-10 | [Hong Kong skyscrapers in a night of typhoon.jpg](https://commons.wikimedia.org/wiki/File:Hong_Kong_skyscrapers_in_a_night_of_typhoon.jpg) |
| commons-night-09.jpg | night | CC0 | 2026-10-10 | [Christmas lights over Viru street.JPG](https://commons.wikimedia.org/wiki/File:Christmas_lights_over_Viru_street.JPG) |
| commons-night-10.jpg | night | CC0 | 2026-10-10 | [Pont de Bir-Hakeim at night, Paris 3 February 2019.jpg](https://commons.wikimedia.org/wiki/File:Pont_de_Bir-Hakeim_at_night,_Paris_3_February_2019.jpg) |
| commons-night-11.jpg | night | CC0 | 2026-10-10 | [Bandar Seri Begawan Night Market 1.jpg](https://commons.wikimedia.org/wiki/File:Bandar_Seri_Begawan_Night_Market_1.jpg) |
| commons-night-12.jpg | night | CC0 | 2026-10-10 | [Guangfu North Road in Night 20141218a.jpg](https://commons.wikimedia.org/wiki/File:Guangfu_North_Road_in_Night_20141218a.jpg) |
| commons-night-13.jpg | night | CC0 | 2026-10-10 | [Saint Nicolas Fort Rhodes Harbour night.jpg](https://commons.wikimedia.org/wiki/File:Saint_Nicolas_Fort_Rhodes_Harbour_night.jpg) |
| commons-night-14.jpg | night | CC0 | 2026-10-10 | [Keelung Harbor Building in Night 20140107.jpg](https://commons.wikimedia.org/wiki/File:Keelung_Harbor_Building_in_Night_20140107.jpg) |
| commons-night-15.jpg | night | CC0 | 2026-10-10 | [SZ 深圳 Shenzhen 羅湖 Luohu 解放路 Jiefang Road night May 2024 R12S 16 Guiyuan Road.jpg](https://commons.wikimedia.org/wiki/File:SZ_%E6%B7%B1%E5%9C%B3_Shenzhen_%E7%BE%85%E6%B9%96_Luohu_%E8%A7%A3%E6%94%BE%E8%B7%AF_Jiefang_Road_night_May_2024_R12S_16_Guiyuan_Road.jpg) |
| commons-night-16.jpg | night | CC0 | 2026-10-10 | [Neon signs in Dotonbori (night).JPG](https://commons.wikimedia.org/wiki/File:Neon_signs_in_Dotonbori_(night).JPG) |
| commons-night-17.jpg | night | CC0 | 2026-10-10 | [Northern lights over a lake (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:Northern_lights_over_a_lake_(Unsplash).jpg) |
| commons-night-18.jpg | night | CC0 | 2026-10-10 | [Chateau Frontenac illuminated at night in Quebec City.jpg](https://commons.wikimedia.org/wiki/File:Chateau_Frontenac_illuminated_at_night_in_Quebec_City.jpg) |
| commons-night-19.jpg | night | CC0 | 2026-10-10 | [Street Lights Kingston Bridge.jpg](https://commons.wikimedia.org/wiki/File:Street_Lights_Kingston_Bridge.jpg) |
| commons-night-20.jpg | night | CC0 | 2026-10-10 | [Night skyline - Vancouver, Canada - DSC00071.JPG](https://commons.wikimedia.org/wiki/File:Night_skyline_-_Vancouver,_Canada_-_DSC00071.JPG) |
| commons-night-21.jpg | night | CC0 | 2026-10-10 | [Amazing Evening Lights (196850975).jpeg](https://commons.wikimedia.org/wiki/File:Amazing_Evening_Lights_(196850975).jpeg) |
| commons-night-22.jpg | night | CC0 | 2026-10-10 | [Kurilpa Bridge at Night 01.jpg](https://commons.wikimedia.org/wiki/File:Kurilpa_Bridge_at_Night_01.jpg) |
| commons-night-23.jpg | night | CC0 | 2026-10-10 | [Bandar Seri Begawan Night Market 2.jpg](https://commons.wikimedia.org/wiki/File:Bandar_Seri_Begawan_Night_Market_2.jpg) |
| commons-night-24.jpg | night | CC0 | 2026-10-10 | [City-traffic-people-night (24326935655).jpg](https://commons.wikimedia.org/wiki/File:City-traffic-people-night_(24326935655).jpg) |
| commons-night-25.jpg | night | CC0 | 2026-10-10 | [Koules night 4423.JPG](https://commons.wikimedia.org/wiki/File:Koules_night_4423.JPG) |
| commons-night-26.jpg | night | CC0 | 2026-10-10 | [Norra Grundsund harbor at night.jpg](https://commons.wikimedia.org/wiki/File:Norra_Grundsund_harbor_at_night.jpg) |
| commons-night-27.jpg | night | CC0 | 2026-10-10 | [SZ 深圳 Shenzhen 羅湖 Luohu 解放路 Jiefang Road night May 2024 R12S 17 Guiyuan Road.jpg](https://commons.wikimedia.org/wiki/File:SZ_%E6%B7%B1%E5%9C%B3_Shenzhen_%E7%BE%85%E6%B9%96_Luohu_%E8%A7%A3%E6%94%BE%E8%B7%AF_Jiefang_Road_night_May_2024_R12S_17_Guiyuan_Road.jpg) |
| commons-night-28.jpg | night | CC0 | 2026-10-10 | [Neon signs in Dotonbori at night,16th August 2014 (2).JPG](https://commons.wikimedia.org/wiki/File:Neon_signs_in_Dotonbori_at_night,16th_August_2014_(2).JPG) |
| commons-night-29.jpg | night | CC0 | 2026-10-10 | [San Bruno Mountains at Night (Unsplash).jpg](https://commons.wikimedia.org/wiki/File:San_Bruno_Mountains_at_Night_(Unsplash).jpg) |
| commons-night-30.jpg | night | CC0 | 2026-10-10 | [Customs building at night, Quebec city, Canada.jpg](https://commons.wikimedia.org/wiki/File:Customs_building_at_night,_Quebec_city,_Canada.jpg) |
