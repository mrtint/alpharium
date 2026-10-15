# Quickstart: 개인정보처리방침·지원 페이지와 데이터 선언

작업 디렉터리: `/Users/mrtint/MyDevs/alpharium-privacy`(워크트리, 브랜치 `086-privacy-policy`). 원래 디렉터리는 다른 세션이 쓴다 — 거기서 브랜치·파일을 건드리지 않는다.

## 1. 기기 없는 확인

```bash
npx jest __tests__/privacy __tests__/ci/pages-workflow.test.ts __tests__/config/ios-permissions.test.ts --selectProjects logic
npx jest __tests__/ui/settings-policy-rows.test.tsx --selectProjects ui
npm test
npm run lint
```

기대: 전부 통과. 자리표시자가 남아 있어도 jest는 통과한다(S6).

## 2. 위반 주입

`contracts/policy-facts.md`·`pages-workflow.md`의 표를 하나씩 주입 → 해당 규칙이 실패 → 되돌림 → 다시 통과. 주입이 실제로 적용됐는지(`grep`) 먼저 본다(AGENTS 「위반 주입은 치환이 실제로 적용됐는지 먼저 단언한다」). 워크플로의 자리표시자 검사 단계는 같은 명령을 로컬에서 돌려 실패를 본다:

```bash
# 자리표시자가 남은 상태 → 실패(종료 코드 1)와 남은 자리 출력
bash -c '<pages.yml의 검사 명령>'
```

결과는 `## 실측` 아래 표로 남긴다.

## 3. 실기기 (dev) — **먼저 소유자에게 기기·Metro가 비었는지 묻는다**

다른 세션이 SM-S901N·Metro 8081을 쓴다. `pm clear`·설치·`run-as` 쓰기는 하지 않는다. 이 워크트리의 `.env.development.local`은 소유자가 복사한다(deny 규칙).

1. 이 워크트리에서 Metro(`--clear`) → `adb reverse tcp:8081 tcp:8081` → 기기의 debug 앱에 이 번들을 올린다(네이티브 변경 없음 — `app.json` 문구 변경은 iOS만).
2. 설정 → 「정보」: 행 순서(R1)를 본다. 「개인정보처리방침」·「도움말·문의」를 누르면 기기 브라우저가 각 URL로 열린다(게시 전이면 404 — 브라우저가 열리는 것까지).
3. 글꼴 2.0배에서 두 행이 겹치지 않는다.
4. 실패 줄은 기기에서 만들기 어렵다 — 화면 테스트(R4)와 통로 테스트(B1)로 갈음하고 그 사실을 적는다.
5. (선택, M7 보강) 비행기 모드에서 사진·좌표가 있는 날을 쓰면 장소 이름이 비는지 — 일기를 하나 더 쓰게 되므로 소유자에게 묻고 한다.

## 4. 게시 (완료 조건 — 소유자와 함께)

1. 소유자가 `{SUPPORT_EMAIL}`·`{OPERATOR}`·`{EFFECTIVE_DATE}` 값을 준다 → 원문에 채운다 → 소유자가 채운 방침·지원 원문을 읽고 승인한다.
2. 소유자가 저장소 Settings → Pages → Source를 「GitHub Actions」로 둔다.
3. PR 머지(`main`에 `site/**` 변경) → 「Pocketlog Pages」 워크플로가 돈다 → 자리표시자 검사 통과 → 배포.
4. `https://mrtint.github.io/alpharium/privacy/`·`…/support/`가 열린다(`curl -sI`의 200과 브라우저).
5. 실기기 설정의 두 행에서 게시된 페이지가 열린다.
6. 소유자가 `docs/store/privacy-declarations.md`를 보고 Play Console·App Store Connect에 입력한다(이 기능의 완료 조건 밖 — 입력했는지는 소유자가 알려 주면 기록).

## 실측

### 기기 없는 확인 (2026-10-15, 맥)

- `npm test`: 303 스위트 / 6525 통과(이 기능 전 296 / 6436 — 새 스위트 일곱). `npm run lint`: eslint 오류 0(경고 둘은 이 기능 전부터 있던 `release-signing.test.ts`·`safe-area.test.tsx`), tsc 0, 헌법 검사 0건, prettier 통과.
- 자리표시자 검사 명령(`pages.yml`과 같은 `grep -rnE`)을 로컬에서 돌리면 남은 자리 다섯 줄을 출력하고 종료 코드 1이다 — 채우기 전에는 게시되지 않는다(SC-003).

### 위반 주입 (FR-024)

하나씩 주입 → 관련 테스트 → 원문으로 되돌림(파일 내용 비교로 확인). 스크립트로 돌렸다.

| 주입 | 적용 | 실패 | 되돌림 |
|---|---|---|---|
| F1 `dependencies`에 `@sentry/react-native` | 예 | F1 | 예 |
| F3 `src/`에 `fetch("https://example.com/")` | 예 | F3 | 예 |
| F4 `src/`에 `reverseGeocodeAsync` 두 번째 호출 | 예 | F4 | 예 |
| F5 허용 목록에 `example.org` | 예 | F5 | 예 |
| S5 방침에서 `data-outbound="place-name"` 절 지움 | 예 | S5(대조·근거 주석 2건) | 예 |
| S5 방침에 `data-outbound="analytics"` 더함 | 예 | S5 | 예 |
| `PRIVACY_URL` 끝 `/` 지움 | 예 | L1·L3·S9 | 예 |
| 지원 페이지 방침 링크를 다른 주소로 | 예 | L3 | 예 |
| P1 `pull_request` 트리거 | 예 | P1 | 예 |
| P2 `paths` 지움 | 예 | P2 | 예 |
| P3 `contents: write` | 예 | P3 | 예 |
| P6 자리표시자 검사 단계 이름 바꿈(=없앰) | 예 | P6 | 예 |
| P7 `path: .` | 예 | P7 | 예 |
| T3 iOS 위치 문구 한 글자 | 예 | T3 | 예 |
| R1 `settings-privacy` testID 바꿈 | 예 | R1·R2·R3·R4(5건) | 예 |
| F7 `src/`에 `getCurrentPositionAsync()` (코드 리뷰 뒤) | 예 | F7 | 예 |
| F7 `src/`에 `geocodeAsync("x")` (코드 리뷰 뒤) | 예 | F7 | 예 |
| S10 지원 페이지 백업을 「포함됩니다」로 (코드 리뷰 뒤) | 예 | S10 | 예 |
| P6 `if ! grep` 로 뒤집기 (코드 리뷰 뒤) | 예 | P6 | 예 |
| P9 `persist-credentials: false` 지움 (코드 리뷰 뒤) | 예 | P9 | 예 |

### 원문 자기 검토 (T031a, SC-001)

방침·지원 페이지의 사실 문장을 하나씩 근거와 대조했다. 고친 것 셋:

1. **끄는 법** — 설계는 「「끔」 또는 위치 권한 거부」였으나 `expo-location` iOS의 `reverseGeocodeAsync`가 위치 권한을 보지 않고(`ios/LocationModule.swift`·`Geocoder.swift`) 설정 「켬」은 권한과 무관하게 켠다(`resolve-generation.ts`) — iPhone에서 「켬」 + 권한 거부면 좌표가 나간다. 「「끔」이면 보내지 않는다, 「자동」에서는 권한을 거부해도 보내지 않는다」로 고쳤다(spec FR-004·설계 §3.1도).
2. **지원 페이지의 모바일 데이터 안내** — 「모바일 데이터면 받기 전에 알려 드립니다」는 074가 실제 `CELLULAR` 값을 기기에서 보지 못했으므로 뺐다.
3. **요약의 「운영자는 개인정보를 받지 않는다」** — 운영자가 스토어 콘솔에서 OS 오류 보고를 보는 것과 부딪쳐, 그 절을 가리키는 괄호를 더했다.

근거 주석이 없는 사실 문장 0. 미실측 사실(백업 포함·안드로이드 제공자)은 「수 있습니다」·「대개」로만 말한다.

### 코드 리뷰 뒤 고친 원문 (2026-10-15)

- 「휴대폰 안에서만 다루는 것」에 좌표가 있으면서 다음 절에서 나간다는 모순 → 머리 문장에서 「만」을 걷고 좌표 줄에 「장소 이름」을 가리킴.
- 지원 FAQ 「앱을 지우면 일기도 사라짐」이 백업을 단정 → 「백업에 포함될 수 있지만 되살아나는지는 확인하지 않았다」(S10을 지원 페이지까지).
- 지원 FAQ 「앱을 열면 그 자리에서 씁니다」가 057·082의 조건을 빼먹음 → 「자동으로 쓰기가 켜져 있으면, 최근 며칠 가운데 안 쓰고 사진이 있는 날」.
- 「이 셋 말고 휴대폰 밖으로 나가는 것은 없습니다」가 근거(JS 소스)보다 강함 → 주체를 「포켓로그가 보내는 것」으로 한정하고, 방침·문의 링크는 기기 브라우저·메일 앱이 연다는 줄을 더함.
- 방침 「현재 위치를 읽지 않습니다」를 잠그는 테스트가 없었음 → F7.
- 문의 절에 문의 메일의 열람·삭제 요청을 더함(정보주체 권리). 한국 개인정보 보호법 기재 항목 대조는 T032에서 소유자가 한다.
- Play 「공유 안 함」의 근거를 적고 소유자 확인 대상으로 표시. App Store ③의 Hugging Face 보관은 확인하지 않았다고 적음.
- Minor: 「Hugging Face와 그 전송망」, 사진 권한에 「사진에 담긴 위치 정보」, iPhone 자동 쓰기는 「도움이 될 수 있습니다」로 완화, 요약에 백업 괄호, 워크플로 `persist-credentials: false`(P9), P6을 「찾으면 실패」 꼴까지 잠금, F3의 범위(리터럴 주소만) 주석.

### 실기기 (T031, 2026-10-15 18:13~18:16, SM-S901N dev — alpharium-67 세션이 기기를 비웠다고 알린 뒤)

- 기기의 debug APK(1.0.0 (11), 10-15 07:28 설치)에 이 워크트리의 Metro(`EXPO_PUBLIC_APP_ENV=dev`, `--clear`) 번들을 `adb reverse`로 올렸다. 번들에 `.env.development.local` 모듈(`"dev"`)과 두 주소 문자열이 들어 있는 것을 `curl`로 먼저 확인했다. 설치·`pm clear`·`run-as` 쓰기 없음. 앱을 다시 띄우려 `am force-stop`을 한 번 썼다(자동 쓰기는 꺼진 상태라 잡 취소 영향 없음).
- **행 순서**: 설정 「정보」가 버전 1.0.0 (11) → 개인정보처리방침 → 도움말·문의 → 서체 라이선스 → 개발자(개발 환경이라 켜짐), 두 행 모두 ›.
- **브라우저**: 「개인정보처리방침」을 누르니 Chrome(`ChromeTabbedActivity`)이 `mrtint.github.io/alph…`로 열렸다(게시 전이라 GitHub 404 「There isn't a GitHub Pages site here.」 — 정상). 「도움말·문의」도 Chrome 새 탭으로 `mrtint.github.io/a…`가 열렸다. 주소 표시줄이 잘려 경로 끝까지는 화면으로 못 봤다(logcat도 `https://mrtint.github.io/...`로 가린다) — 정확한 경로는 L1~L5 테스트가 잠근다.
- **글꼴 2.0배**: 두 행 라벨이 한 줄로 들어가고 ›와 겹치지 않으며, 위아래 행과도 겹치지 않는다. 끝나고 1.0으로 되돌렸다.
- **못 본 것**: 브라우저 열기 실패 줄(Chrome이 있는 기기에서 만들 수 없다 — 화면 테스트 R4·통로 테스트 B1로 갈음), iOS 실기기·시뮬레이터(이 기능에서 iOS 위치 문구는 다음 빌드부터 반영), release.
- 정리: `font_scale` 1.0, `svc power stayon false`, `adb reverse --remove tcp:8081`, Metro 종료(8081 비어 있음). Chrome에 탭 두 개가 남았다(404 페이지).

### 게시 (T032)

- 자리표시자 값(소유자, 2026-10-15): `pocketlog.support@gmail.com` / `A810 Labs (남한산)` / `2026년 10월 20일`. 소유자가 채운 원문을 읽고 승인했다(PIPA 기재 항목 대조 포함). Play 위치 「공유 안 함」, 「일시 처리」·「전송 중 암호화」 「아니요」도 소유자 결정.
- 소유자가 Settings → Pages → Source를 「GitHub Actions」로 켰다(`gh api …/pages`의 `build_type: workflow`).
- 첫 머지 시도는 085가 먼저 머지돼 충돌 — `origin/main`에 rebase해 `.specify/feature.json`·`AGENTS.md`·골든·카탈로그 index를 양쪽 다 살려 풀고, 085가 바꾼 사실(쓸 차례 알림, 배터리 문구 「먼저 써 둘 때가 있어요」)에 맞춰 방침·지원 문장을 고쳤다. CI 넷(test·bundle·android·ios) 통과 뒤 PR #171 머지(`fbc668b`).
- 「Pocketlog Pages」 run 38718454986 — 자리표시자 검사 포함 모든 단계 성공. `https://mrtint.github.io/alpharium/privacy/`·`/support/` 둘 다 HTTP 200, 게시본에 메일·운영자·시행일이 들어 있다.
- **실기기 재확인(2026-10-16 07:02~07:04, SM-S901N dev, `main` 코드)**: 설정 「개인정보처리방침」 → Chrome에 게시된 방침(제목·시행일 2026년 10월 20일·한 줄 요약), 「도움말·문의」 → 게시된 지원 페이지(메일·방침 링크·자주 묻는 것). 앱을 다시 띄우려 `am force-stop`을 썼다 — 자동 쓰기 설정 파일이 없고(꺼짐) 우리 알람 0이라 085의 「강제 중지로 예약이 끊긴다」 위험에 걸리지 않았다. 끝나고 `stayon false`·`adb reverse` 해제·Metro 종료.
