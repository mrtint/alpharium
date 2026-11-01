# Contract: 제약 띠

## 판정 `constraintBandFor` (CB)

- CB1: `photoDenied: true`이면 다른 입력과 무관하게 `"photos"`.
- CB2: `photoDenied`가 `false`·`undefined`이고 android + `autoWriteEnabled: true` + `battery: "restricted"`이면 `"battery"`.
- CB3: android가 아니거나 `autoWriteEnabled`가 `false`·`undefined`이거나 `battery`가 `exempt`·`unknown`이면 `null`.
- CB4: 두 조건이 함께 참이면 `"photos"` 하나(둘이 동시에 나오지 않는다).
- CB5: 입력 12조합(photo 3 × 나머지 대표 4) 전수 표 테스트.

## 훅 `useConstraintBand` (UB)

- UB1: android일 때 마운트에서 `readStatus()`를 읽고, 던지면 `unknown`으로 본다. iOS는 읽지 않는다.
- UB2: `AppState`가 `active`로 바뀔 때 다시 읽는다. 다시 읽다 던지면 이전 값을 지우지 않고 `unknown`으로 덮지도 않는다(읽지 못한 것으로 숨기지 않는다 — 마지막 값 유지).
- UB3: `onOpenBattery()`는 `openSettingsList()`를 부르고 실패해도 던지지 않는다.
- UB4: 닫기·기록 저장이 없다.

## 부품 `ConstraintBand` (CP)

- CP1: 글자 하나(`numberOfLines=1`, 배율 상한 1.2)와 채워진 버튼 하나. 프롭에 닫기가 없다.
- CP2: 버튼 최소 높이 44, `accessibilityRole="button"`, 라벨은 `action`.
- CP3: 접근성 순서: 글자 → 버튼. 띠 전체에 `testID="constraint-band"`, 버튼에 `constraint-band-action`.
- CP4: `hidden` 프롭이 참이면 `opacity` 0 + `importantForAccessibility="no-hide-descendants"` + `pointerEvents="none"`(높이는 유지).

## 홈 배치 (HP)

- HP1: `DiaryListScreen`은 쓰는 중에는 띠를 그리지 않는다. 쓴 날·안 쓴 날에는 그린다.
- HP2: 쓴 날은 `RewriteBar`의 `visible`을 따른다(바가 내려가면 띠도 숨김).
- HP3: `toast`가 있는 동안 띠는 `hidden`.
- HP4: 스트립 아래(헤더 안)에는 안내 줄이 없다 — `Notices`·`BatteryNoticeLine` 식별자가 `DiaryListScreen.tsx`에 없다.
- HP5: `photos` 띠 버튼은 `requestPhoto()`를, `battery` 띠 버튼은 `onOpenBattery()`를 부른다.
- HP6: 캐릭터 대체 안내는 토스트로 나가고 `movedNotice` 상태·prop은 없다.

## 규칙 (RL)

- RL1: `design/DESIGN.md`에 다섯 분류(A~E) 표와 「하지 않는 것」 두 줄이 있다.
- RL2: 소스 계약: `DiaryListScreen.tsx`·`DiaryHomeScreen.tsx`에 `deniedNotices`·`movedNotice`·`batteryNotice` 식별자 없음, `ConstraintBand.tsx`에 `dismiss` 없음.
