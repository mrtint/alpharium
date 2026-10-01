# Research: 설정 진입과 화면 틀 (055)

C1(라이브러리는 plan에서 문서로 확인한다)에 따라 출처를 남긴다. 「실측」·「문서」·「짐작」을 가른다(원칙 V).

## R1 — 홈 위에 겹치는 구조

- **Decision**: `AppFrame`이 `DiarySection`을 `route`와 무관하게 늘 그리고, 그 위에 절대 배치한 하위 화면 겹(`StackLayer`)을 둔다.
  겹은 `react-native-reanimated`의 `translateX`(화면 폭 → 0)로 들어오고, 닫을 때 0 → 화면 폭으로 나간다. 닫힘의 언마운트는
  움직임 시간만큼의 JS 타이머로 한다(054 `FailureToast`의 `setTimeout` 방식 — worklet 콜백·`scheduleOnRN`을 쓰지 않는다).
- **Rationale**: 저장소 소유자 채택(설계 문서). 새 의존성 0, 048 FR-008 「상태 하나로 가른다」 관례 유지, 루트 `PortalHost`(050)의
  대화상자가 모든 겹 위에 그대로 뜬다(§3.2가 필요로 한다).
- **Alternatives**: react-navigation native-stack — `react-native-screens`가 050 DEP1로 막힌 네이티브 의존성. RN `Modal` — 안드로이드
  `animationType="slide"`는 아래에서 올라오고, 별도 창이라 루트 `PortalHost` 대화상자가 그 아래에 깔린다.
- **출처(문서)**: ctx7 `/websites/swmansion_react-native-reanimated` — `withTiming(toValue, { duration, easing }, callback?)`, 기본 300ms,
  `Easing.inOut(Easing.quad)`. 이 저장소는 reanimated 4.5.1 · worklets 0.10.1(`package.json`). jest 목은 `withTiming`을 목표값 즉시
  반환으로 바꾼다(`jest/setup-ui.ts:62`) — 움직임은 jest가 못 본다(C9).
- **움직임 값(사람이 정한 값)**: 240ms, `Easing.out(Easing.ease)`로 연다·`Easing.in(Easing.ease)`로 닫는다. 근거는 052 `foldMs`·051
  `bar.slideMs`의 240(같은 앱 안의 이동 시간을 맞춘다). 보드에 값이 없다.

## R2 — 겹친 동안 홈의 뒤로 가기

- **Decision**: `DiaryHomeScreen`에 `covered?: boolean`을 더하고, `covered`이면 뒤로 가기 effect 둘(쓰는 중 → 그만두기 054, 실패 화면 → 홈 051)이
  **등록하지 않는다**(effect 첫 줄에서 반환). 하위 화면 겹은 마운트된 동안 자기 `hardwareBackPress`를 등록한다(048 N3 규칙 유지).
- **Rationale(실측 — 소스)**: `DiaryHomeScreen.tsx:801-818`의 두 effect는 `cancel`·`goHome` identity가 바뀌면 다시 등록된다. RN `BackHandler`는
  **나중에 등록한 것부터** 부르고 `true`를 돌려주면 멈춘다(RN 소스 `BackHandler.android.js`의 `_backPressSubscriptions`를 뒤에서부터 순회 —
  이 저장소 `dialog.test.tsx`의 `captureBackHandlers`가 같은 가정을 쓴다). 설정이 열린 뒤 홈 effect가 다시 돌면 홈 핸들러가 앞에 서서
  설정의 뒤로 가기가 **쓰기를 그만두게 한다** — 오류 없는 조용한 결함. 등록 순서에 기대지 않으려면 등록 자체를 막는다.
- **Alternatives**: 겹이 매 렌더마다 다시 등록해 늘 맨 위에 선다 — 경합 창이 남고 계약으로 잠그기 어렵다.

## R3 — 겹친 동안 홈의 접근성·누름

- **Decision**: 홈 래퍼 `View`에 `importantForAccessibility={covered ? "no-hide-descendants" : "auto"}`와
  `accessibilityElementsHidden={covered}`, `pointerEvents={covered ? "none" : "auto"}`. `covered`는 「열림」 또는 「닫히는 중」이다.
- **Rationale**: 안드로이드 TalkBack은 `importantForAccessibility`, iOS VoiceOver는 `accessibilityElementsHidden`을 본다(RN 문서 —
  Accessibility). RNTL은 두 속성을 「접근성에서 숨김」으로 보고 기본 쿼리에서 뺀다(AGENTS 「테스트 작성의 함정」 — `includeHiddenElements`).
  누름은 불투명 겹이 이미 막지만 닫히는 240ms 동안 겹이 빠지는 자리로 홈 탭이 새지 않게 `pointerEvents`도 둔다.

## R4 — 하위 화면 겹을 홈 위에 놓는 자리와 안전 영역

- **Decision**: 겹은 `AppFrame`의 `SafeAreaView`(네 변 인셋) **밖**이 아니라 같은 부모 안의 `StyleSheet.absoluteFill`이다. 즉 홈과 같은 안전 영역
  안쪽을 덮는다 — 머리 위 여백 56은 상단 인셋 아래에서 잰다(C6 「상단 70px은 safe area로 옮긴다」와 같은 방식). 지면 아래 여백 40은 하단 인셋
  안쪽에서 재므로 제스처 바에 가리지 않는다(FR-012 — `SafeAreaView`가 이미 하단 인셋을 뺀다. 인셋을 두 번 더하지 않는다).
- **실측(2026-10-01)**: 보드의 「위 여백 56」은 iOS 프레임 기준 상태 표시줄(46)을 품은 값이었다 — 그대로 두자 머리가 홈 헤더보다 한참 아래로
  내려앉았다. 홈 헤더가 보드 70을 24로 옮긴 환산(048)을 그대로 따라 10으로 둔다. 또 겹을 `SafeAreaView` 바로 아래에 절대 배치하면 부모의
  패딩(인셋)을 무시해 상태 표시줄·내비게이션 바 밑까지 덮었다 — 홈과 겹을 안쪽 `View` 하나에 담는다.

## R5 — 버전 읽기

- **Decision**: `expo-application`의 `nativeApplicationVersion`(versionName)과 `nativeBuildVersion`(versionCode)을 읽어 「{v} ({b})」로 만든다.
  `npx expo install expo-application`으로 직접 의존성에 올린다.
- **Rationale(문서)**: ctx7 `/expo/expo` — `ApplicationModule.kt`가 `PackageInfo.versionName`·`longVersionCode`를 상수로 준다. 반면
  `expo-constants`의 `Constants.platform.android`는 bare/production에서 빈 맵이라 `versionCode`가 없다(`ConstantsService.kt`), `manifest.android`는
  deprecated. **설치된 바이너리의 값**이 필요하므로 expo-application이다(Metro가 서빙하는 app.json이 아니다).
- **새 네이티브 모듈인가(실측)**: `node_modules/expo-application@57.0.2`가 이미 `expo-notifications`의 의존성으로 들어와 있고 `npx expo-modules-autolinking search -p android`가
  `expo-application 57.0.2`를 찾는다(2026-10-01 실측) — **지금 APK에 이미 링크돼 있다**. 실기기에서 값이 읽히는지로 한 번 더 확인한다. 직접 의존성으로 올리는 것은
  버전 고정을 위해서다. 판정 함수(`formatVersion`)는 순수 함수로 두고 값이 없으면(`null`) 그 부분을 비운다(지어내지 않는다).
- **Alternatives**: `app.json`을 import — 설치본과 다를 수 있다. `expo-constants` — 위 이유.

## R6 — 권한 꼬리표 판정

- **Decision**: `src/app/permission-tags.ts`의 순수 함수 `permissionTagFor(key, facts)`가 `"allowed" | "partial" | "denied" | "unread"`를 낸다
  (`unread` = 꼬리표를 그리지 않음, FR-023). 재료(`PermissionFacts`)는 조립부가 통로에서 모은다:
  - 사진: `photo.photoPermission()`(021) → `granted`/`limited`/…, 사진 위치 정보: **최근 사진 한 장의 좌표를 실제로 읽어 본 결과**
    (`ok` / `denied` / `no-photo`). AGENTS 「`getLocation()`은 권한이 없으면 예외를 던진다」 — 예외 = `denied`, 사진 0장 = `no-photo`.
  - 위치: `location.status()`(021), 알림: `notification.getPermission()`(021).
- **규칙**: 사진 — 사진 권한이 `granted`·`limited`가 아니면 `denied`; `limited`면 `partial`; `granted`이고 위치 정보 `denied`면 `partial`;
  `granted`이고 위치 정보 `ok`/`no-photo`면 `allowed`(FR-021 「재료가 없으면 사진 읽기만으로」). 읽기 실패(`unknown`)면 `unread`.
  위치·알림 — `granted` → `allowed`, `denied`·`blocked`·`undetermined` → `denied`, `unknown` → `unread`.
- **좌표 읽기 통로**: `PhotoPort`에 새 메서드를 더하지 않고, 조립부(`src/app/`)의 작은 통로 `photoLocationProbe()`가 `expo-media-library`로
  최근 사진 1장을 얻어 `getLocation()`을 감싸 부른다 — `src/signals/expo-port.ts` 밖이므로 `checkPhotoPortFile`(023) 검사와 무관하다. 위치 정보
  권한은 이 앱에서 따로 요청하지 않는다(031 — 사진 권한에 묶여 시스템이 처리).
- **`describePhotoAccessLimit`**: `limited` → `partial`과 같은 사실을 준다. 이 기기에서 `visiblePhotoCount` 갈래는 dead path(AGENTS)이므로 쓰지 않는다.
- **Alternatives**: `locationPermission()`(expo-port) — 사진이 보이면 늘 `undetermined`를 줘서(설계상 「모른다」) 판정 재료가 못 된다.

## R7 — 권한 행의 목적지와 복귀 시 다시 읽기

- **Decision**: 네 행 모두 `osSettings.openAppSettings()`(021, `Linking.openSettings()` — 이 앱의 앱 정보 화면). 다시 읽기는 설정 화면이 마운트될 때
  한 번 + `AppState` `change → active`. 판정에 `AppState`를 쓰지 않는다(AGENTS) — 「다시 읽을 때」를 고를 뿐이다(021 SC-006과 같다).
- **바뀌는 것**: 배터리 행의 목적지가 024의 `IGNORE_BATTERY_OPTIMIZATION_SETTINGS` 목록에서 앱 정보 화면으로 바뀐다(보드 「네 행 모두」).
  `battery.openSettingsList()` 통로 자체는 온보딩 배터리 단계가 계속 쓴다.

## R8 — 이름 바꾸기 화면 (Clarification Q3)

- **Decision**: 1a의 입력줄(큰 밑줄 입력 + `n/12` 카운터)을 `src/ui/components/NameField.tsx`로 떼어 `WelcomeScreen`과 새 `RenameScreen`이 같이 쓴다.
  `RenameScreen`은 하위 화면 겹 위에 한 겹 더 쌓이는 화면이다 — 머리 「‹ 설정」(보드의 하위 화면 뒤로 어휘, `6e`·`6h` 마크업 「‹ 설정」),
  큰 제목 「이름」(`settings.name`), 입력줄, 오른쪽 아래 「저장」. 빈 이름이면 `Button`에 `disabled`를 넘겨 흐린다(보드). 키보드는 047의
  `KeyboardAvoidingView behavior="padding"` + `KEYBOARD_OFFSET` 48을 그대로 쓴다(AGENTS ★ edge-to-edge 규칙).
- **Rationale**: 보드 「이름 짓기(1a)와 같은 입력 화면」. 1a의 표지·얼굴·인사 문구는 첫 만남 연출이라 이름 바꾸기에 옮기지 않는다 —
  「같은 입력 화면」은 입력줄을 뜻한다고 본다(짐작, 실기기에서 저장소 소유자 육안 확인 대상). 1a 힌트 「…나중에 설정에서 바꿀 수 있어요.」는
  설정 안에서 틀린 말이라 옮기지 않는다. 새 문구는 「저장」 하나다(보드 메모 낱말).
- **검증**: 저장은 `validateCharacterName`(035 W18) 한 곳. 빈 이름은 화면이 막으므로 「비우면 기본 이름으로 되돌린다」(035 W19)는 이 화면에서
  닿지 않는다 — 조립부 `onRenameCharacter`의 그 갈래는 그대로 둔다(첫 실행 작명·다른 호출자 없음 — tasks에서 호출자를 센다).
- **쓰는 중 이름(FR-009)**: 파이프라인은 시작 때 `characterNames`로 이름을 받는다(`DiaryHomeScreen` → `pipeline.run` 입력). 진행 중인 run의 입력은
  바뀌지 않는다 — 이미 성립. 계약 테스트로 잠근다.

## R9 — 「모듈 다시 받기」 (Clarification Q2, FR-030)

- **Decision**: `DiaryHomeScreen`의 `onGoToSettings` prop을 `onRedownload?: () => Promise<boolean>`로 바꾼다. 실패 안내 화면의 버튼(문구 「모듈 다시 받기」)이
  그것을 부르고, `true`(이미 준비됨)면 `goHome()`으로 쓰기 전 홈으로 돌아간다. 조립부(`AppFrame`)는 `essentialDownloadStarted.current = false`·
  `setDownloadProceedConfirmed(false)`로 다운로드 단계를 다시 열 수 있게 한 뒤 `refreshEssentialsReady()`를 부른다. 준비되지 않았으면
  `essentialsReady=false` → `resolveFirstRunStage`가 `"downloading"`을 내 045·046 진행 화면이 뜨고 다운로드 effect가 돈다(동의는 이미 저장돼 있다).
- **Rationale(실측 — 소스)**: `App.tsx:467-493`의 다운로드 effect는 `essentialDownloadStarted` ref로 세션당 1회만 돈다. 이번 세션에 이미 받은 적이 있으면
  ref가 `true`라 다시 열리지 않는다 — 되돌리지 않으면 진행 화면이 뜬 채 아무것도 받지 않는 조용한 결함이 된다.
- **남는 경우**: 필수 에셋은 준비됐는데 `readyCharacters()`가 비었다(검증 기록 실패 등) → 홈으로 돌아가고 다시 쓰면 같은 안내가 뜬다. 막다른 길은 아니다
  (「← 일기」로 나갈 수 있다). 미확인 잔여로 둔다.

## R10 — 토큰 (C5)

| 보드 | 값 | 코드 |
| --- | --- | --- |
| `neutral-100` 지면 | `#f8f4f4` | `WRITTEN_DAY.paper` 재사용 |
| `neutral-200` 허용됨 면·토글 꺼짐 면 | `#eae7e7` | `WRITTEN_DAY.rewriteBar`와 같은 값 — 새 `SETTINGS.tagFill`이 그 값을 가리킨다 |
| `neutral-500` › | `#9b9797` | 새 `SETTINGS.chevron` |
| `neutral-600` 값·보조 줄 | `#7d7979` | **`COLORS.textMuted`(`#6b6767`)** — 043의 AA 조정을 따른다(C5) |
| `neutral-800` 허용됨 글자 | `#444141` | 새 `SETTINGS.tagText` |
| `accent-700` 허용 안 함 글자 | `#ae1800` | `COLORS.danger`(같은 값) |
| `divider` 행 구분선 | `#201e1d` 40% | `COLORS.border`(불투명 근사, DT1) |
| 일부 허용 회색 테두리 | (메모만) | `COLORS.border` |

`theme-tokens.test.ts`에 대비 하한을 더한다: `tagText` on `tagFill` ≥ 4.5, `danger` on `paper` ≥ 4.5, `textMuted` on `paper` ≥ 4.5, `chevron`은 장식(› 글리프)이라 3:1을 하한으로 —
값이 그보다 낮으면(짐작 약 2.6:1) 보드 값을 그대로 쓰고 「장식이라 대비 규칙 밖」을 주석·테스트 이름에 적는다(저장소 소유자 결정 없이 색을 바꾸지 않는다).

## R11 — Maestro 영향 (C8)

- `diary-home-1d.yml`: M1의 `assertNotVisible: id: "home-menu-button"`를 「`home-settings`가 보인다」로 바꾸고, 점 세 개 → 설정 → 「‹ 일기」·뒤로 가기 왕복 단언을 더한다.
- `home-kicker`를 쓰는 흐름: jest 두 파일(`diary-list.test.tsx`·`home-navigation.test.tsx`) 외 Maestro에는 없다(grep 실측 — `.maestro`의 열한 파일은
  `back-to-home`이나 옛 메뉴를 쓴다). `back-to-home` testID는 새 머리의 「‹ 일기」에 그대로 둔다(흐름 수정을 줄인다).
- FLOWS 밖 열한 흐름: 설정 경로를 새 진입점으로 바꿔도 캐릭터 목록(`CharacterListScreen`)·`⋯` 메뉴에 기대는 단계는 되살릴 수 없다. 이 조각에서는
  흐름 파일 머리 주석에 「055 — 설정 진입은 `home-settings`. 캐릭터 목록이 사라져 폐기 후보(대체 경로는 개발자 메뉴 조각)」 한 줄을 남기고 FLOWS에 넣지 않는다.

## R12 — 실기기에서 정한 두 결정 (2026-10-01, SM-S901N)

- **Decision**: (1) `AppFrame`·`DiarySection`의 환경 판정을 `useState(() => currentEnvironment())`로 마운트 때 한 번만 한다. (2) 홈과 겹을
  `SafeAreaView` 안의 `View`(`styles.stack`, `flex: 1`) 하나에 담는다.
- **Rationale(실측)**: (1) `currentEnvironment()`는 부를 때마다 새 객체다. 설정을 열면 `AppFrame`이 다시 그려지고(`route`·겹 마운트 상태)
  `DiarySection`이 새 `resolution`을 넘기면 `DiaryHomeScreen`의 「목록을 다시 읽어 처음 화면으로」 effect가 돌아 **쓰는 중 화면이 안 쓴 날로
  바뀌고 생성은 뒤에서 계속 돌아 저장됐다**(로그: 화면 `writing → list`가 겹이 열린 지 0.3초 뒤, 모델 적재는 그 3초 뒤). jest S5는 같은 상수로 다시
  그려 못 잡았다 — `settings-stack.test.tsx`가 소스로 잠근다. (2) 절대 배치는 부모의 패딩을 무시한다 — 겹이 상태 표시줄·내비게이션 바 밑까지 덮었다.
- **Alternatives**: `DiaryHomeScreen`의 effect를 `resolution.ok`·`environment` 값으로 비교하게 고치기 — 화면 계약(005·006)을 건드리고, 같은 값에 기대던
  `wiring`(`createAppPipeline`)이 렌더마다 새로 만들어지는 것도 남는다. 원인(새 객체)을 없앤다.

