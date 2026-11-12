# Tasks: 앱 아이콘을 노을 「P.」로 바꾼다

**Input**: `specs/117-sunset-p-icon/` — spec.md, plan.md, research.md, data-model.md, contracts/icon-source.md, quickstart.md

**Tests**: 계약 테스트를 구현보다 먼저 쓴다(헌법 「개발 방식」). 대상은 `__tests__/design/icons.test.ts` 한 파일이다.

형식: `- [ ] T### [P?] [US?] 설명 — 파일`. `[P]`는 서로 다른 파일이라 병렬 가능.

## Phase 1: Setup

- [ ] T001 `@resvg/resvg-js`를 정확한 버전 `2.6.2`로 devDependency에 추가한다(`npm i -D --save-exact @resvg/resvg-js@2.6.2`) — `package.json`, `package-lock.json`. 앱 번들 의존이 아님을 확인한다(`dependencies`에 넣지 않는다)

## Phase 2: Foundational (모든 스토리가 기다린다)

- [ ] T002 [P] 그림 정본을 만든다 — `design/icon-candidates/sunset-p/source.svg`를 `design/icon-art.svg`로 옮기고 구조를 고친다: `<defs>`(그라데이션 `bg`·`sky`·`sea`·`dot`, 경로 `p-shape`, 원 `dot-shape` `cx=508 cy=875 r=46`, `clipPath id="p"`는 `p-shape`를 쓴다), 배경 `<g id="bg-layer">`(`bg` 그라데이션 사각형 1024²), 그림 `<g id="art">`(풍경 + 마침표 `<use href="#dot-shape" fill="url(#dot)"/>`). 래퍼 `<g transform>`은 넣지 않는다. 색·경로·불투명도는 원본 그대로. clipPath 안 `<use>`가 resvg에서 안 되면 clipPath에 같은 `d`를 직접 둔다(research R2)
- [ ] T003 [P] 배치 값 정본을 v2로 고친다 — `design/icon.json`: `version: 2`, `art.file`·`art.center {x: 473.1, y: 561.5}`, `scale {ios: 1.0, androidForeground: 0.784, featureGraphic: 0.5}`, `safeZone 66/108`. 색·도형 필드와 16진수는 없다. 모든 `note`에 「사람이 정한 값, 런처 확인 전 임시값」을 적는다(원칙 V)
- [ ] T004 계약 테스트를 새 정본에 맞춰 먼저 고친다(실패해야 한다) — `__tests__/design/icons.test.ts`: C1(`icon.json`에 16진수·색 필드 없음, 그림 파일·id 존재), C3(16진수는 `icon-art.svg`에만 — 생성기 소스·`icon.json` 주석 제거 뒤 검사), C4(마침표 `(508, 875)`, id 4개), C5(생성물 픽셀 대조 + 두 번 만든 결과 동일), C6, C7(정사각형 + 반지름 `1024×66/108/2` 원, monochrome에 P·마침표), C8, C9(`backgroundColor`는 `#bg` 첫 정지점), C10(위반 주입: 픽셀 변조·iOS 알파·배율 3.0·그림 밖 16진수·없는 id)
- [ ] T005 생성기를 SVG 조립 + resvg 래스터화로 바꾼다 — `scripts/design/icon-build.ts`: 그림 파일에서 `<defs>`·`bg-layer`·`art`·`p-shape`·`dot-shape`를 id로 꺼내고(없으면 실패), 출력마다 `translate(W/2 H/2) scale(s) translate(-cx -cy)` 래퍼로 SVG를 조립해 `Resvg`로 렌더한다(`fitTo` 없이 viewBox=캔버스). 기하 도형·슈퍼샘플링·`resolveColors`는 걷는다. 불투명 출력은 알파 255를 검사한다. 출력 목록은 102 그대로(PNG 7 + `design/icon.svg` = iOS 합성 SVG 문자열)
- [ ] T006 [P] 생성기 실행기를 맞춘다 — `scripts/design/build-icons.mts`: 입력을 `design/icon.json` + `design/icon-art.svg`로 바꾸고(토큰 읽기 제거) 머리 주석의 설명을 고친다
- [ ] T007 `app.json`의 adaptive `backgroundColor`를 `#fffdf8`(그림 `#bg` 첫 정지점)로 바꾼다 — `app.json`. C9 테스트가 통과한다 (생성물 만들기 앞에서 한다)
- [ ] T008 생성물을 만든다 — `npm run build:icons`로 `assets/`·`store/ko/`·`design/icon.svg`를 쓰고 `npm run build:icons -- --check`가 0인지, 두 번째 실행이 「바뀐 것이 없다」인지 확인한다. T004 테스트가 통과한다

## Phase 3: User Story 1 — 두 기기의 런처에서 노을 「P.」가 보인다 (P1)

**독립 검증**: iOS·안드로이드 PNG가 규칙을 지키고, 갤럭시 런처에서 보인다.

- [ ] T009 [US1] 렌더를 눈으로 본다 — `assets/icon.png`·`assets/android-icon-foreground.png`·마스크(원·스퀘어클) 미리보기를 열어 P·마침표가 보이고 잘리지 않는지 확인한다(스크린샷은 스크래치패드)
- [ ] T010 [US1] 갤럭시 SM-S901N에서 `npx expo prebuild --platform android --clean` 뒤 debug APK를 설치하고(`pm clear` 금지 — 모델 보존) 런처에서 foreground·마스크 잘림을 본다. 결과를 `specs/117-sunset-p-icon/quickstart.md` 「기록」에 적는다 — 본 것·못 본 것
- [ ] T011 [US1] iPhone 14용 개발 서명 Release 빌드를 깔아 둔다(AGENTS.md 「작업 습관」의 CLI 개발 빌드법) — 소유자가 본 결과를 받아 `quickstart.md`에 적는다. 받기 전에는 「확인했다」고 쓰지 않는다

## Phase 4: User Story 2 — 테마 아이콘과 스토어 에셋 (P1)

**독립 검증**: monochrome·스토어·기능 그래픽·favicon이 같은 정본에서 규칙대로 나온다.

- [ ] T012 [US2] monochrome 렌더를 본다 — `assets/android-icon-monochrome.png`가 투명 바탕에 P 윤곽·마침표만 있는지, 갤럭시 설정 > 배경화면 및 스타일 > 테마 아이콘으로 실제 모양을 본다(`quickstart.md` 기록)
- [ ] T013 [P] [US2] 기능 그래픽(배율 0.5)·스토어 아이콘 512·favicon 48 렌더를 보고 배율 0.5가 맞는지, 29·40·48·60px 읽힘을 기록한다 — `quickstart.md`. 배율을 바꾸면 `design/icon.json`을 고치고 T008을 다시 돌린다

## Phase 5: User Story 3 — 정본 하나·문서 (P2)

**독립 검증**: 문서가 새 아이콘과 예외를 말하고 로드맵이 정리된다.

- [ ] T014 [P] [US3] `design/DESIGN.md` 「아이콘」 절을 고친다 — 노을 「P.」·그림 SVG 정본(`design/icon-art.svg`)+배치 값(`design/icon.json`)·생성기 `build-icons.mts`·「색은 토큰으로만」과 「보드에 없는 장식(그라데이션) 금지」의 **아이콘 그림 한정 예외**(16진수는 그림 파일 한 곳에만)·배율 임시값. 「하지 않는 것」의 장식 줄에도 예외를 한 줄 적는다. `design-doc` 테스트가 통과한다
- [ ] T015 [P] [US3] `AGENTS.md`의 아이콘 서술(「아이콘·스토어 등록 에셋(102)」 항목과 안드로이드 절의 아이콘 PNG 항목)을 노을 「P.」·그림 SVG 정본으로 고친다. 뒤의 결정이 앞을 뒤집으므로 주석을 덧대지 않고 고친다. 런처에서 본 것·못 본 것은 T010~T013 결과를 받은 뒤 적는다
- [ ] T016 [US3] 후보 폴더를 지운다 — `design/icon-candidates/`(git 기록에 남는다). 읽는 곳이 없는지 `grep`으로 확인한다
- [ ] T017 [US3] 로드맵을 정리한다 — `docs/roadmap/README.md`: 「앱 아이콘·등록 에셋 마무리 확인」의 아이콘 항목(iOS 배율 2.3·monochrome)을 이 과제로 대체됐다고 정리한다(완료 이력 이동은 완료 처리 단계)

## Phase 6: Polish

- [ ] T018 `npm test`·`npm run lint`·`npm run build:icons -- --check`를 실제로 돌려 통과를 확인한다
- [ ] T019 `git diff --stat`으로 `src/`·`modules/`·`site/` 변경이 없는지(C11) 확인한다
- [ ] T020 위반 주입으로 방어를 확인한다 — 그림 파일 밖에 16진수를 넣고·PNG 한 픽셀을 바꾸고·foreground 배율을 키워 각각 테스트가 잡는지 본 뒤 되돌린다

## 의존 순서

T001 → T002·T003(병렬) → T004(실패) → T005 → T006 → T007 → T008 → US1·US2(T009~T013, 기기 확인은 소유자 답에 달림) → US3(T014~T017) → Polish. T011·T013의 소유자 확인은 구현 구간 끝에 기다리지 않고 「받지 못함」으로 기록할 수 있다 — 받기 전에는 확인으로 쓰지 않는다.

## 구현 전략

MVP는 Foundational(T001~T008)이다 — 정본·생성기·테스트가 끝나면 생성물이 새 아이콘이다. 이어 기기 확인과 문서를 덧댄다.
