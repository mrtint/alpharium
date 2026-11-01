# Research: 제약 띠

- **R1 — 사진 권한 띠의 버튼**: 새 통로를 만들지 않고 홈의 `requestPhoto`(053)를 부른다. 다시 물을 수 있으면 OS 창, `blocked`면 `SettingsPromptDialog`(이미 있는 설정 안내). 대안(`osSettings.openAppSettings` 직접 호출)은 `denied` 상태에서 OS 창을 건너뛰어 불필요하게 설정 화면까지 보낸다. **이유**: 안 쓴 날의 「권한이 없어요 ›」와 같은 동작이라 사용자가 두 가지 길을 만나지 않는다.
- **R2 — 사진 권한 읽기**: `App.tsx`의 `deniedNotices` 계산(`photoPermission()` + 앞 복귀 재읽기)을 그대로 쓰되 결과를 문자열 배열이 아니라 `photoDenied: boolean | undefined`(읽기 전 `undefined`)로 바꾼다. `denied`·`blocked`만 참이고 `limited` 등은 거짓이다. `PERMISSION_REQUIREMENTS.photos.ifDenied`는 온보딩에서 계속 쓰므로 남긴다.
- **R3 — 배터리 상태 읽기**: 훅이 `port.readStatus()`를 마운트 때와 `AppState` 앞 복귀 때 부른다(던지면 `unknown`). `platform !== "android"`면 읽지 않는다. 자동 쓰기 켬 여부는 `DiarySection`이 받는 `autoDiarySettings?.enabled`(설정 값을 아직 못 읽었으면 `undefined` → 띠 없음)를 입력으로 넘긴다.
- **R4 — 자리**: `DiaryListScreen`의 세 분기(쓰는 중 제외) 모두 `bandNode`를 바닥에서 `barHeight`만큼 올려 절대 배치한다. 안 쓴 날의 지면 아래 여백(120)과 쓴 날의 본문 아래 여백(104)에 띠 높이(잰 값)를 더해 마지막 줄을 가리지 않는다. 쓴 날은 `RewriteBar`와 같은 `visible`(= `atEnd`)을 따라 함께 내려간다. 대안(바 슬롯 안에 넣기)은 토스트 위치가 바 높이 기준이라 흐려지지 않고 띠 위로 올라가게 되어 소유자가 확정한 「토스트가 띠를 대신한다」와 달라진다.
- **R5 — 토스트 중 가림**: `toast !== undefined`인 동안 띠를 `opacity` 0 + 접근성 숨김으로 둔다(레이아웃 높이는 유지해 토스트가 사라질 때 지면이 튀지 않게). 토스트 위치(`barHeight + TOAST.gapAboveBar`)는 그대로.
- **R6 — 캐릭터 대체 안내**: 토스트 상태를 `{id, kind}`에서 `{id, text}`로 바꾸고 문구는 만드는 쪽이 정한다(`TOAST_TEXT[kind]` 또는 `movedNotice` 문장). `ToastKind`·`toastKindFor`는 그대로. `movedNotice`는 현재 로스터(1명)에서 발생하지 않으므로 미래 캐릭터 대역(`__tests__/future-character.ts`)으로 확인한다.
- **R7 — 글꼴과 한 줄**: 글자는 `numberOfLines={1}` + `ellipsizeMode="tail"` + `maxFontSizeMultiplier={1.2}`(기존 `NOTICE_FONT_CAP` 값을 부품으로 옮긴다), 버튼은 `flexShrink: 0` + 최소 높이 44. 글꼴 2.0배에서 글자가 잘리는 정도는 실기기에서 잰다(미확인).
- **R8 — 옛 기록**: `battery-notice-dismissed.json`을 읽지도 지우지도 않는다. 걷는 것은 `battery-notice-store.ts` 파일과 그 호출뿐이다. 온보딩의 `batteryNoticeShown` 플래그는 별개라 둔다.
- **R9 — 규칙의 잠금**: 소스 계약 테스트가 (a) `DiaryListScreen.tsx`에 `Notices`·`BatteryNoticeLine`·`deniedNotices`·`movedNotice` 식별자가 없고 (b) `ConstraintBand.tsx` 프롭에 닫기(`onDismiss`·`dismiss`)가 없고 (c) `DESIGN.md`에 다섯 분류 표식이 있음을 본다. 위반을 하나씩 주입해 실패를 확인한다.
