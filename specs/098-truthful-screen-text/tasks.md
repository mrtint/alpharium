# Tasks: 화면 문구를 사실대로

**Input**: `specs/098-truthful-screen-text/` (spec.md, plan.md, research.md, data-model.md, contracts/copy-contract.md, quickstart.md)

**Tests**: 헌법 「개발 방식」에 따라 테스트를 먼저 쓰고 실패를 본 뒤 구현한다.

## Phase 1: Setup

- [ ] T001 `git branch --show-current`가 `098-truthful-screen-text`인지 확인하고, `npx jest __tests__/i18n __tests__/ui/home-text.test.ts --maxWorkers=2`로 시작 상태가 초록인지 본다
- [ ] T002 `src/i18n/catalogs/ko/monologue.ts`에 「쓰고 있어요」 부분 문자열이 없는지 확인한다(`.maestro/writing-monologue.yml:88` `notVisible`이 오탐되지 않아야 한다 — research R5). 있으면 Maestro 줄을 정확 일치 형태로 맞춘다

## Phase 2: Foundational — 골든 표 (모든 스토리가 쓴다)

- [ ] T003 `__tests__/i18n/ko-golden.test.ts`의 `CHANGED_AFTER_GOLDEN`에 spec `098` 항목을 이 스토리 구현 전에 먼저 올린다(literal `from`은 골든 json에 있어야 한다): 슬라이드 3 제목·본문, `placeAutoDesc`·`placeOnDesc`(+`SETTINGS_TEXT` outputs `path`), `overwriteConfirm.body`(+`OVERWRITE_CONFIRM` outputs), `wipeBody`(+`SETTINGS_TEXT`), `writing.fallback`(+`WRITING_TEXT`), `needsAuthor`. 골든 json 두 파일은 수정하지 않는다(CP8)
- [ ] T004 같은 파일 `ADDED_AFTER_GOLDEN`에 새 문구 「사진이 찍힌 자리 ${}곳」(`placesA11y`의 literal 꼴)을 098 주석과 함께 올린다. 지원 페이지 FAQ 문구는 카탈로그가 아니므로 올리지 않는다

## Phase 3: User Story 1 — 첫 실행 슬라이드 3 (P1)

**Independent Test**: 카탈로그 슬라이드 단언 + 내려받기 화면 렌더

- [ ] T005 [US1] `__tests__/ui/download-progress-screen.test.tsx`(또는 슬라이드를 단언하는 기존 `__tests__/` 파일; 없으면 `__tests__/i18n/download-slides.test.ts` 신설)에 CP1 단언을 먼저 쓴다 — 슬라이드 3 제목 「열면 바로 그날 일기를 써요」, 본문 확정 문장, 본문에 「켜 두면」 포함, 슬라이드 전체에 숫자·`%`·`MB`·`GB`·`분`·`초` 없음. 실패를 확인한다
- [ ] T006 [US1] `src/i18n/catalogs/ko/download.ts` 슬라이드 3을 확정 문장으로 바꾸고 머리 주석에 「자동 쓰기는 기본 꺼짐이라 알림·먼저 써 둠은 켜 두면 조건으로만」을 한 줄 더한다(098)
- [ ] T007 [US1] 위반 주입: 본문을 「오늘의 이야기가 조용히 완성돼 있어요」로 되돌려 T005가 실패하는지 확인하고 되돌린다

## Phase 4: User Story 2 — 장소 이름·장소 수 (P1)

**Independent Test**: 대화상자 보조 줄 단언, 값 줄 라벨 렌더, FAQ 계약

- [ ] T008 [US2] `__tests__/ui/place-name-dialog.test.tsx:50-51`·`__tests__/ui/settings-screen.test.tsx:88-90`의 보드 원문 하드코딩을 새 문장(CP2)으로 고치고 「숫자 대신」이 없음을 단언한다. 실패를 확인한다
- [ ] T009 [US2] `src/i18n/catalogs/ko/settings.ts`의 `placeAutoDesc`·`placeOnDesc`를 확정 문장으로 바꾼다
- [ ] T010 [P] [US2] `__tests__/ui/material-grid.test.tsx`(기존 MaterialGrid 테스트 파일; 없으면 신설)에 CP3를 먼저 쓴다 — 장소 3곳이면 `signal-places`의 `accessibilityLabel`이 「사진이 찍힌 자리 3곳」, 관측된 0곳도 「…0곳」, `unseen`·`loading`·`no-permission`에는 라벨 없음, `signal-places-cell`·사진 칸 `signal-photos`에는 라벨 없음. 실패를 확인한다
- [ ] T011 [US2] `src/i18n/catalogs/ko/home.ts`의 `material`에 `placesA11y: (n: number): string => \`사진이 찍힌 자리 ${n}곳\``을 더한다. `src/ui/MaterialGrid.tsx` `Cell`에 선택 prop `a11yLabel?: (n: number) => string`을 더해 `count`·`zero`일 때 값 줄 `View`에 `accessible`·`accessibilityLabel`을 단다(숫자는 `count`/0). 장소 `Cell`에만 `MATERIAL_TEXT.placesA11y`를 넘긴다. 파일 머리 주석에 라벨 자리(098)를 한 줄 적는다
- [ ] T012 [P] [US2] `__tests__/privacy/site-pages.test.ts` S9를 `["download","auto-write","uninstall","on-device","place-name","places"]`, 제목을 「여섯」으로 고치고 CP4 단언을 더한다 — `places` 항목이 마지막이고 확정 문장을 담으며 `100`·`m`거리 표현이 없고 `uninstall` 항목 텍스트가 불변. 실패를 확인한다
- [ ] T013 [US2] `site/support/index.html` 맨 끝(`place-name` 항목 뒤)에 `<section data-faq="places">`를 더한다 — 제목 「홈의 장소 수는 무엇인가요?」, 확정 답, 근거 주석(`signals/places.ts`: 사용 가능한 좌표만 묶어 센다, 거리 상수는 짐작이라 적지 않음). 다른 항목은 건드리지 않는다

## Phase 5: User Story 3 — 다시 쓰기·지우기 확인 (P1)

**Independent Test**: 두 대화상자 본문 단언

- [ ] T014 [US3] 단언을 먼저 고친다: `__tests__/ui/home-text.test.ts:104`(TXT1)·`__tests__/ui/overwrite-confirm.test.tsx:117`(OW1)을 「다 쓰면 지금 일기가 새 글로 바뀌어요. 바뀐 뒤에는 되돌릴 수 없어요.」로, `__tests__/ui/settings-this-phone.test.tsx:75,197`(TX1·UI5)을 「되돌릴 수 없어요. 휴대폰의 사진과 이름·설정은 남아요.」로. 실패를 확인한다
- [ ] T015 [US3] `src/i18n/catalogs/ko/home.ts` `overwriteConfirm.body`·`src/i18n/catalogs/ko/settings.ts` `wipeBody`를 확정 문장으로 바꾼다
- [ ] T016 [US3] 주석을 고친다: `src/ui/WipeConfirmDialog.tsx:10`(옛 「이름과 설정은 남아요.」 인용). `grep -rn "이름과 설정은 남아요" src __tests__`에 남는 소스·테스트 주석도 새 문장으로 맞춘다(`specs/058*` 등 옛 스펙 문서는 당시 기록이라 두고, 058 계약 UI5는 T014의 단언 수정으로 갈음한다)

## Phase 6: User Story 4 — 해라체 둘 (P2)

**Independent Test**: 카탈로그 값·홈 렌더

- [ ] T017 [US4] 단언을 먼저 고친다: `__tests__/ui/diary-home.test.tsx`(142·146·151·152·243·333·721·767·770·780·1007·1069의 「쓰고 있다」)·`__tests__/ui/writing-in-place.test.tsx:91,98`·`__tests__/ui/writing-monologue-rotation.test.tsx:94,103`·`__tests__/ui/settings-entry.test.tsx:131`을 「쓰고 있어요」로. `needsAuthor`를 직접 기대하는 단언이 있으면 「일기 작성자를 준비해야 해요」로. 실패를 확인한다
- [ ] T018 [US4] `src/i18n/catalogs/ko/home.ts` `writing.fallback`·`needsAuthor`를 해요체로 바꾸고 `src/ui/DiaryHomeScreen.tsx:136` 주석(「…준비해야 한다」 인용)을 맞춘다
- [ ] T019 [P] [US4] `.maestro/writing-monologue.yml:88` `notVisible`을 「쓰고 있어요」로 고친다(T002 결과 반영). 흐름 설명 주석의 「쓰고 있다」는 역사 인용이라 두되 파일 머리에 한 줄(098: 문구 변경)을 더한다

## Phase 7: Polish

- [ ] T020 `grep -rnE "잠들기 전에|조용히 완성|숫자 대신 이름|이름으로, 없으면 비워|이름과 설정은 남아요\.|새 글로 바뀌어요\.\"|쓰고 있다\"|준비해야 한다\"" src __tests__ site .maestro` 결과가 골든 json 두 파일(옛 값 보존)·`ko-golden.test.ts`의 `from` 값·주석의 역사 인용뿐인지 확인한다(CP9)
- [ ] T021 `npm test`·`npm run lint`를 돌려 통과를 확인한다
- [ ] T022 SM-S901N dev 빌드에서 quickstart 「실기기」 1~5를 확인하고 결과를 `specs/098-truthful-screen-text/quickstart.md` 끝 「실측」에 적는다(모델 보존, md5·사진 수 전후 비교 포함)

## Dependencies

T003·T004(골든 표) → 모든 스토리의 구현 후 `ko-golden` 통과. 스토리 US1~US4는 서로 독립이고 US2 안에서 T010·T012는 병렬 가능. 각 스토리는 (단언 수정/작성 → 실패 확인 → 구현) 순서. T021·T022는 마지막.

## Implementation Strategy

US1~US3가 P1이고 모두 문장 교체라 한 구현 커밋에 묶는다. MVP는 US1이지만 파이프라인상 전체를 한 번에 닫는다.
