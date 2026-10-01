# Contract: 매일 쓰는 시각과 장소 이름

계약 번호는 이 파일 안에서만 쓴다. 테스트 이름 앞에 번호를 붙인다(예: `it("TH3 …")`).

## TH — 시 표기·격자·미리보기 (순수, `src/app/target-hour.ts`, jest logic)

- **TH1** `formatTargetHour(22, "h12")` = 「오후 10시쯤」, `(0, "h12")` = 「오전 12시쯤」, `(12, "h12")` = 「오후 12시쯤」, `(7, "h12")` = 「오전 7시쯤」, `(22, "h24")` = 「22시쯤」, `(0, "h24")` = 「0시쯤」.
- **TH2** `hourCells("h12")` = `[12,1,…,11]`(12개), `hourCells("h24")` = `[0,…,23]`(24개). 열 수 4 / 6.
- **TH3** `hourOfCell(12, "am")` = 0, `(12, "pm")` = 12, `(10, "am")` = 10, `(10, "pm")` = 22. `meridiemOf(0)` = am, `(11)` = am, `(12)` = pm, `(23)` = pm. 0–23 전부에서 `hourOfCell(cellOf(h), meridiemOf(h)) === h`.
- **TH4** 오전/오후 전환은 칸을 유지한다 — 오후 10(22)에서 오전으로 바꾸면 선택 칸 10, 시 10.
- **TH5** `previewSentence(22, "h12")` = 「매일 오후 10시쯤 그날 일기를 써요. 이미 쓴 날은 건너뛰어요.」, `(7, "h12")` = 「매일 오전 7시쯤 어제 일기를 써요. 이미 쓴 날은 건너뛰어요.」, `(15, "h24")` = 「매일 15시쯤 그날 일기를 써요. 이미 쓴 날은 건너뛰어요.」. 경계: 11 → 어제, 12 → 그날, 0 → 어제.
- **TH6** `formatGmt(540)` = 「GMT+9」, `(0)` = 「GMT」, `(-210)` = 「GMT-3:30」, `(345)` = 「GMT+5:45」.
- **TH7** `timeZoneLine("Asia/Seoul", 540)` = 「이 휴대폰의 시간대 · 서울 (GMT+9)」, `("America/New_York", -240)` = 「이 휴대폰의 시간대 · New York (GMT-4)」, `(null, 540)` = `null`.
- **TH8** `hourFormatFrom({ hourCycle: "h23" })` = h24, `({ hourCycle: "h12" })` = h12, `({ hour12: false })` = h24, `({})` = h12, `(null)` = h12.
- **TH9** 소스 계약: `target-hour.ts`에 `new Date(`·`Intl.`·`getTimezoneOffset`이 없다(기기 읽기는 조립부 몫) — 주석을 걷고 센다.
- **TH10** 소스 계약(FR-035): 이 조각의 새 문구 소스에 「정각」이 없고, 시각 표기 함수의 모든 출력(0–23 × 두 형식)이 「쯤」을 포함한다.

## DC — 기기 시계 읽기 (`src/app/device-clock.ts`, jest logic)

- **DC1** `readDeviceClock(now)`는 `{ format, timeZoneId, offsetMinutes }`를 돌려주고 던지지 않는다 — `Intl`이 예외를 던지면 `format: "h12"`, `timeZoneId: null`.
- **DC2** `offsetMinutes === -now.getTimezoneOffset()`.

## SE — 저장 효과 (`src/schedule/settings-effects.ts`, jest logic)

- **SE1** `applyTargetHour` 순서는 S6 그대로(저장 → 켜짐이면 다시 예약).
- **SE2** 저장이 실패하면 `current`를 돌려주고 다시 예약하지 않는다(FR-018).
- **SE3** `DEFAULT_AUTO_DIARY_SETTINGS.targetHour === 22`. 파일 없음 → 22, `targetHour` 깨짐(`25`, `"7"`, `7.5`) → 22, 저장된 7 → 7(FR-005).

## SR — 설정 화면의 두 행 (`SettingsScreen`, jest ui)

- **SR1** 토글 꺼짐이면 시각 행 감쌈이 `pointerEvents="none"`이고 접근성에서 숨는다(`settings-target-hour`가 기본 쿼리에 안 나온다). 켜짐이면 보이고 값이 `targetHourText`다.
- **SR2** 토글을 끄고 켜도 행 값은 같은 `targetHourText`다(값은 조립부가 들고 있다 — 화면은 지우지 않는다, FR-003).
- **SR3** 장소 이름 행(`settings-place-names`)은 토글과 무관하게 있고 값은 「자동」/「켬」/「끔」 + › 다.
- **SR4** 시각 행을 누르면 `onOpenTargetHour`, 장소 행을 누르면 `onOpenPlaceNames`가 불린다.
- **SR5** 「일기」 묶음 행 순서: 자동으로 쓰기 → 매일 쓰는 시각 → 장소 이름으로 보기. `diaryExtras` prop은 없다(소스 계약).
- **SR6** 토글 꺼짐 손잡이 색 = `SETTINGS.toggle.knobOff`, 켜짐 손잡이 = `COLORS.bg`(FR-029).

## TD — 시각 대화상자 (`TargetHourDialog`, jest ui)

- **TD1** 열리면 제목 「매일 쓰는 시각」, 시간대 줄(주어졌을 때만), 저장된 시가 선택된 격자(`accessibilityState.selected`), 미리보기, 「취소」가 있고 「저장」이 없다.
- **TD2** 12시간: 오전/오후 칸 둘 + 칸 12개. 24시간: 오전/오후 칸 없음 + 칸 24개.
- **TD3** 「오전」을 누르면 선택 칸 유지·미리보기 갱신·`onSelect` 안 불림.
- **TD4** 저장된 시와 다른 칸을 누르면 `onSelect(hour)`가 한 번 불린다(시는 칸 + 지금 오전/오후). 같은 칸이면 `onSelect` 없이 `onClose`.
- **TD5** 「취소」·바깥(`…-overlay`)·뒤로 → `onClose`, `onSelect` 없음.
- **TD6** 칸을 빠르게 두 번 눌러도 `onSelect`는 한 번이다.

## PD — 장소 대화상자 (`PlaceNameDialog`, jest ui)

- **PD1** 칸 셋(「자동」·「켬」·「끔」, 설명 줄), 지도 고지 「좌표를 기기의 지도 서비스에 물어봐요.」, 「취소」. 지금 값의 칸이 선택돼 있다.
- **PD2** 다른 칸을 누르면 `onSelect(mode)` 한 번, 같은 칸이면 `onClose`만.
- **PD3** 「취소」·바깥·뒤로 → `onClose`만.

## AS — 조립 (`App.tsx` `SettingsSection` + `AppFrame`, 소스 계약 + jest ui)

- **AS1** 시각 선택 → 대화상자 닫힘 → `applyTargetHour`(저장 → 다시 예약) → 반환값으로 보관 값 갱신. 저장 실패면 값 그대로(SE2).
- **AS2** 장소 선택 → 대화상자 닫힘 → `saveGeocodingSetting` 성공 뒤에만 값 갱신 → 새 값이 「켬」이고 바뀌었을 때만 위치 권한 요청.
- **AS3** 설정 값 보관은 `AppFrame`이 한다 — `SettingsSection` 안에 `loadAutoDiarySettings(`·`loadGeocodingSetting(`이 없다(소스 계약). 보관 값이 `null`일 때만 「설정을 읽는 중…」.
- **AS4** `enabled: true`면 재등록하는 effect가 `AppFrame`에 있다(R5).
- **AS5** `AutoDiarySettingsScreen`·`GeocodingSettingToggle` 파일이 없다.

## TX — 문구 원문 (C4, jest)

- **TX1** `SETTINGS_TEXT`의 새 키가 보드 원문과 글자 단위로 같다: `autoWriteTime`「매일 쓰는 시각」, `placeNames`「장소 이름으로 보기」, `timeTitle`「매일 쓰는 시각」, `timeAm`「오전」, `timePm`「오후」, `timeCancel`「취소」, `placeTitle`「장소 이름으로 보기」, `placeAuto`/`placeAutoDesc`「자동」/「위치 권한이 있으면 이름으로, 없으면 비워 둬요」, `placeOn`/`placeOnDesc`「켬」/「다닌 자리를 숫자 대신 이름으로 보여줘요」, `placeOff`/`placeOffDesc`「끔」/「장소 이름을 옮기지 않아요」, `placeCancel`「취소」, `placeNotice`「좌표를 기기의 지도 서비스에 물어봐요.」.
- **TX2** 템플릿 문구(`target-hour.ts`)는 TH1·TH5·TH7로 잠근다.
