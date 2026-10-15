# Data Model: 개인정보처리방침·지원 페이지와 데이터 선언

저장되는 사용자 데이터는 없다. 아래는 저장소 안의 정적 자료와 화면 상태다.

## 1. 정책 링크 (`src/app/policy-links.ts`)

| 이름 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `PRIVACY_URL` | `https://mrtint.github.io/alpharium/privacy/` | 설정 「개인정보처리방침」 행, 지원 페이지의 방침 링크, 선언 초안 |
| `SUPPORT_URL` | `https://mrtint.github.io/alpharium/support/` | 설정 「도움말·문의」 행, 선언 초안(App Store 지원 URL) |

- 끝의 `/`까지 같은 문자열이어야 한다(대조는 문자열 그대로).
- URL 경로 `privacy/`·`support/`는 `site/privacy/index.html`·`site/support/index.html`과 짝이다.

## 2. 사이트 원문 (`site/`)

| 파일 | 담는 것 |
| --- | --- |
| `site/index.html` | 두 페이지로 가는 링크 |
| `site/privacy/index.html` | 방침 — 절 여덟(FR-002), 외부 전송 표식 절, 변경 이력 |
| `site/support/index.html` | 문의 메일, 자주 묻는 것 다섯, `PRIVACY_URL` 링크 |
| `site/.nojekyll` | 빈 파일 |

**자리표시자** — 정확히 셋. 그 밖의 `{대문자}` 꼴은 사이트에 없어야 한다.

| 자리표시자 | 채울 값 |
| --- | --- |
| `{SUPPORT_EMAIL}` | 지원 전용 메일 주소 |
| `{OPERATOR}` | 운영자(개인정보 보호 책임자) 이름 |
| `{EFFECTIVE_DATE}` | 시행일(예: 2026년 10월 xx일) |

## 3. 외부 전송 목록 (`__tests__/privacy/outbound.ts`)

```text
OutboundEntry { id, what, evidence }
  id       — 방침의 data-outbound 값과 같다
  what     — 무엇이 어디로 가는가(사람이 읽는 한 줄)
  evidence — 근거 자리(코드 경로 또는 플랫폼 문서)
```

| id | what | evidence |
| --- | --- | --- |
| `model-download` | 모듈 내려받기 — Hugging Face가 일반 웹 요청 정보를 받는다 | `src/models/roster.ts`, `src/vision/roster.ts` |
| `place-name` | 일기 한 편당 대표 좌표 하나 → 운영체제 지도 서비스 | `src/signals/geocoding-port.ts` |
| `os-diagnostics` | 운영체제 진단 보고 — 앱 코드가 아니라 플랫폼(사용자 설정에 따름) | 플랫폼 문서 — 앱 코드 없음 |

**외부 주소 허용 목록**(같은 파일)

```text
AllowedHost { host, reason }
```

| host | reason |
| --- | --- |
| `huggingface.co` | 모듈 내려받기(`model-download`) |
| `mrtint.github.io` | 방침·지원 페이지 — 앱이 접속하지 않고 OS 브라우저에 넘긴다 |

**검사에서 빼는 파일**(이유와 함께): `src/ui/pretendard-license.ts`(OFL 원문 문자열 — 앱이 접속하지 않음). 주석은 먼저 걷는다.
데스크톱 서버 주소는 소스에 상수 URL이 없다(`EXPO_PUBLIC_*` 환경 값, `local` 전용).

**금지 SDK 목록**(같은 파일) — `package.json` `dependencies`(앱에 실리는 것)의 이름 또는 접두사. `expo-notifications`는 로컬 알림에만 쓰므로 목록에 없고, 원격 푸시는 F2(푸시 토큰 호출 0)가 막는다: `@sentry/`, `sentry-expo`, `@react-native-firebase/`, `firebase`, `@bugsnag/`, `@datadog/`, `@amplitude/`, `mixpanel-react-native`, `@segment/`, `react-native-appsflyer`, `react-native-adjust`, `react-native-branch`, `react-native-onesignal`, `react-native-google-mobile-ads`, `expo-ads-admob`, `expo-firebase-analytics`, `expo-insights`, `expo-updates`(원격 업데이트 서버와 통신한다).

## 4. 설정 화면 상태

| 상태 | 자리 | 값 | 수명 |
| --- | --- | --- | --- |
| `linkFailed` | `App.tsx` 설정 조립부 | `"privacy" \| "support" \| null` | 설정 겹이 열려 있는 동안. 열기 성공 시 `null` |

`SettingsScreen`이 받는 것: `onOpenPrivacy()`, `onOpenSupport()`, `privacyFailedText?`, `supportFailedText?`(조립부가 `POLICY_LINKS_TEXT.openFailed(url)`로 만든다).

## 5. 선언 초안의 답 (`docs/store/privacy-declarations.md`)

```text
DeclarationAnswer { store, question, answer, evidence, marker }
  marker — [문서] | [코드] | [미확인]
```
