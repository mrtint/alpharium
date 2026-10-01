# Research: 매일 쓰는 시각과 장소 이름

Phase 0 — 스펙(Clarifications 5건 반영 후)에 남은 기술 미지수를 푼다. 실측인지 문서·짐작인지를 항목마다 적는다(원칙 V).

## R1. 시간 형식(12/24)과 시간대는 Hermes `Intl`로 읽는다

- **Decision**: `new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions()`의 `hourCycle`(`h11`/`h12` → 12시간, `h23`/`h24` → 24시간),
  없으면 `hour12`(불리언), 그것도 없거나 예외면 12시간. 시간대 식별자는 `new Intl.DateTimeFormat().resolvedOptions().timeZone`(예외·빈 값이면 `null`).
  GMT 차이는 `Intl`이 아니라 `-now.getTimezoneOffset()`(분, 동쪽 양수)로 계산한다.
- **Rationale**: Clarification Q3 — 새 네이티브 모듈 0. Hermes 문서(ctx7 `/discord/hermes`, `doc/IntlAPIs.md`·`DateTimeFormat.java`)가 안드로이드에서
  `timeZone` 기본값(시스템 시간대)과 `hourCycle` 옵션(`h11`·`h12`·`h23`·`h24`)을 지원한다고 적는다. `getTimezoneOffset`은 엔진 기본이라 `Intl` 결함과 무관하다.
- **실측 필요(미확인)**: 이 기기(SM-S901N, RN 0.86의 Hermes)에서 `resolvedOptions().hourCycle`이 실제로 오는지, `timeZone`이 `"Asia/Seoul"`인지.
  **구현 첫 단계에서 dev 빌드로 한 번 찍어 본다**(quickstart Q0). 안 오면 폴백(12시간·시간대 줄 숨김)이 정상 경로가 되고 그 사실을 AGENTS에 남긴다.
- **한계**: 기기 설정의 「24시간 형식」 스위치는 `Intl`이 보지 못한다(안드로이드 `DateFormat.is24HourFormat`은 네이티브). ko 로케일 + 스위치 켬 사용자는 12시간을 본다 — 스펙 Assumptions·미확인 잔여.
- **Alternatives**: `expo-localization`(`getCalendars()[0].uses24hourClock`) — 스위치까지 읽지만 새 네이티브 모듈(S3·FR-036 위반, Clarification에서 기각).
  항상 12시간 — 보드 「기기 형식을 따름」을 뒤집어 기각.

## R2. 도시 이름은 사람이 못 박은 표 + 식별자 꼬리

- **Decision**: `CITY_NAMES: Record<string, string>` 상수(예: `"Asia/Seoul": "서울"`, `"Asia/Tokyo": "도쿄"` 등 몇 개)에서 찾고, 없으면 식별자의 마지막 `/` 뒤를
  밑줄 → 띄어쓰기로 바꿔 쓴다(`America/New_York` → `New York`). 식별자 자체를 못 읽으면 줄을 그리지 않는다(FR-008).
- **Rationale**: Clarification Q3. `Intl.DisplayNames`는 시간대 도시 이름을 주지 않는다. 표는 사람이 정한 값이고 코드가 도시를 지어내지 않는다(원칙 V).
- **Alternatives**: `timeZoneName: "long"`(「대한민국 표준시」) — 보드 「서울」 꼴과 달라 기각.

## R3. GMT 표기

- **Decision**: 분 단위 동쪽 오프셋 `m`에 대해 `m === 0` → `GMT`, 아니면 `GMT{+|-}{h}`에 분이 있으면 `:{mm}`(예: `GMT+9`, `GMT-3:30`, `GMT+5:45`).
- **Rationale**: 보드 예시 「GMT+9」. DST는 「지금」 기준(설정을 열 때의 `now`)이다 — 시간대 줄은 고를 수 없는 정보 표시라 그 순간 값이면 충분하다.

## R4. 펼침 움직임 — 안쪽을 절대 배치로 빼고 높이를 옮긴다

- **Decision**: 시각 행 감쌈(`overflow: hidden`)의 `height`를 reanimated `withTiming`(200ms)으로 0 ↔ H로 옮긴다. 안쪽 행은 감쌈 안에 **절대 배치**(top 0·좌우 0)하고
  그 `onLayout` 높이를 H로 쓴다(재기 전 기본 44). 시작값은 마운트 때의 켜짐 상태로 `useSharedValue(open ? H : 0)` — 이미 켜진 채 설정을 열면 움직임 없이 펼쳐져 있다.
  접힌 동안 `pointerEvents="none"` + `importantForAccessibility="no-hide-descendants"` + `accessibilityElementsHidden`.
- **Rationale**: 052 교훈 — 안쪽을 흐름에 두고 감쌈 크기만 옮기면 잰 높이가 되먹임으로 줄어든다. 049 교훈 — 시작값을 effect에서 되돌리면 한 프레임이 샌다.
  보드 0→44는 기본 글꼴의 행 높이다. 글꼴 2.0배에서 행이 44보다 커지면 잰 높이 H까지 펼친다(edge case — 자르지 않는다).
- **Alternatives**: `LayoutAnimation` — 안드로이드 실험 플래그·전역 효과라 기각. 움직임 없이 조건부 렌더 — 보드 200ms와 어긋나 기각(설계 대안 C).
- **jest 한계**(C9): 움직임은 목이라 「접힘 상태 속성(pointerEvents·접근성 숨김)」만 잠그고 움직임은 실기기 녹화로 본다.

## R5. 설정 값을 `AppFrame`이 들고 있는다 (T3)

- **Decision**: `AppFrame`이 마운트 때 `auto-diary.json`(020)과 장소명 파일(029)을 한 번 읽어 `settingsValues: { autoDiary, geocoding } | null`로 들고, `SettingsSection`에
  값과 「바뀐 값 반영」 콜백을 내린다. 설정 겹은 닫히면 언마운트되지만(055 `StackLayer`) 값은 `AppFrame`에 남는다. `enabled: true`면 태스크를 재등록하는 effect(020 B5)도 값과 함께
  `AppFrame`으로 옮긴다 — 설정을 열지 않아도 앱을 열면 재등록된다(`register()`는 idempotent, 020 주석).
- **Rationale**: 055 관측 — 겹이 열릴 때마다 파일을 다시 읽어 약 1초 「설정을 읽는 중…」. 값의 쓰기는 모두 설정 화면에서만 일어나고(백그라운드 태스크는 이 두 파일을 쓰지 않는다 —
  `task.ts`는 읽기만), 그래서 `AppFrame`의 값이 낡을 경로가 없다. 생성 파이프라인은 장소명 파일을 매번 직접 읽는다(`App.tsx` 1238행) — 이 보관과 무관.
- **첫 열기**: 앱 시작 직후 설정을 아주 빨리 열면 아직 못 읽었을 수 있다 → 지금처럼 읽는 중 표시(FR-031, 원칙 V).
- **Alternatives**: 모듈 전역 캐시 — 테스트 격리가 어렵고 jest 사이에 값이 샌다. 틀 먼저 그리고 값만 비우기 — 저장소 소유자가 「기억」을 골랐다.

## R6. 저장 실패 시 값 유지 (FR-018)

- **Decision**: `applyTargetHour`(020 S6)가 저장 실패를 삼키고 `next`를 돌려주던 것을, 저장이 실패하면 `current`를 돌려주고 다시 예약하지 않게 바꾼다(순서 S6는 그대로).
  장소 갈래는 조립부가 `saveGeocodingSetting`이 성공한 뒤에만 값을 바꾸고 「켬」 권한을 요청한다.
- **Rationale**: 저장된 값과 화면이 어긋나지 않게(스펙 Edge Cases). 토글(`applyToggleOn/Off`)은 이 조각의 범위가 아니라 그대로 둔다.

## R7. 오전/오후·격자·미리보기 판정은 순수 함수 하나에

- **Decision**: `src/app/target-hour.ts` — 표기(`formatTargetHour`), 격자 칸(`hourCells`), 칸 + 오전/오후 → 시(`hourOfCell`), 시 → 오전/오후(`meridiemOf`), 미리보기(`previewSentence`),
  시간대 줄(`timeZoneLine`), GMT(`formatGmt`), 형식 판정(`hourFormatFrom`). 전부 인자만 받는다(기기·`new Date()` 없음). 시를 끼워 넣는 문장의 틀은 이 모듈이 갖는다(R8).
- **Rationale**: FR-037(화면은 판정하지 않는다), 분해 설계 §3.2 「순수 함수로 잠글 것」.

## R8. 문구 자리

- **Decision**: 새 문구는 `src/ui/settings-text.ts`에 보드 키 이름으로 더한다(055 관례, C4). 미리보기·행 값처럼 시를 끼워 넣는 문장은 `src/app/target-hour.ts`가 조립하므로,
  끼워 넣는 틀(템플릿 조각)은 `src/app/target-hour.ts` 안의 상수로 두고 `settings-text.ts`는 정적 문구(제목·오전·오후·취소·장소 칸 이름·설명·지도 고지)만 갖는다.
  계약 테스트가 두 곳의 원문을 글자 단위로 잠근다.
- **Rationale**: `src/app/`이 `src/ui/`를 import하면 계층이 거꾸로 선다(앱 로직 ← 화면). 실제로 `src/app/`에서 `src/ui/`로의 import는 0건이다(소스 확인 — 이 방향을 만들지 않는다).

## R9. 걷는 것과 테스트의 운명

- `src/ui/AutoDiarySettingsScreen.tsx`·`src/ui/GeocodingSettingToggle.tsx`와 자기 테스트(`__tests__/ui/auto-diary-settings-screen.test.tsx`·`geocoding-setting-toggle.test.tsx`·
  `denied-guidance.test.tsx`의 `AutoDiarySettingsScreen` 블록)를 지운다. `enduser-screen-migration.test.tsx`가 이 둘을 목록에 두고 있으면 목록에서 뺀다.
  `SelectRow`(`components/`)는 `CharacterListScreen` 등 다른 쓰임이 있어 남긴다.
- 020의 계약 「정밀도 암시 문구 없음」(E5)은 새 문구(행 값·미리보기)에 같은 소스 검사로 옮긴다(FR-035).
- 017 L8 「켤 때 고지 문구」 계약은 `6l` 대화상자 안으로 옮긴다(FR-026, 해요체).

## R10. Maestro

- 시각·장소 자리를 지나는 흐름은 `scheduled-diary-notification.yml`(옛 `home-menu-button` 진입 — 051 이후 stale)과 `diary-body-screen.yml`(`geocoding-*` 칸)이고 **둘 다 `FLOWS` 밖**이다.
- **Decision**: 이 조각의 흐름 `.maestro/settings-time-place.yml`을 새로 써서 `FLOWS`에 등록한다(설정 진입 `home-settings` → 토글 켬 → 시각 행 → 격자 칸 → 행 값 → 장소 행 → 「끔」 → 행 값 → 원래 값으로 되돌림).
  `scheduled-diary-notification.yml`의 시각 단계와 `diary-body-screen.yml`의 장소명 블록은 새 `testID`로 고치되 두 흐름은 그대로 `FLOWS` 밖에 둔다(진입 경로 등 다른 stale 단계는 이 조각 범위 밖 — C7).
- **Rationale**: C8 — 등록하지 않은 흐름은 아무것도 검증하지 않는 초록불이다.

## R11. 토글 꺼짐 손잡이 색 (T2)

- **Decision**: 꺼짐 손잡이 = `COLORS.textMuted`(#6b6767, 보드 neutral-600 근처). 계산: 면 `#eae7e7` 대비 **4.54:1**, 지면 `#f8f4f4` 대비 5.11:1 — 비텍스트 UI 3:1을 넘는다(SC-007).
  `SETTINGS.toggle.knobOff` 토큰으로 두고 `theme-tokens.test.ts`가 3:1 하한을 잠근다.
- **Alternatives**: `#9f9d9d`(`COLORS.border`) — 면 대비 2.19:1로 미달.
