# 데이터 모델: 사진 신호 수집

**기능**: 004-photo-signal-collection | **Date**: 2026-08-14

002가 세운 `SignalValue`·`DaySignals`의 **뼈대는 그대로 두고**, 신호가 담는 **값의 타입**만
넓힌다(FR-026). 무엇이 새로 생기고 무엇이 그대로인지를 여기서 못 박는다.

---

## 바뀌지 않는 것

| 타입 | 자리 | 왜 그대로인가 |
| --- | --- | --- |
| `SignalValue<T>` | `src/signals/types.ts` | **세 갈래를 넷으로 늘리지 않는다**(FR-026). 늘리면 002·003의 모든 판정이 영향받는다 |
| `DaySignals` | `src/signals/types.ts` | **자리 수가 다섯 그대로다.** 신호를 더하거나 빼지 않는다 |
| `Photo` | `src/signals/types.ts` | `{ id, takenAt }` 그대로. 내용 이해는 005의 몫이다 |
| `DayDate`·`dayOf()` | `src/config/day-boundary.ts` | 04:00 경계를 다시 계산하지 않는다(FR-002) |
| `DiaryRequest`·`DiaryEntry` | `src/diary/types.ts` | 004는 신호까지만 다룬다 |

**`fake.ts`도 그대로 둔다**(FR-018). 제품 경로가 아니라는 경계가 유지된다.

---

## 새로 생기는 것

### `PhotoObservation` — 사진 목록 + 이것이 전부인가

`photos`가 `known`일 때 담기는 값. **`Photo[]`를 직접 담지 않는다**(FR-024).

| 필드 | 뜻 | 근거 |
| --- | --- | --- |
| `photos` | 그 하루의 사진들. 찍힌 시각 순 | FR-004 |
| `complete` | 이것이 그날의 전부인가 | FR-014a, FR-024 |

**`complete`가 `false`인 경우**: 상한(200장)에 걸려 잘렸다. 그때 `photos`에는 **이른 시각부터**
200장이 들어 있다(FR-014b).

**왜 `Photo[]`를 그냥 담지 않는가**: 목록만 받는 쪽이 `photos.length`를 그날 찍은 수로 읽게
된다. 잘린 하루에서 그것은 거짓이다(FR-014d). 묶어 두면 한계를 못 보고 지나칠 수 없다.

**금지**(FR-027): `PhotoObservation`에서 목록만 꺼내는 편의 함수를 만들지 않는다.
`photosOf(observation)` 같은 것이 생기는 순간 `complete`가 사라진다 — 002가 `valueOr()`를
금지한 것과 같은 이유다.

---

### `PhotoPlaces` — 자리 + 이것이 사진에서 왔다는 사실

`places`가 `known`일 때 담기는 값. **`PlaceTrace`를 직접 담지 않는다**(FR-025).

| 필드 | 뜻 | 근거 |
| --- | --- | --- |
| `trace` | `PlaceTrace` — `visitCount`와 `approximateDistanceMeters` | 002의 타입 그대로 |
| `source` | 언제나 `"photo-exif"` | FR-025 |
| `photosWithLocation` | 좌표가 있던 사진의 수 | 아래 |
| `photosConsidered` | 좌표를 물어본 사진의 수 | 아래 |

**`source`가 지금은 값이 하나뿐인데 왜 두는가**: 나중에 실제 GPS 수집이 붙으면 같은
`places` 자리에 다른 출처가 들어온다. 그때 "이 자리 정보가 어디서 왔나"를 묻는 코드가
이미 있어야 한다. 값이 하나라도 **질문을 미리 세워 두는 것**이다.

**두 개의 수를 왜 담는가**: 사진 열 장 중 두 장에만 좌표가 있었다면, `visitCount`가 1이어도
그것은 "하루 종일 한 곳에 있었다"가 아니라 "좌표를 본 두 장이 같은 곳이었다"이다. 이 차이가
005의 프롬프트에서 단언과 짐작을 가른다(헌법 원칙 II).

**`PlaceTrace`의 두 필드가 사진에서 올 때의 뜻**(research.md §4):

- `visitCount` — 100m 규칙으로 묶은 자리의 수
- `approximateDistanceMeters` — 자리들을 시각 순으로 이은 거리의 합. **실제 이동 거리가
  아니다**(FR-013e)

---

### `PhotoPermission` / `LocationPermission` — 권한의 상태

**둘을 따로 둔다**(FR-013a). 안드로이드에서 별개로 거절될 수 있다.

| 갈래 | 뜻 | `photos`/`places`가 되는 값 |
| --- | --- | --- |
| `granted` | 전체 허용 | `known` 또는 `none` |
| `limited` | 일부 사진만 허용 | `unknown` (FR-008) |
| `denied` | 거절됨. 다시 물을 수 있다 | `unknown` |
| `blocked` | 거절됐고 다시 물어도 창이 안 뜬다 | `unknown` (FR-023) |
| `undetermined` | 아직 묻지 않음 | `unknown` (FR-011) |

**`denied`와 `blocked`를 가르는 이유**(FR-023): 진단 화면에서 「다시 요청」 버튼이 의미가
있는지 없는지가 갈린다. 구분하지 않으면 사용자가 버튼을 반복해 누른다.
`canAskAgain: false`가 `blocked`다.

**⚠️ `limited`는 안드로이드에서 판정 가능한지 아직 확인되지 않았다**(research.md §2).
타입에는 `accessPrivileges?: 'all' | 'limited' | 'none'`가 있으나 선택적이고, 근거 구현이
iOS였다. **실기기 확인 전까지 이 갈래는 「있을 것으로 보이는」 상태이며, 확인 결과에 따라
명세가 바뀔 수 있다.**

---

### `PhotoPort` — 기기에 닿는 통로

**이 모양이 004에서 기기에 의존하는 유일한 자리다**(FR-017). 003의 `ModelFilePort`와 같은
구조다.

| 기능 | 무엇을 하는가 | 무엇을 하지 않는가 |
| --- | --- | --- |
| `photoPermission()` | 사진 권한의 지금 상태를 본다 | **요청하지 않는다**(FR-011) |
| `locationPermission()` | 좌표 접근 권한의 지금 상태를 본다 | 위와 같다 |
| `requestPhotoPermission()` | 권한 요청을 띄운다 | 사용자가 시작할 때만 불린다(FR-021) |
| `photosBetween(from, to, limit)` | 그 구간의 사진 메타데이터 | **픽셀에 닿지 않는다**(FR-005) |
| `locationOf(photoId)` | 사진 하나의 좌표 | 실패해도 던지지 않는다(FR-012) |

**`photosBetween`이 `limit + 1`을 받는 까닭**: 상한을 넘었는지 알려면 상한보다 하나 더
물어봐야 한다. 201장이 돌아오면 200장을 담고 `complete: false`다.

**`locationOf`가 예외를 삼키는 자리다**(research.md §3). `getLocation()`은 권한이 없으면
`throw` 하므로, 이 함수가 감싸지 않으면 사진 신호 전체가 무너진다.

---

## 값이 정해지는 규칙

### `photos`

```
권한이 granted가 아니다        → unknown (이유: 권한 상태)
조회가 실패했다                → unknown (이유: 조회 실패)         FR-012
그 하루의 사진이 0장이다       → none                              FR-009
그 외                          → known(PhotoObservation)
```

**`none`은 「권한이 있는데 없었다」일 때만 나온다.** 이 한 줄이 이 기능의 핵심 방어선이며,
SC-002가 재는 것이다.

### `places`

```
좌표 권한이 granted가 아니다   → unknown                           FR-013b
photos가 known이 아니다        → unknown (물어볼 사진이 없다)
좌표가 있는 사진이 0장이다     → none                              FR-013c
그 외                          → known(PhotoPlaces)
```

**`photos`가 `unknown`이어도 `places`를 따로 판정하지 않는다** — 사진 목록이 없으면 좌표를
물어볼 대상 자체가 없다. 반대 방향은 성립한다: 좌표가 없어도 `photos`는 `known`이다(FR-013a).

### 나머지 셋

```
steps         → unknown ("안드로이드가 기간 걸음 수를 제공하지 않음")   FR-015a
battery       → unknown ("아직 수집하지 않음")
connectivity  → unknown ("아직 수집하지 않음")
```

**`steps`의 이유가 다르다**(FR-015a). 나머지 둘은 "안 했다"이고 걸음 수는 "못 한다"이다.

---

## 버려지는 것

| 무엇 | 왜 | 근거 |
| --- | --- | --- |
| 찍힌 시각이 없는 사진 | 어느 하루에도 넣을 수 없다 | FR-003 |
| 미래 시각의 사진 | 기기 시계가 어긋난 흔적 | Edge Cases |
| 좌표 `(0, 0)` | 좌표를 못 읽었을 때의 채움값일 수 있다 | FR-013d |
| 위도 \|lat\| > 90, 경도 \|lon\| > 180 | 좌표가 아니다 | FR-013d |
| 사진이 아닌 자산(영상·음성) | 이 앱은 사진만 본다 | research.md §8 |

**버린 사진은 `photosConsidered`에 세지 않는다.** 물어보지도 않았기 때문이다.
