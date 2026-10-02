# Contract: 자동 쓰기 규칙 (057)

테스트가 잠그는 약속. 이름은 테스트 `describe`에 그대로 쓴다.

## AW — 판정 `decideAutoWrite` / 조합 `resolveAutoWrite` (`src/schedule/auto-write.ts`)

- **AW1** 020 판정이 `act: false`면 `{ kind: "idle", reason }`이고 `previewDay`를 부르지 않는다.
- **AW2** `photoAccess`가 `denied` 또는 `blocked`면 사진·장소 수와 무관하게 `skip` + `no-photo-access`다(권한이 먼저, FR-003).
- **AW3** `photoAccess`가 `ok`이고 사진 또는 장소가 `known` ≥ 1이면 `write`다(위치만 `unknown`이고 사진이 있으면 `write`, FR-004 Clarification).
- **AW4** `photoAccess`가 `ok`이고 사진·장소가 `known 0`·`none`·`unknown`뿐이면 `skip` + `no-material`이다(`unknown`을 재료로 세지 않는다).
- **AW5** 판정은 053 `decideMaterial`·`fromCountHint`를 쓴다 — 소스에 자기 재료 규칙(`count >= 1` 등)을 두지 않는다.
- **AW6** `resolveAutoWrite`는 `no-photo-access`일 때만 `saveSkippedDay(day)`를 한 번 부른다. `no-material`·`write`·`idle`은 기록하지 않는다. 기록 실패는 결정을 바꾸지 않는다(삼킨다).
- **AW7** 순수 판정 함수는 `new Date()`·`AppState`·파일을 부르지 않는다(`now`를 인자로).

## SK — 건너뜀 기록 (`src/schedule/skip-store.ts`)

- **SK1** 저장 모양은 `{"day":"YYYY-MM-DD"}` 하나다. 소스에 `Date`·`timestamp`·`count`·`history`·`reason`·`at` 필드가 없다(D3, 원칙 IV).
- **SK2** 파일 없음·깨진 JSON·잘못된 `day` → `null`. 던지지 않는다.
- **SK3** 저장은 덮어쓴다(가장 최근 한 번). 지우기 뒤 읽기는 `null`.
- **SK4** 파일은 `preferences/auto-write-skipped.json`이고 `auto-diary.json`에 쓰지 않는다.

## BG — 백그라운드 (`src/schedule/task.ts`)

- **BG1** `skip`이면 `pipeline.run`을 부르지 않고 알림을 보내지 않으며 결과는 `"skipped"`다.
- **BG2** `write`면 020 그대로 `pipeline.run` → 성공 시 알림.
- **BG3** 알림 제목은 `autoWriteDoneText(displayNameOf(character, names), day)`이고 본문이 없다.

## NT — 알림 문구 (`src/schedule/notification-text.ts`, `notification-port.ts`)

- **NT1** `autoWriteDoneText("금동이", "2026-09-14")` = 「금동이가 9월 14일 일기를 다 썼어요」, `("별님", …)` = 「별님이 …」, 한글로 끝나지 않으면 「가」.
- **NT2** 월·일에 앞 0이 없다(「10월 2일」).
- **NT3** `present(day, title)`는 `trigger: null`, `data: { day }`, `body`가 없다. 제목 틀에 일기 본문·요약 참조·감상·모델 이름이 없다(020 N2 갱신).

## SL — 설정 사진 행 보조 줄

- **SL1** `skippedLineText(day, now)`: `day`가 `latestClosedDay(now)`면 「어제 자동 쓰기를 건너뛰었어요」, 아니면 「{M}월 {d}일 자동 쓰기를 건너뛰었어요」(오늘 포함).
- **SL2** `SettingsScreen`은 `photoSkipText`가 있으면 사진 행 라벨 아래에 그 글자를 `COLORS.danger`로, 없으면 055 그대로(보조 줄 없음).
- **SL3** 조립부는 `skippedDay !== null`이고 사진 꼬리표가 `denied`일 때만 `photoSkipText`를 넘긴다.
- **SL4** 문구 원문은 `settings-text.ts`에 있고 보드 키(`perm.photos.skippedYesterday`·`perm.photos.skippedOn`) 글자 그대로다.

## OP — 앱 열기 자동 쓰기

- **OP1** 앱 열기 자동 쓰기는 `firstRunStage === "done"`에서만 그려지는 `DiarySection`이 판정하고, `AppFrame`의 `claimAutoWrite`는 040 `autoGenerateTried`가 서 있거나 이미 시작했으면 거짓이다(소스 계약).
- **OP2** `DiaryHomeScreen`은 `autoWriteDay`를 받으면 목록 상태·덮이지 않음·대화상자 없음일 때 `claimAutoWrite()`가 참이면 그 날을 고르고 쓰는 중으로 들어간다(재료 확인 대화상자 없이).
- **OP3** 덮여 있거나(`covered`) 대화상자가 떠 있거나 `resolve(day)`가 `no-ready-character`면 시작하지 않고 `claimAutoWrite`도 부르지 않는다.
- **OP4** `claimAutoWrite()`가 거짓이면(이번 실행에서 이미 시작) 시작하지 않는다.
- **OP5** 앱 열기로 시작한 쓰기가 `already-running`으로 끝나면 토스트가 없다. 다른 실패는 054 토스트 그대로.
- **OP6** 앱 열기 경로는 알림을 보내지 않는다.
- **OP7** `src/schedule/`은 `AppState`를 참조하지 않는다(AGENTS).
