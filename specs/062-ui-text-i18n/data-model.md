# Data Model: 062 화면 문구의 다국어 구조

저장되는 데이터는 없다. 모두 프로세스 메모리 안의 값이다(Clarification Q2 — 언어 설정 파일을 두지 않는다).

## Language

- 지원 언어 식별자. BCP-47 언어 마디 소문자(`"ko"`).
- `SUPPORTED_LANGUAGES: readonly Language[]` — 이번 판 `["ko"]`. `DEFAULT_LANGUAGE: Language` — `"ko"`. 둘 다 `src/i18n/languages.ts` 한 곳(FR-002).
- 규칙: `DEFAULT_LANGUAGE`는 `SUPPORTED_LANGUAGES`에 들어 있다(테스트).

## DetectedLocales

- 감지 결과. `readonly string[] | null`.
  - 배열: 기기 선호 순서대로의 `languageTag`(원문 그대로, 예: `"ko-KR"`, `"en-US"`). 빈 문자열 태그는 감지 통로가 미리 걸러낸다.
  - `null`: 감지 못함(예외·빈 목록·모듈 없음). 빈 배열을 돌려주지 않는다 — 「못 읽음」은 한 가지 모양이다.

## LanguageResolution

| 필드 | 타입 | 뜻 |
| --- | --- | --- |
| `detected` | `DetectedLocales` | 감지한 것. 해석이 바꾸지 않는다(FR-008) |
| `chosen` | `Language` | 고른 것 |
| `matched` | `boolean` | 감지한 것 중 하나가 지원 목록과 맞았는가. `false`면 기본 언어로 떨어진 것 |

- 상태 전이 없음. 프로세스 첫 호출에서 한 번 만들어진다(FR-011).
- `matched === false`인 경우: `detected === null` 이거나 어떤 태그도 맞지 않음.

## Catalog

- 한 언어의 화면 문구 전부. `type Catalog = typeof ko`(R4). 최상위 키는 영역이다:

| 영역 키 | 원래 자리 (이관 전) |
| --- | --- |
| `home` | `ui/home-text.ts`, `DiaryHomeScreen`·`DiaryListScreen` 리터럴, `app/failure-toast.ts` |
| `settings` | `ui/settings-text.ts`, `app/skipped-line.ts`, `app/target-hour.ts` 문장 틀 |
| `developer` | `ui/developer-text.ts` |
| `diagnostics` | `app/diagnostics-text.ts`, `app/diagnostics-view.ts`의 조각, `DiagnosticsParts` 리터럴, 새 언어 줄(FR-011b) |
| `welcome` | `WelcomeScreen`·`LogoScreen` 상수 |
| `download` | `DownloadProgressScreen`·`DownloadConsentDialog` 상수 |
| `onboarding` | `OnboardingScreen` 상수, `onboarding/requirements.ts`의 화면 문구(`ifDenied` 등) |
| `monologue` | `diary/monologue.ts` 후보 표 |
| `notification` | `schedule/notification-text.ts`, `notification-port.ts` 채널 이름 |
| `calendar` | 요일 표(긴·짧은), 월·일 표기 함수 — 홈·달력·설정이 함께 쓴다 |

- 실제 키 이름은 이관할 때 원래 상수 이름을 따른다(예: `SETTINGS_TEXT.autoWrite` → `settings.autoWrite`) — 원래 이름이 곧 보드 원문 대조 테스트의 참조점이라 이름을 새로 짓지 않는다.
- 값의 종류: `string` · `readonly string[]`(개수 있는 튜플 포함) · 함수(`(…) => string`). 함수는 순수하고 던지지 않는다.

## CatalogRegistry

- `CATALOGS: Readonly<Record<Language, Catalog>>` — `src/i18n/catalogs/index.ts`. `Language` 유니온이 바뀌면 tsc가 빠진 카탈로그를 짚는다.

## 관계

```text
locale-port ──DetectedLocales──▶ resolveLanguage(detected, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE) ──▶ LanguageResolution
                                                                                                         │ chosen
                                                                                       CATALOGS[chosen] ─┘──▶ text(): Catalog
화면(렌더 안) ─▶ text().<영역>.<항목>          헤드리스 태스크 ─▶ text().notification.*          진단 ─▶ languageResolution()
```
