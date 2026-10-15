# 개인정보처리방침·지원 페이지와 데이터 선언 — 설계

- **작성**: 2026-10-15
- **로드맵 과제**: 「개인정보처리방침·지원 페이지와 데이터 선언」(`docs/roadmap/README.md`)
- **입력**: `docs/roadmap/release-readiness-analysis.md`의 W1·W2·W10·C6·M7·D2·D4 (2026-10-11 기준 — 아래 §1에서 다시 확인)
- **근거 표식**: [코드] 저장소 파일을 읽음 · [문서] 라이브러리·플랫폼·스토어 공식 문서 · [실측] 기기·CI에서 잼 · [미확인] 아무도 재지 않음 · [짐작] 근거가 약한 추론

## 0. 목표

두 스토어에 낼 수 있는 개인정보처리방침·지원 페이지 URL을 세우고, 앱 설정에서 닿게 하고, 스토어 데이터 선언 초안을
방침과 같은 사실로 쓴다. **방침의 문장은 하나도 실측·문서·코드 근거 없이 단언하지 않는다**(헌법 원칙 V — 어기면 스토어 허위 신고).

성공 조건:

1. 방침·지원 URL이 열린다(게시는 소유자가 원문을 확인한 뒤).
2. 앱 설정 「정보」에서 두 페이지에 닿는다(실기기).
3. Play 데이터 보안·App Privacy 답변 초안이 방침과 같은 사실을 말한다. 콘솔 입력은 소유자가 한다.
4. 방침이 기대는 코드의 사실이 바뀌면 테스트가 실패해 방침을 고치게 한다.

범위 밖: 백업 규칙·유실 안내 문구 구현(「일기·모델 백업과 유실 안내」 과제), 라이선스 고지(「모델·오픈소스 라이선스 고지」 과제), 크래시 SDK 도입(D2로 하지 않기로 함).

## 1. 확인한 사실 (2026-10-15)

### 1.1 분석 항목의 현재 상태

| ID | 분석(10-11) | 지금 |
| --- | --- | --- |
| W1 | 방침 URL 없음 | 그대로 — 저장소에 방침 문서·Pages 없음(`gh api …/pages` 404) [코드] |
| W2 | 데이터 선언 미작성 | 그대로 |
| W10 | 지원 URL 없음 | 그대로 |
| C6 | 앱 안 링크 없음 | 그대로 — `src/i18n/catalogs/ko/settings.ts`에 방침·문의 0건, 「정보」 묶음은 버전·서체 라이선스(083)·개발자 [코드] |
| M7 | 지오코딩의 네트워크 사용 미확인 | §1.2에서 소스·문서로 갈랐다 |
| D2 | 미정 | **넣지 않는다**(소유자, 2026-10-15) |
| D4 | 미정 | **안내 문구만**(소유자, 2026-10-15) — 이 과제는 방침의 보존·삭제 설명까지만 |

### 1.2 M7 — 장소 이름 변환 때 좌표가 기기 밖으로 나가는가

- [코드] `expo-location` 57.0.12 `reverseGeocodeAsync`는 JS에서 네이티브로 바로 간다. 안드로이드는
  `android.location.Geocoder(mContext, Locale.getDefault()).getFromLocation(lat, lng, 1)`(`LocationModule.kt:817`),
  iOS는 `CLGeocoder().reverseGeocodeLocation`(`ios/Geocoder.swift:28-29`)이다. Google Maps API 키 경로는 없다.
- [코드] 앱은 일기를 쓸 때 그날의 대표 좌표 하나(`places[0]`, `src/signals/places.ts:112`)를 넘긴다(`src/diary/pipeline.ts:349-364`).
  조건은 `geocodingEnabled` — 설정 「장소 이름으로 보기」가 `on`이거나, 기본값 `auto`이고 위치 권한이 있을 때(`src/app/resolve-generation.ts:107`).
- [코드] 앱은 기기의 GPS를 읽지 않는다(`getCurrentPosition`·`watchPosition`·`getLastKnown` 0건). 좌표는 사진 EXIF에서만 온다. 위치 권한은 지오코더가 요구해서 받는다(`src/onboarding/requirements.ts:95`).
- [문서] Apple `CLGeocoder`: "works with a network-based service to look up placemark information", "The computer or device must have access to the network". 요청은 앱마다 속도 제한이 있다.
- [문서] Android `Geocoder`: "Warning: This API may hit the network", 결과는 "no backend service available"이면 빈 목록이다(백엔드는 코어 프레임워크 밖).
- [짐작] 안드로이드에서 백엔드는 대개 Google Play 서비스다. 기기·제조사에 따라 다를 수 있다. 네트워크 패킷으로 확인하지 않았다.
- **결론**: 좌표 하나가 운영체제의 지도 서비스(iOS는 Apple, 안드로이드는 기기의 지오코더 제공자)로 나간다. 사진 파일은 나가지 않는다.
  설정 대화상자에는 이미 「좌표를 기기의 지도 서비스에 물어봐요.」(`settings.ts` `placeNotice`)가 있다 — 방침은 이 문장과 같은 말을 한다.

### 1.3 그 밖에 기기 밖으로 나가는 것

- [코드] 모델 내려받기: `huggingface.co` 세 URL(`src/models/roster.ts:65`, `src/vision/roster.ts:81·91`), 앱이 직접 `fetch`·`DownloadTask`로 받는다. Hugging Face는 일반 웹 요청 정보(IP 주소 등)를 본다.
- [코드] 데스크톱 추론 서버(`src/inference/desktop-server.ts`)는 `local` 환경 전용이다(`src/config/policy.ts`) — 배포 빌드에서 쓰지 않는다.
- [코드] 분석·크래시·광고 SDK 없음(`package.json` 의존성), 푸시 토큰 호출 없음, 계정 없음. 알림은 로컬 알림뿐이다.
- [문서] OS 수준 진단: 사용자가 OS에서 진단 공유를 켜 두면 Apple·Google이 크래시 보고를 모으고 개발자는 스토어 콘솔(Xcode Organizer·Play Console vitals)에서 본다. 앱이 보내는 것이 아니다.
- [미확인] 앱 데이터가 OS 백업(iCloud·Google)에 실리는지 — iOS는 `NSDocumentDirectory`라 대상 자리, 안드로이드는 `allowBackup="true"` 기본값(분석 C3·C4·M5). 방침은 「포함될 수 있다」로만 적는다.

### 1.4 스토어 요건

- [문서] Play 데이터 보안: "Collect means transmitting data from your app off a user's device"(라이브러리·SDK 포함). **비공개·공개·프로덕션 테스트 트랙의 앱은 양식을 채워야 하고, 양식을 끝내려면 개인정보처리방침 링크가 필요하다.** 내부 테스트 트랙만 예외다.
  → 이 과제가 Play 비공개 테스트(14일 시계) 앞에 선다. 콘솔에서 소유자가 한 번 더 확인한다.
- [문서] Play: 일시 처리(메모리에서만 다룸)도 양식 응답에는 넣는다. 정확한 위치 = 3㎢ 미만.
- [문서] Apple App Privacy: "Collect" = 실시간 처리에 필요한 시간보다 오래 개발자·제3자 파트너가 접근할 수 있게 기기 밖으로 보내는 것. "You are not responsible for disclosing data collected by Apple." 기기 안에서만 처리하는 데이터는 수집이 아니다. 방침 URL은 필수다.
- [문서] App Store 5.1.1(i): 방침 링크를 메타데이터와 앱 안 둘 다에 둔다. 지원 URL은 App Store Connect 메타데이터 필수 항목이다.

## 2. 소유자 결정 (2026-10-15)

| 항목 | 결정 |
| --- | --- |
| D2 크래시 SDK | 넣지 않는다 — 크래시는 스토어 콘솔과 앱 안 「최근 실패」로 본다 |
| D4 1.0 백업 범위 | 안내 문구만 — 방침은 지금 사실(기기에만 있음·앱을 지우면 사라짐·OS 백업에 포함될 수 있음·운영자는 접근 못 함)만 적는다 |
| 호스팅 | 이 저장소(`mrtint/alpharium`, 퍼블릭)의 GitHub Pages — `site/` + 공식 Pages 배포 워크플로 |
| 문의 연락처 | 지원 전용 새 메일 — 주소와 운영자(책임자) 이름은 **자리표시자로 두고 게시 전에 채운다** |
| 권한 문구 | iOS 위치 문구에 좌표 전송 사실을 더한다. 사진 문구는 그대로(사진 파일은 나가지 않는다) |
| Play 위치 선언 | 보수적으로 선언한다(정확한 위치 — 수집함) |
| iOS 선언 | Data Not Collected(Apple이 모으는 것은 선언 대상이 아님 — [문서]) |
| 지원 페이지 | 자주 묻는 것 + 문의 |

## 3. 설계

### 3.1 사이트 (`site/`)

- 정적 HTML 두 장, 한국어, 합니다체. 빌드 도구·Jekyll 없음(`site/.nojekyll`). 스타일은 각 파일 안 `<style>` 하나(작은 글자 크기·줄 길이·다크 모드 정도).
  - `site/privacy/index.html` — 개인정보처리방침
  - `site/support/index.html` — 도움말·문의
  - `site/index.html` — 두 페이지로 가는 짧은 안내
- URL: `https://mrtint.github.io/alpharium/privacy/`, `https://mrtint.github.io/alpharium/support/`(저장소 이름이 옛 이름이라 URL에 `alpharium`이 남는다 — 받아들임).
- **자리표시자**: `{SUPPORT_EMAIL}`·`{OPERATOR}`·`{EFFECTIVE_DATE}`. 남아 있으면 배포가 실패한다(§3.2). jest는 자리표시자가 있어도 통과한다(원문 확인 전에도 저장소가 초록이어야 하므로).

**방침 목차**(문장 단위 원문은 구현 단계에서 쓰고, 각 문장 옆 주석에 §1의 근거를 단다):

1. 한 줄 요약 — 일기는 휴대폰 안에서 쓰이고 휴대폰 안에 남는다. 운영자는 사용자의 개인정보를 받거나 보관하지 않는다.
2. 휴대폰 안에서만 다루는 것 — 그날 사진(읽기, 기기 안 모델이 설명을 만든다), 사진의 촬영 시각·좌표, 사진의 축소 사본, 일기, 이름·설정, 기록(쓰기 실패·자동 쓰기 시도 — 갈래와 시각뿐), 로컬 알림. 모두 앱 저장 공간에 있다.
3. 휴대폰 밖으로 나가는 것
   - (가) 모듈 내려받기 — 처음 실행과 「모듈 다시 받기」 때 Hugging Face 서버에서 받는다. 이때 Hugging Face는 일반적인 웹 요청 정보(IP 주소 등)를 받는다. 사진·일기는 보내지 않는다.
   - (나) 장소 이름 — 「장소 이름으로 보기」가 켜져 있으면 일기를 쓸 때 그날의 좌표 하나를 운영체제의 지도 서비스(iPhone은 Apple, 안드로이드는 기기의 위치 서비스 제공자 — 대개 Google)에 보내 이름을 받는다. 끄는 법: 설정 → 「장소 이름으로 보기」 → 「끔」(위치 권한 거부는 기본값 「자동」에서만 끄는 길이다 — `expo-location` iOS의 `reverseGeocodeAsync`는 위치 권한을 보지 않아 「켬」이면 iPhone은 권한과 무관하게 보낸다, 구현 중 소스로 확인).
   - (다) 운영체제의 진단 보고 — 사용자가 기기 설정에서 진단 정보 공유를 켜 두면 Apple·Google이 앱 오류 보고를 모으고, 운영자는 스토어 개발자 화면에서 그 보고를 볼 수 있다. 앱이 직접 보내지 않는다.
4. 제3자 제공·처리 위탁 — 없다.
5. 보존과 삭제 — 앱 안 「일기 모두 지우기」, 앱을 지우면 일기·설정·모듈이 함께 지워진다. 기기 백업(iCloud·Google)에 포함될 수 있고 운영자는 그 백업에 접근할 수 없다. 백업에서 지우는 방법은 기기 설정을 따른다.
6. 권한과 철회 — 사진(그날 사진 읽기), 위치(장소 이름 — 앱은 기기의 현재 위치를 읽지 않는다), 알림(완성 알림), 안드로이드 배터리 예외(자동 쓰기). 거부해도 앱을 쓸 수 있다. 기기 설정에서 언제든 철회한다.
7. 문의 — `{SUPPORT_EMAIL}`. 문의 메일의 주소와 내용은 답장에만 쓰고 처리가 끝나면 지운다(**소유자 확인 대상 문장**). 개인정보 보호 책임자 `{OPERATOR}`.
8. 시행일 `{EFFECTIVE_DATE}`과 변경 — 바뀌면 이 페이지에 날짜와 함께 알린다.

**지원 페이지**: 문의 메일 · 자주 묻는 것(첫 실행에 약 2.0GB를 받는다 — Wi-Fi 권장 / 자동 쓰기가 늦거나 안 될 때 — 배터리 사용 「제한 없음」·iPhone 저전력 모드 / 앱을 지우면 일기도 사라진다 / 일기는 휴대폰 안에서 쓴다 / 장소 이름을 끄는 법) · 방침 링크.
모든 답은 AGENTS에 실측된 사실만 쓴다(예: 자동 쓰기는 「약속」하지 않고 「늦어질 수 있다」).

### 3.2 배포 워크플로 (`.github/workflows/pages.yml`)

- 트리거: `push`(`main`, `paths: site/**`)와 `workflow_dispatch`.
- 권한: `contents: read`, `pages: write`, `id-token: write`. 비밀 0. `concurrency: pages`.
- 단계: checkout → **자리표시자 검사**(`site/` 안에 `{SUPPORT_EMAIL}`·`{OPERATOR}`·`{EFFECTIVE_DATE}`가 하나라도 있으면 실패) → `actions/configure-pages` → `actions/upload-pages-artifact`(`path: site`) → `actions/deploy-pages`. GitHub 공식 Action만, 버전 고정.
- 저장소 설정에서 Pages 소스를 「GitHub Actions」로 켜는 일은 소유자가 한다(외부 게시). 첫 게시는 소유자가 원문·자리표시자 값을 확인한 뒤.

### 3.3 앱 — 설정 「정보」 묶음

- 순서: 버전 → **개인정보처리방침** → **도움말·문의** → 서체 라이선스(083) → 개발자(059). 두 새 행 모두 끝에 ›(083 행과 같은 `Chevron`).
- `src/app/policy-links.ts` — 두 URL 상수의 유일한 자리. 화면은 URL을 모른다 — 조립부(`App.tsx`)가 여는 함수를 넘긴다(설정은 `onOpenPrivacy`·`onOpenSupport` 콜백만 받는다).
- 여는 통로: `react-native`의 `Linking.openURL`을 **호출 시점 `require`**로 읽는다(066 — `await import("react-native")`는 iOS를 죽인다; `os-settings-port.ts`와 같은 꼴). `canOpenURL`은 쓰지 않는다(안드로이드 11+ `<queries>` 없이는 거짓을 줄 수 있다).
- 실패: `openURL`이 거부하면 그 행 아래 빨간 보조 줄(058 지우기 행의 `hint`/`hintTone: "danger"`와 같은 모양)에 「브라우저를 열지 못했어요 · {URL}」 — 사용자가 주소를 옮겨 적을 수 있게. 성공하거나 설정을 다시 열면 지운다.
- 문구: 카탈로그 새 영역 `catalogs/ko/policy-links.ts`(`privacy`·`support`·`openFailed` 함수 — 옛 `settings` 영역은 062 골든 G2가 키 짝을 잠가 더하지 않는다, 083 `fontLicense`와 같다). 062 골든 `ADDED_AFTER_GOLDEN`에 올린다.
- 배터리·권한 행, 다른 묶음은 건드리지 않는다.

### 3.4 iOS 위치 권한 문구 (`app.json` `expo-location.locationWhenInUsePermission`)

- 지금: 「사진에 담긴 장소를 사람이 읽을 수 있는 이름으로 바꾸는 데 위치를 씁니다.」
- 바꿀 문구: 「사진에 담긴 장소를 사람이 읽을 수 있는 이름으로 바꾸는 데 위치를 씁니다. 이때 사진의 좌표를 Apple 지도 서비스에 보냅니다.」
- iOS 전용 문구라 Apple로 단정할 수 있다([문서] CLGeocoder). 안드로이드는 시스템 창이라 문구 자리가 없다.
- `__tests__/config/ios-permissions.test.ts`를 함께 고친다. 반영은 다음 iOS 빌드부터(`prebuild` — 네이티브 입력 변경이라 072의 CI 네이티브 빌드가 돈다).

### 3.5 스토어 선언 초안 (`docs/store/privacy-declarations.md`)

소유자가 콘솔에 옮겨 적는 문서. 항목마다 「답 · 근거(§1 참조) · 표식」을 단다.

- **Play 데이터 보안**
  - 데이터를 수집하거나 공유하는가: 예(위치).
  - 위치 → 정확한 위치: 수집함 · 공유 안 함 · 선택 사항(설정에서 끔·권한 거부) · 목적 「앱 기능」.
  - 일시 처리 여부·전송 중 암호화: Geocoder 백엔드 쪽은 확인할 수 없다 → [미확인], 소유자 판단(보수적 답: 일시 처리 「아니요」).
  - 나머지 데이터 유형: 수집 안 함. 사진은 기기 안에서만 처리 — [코드].
  - 삭제 요청 방법: 운영자가 보관하는 데이터가 없음 — 앱 안 「일기 모두 지우기」·앱 삭제 안내.
  - 방침 URL.
- **App Store Connect App Privacy**: Data Not Collected. 근거: 기기 안 처리는 수집이 아님, Apple이 모으는 것(CLGeocoder)은 선언 대상이 아님, Hugging Face 내려받기의 IP는 개발자가 보관·접근하지 않음([문서] "IP address is sent on a server call and not retained … you do not need to disclose").
  방침 URL·지원 URL.
- 이 문서와 방침이 어긋나면 방침을 먼저 고치고 이 문서를 따라 고친다.

### 3.6 어긋남을 막는 테스트

- **링크 대조** — `policy-links.ts`의 URL 경로 ↔ `site/privacy/index.html`·`site/support/index.html` 존재 ↔ 지원 페이지 안의 방침 링크 ↔ 선언 초안의 URL.
- **방침이 기대는 코드의 사실** — 실패 메시지는 「방침(site/privacy)과 선언(docs/store)을 고쳐라」. 이 테스트는 **소스에서 보이는 것만** 잠근다(네이티브 라이브러리의 통신·OS 백업은 못 본다 — 테스트 이름과 주석에 범위를 적는다).
  - `package.json` 의존성에 분석·크래시·광고·푸시 SDK가 없다(사람이 정한 금지 목록 — Sentry·Firebase·Crashlytics·Bugsnag·Datadog·Amplitude·Mixpanel·Segment·AppsFlyer·Adjust·Branch·OneSignal·AdMob 등).
  - `src`에 푸시 토큰 호출(`getExpoPushTokenAsync`·`getDevicePushTokenAsync`)이 없다.
  - `src`의 `http(s)://` URL(주석 제외)은 `huggingface.co`뿐이다(데스크톱 서버의 `baseUrl`은 환경 값이라 소스에 상수 URL이 없다 — 검사에 걸리지 않는다).
  - `reverseGeocodeAsync` 호출은 `src/signals/geocoding-port.ts` 한 곳뿐이다.
- **배포 워크플로 계약** — 트리거 둘, 권한 셋뿐, `secrets.` 0, 자리표시자 검사 단계가 업로드보다 앞, GitHub 공식 Action만.
- **권한 문구** — `ios-permissions.test.ts`에 새 위치 문구.
- **설정 화면** — 두 행이 있고 순서가 맞다, 누르면 콜백, 실패 시 보조 줄.
- **위반 주입** — 금지 SDK 의존성 추가·외부 URL 추가·`reverseGeocodeAsync` 두 번째 호출·워크플로 자리표시자 검사 제거·링크 상수 경로 틀림 — 각각 실패하는지 확인한다.

## 4. 검증

- `npm test`·`npm run lint`.
- 실기기(dev, SM-S901N — **다른 세션이 쓰는 중이라 쓰기 전에 소유자에게 비었는지 묻는다**, `pm clear`·설치·`run-as` 쓰기 안 함): 두 행이 OS 브라우저를 연다, 글꼴 2.0배에서 행이 겹치지 않는다. 게시 전이면 페이지는 404일 수 있다(브라우저가 열리는 것까지 본다).
- M7 보강(선택, 기기가 비면): 비행기 모드로 일기를 쓰면 장소 이름이 비고, 연결되면 채워지는지 — 「네트워크가 필요하다」의 실측. 하지 못하면 §1.2의 [문서] 근거로 남긴다.
- 게시 뒤: 두 URL이 열린다(소유자 게시 후).

## 5. 남는 위험

- Play가 「OS 지오코더 경유는 수집이 아니다」를 어떻게 보는지 문서가 직접 말하지 않는다 — 보수적 선언으로 허위 신고 위험은 없앴지만 스토어 목록에 「위치 수집」이 보인다.
- 안드로이드 지오코더 백엔드가 Google이라는 것은 짐작이다(기기마다 다를 수 있다) — 방침은 「기기의 위치 서비스 제공자(대개 Google)」로 적는다.
- OS 백업 포함 여부는 미실측 — 백업 과제가 실측하면 방침 §5를 고친다.
- 사실 잠금 테스트는 소스만 본다 — 네이티브 의존성이 새 통신을 시작해도 잡지 못한다.
- 문의 메일 보관 약속은 운영자의 실무 약속이다 — 소유자가 지킬 수 있는 문장인지 원문 확인 때 본다.
