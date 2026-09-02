# Contract: 설정 탭 세 섹션 (일기 작성자 / 사진 보기 / 장소명)

관련 요구사항: FR-012, FR-023, FR-024, FR-025, FR-026, FR-027, FR-031.
"캐릭터" 탭 흡수: Clarifications 2026-09-02 Q1=A.

---

## S1 — "일기 작성자" 섹션 (FR-023·027·031)

### 렌더

- 5개 캐릭터 각각: **persona 이름·소개**(014 `personaOf`)와 준비 상태.
  - 준비됨(`ready`/`verified`) → [작성자로 선택] (고정). 현재 고정값이면 표시.
  - 미준비 → [내려받기] + 진행 상태(진행 중이면 `fraction`).
- **모델 식별자·파라미터·양자화 없음** (원칙 III, FR-023 MUST NOT).

### 규칙

- **SS1**: 섹션 컴포넌트는 `models/roster`·`ModelAsset`·`assetFor`를 import하지
  않는다 (`checkSourceFile` `UI_TOUCHES_MODEL`/`UI_TOUCHES_ASSET`). `App.tsx`
  (조립)가 준비 상태·persona 문자열을 계산해 props로 넘긴다 — 003
  `CharacterListScreen`이 이미 하던 방식.
- **SS2**: [작성자로 선택] → `saveSelection(selectionPort, character)`
  (= `selected-character.json`, FR-026·FR-008a 같은 파일).
- **SS3**: [내려받기] → 003 `createAcquisition(ports).prepare(character, cb)`.
  진행 표시는 `{ character, fraction }` 하나 (원칙 III·IV — 026 계약).
- **SS4**: "캐릭터" 탭이 사라졌으므로 003 `CharacterListScreen`의 다운로드 관리
  기능이 이 섹션으로 온다 — 멈춤·삭제·재개(003·026 기능) 유지.

### 자동 판정 연결 (FR-012)

- 고정값이 있으면 `resolveGenerationParams`의 `fixedAuthor`로 넘어가 R1 적용.
- 고정값이 없으면(선택 안 함) `fixedAuthor = null` → 마지막에 쓴 캐릭터 →
  온보딩 기본.
- **"고정값 없음"을 어떻게 표현하나**: `selected-character.json`이 없거나 로스터
  밖이면 `null`. 사용자가 명시적으로 [작성자로 선택]을 누르면 그 값이 저장되고,
  이후 그것이 "고정값"이자 "마지막에 쓴 캐릭터"의 시드가 된다. **두 개념이 한
  파일에 공존해도 충돌 없음** (research §2).

---

## S2 — "사진 보기" 섹션 (FR-024·026)

### 렌더

- 4개 선택지: **자동** / 보지 않음 / 빠르게 봄 / 자세히 봄. 기본 "자동".
- 현재 값 표시 (`loadVisionSetting` → `"auto"|"none"|"quick"|"detailed"`).

### 규칙

- **SS5**: 선택 → `saveVisionSetting(visionPort, value)`:
  - `"auto"` → `{ auto: true }` 저장.
  - `"none"|"quick"|"detailed"` → `{ vision: value }` 저장.
- **SS6**: `loadVisionSetting` 파싱 확장:
  - `{ auto: true }` → `"auto"`.
  - `{ vision: <VisionSetting> }` → 그 값.
  - 파일 없음·깨짐·형식 밖 → `"auto"` (029가 011의 `null`→"보지 않음" 해석을
    **"auto"로 바꾼다** — data-model §1).
- **SS7**: 반환 타입은 `"auto" | VisionSetting` — `VisionSetting` 타입
  (none/quick/detailed)은 **불변** (원칙 II, spec Assumptions).
- **SS8**: 자동 판정 연결 — `visionPreference` = `loadVisionSetting` 결과.
  `resolveGenerationParams` R5 적용.

---

## S3 — "장소명" 섹션 (FR-025·026)

### 렌더

- 3개 선택지: **자동** / 켬 / 끔. 기본 "자동".

### 규칙

- **SS9**: 선택 → `saveGeocodingSetting(geoPort, mode)` where
  `mode ∈ {"auto","on","off"}` → `{ mode }` 저장.
- **SS10**: `loadGeocodingSetting` → `"auto" | "on" | "off"`:
  - `{ mode }` → 그 값.
  - 구형 `{ enabled: true }` → `"on"`, `{ enabled: false }` → `"off"` (마이그레이션).
  - 파일 없음·깨짐 → `"auto"` (FR-025 기본값).
- **SS11**: "켬"을 고르면 위치 런타임 권한 요청 (017 L8 — `expo-location`
  `requestForegroundPermissionsAsync`). 요청 실패·거부해도 값은 "켬" 유지
  (017 L9). "끔"·"자동"은 요청 안 함.
- **SS12**: 자동 판정 연결 — `geocodingPreference` = `loadGeocodingSetting` 결과.
  `resolveGenerationParams` R6 적용. `"auto"` + 권한 없음 = 꺼짐 (017 FR-005 정신).

---

## S4 — 화면 조립 (FR-027)

- 세 섹션을 `AutoDiarySettingsScreen`에 더하거나, 별도 `AuthorSection`·
  `VisionSection`·`GeocodingSection` 컴포넌트로 만들어 설정 탭에서 합성한다
  (spec Assumptions — 화면 분리는 구현 판단). **어느 쪽이든 각 섹션 컴포넌트는
  판정하지 않고 props·콜백만** (007·020 선례).
- `App.tsx`의 `AutoDiarySection`이 세 스토어(`selectionPort`·`visionPort`·
  `geoPort`)를 만들고 로드/세이브를 배선.

## S5 — 소스 불변식 (계약 테스트)

- 세 섹션 컴포넌트(또는 `AutoDiarySettingsScreen`)에 `from "../models/` import
  없음 (원칙 III).
- `VisionSetting` 타입 정의(`src/diary/types.ts`)에 `"auto"`가 **추가되지 않음** —
  "auto"는 스토어 반환 타입의 유니온이지 `VisionSetting`이 아니다 (SS7).
- `check-constitution` 통과 (위반 0).

## 계약/화면 테스트

| # | 파일 | 확인 |
|---|---|---|
| ST1 | `__tests__/app/vision-setting-store.test.ts` | `{auto:true}`→"auto", `{vision:"quick"}`→"quick", 없음→"auto", 깨짐→"auto" |
| ST2 | `__tests__/app/geocoding-setting-store.test.ts` | `{mode:"on"}`→"on", 구형 `{enabled:true}`→"on", 없음→"auto" |
| ST3 | `__tests__/ui/settings-*.test.tsx` | "일기 작성자" 섹션에 모델 이름 문자열 없음, persona 이름만 |
| ST4 | `__tests__/ui/settings-*.test.tsx` | "사진 보기" 4선택지, 기본 "자동" |
| ST5 | `__tests__/ui/settings-*.test.tsx` | "장소명" 3선택지, "켬" 선택 시 권한 요청 통로 호출 |
| ST6 | 계약 | `src/diary/types.ts`의 `VISION_SETTINGS`에 "auto" 없음 |
