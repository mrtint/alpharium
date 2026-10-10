# Data Model: e2e 표본 (070)

## 군집 `Cluster`
| 필드 | 설명 |
| --- | --- |
| `name` | `home`·`work`·`cafe`·`weekend` (사람이 못 박은 상수) |
| `center` | `{ latitude, longitude }` — 한국 안 공공장소 근처의 상수(실제 사는 곳 아님) |
| `jitterMeters` | 방문 안 흔들림 상한 (≤ 40, 100m 규칙 안) |

불변식: 군집 사이 거리 ≥ 1000m, `jitterMeters` ≤ 40.

## 상황 `Situation` (이름만 정함, 날이 고른다)
`zero`·`single`·`few-home`·`commute`·`full-day-over-limit`·`night-only`·`noon-only`·`no-gps`·`clutter`·`weekend`·`walking`·`screenshots-only` — 각각 사진 슬롯 목록을 가진다.

## 사진 슬롯 `PhotoSlot` (표의 한 줄)
| 필드 | 설명 |
| --- | --- |
| `time` | `HH:MM` (그날 로컬, 00:00~23:59 안) |
| `folder` | `Camera` \| `Screenshots` \| `Download` |
| `tag` | 사진 목록의 태그(`indoor`·`food`·`document`·`street`·`people`·`landscape`·`night`·`screenshot`) |
| `place` | 군집 이름 또는 `null`(좌표 없음), 선택적으로 `offsetMeters`(걸어 다닌 날) |

## 날 `SampleDay`
`offset`(1~30), `situation`, `slots[]`, `visits`(군집 이름의 순서 — 연속 중복 제거 전/후 모두 표에 적힘), `expect.photos`(수), `expect.places`(수), `probe?`(대표 날이면 true).

불변식:
- 날 수 정확히 30, 오프셋 1~30 각 한 번.
- 전체 슬롯 합 ≤ 150, 대략 120.
- 각 날 `expect.photos` = 슬롯 수, `expect.places` = `visits`의 연속 중복 제거 길이(사진이 좌표 있는 슬롯이 없으면 0).
- `probe` 날은 정확히 8, 서로 다른 situation 일곱 이상, 오프셋 ≥ 3. `P_BACK`은 `probeEnv`가 `now`로 계산한다(0~2).
- 슬롯 시각은 그날 안(00:00~23:59), 시각순 정렬.

## 사진 목록 항목 `CatalogPhoto`
`file`, `url`, `sha256`, `license`(허용: `CC0`, `PD`), `sourcePage`, `checkedOn`(YYYY-MM-DD), `tags[]`, `widthPx`.
불변식: 모든 항목이 허용 라이선스, URL이 `https://upload.wikimedia.org/`로 시작, `sha256` 64 hex, 상황 태그 일곱을 모두 덮는다.

## 심을 항목 `SeedItem` (plan.ts 출력)
`day`(YYYY-MM-DD), `deviceName`(`s30-<offset 2자리>-<번호 2자리>.jpg`), `folder`, `takenAt`(Date), `coordinate | null`, `catalogFile`.

## 지문 `fingerprint`
`sha256(JSON.stringify(정렬된 SeedItem 목록의 (offset, deviceName, folder, takenAt 분 단위, 좌표 소수 6자리, catalogFile, catalog sha256)))`의 앞 16 hex. 표나 사진 목록을 고치면 달라진다. 오늘 날짜(기준일)는 지문에 넣지 않는다 — `anchor`가 따로 본다.

## 표식 `Marker` (기기 `PocketlogSeed/s30-marker.txt`)
```
anchor=2026-10-10
fingerprint=0123456789abcdef
photos=118
```
읽을 수 없거나 키가 빠지면 「표식 없음」으로 본다.

## 대표 날 env `ProbeEnv`
`P<n>_DATE`(YYYY-MM-DD), `P<n>_BACK`(0|1|2, 오늘의 달과 그 날의 달 차), `P<n>_PHOTOS`(문자열 숫자), `P<n>_PLACES`(문자열 숫자), n=0..7.
