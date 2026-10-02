# Contract: 개발자 메뉴 (059)

테스트가 잠그는 약속. 이름은 테스트 `describe`에 그대로 쓴다.

## TP — 연속 탭 판정 (`src/app/developer-taps.ts`, 순수 · `logic`)

- **TP1** 첫 탭은 `count 1`, `effect none`이다. 같은 간격 안의 1~3번째 탭은 모두 `none`.
- **TP2** 탭 사이가 1000ms **이하**이면 이어 센다, 1001ms면 그 탭이 1번째다(경계 포함).
- **TP3** 4·5·6번째 탭은 `tapsLeft 3 / 2 / 1`이다.
- **TP4** 7번째 탭은 `alreadyOn=false`이면 `enabled`, `true`이면 `already-on`이고 횟수를 0으로 되돌린다.
- **TP5** `alreadyOn=true`이면 4~6번째 탭은 `none`이다(FR-004).
- **TP6** 함수는 `new Date()`·`Date.now()`를 부르지 않는다(소스 계약 — `now`는 인자).
- **TP7** `lastAt`이 `null`(첫 탭)이면 간격 판정 없이 1번째다.

## DS — 켜짐 파일 (`src/app/developer-menu-store.ts`, `logic`)

- **DS1** `saveDeveloperMenu(port)`는 `{"enabled":true}` 하나만 쓴다 — 시각·횟수 필드가 없다(소스 계약: 직렬화 객체의 키가 `enabled` 하나).
- **DS2** `clearDeveloperMenu`는 `remove()`를 부른다. 파일이 없어도 던지지 않는다.
- **DS3** `loadDeveloperMenu`: 파일 없음·깨진 JSON·`enabled`가 `true`가 아님·통로 예외는 전부 `false`다. 던지지 않는다.
- **DS4** 통로 구현은 `preferences/developer-menu.json`이고 `auto-diary.json`·`onboarding.json`·`auto-write-skipped.json`을 읽거나 쓰지 않는다(소스 계약).

## HK — 켜짐 훅 (`src/ui/use-developer-menu.ts`, `ui`)

- **HK1** 개발 환경: 파일이 꺼짐이어도 `enabled`가 참이고 마운트 때 파일을 읽지도 않는다.
- **HK2** 개발 환경 `disable()` 뒤 `enabled`는 거짓이고 파일 통로는 호출되지 않았다. 그 뒤 `enable()`은 `enabled`를 다시 참으로 한다(파일 쓰기 없음).
- **HK3** 배포 환경: 파일을 읽기 전·읽기 실패는 `enabled` 거짓. 파일이 켜짐이면 참.
- **HK4** 배포 `enable()`은 파일을 쓰고, 쓰기가 던져도 `enabled`는 참으로 남는다. `disable()`은 파일을 지우고, 지우기가 던져도 `enabled`는 거짓이다.
- **HK5** 환경 값은 마운트 때 한 번 받은 것을 쓴다(`currentEnvironment()`를 렌더마다 부르지 않는다 — 055).

## DV — 설정의 진입과 개발자 화면 (`SettingsScreen`·`DeveloperScreen`, `ui`)

- **DV1** 설정 「정보」의 `settings-version` 행을 누를 수 있다(`onPressVersion`). 개발자 메뉴가 꺼져 있으면 「개발자」 행(`settings-developer`)이 없고 켜져 있으면 「정보」 묶음 맨 아래에 있다.
- **DV2** `developerHighlight`가 참이면 「개발자」 행 바탕이 `SETTINGS.rowHighlight`, 아니면 바탕 없음. 강조는 1.5초 뒤 거짓으로 바뀐다(가짜 타이머).
- **DV3** 「개발자」 행을 누르면 `onOpenDeveloper`가 불린다.
- **DV4** 개발자 화면(`developer-screen`)에 「모듈」 그룹의 두 줄(`developer-module-reading`·`developer-module-writing`)과 「모듈 다시 받기」(`developer-redownload`),
  「다시 보기」 그룹의 「온보딩부터 다시」(`developer-replay-onboarding`), 「개발자 메뉴 끄기」(`developer-off`)가 있다. 모듈 줄이 `null`이면 값이 빈다.
- **DV5** 배포 환경 props(`showsDiagnostics=false`)에서 「진단」 그룹·`developer-diagnostics` 행이 없다. 개발 환경 props에서는 「모듈」과 「다시 보기」 사이에 있고 「개발 빌드만」 표지가 보인다.
- **DV6** 머리글 오른쪽 글자는 `buildLabel`이다 — 개발 환경 「DEV · …」, 배포 환경에는 「DEV」가 없다.
- **DV7** 「모듈 다시 받기」 → `onRedownload`, 「온보딩부터 다시」 → `onReplayOnboarding`, 「개발자 메뉴 끄기」 → `onDisable`, 「진단」 → `onOpenDiagnostics`가 불린다.
- **DV8** 문구 원문: `about.developer` 「개발자」, `dev.title`·`dev.group.modules`·`dev.readModule`·`dev.writeModule`·`dev.redownload`·`dev.group.diag`·`dev.diag`·`dev.devOnly`·`dev.group.replay`·
  `dev.replayOnboarding`·`dev.off`·`dev.tapsLeft`·`dev.enabled`·`dev.enabledSub`·`dev.already`가 글자 단위로 같다(`developer-text.ts`).
- **DV9** 모듈 줄 값은 고정폭 글꼴이다.
- **DV10** 토스트는 새 문구가 이전 것을 대신한다(한 번에 하나, `key`가 바뀐다). 2초 뒤 사라진다(가짜 타이머).
- **DV11** 개발자가 열린 동안 설정 겹은 닫히지 않는다 — 소스 계약: 설정 `StackLayer`의 `open`이 `route === "developer"`도 포함하고 `active`가 `route !== "developer"`를 포함한다. 개발자 「‹ 설정」은 `route`를 `"settings"`로 되돌릴 뿐 설정 겹을 다시 열지 않는다.
- **DV12** `useDeveloperTaps`(`src/ui/use-developer-taps.ts`): 4번째 탭에 토스트 「개발자 메뉴까지 3번 남았어요」, 7번째에 `onEnable`·토스트 `enabled`+`enabledSub`·`highlight` 참이 1.5초 뒤 거짓; `alreadyOn`이면 7번째에 `already`; 새 토스트가 이전을 대신하고 2초 뒤 `toast`가 `null`.

## BL — 머리글 글자 (`src/app/developer-build-label.ts`, `logic`)

- **BL1** `buildLabelFor({ devEnvironment, versionText })`: 개발 환경 + `"1.0.0 (24)"` → `"DEV · 1.0.0 (24)"`, 배포 + 같은 값 → `"1.0.0 (24)"`, 개발 환경 + `null` → `"DEV"`, 배포 + `null` → `""`(지어내지 않는다, 원칙 V).

## MD — 모듈 줄 (`src/app/module-lines.ts`, `logic`)

- **MD1** 「쓰는」 키는 `assetFor(ONBOARDING_DEFAULT_CHARACTER).key`, 「읽는」은 `ESSENTIAL_ASSET_KEYS`에서 그것을 뺀 나머지다. 읽는 크기는 그 키들의 `bytesUsed` 합.
- **MD2** 준비 상태 → 상태어: `ready`→`loaded`, `partial`→`partial`, `not-downloaded`→`missing`, `unusable`→`unusable`. 줄 문자열 = 「{상태} · {formatModuleBytes}」.
- **MD3** 반환 문자열에 모델 이름·키·URL·확장자가 들어가지 않는다(원칙 III — 정규식 계약).
- **MD4** 한 줄의 상태나 크기를 읽다 던지면 그 줄만 `null`이다(다른 줄은 그대로).
- **MD5** `src/ui/`는 `module-lines`의 입력(키 목록·파일 통로)을 import하지 않는다 — 화면은 문자열만 받는다(`UI_TOUCHES_ASSET`).

## RD — 다시 받기 계획 (`src/app/redownload-plan.ts` · `network-port.ts`, `logic`)

- **RD1** 필수 모듈이 모두 준비됐으면 `{ kind: "nothing" }`이고 연결 종류를 읽지 않는다.
- **RD2** 빠진 것이 있으면 `{ kind: "confirm" }`이다. `cellularSize`는 연결이 `"cellular"`일 때만 문자열(받을 양의 `formatModuleBytes`)이다.
- **RD3** 연결이 `"wifi"`·`"other"`·`"unknown"`이면 `cellularSize === null`이다(연결 종류를 읽다 던져도 `confirm`이고 null).
- **RD4** 받을 양은 준비되지 않은 키마다 `max(0, expectedBytes − bytesUsed)`의 합이다(받다 만 만큼 뺀다). `bytesUsed`를 못 읽은 키는 `expectedBytes` 전체로 센다(적게 말하지 않는다).
- **RD5** `readConnection`: `WIFI`→`wifi`, `CELLULAR`→`cellular`, 나머지 타입→`other`, 던지면 `unknown`(`expo-network`를 지연 import로 부르고 jest 대역으로 갈아끼운다).
- **RD6** 이 경로는 모듈 파일을 지우는 호출이 없다(소스 계약 — `remove`·`delete`·`removeAll` 어휘 없음, 037).
- **RD7** `package.json`의 직접 의존성에 `expo-network`가 있고 `src/`에서 그것을 import하는 곳은 `network-port.ts` 하나다.

## OB — 온보딩부터 다시 (`App.tsx` 게이트 · `src/app/onboarding-gate.ts`, `logic`)

- **OB1** `onboardingGateNeeded({ completed, force, decidedThisSession })`: `(completed !== true || force) && !decidedThisSession`. `completed=true`·`force=true`·`decidedThisSession=false` → **참**(이 조각이 고친 갈래).
- **OB2** `completed=true`·`force=false` → 거짓. `decidedThisSession=true` → 거짓(권한 단계가 끝난 뒤 게이트가 닫힌다).
- **OB3** 소스 계약: 「온보딩부터 다시」 핸들러는 `await stopHome()`(홈이 언마운트되기 전에 쓰는 중을 멈춘다) 뒤에 `setForceOnboarding(true)`·`setPermissionStepsDecidedThisSession(false)`·`setOnboardingStarted(false)`를 모두 부른다(로고가 다시 나온다). `onAllPermissionStepsDecided`는 `setForceOnboarding(false)`를 부른다.
- **OB4** 소스 계약: 이 경로는 일기·이름·설정·모듈 파일에 닿는 호출이 없다(`removeAll`·`saveCustomNames`·`saveAutoDiarySettings`·`remove(` 어휘 없음).

## OF — 끄기

- **OF1** 개발자 화면의 「개발자 메뉴 끄기」를 누르면 `onDisable`이 불리고 개발자 겹이 설정으로 돌아가며 `settings-developer` 행이 사라진다.
- **OF2** 배포 환경 끄기는 파일을 지운다(HK4). 개발 환경 끄기는 파일을 건드리지 않는다(HK2).
- **OF3** 끄기 뒤 7번 탭은 다시 켠다(TP4·HK2·HK4).

## DG — 진단 진입

- **DG1** 개발 환경에서 `developer-diagnostics`를 누르면 `DiagnosticsScreen`이 개발자 겹 위에 그려지고 뒤로 가기는 개발자 화면이다.
- **DG2** 소스 계약: `DiagnosticsScreen`을 import·렌더하는 곳은 `App.tsx`의 `showsDiagnostics`로 막힌 한 자리뿐이다(BD3). `DeveloperScreen.tsx`는 `DiagnosticsScreen`을 import하지 않는다(행만 그린다).

## BD — 경계

- **BD1** `src/ui/DeveloperScreen.tsx`·`use-developer-menu.ts`·`SettingsScreen.tsx`는 `models/roster`·`ModelAsset`·`ESSENTIAL_ASSET_KEYS`에 닿지 못한다(헌법 검사 `UI_TOUCHES_ASSET`·`UI_TOUCHES_MODEL`).
- **BD2** `process.env`는 `src/config/environment.ts`에서만 읽는다 — 새 파일에 `process.env`·`__DEV__`가 없다(FR-009a, D2).
- **BD3** `showsOnScreen`을 부르는 곳은 `App.tsx`의 한 자리(`showsDiagnostics`)이고, 진단·(훗날) 상태 흉내는 그 값이 참일 때만 만들어진다(S7).
- **BD4** 새 문구는 `developer-text.ts`·`settings-text.ts`에만 있고, 보드 밖 문구는 주석으로 표시된다.

## CL — 정리

- **CL1** `CharacterListScreen`·`PermissionsSection`·`AuthorPicker`(+ 쓰는 곳이 사라진 `CharacterPicker`·`ListRow`·`SelectRow`)와 자기 테스트가 없고, `src/`·`__tests__/`·`scripts/` 안에 그 이름의 import가 없다(주석 제외).
- **CL2** `npm test`·`npm run lint`(eslint·tsc·헌법 검사·prettier)가 통과한다. 헌법 검사의 `UI_TOUCHES_*` 규칙이 같은 위반을 여전히 잡는다(위반 주입: `src/ui/DeveloperScreen.tsx`에 `ESSENTIAL_ASSET_KEYS` import 한 줄).

## FL — Maestro

- **FL1** `.maestro/`의 열한 흐름 각각은 되살려 `FLOWS`에 등록됐거나 파일이 삭제되고 `FLOWS` 주석에 사유 한 줄이 있다. AGENTS 「FLOWS 밖」 문단이 새 사실로 고쳐졌다.
- **FL2** 되살린 흐름은 새 진입(`home-settings` → `settings-developer` [→ `developer-diagnostics`])을 `id:`로 누르고 dev 실기기에서 한 번 돌아 통과했다.

## TX — 문구 (`developer-text.ts`)

보드 KO 원문(`dev.*`·`about.developer`)과 보드 밖 문구(표시)를 가른다. 보드 밖: 「이미 모두 준비돼 있어요」, 다시 받기 확인의 제목·본문·버튼(「모듈을 다시 받을까요?」·「모바일 데이터로 {size}를 받아요.」·
「빠진 모듈을 받아요. 이미 받은 것은 그대로 둬요.」·「받기」·「취소」), 진단 겹 제목 「진단」(`diag.title` 보드 `6h`), 뒤로 「개발자」. 해요체다. 정확한 글자는 구현 때 이 파일 하나에 두고 계약 테스트가 잠근다.
