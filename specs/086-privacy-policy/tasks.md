# Tasks: 개인정보처리방침·지원 페이지와 데이터 선언

**Input**: `specs/086-privacy-policy/` — plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 헌법 「계약을 먼저 정하고 테스트를 먼저 쓴다(MUST)」 — 각 이야기에서 계약 테스트를 먼저 쓰고 실패를 본 뒤 구현한다.

**작업 디렉터리**: `/Users/mrtint/MyDevs/alpharium-privacy`(브랜치 `086-privacy-policy`). 원래 디렉터리는 건드리지 않는다.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 `git branch --show-current`가 `086-privacy-policy`인지 확인하고 `npm test`가 지금 초록인지 한 번 돌려 기준을 잡는다(실패가 있으면 이 기능 전 상태로 기록)

---

## Phase 2: Foundational (모든 이야기의 선행)

- [X] T002 [P] `src/app/policy-links.ts` — `PRIVACY_URL = "https://mrtint.github.io/alpharium/privacy/"`, `SUPPORT_URL = "https://mrtint.github.io/alpharium/support/"` 두 상수와 머리 주석(이 파일이 두 URL의 유일한 자리 — contracts/policy-facts.md L5, 「끝의 `/`까지 같은 문자열」 data-model §1)
- [X] T003 [P] `__tests__/privacy/outbound.ts` — data-model §3의 표 넷을 그대로: `OUTBOUND`(id `model-download`·`place-name`·`os-diagnostics`, what, evidence), `ALLOWED_HOSTS`(`huggingface.co`·`mrtint.github.io` + reason), `URL_SCAN_EXCLUDED`(`src/ui/pretendard-license.ts` + 이유), `FORBIDDEN_SDKS`(data-model §3 목록 그대로, 정확한 이름 또는 `/`로 끝나는 접두사). 머리 주석에 「제품이 읽지 않는 검증 자료」와 범위(소스만 본다)를 적는다
- [X] T004 [P] `__tests__/privacy/read-site.ts` — 테스트 공용 헬퍼: `site/` 파일 읽기, HTML 주석 걷기, `data-outbound`·`data-faq` 값 모으기, `{대문자_밑줄}` 자리표시자 찾기(정규식, 파서 의존성 없음 — research R3)

**Checkpoint**: 표·상수·헬퍼가 있다 — 이야기 단계로 간다.

---

## Phase 3: User Story 1 — 방침·지원 페이지 (Priority: P1) 🎯 MVP

**Goal**: 근거가 있는 사실만 말하는 방침·지원 원문이 `site/`에 있고, 자리표시자가 남으면 게시되지 않는다.

**Independent Test**: `site-pages.test.ts`·`pages-workflow.test.ts`가 통과하고, 자리표시자 검사 명령이 남은 자리를 내며 실패한다.

### Tests first

- [X] T005 [P] [US1] `__tests__/privacy/site-pages.test.ts` — contracts/site-pages.md S1~S10을 규칙 번호 이름으로. S5는 `OUTBOUND`의 id 집합과 방침의 `data-outbound` 값(각각 정확히 한 번, 목록 밖 값 0), S6은 자리표시자가 「셋 중 하나뿐」(있어도 통과), S10은 `retention` 절에 「포함될 수 있습니다」가 있고 「포함됩니다」·「포함되지 않습니다」가 없다, 각 `data-outbound` 절 안에 `근거:` HTML 주석이 하나 이상. 실행해 실패를 본다
- [X] T006 [P] [US1] `__tests__/ci/pages-workflow.test.ts` — contracts/pages-workflow.md P1~P8(075·076 테스트처럼 주석을 걷고 텍스트로 읽는다). 실행해 실패를 본다

### Implementation

- [X] T007 [P] [US1] `site/.nojekyll`(빈 파일)과 `site/index.html`(lang ko, charset, viewport, title 「포켓로그」, 방침·지원 링크 둘, 외부 자원 0 — S2·S3)
- [X] T008 [US1] `site/privacy/index.html` — 절 여덟 `<section id>`를 S4 순서로(`summary`·`on-device`·`outbound`·`third-party`·`retention`·`permissions`·`contact`·`changes`). 설계문서 §3.1 목차의 문장을 합니다체로 쓰고 사실 문장마다 `<!-- 근거: 설계 §1.x … -->`. `outbound` 안에 「이 셋 말고 휴대폰 밖으로 나가는 것은 없습니다」 한 문장(US1-1)과 `data-outbound="model-download"`·`"place-name"`·`"os-diagnostics"` 절 셋(장소 이름 절은 앱 대화상자 안내(「좌표를 기기의 지도 서비스에 물어봐요」)와 같은 말 「지도 서비스」를 쓰고(FR-004), 끄는 법 「설정 → 장소 이름으로 보기 → 끔」(위치 권한 거부는 「자동」에서만 — iOS는 「켬」이면 권한과 무관하게 보낸다)과 「앱은 기기의 현재 위치를 읽지 않는다」, 안드로이드 제공자는 「대개 Google」). `retention`은 「포함될 수 있습니다」(S10). `contact`는 `{SUPPORT_EMAIL}`·`{OPERATOR}`와 「문의 메일의 주소와 내용은 답장에만 쓰고, 문의 처리가 끝나면 지체 없이 지웁니다」, 그 밖에 운영자가 받는 개인정보는 없다(FR-002a). `changes`는 `{EFFECTIVE_DATE}`, 변경 이력 첫 줄, 저장소 기록 링크 `https://github.com/mrtint/alpharium/commits/main/site/privacy/index.html`(S8). 모델 이름·파라미터를 쓰지 않는다(「모듈」 — 원칙 III)
- [X] T009 [US1] `site/support/index.html` — 문의 `{SUPPORT_EMAIL}`, `data-faq` 절 다섯(`download` 약 2.0GB·Wi-Fi 권장 / `auto-write` 늦거나 안 될 때 — 배터리 사용 「제한 없음」, iPhone 저전력 모드, 시각을 약속하지 않는다 / `uninstall` 앱을 지우면 일기도 사라진다 / `on-device` 일기는 휴대폰 안에서 쓴다 / `place-name` 끄는 법), 방침 링크 `href`는 `PRIVACY_URL` 문자열 그대로(S9·L3). 답은 AGENTS 실측 사실만
- [X] T010 [US1] `.github/workflows/pages.yml` — 이름 「Pocketlog Pages」, `on: push(branches [main], paths ['site/**'])`·`workflow_dispatch`, 최상위 `permissions: contents: read / pages: write / id-token: write`, `concurrency: { group: pages, cancel-in-progress: false }`, 잡 하나(`environment: github-pages`, url 출력): checkout@v5 → 자리표시자 검사(`grep -rnE '\{(SUPPORT_EMAIL|OPERATOR|EFFECTIVE_DATE)\}' site` 가 찾으면 출력하고 `exit 1`) → configure-pages@v6 → upload-pages-artifact@v5(`path: site`) → deploy-pages@v5. 머리 주석에 무엇을 왜 금지하는지와 「Pages 소스 설정은 저장소 설정 — 테스트가 못 본다」
- [X] T011 [US1] T005·T006을 다시 돌려 통과를 본다. 자리표시자 검사 명령을 로컬에서 그대로 돌려 남은 자리(셋)를 출력하며 종료 코드 1인지 본다 — quickstart §2 「실측」에 기록

**Checkpoint**: US1 단독으로 원문·게시 장치가 선다(게시 자체는 Phase 8).

---

## Phase 4: User Story 2 — 앱 안의 방침·문의 행 (Priority: P1)

**Goal**: 설정 「정보」에서 두 행을 눌러 OS 브라우저로 연다. 실패하면 행 아래 빨간 한 줄과 URL.

**Independent Test**: `settings-policy-rows.test.tsx`·`browser-port.test.ts`가 통과하고 실기기에서 브라우저가 열린다.

### Tests first

- [X] T012 [P] [US2] `__tests__/app/browser-port.test.ts` — contracts/settings-rows.md B1(`Linking.openURL` resolve → `true`, reject → `false`, 던지지 않음)·B3(소스에 `canOpenURL` 없음). `jest.mock("react-native", …)`로 `Linking`을 갈아 끼운다. 실패를 본다
- [X] T013 [P] [US2] `__tests__/onboarding/no-react-native-dynamic-import.test.ts`에 「browser-port.ts는 `require("react-native")`를 `openInBrowser` 안에서 호출한다」 사례를 더한다(B2 — 기존 os-settings-port 사례와 같은 꼴). 실패를 본다
- [X] T014 [P] [US2] `__tests__/ui/settings-policy-rows.test.tsx` — R1(「정보」 묶음 행 testID 순서, 개발자 켬/끔 둘 다), R2(라벨·Chevron), R3(누름 → 콜백 한 번), R4(실패 문구 prop → danger 보조 줄, 없으면 없음), R5(`SettingsScreen.tsx` 소스에 `policy-links` import·`http` 없음), A1·A2(`App.tsx` 소스: 설정 조립부가 `openInBrowser(PRIVACY_URL)`·`openInBrowser(SUPPORT_URL)`를 쓰고 결과로 실패 상태를 세우고 비우며 `POLICY_LINKS_TEXT.openFailed(`로 문구를 만든다). RNTL 14 `await render`. 실패를 본다

### Implementation

- [X] T015 [P] [US2] `src/app/browser-port.ts` — `openInBrowser(url: string): Promise<boolean>`: 함수 안에서 `require("react-native")`의 `Linking.openURL(url)`을 기다려 `true`, 예외면 `false`. 머리 주석에 066(동적 import 금지)·R5(`canOpenURL`을 쓰지 않는 까닭)
- [X] T016 [P] [US2] `src/i18n/catalogs/ko/policy-links.ts` 새 영역 `policyLinks` — `privacy: "개인정보처리방침"`, `support: "도움말·문의"`, `openFailed: (url: string) => \`브라우저를 열지 못했어요 · ${url}\``(T1), `catalogs/ko/index.ts` 등록, `src/ui/settings-text.ts`의 `POLICY_LINKS_TEXT`(062 — 옛 `settings` 영역은 골든 G2가 키 짝을 잠가 더하지 않는다, research R7)
- [X] T017 [US2] `src/ui/SettingsScreen.tsx` — props `onOpenPrivacy?`·`onOpenSupport?`·`privacyFailedText?`·`supportFailedText?`. 「정보」 묶음에서 버전 행 다음, 서체 라이선스 앞에 `settings-privacy`·`settings-support` 행(라벨 카탈로그, `trailing={<Chevron />}`, 실패 문구가 있으면 `hint`+`hintTone: "danger"` — 058 지우기 행과 같은 꼴). 다른 묶음은 바꾸지 않는다(FR-017)
- [X] T018 [US2] `App.tsx` 설정 조립부(`SettingsSection` — `SettingsScreen`을 그리는 함수) — 지역 state `linkFailed: "privacy" | "support" | null`, 누르면 `openInBrowser(<URL>)` → `false`면 그 행으로, `true`면 `null`. `privacyFailedText`/`supportFailedText`는 `POLICY_LINKS_TEXT.openFailed(PRIVACY_URL|SUPPORT_URL)`. 설정 겹이 닫히면 언마운트로 사라진다(research R6) — 먼저 `SettingsSection`이 겹이 닫힐 때 실제로 언마운트되는지 `App.tsx`·`StackLayer` 소스로 확인하고, 그렇지 않으면 겹이 열릴 때(`open`이 참이 될 때) `linkFailed`를 비운다
- [X] T019 [US2] `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 「개인정보처리방침」·「도움말·문의」와 `openFailed`의 고정 조각(「브라우저를 열지 못했어요 · ${}」)을 더한다(골든 json은 다시 쓰지 않는다 — 062). `__tests__/i18n/` 다른 가드(B6 등)가 새 파일을 요구하면 등록한다
- [X] T020 [US2] T012~T014와 `npx jest __tests__/i18n --selectProjects logic`를 돌려 통과를 본다

**Checkpoint**: US1·US2로 스토어 제출의 앱 쪽 요건(5.1.1(i) 앱 안 링크)이 선다.

---

## Phase 5: User Story 3 — 스토어 선언 초안 (Priority: P2)

**Goal**: 소유자가 콘솔에 옮겨 적을 답변 문서가 방침과 같은 사실을 말한다.

**Independent Test**: `declarations.test.ts`·`policy-links.test.ts` L4가 통과한다.

- [X] T021 [P] [US3] `__tests__/privacy/declarations.test.ts` — contracts/declarations.md D1~D6(표 줄마다 표식 열 하나, `[미확인]` 줄에 「보수적 답」, 위치 줄 문구, 「Data Not Collected」, 머리의 짝 표). 실패를 본다
- [X] T022 [US3] `docs/store/privacy-declarations.md` — 머리: 대상(소유자, 콘솔 입력용)·「방침과 어긋나면 방침을 먼저 고친다」·외부 전송 목록 세 항목 ↔ 답 짝 표·URL 둘(`PRIVACY_URL`·`SUPPORT_URL` 문자열 그대로). 「Google Play — 데이터 보안」 표(설계 §3.5: 수집·공유 여부, 정확한 위치 줄 「정확한 위치 — 수집함 · 공유 안 함 · 선택 사항 · 앱 기능」, 일시 처리·전송 중 암호화 `[미확인]` + 보수적 답 「아니요」, 나머지 유형 수집 안 함 `[코드]`, 삭제 요청 방법, 방침 URL). 「App Store — 앱 개인정보 보호」 표(「Data Not Collected」과 근거 셋 `[문서]`, 방침·지원 URL). 근거 출처 링크(스토어 공식 문서)
- [X] T023 [US3] T021 통과를 본다

---

## Phase 6: User Story 4 — 방침이 기대는 사실의 잠금 (Priority: P2)

**Goal**: SDK·외부 주소·지오코딩 통로가 바뀌면 테스트가 「방침과 선언을 고쳐라」로 실패한다.

**Independent Test**: contracts/policy-facts.md 위반 주입 표가 모두 실패로 뒤집힌다.

- [X] T024 [P] [US4] `__tests__/privacy/policy-facts.test.ts` — F1~F6(`describe` 이름에 「소스에서 보이는 것만」, 실패 메시지에 「방침(site/privacy)과 선언 초안(docs/store)을 함께 고쳐라」). 주석은 `/\/\*[\s\S]*?\*\//g`·줄 주석 걷기(AGENTS — `://`를 줄 주석으로 오인하지 않게 `no-react-native-dynamic-import.test.ts`의 `strip`과 같은 정규식). F3의 호스트는 `new URL()`로 뽑는다
- [X] T025 [P] [US4] `__tests__/privacy/policy-links.test.ts` — L1~L5
- [X] T026 [US4] 두 테스트를 돌려 통과를 본다(지금 코드가 사실과 맞으면 바로 통과 — 맞지 않으면 원인을 적고 방침·표 중 틀린 쪽을 고친다)
- [X] T027 [US4] 위반 주입 — contracts/policy-facts.md 표 여덟과 pages-workflow.md 표 다섯을 하나씩: 주입(적용됐는지 `grep`) → 해당 규칙 실패 확인 → 되돌림(`git diff`가 비었는지) → 통과. 결과를 `specs/086-privacy-policy/quickstart.md` 「실측」 표에 적는다

---

## Phase 7: User Story 5 — iOS 위치 권한 문구 (Priority: P3)

**Goal**: 권한 창이 방침과 같은 사실을 말한다.

**Independent Test**: `ios-permissions.test.ts` T3이 통과한다.

- [X] T028 [US5] `__tests__/config/ios-permissions.test.ts`에 T3 두 단언을 더한다: `expo-location.locationWhenInUsePermission`이 「사진에 담긴 장소를 사람이 읽을 수 있는 이름으로 바꾸는 데 위치를 씁니다. 이때 사진의 좌표를 Apple 지도 서비스에 보냅니다.」와 같다, `expo-media-library.photosPermission`이 지금 문구(「그날 찍힌 사진을 읽어 하루를 일기로 씁니다. 사진은 휴대폰 밖으로 나가지 않습니다.」)와 같다. 실패를 본다
- [X] T029 [US5] `app.json`의 `locationWhenInUsePermission`을 FR-018 문장으로 바꾼다. T028 통과를 본다. 위반 주입: 문구 한 글자를 바꿔 T028이 실패하는지 → 되돌림(FR-024) — quickstart 「실측」에 기록

---

## Phase 8: Polish & 완료 조건

- [X] T030 `npm test`·`npm run lint`를 실제로 돌려 통과를 본다(새 테스트 파일이 jest 프로젝트에 잡혔는지 `__tests__/jest-projects.test.ts` 포함)
- [X] T031 실기기(dev) — **adb·Metro를 건드리기 전에 소유자에게 SM-S901N·8081이 비었는지 묻는다.** `pm clear`·설치·`run-as` 쓰기 없음. quickstart §3: 행 순서, 두 행 → 브라우저, 글꼴 2.0배. (선택) M7 비행기 모드 확인은 일기를 하나 더 쓰므로 따로 묻는다. 결과(못 했으면 그 사실과 까닭)를 quickstart 「실측」에 적는다
- [X] T031a 원문 자기 검토(SC-001) — `site/privacy/index.html`·`site/support/index.html`의 사실 문장을 하나씩 읽어 `근거:` 주석이 없는 사실 문장 0, 근거가 설계 §1의 [코드]·[문서] 항목을 가리킴, 미실측 사실은 「수 있다」·「대개」로만 말함을 확인한다. 고친 것과 결과를 quickstart 「실측」에 적는다(소유자 원문 확인 T032 앞)
- [ ] T032 게시 — 소유자에게 `{SUPPORT_EMAIL}`·`{OPERATOR}`·`{EFFECTIVE_DATE}` 값을 받아 채우고, 소유자가 채운 원문을 읽고 승인한 뒤(이때 한국 개인정보 보호법의 방침 기재 항목 — 처리 목적·항목·보유 기간·파기·정보주체 권리·책임자·국외 이전 해당 여부 — 을 소유자가 한 번 대조한다, 코드 리뷰), 소유자가 Pages 소스를 「GitHub Actions」로 켠다. 머지 뒤 워크플로 결과와 `curl -sI` 200·브라우저로 두 URL을 확인하고 실기기의 두 행에서 게시된 페이지가 열리는지 본다(SC-006). quickstart §4·「실측」에 기록
- [X] T033 `AGENTS.md` — 「저장소의 현재 상태」에 한 줄(방침·지원 페이지와 앱 안 링크), 「기능별 핵심 결론」에 「086」 절(M7 결론과 근거 표식, 사이트·워크플로·사실 잠금의 자리, 방침을 고칠 때의 순서 — 방침 → 선언 초안 → 표, 테스트가 못 보는 것, `docs/**`만 바뀐 커밋에서는 CI가 돌지 않으니 선언 초안을 고치면 `npm test`를 로컬에서 돌린다, 미확인 잔여)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → (Phase 3·4·5·6·7은 서로 독립 — 다만 Phase 6의 L3·L4는 T009·T022 뒤에 통과한다) → Phase 8.
- Phase 8의 T031(실기기)은 T030 뒤, T031a(원문 자기 검토)는 T008·T009 뒤이고 T032(게시) 앞이다. T032는 T031과 순서 무관하지만 게시 뒤 실기기의 두 행을 한 번 더 본다. T033은 마지막.
- 같은 이야기 안: 테스트(실패 확인) → 구현 → 테스트 통과.

## Parallel Examples

- Phase 2: T002·T003·T004 동시.
- US1: T005·T006·T007 동시 → T008 → T009 → T010.
- US2: T012·T013·T014 동시 → T015·T016 동시 → T017 → T018 → T019.
- US3·US4: T021·T024·T025 동시.

## Implementation Strategy

- MVP = US1 + US2(스토어 제출에 필요한 URL과 앱 안 링크). 그다음 US3(선언 초안), US4(사실 잠금), US5(iOS 문구).
- 완료는 T032(게시와 두 URL 확인)까지다 — 소유자 값이 오기 전에는 T031까지 마치고 기다린다.

---

## Phase 9: Convergence

- [X] T034 `__tests__/privacy/policy-facts.test.ts`의 F5·F6 단언에도 `FIX_POLICY`를 실어 실패 메시지가 「방침과 선언 초안을 함께 고쳐라」를 말하게 한다 per FR-022 (partial)
