# Data Model: 121

## PlaceVisit — 자리 (`src/signals/types.ts`)

| 필드 | 타입 | 뜻 |
|---|---|---|
| `coordinate` | `Coordinate` | 그 자리 첫 사진의 좌표(`tracePlaces`의 대표 좌표와 같은 규칙) |
| `firstSeenAt` | `Date` | 그 자리에 묶인 사진들의 가장 이른 시각 |
| `lastSeenAt` | `Date` | 가장 늦은 시각 |
| `photoCount` | `number` (≥1) | 그 자리에 묶인 좌표 있는 사진 수 |
| `source` | `"photo-exif"` | 출처. 사진 밖 수집 과제가 유니온을 넓힌다 |

규칙: `visits`는 `firstSeenAt` 오름차순. `visits.length === trace.visitCount`. `trace.representativeCoordinate === visits[0].coordinate`(있을 때). **저장 일기의 신호 기록(`signalsUsed`)에서는 `visits`를 걷는다**(R9 — 동선 좌표를 일기 파일에 늘리지 않는다, 코드 리뷰). 그래서 타입은 옵셔널이고 `tracePlaces()`의 반환형만 늘 채운다.

## PlaceTrace (확장)

`{ visitCount, approximateDistanceMeters, representativeCoordinate?, visits: PlaceVisit[] }` — `visits`만 새로 더한다(`tracePlaces()`가 내는 값이라 그 결과에 둔다). `PhotoPlaces`는 그대로 `trace`로 이것을 담는다. 기존 값은 그대로(홈 「자리 N곳」·기존 문장이 읽는다).

## PlaceCategory

`"station" | "landmark" | "park" | "mall" | "institution" | "building" | "residential" | "locality"`

## PlaceName — 자리에 붙는 이름 (`src/signals/place-names.ts`)

```ts
type PlaceName =
  | { kind: "known"; label: string; category: PlaceCategory }
  | { kind: "none" }      // 근처에 이름 붙은 곳 없음(한국 밖 포함)
  | { kind: "unknown" };  // 데이터를 읽지 못함
```

## NamedVisit (파이프라인 안)

`PlaceVisit & { name: PlaceName }`. 설정 「끔」이면 이름을 찾지 않고 `NamedVisit`을 만들지 않는다(프롬프트 장소 줄도 없다). 저장은 `savedPlacesOf(visits: PlaceVisit[], names?: PlaceName[])`로 이름 유무와 상관없이 만든다.

## PromptPlace — 프롬프트 조각의 입력 (`DiaryRequest.places?`)

```ts
type PromptPlace = { period: DayPeriod; label: string | null }; // null = 이름을 모르는 곳
type DayPeriod = "morning" | "afternoon" | "evening" | "night"; // 오전·오후·저녁·밤 — prompt.ts partOf와 같은 구간
// + 넘친 수
type PromptPlaces = { items: PromptPlace[] /* 1~3 */; more: number /* ≥0 */ };
```

만드는 규칙(`src/diary/place-lines.ts`, 순수): NamedVisit 목록 → 연이은 같은 `label`(이름 없음끼리 포함) 합치기 → 시각순 첫 3개 `items`, 나머지 개수 `more`. `known`이 아니면 `label: null`. `period`는 그 항목 첫 자리의 `firstSeenAt` 시(오전 0–11·오후 12–17·저녁 18–20·밤 21–23). 모든 이름이 `unknown`이면(데이터 실패) `DiaryRequest.places`를 싣지 않는다 — 「이름을 모르는 곳」은 데이터에서 찾았지만 없다는 뜻이라 섞지 않는다.

`DiaryRequest.placeName?: string`은 걷는다.

## SavedPlace — 저장 (`DiaryEntry.places?`)

| 필드 | 타입 |
|---|---|
| `label` | `string \| null` |
| `category` | `PlaceCategory \| null` |
| `firstSeenAt` | `string` (ISO) |
| `lastSeenAt` | `string` (ISO) |
| `photoCount` | `number` |

자리 전부(합치기 전)를 시각순으로 저장. 설정 「끔」·이름 `none`·`unknown`이면 `label`·`category`는 `null`. 좌표 없음. 옛 `placeName` 필드는 읽기만.

## PlaceNamePreference — 설정

`"on" | "off"`(타입 이름은 기존 `GeocodingPreference` 유지 — 문서에서 부르는 이름이 PlaceNamePreference일 뿐이다). 이전: `"auto"`→`"on"`, 파일 없음·깨짐→`"on"`, `{enabled:b}`→`b ? "on" : "off"`.

## 장소 데이터(번들) — 논리 모양

장소마다 `{ lat, lon (1e-5도 int32), category, name (UTF-8, 255바이트까지), bbox?, rings? }`. 형식은 `contracts/place-index.md`.
