# Contract: 폴더 이름으로 사진 분류하고 되돌린다

**Feature**: `023-photo-selection-algorithm` | **파일**: `src/vision/select.ts`

**순수 함수다.** 기기를 모르고, 시각을 읽지 않고, 난수를 쓰지 않고, 파일을
열지 않는다. `folderName` 문자열만 본다.

---

## C1. 분류는 폴더 이름 하나로만 한다

입력: `Photo`(023 확장으로 `folderName?: string`을 가진다).

```
folderName === undefined                     → "unclassifiable"
NON_CAMERA_FOLDERS에 정확히(대소문자까지) 포함 → "non-camera"
그 외 (카메라 폴더, 목록 밖 이름 전부)          → "camera"
```

- **EXIF·픽셀·파일 크기를 보지 않는다**(spec Assumptions, 원칙 IV).
- **부분 일치·정규식이 아니다.** `"Screenshots"`는 잡고 `"MyScreenshots"`는
  안 잡는다 — 안드로이드 표준 폴더 이름은 고정이며, 느슨하게 잡으면 사용자
  폴더를 오분류한다.
- **`NON_CAMERA_FOLDERS`는 사람이 못 박은 `readonly` 상수**(FR-002). 코드가
  경로·사진 수·분포를 보고 이 목록을 만들거나 조정하지 않는다(원칙 V).

## C2. 애매하면 남긴다

`"camera"`와 `"unclassifiable"`은 선별 후보에 **남는다.** `"non-camera"`만
뺀다.

- 서드파티 카메라 앱이 자기 폴더(`DCIM/OpenCamera` 등)에 저장하면 목록에
  없으므로 `"camera"` → 남는다(Edge Cases).
- `folderName`을 못 얻은 사진(`content://` URI, 경로 없음)은
  `"unclassifiable"` → 남는다(FR-004, 004 FR-005a — 한 장 실패가 하루를
  안 무너뜨린다).
- **놓친 잡사진 한 장이 잘못 걸러낸 진짜 사진 한 장보다 낫다**(Edge Cases).

## C3. 카메라 원본이 0장이면 원본으로 되돌린다

분류 후 `"non-camera"`를 뺀 목록(`kept`)이 비면, **필터링 전 원본 목록으로
되돌린다**(FR-005).

```
kept = photos.filter(p => classOf(p) !== "non-camera")
if kept.length === 0: kept = [...photos]
```

- 스크린샷만 찍은 하루는 "사진 없음"이 아니라 그 스크린샷을 본다(User
  Story 1 Scenario 2).
- 전부 `"unclassifiable"`인 하루(파일 경로를 안 주는 기기)도 이 갈래로
  자연히 합류한다 — `"unclassifiable"`은 `"non-camera"`가 아니므로 애초에
  `kept`에 남아 되돌림이 필요 없지만, 만약 목록 구성이 바뀌어도 결과는
  같다(FR-004a).
- **되돌림 판정은 저장·타이머·`useEffect` 없이 매 호출에서 재계산**(FR-006,
  009 선례).

## C4. 결정적이다

같은 입력(같은 `Photo[]`, 같은 `folderName` 값들)에 언제나 같은 분류·같은
`kept`. `Date.now()`·`Math.random()`을 읽지 않는다(FR-015, 006 FR-037a).

---

## C5. `photos.length <= VISION_PHOTO_LIMIT`이면 분류하지 않는다

`selectForVision()`은 R1(상한 이하면 전부)에서 먼저 반환하므로 분류·분포
계산에 들어가지 않는다.

- 어차피 전부 캡션하므로 잡사진을 걸러도 캡션 대상이 안 줄어든다.
- `folderName`이 없는 기기에서 불필요한 일을 피한다.
- **되돌림 후 `kept`가 상한 이하로 줄어드는 경우**(스크린샷 빼니 3장)는 R1이
  아니라 `distributeByTime`의 `photos.length <= budget` 갈래가 받는다 —
  결과는 "그 3장 전부".

---

## 예시로 못 박기

| 입력 (folderName들) | 분류 | kept | 왜 |
|---|---|---|---|
| `Camera×3, Screenshots×2` (총 5) | c,c,c,nc,nc | — | R1: 상한 이하, 분류 안 함, 5장 전부 |
| `Camera×4, Screenshots×3` (총 7) | c×4, nc×3 | Camera×4 | C1·C2 |
| `Screenshots×4` (총 4) | nc×4 | — | R1: 상한 이하, 5장 이하라 전부 |
| `Screenshots×8` (총 8) | nc×8 | Screenshots×8 | C3 되돌림 (kept 비어서) |
| `undefined×10` (총 10) | u×10 | (그대로 10) | C2 — unclassifiable는 남음 |
| `Camera×6, DCIM/OpenCamera는 "OpenCamera"×2` (총 8) | c×8 | 8장 전부 | C2 — 목록 밖 이름은 camera |

**마지막 줄이 중요하다.** 목록에 없는 폴더 이름은 전부 카메라 원본으로
본다 — 필터는 "확실한 잡사진"만 걸러낸다.

---

## 헌법 경계

- `select.ts`(및 분류 로직)는 `roster.ts`·`persona.ts`·`diary/store`·
  `diary/pipeline`·`inference/sampling`을 import하지 않는다(기존
  `checkVisionFile` 유지).
- 픽셀 디코드·이미지 채점·품질 점수 어휘가 없다(constitution-guard.md의
  새 규칙).
- `NON_CAMERA_FOLDERS`는 `select.ts` 밖으로 export되지 않는다 — `expo-port.ts`
  가 이것을 참조하면 분류가 기기 계층으로 샌 것이다(constitution-guard.md).
