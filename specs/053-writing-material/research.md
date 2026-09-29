# Research: 쓸 재료 (053)

## R1. 「권한이 없어요」를 가르는 정보를 어디서 얻나

- **Decision**: `CountHint`(`known`·`none`·`unknown`)는 그대로 두고, `DayPreview`에 `photoAccess: "ok" | "denied" | "blocked"`를 더한다.
  `wiring.previewDay`가 신호를 읽으면서 `PhotoPort.photoPermission()`도 부르고(이미 있는 통로), 결과를 `granted`·`limited` → `ok`,
  `denied`·`undetermined` → `denied`(OS가 다시 물을 수 있다), `blocked` → `blocked`로 옮긴다. 조회가 던지면 `ok`(→ 「모름」)로 둔다.
- **Rationale**: `unknown`의 `reason`은 한국어 문장이라 문자열 비교로 권한 여부를 가르면 문구 수정 하나에 조용히 깨진다(원칙 V의 반대). 권한 상태는 이미
  구조화된 값(`PermissionState`)으로 존재한다. `CountHint`에 갈래를 더하면 048 계약과 테스트가 전부 움직이는데, 화면이 필요한 것은
  「이 칸이 권한 때문에 셀 수 없는가」 하나뿐이다.
- **Alternatives**: (a) `CountHint`에 `no-permission` 갈래 추가 — 갈래 수 계약 변경, 장소 칸은 별개 갈래가 필요해짐. (b) `unknown.reason` 문자열 검사 —
  취약. (c) 화면이 권한 통로를 직접 부름 — 화면이 두 번 읽고 늦은 결과 대조가 두 벌이 된다.

## R2. 장소 칸의 「권한이 없어요」 (Clarification: 사진에 묶는다)

- **Decision**: `photoAccess !== "ok"`이면 두 칸 모두 「권한이 없어요 ›」. `photoAccess === "ok"`인데 장소가 `unknown`이면(좌표를 못 읽음 — 사진은 있는데)
  장소 칸은 「모름」이다. `collect.ts`의 `collectPlaces`가 이미 사진을 못 보면 좌표를 묻지 않으므로(권한 없음 ⇒ 장소도 `unknown`) 코드 무변경이다.
- **Rationale**: 장소 수는 사진 EXIF에서 나온다. `ACCESS_MEDIA_LOCATION`은 조회 API가 없다(AGENTS 실측). 그것을 「권한이 없어요」로 보이면 눌러도 요청할 통로가 없는
  거짓 버튼이다.

## R3. 쓰기 전 판정을 언제 어떻게 하나

- **Decision**: 「일기 쓰기」를 누르는 **그 순간** 판정한다. 화면이 이미 그 날의 미리보기를 받았으면(도착한 `day`가 고른 날과 같음) 그것을 쓰고,
  아직 없으면 `previewDay(day)`를 한 번 기다린다. `previewDay`가 없으면(통로 없음 — 데스크톱·테스트) 판정하지 않고 바로 쓴다. 다시 쓰기(이미 쓴 날, `overwrites`)에는
  적용하지 않는다 — 050의 덮어쓰기 확인이 이미 있다.
- **Rationale**: 「미리보기가 오기 전 누름」이 재료 없음으로 취급되면 안 된다(원칙 V). 누른 순간 신호를 새로 읽는 것이 가장 정직하고, 캐시를 두지 않는 048 FR-022와도 같다.
- **Alternatives**: 미리보기가 올 때까지 버튼 비활성 — 「일기 쓰기」가 무반응이 되는 결함이 반복된다(008).

## R4. 판정 규칙 하나를 두 곳에 쓴다

- **Decision**: `src/app/material.ts`의 `decideMaterial(photos, places)` 하나 — 각 항목을 `some`(1 이상)·`zero`(관측된 0)·`unseen`(셀 수 없음)으로 옮긴 뒤,
  `some`이 하나라도 있으면 `write`, 없으면 `confirm`(이유: `zero`가 하나라도 있으면 `"zero"`, 아니면 `"unseen"`). 미리보기용 옮김(`fromCountHint`)과 저장된 신호용 옮김(`fromSignalValue`)만 다르고
  규칙은 같다. `madeUpDay(signals)`는 `decideMaterial(...).kind === "confirm"`이다.
- **Rationale**: 「확인이 뜬 하루」와 「지어낸 하루로 보이는 하루」가 어긋나면 사용자가 본 경고와 읽을 때의 표식이 다른 말을 한다. 한 함수가 한 사실을 두 곳에 준다.

## R5. 「지어낸 하루」 표식

- **Decision**: `paperFor()`가 `readable` 지면에 `madeUp: boolean`을 싣는다(`madeUpDay(entry.signalsUsed)`). `WrittenDayPaper`가 본문 위에 보조색 한 줄
  「지어낸 하루」를 그린다. 저장 필드·파이프라인 변경 없음. 화면은 `DaySignals`를 모르고 불리언만 받는다.
- **Rationale**: Clarification(저장된 신호에서 계산, 본문 지면 맨 위). 옛 일기·백그라운드 일기도 같은 규칙으로 표식이 붙는다.
- **문구**: 보드에 없다. 사람이 정한 값 「지어낸 하루」(사용자 표현 그대로). 원칙 V에 맞는 사실만 담고 설명을 덧붙이지 않는다.

## R6. 권한 요청의 두 갈래

- **Decision**: 「권한이 없어요 ›」 탭 → `photoAccess === "blocked"`면 `MaterialDialogs`의 설정 안내 대화상자(「설정에서 사진 접근을 허용해 주세요」 / 설정 열기 / 취소),
  아니면 `requestPhotoPermission()`. 요청이 끝나면 미리보기를 다시 읽는다. 설정을 열고 돌아오면 `AppState` `active`에서 다시 읽는다.
- **Rationale**: 021 `PermissionsSection`이 같은 통로·같은 `blocked` 판정을 쓴다. 통로는 `App.tsx`가 조립해 넘긴다(화면이 `expo-*`에 닿지 않는다).

## R7. 안 쓴 날 지면 배치

- **Decision**: 보드 `1d`의 지면(배경 `neutral-100`, 스트립과 간격 20, 안쪽 20 20 120, 컬럼 `gap:6`, `flex:1`)을 안 쓴 날에 그대로 옮긴다. 스크롤 없음.
  큰 글꼴에서 넘치는지는 실기기에서 확인한다(미확인은 스펙 「미확인 잔여」에 적는다). 「쓸 수 있는 때」 칸과 칸 사이 세로선을 지운다.
- **Rationale**: 051의 쓴 날 지면은 이미 같은 색·간격 토큰을 쓴다. 새 토큰이 필요하면 `tokens.ts`에만 추가한다(C5).

## R8. 색

- **Decision**: 「권한이 없어요 ›」는 `COLORS.danger`(`#ae1800`)다. 보드의 accent(`#ec3013`) 16/700 글자는 `neutral-100` 위에서 약 3.9:1로 큰 글자 기준(18.66/700)에 못 미친다(C5).
  0의 회색 숫자는 `textMuted`.
