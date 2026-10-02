# Research: 개발자 메뉴 (059)

clarify가 정한 넷(다시 받기 범위·Wi-Fi·온보딩 범위·개발 환경 끄기)과 분해 설계 §3.5의 대조를 코드에 옮기는 데 필요한 결정. 새 라이브러리는 `expo-network` 하나 —
ctx7(`/websites/expo_dev_versions_unversioned`)로 `getNetworkStateAsync()`의 반환(`{ type: NetworkStateType, isConnected, isInternetReachable }`)과 Android 권한
(`ACCESS_NETWORK_STATE`·`ACCESS_WIFI_STATE`, 설치 시 구성에 자동 추가)을 확인했다. 그 밖의 파일·UI 사실은 이 저장소의 코드를 읽어 얻었다.

## R1 — 켜짐 상태는 별도 파일 하나, 환경이 이긴다

- **Decision**: `preferences/developer-menu.json`에 `{"enabled": true}`를 담는다(켜짐일 때만 파일이 있다. 끄면 파일을 지운다). `auto-diary.json`·`onboarding.json`에 필드를 더하지 않는다(D3).
  통로는 `skip-store.ts`(057)와 같은 모양 — `read`/`write`/`remove`를 주입받는 순수 함수(`loadDeveloperMenu`·`saveDeveloperMenu`·`clearDeveloperMenu`)와 expo 구현 한 벌. 읽기는 던지지 않고
  없음·깨짐·모양이 다름·통로 예외는 전부 꺼짐이다(원칙 V). 값은 켜짐 여부 하나뿐이다 — 켠 시각·탭 횟수를 담지 않는다(원칙 IV, `settings.ts` S7).
  개발 환경(`showsOnScreen(environment)`)은 파일과 무관하게 켜짐이고 끄기는 **세션 상태**로만 한다(R2).
- **Rationale**: 사실 하나(켜짐)에 파일 하나가 057의 선례다. 「파일 없음 = 꺼짐」이라 `false`를 따로 쓸 일이 없고 깨진 파일의 기본이 정직하다.
- **Alternatives**: 온보딩 플래그에 필드 추가 — 021 `FLAG_GROWS_HISTORY`가 막은 패턴. `AsyncStorage` — 새 의존성.

## R2 — 켜짐 훅 `useDeveloperMenu`: 환경 + 파일 + 세션 꺼짐

- **Decision**: `src/ui/use-developer-menu.ts`가 `{ enabled, enable, disable }`을 준다. 값: `devEnvironment`(= `showsOnScreen`)이면 `enabled = !sessionOff`, 아니면 `enabled = persisted`(읽기 전 `false`).
  `enable()`: 개발 환경이면 `sessionOff = false`, 아니면 `persisted = true` + 파일 쓰기(실패해도 그 실행에서는 켜짐 유지, FR-009). `disable()`: 개발 환경이면 `sessionOff = true`(파일 불변),
  아니면 `persisted = false` + 파일 지우기(실패해도 상태는 꺼짐). 상태는 `AppFrame`이 한 번 든다(056의 설정 값 보관과 같은 이유 — 설정 겹이 닫히면 언마운트되므로).
  파일은 앱 실행마다 마운트 때 한 번 읽는다.
- **Rationale**: spec FR-008·009·023·024가 정확히 이 세 갈래다. 환경 판정은 마운트 때 한 번 얻은 값을 받는다(`currentEnvironment()`는 부를 때마다 새 객체 — 055 결함).
- **Alternatives**: 파일에 개발 환경 끄기까지 저장 — 보드·Clarification Q4와 다르다.

## R3 — 모듈 다시 받기: 받을 것이 없으면 대화상자 대신 토스트

- **Decision**: 「모듈 다시 받기」를 누르면 `planRedownload()`(순수 조합)가 필수 모듈의 준비 상태·받을 양·연결 종류를 읽어 `{ kind: "nothing" }`(전부 준비됨) 또는
  `{ kind: "confirm", cellularSize: string | null }`을 준다. `nothing`이면 개발자 화면에 머문 채 「이미 모두 준비돼 있어요」 토스트(보드 밖 문구, 표시). `confirm`이면 050 `ConfirmDialog`:
  제목 「모듈을 다시 받을까요?」, 본문은 `cellularSize !== null`이면 「모바일 데이터로 {size}를 받아요.」(보드 `dev.redownload.cellular` 「모바일 데이터로 {size}」를 문장 틀로 잇는다)
  아니면 「빠진 모듈을 받아요. 이미 받은 것은 그대로 둬요.」, 버튼 「받기」·「취소」(보드 밖, 해요체). 읽는 동안(수십 ms) 행은 그대로 둔다 — 대화상자가 늦게 뜨는 것은 허용.
- **Rationale**: 055의 `onRedownload`는 쓰기 전 안내 화면에서 온 호출이라 「이미 준비돼 있으면 홈으로」가 맞았다. 개발자 화면에서는 조용히 홈으로 가면 아무 일도 안 일어난 것처럼 보인다.
  `essentialsReady`가 true면 `onRedownload`는 아무것도 받지 않고 `true`만 돌려주므로 확인을 거쳐 보여 줄 이유가 없다.
- **Alternatives**: 늘 확인을 띄우고 「받을 것이 없어요」 — 취소만 있는 대화상자는 용도가 없다.

## R4 — 모듈 줄: 「읽는 모듈」 = v1+v2, 「쓰는 모듈」 = 기본 캐릭터의 키, 상태어는 준비 상태에서

- **Decision**: `src/app/module-lines.ts`가 조립 계층에서 키를 판정해 `{ reading: string | null, writing: string | null }`을 준다. 「쓰는」 키 = `assetFor(ONBOARDING_DEFAULT_CHARACTER).key`(`a1`),
  「읽는」 = `ESSENTIAL_ASSET_KEYS`에서 그것을 뺀 나머지(`v1`·`v2`) — 로스터가 늘어도 필수 목록 상수가 그대로 기준이다. 크기는 058 `formatModuleBytes`(1000 기준), 상태어는 준비 상태의 다섯 갈래를
  짧은 영문으로 옮긴다: `ready` → `loaded`(보드 원문), `partial` → `partial`, `not-downloaded` → `missing`, `unusable` → `unusable`. 줄 문자열은 「{상태} · {크기}」(예: `loaded · 610MB`).
  읽기에 실패한 줄은 `null` — 화면은 값을 비운다. 상태를 읽었는데 크기를 못 읽었으면 상태만(`loaded`)이 아니라 `null`로 통일한다(반쪽 값을 지어내지 않는다).
- **Rationale**: 보드의 `loaded`는 영문 상태어를 그대로 두라는 뜻이다(분해 설계 대조: 「보드대로(개발자 화면)」). 그 값이 진단의 `moduleStatus`(llama 네이티브 모듈 적재)가 아니라 **파일 준비 상태**임은
  이 조각의 해석이다 — 「loaded」가 메모리 적재를 뜻하지 않는다(알려진 어휘 어긋남, 미확인 잔여로 적는다). 모델 이름은 어디서도 읽지 않는다(원칙 III).
- **Alternatives**: 진단의 `report.moduleStatus`를 재사용 — 한 줄뿐이고 읽는/쓰는을 가르지 못한다.

## R5 — Wi-Fi 판정: `expo-network`, 모바일이 확인될 때만 문구

- **Decision**: `src/app/network-port.ts`가 `readConnection()`을 준다 — `getNetworkStateAsync()`를 지연 import로 부르고 `NetworkStateType.WIFI` → `"wifi"`, `CELLULAR` → `"cellular"`, 그 밖
  (`ETHERNET`·`VPN`·`BLUETOOTH`·`OTHER`·`NONE`·`UNKNOWN`)은 `"other"`, 던지면 `"unknown"`. 「모바일 데이터로 {size}」는 **`"cellular"`일 때만** 보인다 — `other`·`unknown`(VPN 위의 Wi-Fi일 수
  있다)은 문구를 빼고 용량도 말하지 않는다. 받을 양은 `essential-assets-port`가 준다: 준비되지 않은 키마다 `expectedBytes − bytesUsed`(0 이상)의 합(받다 만 조각은 이어받으므로 이미 받은 만큼 뺀다).
  비교 결과는 문자열 하나(`formatModuleBytes`)로 화면에 간다.
- **Rationale**: 확인된 것만 말한다(원칙 V). 「Wi-Fi가 아니면」을 「모바일이 확인되면」으로 좁히는 이유는 VPN·이더넷에서 거짓 경고를 피하려는 것이다. 새 의존성은 `expo install expo-network`로 SDK 57이
  고른 버전을 쓴다(AGENTS — 버전을 추측하지 않는다). 필요한 권한이 일반 권한이라 온보딩 흐름·`requirements.ts`는 그대로다.
- **Alternatives**: `Platform` 휴리스틱·`fetch` 지연 측정 — 정직하지 않다. `@react-native-community/netinfo` — 같은 일을 하는 다른 네이티브 의존성.

## R6 — 다시 받기 전에 쓰는 중인 홈을 먼저 멈춘다 (`stopHome` 추출)

- **Decision**: 058의 `requestWipe`가 하던 「요청 토큰을 올리고 홈이 멈춘 뒤 응답을 기다림」을 `stopHome(): Promise<void>`로 뽑아 `requestWipe`와 다시 받기가 함께 쓴다(동작 불변, 058 계약 HS1~HS6 그대로).
  다시 받기 확정 순서: `stopHome()` → `onRedownload()`(055의 되돌림 + 필수 모듈 다시 읽기) → 겹 닫기(`goHome`). `onRedownload`가 `essentialsReady=false`를 세우면 프레임이 다운로드 진행 화면으로 갈라지고 홈이 언마운트된다.
- **Rationale**: 필수 모듈이 빠졌어도(예: 사진 모듈만 없고 사진 없는 하루) 쓰기는 시작될 수 있다 — 홈이 언마운트되면 생성이 뒤에서 이어져 저장되거나 잠금을 쥔 채 남을 수 있다. 058이 이미 같은 문제를 풀었고 멈춤 경로는
  054가 검증했다. 쓰는 중이 아니면 `stopHome`은 곧바로 끝난다.
- **Alternatives**: 쓰는 중이면 다시 받기를 막기 — 홈 상태를 `AppFrame`이 모른다(054 `AppScreen` 불변). 059가 두 곳에서 같은 일을 하게 되므로 추출이 맞다.

## R7 — ★ 온보딩부터 다시: `forceOnboarding`이 지금 죽어 있다 — 고쳐서 쓴다

- **Decision**: `App.tsx`의 `permissionStepsDecided = permissionStepsDecidedThisSession || onboardingFlag?.completed === true`가 `completed`인 기기에서 늘 참이라
  `onboardingGateNeeded = (completed !== true || forceOnboarding) && !permissionStepsDecided`가 `forceOnboarding`을 켜도 거짓이다 — 021 이후 이 경로를 켜는 코드(설정 「권한」 섹션의 「온보딩 다시 하기」)가
  055에서 걷히기 전에도 `completed` 기기에서는 동작하지 않았을 수 있다(테스트가 `App.tsx`를 못 건드려 못 잡았다 — `flag.test.ts`는 주석만 언급). 고침:
  `permissionStepsDecided = permissionStepsDecidedThisSession || (completed === true && !forceOnboarding)`. 「온보딩부터 다시」 핸들러는 `setForceOnboarding(true)` + `setPermissionStepsDecidedThisSession(false)` +
  `setOnboardingStarted(false)`(로고를 다시 보인다) + 겹 닫기(`goHome`)다. 권한 단계가 끝나면 `onAllPermissionStepsDecided`가 `setForceOnboarding(false)`도 한다
  (세션 결정이 참이라 게이트가 닫힌 채로 남는다). 동의·작명·다운로드는 영속 플래그·실시간 에셋 상태로 이미 판정돼 있어 그대로 지나간다(Clarification Q3).
- **쓰는 중인 홈은 먼저 멈춘다**: 게이트가 켜지면 프레임이 온보딩 화면으로 바뀌어 홈이 언마운트된다 — R6의 `stopHome()`을 `onReplayOnboarding`도 먼저 부른다(`await stopHome()` → 상태 세 개 → `goHome()`). 안 그러면 생성이 고아로 남는다.
- **Rationale**: 이 장치가 이 조각의 유일한 진입 경로다 — 고치지 않으면 행이 아무 일도 하지 않는다(조용한 결함, AGENTS 「조용히 실패하는 결함」). `onboardingStarted`를 되돌리지 않으면 로고 없이 곧바로 권한 단계가 뜬다.
- **Alternatives**: 새 `replayRequested` 상태 — 같은 일을 하는 두 번째 장치.
- **검증**: 기기 없는 테스트는 `App.tsx`가 아니라 게이트 판정을 순수 함수로 뗀 `onboardingGateNeeded(...)`(src/app)로 잠근다 — 위 식을 그 함수에 옮긴다. 실기기에서 눈으로 확인한다(quickstart).

## R8 — 개발자 겹·진단 겹: 055의 `StackLayer` 규칙을 그대로

- **Decision**: **설정 겹은 개발자가 열린 동안에도 열려 있다** — `route`가 한 값이라 `open={route === "settings"}`로 두면 개발자로 갈 때 설정이 밀려 나간다. 설정 겹은 `open={route === "settings" || route === "developer"}`, `active={!renaming && route !== "developer"}`(위에 다른 겹이 있으면 뒤로 가기를 등록하지 않는다 — 055 S6)로 바꾼다. 개발자 겹은 `open={route === "developer" && developerEnabled}`로 바꾼다(055의 `showsDiagnostics && ...` 조건을 대체 — 배포에서도 열린다). 진단은 개발자 겹 위의 한 겹 더(`diagnosing` 상태,
  이름 바꾸기 `renaming`과 같은 방식 — 개발자 겹은 `active={!diagnosing}`, `open={showsDiagnostics && diagnosing}`)이고 `route`는 늘리지 않는다. 개발자 메뉴를 끄면 `route: "settings"`로 돌아가며 `diagnosing=false`.
  `homeCovered`·`layersMounted`에 진단 겹을 더하지 않는다(진단은 개발자 위라 개발자 겹이 이미 홈을 덮고 있다). 진단 겹의 틀은 `SettingsFrame`(제목 「진단」, 뒤로 「개발자」), 내용은 기존
  `DiagnosticsScreen`(`characterNames`) 그대로다. `showsOnScreen` 판정은 한 곳(`showsDiagnostics`)에서만 한다 — 진단 컴포넌트는 그 값이 참일 때만 만들어진다(BD3).
- **Rationale**: 055 겹 규칙(`active`·`covered`)이 이미 검증됐다. 배포에서 `DiagnosticsScreen`이 트리에 없어야 한다(S7) — `StackLayer`가 닫힌 동안 언마운트하므로 `open` 조건 + 렌더 조건 둘 다 `showsDiagnostics`.
- **Alternatives**: `route`에 `"diagnostics"` 추가 — 058 `AppFrame`의 `route` 분기가 늘어난다.

## R9 — 걷은 옛 화면 정리 범위

- **Decision**: 삭제 — `CharacterListScreen`·`PermissionsSection`·`AuthorPicker`(055가 조립에서 걷은 것)와 **그것들만 쓰던** `CharacterPicker`(진입점 없음)·`components/ListRow`·`components/SelectRow`, 그리고 자기 테스트
  (`character-list*.test.tsx`·`author-picker.test.tsx`·`permissions-section.test.tsx`·`character-picker.test.tsx`·`list-row.test.tsx`·`select-row.test.tsx`·`enduser-screen-migration`/`press-feedback`/`settings-stack`/
  `character-name-flow`·`boundaries`·`check-constitution` 안의 해당 부분). **공유 계약을 먼저 읽고 지운다**: 이 테스트들 중 일부는 다른 화면이 기대는 규칙(`Button` 눌림·`NameField`·헌법 검사 `UI_TOUCHES_*` 규칙의 근거)을
  함께 잠근다 — 지우기 전 각 테스트의 단언이 여전히 쓰는 부품을 가리키는지 확인하고, 가리키면 그 단언을 쓰는 화면으로 옮기고 지운다. `scripts/constitution-rules.ts` 주석의 옛 화면 이름은 규칙의 근거 설명이라
  주석만 고친다(규칙 자체는 `src/ui/` 경계라 그대로). 위반 주입으로 헌법 검사가 같은 위반을 여전히 잡는지 본다(`__tests__/scripts/check-constitution.test.ts`는 해당 화면 이름을 가진 픽스처를 쓰는지 확인).
- **Rationale**: 쓰는 곳이 없는 코드는 이후 조각의 계약 테스트를 헷갈리게 한다(AGENTS). 055가 「파일·자기 테스트는 남겼다 — 정리는 개발자 메뉴 조각」이라고 못 박았다.
- **Alternatives**: 남겨 둔다 — 로스터가 늘면 쓰일 수 있다는 근거(037)는 있으나 그때는 새 설계가 필요하고 git 히스토리에 있다.

## R10 — Maestro 흐름 열한 개: 기준과 잠정 판정

- **Decision**: 기준 — (a) 새 진입(개발 환경은 설정 → 「개발자」 처음부터 켜짐)으로 같은 사실을 여전히 볼 수 있으면 고쳐 `FLOWS`에 등록, (b) 검증 대상(캐릭터 목록·작성자 고르기·사진 보기 설정·「⋯」 메뉴)이 제품에서 사라졌으면 폐기.
  잠정 판정(구현 때 파일을 읽어 확정): **되살림** `skeleton`(개발자 → 진단 → 환경·추론 위치·모듈 상태), `prompt-preview`(개발자 → 진단 → 프롬프트 미리보기), `diary-body-screen`(M1은 쓴 날 읽기, M3는 `settings-place-names`
  — 이미 056이 고침, 개발자 단계 없음), `scheduled-diary-notification`(056이 새 자리로 고침, 남은 stale한 개발자 탭 단계만 새 경로로 — 개발 환경에서만 의미가 있음); **폐기** `model-acquisition`·`diary-character-select`·
  `diary-user-path`·`download-conflict`·`parallel-model-download`·`photo-vision`·`welcome-naming`(검증 대상이 제품에서 사라졌다 — 캐릭터 목록·작성자 고르기·사진 보기 설정·`⋯` 메뉴). 폐기는 파일 삭제 + `FLOWS` 주석 한 줄(사유 포함),
  AGENTS 「FLOWS 밖에 있는 것」 문단 갱신.
- **Rationale**: 건너뛴 흐름은 통과가 아니다(원칙 V) — 등록하지 않은 흐름은 아무것도 검증하지 않는 초록불이다. 그렇다고 대상이 사라진 흐름을 억지로 살리면 새로운 거짓 초록이 된다.

## R11 — 토스트와 강조

- **Decision**: 설정·개발자의 토스트는 새 부품 `DeveloperToast`(제목 + 선택 보조 줄, 2초 뒤 사라짐, 페이드만 — 쓸어 닫기 없음)다. 054 `FailureToast`는 실패 전용(3초·쓸어 닫기)이라 재사용하지 않고 `TOAST` 토큰만 공유한다.
  한 번에 하나(새 토스트가 이전을 대신, `key`로 새로 마운트 — 049 교훈). 「개발자」 행 강조는 `SETTINGS.rowHighlight`(#fff2ef, 보드 accent-100)를 행 바탕으로 1.5초 두었다가 되돌린다(시작값을 마운트 값으로 — `useEffect`로 되돌리면 한 프레임이 샌다).
- **Rationale**: 054 토스트는 하단 바 높이에 묶여 있어 설정 겹에서 그 계산을 끌고 오는 것이 더 크다.

## R12 — 연속 탭 판정은 순수 함수, 상태는 설정 겹이 든다

- **Decision**: `registerTap(state, nowMs, alreadyOn)`가 `{ state: { count, lastAt }, effect: "none" | { tapsLeft: n } | "enabled" | "already-on" }`을 준다. 간격이 `TAP_WINDOW_MS`(1000) **이하**이면 이어 세고 넘으면
  1로 다시 센다. `count < 4`면 `none`, 4~6이면 `tapsLeft = 7 − count`, 7이면 `alreadyOn ? "already-on" : "enabled"` + 횟수 초기화. `alreadyOn`일 때 4~6번째는 `none`(FR-004). 상태는
  `SettingsSection`의 `useRef`(설정 겹이 열려 있는 동안만 산다 — 닫히면 언마운트되어 비워진다, Edge Case)다.
- **Rationale**: `now`를 인자로 받으면 기기·타이머 없이 경계(정확히 1000ms 포함)를 잠글 수 있다(`day-boundary.ts` 관례, AGENTS 「시계 인자」).
