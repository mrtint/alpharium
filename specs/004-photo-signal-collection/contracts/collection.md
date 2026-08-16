# 계약: 신호 수집과 판정

**기능**: 004-photo-signal-collection | **Date**: 2026-08-14

`PhotoPort`가 준 사실을 `DaySignals`로 옮기는 규칙. **이 계약이 헌법 원칙 V의 방어선이다.**

---

## 모양

```ts
/** 하루의 신호를 모은다. 포트를 주입받으므로 기기 없이 검증된다 */
export function collectDaySignals(
  port: PhotoPort,
  day: DayDate,
  options?: { limit?: number },
): Promise<DaySignals>;
```

**`now`를 받지 않는다** — 어느 하루를 물을지는 `day`가 정하고, 그 하루의 시작·끝은
`day-boundary.ts`가 안다. 파이프라인이 "지금"을 다루는 것(FR-018a)과는 다른 층이다.

---

## 판정 규칙 — 이것이 계약의 본체다

### `photos`

```
1. photoPermission()이 granted가 아니다
     → unknown, 이유는 상태별로 다르다:
         limited       → "일부 사진만 접근이 허용되어 그날의 전부를 볼 수 없다"
         denied        → "사진 접근 권한이 없다"
         blocked       → "사진 접근 권한이 없고 다시 요청할 수 없다"
         undetermined  → "사진 접근 권한을 아직 묻지 않았다"

2. photosBetween()이 실패했다
     → unknown, "사진을 조회하지 못했다: {까닭}"          FR-012

3. 유효한 사진이 0장이다
     → none                                                FR-009

4. 그 외
     → known({ photos, complete })
```

**3번의 "유효한"이 중요하다.** 찍힌 시각이 없거나 미래인 사진은 버려진다(FR-003). 200장을
가져왔는데 전부 시각이 없으면 결과는 `none`이다 — 사진 파일은 있었지만 **하루에 넣을 수
있는 사진**은 없었다.

**`complete`가 정해지는 방식**: `limit + 1`장을 물어서 `limit + 1`장이 오면 `false`,
그보다 적으면 `true`. 담는 것은 이른 시각부터 `limit`장이다(FR-014b).

### `places`

**⚠️ 2026-08-16에 고쳤다** — 구현에서 확인한 제약 때문이다. 아래가 지금의 계약이다.

```
1. photos가 known이 아니다
     → unknown, "사진을 보지 못해 좌표를 물을 수 없다"

2. 좌표 읽기가 **전부** failed다
     → unknown, "사진의 좌표를 읽지 못했다: {까닭}"        FR-013b

3. 읽을 수는 있었으나 유효한 좌표가 0장이다
     → none                                                FR-013c

4. 그 외
     → known({ trace, source, photosWithLocation, photosConsidered })
```

**왜 권한을 보지 않는가**: `expo-media-library 57`은 **`ACCESS_MEDIA_LOCATION`을 따로 묻는
함수를 주지 않는다**(설치본 직접 확인, 2026-08-16). 이 권한은 `getLocation()`·`getExif()`의
주석에만 등장하고 조회 API가 없다.

그래서 좌표 권한이 있는지는 **실제로 읽어 봐야 안다**. 사진 권한을 좌표 권한인 척 돌려주는
대안은 기각했다 — 「좌표 권한이 있다」는 거짓을 신호에 싣게 되고, 사진 권한이 허용돼도
`ACCESS_MEDIA_LOCATION`은 따로 거절될 수 있다(헌법 원칙 V).

**1번이 맨 앞인 것은 그대로다.** 사진을 못 봤으면 좌표를 물을 대상이 없다. 순서를 뒤집으면
"좌표를 읽지 못했다"가 이유로 나가는데, 진짜 이유는 사진을 못 본 것이다.

**2번과 3번의 구분이 원칙 V다**: 전부 실패한 것은 「못 읽었다」(모름)이고, `absent`가 섞여
있으면 「읽었는데 없었다」(관측된 사실)이다.

**어느 갈래도 `photos`를 건드리지 않는다**(FR-013a). 이 시점에 `photos`는 이미 정해져 있다.

### 나머지 셋

```
steps        → unknown, "안드로이드가 기간 걸음 수를 제공하지 않는다"    FR-015a
battery      → unknown, "아직 수집하지 않는다"
connectivity → unknown, "아직 수집하지 않는다"
```

이 문구가 **서로 달라야 한다**(FR-015a). 같으면 "못 하는 것"과 "안 한 것"이 뭉개진다.

---

## 금지 — 이 계약이 막는 것

### 1. 권한 없음이 빈 목록이 되지 않는다 (FR-007, SC-002)

```ts
// 금지
const photos = permission === "granted" ? await fetch() : [];
return { kind: "known", value: photos };
```

이 두 줄이 이 기능 전체를 무너뜨린다. 일기가 "오늘은 사진을 한 장도 찍지 않았다"고 쓰게
되고, 그것은 관측이 아니라 거짓이다.

### 2. 기본값으로 채우는 함수를 만들지 않는다 (FR-027)

002가 `valueOr(signal, 0)`을 금지한 것과 같다. `PhotoObservation`에서 목록만 꺼내는
`photosOf()`도 같은 이유로 금지다 — `complete`가 사라진다.

### 3. 예외를 밖으로 내보내지 않는다 (FR-012)

`collectDaySignals`는 **어떤 경우에도 던지지 않는다.** 포트가 무너져도 `unknown`이
나간다. 파이프라인의 `signals` 단계가 예외로 죽으면 어느 단계에서 멈췄는지 말할 수 없다.

### 4. 하루 경계를 다시 계산하지 않는다 (FR-002)

`dayOf()`와 하루의 시작·끝은 `day-boundary.ts`에서 온다. 여기서 04:00을 다시 쓰면 신호와
일기가 서로 다른 하루를 보게 된다.

---

## 자리 묶기 — `places.ts`

**순수 함수다.** 좌표 묶음을 받아 `PlaceTrace`를 돌려준다.

```ts
/** 100m 안이면 한 자리. research.md §4 */
export const SAME_PLACE_METERS = 100;

export function tracePlaces(
  points: { latitude: number; longitude: number; takenAtMs: number }[],
): PlaceTrace;
```

**규칙**:

1. 시각 순으로 정렬한다.
2. 직전 자리의 중심과 `SAME_PLACE_METERS` 안이면 같은 자리, 아니면 새 자리.
3. `visitCount`는 자리의 수.
4. `approximateDistanceMeters`는 자리 중심들을 순서대로 이은 거리의 합.

**`SAME_PLACE_METERS`가 한 곳에만 있어야 한다**(FR-013g). 거리 판단이 여러 곳에 흩어지면
한쪽만 고쳐지는 일이 생긴다.

**이 값은 짐작이다**(FR-013h). 주석에 그렇게 적는다 — 실측인 척하면 원칙 V가 깨진다.

**유효하지 않은 좌표는 이 함수에 들어오기 전에 걸러진다**(FR-013d). `(0, 0)`과 범위를
벗어난 값이다.

---

## 검증 표

| # | 무엇 | 기기 | 근거 |
| --- | --- | --- | --- |
| C1 | 권한 다섯 갈래가 각각 다른 `unknown` 이유를 만든다 | 불필요 | FR-010 |
| C2 | `granted` + 0장 → `none` | 불필요 | FR-009 |
| C3 | `denied` → `unknown`, 절대 `none` 아님 | 불필요 | SC-002 |
| C4 | 좌표 권한 없음이 `photos`를 바꾸지 않는다 | 불필요 | FR-013a, SC-004 |
| C5 | 04:00 양쪽이 다른 하루로 갈린다 | 불필요 | FR-002, SC-003 |
| C6 | 시각 없는 사진이 버려진다 | 불필요 | FR-003 |
| C7 | 미래 시각 사진이 버려진다 | 불필요 | Edge Cases |
| C8 | 201장 → 200장 + `complete: false` | 불필요 | FR-014a |
| C9 | 잘릴 때 이른 시각부터 남는다 | 불필요 | FR-014b |
| C10 | `(0,0)` 좌표가 자리로 세어지지 않는다 | 불필요 | FR-013d, SC-005 |
| C11 | 100m 안의 사진 여럿이 한 자리다 | 불필요 | FR-013f, SC-005a |
| C12 | 100m 밖이면 두 자리다 | 불필요 | FR-013f |
| C13 | `locationOf`가 던져도 `photos`가 산다 | 불필요 | FR-012 |
| C14 | 셋의 `unknown` 이유가 서로 다르다 | 불필요 | FR-015a |
| C15 | 신호를 물어도 권한 창이 뜨지 않는다 | 불필요 | FR-011 |
| C16 | `SignalValue` 갈래 수가 002와 같다 | 불필요 | SC-006b |
| D1 | **안드로이드가 `limited`를 주는가** | **필요** | research.md §2 |
| D2 | 실제 사진이 신호에 나타난다 | **필요** | SC-008 |
| D3 | 권한 허용 전후로 판정이 바뀐다 | **필요** | SC-008a |

**C1~C16이 기기 없이 돈다** — 16개 중 16개다. SC-007이 요구하는 바다.

**D1이 명세를 바꿀 수 있다.** 구현 초반에 확인한다.
