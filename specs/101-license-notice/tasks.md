# Tasks: 모델·오픈소스 라이선스 고지

**Input**: `specs/101-license-notice/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: 헌법 「개발 방식」에 따라 테스트를 먼저 쓴다(계약 → 실패 확인 → 구현).

**Format**: `- [ ] T### [P?] [US?] 설명 + 경로`. 경로는 워크트리(저장소) 기준.

## Phase 1: Setup — 원문 확보

- [ ] T001 `https://raw.githubusercontent.com/nlohmann/json/v3.12.0/LICENSE.MIT`를 `curl`로 받아 `specs/101-license-notice/sources/bundled-nlohmann-json-LICENSE.txt`에 두고 SHA-256을 `research.md` R3에 적는다
- [ ] T002 [P] `node_modules/llama.rn`의 소스 헤더에서 전문을 글자 그대로 잘라 `specs/101-license-notice/sources/`에 둔다: `bundled-anyascii-LICENSE.txt`(`cpp/anyascii.h` 맨 앞 주석의 ISC 전문), `bundled-stb-image-LICENSE.txt`(`cpp/tools/mtmd/stb/stb_image.h` 끝 「ALTERNATIVE A/B」 전문), `bundled-miniaudio-LICENSE.txt`(`cpp/tools/mtmd/miniaudio/miniaudio.h` 끝 전문), `bundled-opencl-headers-NOTICE.txt`(`third_party/OpenCL-Headers/CL/opencl.h` 맨 앞 Khronos Apache 고지 주석). 각 파일의 SHA-256과 추출 줄 범위를 `research.md` R3에 적는다
- [ ] T003 [P] OpenCL-Headers 블록은 헤더 고지(T002)와 Apache 2.0 원문 링크만 두고 본문은 `kanana` 항목의 Apache 2.0 전문을 가리키므로 별도 복사하지 않는다. 이 결정을 `research.md` R3에 한 줄로 적는다
- [ ] T004 LFM 사진 모델 GGUF 저장소(`https://huggingface.co/LiquidAI/LFM2.5-VL-450M-GGUF/raw/main/LICENSE`)를 `curl`로 받아 `sources/lfm-LICENSE.txt`와 `diff`한다. 같으면 `research.md` R4에 「GGUF 저장소 LICENSE와 동일(해시)」을, 다르면 다른 점을 적고 소유자 확인 항목 H1에 올린다
- [ ] T005 [P] Kanana 저작권자 줄을 원 저장소(`https://huggingface.co/kakaocorp/kanana-1.5-2.1b-instruct-2505`) 모델 카드·LICENSE에서 읽어 `research.md` R5에 원문 인용과 함께 적는다. 확인되지 않으면 「미확인」으로 적고 페이지에는 쓰지 않는다(H3)

## Phase 2: Foundational — 주소

- [ ] T006 `__tests__/privacy/policy-links.test.ts`의 L1·L2 대상 배열에 `LICENSES_URL`을 더하는 테스트를 먼저 쓰고(import 오류로) 실패를 확인한다
- [ ] T007 `src/app/policy-links.ts`에 `export const LICENSES_URL = "https://mrtint.github.io/alpharium/licenses/";`를 더하고 머리말 주석의 「두 주소」를 세 주소로 고친다 (L1·L2는 사이트 파일이 생기는 T012 뒤에 통과)

## Phase 3: User Story 1 — 사용자가 고지 페이지에서 읽는다 (P1) 🎯 MVP

**Independent Test**: `npx jest __tests__/privacy __tests__/ui/settings-license-row.test.tsx` 통과, 설정 행 → 브라우저에서 페이지가 열림(quickstart §3).

### 테스트 먼저

- [ ] T008 [P] [US1] `__tests__/privacy/license-page.test.ts`를 쓴다 — `contracts/license-page.md` LP1~LP10(읽기 헬퍼는 `__tests__/privacy/read-site.ts` 재사용, 전문 대조는 `<pre class="license-text">` 내용을 HTML 엔티티 복원·LF 정규화 후 `sources/*.txt`와 비교, LP6은 `node_modules/llama.rn/cpp/LICENSE`·`LICENSE`와 대조, LP7은 `research.md` R1 해시와 대조, LP8의 하위 블록 전문은 `sources/bundled-*.txt`와 글자·해시 대조, LP4의 Kanana 재배포본 출처 줄). 실패를 확인한다
- [ ] T009 [P] [US1] `__tests__/privacy/site-pages.test.ts`의 `PAGES`에 `"licenses/index.html"`을 더한다(S1~S3·S6이 이 페이지를 돈다). 기존 단언은 바꾸지 않는다. 실패를 확인한다
- [ ] T010 [P] [US1] `__tests__/ui/settings-license-row.test.tsx`를 쓴다 — `contracts/license-row.md` LR1~LR6(행 순서·testID `settings-licenses`·콜백·실패 한 줄·기존 행 불변·`App.tsx` 배선과 `LICENSES_URL` 정의 위치는 주석을 걷어낸 소스를 읽어 잠근다 — `settings-policy-rows.test.tsx` 방식). 실패를 확인한다

### 구현

- [ ] T011 [US1] `site/assets/site.css`에 `pre.license-text`(줄바꿈 유지·`white-space: pre-wrap`·가로 스크롤 없음·토큰 색)만 더한다
- [ ] T012 [US1] `site/licenses/index.html`을 쓴다 — `contracts/license-page.md` 구조: 항목 넷(`data-license`), 이름·저작권자·라이선스 이름·원문 링크·`data-checked="2026-10-22"`·`<pre class="license-text">` 전문(T001~T005의 `sources/` 글자 그대로, HTML 이스케이프만), `lfm` 항목에 본체·mmproj 문장, `llama-cpp` 항목에 서드파티 하위 블록 다섯(`data-bundled`). 안내 글은 한국어, 요약·해설로 조건을 줄이지 않는다. `site/` HTML은 prettier로 포맷하지 않는다
- [ ] T013 [US1] `site/index.html`의 `ul.links`에 `<li><a href="licenses/">오픈소스 라이선스</a></li>`를 더한다
- [ ] T014 [P] [US1] `src/i18n/catalogs/ko/license-links.ts`를 새로 쓰고 `{ row: "오픈소스 라이선스" }`를 내보낸다(머리 주석은 `policy-links.ts` 형식). `src/i18n/catalogs/ko/index.ts`에 영역을 등록한다
- [ ] T015 [P] [US1] `src/ui/settings-text.ts`에 `export const LICENSE_LINKS_TEXT = lazyText((c) => c.licenseLinks);`
- [ ] T016 [US1] `src/ui/SettingsScreen.tsx`에 `onOpenLicenses?`·`licensesFailedText?` 속성과 서체 라이선스 행 다음·개발자 행 앞의 `settings-licenses` 행(`LICENSE_LINKS_TEXT.row`, Chevron, 실패 힌트 danger 톤)을 더한다. 기존 행은 건드리지 않는다
- [ ] T017 [US1] `App.tsx`: `linkFailed` 유니온에 `"licenses"`를 더하고 `openLink("licenses", LICENSES_URL)`을 `onOpenLicenses`로, 실패 시 `POLICY_LINKS_TEXT.openFailed(LICENSES_URL)`을 `licensesFailedText`로 넘긴다. `LICENSES_URL`은 `./src/app/policy-links`에서 가져온다
- [ ] T018 [US1] `__tests__/i18n/ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 `"오픈소스 라이선스"`와 한 줄 주석(101)을 덧붙인다(다른 항목은 건드리지 않는다)
- [ ] T019 [US1] T006·T008~T010을 돌려 통과를 확인한다: `npx jest __tests__/privacy --selectProjects logic`, `npx jest __tests__/ui/settings-license-row.test.tsx __tests__/ui/settings-policy-rows.test.tsx --selectProjects ui`

## Phase 4: User Story 2 — 앱 화면은 모델 식별자를 노출하지 않는다 (P1)

**Independent Test**: `npx jest __tests__/i18n/license-links.test.ts --selectProjects logic` 통과, 위반 주입이 실패를 만든다.

- [ ] T020 [US2] `__tests__/i18n/license-links.test.ts`를 쓴다 — LK1(영역에 `row`뿐·기존 영역 키 불변), LK2(모든 값에 모델 식별자 목록 `kanana`·`카나나`·`lfm`·`liquid`·`llama`·`gguf`·`mmproj`·`2.1b`·`450m`·`q4`·`q8` 대소문자 무시 없음), LK3(`ADDED_AFTER_GOLDEN`에 문구가 있고 `src/ui/SettingsScreen.tsx`가 `models/roster`·`vision/roster`를 import하지 않음)
- [ ] T021 [US2] 위반 주입: `license-links.ts`의 `row`를 "Kanana 라이선스"로 바꿔(치환 적용을 먼저 단언) LK2가 실패하는지 보고 되돌린다. 결과를 `quickstart.md` 「실측」에 적는다
- [ ] T022 [US2] `npm run lint`의 헌법 검사(`scripts/check-constitution.mts`)가 통과하고 `.specify/memory/constitution.md`·`scripts/constitution-rules.ts`의 `git diff`가 0줄임을 확인한다

## Phase 5: User Story 3 — 소유자가 법적 해석 항목을 확인한다 (P1)

**Independent Test**: 스펙의 H1~H4가 원문 인용과 「소유자 확인 필요」로 올라 있고 최종 보고에 확인 상태가 있다.

- [ ] T023 [US3] `spec.md` 「소유자 확인 항목」 H1~H4에 `sources/` 파일의 조항 번호·줄 인용을 덧붙인다(LFM 1절 Threshold·4절·5절의 정확한 원문 문장, Apache-2.0 4절 재배포 조건, T001~T005 결과)
- [ ] T024 [US3] 위반 주입으로 LP5(`lfm` 전문 한 글자 바꿈)·LP3(항목 삭제)·LP6(`sources/llama-cpp-LICENSE.txt`를 상류 2023-2026으로)·LP2(`<script>` 추가)가 각각 실패하는지 본 뒤 되돌리고 결과를 `quickstart.md` 「실측」에 적는다

## Phase 6: Polish

- [ ] T025 `npm test`와 `npm run lint`(eslint + tsc + 헌법 검사 + prettier)를 실제로 돌려 출력과 함께 통과를 확인한다. `format:check`는 `src/`·`__tests__/`·루트 `*.ts(x)`만 보므로 사이트 HTML과 `sources/*.txt`는 대상이 아니다(`.prettierignore` 변경 없음)
- [ ] T026 099가 바꾼 문장과 경계 밖 파일이 그대로임을 확인한다: `git diff origin/main -- site/privacy site/support`가 0줄이고, `git diff origin/main --stat`에 `plan.md`의 구조 목록 밖의 파일(홈 화면 문구, 제목 구간·동작 줄이기 코드, 기존 카탈로그 파일)이 없다
- [ ] T027 dev 빌드 실기기 1회 확인(`quickstart.md` §3). 기기를 쓰기 전에 소유자에게 병렬 실측 세션과 겹치지 않는지 알린다. 결과를 `quickstart.md`에 기록한다
- [ ] T028 `git fetch origin && git merge origin/main`으로 충돌(특히 `ko-golden.test.ts`·`App.tsx`·`settings-text.ts`)을 푼다. 양쪽 항목을 모두 남긴다

## Dependencies & Execution Order

- Phase 1 → Phase 3의 T012(전문). Phase 2의 T006/T007은 Phase 3 테스트 전에.
- T008·T009·T010 [P] 먼저(실패 확인) → T011~T018 → T019.
- US2(T020~T022)는 T014 뒤에 한다. US3는 T001~T005 뒤.
- T014·T015 [P], T008~T010 [P], T002·T003·T005 [P].
- MVP: Phase 1~3. 이후 US2·US3로 방어와 확인 항목을 닫는다.

## Implementation Strategy

1. 원문을 먼저 확보해 정본을 못 박는다(Phase 1).
2. 테스트를 먼저 쓰고 실패를 본 뒤 페이지·행을 만든다(Phase 2~3).
3. 식별자 비노출과 원문 일치의 방어를 위반 주입으로 검증한다(Phase 4~5).
4. `npm test`·`npm run lint`·실기기 1회 후 완료 처리(Phase 6).
