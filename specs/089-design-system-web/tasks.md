# Tasks: 디자인 시스템 기반과 웹 재디자인

**Input**: `specs/089-design-system-web/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: 요청됨 — 헌법 「계약을 먼저 정하고 테스트를 먼저 쓴다」. 각 단계에서 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다.

**Format**: `- [ ] T### [P?] [Story?] 설명 + 경로`. [P]는 서로 다른 파일이고 미완 작업에 의존하지 않는 것.

**주의**: 작업 위치는 워크트리 `.claude/worktrees/design-system`. 모든 명령은 그 안에서 `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON`으로 `.mts`를 돌린다. 커밋은 하지 않는다(kickoff가 시점을 정한다).

## Phase 1: Setup

- [X] T001 변경 전 앱 토큰 스냅샷을 만든다: 현재 `src/ui/theme/tokens.ts`의 `COLORS`·`RADIUS`·`TYPE`·`FONT`를 import해 `__tests__/design/fixtures/app-tokens-before.json`에 쓴다(생성 영역을 넣기 **전에**; 일회성 명령, 스크립트로 남기지 않는다). 파일의 값이 `tokens.ts`와 같은지 눈으로 한 번 대조한다
- [X] T002 [P] 간격 사용 빈도를 다시 센다: `src/ui/`의 `padding|margin|gap` 계열(`Top|Bottom|Left|Right|Horizontal|Vertical|Start|End` 포함) 정수 리터럴과 tailwind 간격 클래스를 세어 값별 횟수 표를 `specs/089-design-system-web/research.md` R1에 갱신한다. 「9회 이상」 기준 결과가 4·8·10·12·16·20·24와 다르면 그 차이를 R1에 적고 **소유자에게 확인을 받은 뒤** 진행한다 (research R1)

## Phase 2: Foundational — 정본과 생성 (모든 스토리가 기대는 기반)

**⚠️ 이 단계가 끝나기 전에는 사이트 작업을 시작하지 않는다.**

### 테스트 먼저 (실패를 확인한다)

- [X] T003 [P] `__tests__/design/tokens-schema.test.ts` 작성: contracts/tokens-json.md C1~C9와 data-model V1~V8을 `design/tokens.json`에 대해 단언한다(색 역할 정확히 아홉 `bg·surface·border·text·textMuted·accent·accentForeground·danger·dangerForeground`, `#rrggbb` 소문자 hex, 앱 공용 글자 역할 정확히 여섯, `webWeights ⊆ weights`, `space.steps` 양의 정수 증가, `note` 비어 있지 않고 `*/` 미포함, 모르는 최상위 키 없음). 정본이 없으므로 실패해야 한다
- [X] T004 [P] `__tests__/design/contrast.test.ts` 작성: `contrast` 쌍이 라이트·다크 각각 `min` 이상(`contrastRatio`는 `src/ui/theme/tokens.ts`의 것을 쓴다), 쌍의 `fg`·`bg`가 `color` 키이며, 본문 글자 쌍(`text`·`textMuted`·`danger` × `bg`·`surface`)이 표에서 빠지지 않았음을 단언한다 (research R5)
- [X] T005 [P] `__tests__/design/app-values.test.ts` 작성: 현재 `COLORS`·`RADIUS`·`TYPE`·`FONT`가 T001의 스냅샷과 깊이 같다 (FR-003·SC-005)
- [X] T006 [P] `__tests__/design/tokens-sync.test.ts` 작성: `buildOutputs(정본)`이 `tokens.ts` 생성 영역·`site/assets/tokens.css`와 바이트 같고, 표식 `// <design-tokens:generated>`·`// </design-tokens:generated>`가 각각 정확히 한 번씩 있으며, 생성 영역이 `COLORS_DARK`·`darkColors`·`fontFamily`를 담지 않고 `prettier --check`를 통과한다. 테스트는 `prettier --check` CLI로 모양을 본다. `--font-sans`가 `sans-serif`로 끝난다 (contracts/generated-outputs.md G-A1~A5·G-W1~W5, FR-002·FR-010)

### 구현

- [X] T007 `design/tokens.json` 작성: 현재 `tokens.ts` 값(라이트)과 설계 문서 §4 다크 초안, 반경 `card 0·pill 0·control 6`, 앱 글자 여섯 + 웹 전용 `display`(32/40/700)·`reading`(17/30/400) 초안, `font`(family `Pretendard`, weights 다섯, webWeights `["400","600","700"]`, fallback), `space.steps`(T002에서 확정한 목록), 대비 쌍 표, 항목마다 `note`(현재 `tokens.ts` 주석의 이유를 옮긴다). 웹 전용 글자 값은 초안으로 두고 T024 캡처 뒤 소유자가 확정한다 (tokens-json.md)
- [X] T008 `scripts/design/tokens-build.ts` 작성: 코어 `validateTokens`·`buildOutputs`·`extractRegion`·`replaceRegion`(모두 동기·결정적 — prettier를 부르지 않고 저장소 prettier 모양으로 직접 쓴다. jest의 CJS에서 prettier 3 동적 import가 안 돈다) — 정본 규칙 위반 시 예외, 앱 생성 영역 텍스트와 `tokens.css` 텍스트를 반환, 값 계산·보정 없음. `--font-sans`의 마지막 항목은 일반 계열 `sans-serif`로 정본 `fallback`에서 온다 (contracts/generated-outputs.md, FR-002)
- [X] T009 `scripts/design/build-tokens.mts` 작성: 정본을 읽어 `src/ui/theme/tokens.ts`의 표식 사이를 바꿔 쓰고 `site/assets/tokens.css`를 쓰며 `--check`를 지원한다. 코어는 확장자 `.ts`로 import한다(`allowImportingTsExtensions`, 타입 스트리핑 실행)
- [X] T010 `src/ui/theme/tokens.ts`에서 `COLORS`·`RADIUS`·`TYPE`·`FONT` 블록(주석 포함)을 표식 두 줄로 감싸 생성 영역으로 바꾼다(표식 밖은 건드리지 않는다). 생성기를 돌려 영역이 채워지게 하고 `site/assets/tokens.css`를 만든다 (research R4)
- [X] T011 T003~T006을 돌려 통과시킨다. 기존 `__tests__/theme-tokens.test.ts`·`__tests__/config/font-rules.test.ts`·`__tests__/ui/dark-mode-no-scheme.test.ts`가 **수정 없이** 통과하는지 확인한다(SC-005). 앱 쪽 `tsc --noEmit`·`npm run lint`의 prettier 검사 포함

**Checkpoint**: 정본→생성물이 동기이고 앱 값이 불변이다.

## Phase 3: User Story 1 — 방문자가 앱과 한 제품처럼 보이는 페이지를 읽는다 (P1) 🎯 MVP

**Goal**: 소개·방침·지원 세 페이지가 앱과 같은 시각 언어(색·서체·간격·위계)로 보이고 라이트·다크·휴대폰 폭에서 읽힌다.

**Independent Test**: 세 페이지를 라이트·다크, 390px·1280px로 열어 비교한다. 같은 틀·같은 서체·앱 토큰 색이며 320px에서 가로 스크롤이 없다.

### 테스트 먼저 (실패를 확인한다)

- [X] T012 [P] [US1] `__tests__/design/site-hardcode.test.ts` 작성: contracts/site-style.md L1·S1·S2 — HTML 셋에 `<style>`·`style=`·`<script`·외부 주소 `<link>`/`src`가 없고, `site.css`에 16진수·`rgb(`·`hsl(`·`font-family`·px 간격 리터럴·글자 색에 `--color-accent`가 없으며 `@import`가 없고, `fonts.css`에는 `@font-face`만 있다. 추가로 `site.css`의 `color` 값은 `--color-text|textMuted|danger|dangerForeground|accentForeground`만, `background` 값은 `--color-bg|surface|accent|danger`(와 `transparent`·`inherit`)만 쓴다 — 허용 조합이 모두 정본 대비 표에 있음은 T004가 잠근다. (주석은 먼저 걷는다) (FR-007·FR-008·SC-002)
- [X] T013 [P] [US1] `__tests__/design/site-links.test.ts` 작성: 세 페이지의 `<link rel="stylesheet">` 셋이 순서(`tokens.css`·`fonts.css`·`site.css`)대로 있고 상대 경로가 실제 파일을 가리킨다 (G10)
- [X] T014 [P] [US1] `__tests__/design/fonts-files.test.ts` 작성: `site/assets/fonts/source.json`의 파일별 sha256이 실제 woff2와 같고 woff2가 굵기 셋 × 92개이며, `LICENSE.txt`가 `assets/fonts/pretendard/LICENSE.txt`와 바이트 같고, `fonts.css`의 모든 `url()` 파일이 있으며, 선언 굵기 == 정본 `webWeights` ⊆ `FONT.weights`이고, 모든 `@font-face`에 `font-display: swap`이 있고, 외부 주소가 없다 (G6, FR-009·FR-010)
- [X] T015 [P] [US1] `__tests__/design/fonts-budget.test.ts` 작성: 세 페이지 각각 (텍스트의 글자 집합 × `fonts.css`의 `unicode-range`)로 필요한 조각 파일 크기를 합산하고 선언 굵기 수를 곱해 1,000,000바이트 이하를 단언한다 (G7, FR-010a, research R2)
- [X] T016 [US1] `__tests__/privacy/site-pages.test.ts`의 S3만 좁힌다: `rel="stylesheet"` 전면 금지 → 「`href`가 상대 경로가 아닌 stylesheet 링크 금지」. `<script`·`@import`·외부 `src` 금지는 그대로. 외부 주소 stylesheet 링크가 여전히 실패하는지 즉석 주입으로 확인한다 (FR-012, research R6)

### 구현

- [X] T017 [US1] `scripts/design/import-pretendard-web.mts` 작성·실행: 레지스트리 tarball을 받아 `dist.integrity`(sha512-PaQAADyL…IaywSw==)를 확인하고 `webWeights` 굵기의 `woff2-dynamic-subset/*.woff2` 92개씩을 바이트 그대로 `site/assets/fonts/`에 복사, `source.json`(패키지·버전·integrity·파일별 sha256·라이선스 sha256)·`LICENSE.txt`·`site/assets/fonts.css`(`@font-face`, `unicode-range`는 배포처 값 그대로, `src`는 woff2 한 줄)를 쓴다. 무결성이 다르면 아무것도 쓰지 않는다 (contracts/generated-outputs.md 서체 절, research R2)
- [X] T018 [US1] `site/assets/site.css` 작성: contracts/site-style.md의 `.page`·`.doc`·`.meta`·`.summary`·`.section`·`.links` 클래스, 읽기 폭, 제목 계층(h1 `display`·h2 `title`·h3 `sectionTitle`·본문 `reading`), 링크·강조는 `danger`, 포커스 윤곽, 모바일 여백(`--space-16` 이상), 긴 낱말 줄바꿈. 변수만 참조한다 (FR-007·FR-011)
- [X] T019 [P] [US1] `site/privacy/index.html`: `<style>` 블록을 지우고 링크 셋을 넣고 기존 요소에 `class`만 붙인다(문장·`id`·`data-outbound`·근거 주석·자리표시자 무변경) (FR-011·FR-012)
- [X] T020 [P] [US1] `site/support/index.html`: 같은 처리
- [X] T021 [P] [US1] `site/index.html`: 같은 처리(내용 그대로)
- [X] T022 [US1] T012~T016과 `__tests__/privacy/*`·`__tests__/ci/pages-workflow.test.ts`를 돌려 통과시킨다. 자리표시자 검사(`grep -rnE '\{(SUPPORT_EMAIL|OPERATOR|EFFECTIVE_DATE)\}' site`)가 여전히 자리표시자를 찾는지(게시 전 의도) 확인한다
- [X] T023 [US1] 헤드리스 크롬 캡처: 세 페이지 × 390px·1280px × 라이트·다크(+ 320px 가로 스크롤 확인). 파일은 스크래치패드에 두고 보고서에는 경로만 적는다. 앱 화면(오프화이트·레드·Pretendard)과 인상이 같은지, 요약 상자·제목 계층·링크 색을 본다. 로컬 서버 요청 목록에서 제3자 주소 0건을 확인한다 (SC-001·003·007·009)
- [X] T024 [US1] 캡처를 보고 웹 전용 글자 값(`display`·`reading`)과 필요하면 `site.css`를 다듬는다 — 값 변경은 `design/tokens.json` 수정 → 생성 → 테스트 순서. 소유자가 캡처를 보고 확정한다(SC-009)

**Checkpoint**: 사이트가 시스템 위에 서 있고 기기 없는 테스트가 초록이다.

## Phase 4: User Story 2 — 디자인 작업자가 규칙 문서를 읽고 같은 시스템으로 만든다 (P2)

**Goal**: 저장소 안에 규칙 문서 한 권이 있고 안내 문서가 먼저 읽으라고 가리킨다.

**Independent Test**: AGENTS.md·CLAUDE.md에서 `design/DESIGN.md`로 닿고, 문서가 적은 이름이 모두 실재한다.

- [X] T025 [P] [US2] `__tests__/design/design-doc.test.ts` 작성: `design/DESIGN.md`가 있고 필수 절(토큰·역할 이름, 타입 스케일, 서체, 색 사용 규칙, 공용 부품, 화면 유형별 패턴, 하지 않는 것, 새 값을 더하는 절차)을 갖고, 본문의 백틱 이름(`--color-*`·`--space-*`·역할 이름·`site.css` 클래스·`src/ui/components/*.tsx` 경로)이 정본·`tokens.css`·`site.css`·소스에 실재하며, `AGENTS.md`·`CLAUDE.md`가 `design/DESIGN.md`를 가리킨다 (G8·G9, FR-013·014·SC-008)
- [X] T026 [US2] `design/DESIGN.md` 작성(한국어): 역할 이름의 뜻, 타입 스케일 표, 서체 규칙(웹 자체 호스팅·굵기 셋·CDN 금지), 색 사용 규칙(accent는 면, 글자 강조는 danger, 웹에서 accent 글자 금지 이유 3.76:1), 간격 단계(앱 빈도 근거), 공용 부품(앱 `Button`·`Card`·`Dialog`·`SectionHeader`·`NameField`, 웹 공용 클래스), 화면 유형별 패턴(긴 글 문서 페이지·설정 행·대화상자), 하지 않는 것, 새 값을 더하는 절차(정본 → 생성 → 테스트), 앱 화면 이탈 정리는 후속 과제라는 한계
- [X] T027 [P] [US2] `AGENTS.md`와 `CLAUDE.md`에 「디자인 산출물(화면·페이지·문서)을 만들기 전에 `design/DESIGN.md`를 먼저 읽는다」 한 줄씩을 더한다(헌법 본문 무변경, 기존 서술을 고치지 않고 해당 절에 한 줄)
- [X] T028 [US2] T025를 통과시킨다

**Checkpoint**: 규칙 문서가 안내 문서에서 닿고 이름이 실재한다.

## Phase 5: User Story 3 — 값이 어긋나거나 시스템을 벗어나면 테스트가 막는다 (P2)

**Goal**: 방어가 실제로 잡는다는 것을 위반 주입으로 확인한다(방어 테스트 본체는 Phase 2·3·4에서 이미 작성됨).

**Independent Test**: 정본의 한 값을 바꾸고 생성하지 않으면 G1이, 사이트에 색 리터럴을 넣으면 G5가 실패한다.

- [X] T029 [US3] contracts/guards.md 위반 주입을 하나씩 수행한다: 매번 치환이 실제로 적용됐는지 먼저 확인 → 해당 테스트가 실패 → 원복 → 다시 통과. 대상: G1(정본 색 한 값), G2(색 역할 삭제·`note` 비우기·모르는 키), G3(다크 `textMuted` 어둡게), G4(라이트 `accent` 변경 후 생성), G5(HTML `<style>`·`style=`·외부 `<link>`, `site.css` 색 리터럴·`font-family`·px 간격·글자 `--color-accent`), G6(woff2 한 바이트·LICENSE 삭제·굵기 선언 추가), G7(굵기 선언 추가, 상한 임시 하향), G8(문서에 없는 이름), G9(안내 줄 삭제), G10(링크 삭제). 결과 표를 `specs/089-design-system-web/quickstart.md` 「실측」에 적는다 (FR-015)
- [X] T030 [US3] 원복 뒤 `git status`/`git diff`로 주입 흔적(임시 파일·바뀐 값)이 남지 않았음을 확인하고 `npm test`를 다시 돈다

## Phase 6: Polish & Cross-Cutting

- [X] T031 `npm test`(logic·ui 전부)와 `npm run lint`(eslint·tsc·헌법 검사·prettier)를 실제로 돌려 초록을 확인한다. 헌법 검사에 `design/`·`scripts/design/`이 걸리는지 보고 걸리면 규칙을 읽어 코드를 고친다(규칙은 고치지 않는다)
- [X] T032 앱 색 불변 실기기 확인(원칙 V): 이 워크트리의 Metro를 기기(SM-S901N) debug 앱에 올려 홈·설정 정보·작명 화면의 배경·강조 색이 변경 전과 같은지 본다(AGENTS 「맥에서 안드로이드 실기기를 보는 법」). 기기·Metro를 쓸 수 없으면 [미확인]으로 quickstart에 기록하고 소유자에게 알린다. **수행: 이 맥에 adb가 없어 안드로이드는 [미확인], iOS 시뮬레이터(다른 세션 것과 분리한 새 시뮬레이터 + Metro 8082)로 로고 화면의 `bg`·`accent` 픽셀이 `COLORS`와 같음을 확인했다(quickstart 「실측」).**
- [X] T033 [P] `docs/roadmap/README.md` 확인: 이 과제 항목(스펙 089)과 후속 두 항목이 있고 서술이 구현 결과와 맞는지 점검한다. 완료 처리(이력표 이동)는 kickoff 완료 단계에서 한다
- [X] T034 [P] AGENTS.md에 「089 — 디자인 시스템」 결론 절을 쓴다(「기능별 핵심 결론」 마지막): 정본/생성 위치와 생성 영역 방식(R4), 서체 조각 배포본 선택(R2)과 용량 실측, 웹에서 accent 글자 금지, S3 조정, 모르는 것(미확인 후보). 이력이 아니라 지금도 유효한 결론만 쓴다
- [X] T035 `specs/089-design-system-web/quickstart.md` 「실측」을 채운다(캡처 경로, 위반 주입 결과, 용량 실측값, 기기 확인 또는 미확인, 미확인 후보)

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3(US1) → Phase 4(US2) ∥ Phase 5(US3, T029는 US1·US2 구현 뒤) → Phase 6.
- Phase 2 안: T003~T006 [P] → T007 → T008 → T009 → T010 → T011.
- US1 안: T012~T015 [P], T016 → T017 → T018 → T019~T021 [P] → T022 → T023 → T024.
- US2는 US1의 `site.css` 클래스 이름이 있어야 T025/T026이 닿는다(US1 뒤).
- T032는 Phase 2 이후 언제든 가능하나 마지막에 한 번만 한다(번들 최종 상태 기준).

## Parallel Examples

- Phase 2 테스트 네 개(T003~T006)는 서로 다른 파일이라 함께 쓴다.
- US1 테스트 네 개(T012~T015)와 세 페이지 HTML(T019~T021)은 각각 병렬이다.

## Implementation Strategy

- **MVP = Phase 2 + US1**: 정본·생성·동기 방어와 사이트 재디자인. 여기까지로 사용자가 지적한 문제가 해소된다.
- 이어서 US2(규칙 문서)로 이후 산출물을 묶고, US3(위반 주입)로 방어가 살아 있음을 확인한다.
- 앱 화면 코드는 한 줄도 바꾸지 않는다(FR-016). 값을 고치는 일은 언제나 정본 → 생성 → 테스트 순서다.
