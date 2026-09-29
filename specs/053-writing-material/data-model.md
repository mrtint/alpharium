# Data Model: 쓸 재료 (053)

**저장 형식 변경 없음**(FR-020). 일기 파일(`DiaryEntry`)·설정·모델 상태 무변경. 아래는 화면이 받는 모양과 판정 입력뿐이다.

## 1. 재료 상태 — `MaterialState` (`src/app/material.ts`)

한 항목(사진 또는 장소)이 「쓸 재료」로서 어떤 상태인가. 세 갈래이며 서로 다른 뜻이다(원칙 V).

| 값 | 뜻 | `CountHint`에서 | `SignalValue`에서 |
| --- | --- | --- | --- |
| `some` | 관측된 수가 1 이상 | `known`, `count ≥ 1` | `known`, 사진 수 또는 `visitCount ≥ 1` |
| `zero` | 관측된 0 | `none`, 또는 `known`, `count = 0` | `none` |
| `unseen` | 셀 수 없다(권한 없음·읽기 실패·모름) | `unknown` | `unknown` |

## 2. 쓰기 전 판정 — `decideMaterial(photos, places) → MaterialDecision`

```text
MaterialDecision = { kind: "write" } | { kind: "confirm"; because: "zero" | "unseen" }
```

| 조건 | 결과 |
| --- | --- |
| 둘 중 하나라도 `some` | `write` |
| `some` 없음, `zero`가 하나라도 있음 | `confirm`, `because: "zero"` |
| 둘 다 `unseen` | `confirm`, `because: "unseen"` |

`because`는 확인 대화상자 제목(FR-017)만 고른다. **순서가 계약이다**: `some` → `zero` → `unseen`.

## 3. 미리보기 — `DayPreview` (048, `src/app/state.ts`)

```text
DayPreview = { day; photos: CountHint; places: CountHint; photoAccess: PhotoAccess }
PhotoAccess = "ok" | "denied" | "blocked"
```

- `CountHint`는 세 갈래 그대로(`known`·`none`·`unknown`).
- `photoAccess`: `granted`·`limited`·조회 실패 → `ok`, `denied`·`undetermined` → `denied`, `blocked` → `blocked`. 신호를 못 만든 경우(`null`)도 `ok`.
- **화면이 「권한이 없어요」로 보이는 조건** = `photoAccess !== "ok"`. 이때 두 칸 모두 그렇게 보인다(R2).
- 「0 안내 한 줄」 조건 = `photos`와 `places`가 모두 `zero`(FR-013·014).

## 4. 지면 상태 — `PaperState` (051, `src/app/written-day.ts`)

`readable` 갈래에 `madeUp: boolean`을 더한다. `paperFor()`가 `madeUpDay(entry.signalsUsed)`로 채운다. 나머지 갈래(`unwritten`·`loading`·`unreadable`)는 무변경.

## 5. 화면 로컬 상태 (`DiaryHomeScreen`)

| 상태 | 뜻 | 수명 |
| --- | --- | --- |
| `materialConfirm: { because; params } \| null` | 재료 없음 확인 대화상자가 떠 있는가와 확인 뒤 쓸 인자 | 대화상자가 닫힐 때까지 |
| `settingsPromptOpen: boolean` | 설정 안내 대화상자(`blocked`) | 닫힐 때까지 |
| `previewTick: number` | 미리보기를 다시 읽으라는 신호(권한 요청 뒤·앱 복귀) | 화면 로컬 |

어느 것도 파일에 저장하지 않는다.

## 6. 문구 — `MATERIAL_TEXT` (`src/ui/home-text.ts`)

| 키 | 값 | 출처 |
| --- | --- | --- |
| `photos` / `places` | 사진 / 장소 | 보드 `m.photos`·`m.places` |
| `unitPhoto` / `unitPlace` | 장 / 곳 | 보드 `m.unitP`·`m.unitL` |
| `noPermission` | 권한이 없어요 | 보드 `m.noPerm` |
| `emptyNote` | 기록 대신 상상으로 하루를 채워요. | 보드 `m.emptyNote` |
| `confirmTitleZero` | 😢 아무 기록도 없어요 | 보드 `m.fabTitle` |
| `confirmTitleUnseen` | 😢 기록을 볼 수 없어요 | **사람이 정한 값**(Clarification) |
| `confirmBody` | 이렇게 작성하면 하루를 상상해서 적어요. | 보드 `m.fabBody` |
| `confirmYes` / `confirmNo` | 확인 / 취소 | 보드 `m.fabYes`·`m.fabNo` |
| `settingsTitle` | 설정에서 사진 접근을 허용해 주세요 | 보드 `2m` 메모 |
| `settingsOpen` / `settingsCancel` | 설정 열기 / 취소 | 보드 `2m` 메모 |
| `madeUpDay` | 지어낸 하루 | **사람이 정한 값**(보드에 없음) |
