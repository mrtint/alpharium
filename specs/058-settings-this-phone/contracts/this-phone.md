# Contract: 이 휴대폰 (058)

테스트가 잠그는 약속. 이름은 테스트 `describe`에 그대로 쓴다.

## ST — 저장소 지우기 (`src/diary/store.ts`)

- **ST1** `fileStore(fs).removeAll()` 뒤 `listDays()`는 `[]`다.
- **ST2** `removeAll()`은 `YYYY-MM-DD.json`과 `YYYY-MM-DD.json.writing`만 `fs.remove`한다 — 다른 이름(`notes.txt`, `2026-10-01.bak`)은 부르지 않는다.
- **ST3** 읽을 수 없는(깨진) 일기 파일도 지운다.
- **ST4** 한 파일의 `remove`가 던져도 나머지를 시도하고, 끝나면 첫 오류를 던진다.
- **ST5** `memoryStore().removeAll()` 뒤 `listDays()`는 `[]`, `has(day)`는 거짓.
- **ST6** `expoFileSystemPort`의 `remove(name)`은 없는 파일에서 던지지 않는다(소스 계약 — `exists` 확인 뒤 `delete()`).

## WP — 지우기 조합 `wipeDiaries` (`src/app/wipe-diaries.ts`)

- **WP1** 잠금을 얻지 못하면 `{ kind: "busy" }`이고 `removeAll`·`clearPhotoCopies`·알림 기록 저장·`dismiss`를 하나도 부르지 않는다.
- **WP2** 잠금을 얻으면 순서가 `잠금 얻기 → 알림 기록 읽기 → removeAll → clearPhotoCopies → 알림 기록 {} 저장 → dismiss(각 id) → 잠금 놓기`다(호출 순서를 기록하는 대역).
- **WP3** 성공이면 `{ kind: "wiped" }`, 잠금 파일이 비어 있다(놓았다).
- **WP4** `removeAll`이 던져도 `clearPhotoCopies`·알림 기록 비우기·`dismiss`·잠금 놓기를 하고 `{ kind: "failed" }`다.
- **WP5** `dismiss`가 던져도 결과는 `wiped`다.
- **WP6** 잠금 owner는 `"screen"`이고 6분이 지난 잠금은 얻는다(020 `decideAcquire` 그대로 — 자기 판정을 두지 않는다, 소스에 `STALE_LOCK_MS` 숫자를 다시 쓰지 않는다).
- **WP7** 소스에 지운 시각·편수를 파일에 쓰는 코드가 없다 — `wipeDiaries`가 받는 통로 밖의 쓰기가 없다(FR-017).
- **WP8** `auto-write-skipped`·`auto-diary`·`geocoding`·`onboarding`·이름 통로를 import하지 않는다(FR-012a·FR-013, 소스 계약).

## MS — 모듈 용량 (`src/app/module-size.ts`)

- **MS1** `formatModuleBytes`: `2_004_831_040` → 「2.0GB」, `1_000_000_000` → 「1.0GB」, `999_499_999` → 「999MB」, `999_500_000` → 「1.0GB」, `480_000_000` → 「480MB」,
  `0` → 「0MB」, `1_950_000_000` → 「2.0GB」, `12_345_678_901` → 「12.3GB」.
- **MS2** `readModuleBytes`는 `ESSENTIAL_ASSET_KEYS` 각각의 `bytesUsed`를 한 번씩 부르고 합을 준다. 하나라도 던지면 던진다(조립부가 `null`로 바꾼다).
- **MS3** `src/ui/`는 `module-size`의 합계 함수를 import하지 않는다 — 화면은 문자열만 받는다(`UI_TOUCHES_ASSET` 헌법 검사가 `ESSENTIAL_ASSET_KEYS`를 막는다).

## HS — 홈의 멈춤 응답 (`DiaryHomeScreen`·`DiarySection`)

- **HS1** 쓰는 중에 `wipeRequest`가 바뀌면 `stop()`을 부르고, **도는 `pipeline.run`이 resolve된 뒤에** `onWipeReady(token)`을 부른다(run을 대역으로 붙잡아 순서를 본다).
- **HS2** 그 멈춤에서 실패 토스트를 띄우지 않는다(054 그만두기와 같은 `cancelled`).
- **HS3** 쓰는 중이 아니면 곧바로 `onWipeReady(token)`을 부른다.
- **HS4** 같은 토큰에 `onWipeReady`는 한 번이다. 마운트 때의 토큰(지운 뒤 다시 마운트)에는 응답하지 않는다 — 0이 아닌 새 값에만.
- **HS5** 덮인(`covered`) 상태에서도 응답한다(설정이 열린 동안 오는 요청이다).
- **HS6** `DiarySection`이 홈을 그리지 않는 갈래(조립 실패)에서도 요청에 곧바로 응답한다(소스 계약).

## AF — 조립 (`App.tsx`, 소스 계약 — logic 갈래)

- **AF1** `requestWipe`는 토큰을 올리고 `onWipeReady`를 기다린 뒤에만 `wipeDiaries`를 부른다.
- **AF2** `wiped`·`failed`면 설정 겹을 닫고(`goHome`), 고른 날을 오늘로 두고, `DiarySection`의 `key`를 올린다. `busy`면 셋 다 하지 않는다.
- **AF3** 설정 조립부는 마운트 때 편수(`listDays().length`)와 모듈 용량을 한 번 읽는다. 행을 누르면 편수를 다시 센다.

## UI — 설정 화면·대화상자

- **UI1** 「이 휴대폰」 묶음은 「권한」 다음, 「정보」 앞이다. 행은 「쓰는 모듈」, 「일기 모두 지우기」 순서다.
- **UI2** 「쓰는 모듈」 행은 누를 수 없고(`button` 역할 없음) ›가 없으며 값은 `moduleSizeText`(없으면 빈 값)다.
- **UI3** `wipeEnabled`면 라벨 색이 `COLORS.danger`이고 누르면 `onOpenWipe`. 아니면 라벨 색이 `COLORS.textMuted`, `accessibilityState.disabled === true`, 누를 수 없다.
- **UI4** `wipeBlockedText`가 있으면 지우기 행 아래 `COLORS.danger` 보조 줄이다.
- **UI5** `WipeConfirmDialog`: 제목 「일기 {n}편을 모두 지울까요?」, 설명 「되돌릴 수 없어요. 이름과 설정은 남아요.」, 동작 버튼 「지우기」(면 `COLORS.danger`, 글자 `COLORS.dangerForeground`), 취소 「취소」.
  덮개를 눌러도 닫히지 않고 뒤로 가기는 `onCancel`이다(050 `ConfirmDialog` 그대로).
- **UI6** `DialogActionButton`의 `tone` 기본값은 `accent`다 — 기존 대화상자(덮어쓰기·재료·다운로드 동의)의 버튼 색이 바뀌지 않는다.

## TX — 문구 (`src/ui/settings-text.ts`)

- **TX1** 보드 원문 글자 그대로: `groupDevice` 「이 휴대폰」, `deviceModules` 「쓰는 모듈」, `deviceWipe` 「일기 모두 지우기」, `wipeTitle(n)` 「일기 {n}편을 모두 지울까요?」, `wipeBody`
  「되돌릴 수 없어요. 이름과 설정은 남아요.」, `wipeConfirm` 「지우기」, `wipeCancel` 「취소」.
- **TX2** 보드 밖 문구 `wipeBlocked` 「지금 자동으로 쓰는 중이라 지우지 못했어요.」(R10) — 해요체, 「보드 밖」 주석.
- **TX3** `wipeTitle(41)` = 「일기 41편을 모두 지울까요?」 — 천 단위 구분 없음(`wipeTitle(1200)` = 「일기 1200편을 …」).
