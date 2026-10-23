# Tasks: 앱 아이콘과 스토어 등록 에셋

**Input**: `specs/102-app-icon-store-assets/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: 이 저장소는 계약을 먼저 정하고 테스트를 먼저 쓴다(헌법 「개발 방식」). 각 스토리는 테스트 → 구현 순서이며, 새 규칙은 위반 주입으로 검증한다.

**Format**: `- [ ] T### [P?] [US#] 설명 + 파일 경로` — [P] = 다른 파일이고 미완 태스크에 의존하지 않음.

**작업 위치**: 워크트리 `.claude/worktrees/app-icon-store-assets`(브랜치 `102-app-icon-store-assets`). 이미 있는 시안(`assets/*.png` 5개, `app.json` adaptive 배경)은 T006·T008이 정본 생성물로 대체한다.

## Phase 1: Setup

- [x] T001 `pngjs`(^7)와 `@types/pngjs`(^6)를 devDependency로 올린다 — `package.json`·`package-lock.json`. 올리기 전 `npm view pngjs version`·`npm view @types/pngjs version`으로 현재 버전을 확인하고(추측 금지), 최상위 `pngjs`가 간접 의존 3.x와 공존하는지 `npm ls pngjs`로 확인한다.

## Phase 2: Foundational (모든 스토리의 전제)

- [x] T002 [P] `design/icon.json`을 쓴다 — 계약 I1·data-model IconSource(도형 좌표는 시안 `gen-icon.cjs`의 460 좌표계 값, `scale.ios` 2.3, `scale.androidForeground` 1.6, `safeZone` 66/108, 색은 토큰 이름 `accent`·`accentForeground`). 파일 모양은 `design/tokens.json` 옆 스타일을 따른다.
- [x] T003 아이콘 순수 코어 `scripts/design/icon-build.ts`를 쓴다 — 정본 JSON 입력 → `renderIcon`(배경 유무·배율·크기 → RGBA 버퍼, 3×3 슈퍼샘플링), `bboxOfOpaque`, `toSvg`(미리보기 문자열), 색 토큰 해석(`design/tokens.json` 읽기). 시간·파일·기기를 읽지 않는다(`tokens-build.ts`와 같은 성격). 결정적 출력이어야 한다(같은 입력 → 같은 바이트).

## Phase 3: User Story 1 — 런처에서 새 아이콘이 보인다 (P1) 🎯 MVP

**목표**: 정본에서 생성된 아이콘이 두 플랫폼 런처에서 보인다(FR-001~004, FR-015).

**독립 검증**: `__tests__/design/icons.test.ts` 통과 + 위반 주입 + 두 실기기 런처.

### Tests (먼저, 실패해야 함)

- [x] T004 [US1] `__tests__/design/icons.test.ts`를 쓴다 — (a) 정본→생성물 바이트 일치(I3), (b) `assets/icon.png` 1024²·모든 픽셀 알파 255(I4, FR-002), (c) foreground 불투명 bbox가 중앙 66/108 안(I5, FR-003), (d) background 단색이 토큰 `accent` 값과 같고 `app.json` adaptive `backgroundColor`도 같음(I5), (e) favicon 48²·스토어 아이콘 512²(FR-004), (f) `app.json`의 `icon`·adaptive 세 경로·`web.favicon` 실재(I6), (g) `design/icon.json`에 16진수 색이 없음(I1), (h) 마크가 `accent`/`accentForeground` 토큰을 가리킴. 이 시점에는 생성기가 없어 (a)(e)가 실패해야 한다. 파일 읽기는 `__tests__/design/helpers`를 쓴다.

### Implementation

- [x] T005 [US1] 생성기 `scripts/design/build-icons.mts`를 쓴다 — I2: 쓰기와 `--check`, 쓰는 것 `assets/icon.png`·`android-icon-{foreground,background,monochrome}.png`·`favicon.png`(48²)·`store/ko/store-icon-512.png`·`design/icon.svg`. iOS·스토어 아이콘은 알파 없음(전면 빨강). 정본이 규칙을 어기면 아무것도 쓰지 않고 실패한다. `package.json`에 `"build:icons"` 스크립트를 더한다(`build-tokens` 호출 방식과 같게 — 기존 스크립트 이름 규칙 확인).
- [x] T006 [US1] 생성기를 돌려 `assets/`의 시안 PNG를 정본 생성물로 교체하고 `store/ko/store-icon-512.png`·`design/icon.svg`를 만든다. `app.json`의 adaptive `backgroundColor`가 `#ec3013`인지 확인한다(시안에서 적용됨). T004가 통과해야 한다.
- [x] T007 [US1] 위반 주입(I8): PNG 한 바이트 수정 → T004(a) 실패 확인 / iOS 아이콘 한 픽셀 알파 낮춤 → (b) 실패 / foreground를 안전 영역 밖으로 키운 입력 → (c) 실패 / adaptive `backgroundColor`를 `#E6F4FE`로 → (d) 실패. 각 주입은 치환이 적용됐는지 먼저 단언하고 되돌린 뒤 다시 통과를 확인한다.
- [x] T008 [P] [US1] `design/DESIGN.md`에 「아이콘」 절 한 단락을 더한다 — 정본은 `design/icon.json`, 생성은 `build-icons.mts`, 손으로 PNG를 고치지 않는다, 마크는 accent 면+accentForeground. `__tests__/design/design-doc.test.ts`가 문서의 백틱 이름이 저장소에 실재하는지 보므로, 적은 이름(`design/icon.json`·`scripts/design/build-icons.mts`)이 실재하고 테스트가 통과하는지 확인한다. 절 제목은 그 테스트의 `REQUIRED_HEADINGS` 검사를 깨지 않게 새 절만 더한다.
- [x] T009 [US1] 실기기 런처 확인(FR-015, 원칙 V): quickstart §2. 갤럭시 — `npx expo prebuild --platform android --clean` → `gradlew assembleDebug` → `adb install -r` → 런처·테마 아이콘(monochrome) 확인. iPhone 14 — iOS prebuild → 087 절차 Release 빌드 → `devicectl` 설치 → 홈 화면 확인, 필요하면 `scale.ios`를 조정해 확정하고 T006을 다시 돈다. 기기를 쓰기 전에 103 세션(`ListAgents`)에 알리고 그쪽 실측 중에는 iPhone에 설치·재기동하지 않는다(research R10). 결과(확인한 것·못 한 것)를 `specs/102-app-icon-store-assets/device-check.md`의 「런처」 절에 적는다. **갤럭시는 봤고 iPhone 홈 화면은 소유자 결정으로 보류**(T027 참고, 2026-10-23).

**체크포인트**: T004 통과, 위반 주입 4건 확인, 두 런처 확인(또는 못 한 쪽 명시).

## Phase 4: User Story 2 — iPhone 전용 선언 (P1)

**목표**: iPad 지원이 꺼지고 호환 모드 점검이 기록된다(FR-005, FR-006).

### Tests

- [x] T010 [P] [US2] `__tests__/config/ios-tablet.test.ts`를 쓴다 — `app.json`의 `expo.ios.supportsTablet`이 `false`(I7). 처음에 `true`라 실패해야 한다.

### Implementation

- [x] T011 [US2] `app.json`의 `ios.supportsTablet`을 `false`로 바꾼다. T010 통과. 위반 주입: `true`로 되돌려 실패 확인 후 복구.
- [x] T012 [US2] iPad 호환 모드 점검(quickstart §3): `npx expo prebuild --platform ios --clean` 뒤 iPad 시뮬레이터(`xcrun simctl list devices available`의 iPad Pro 11-inch (M5) 또는 iPad mini)에 설치해 첫 화면·권한·홈·설정을 지나 본다. 시뮬레이터에는 모델이 없어 첫 실행이 필수 모듈 동의 화면에서 멈출 수 있다 — 점검 범위는 거기까지로 한정하고, 그 한계를 기록에 적는다(research R4). 결과를 `specs/102-app-icon-store-assets/ipad-compat.md`에 **시뮬레이터 점검이라고 밝혀**, 깨진 곳은 항목별로 적고 후속 과제로 표시한다(고치지 않는다). 실행한 명령·시뮬레이터 이름·날짜를 함께 적는다.

**체크포인트**: T010 통과, `ipad-compat.md` 존재.

## Phase 5: User Story 3 — 한국어 등록 에셋 (P2)

**목표**: 두 스토어에 올릴 설명문·스크린샷·기능 그래픽·스토어 아이콘이 갖춰진다(FR-007~FR-013, FR-016, FR-017).

### Tests (먼저)

- [x] T013 [P] [US3] `__tests__/store/listing.test.ts`를 쓴다(FR-011·FR-012) — S2 글자 수 한도(코드 포인트 수, 끝 개행 제외: title≤30, subtitle≤30, short≤80, full≤4000, keywords≤100), 다섯 파일 존재, S3 모델 식별자 금지어 테스트 상수(`kanana`·`lfm`·`llama`·`gguf`·`파라미터`·양자화 표기·`2.1b` 등 대소문자 무시), 파일 끝 줄바꿈 LF. 파일이 없어 실패해야 한다.
- [x] T014 [P] [US3] `__tests__/store/assets.test.ts`를 쓴다 — S4·S5: `store/ko/screenshots/ios-6.5/*.png` 정확히 1284×2778 5장, `play-phone/*.png` 4장 이상이고 각 변 320~3840·긴 변≤짧은 변×2, `feature-graphic-1024x500.png` 1024×500, `store-icon-512.png` 512×512(PNG 헤더 IHDR로 치수 읽기), 스크린샷 파일명에 금지어 없음(S3). 파일이 없어 실패해야 한다.

### Implementation

- [x] T015 [US3] 생성기에 기능 그래픽을 더한다 — `scripts/design/icon-build.ts`·`build-icons.mts`가 `store/ko/feature-graphic-1024x500.png`(1024×500, accent 전면, 마크 하나, 글자 없음, `scale.featureGraphic`)를 쓴다. `design/icon.json`에 `scale.featureGraphic`을 정한다(마크 높이가 캔버스 높이 500의 60%가 되도록 글리프 높이 250 기준 배율 1.2로 시작해 결과를 눈으로 보고 확정). T004의 정본→생성물 일치 검사에 포함한다. 생성기 실행.
- [x] T016 [P] [US3] 설명문 다섯 파일 `store/ko/{title,subtitle,short,full,keywords}.txt`를 쓴다(R8) — 휴대폰이 화자가 되어 하루를 일기로 쓴다·사진과 장소를 기기 안에서 읽는다·인터넷 없이 쓴다·처음에 큰 파일을 한 번 받는다. 앱 이름은 「포켓로그」. 모델 이름·파라미터 수·양자화 금지(원칙 III). `site/privacy`·`site/support`와 서술을 대조하고 대조한 항목을 `device-check.md`의 「설명문 대조」에 적는다. 값(예: 2GB)을 설명문에 다시 적지 않는다. 소유자에게 문구를 보여 검수받는다(검수는 구현 구간 끝에 묶어 받아도 되나, 확정 전에는 `device-check.md`에 「소유자 검수 대기」로 적는다). T013 통과.
- [x] T017 [US3] 촬영 전 사진 확인(FR-017, 소유자 결정 2026-10-23 — 소유자 사진 대신 표본 심기): `npm run sample:fetch`로 표본을 내려받고, 쓸 날(예: 걷는 날·집에서만 등 사람 사진이 슬롯에 없는 날)을 골라 그 슬롯에 배정될 사진을 눈으로 확인한다(사람 얼굴·번호판·읽히는 글자 제외). 사진 파일·출처 페이지·라이선스·보이는 장소(표본의 공공장소 좌표)를 `device-check.md`의 「촬영 전 확인」에 **촬영보다 먼저** 적는다.
- [x] T018 [US3] 실기기에서 실제 일기를 쓰고 5개 장면(홈·쓰는 중·쓴 날·달력·설정 「이 휴대폰」)을 앱 화면 원본 그대로 캡처한다 — 문구 프레임·그림자·그라데이션 없음(FR-008·FR-009, 원칙 V) — iPhone 14(`devicectl`로 스크린샷 또는 기기에서 직접 캡처 후 전송)와 갤럭시(`adb exec-out screencap -p`). 두 기기에 표본 사진을 심는다(안드로이드 `npm run sample:seed` — 전용 테스트 기기에서만, `s30-` 표본 사진만 지우고 다시 심는다; iPhone `npm run ios:seed -- --day <날> --count N --photos <확인한 JPEG 폴더>`). 일기 본문은 반드시 실기기에서 실제로 생성한다. 입력이 심은 하루라는 점을 `device-check.md`에 밝힌다. 기기 사용 전 103 세션에 알린다. 촬영 일시·기기·빌드를 `device-check.md`의 「촬영」에 적는다. 일기에 모델 식별자가 나오지 않는 화면인지, 상태 표시줄·알림에 개인 정보(알림 내용·이름)가 비치지 않는지 캡처마다 본다(비치면 알림을 끄고 다시 찍는다).
- [x] T019 [US3] iPhone 캡처를 `scripts/store/prepare-screenshot.mts <in> <out> --size 1284x2778`(알파 제거 포함)로 `store/ko/screenshots/ios-6.5/NN-<장면>.png`에 확대해 두고, 갤럭시 캡처는 `--crop-height 2160`(Play 2:1 한도 — 갤럭시 1080×2340은 2.17배)으로 알파를 제거하고 잘라 `store/ko/screenshots/play-phone/NN-<장면>.png`에 둔다(R6). 갤럭시 장면은 4장 이상(5장 권장). T014 통과.
- [x] T020 [US3] 위반 주입(S8): `title.txt`를 31자로 → T013 실패 / `full.txt`에 「kanana」 삽입 → 실패 / 스크린샷 하나의 치수를 바꿈(`sips`로 크기 변경) → T014 실패 / 스크린샷 파일명에 `llama` → 실패. 각 주입은 치환 적용을 먼저 단언하고 되돌린 뒤 통과를 확인한다.
- [x] T021 [US3] 두 콘솔의 현재 규격 대조(FR-010, R5): Google Play Console·App Store Connect 도움말을 열어 research R5 표의 값을 확인하고, 날짜·출처 URL·결과(일치/어긋남)를 `device-check.md`의 「콘솔 규격 대조」에 적는다. 어긋나면 에셋(또는 테스트 한도)을 맞춘다. 확인하지 못한 항목은 못 했다고 적는다. 같은 절에 **출시 국가: 한국, 등록 정보 언어: 한국어 한 벌**(D8, 2026-10-23 소유자 결정)을 적는다(FR-007).

**체크포인트**: T013·T014 통과, 위반 주입 확인, `device-check.md`에 촬영 전 확인·규격 대조·설명문 대조.

## Phase 6: Polish & 교차 점검

- [x] T022 `git diff --stat origin/main`로 `src/`·`modules/`·`site/`·`src/i18n/catalogs/ko/`가 바뀌지 않았음을 확인한다(FR-014, I9). 바뀐 파일이 있으면 되돌린다.
- [x] T023 `npm test`·`npm run lint`를 실제로 실행해 통과를 확인한다(`prettier`가 `design/icon.json`·`store/` 텍스트를 어떻게 다루는지 확인하고, `.prettierignore`에 `store/`가 필요한지 판단해 반영한다. 사이트 HTML은 포맷하지 않는다).
- [x] T024 `AGENTS.md`를 고친다 — 「저장소의 현재 상태」에 아이콘·등록 에셋 한 줄(정본 `design/icon.json`→`build-icons.mts`→`assets/`, 등록 에셋 `store/ko/`, iPhone 전용 `supportsTablet:false`)과, 「지금도 유효한 실측 규칙」에 아이콘 PNG를 바꾸면 prebuild를 다시 돌려야 런처에 반영되고 안드로이드 adaptive는 보이는 영역이 108dp 중 72dp라 글리프 배율이 다르다는 실측 두 줄(R2·R3), 「코드를 어디에 두는가」 트리에 `store/` 한 줄을 더한다. 기존 서술을 주석으로 덧대지 않는다.
- [x] T025 로드맵 「진행 예정 과제」에서 이 과제를 빼 「완료 이력」에 한 줄 옮긴다(스펙 102) — kickoff 3차 커밋(완료 처리)에서 한다. 남은 위험(iPhone 규격 업로드 거부 여부는 제출 때 확인, iPad 호환 깨짐 후속 과제 유무)을 한 줄 적는다.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1·US2·US3. US1·US2는 서로 독립(US2는 `app.json`의 다른 줄). US3의 T015(기능 그래픽)는 US1의 생성기(T005)에 의존하고, T018(촬영)은 T009의 설치된 빌드와 같은 기기 사용 흐름이라 US1 기기 작업 뒤에 이어 하는 것이 효율적이다.
- 같은 파일: `app.json`(T006 확인·T011), `design/icon.json`(T002·T015), `scripts/design/*`(T003·T005·T015), `device-check.md`(T009·T016·T017·T018·T021) — 병렬 금지.

## Parallel Opportunities

- T002는 T001과 파일이 달라 함께 할 수 있다. T008 ∥ T005~T007. T010 ∥ T004. T013 ∥ T014 ∥ T016.

## Implementation Strategy

1. MVP = US1: T001~T009 — 새 아이콘이 두 런처에 보인다.
2. US2(T010~T012)로 iPhone 전용을 닫는다.
3. US3(T013~T021)로 등록 에셋을 갖춘다. 설명문 소유자 검수와 사진 확인(T017)이 사람 의존이므로 일찍 요청한다.
4. Polish(T022~T025).

## Phase 7: Convergence

- [x] T026 소유자가 `store/ko/*.txt` 설명문을 검수하고 확정한 결과를 `device-check.md`의 「설명문 대조」에 적는다(「소유자 검수: 대기」를 지운다) per FR-013 (partial)
- [x] T027 iPhone 14 홈 화면의 새 아이콘(배율 2.3 확정)과 갤럭시 안드로이드 13+ 테마 아이콘(monochrome)을 눈으로 확인한 결과를 `device-check.md`의 「런처」에 적는다 per FR-015, US1/AC2·AC3 (partial) — **iPhone 홈 화면 확인과 테마 아이콘 확인은 소유자 결정으로 보류**(2026-10-23, 「이번에도 안 보고 넘어감」): 결과를 `device-check.md`에 못 봤다고 적었고 iOS 배율 2.3은 임시값으로 남는다
- [x] T028 `plan.md` 「Source Code」 구조와 의존성 서술을 실제 구현에 맞춘다 — `scripts/store/{screenshot-prep.ts,prepare-screenshot.mts}`, `scripts/design/pngjs.d.ts`, `pngjs ^3.4.0`(타입 패키지 없이 자체 선언), 생성기가 `--crop-height`를 지원함 per plan: Project Structure (unrequested)
- [x] T029 iPhone 14의 2026-09-24에 남은 출처 불명 사진이 섞인 일기를 어떻게 할지 소유자가 정하고 `device-check.md`에 결과를 적는다(앱의 일기 모두 지우기는 다른 일기까지 지우므로 소유자 판단) per FR-017 (unrequested)
