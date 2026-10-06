# Contract: 상태 흉내

계약 ID는 테스트 이름에 그대로 쓴다.

## 순수 판정 (`src/app/simulation.ts`)

- **SM1** `parseSimulation(raw)` — `null`·깨진 JSON·객체 아님 → `OFF`. 토글은 `=== true`만 켬. `date`는 `YYYY-MM-DD` 형식이고 실제 달력 날일 때만.
- **SM2** `effectiveSimulation(state, false)` → `OFF`(배포 환경). `(state, true)` → `state`.
- **SM3** `simulationBlocksWriting` — `OFF`만 거짓. 넷 중 하나만 켜도 참(네 경우 각각).
- **SM4** `simulatedNow(null, real)` → `real`. `simulatedNow(day, real)` → `dayOf(결과) === day`이고 시·분·초는 `real`과 같다. 소스에 `getHours() ±`가 없다(DB11).
- **SM5** `simulatedPreviewDay(OFF)` → `undefined`. `noPhoto` → `photos.kind === "unknown"`·`photoAccess === "denied"`. `noMaterial`만 → `photos`·`places` 모두 `none`·`photoAccess === "ok"`.
  둘 다 → 권한 없음. 돌려준 미리보기의 `day`는 요청한 날이다.
- **SM6** `serializeSimulation(OFF)` → `null`(지움). 그 밖에는 켠 것만 담은 JSON이고 `parseSimulation`으로 왕복한다. 시각·횟수 필드가 없다.

## 저장 통로 (`src/app/simulation-store.ts`)

- **SS1** `loadSimulation(port)` — 통로가 던져도 `OFF`.
- **SS2** `saveSimulation(port, state)` — `OFF`면 `remove()`, 아니면 `write()`.
- **SS3** 파일은 `preferences/simulation.json`이다(`diary/` 밖).

## 홈 (`DiaryHomeScreen` · `DiaryListScreen`)

- **HM1** `writeBlocked`이면 쓰기 바를 눌러도 `onWriteBlocked`만 불리고 `pipeline.run`·`resolve`·재료 확인·덮어쓰기 확인이 없다(안 쓴 날·쓴 날 각각).
- **HM2** `writeBlocked`이면 `autoWriteDay`가 있어도 시작하지 않는다. `writeRequest`는 시작하지 않고 비운다.
- **HM3** `simulation`이 있으면 `home-dev-badge`가 월 라벨 줄에 있고 누르면 `onOpenDeveloper`. 없으면 꼬리표가 없다.
- **HM4** `simulation`이 있으면 `write-button` 면이 `SIMULATION.barFill`이고 `write-button-dev` 꼬리표가 있다. 없으면 054·051 색 그대로.
- **HM5** `simulatedFailToast`면 마운트 때와 `covered`가 참→거짓이 될 때 실패 토스트 「일기를 쓰지 못했어요.」가 뜬다. 거짓이면 뜨지 않는다.
- **HM6** 주입된 `now`가 흉내 날이면 큰 숫자·스트립 오늘 칸이 그 날이고, 쓴 날의 「N시간 M분 전에 작성」도 그 `now`로 센다.
- **HM7** 쓴 날의 지면(제목·본문)은 `previewDay`가 흉내로 바뀌어도 그대로다(FR-009).
- **HM8** 쓰는 중에 `writeBlocked`가 참이 되어도 진행 중인 쓰기는 멈추지 않고 저장된다(spec Edge Cases).

## 조립 (`App.tsx`)

- **AF1** 날짜 흉내를 켜거나 바꾸면 고른 날이 그 날, 끄면 실제 오늘(Clarification Q1).
- **AF2** 개발자 메뉴를 끄면 흉내가 `OFF`가 되고 파일을 지운다.
- **AF3** `claimAutoWrite`는 흉내가 켜져 있으면 한 번을 소모하고 거짓이다.
- **AF4** `resolveAutoWrite`에 넘기는 `previewDay`는 흉내로 바뀌지 않는다(소스 계약).
- **AF5** 배포 환경은 흉내 파일을 읽지 않는다.

## 개발자·진단 화면

- **DV1** 개발 환경이면 `developer-group-sim`과 네 행(`sim-date`·`sim-fail`·`sim-empty`·`sim-nophoto`), 머리 오른쪽 「개발 빌드만」. 배포 환경이면 없다. 글자는 보드 원문.
- **DV2** `sim-date` 값은 켜졌으면 `YYYY-MM-DD`, 꺼졌으면 빈 문자열. 누르면 날짜 대화상자.
- **DV3** 날짜 대화상자에서 날을 누르면 적용·닫힘. 「끄기」는 켜져 있을 때만 누를 수 있고 누르면 날짜 흉내를 끈다.
- **DG1** 진단 `writeBlocked`이면 「지금 한 번 써 보기」·「자동 쓰기 지금 실행」에 `onPress`가 없고 차단 문구가 보인다.

## 백그라운드 (`src/schedule/task.ts`)

- **BG1** 개발 환경 + 흉내 켬 → `"skipped"`, 파이프라인을 만들지 않는다, 알림 없음, 실패 기록 없음.
- **BG2** 배포 환경 + 흉내 파일 있음 → 흉내 무시(평소대로 판정).
- **BG3** 흉내 파일을 못 읽음 → 평소대로.

## 경계 (`scripts/constitution-rules.ts` `SIMULATION_LEAKS`)

- **LK1** `src/app/simulation*.ts`가 `diary/pipeline`·`schedule/`·`signals/`를 import하면 위반.
- **LK2** `src/diary/`·`src/signals/`·`src/inference/`·`src/vision/`·`src/schedule/`(`task.ts` 제외)가 `app/simulation`을 import하면 위반.
- **LK3** `src/schedule/task.ts`가 `simulatedNow`·`simulatedPreviewDay`를 쓰면 위반.
- 셋 다 위반 주입으로 잡히는지 확인한다.
