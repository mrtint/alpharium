# Data Model: 쓴 날 사진 확대 화면 (067)

저장하는 것은 없다. 모든 상태는 화면 로컬이고 확대 화면을 닫으면 사라진다(순번만 지면에 넘긴다).

## 1. CarouselPhoto (기존 — 읽기만)

`src/ui/PhotoCarousel.tsx`의 `CarouselPhoto = { photoId, takenAt, resizedPath }` — `DiaryEntry.photos[]`의 항목. 확대 화면도 같은 배열·같은 사본(`file://${resizedPath}`)을 쓴다.

## 2. 지면 캐러셀의 상태 (`PhotoCarousel` — 넓힌다)

| 필드 | 뜻 | 바뀌는 때 |
| --- | --- | --- |
| `index` (기존) | 지금 보이는 장(0부터) | 넘길 때(`onProgressChange`), **확대 화면이 닫힐 때(새로)** |
| `viewerStart` (새) | 열린 확대 화면이 시작한 장, 닫혀 있으면 `null` | 사진을 누를 때 → 그 장, 닫힐 때 → `null` |

- 1장일 때도 `viewerStart`를 쓴다(0). 「이 사진은 이제 없어요」 칸은 누를 수 없으므로 `viewerStart`가 그 장이 되지 않는다.

## 3. 확대 화면의 상태 (`PhotoViewer`)

| 필드 | 뜻 | 규칙 |
| --- | --- | --- |
| `index` | 지금 보이는 장 | 시작값 = `viewerStart`, 넘길 때 `indexAtProgress()`(051) |
| `zoomed` | 지금 사진의 배율이 1보다 큰가 (JS 상태) | 넘김 허용·팬 설정을 가른다. 사진이 바뀌면 `false` |
| `backdrop` (공유값) | 배경 불투명도 | `ZoomablePhoto`가 끈 거리를 `onDragChange`로 알리면 `backdropOpacity()` — 공유값을 prop으로 내려 고치지 않는다(React Compiler) |

닫힐 때 `onClose(index)`로 마지막 장을 알린다.

## 4. 사진 한 장의 확대 상태 (`ZoomablePhoto`)

| 필드 | 뜻 | 규칙 |
| --- | --- | --- |
| `scale` (공유값) | 배율 | 핀치 중 `pinchScale()`(0.6~4), 놓으면 `settleScale()`(1~4), 두 번 탭 `doubleTapScale()` |
| `offsetX`·`offsetY` (공유값) | 이동 위치 | `clampOffset(·, panLimit(fitted, box, scale))` — 배율이 줄면 다시 자른다 |
| `dragY` (공유값) | 배율 1에서 아래로 끈 거리 | 놓으면 `shouldDismiss()` → 닫힘, 아니면 0으로 |
| `fitted` | 화면 상자에 맞춘 사진 크기 | `onLoad` 원본 크기 → `fittedSize()`. 불러오기 전 `undefined` → 이동 한계 0 |
| `failed` | 사본을 못 불러옴 | 「이 사진은 이제 없어요」 — 확대·이동·두 번 탭 없음 |

**다른 장은 늘 배율 1에서 시작한다(FR-012) — 구조로 성립한다**: 확대된 동안은 넘김이 꺼져 있고(`scrollEnabled={!zoomed}`), 손을 떼면 「확대됨」이 아닌 배율은 정확히 1·위치 0으로 놓이므로(`settleScale`, 이동 한계 0) 떠나는 장은 언제나 배율 1이다. 그래서 「지금 보이는 장인가」(`active`)를 따로 두지 않는다(구현 중 결정 — 처음 계획의 `active` prop은 `renderItem` 참조를 순번마다 바꿔 046의 캐러셀 초기화를 부를 위험이 있었다).

## 5. 판정 함수 (`src/app/photo-viewer.ts` — 순수, `src/ui/`를 import하지 않는다)

| 함수 | 입력 → 출력 |
| --- | --- |
| `pinchScale(raw)` | 핀치 중 배율 → `[ZOOM_MIN_LIVE, ZOOM_MAX]`로 자름 |
| `settleScale(scale)` | 놓을 때 → 「확대됨」이 아니면(1.01 이하) 정확히 1, `ZOOM_MAX` 초과면 `ZOOM_MAX` |
| `doubleTapScale(scale)` | 1보다 크면 1, 아니면 `ZOOM_DOUBLE_TAP` |
| `isZoomed(scale)` | 1보다 큰가 (부동소수 여유 `0.01`) |
| `shouldDismiss(translationY, velocityY)` | `translationY > 0`이고 (`translationY ≥ 120` 또는 `velocityY ≥ 800`) |
| `backdropOpacity(translationY)` | 0 이하 → 1, `DISMISS_FADE_DISTANCE` 이상 → `BACKDROP_MIN_OPACITY`, 사이는 선형 |
| `fittedSize(image, box)` | `contain` 맞춤 크기 (가로세로 0 이하면 `undefined`) |
| `panLimit(fitted, box, scale)` | 축마다 `max(0, (fitted × scale − box) / 2)`, `fitted`가 없으면 0 |
| `clampOffset(value, limit)` | `[-limit, limit]`로 자름 |
| `indexAtProgress(progress, count)` | 051 지면 캐러셀에서 옮김 — 지면과 확대 화면이 같은 규칙으로 순번을 센다(`PhotoCarousel`이 다시 내보낸다) |
