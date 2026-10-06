# 화면 문구의 다국어 구조 — 설계

- 날짜: 2026-10-06
- 출처: 저장소 소유자 지시(2026-10-06, `/kickoff` 인자) + 브레인스토밍 결정 두 가지
- 다음 단계: speckit-specify의 입력

## 목표

- 주 목적은 특정 언어 추가가 아니라 **여러 언어를 지원할 수 있는 구조**다. 언어 하나를 더하는 일이
  「카탈로그 파일 하나 + 지원 목록에 한 줄」로 끝나야 한다.
- **초기 버전의 지원 언어는 한국어 하나다.** 다른 언어 카탈로그는 범위 밖이다.
- **기기 로케일 감지는 실제로 돈다** — 감지 → 해석 → 카탈로그 선택. 지금은 결과가 언제나 한국어지만,
  테스트는 가짜 지원 목록·가짜 카탈로그로 다른 언어가 골라지는 것까지 보인다.
- **한국어 화면은 이 작업 전과 글자 하나 다르지 않다**(동작·문구 변화 0).

## 브레인스토밍 결정

| 질문 | 결정 |
| --- | --- |
| 한 스펙인가 둘인가 | **한 스펙**. 카탈로그 구조·로케일 통로·전 문구 이관을 함께 한다 — 반쯤 옮긴 상태(카탈로그와 리터럴 공존)를 머지하지 않는다 |
| 구조 접근 | **의존성 없는 자체 타입 안전 카탈로그 + `expo-localization`(감지)**. i18next(문자열 키·보간 문법이라 조사 같은 함수가 어색, 의존성 셋)와 Hermes `Intl` 감지(선호 언어 목록·앱별 언어 반영 미실측)는 고르지 않았다 |

## 현재 상태 (2026-10-06 실측)

- i18n·로케일 라이브러리 없음. `package.json`에 `expo-localization` 없음.
- 주석을 걷은 한국어 리터럴: `src/` 37개 파일·493개. 그중 `src/diary/prompt.ts` 104개는 대상 밖(모델 입력).
  나머지 큰 묶음: `monologue.ts` 60 · `home-text.ts` 57 · `diagnostics-text.ts` 46 · `settings-text.ts` 46 ·
  `developer-text.ts` 23 · `failure-text.ts` 18 · `target-hour.ts` 16 · `WelcomeScreen.tsx`·`DownloadProgressScreen.tsx` 13 ·
  `particle.ts`·`requirements.ts`·`collect.ts` 12. `App.tsx` 1.
- 화면 밖에서 화면에 보이는 문구: 혼잣말(`monologue.ts`), 권한 거부 안내(`requirements.ts` `ifDenied`), 준비 상태
  (`models/readiness.ts`·`vision/readiness.ts`·`acquisition.ts`), 완성 알림(`schedule/notification-text.ts` — 헤드리스에서 만든다),
  `target-hour.ts`·`skipped-line.ts`·`diagnostics-view.ts`.
- 한국어 문법이 코드에 있다: 조사(`particle.ts`), 요일·`{year}년 {month}월`·`{n}일`(`home-text.ts`), 「오후 10시쯤」(`target-hour.ts`).
- `collect.ts`의 `unknown` 까닭은 `prompt.ts`가 「사진은 모른다. {reason}.」으로 쓴다. 화면 경로(`src/app`·`src/ui`)에서 이 까닭을
  직접 그리는 자리는 grep으로 찾지 못했다 — plan에서 진단 화면 경로까지 확인한다.

## 설계

### 자리 — 새 계층 `src/i18n/`

| 파일 | 하는 일 |
| --- | --- |
| `languages.ts` | `SUPPORTED_LANGUAGES = ["ko"]`, `DEFAULT_LANGUAGE = "ko"`. 언어 추가는 여기 한 줄 |
| `resolve.ts` (순수) | `resolveLanguage(detected, supported, fallback) → { detected, chosen }`. 태그의 언어 부분을 소문자로 비교해 선호 순서대로 첫 일치, 없으면 기본. 「감지한 것」과 「고른 것」을 따로 담는다 |
| `locale-port.ts` | `expo-localization`의 `getLocales()`를 감싼다. 던지지 않는다. 실패·빈 값은 `null` — 지어내지 않는다 |
| `catalogs/ko.ts` | 한국어 카탈로그(정본). 화면별 묶음에 문자열과 함수(날짜·요일·시각·조사 결합)를 함께 둔다 |
| `catalog.ts` | `Catalog` 타입(한국어 카탈로그에서 파생) · `CATALOGS: Record<Language, Catalog>`. 다른 카탈로그는 `satisfies Catalog`로 tsc가 키·시그니처 누락을 잡는다 |
| `current.ts` | 프로세스 단위로 결정하는 `currentCatalog()`. React 컨텍스트가 아니라 모듈 함수 — 헤드리스 알림도 같은 해석을 탄다 |

### 경계

1. **모델 입력은 대상이 아니다.** `prompt.ts` 문안·061 바이트 대조·일기 본문·제목은 그대로다. 출력 언어는 캐릭터의
   `LANGUAGE` 표(원칙 III)에서 오며 UI 로케일과 무관하다.
2. **화면과 프롬프트가 함께 쓰는 문자열은 먼저 가른다.** `collect.ts` 까닭·페르소나 이름은 프롬프트로 흐르므로 제자리다.
   화면에 실제로 보이는 경로가 있으면 그 경로만 화면용 키로 가른다.
3. **조사는 한국어 카탈로그 안에서만 화면에 쓰인다.** `particle.ts`는 한국어 문법 모듈로 남아 프롬프트가 계속 쓰고,
   `src/ui`·`src/app`·`src/schedule` 등 화면 문구를 만드는 자리는 카탈로그를 거친다(헌법 검사로 직접 import 차단).
4. **원칙 IV** — 번역 품질을 재거나 채점하는 코드를 두지 않는다.
5. **원칙 V** — 로케일을 못 읽으면 기본 언어로 간다. 053의 `unseen`/`zero` 구분은 문구 이관과 무관하게 그대로다.

### 회귀·방어

- **이관 전에** 한국어 출력 골든을 잡는다(모든 문자열 + 함수의 대표 입력 결과). 이관 뒤 바이트 동일을 단언한다.
- `prompt-e2sn.test.ts`·`prompt.test.ts`는 손대지 않고 통과한다.
- 기존 보드 원문 대조 테스트(047 교훈)는 원문을 그대로 두고 참조만 카탈로그 키로 옮긴다.
- 테스트 전용 가짜 카탈로그로 감지 → 해석 → 선택 → 표시를 통과시키고, 그것이 제품 지원 목록에 없음을 소스 계약으로 잠근다.
- 「화면에 보이는 한글은 카탈로그에만 있다」를 소스 검사로 잠근다(허용 목록: 모델 입력 파일 등).
- 새 네이티브 의존성(`expo-localization`)은 dev 실기기에서 매니페스트·동작을 확인한다(release 검증 없음).

### clarify로 넘기는 결정

- 로케일을 읽는 시점(앱을 열 때 한 번 / 전경 복귀마다), 실행 중 기기 언어 변경을 다룰지
- 앱 안 언어 설정을 둘지(권장: 없음)
- 지역 변형 해석 규칙(`ko-KR`·`ko` → `ko`)
- 개발자·진단 화면(개발 빌드 전용)도 카탈로그로 옮길지
- 감지한 로케일을 진단 화면에 보일지

## 완료 조건

- `npm test`·`npm run lint`(헌법 검사 위반 0) 통과.
- 061 프롬프트 불변(위 두 테스트 무수정 통과), 한국어 화면 문구 불변.
- dev 실기기(SM-S901N): 기기 언어 한국어일 때 그대로 · 영어로 바꿔도 한국어로 떨어짐 · 백그라운드 완성 알림 그대로 ·
  언어 변경으로 프로세스가 다시 뜨는 경로.
