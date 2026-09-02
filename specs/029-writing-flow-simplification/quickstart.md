# Quickstart — 실기기 검증 시나리오 (029)

기기: SM-S901N / Galaxy S22 (Android 16 / SDK 36), dev 빌드.
`npx expo run:android` + `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`.
헌법 개정(v1.3.0)이 **먼저 커밋**돼 있어야 한다.

기기 없는 검증은 먼저:
```
npm run test:logic        # resolve-generation · essential-assets · decision · 스토어
npm run test:ui           # 홈 위젯 부재 · 온보딩 assets 단계 · 설정 세 섹션
npm test                  # 전부
npm run lint              # eslint + tsc + check-constitution + prettier
```

---

## Q1 — 최초 실행: 온보딩 → 필수 에셋 → 첫 일기 1탭 (US1, SC-001·004·009)

**사전**: `adb shell pm clear <package>` (또는 새 설치). 개발 기계에서 모델
파일을 미리 심지 **않는다** — 온보딩이 받아야 한다.

1. 앱 실행 → "시작하기 전에" 온보딩. 권한 단계들 진행(허용 또는 건너뛰기).
2. 권한 단계 뒤 **"필수 에셋 다운로드"** 화면 확인:
   - 진행률 바 **하나** (항목별 나열 없음).
   - **[건너뛰기] 버튼 없음**.
   - [시작하기] 비활성.
3. 다운로드 진행 관찰 (`adb logcat`에 026 세그먼트 로그). 완료되면:
   - [시작하기] 활성 → 누르면 홈으로.
4. 홈에서 날짜 셀렉트 = 오늘(일기 없음 상태) + **"일기 쓰기" 한 번 탭**:
   - 캐릭터·사진·장소명을 **묻지 않고** 곧바로 "쓰고 있다" 화면.
   - `adb logcat`에 `model-not-ready` **없음**.
   - 생성된 일기가 **quiet(금동이)** 로 쓰임 (온보딩 기본 캐릭터).
5. `adb exec-out run-as <package> cat files/preferences/selected-character.json`
   → `{"character":"quiet"}` (생성 성공 후 기록, FR-008a).

**통과 기준**: 최초 사용자가 한 번의 "일기 쓰기" 탭으로 첫 일기를 얻는다.
model-not-ready 없음.

---

## Q2 — 온보딩 완료 게이트 AND (US5, SC-004)

1. Q1 완료 상태에서 `adb shell run-as <package>` 로 `files/models/`의 `a1.bin`
   삭제 (또는 `v1.bin`).
2. 앱 강제 종료 후 재실행:
   - 홈이 아니라 **온보딩(에셋 다운로드 단계)** 이 뜬다 (FR-020).
   - `onboarding.json`의 `completed`는 여전히 `true` — 게이트가 실시간 조회로
     판정 (DR2).
3. 에셋을 다시 받아 [시작하기] → 홈. 다음 재실행부터 곧바로 홈 (DR3).

---

## Q3 — 기존 사용자: 홈 1탭 (US2, SC-002·003)

**사전**: 마지막에 쓴 캐릭터가 있는 상태 (Q1에서 quiet로 하나 씀). 다른
캐릭터를 하나 더 받아 두면 좋다(예: imaginative).

1. 홈 화면 확인:
   - 일기 목록 + "일기 쓰기" + 날짜 셀렉트 **만**.
   - `CharacterPicker`·`VisionPicker`·장소명 토글 **없음** (SC-002).
2. 날짜 셀렉트에서 어제 선택 + "일기 쓰기":
   - 어제 일기가 없으면 확인 없이 생성. 있으면 덮어쓰기 확인 1회 (FR-004).
3. 생성된 일기가 **마지막에 쓴 캐릭터**(quiet)로 쓰임 (SC-003).
4. 홈 탭 수 세기: "일기 쓰기"(+ 덮어쓰기 확인 시 1회) = 최대 2탭 (SC-002).

---

## Q4 — 설정 탭 세 섹션이 자동 판정을 덮어쓴다 (US4, SC-005)

1. 설정 탭 → "일기 작성자" 섹션:
   - 5개 캐릭터가 persona 이름·소개로 보임 (모델 이름 **없음**).
   - 준비된 다른 캐릭터(imaginative) [작성자로 선택].
2. 홈 → "일기 쓰기" → 생성된 일기가 **imaginative**로 쓰임 (고정값이 마지막
   캐릭터를 덮어씀, FR-012 / R1).
3. 설정 탭 → "사진 보기" → **"보지 않음"** 고정.
4. 사진이 있는 날(합성 하루 또는 실제) 선택 → "일기 쓰기":
   - 캡션이 돌지 않고("사진: 없었다") 일기가 사진 없이 쓰임 (SC-005 — 자동 판정
     "빠르게 봄"을 덮어씀).
5. 설정 탭 → "사진 보기" → **"자동"** 으로 되돌림 → 사진 있는 날 다시 쓰기 →
   이번엔 캡션이 돎 (FR-010).
6. 설정 탭 → "장소명" → **"끔"** → 위치 권한이 있어도 일기에 지명 없음 (R6).

---

## Q5 — 캐릭터 손상 시 세션 중 안내 (FR-014, Edge Cases)

1. 앱이 홈에 떠 있는 상태에서, `adb shell run-as` 로 마지막에 쓴 캐릭터의
   모델 파일을 손상(바이트 몇 개 덮어쓰기)시킨다. 다른 준비된 캐릭터가
   **없도록** 정리.
2. 홈에서 "일기 쓰기":
   - 생성이 시작되지 **않고**, "일기 작성자를 준비해야 한다" 안내 + 설정 탭으로
     가는 길 (FR-014).
   - **온보딩이 다시 뜨지 않는다** (세션 중 = 설정 탭 안내, 진입 시점 = 온보딩).
3. 앱을 강제 종료 후 재실행 → 이번엔 **온보딩**(에셋 다운로드)이 뜬다
   (진입 게이트, FR-020) — 시점으로 갈린다.

---

## Q6 — Maestro 회귀

```
node scripts/run-device-tests.mjs
```

갱신 대상 흐름:
- `generate-diary.yml` — 홈에서 위젯 거치던 단계 제거, "일기 쓰기" 직행.
- `diary-character-select.yml` — "캐릭터" 탭 → 설정 탭 "일기 작성자" 섹션으로 경로
  변경 (또는 이 흐름을 설정 탭 흐름으로 재작성).
- 온보딩 흐름(`unified-permission-onboarding.yml`) — 권한 뒤 assets 단계 추가,
  [건너뛰기] 부재 assert.
- 신규 `writing-flow-simplified.yml` — Q1·Q3 시나리오. `run-device-tests.mjs`의
  `FLOWS`에 등록 (미등록 시 안 돌아감 — AGENTS.md 경고).

---

## 검증 후 기록

### 실기기 검증 완료 (2026-09-02, SM-S901N / Galaxy S22, Android 16 / SDK 36, dev)

**Q1 — 최초 실행: 온보딩 → 필수 에셋 → 첫 일기 1탭 (SC-001·004·009)**
- `onboarding.json` `completed:true`인데 필수 에셋(v1·v2·a1) 미준비 상태에서 앱 실행 →
  **홈이 아니라 온보딩(에셋 다운로드 단계)이 뜸** (FR-020, 028 model-not-ready 재발 방지).
- 권한 단계 전부 건너뛴 뒤 `onboarding-step-assets` 단계가 뜸: **[건너뛰기] 없음**(SR2),
  **진행률 바 하나**(`onboarding-assets-progress`, SR3), **[시작하기] 비활성**(SR3), 모델 정보 없음.
- 다운로드 실측: v1(VLM base, 379MB)·v2(VLM projector, 103MB)·a1(quiet, 1523MB) **병렬**
  세그먼트 다운로드(026 재사용). 3개 전부 MD5 검증 통과(a1 `d8506380fd1f0fdb8e4318a01b8b8e34`
  = roster 채록값 일치). 총 ~2GB, WiFi에서 약 3분.
- 완료 → **[시작하기] 활성화**(SR4) → 홈 진입. 홈에 캐릭터·사진 설정·장소명 위젯 **없음**(SC-002).
- **"일기 쓰기" 1탭 → 생성 시작. `adb logcat`에 `RNLlama loadPrompt:580 ... num_prompt_tokens=584,
  has_media=0` — model-not-ready 없음.** 온보딩이 받은 `a1.bin`으로 추론 성공.
- ⚠️ **quiet + 사진 없는 날(584토큰 빈약 신호)은 거부(echo) 빈도가 높다** — 첫 시도 2회
  "일기가 제대로 나오지 않았다. 다시 시도해 볼 만하다"로 거부, 3회차에 성공(AGENTS.md
  012 "신호 빈약 → echo 거부, 재시도로 해소" 재확인). **거부 시 기존 파일 안 건드림**
  확인(원칙 I — `files/diary/`에 파일 안 생김).
- 생성 성공: `2026-09-02.json`, `character:"quiet"`, title "2026-09-02에 금동이로 본 것",
  `writingMs: 36430`(36초, quiet 콜드), 본문이 화자=휴대폰·짐작 말투(원칙 II).
- **`selected-character.json` = `{"character":"quiet"}` — 생성 성공 직후 기록**(FR-008a,
  갱신 주체가 홈 CharacterPicker → 파이프라인 성공 경로).

**Q2 — 온보딩 완료 게이트 AND (SC-004)**
- Q1 완료 상태에서 `run-as rm files/models/a1.bin` → 앱 재실행 → **온보딩 재노출**
  (`completed:true` 유지, 게이트가 003·011 readiness 실시간 조회로 판정, DR2).
- 권한 건너뛰면 에셋 단계 재노출, [내려받기] → **026 이어받기로 v1·v2 스킵, a1만 재다운로드**
  (FR-021 확인). a1 재검증 통과(1522796768 바이트 = expectedBytes 정확 일치).
- a1 완료 후 재실행 → **곧바로 홈**(DR3). 09-02 일기 유지.

**Q3 — 기존 사용자: 홈 1탭 (SC-002·003)**
- 홈에서 날짜 셀렉트로 09-01(일기 없음) 선택 → "2026-09-01를 쓴다" 갱신 → **"일기 쓰기"
  1탭 → 덮어쓰기 확인 없이 곧바로 생성**(FR-004).
- `2026-09-01.json`, `character:"quiet"` — **`selected-character.json`의 quiet와 일치**
  (SC-003, "마지막에 쓴 캐릭터" 자동 판정). `writingMs: 36060`, `num_prompt_tokens=561`.
- 다른 날 생성이 09-02 일기 안 건드림.

**Q4 — 설정 탭 세 섹션 (SC-005)**
- 설정 탭에 3섹션 전부 렌더:
  - **"일기 작성자"**(`author-picker`, `author-option-0~4`): 금동이·루이·오드·샤오바이·모카
    persona 이름·소개, **모델 정보 없음**(kanana/exaone/…/gguf/Q4/파라미터 assert 통과),
    준비된 캐릭터에 "작성자" 표식, 미준비 캐릭터 "아직 준비되지 않음".
  - **"사진 보기"**(`vision-auto/none/quick/detailed`): 4상태, **"자동"에 "선택" 표식**(기본값,
    FR-024). "자세히 봄" hint "그만큼 오래 걸린다"(FR-020).
  - **"장소명"**(`geocoding-auto/on/off`): 3상태, **"자동"에 "선택" 표식**(기본값, FR-025).
    "켬"/"자동" → "좌표를 기기의 지도 서비스에 물어봅니다." 고지, "끔" → 고지 사라짐.
  - **미준비 캐릭터 다운로드 관리**("캐릭터" 제목 + "준비하기"/"지우기" + `vision-row` 460MB
    "쓸 수 있음") — **"캐릭터" 탭 흡수**(Q1=A). VLM이 하나의 값(v1·v2 두 파일 안 드러남).
  - "권한" 섹션 "허용됨"(021 유지).
- **`vision-setting.json` = `{"auto":true}`** — "자동" 센티넬 직렬화 확인(T008, 계약 ST1).
- 미준비 캐릭터(오드) 탭 → disabled라 `onSelect` 안 불림, `selected-character.json` 안 바뀜(정상).

**Q6 — Maestro 회귀 (SC-009)**
- **신규**: `.maestro/writing-flow-simplified.yml` PASS (`run-device-tests.mjs` FLOWS 등록).
- **029 갱신·PASS**: `unified-permission-onboarding.yml`(권한 뒤 assets 단계·[건너뛰기] 부재·
  M5 재노출), `generate-diary.yml`(홈 위젯 부재·1탭), `diary-character-select.yml`(설정 탭
  "일기 작성자" 경로), `diary-user-path.yml`(캐릭터 탭 → 설정 탭), `photo-vision.yml`(설정 탭
  "사진 보기" 4상태), `diary-body-screen.yml`(설정 탭 "장소명" 3상태), `model-acquisition.yml`
  (persona 이름으로 재작성 — 023-era `"quiet"` 내부 키 stale도 함께 고침).
- **회귀 없음·PASS**: `skeleton.yml`, `today-diary.yml`, `past-day-diary.yml`,
  `writing-monologue.yml`, `writing-monologue-expansion.yml`, `prompt-preview.yml`(022,
  `buildPrompt` 시그니처 불변 재확인 = SC-006 실기기), `scheduled-diary-notification.yml`(020).
- **탭 경로만 수정**(전체 실행은 GB 다운로드 필요 — 별도 세션): `download-conflict.yml`,
  `parallel-model-download.yml` (`tapOn "캐릭터"` → `"설정"`, `element: "english"/"chinese"`
  → persona 이름).
- **데이터 부재로 미실행**(029 무영향): `diary-photo-gallery.yml`(사진 있는 저장 일기 필요),
  `photo-selection-over-limit.yml`(seed `many-camera 2026-08-28` 필요 — 앞부분 설정 탭
  vision-quick 고정은 정상 동작 확인).

**Maestro 실측 함정 (025 계열 재확인)**: `AuthorPicker`·`VisionPicker`·`GeocodingSettingToggle`은
`scrollUntilVisible`이 섹션 컨테이너 상단에서 멈춰 두 번째 항목부터 화면 밖 → **각 옵션을
testID로 개별 스크롤**해야 한다(`author-option-N`, `geocoding-off` 등).

**미확인 잔여**:
- Q5(세션 중 캐릭터 손상 → 설정 탭 안내, FR-014) — 모델 파일 손상 조작 + 다른 준비 캐릭터
  없는 상태 정리가 필요. 계약 테스트(HT4, C13a)가 이 갈래를 잠금.
- Q4의 "사진 보기 고정값이 실제 생성에서 자동 판정을 덮어씀"(SC-005 실제 생성) — 사진 있는
  seed 하루 + 생성이 필요. `resolve-generation.test.ts` C6·C7이 계약으로 잠금.
- prod 빌드에 개발자 탭 없음 / release R8 — 새 네이티브 모듈·빌드 설정 없어 **release 재확인
  생략**(012 기준: `expo-media-library`·`expo-file-system`·`createAcquisition`·`prepareVision`
  전부 기존 통로 재사용, 새 JNI·동적 import 없음).

**실기기 상태 변경**: `unified-permission-onboarding.yml`이 `clearState`로 앱 데이터를 전부
날렸다(모델·일기·설정·`onboarding.json` 삭제). 다음 실기기 세션은 온보딩부터 다시 하거나
에셋을 재배치해야 한다.
