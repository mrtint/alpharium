# Research: 자동 쓰기 규칙 (057)

코드를 읽어 정한 것들. 실측이 필요한 것은 quickstart의 실기기 단계로 넘겼다(원칙 V — 짐작을 결론처럼 적지 않는다).

## R1 — 판정의 자리와 모양

- **Decision**: `src/schedule/auto-write.ts`에 순수 함수 `decideAutoWrite({ schedule, preview })`를 둔다. 입력은 020 `decideSchedule`의 결과와
  053/048의 `DayPreview`(사진·장소 `CountHint` + `photoAccess`)다. 결과는 `idle`(020이 돌 일 없음) / `write`(그 날) / `skip`(그 날, 이유
  `no-photo-access` · `no-material`). 순서는 spec FR-003 그대로 — `photoAccess`가 `denied`·`blocked`면 `no-photo-access`, 아니면
  `decideMaterial(fromCountHint(photos), fromCountHint(places))`가 `write`면 쓰고, `confirm`이면 `no-material`.
- **Rationale**: 저장소 소유자 결정 R1. `decideSchedule`(시각·날)과 재료(신호)는 입력 시점이 다르다 — 날이 정해져야 그 날 신호를 읽는다.
  053의 `decideMaterial`을 그대로 쓰면 「확인이 뜬 하루」(홈 `2f`)와 「자동으로 안 쓴 하루」가 같은 규칙이 된다.
  `photoAccessOf`(053)가 이미 `undetermined`를 `denied`로, `limited`를 `ok`로 옮기므로 FR-003(2)·FR-004가 저절로 성립한다.
  사진이 관측된 0이면 장소도 0으로 올리는 승격(FR-005)은 `toDayPreview`에 이미 있다 — 다시 쓰지 않는다.
- **계층**: `src/schedule/`이 `src/app/material.ts`·`src/app/state.ts`(타입)를 import한다. `task.ts`가 이미 `app/wiring`·`app/selection-store`를
  import하고 있고 헌법 검사 `SCHEDULE_TOUCHES_PRODUCT_LAYER`는 `models/roster`·`diary/prompt`·`diary/acceptance`·`generate(`만 막는다 — 새 위반이 아니다.
  `material.ts`는 순수하고 `signals/types`만 import한다.
- **Alternatives**: `ScheduleDecision`에 갈래 추가(신호를 읽으려면 같은 함수를 두 번 불러야 함), `task.ts`에서 직접 if(앱 열기 경로가 복제) — 저장소 소유자가 기각.

## R2 — 두 경로가 공유하는 조합 함수

- **Decision**: 같은 파일에 `resolveAutoWrite(deps)`(비동기, 의존 주입)를 둔다. `settings`·`now`·`listDiaryDays()`·`previewDay(day)`·`skipPort`를 받아
  `decideSchedule` → (돌 일이 있을 때만) `previewDay` → `decideAutoWrite` → `no-photo-access`면 `saveSkippedDay`를 하고 결정을 돌려준다.
  백그라운드(`task.ts`)와 앱 열기(`App.tsx`의 `DiarySection`)가 이것 하나를 부른다.
- **Rationale**: 기록(FR-008·FR-021)과 판정이 두 경로에서 어긋나지 않는다. `previewDay`는 `createAppPipeline`이 이미 주는 통로(048 PV4 — 파이프라인과 같은
  `loadSignals`)라 새 수집 경로가 아니다. 돌 일이 없으면 신호를 읽지 않는다(매 15분 콜백이 사진을 훑지 않게).
- **Alternatives**: 각 경로가 `decideAutoWrite`만 공유하고 나머지를 따로 조립 — 기록 단계가 복제된다.

## R3 — 건너뜀 기록

- **Decision**: `src/schedule/skip-store.ts` — `preferences/auto-write-skipped.json`에 `{"day":"YYYY-MM-DD"}` 하나. `loadSkippedDay`(파일 없음·깨짐·
  모양이 다르면 `null`, 던지지 않는다), `saveSkippedDay(day)`(덮어쓰기 — 가장 최근 한 번), `clearSkippedDay()`. 기기 통로는 `notified-store.ts`와 같은
  모양(`expo-file-system` 지연 import, 임시 파일에 쓰고 옮김).
- **Rationale**: D3(실행 기록은 설정 파일 밖, 이유와 시각만, 건수 상한) — 이 조각의 기록은 이유가 하나(사진 권한)라 이유 칸도 필요 없고, 건수는 1이다.
  020 S7(`auto-diary.json` 필드 둘)을 지킨다. 계약 테스트가 소스를 읽어 `Date`·시각·횟수 어휘가 없음을 잠근다.

## R4 — 기록 지우기 (R3 결정의 자리)

- **Decision**: `AppFrame`이 마운트 때와 `AppState → active` 때 사진 권한(`onboardingPorts.photo.photoPermission()`)을 읽어 `granted`·`limited`면
  `clearSkippedDay()` 하고 상태를 `null`로, 아니면 파일을 읽어 상태에 둔다. 읽기가 던지면 지우지 않고 파일만 읽는다. 설정은 `AppFrame`이 든
  `skippedDay`를 받아 사진 꼬리표가 `denied`일 때만 보조 줄을 그린다(spec FR-010 — 꼬리표가 `unread`·`partial`·`allowed`면 안 그린다).
- **Rationale**: 설정 겹은 닫히면 언마운트된다(055) — 056이 설정 값을 `AppFrame`에 둔 것과 같은 이유. `AppState`는 「다시 읽을 때」의 신호일 뿐
  판정 입력이 아니다(AGENTS는 `src/schedule/`·`src/signals/`에서의 `AppState` 참조를 금한다 — `App.tsx`는 이미 같은 방식으로 권한을 다시 읽는다).
  `previewDay`의 `photoAccess: "ok"`는 조회 실패도 포함하므로(053 — 「권한이 없다고 단정하지 않는다」) 지우는 근거로 쓰지 않는다.

## R5 — 앱 열기 경로

- **Decision**:
  1. `AppFrame`이 문을 든다 — `DiarySection`은 `firstRunStage === "done"`일 때만 그려지고, `claimAutoWrite()` 콜백이 이번 실행에서 040 자동 첫 일기를
     시도했는가(`autoGenerateTried`)와 앱 열기 자동 쓰기를 이미 시작했는가(새 ref `autoWriteClaimed`)를 **콜백 안에서** 읽는다(렌더 중 ref 읽기는 React Compiler
     규칙 위반). 040 effect는 부모라 같은 커밋에서 자식 effect보다 늦게 돌지만, 판정이 비동기라 홈이 claim할 때는 이미 서 있다. 설정 값은 `settingsValues?.autoDiary`(못 읽었으면 `null` — 판정 안 함).
  2. `DiarySection`이 마운트 때와 `AppState → active` 때 `resolveAutoWrite`를 부른다(통로: `store.listDays`, `wiring.previewDay`, 건너뜀 기록 통로). `write`면
     `autoWriteDay` 상태를 세워 `DiaryHomeScreen`에 넘긴다. `skip`(사진 권한)이면 `AppFrame`에 알려 설정의 보조 줄 상태를 갱신한다.
  3. `DiaryHomeScreen`은 `autoWriteDay`가 있고 홈이 목록 상태이며 덮여 있지 않고(`covered`) 재료 확인·덮어쓰기·날짜로 이동 달력·권한 설정 안내(`2m`) 대화상자가 없고 쓰기 판정 중이 아닐 때만
     `resolve(day)`를 보고, `resolved`일 때만 `claimAutoWrite()`를 부른다(`no-ready-character`면 claim하지 않고 시작하지 않는다 — 안내 화면을 저절로 띄우지
     않고 「한 번」도 소모하지 않는다). claim이 참이면 그 날을 고른 날로 두고 `generate(..., { auto: true })`로 쓰는 중에 들어간다
     (053 재료 확인·050 덮어쓰기 확인을 거치지 않는다 — 그 날은 안 쓴 날이고 재료가 있다고 판정됐다).
  4. `generate`의 `auto` 갈래는 결과가 `already-running`이면 실패 토스트를 띄우지 않는다(FR-019). 그 밖의 실패는 054 그대로 토스트다.
- **Rationale**: 저장소 소유자 결정 R2 — 054의 혼잣말·그만두기·토스트·005 끊김을 그대로 얻는다. 화면 잠금 owner(`screen`)라 백그라운드와의 경합은
  020 잠금이 이미 가른다. `claimAutoWrite`를 홈이 실제로 시작하는 순간에 부르므로, 덮여 있어서 시작하지 못한 판정은 다음 전경 복귀에서 다시 할 수 있다
  (FR-017 「한 번」은 시작한 횟수다).
- **`AppScreen` 선언을 넓히지 않는다**(054 교훈 — 007 S1·009 I7·012 C3가 `toWriting()` 무인자를 잠근다). `auto`는 `generate`의 지역 인자다.
- **Alternatives**: `runAutoDiaryTask`를 전경에서 부름 — 기각(R2). 판정을 `DiaryHomeScreen` 안에서 — 화면이 `schedule/`에 닿게 되어 화면 계층 판정 금지(FR-027)에 어긋남.

## R6 — 완성 알림 문구

- **Decision**: `NotificationPort.present(day, title)`로 제목을 받는다. 제목은 순수 함수 `autoWriteDoneText(name, day)`(`src/schedule/notification-text.ts`) —
  `${name}${particleFor(name)} ${M}월 ${d}일 일기를 다 썼어요`. 본문 없음(Clarification Q4). `task.ts`가 이름을 `loadCustomNames(expoCharacterNamesPort())` +
  `displayNameOf(character, names)`로 구한다(이름 읽기 실패면 빈 맵 → 기본 이름, 035 N3). 의존은 주입 가능(`loadNames?`).
- **Rationale**: 035 `displayNameOf`가 표시 이름의 유일한 통과 지점(N1), `particleFor`가 조사의 유일한 자리(017 PT1). 020 N2의 「캐릭터 정보 없음」은
  모델·로스터 정보를 막는 취지였다 — 사용자에게 보이는 이름(원칙 III이 허용하는 호칭)은 보드가 요구한다. N2 테스트는 「제목 틀에 모델명·일기 본문 참조가 없다」로 고친다.
- **알림이 이름에 따라 다른 사실**: 보드 원문이라 다시 해석하지 않는다.

## R7 — 설정 사진 행의 보조 줄

- **Decision**: 문구는 순수 함수 `skippedLineText(day, now)`(`src/app/skipped-line.ts`) — `day === latestClosedDay(now)`면 `perm.photos.skippedYesterday`, 아니면
  `{M}월 {d}일 …`(날짜 문자열을 나눠 앞 0을 뗀다 — 경계 계산을 다시 하지 않는다, DB11). `SettingsScreen`은 `photoSkipText?: string`을 받아 사진 행의 `hint`로
  그리되 색은 `COLORS.danger`(= `accent-700`)다(`Row`에 `hintTone` 추가). 문구는 `settings-text.ts`에 원문 둘(키 이름은 보드 키).
- **Rationale**: 055 행의 보조 줄과 자리·크기가 같다(보드 `6g` 마크업: 12 · 1.35 · gap 3 · 최소 높이 56). `latestClosedDay`가 049부터 「어제」다.

## R8 — 테스트와 Maestro

- jest logic: `auto-write.test.ts`(갈래·순서·기록·돌 일 없으면 신호 안 읽음), `skip-store.test.ts`(읽기 방어·덮어쓰기·소스 계약 D3), `notification-text.test.ts`,
  `skipped-line.test.ts`, `background-generation.test.ts` 갱신(건너뜀이면 `pipeline.run`·알림 0회, 알림 제목).
- jest ui: `settings-screen.test.tsx`(보조 줄 원문·색·없음), 홈 앱 열기(`autoWriteDay` → 쓰는 중, 덮여 있으면 시작 안 함, `already-running`이면 토스트 없음),
  `App` 조립은 logic 갈래의 소스 계약 `__tests__/app/app-auto-write-source.test.ts`(앱 열기 문이 `autoGenerateTried`를 본다, 보조 줄 조건, `src/schedule/`에 `AppState` 없음).
- Maestro: 헤드리스 자동 쓰기는 Maestro로 재현할 수 없다(시각·Doze·`force-stop` 금지). 새 흐름을 만들지 않고 quickstart의 수동 실기기 단계로 한다.
  `scheduled-diary-notification.yml`은 알림 문구를 단언하지 않는지 확인만 한다(FLOWS 밖 그대로).
