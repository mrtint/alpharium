# Quickstart: NativeWind + React Native Reusables 기반 미니멀 UI 시스템

**Feature**: 032-nativewind-ui-system
이 기능이 끝났는지 확인하는 실행 시나리오. 구현 코드는 담지 않는다(tasks.md와
구현 단계의 몫). 상세 계약은 `contracts/`·`data-model.md` 참조.

---

## 사전 준비

- 브랜치: `git branch --show-current` → `032-nativewind-ui-system` (스펙
  디렉터리 이름이 아니라 **체크아웃된 브랜치**를 눈으로 — AGENTS.md, 022 사고).
- 의존성: `npx expo install nativewind tailwindcss` 후 `npx expo install --check`.
  (`npm view` 금지 — AGENTS.md.)
- 실기기: **SM-S928N (Galaxy S24U, One UI 8.5)**. 다크 모드 라이트 고정 확인이
  포함되므로 필수. dev 빌드 재설치 + 모델 재배치가 필요할 수 있음
  (027 세션이 debug 앱을 지웠음 — 메모리 [[alpharium-device-session-batch]]).

---

## 시나리오 A — 1단계 기반이 섰다 (기기 불필요)

**목표**: 토큰·컴포넌트·빌드 설정이 들어오고 기존 테스트가 안 깨진다.

1. 설정 파일 4개 존재 확인:
   ```
   ls babel.config.js metro.config.js tailwind.config.js global.css
   ```
   → 4개 다 있음. (BC1~BC3, BC5)

2. `App.tsx`에 `import "./global.css";` 있음. (BC4)

3. 토큰 테스트:
   ```
   npm run test:logic
   ```
   → `theme-tokens.test.ts` 통과: 색 역할 9키, WCAG 대비 쌍 전부 목표 이상,
   `tailwind.config.js` 색 키 == `COLORS` 키. (DT1~DT6)
   → **기존 logic 테스트 개수 이상 통과** (회귀 0 — BC8).

4. 컴포넌트 + 트랜스폼 테스트:
   ```
   npm run test:ui
   ```
   → 7개 컴포넌트 테스트(`button`·`card`·`list-row`·`section-header`·
   `text-styles`·`toggle`·`select-row`) 통과. (UC1~UC7)
   → `nativewind-transform.test.tsx` 통과: `className="bg-bg p-4"` 렌더 +
   스타일 적용. (BC7)
   → **기존 ui 테스트 개수 이상 통과** (회귀 0 — BC8).
   → `jest-projects.test.ts` 파일 수 가드 통과. (UC8)

5. lint:
   ```
   npm run lint
   ```
   → eslint + `tsc --noEmit` + `check:constitution`(위반 0) + prettier 통과.
   → `check-constitution`이 `className`을 오탐하지 않음. (R7)
   → BC6: `darkMode: "class"`, `dark:` 0건, `useColorScheme`/`Appearance` 0건
   (031 확장이 `src/ui/theme/`·`src/ui/components/`까지 검사).

6. 새 네이티브 모듈 0 확인:
   ```
   git diff main -- package.json
   ```
   → 추가된 dependency가 `nativewind`·`tailwindcss`뿐. reanimated·
   gesture-handler·edge-to-edge·`@rn-primitives/*` 없음. (BC9)

7. 앱 첫 렌더 (실기기 or 에뮬레이터 dev):
   ```
   npx expo start --clear   # ★ Metro 캐시 비움 — 설정 파일 추가 후 필수
   ```
   → "Loading from localhost:8081..." 영구 정지 없음. 앱이 뜨고 기존 화면들이
   깨지지 않음(아직 이관 전이라 톤은 그대로).

---

## 시나리오 B — 핵심 화면이 새 톤을 입었다 (기기 필요, 이관마다 반복)

각 이관(2a~2e)마다:

1. 그 화면의 기존 `.tsx` 테스트 초록:
   ```
   npm run test:ui
   ```
   (SM1~SM5의 "기존 테스트" 목록.)

2. 그 화면 소스에 원시 hex·매직 px 0:
   ```
   # 예: DiaryListScreen
   grep -nE '#[0-9A-Fa-f]{6}|style=\{\{' src/ui/DiaryListScreen.tsx
   ```
   → 남은 것은 `hairlineWidth`·flex 관용값뿐. (SC-001)

3. 그 화면을 건드리는 Maestro 흐름 (SM1~SM5 목록) 실기기 1회:
   ```
   npm run test:device   # 또는 해당 흐름만
   ```
   → 통과. 깨지면 `testID` 유지 원칙으로 구현을 고침(흐름이 stale이면 흐름도
   갱신 + `FLOWS` 등록 확인 — 014·022·023 교훈).

4. SM-S928N 육안:
   - 그 화면이 따뜻한 라이트 톤(오프화이트 배경, 절제된 강조색 — 머티리얼
     파랑 아님).
   - 본문 글자가 배경 대비 또렷 (WCAG AA 체감).
   - `adb shell "cmd uimode night yes"` 로 다크 모드 강제 → 화면이 **여전히
     라이트**(dimmed·색 반전 없음). 확인 후 `cmd uimode night no` 복원. (SC-005)

특기 (이관별):
- **2b (`DiaryDetailScreen`)**: `many-camera`(12장) 하루로 「빠르게 봄」 생성 후
  상세 진입 → 슬라이더 `1 / 8` → 스와이프 `2 / 8`, 사진 탭 → 갤러리가 그
  인덱스에서 시작, 마지막에서 순환 안 함, 닫기 시 스크롤 위치 유지. 사진 0장
  하루 → "사진: 없었다" + 슬라이더 없음. (SM2, SC-006)
- **2c (생성 중 뷰)**: "일기 쓰기" → 생성 중 화면에 진행률 숫자·경과 시간·
  글 조각 **없음**(회전 표시 + "그만두기"만). 2회 관측. (SM3, SC-007)
- **2d (온보딩)**: `pm clear` 후 새 온보딩 → 권한 카드가 새 톤, 단계 순서·
  문안 그대로, 에셋 다운로드에 합산 진행률 하나 + 완료 전 "시작하기" 비활성.
  (SM4) ⚠️ 이 흐름이 앱 데이터를 날리므로 2b 특기 검증·모델 재배치 순서 주의.
- **2e (설정 탭)**: 설정 탭 → "일기 작성자"에 persona 이름·소개만(모델 식별자
  없음), 자동 생성 시각이 시 단위(0–23)·"정각" 문구 없음, 권한 5행 라이브 상태
  + OS 링크 + 앱 복귀 시 갱신. 탭바 라벨·이동 그대로. (SM5)

---

## 시나리오 C — 혼재 중간 상태가 정상 (기기 필요)

이관이 일부만 된 시점:

1. 이관된 화면과 안 된 화면(`CharacterListScreen`, 개발자 탭)을 오간다.
2. → 톤 차이는 보이지만 **크래시·스타일 누락 없음**. 앱이 정상 동작. (SC-008,
   FR-012)

---

## 시나리오 D — 완료 게이트 (SM6)

전부 참일 때 이 스펙이 "완료":

- [ ] SM1~SM5 5개 화면군 전부 이관 (원시 hex·매직 px 0, 토큰·컴포넌트 사용)
- [ ] `npm run test:logic` / `npm run test:ui` / `npm run lint` 전부 초록
      (회귀 0, 새 테스트 통과)
- [ ] `jest-projects.test.ts` 파일 수 가드 통과
- [ ] SM1~SM5 관련 Maestro 흐름 전부 통과 (갱신 포함, `FLOWS` 등록 확인)
- [ ] SM-S928N debug 실기기: 5개 화면군 라이트 톤 + 다크 모드 켠 상태 라이트
      고정 + 025 슬라이더·갤러리 회귀 없음 + 생성 중 뷰 진행률·글 미표시 +
      WCAG 대비 육안 OK
- [ ] 새 네이티브 모듈 0 → release 재확인 생략(012 기준)
- [ ] 미이관 화면(`CharacterListScreen`·개발자 탭)이 기존 톤으로 정상 동작
- [ ] PR로 머지 (main 직접 커밋 금지 — `.githooks`가 막음)

**미확인으로 남길 수 있는 것**: 회전 시 동작(앱이 `orientation: "portrait"`
고정이라 재현 불가 — 016·025 계열), iOS 표시(Expo Go 불가, Android 전용 검증).
