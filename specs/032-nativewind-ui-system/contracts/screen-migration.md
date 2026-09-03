# Contract: 화면 이관 불변식 (SM)

**Feature**: 032-nativewind-ui-system
핵심 화면군 5개를 새 토큰·컴포넌트 위로 옮길 때 **표현만 바뀌고 기능·문안·
네비게이션·`testID`·헌법 경계는 불변**임을 잠근다. 각 화면의 **기존 `.tsx`
테스트가 수정 없이 통과**하는 것이 1차 계약이다. 아래는 그 위에 더하는 명시
불변식.

**공통 원칙 (모든 이관 화면)**:
- 기존 `testID`·`accessibilityRole`·화면 문안(사용자가 읽는 한국어) **문자
  그대로 유지**. 스타일(`style`→`className`)만 교체.
- 새 `className`은 토큰 유래 클래스만(원시 hex·매직 px 제거 — SC-001).
- `checkSourceFile` 위반 0 (모델·프롬프트·지표·색 스킴).
- 그 화면의 기존 `__tests__/ui/*.test.tsx`가 **초록** (FR-015).
- 그 화면을 건드리는 Maestro 흐름을 실기기에서 1회 돌린다(FR-018). 깨지면
  `testID` 유지 원칙으로 흐름이 아니라 구현을 고친다. 흐름 자체가 stale(014
  이후 방치)이면 흐름도 갱신하고 `FLOWS` 등록 확인.

---

## SM1 — `DiaryListScreen` (이관 2a)

**기존 테스트**: `__tests__/ui/diary-list.test.tsx` (전부 통과 유지).

불변식:
- `onWrite`는 **인자를 받지 않는다**(원칙 I, S1). 시그니처 `() => void` 유지.
- 사진 갈래 3문구 정확히: `"사진 N장"` / `"사진 없음"` / `"사진 모름"`
  (원칙 V — `none` ≠ `unknown`).
- 빈 상태 문구 `"아직 일기가 없다"` + `"일기 쓰기"` 버튼 유지.
- `testID`: `denied-notices`, `day-<YYYY-MM-DD>` 유지. 날짜는 `YYYY-MM-DD`
  그대로(상대어 "어제" 금지).
- 모델 식별자(`gguf`/`Q4`/`kanana`/`.bin` …)·지표(`토큰`/`초`/`%`/`ms`)
  미노출.
- 고르는 자리에 사진 갈래 미표시(X1 — 아직 안 쓴 하루).
- `movedNotice`·`revertedFrom` 문자열만 그림(화면이 persona·비교 안 함).

**Maestro**: `diary-user-path.yml`, (목록이 등장하는) `today-diary.yml`,
`past-day-diary.yml`, `writing-flow-simplified.yml`.

---

## SM2 — `DiaryDetailScreen` (이관 2b)

**기존 테스트**: `__tests__/ui/diary-detail.test.tsx`, `__tests__/ui/photo-gallery.test.tsx`
(전부 통과 유지).

불변식:
- 025 슬라이더: 가로 페이징, `photo-slider-pager`/`photo-slider-cell-<i>`/
  `photo-slider-position`, 위치 표시 `N / M` + `accessibilityLabel` 병행,
  `resizeMode="contain"`.
- 025 갤러리: 풀스크린 `Modal`(RN 코어), `photo-gallery-*`, 시작 인덱스 =
  탭한 사진, 순환 없음(마지막에서 안 넘어감), 닫기(버튼 + 안드로이드 뒤로) 시
  상세 스크롤 위치 유지.
- 017: 사진 0장이면 슬라이더 영역 없음 + `"사진: 없었다"` 텍스트. 사본 실패 시
  `diary-photo-missing` + `"이 사진은 이제 없다"`. 기존 `diary-photo` testID 유지.
- 사후 소요시간 표기(있다면): 완료 후 1회성 사실 문장만, 진행 중·비교·모델
  식별자 동반 금지(원칙 IV 1.2.0). 이관이 이 규칙을 바꾸지 않는다.
- 제목·본문·"이 일기가 본 것" 절 구성·문안 유지.

**Maestro**: `diary-body-screen.yml`, `diary-photo-gallery.yml`.

---

## SM3 — `DiaryHomeScreen` 생성 중 뷰 (이관 2c)

**기존 테스트**: `__tests__/ui/diary-home.test.tsx`,
`__tests__/ui/diary-home-notification.test.tsx` (통과 유지).

불변식:
- `screen.kind === "writing"` 갈래만 이관. 이 뷰에 **진행률 숫자·경과 시간·
  생성 중인 글이 없다**(005 FR-028b, 015·016). 회전 표시(`ActivityIndicator`
  — 진행률 파라미터 없음) + "그만두기" 버튼만.
- 015·016 계약 테스트(있으면)가 검사하는 "미노출" 항목 그대로.
- 홈 화면 흐름·탭 구조·"일기 쓰기 1탭" 불변(029, spec FR-021). 위젯을
  되살리지 않는다.

**Maestro**: `writing-monologue.yml`, `writing-monologue-expansion.yml`,
`writing-flow-simplified.yml`, `generate-diary.yml`.

---

## SM4 — `OnboardingScreen` + 에셋 다운로드 단계 (이관 2d)

**기존 테스트**: `__tests__/ui/onboarding-screen.test.tsx`,
`__tests__/ui/onboarding-complete-gate.test.tsx`,
`__tests__/ui/denied-guidance.test.tsx` (통과 유지).

불변식:
- 권한 단계: 순서·문안·`[허용]`/`[건너뛰기]` 존재·건너뛰기 가능성(021·031)
  유지. 031이 `photo-location` 단계를 뺀 상태 그대로(되살리지 않음).
- 단계 식별 `testID`(`onboarding-step-*`) 유지 (021 Maestro가 정규식으로 찾음).
- 에셋 다운로드 단계: **합산 진행률 하나**(항목별 나열 없음), 완료 전
  `[시작하기]` 비활성, 건너뛰기 없음(029). 이관이 이 규칙을 바꾸지 않는다.
- 진행률 표시는 029가 온보딩 다운로드 진행으로 정리한 것(생성 진행률 아님) —
  원칙 IV와 무관, 이 스펙이 판단을 바꾸지 않는다.
- 뒤로 가기 없음, 완료 시 `onboarding.json` `completed: true`.

**Maestro**: `unified-permission-onboarding.yml` (⚠️ `pm clear`로 앱 데이터
날림 — 검증 순서 주의, 024 §7 교훈).

---

## SM5 — 설정 탭 조립 (이관 2e)

**대상 파일**: `AutoDiarySettingsScreen.tsx`, `PermissionsSection.tsx`,
`AuthorPicker.tsx`, `VisionPicker.tsx`, `GeocodingSettingToggle.tsx`,
`App.tsx`의 `SettingsScreen`/`AutoDiarySection` 조립부 + 탭바 스타일.

**기존 테스트**: `__tests__/ui/auto-diary-settings-screen.test.tsx`,
`__tests__/ui/permissions-section.test.tsx`, `__tests__/ui/author-picker.test.tsx`,
`__tests__/ui/vision-picker.test.tsx`, `__tests__/ui/geocoding-setting-toggle.test.tsx`
(전부 통과 유지).

불변식:
- **"일기 작성자"는 persona 이름·소개·준비 여부만**(원칙 III,
  `checkSourceFile` `UI_TOUCHES_MODEL`). `AuthorPicker`가 `roster`·모델 식별자에
  안 닿음. `author-picker`/`author-option-<i>` testID 유지. `SelectRow`로
  구현을 바꾸면 그 testID를 `SelectRow`에 전달해 유지.
- 자동 생성 목표 시각: 시 단위(0–23)만, "정각"·"매일 7시" 같은 정밀도 암시
  문구 없음(020 — 계약 테스트가 소스에서 검사).
- 권한 섹션: 5행 라이브 상태, OS 링크 버튼, `AppState` `change→active` 복귀
  갱신(021 SC-006). 031이 뺀 `photo-location` 행 없음.
- `Toggle` 재사용 시 `GeocodingSettingToggle`·자동 생성 토글의 기존 동작·
  `testID` 유지.
- 탭바(`App.tsx` `styles.tab`/`tabOn`/`tabOff`): "일기"/"설정"/("개발자") 라벨·
  `setTab` 동작 불변. 스타일만 토큰화. 개발자 탭 노출 조건(`showsDiagnostics`)
  불변 — prod에서 탭 없음.
- 개발자 탭 내부 화면(`DiagnosticsScreen` 등)은 **이관 안 함**(SHOULD, 범위 밖).

**Maestro**: `scheduled-diary-notification.yml`(설정 탭 진입 — 020·021·024가
stale 반복), `skeleton.yml`(탭 네비 — 022가 stale 수정), `writing-flow-simplified.yml`.

---

## SM6 — 완료 게이트 (spec FR-013, SC-001)

이 스펙이 "완료"이려면:
- SM1~SM5 **전부** 이관 (원시 hex·매직 px 0, 토큰·컴포넌트 사용).
- 각 화면의 기존 `.tsx` 테스트 초록 (`npm run test:ui` 전체).
- `npm run test:logic`·`npm run lint` 초록.
- SM1~SM5의 Maestro 흐름 전부 통과(갱신 포함).
- SM-S928N(One UI 8.5) debug 실기기에서 5개 화면군 육안 확인:
  라이트 톤 표시(다크 모드 켠 상태 포함, 031 유지), 025 슬라이더·갤러리 회귀
  없음, 생성 중 뷰 진행률·글 미표시, WCAG 대비 육안 OK.
- **미이관 화면**(`CharacterListScreen`, 개발자 탭 4화면)이 기존 톤으로
  정상 동작(FR-012, 혼재 허용).
