# Tasks: 일기 본문 화면 개선

> **⚠️ [2026-08-23, plan·tasks 최초 작성 후 사용자 피드백으로 갱신]** 원래 계획은
> 제목(014)이 "이미 화면에 표시되고 있으므로 손댈 것 없음"이라고 판단했다.
> 사용자가 실제 생성되는 제목이 "{캐릭터}의 오늘일기"류 재조합 문구로 나온다는
> 문제를 지적해, User Story(제목이 그날을 담은 헤드라인이다, P1)와 태스크
> (T020~T023)를 새로 추가했다. 이하 태스크 ID는 전부 이 추가를 반영해 재번호됐다.

**Input**: Design documents from `/specs/017-diary-body-screen/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: 이 프로젝트의 「개발 방식」(AGENTS.md)이 "계약을 먼저 정하고 테스트를
먼저 쓴다"를 관례로 못박았으므로 테스트 태스크를 포함한다 — 각 구현 태스크 앞에
대응하는 실패하는 테스트를 먼저 쓴다.

**Organization**: Foundational이 네 스토리가 공유하는 타입 확장(캡션 사본 경로,
대표 좌표, 조사 함수)을 먼저 배선하고, 그다음 User Story별로 화면까지 끝까지
잇는다. US1(사진 표시)이 가장 크고 나머지의 저장 필드 패턴(옵셔널 확장, 성공
경로에서만 채워짐)을 확립하므로 먼저 온다. US2(제목 헤드라인)는 프롬프트 지시문
한 곳만 고치는 가장 가벼운 스토리라 US1 바로 다음, US3(소요 시간)는 새 네이티브
의존이 없어 그다음, US4(장소명)는 `expo-location` 추가·새 권한·가장 넓은 실기기
검증이 필요해 마지막이다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일, 의존성 없음 — 병렬 가능
- **[Story]**: US1(P1)/US2(P1)/US3(P2)/US4(P3)/F(Foundational, 모든 스토리가 의존)

## Path Conventions

Single project — `src/`, `__tests__/`, `.maestro/`가 저장소 루트에 있다(plan.md
Project Structure 참조).

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: 세 User Story(US1·US3·US4)가 공유하는 타입 확장 — `PhotoCaption.
resizedPath`, `PlaceTrace.representativeCoordinate`, 은/는 조사 함수. US2(제목)는
이 phase에 의존하지 않는다 — 프롬프트 지시문 한 곳만 고치는 독립 스토리다.

**⚠️ CRITICAL**: 이 phase 완료 전에는 US1·US3·US4 중 어느 것도 화면에서 확인할
수 없다. US2는 Foundational과 무관하게 아무 때나 시작 가능하다.

### 캡션 사본 경로 (data-model.md §1, contracts/photo-preservation.md P1)

- [X] T001 [P] [F] `__tests__/vision/types.test.ts`에 `PhotoCaption`의 소스
  선언이 `resizedPath?: string`(옵셔널)을 갖는지 직접 읽어 검사하는 계약
  테스트를 추가한다(**먼저 작성해 실패를 확인**).
- [X] T002 [F] `src/vision/types.ts`의 `PhotoCaption`에 `resizedPath?: string`을
  추가한다(data-model.md §1). T001의 테스트가 통과해야 한다.

### 대표 좌표 (data-model.md §4, research.md §2)

- [X] T003 [P] [F] `__tests__/signals/places.test.ts`에 다음을 추가한다
  (**먼저 작성해 실패를 확인**):
  - 좌표 여럿이 두 자리 이상으로 묶이는 입력에서 `tracePlaces()`가
    `representativeCoordinate`로 **첫 자리**(시각순 최초 좌표)를 돌려준다.
  - 자리가 하나뿐이면 그 하나가 `representativeCoordinate`로 나온다.
  - `points.length === 0`이면 `representativeCoordinate` 필드 자체가 없다
    (`in` 연산자로 키 부재 확인, `undefined` 대입과 구분).
- [X] T004 [F] `src/signals/places.ts`의 `PlaceTrace`에
  `representativeCoordinate?: Coordinate`를 추가하고, `tracePlaces()`가
  `places[0]`을 그 필드로 함께 반환하도록 고친다(research.md §2 구현 스니펫).
  `points.length === 0`인 조기 반환 경로는 건드리지 않는다. T003의 테스트가
  통과해야 한다.

### 은/는 조사 (contracts/particle.md, research.md §5)

- [X] T005 [P] [F] `__tests__/diary/particle.test.ts`를 확장한다(**먼저
  작성해 실패를 확인**, 016의 기존 `particleFor` 테스트는 유지) —
  contracts/particle.md 검증 표 그대로:
  - 로스터 5인(금동이·루이·오드·샤오바이·모카) 전부 `topicParticleFor` →
    `"는"`을 돌려준다.
  - 받침 있는 합성 이름(예: `"테스트인"`, `"민준"`) 최소 1개에서
    `topicParticleFor` → `"은"`, `particleFor` → `"이"`를 돌려준다.
  - 빈 문자열·비한글 문자에서도 예외 없이 `topicParticleFor` → `"는"`을
    돌려준다.
  - 016 시절 `particleFor` 테스트가 리팩터 후에도 그대로 통과한다(회귀 확인).
- [X] T006 [F] `src/diary/particle.ts`를 고친다: 배치임 판정을 공유 헬퍼
  `hasBatchim(name): boolean | undefined`로 추출하고, `particleFor()`는 그
  헬퍼를 쓰도록 리팩터한 뒤 `topicParticleFor(name): "은" | "는"`을 새로
  추가한다(research.md §5 구현 스니펫, contracts/particle.md PT1~PT3).
  `Character`·`../models/roster`·`./persona`는 여전히 import하지 않는다.
  T005의 테스트가 통과해야 한다.

### 헌법 1.2.0 반영 — 낡은 주석 개정 (research.md §4)

- [X] T007 [P] [F] `src/inference/types.ts`의 `DiaryDraft` 주석과
  `src/diary/types.ts`의 `DiaryEntry` 주석을 헌법 1.2.0 경계에 맞게 고쳐
  쓴다(research.md §4) — "소요 시간을 담지 않는다"를 "완료된 생성 1건의
  소요 시간은 헌법 1.2.0이 허용한 사후 1회성 기록으로 담되, 비교·평균·모델
  식별자 동반은 여전히 금지"로 바꾼다. 이 태스크는 아직 필드를 추가하지
  않는다 — 각 필드 추가는 T012(US1)·T024(US3)에서 한다.

**Checkpoint**: 캡션 사본 경로·대표 좌표·은는 조사 함수가 준비됐다. 아직
저장·화면 배선은 안 됐고 화면에는 아무것도 안 보인다 — User Story들이 그것을
한다.

---

## Phase 2: User Story 1 - 쓰인 사진을 본문에서 본다 (Priority: P1) 🎯 MVP

**Goal**: 캡션에 실제로 쓰인 리사이즈 사본이 즉시 삭제되지 않고, 저장이 성공한
일기에 한해 `DiaryEntry.photos`로 남아 상세 화면에 표시된다. 원본 사진이
삭제돼도 화면은 영향받지 않는다.

**Independent Test**: 사진이 있는 하루로 일기를 생성한 뒤 상세 화면을 열어,
본문 안에 VLM이 실제로 분석한 사진(그날 전부가 아니라)이 이미지로 표시되는지
확인한다. 원본을 지워도 화면이 그대로인지 확인한다(spec Independent Test 그대로).

### Tests for User Story 1

- [X] T008 [P] [US1] `__tests__/vision/caption.test.ts`에 다음을 추가한다
  (**먼저 작성해 실패를 확인**) — contracts/photo-preservation.md P1·P2 근거:
  - 리사이즈·캡션 둘 다 성공한 장의 사본이 `captionAll()` 반환 직후에도
    여전히 존재한다(cleanup이 그 장에서 호출되지 않았음을 대역으로 확인).
  - 캡션이 실패한 장(엔진이 빈 문자열을 돌려줌)의 사본은 `captionAll()`이
    반환하기 전에 이미 지워진다(cleanup이 호출됐음을 대역으로 확인).
  - 원본과 같은 경로(013 C1, 리사이즈 생략)인 장은 cleanup이 전혀 호출되지
    않는다(회귀 확인, FR-006 원본 보호).
  - 성공한 장의 `PhotoCaption.resizedPath`가 실제 리사이즈 경로와 일치한다.
- [X] T009 [US1] `src/vision/caption.ts`의 `captionAll()`을 고친다: 성공한
  캡션(`shouldCleanup === true`이고 `result.text !== ""`)의 `finally`에서
  즉시 `cleanup()` 호출을 제거하고, 대신 `captions.push()`에 `resizedPath:
  shouldCleanup ? captionPath : undefined`를 함께 싣는다. 실패한 캡션
  (`continue`로 빠지는 경로)은 기존처럼 `finally`에서 즉시 지운다 — 성공한
  캡션만 삭제를 미룬다(contracts/photo-preservation.md P1·P2). T008의
  테스트가 통과해야 한다.
- [X] T010 [P] [US1] `__tests__/inference/on-device.test.ts`에 다음을
  추가한다(**먼저 작성해 실패를 확인**):
  - 성공한 생성에서 `DiaryDraft.usedPhotos`가 캡션 성공한 사진만(실패한
    장 제외) `photoId`·`takenAt`·`resizedPath`로 담는다.
  - 판정 거부(`rejected`)·타임아웃·끊김 등 모든 `GenerationFailure` 갈래에서
    캡션 성공한 사본이 실제로 지워진다(파일 존재 여부를 대역 cleanup 호출로
    확인) — `GenerationFailure`에는 `usedPhotos` 필드 자체가 없다.
  - 사진을 아예 읽지 않은 경우(vision `none`, 사진 0장) `usedPhotos`가
    없다.
- [X] T011 [P] [US1] `__tests__/diary/pipeline.test.ts`에 다음을 추가한다
  (**먼저 작성해 실패를 확인**) — contracts/photo-preservation.md P4 근거:
  - 저장 성공 시 `entry.photos`가 `generated.usedPhotos`를 그대로 담는다.
  - 저장 실패(`storage` 단계)에서 `usedPhotos`의 사본이 정리된다(대역
    cleanup 호출 확인).
  - 같은 하루를 재시도(재생성)해도 리사이즈 사본 파일이 누적되지 않는다
    (`resizedFileNameFor()`의 결정론 재확인 — 같은 사진이면 같은 파일명).

### Implementation for User Story 1

- [X] T012 [US1] `src/inference/types.ts`의 `DiaryDraft`에
  `usedPhotos?: { photoId: string; takenAt: Date; resizedPath: string }[]`을
  추가한다(data-model.md §5). `GenerationFailure` 쪽에는 이 필드를 추가하지
  않는다.
- [X] T013 [US1] `src/inference/on-device.ts`의 `readPhotos()`가
  `captionAll()`의 결과(`PhotoVision`, 이미 `resizedPath`를 포함)를 그대로
  위로 전달하는지 확인한다(대개 이미 그렇다 — `PhotoVision.captions`를
  손대지 않았으므로). `generate()`의 성공 반환 직전에, `seen.captions`
  에서 `resizedPath`가 있는 것만 걸러 `DiaryDraft.usedPhotos`를 만든다.
  `generate()`가 실패를 반환하는 모든 경로(judge 거부, timed-out,
  interrupted, model-load-failed 등) 직전에, 그 요청에서 캡션 성공한
  `seen.captions`의 `resizedPath` 전부를
  `cleanupResizedPhoto()`(이미 있는 함수, `vision.cleanupResized`)로 정리한다
  (research.md §1 흐름 3). T010의 테스트가 통과해야 한다.
- [X] T014 [US1] `src/diary/types.ts`의 `DiaryEntry`에
  `photos?: { photoId: string; takenAt: Date; resizedPath: string }[]`을
  추가한다(data-model.md §6).
- [X] T015 [US1] `src/diary/pipeline.ts`의 `runStages()` 6단계(저장)를
  고친다: 저장 성공 시 `entry`에 `generated.usedPhotos`를 `photos`로 옮겨
  담는다. 저장 실패(`saved.ok === false`) 시 `generated.usedPhotos`가
  있으면 그 사본들을 정리한다(T013과 같은 cleanup 함수 재사용 — 의존성
  주입 경로는 `PipelineDeps`에 필요하면 추가). T011의 테스트가 통과해야
  한다.
- [X] T016 [US1] `src/diary/store.ts`의 `reviveDates()`가 `entry.photos`
  배열의 `takenAt`도 `Date`로 복원하도록 고친다(data-model.md §6 「직렬화」
  — `signalsUsed.photos`에 하는 것과 같은 패턴). 빠뜨리면 왕복 후
  `takenAt`이 문자열로 남는다.
- [X] T017 [P] [US1] `__tests__/diary/store.test.ts`에 `entry.photos`가
  직렬화·역직렬화 왕복에서 `Date` 타입을 유지하는지, `photos` 필드가 없는
  옛 형식 JSON도 정상적으로 읽히는지(하위 호환) 검사하는 테스트를 추가한다
  (**먼저 작성해 실패를 확인**). T016의 대상이다.
- [X] T018 [P] [US1] `__tests__/ui/diary-detail.test.tsx`에 다음을 추가한다
  (**먼저 작성해 실패를 확인**):
  - `entry.photos`가 있으면 그 사진들이 이미지로 렌더된다(파일 경로가
    `resizedPath`와 일치).
  - `entry.photos`가 없으면(옛 일기) 사진 표시 영역 없이 기존
    `signalLines()` 텍스트만 렌더된다(회귀 확인).
  - 사진 파일을 실제로 못 불러오는 경우(대역이 로드 실패를 흉내) "이 사진은
    이제 없다"류 문구가 그 사진 자리에 보이고, 나머지 사진은 정상 렌더된다
    (FR-002, contracts/photo-preservation.md P6).
- [X] T019 [US1] `src/ui/DiaryDetailScreen.tsx`에 사진 렌더링을 추가한다:
  "이 일기가 본 것" 절 상단(또는 본문 하단)에 `entry.photos`가 있으면
  각 사진을 `Image`로 그린다. 개별 사진 로드 실패는 그 사진 하나만 "이 사진은
  이제 없다"로 대체하고 나머지는 계속 렌더한다(011의 E4와 같은 원칙을 화면
  레벨에서 반복, P6). T018의 테스트가 통과해야 한다.

**Checkpoint**: User Story 1이 독립적으로 완전히 동작한다 — 캡션 성공한
사진이 상세 화면에 보이고, 원본이 지워져도 화면은 영향받지 않으며, 판정
거부·저장 실패 시 사본이 쌓이지 않는다. 여기서 멈춰도 배포 가능한 증분이다.

---

## Phase 3: User Story 2 - 제목과 본문이 깔끔하게 분리된 헤드라인이다 (Priority: P1)

**Goal**: `prompt.ts`의 제목·서식 지시문이 (1) 구체적인 헤드라인을 요구하고,
(2) 마크다운 서식 기호를 금지하며, (3) 본문이 지시문 낱말을 되뱉거나 날짜를
반복하는 부제목으로 시작하지 않도록 보강되어, 화면에 제목 하나 + 군더더기
없는 본문이 깔끔하게 나온다. `judge()`의 판정 갈래는 여전히 4개다.

**Independent Test**: 서로 다른 여러 하루로 일기를 생성해, 제목들이 서로
구별되고 재조합 패턴이 아닌지, 제목·본문 어디에도 마크다운 기호가 없는지,
본문 첫 줄이 부제목성 군더더기로 시작하지 않는지 사람이 직접 읽어 확인한다
(spec Independent Test 그대로). 사진·소요 시간·장소명 없이도 그 자체로
완결된 가치가 있다.

**참고**: Foundational에 의존하지 않는 독립 스토리다 — `prompt.ts` 한 파일과
그 계약 테스트만 건드린다. **실기기 실측(2026-08-23)으로 범위가 넓어졌다** —
당초 제목 재조합 문제만 다룰 계획이었으나, 저장된 일기 JSON을 직접 읽어
마크다운 노출(`title: "### 루이의 일기"`)과 본문 첫 줄의 지시문 낱말 되뱉음
(`text: "빈 줄\n\n..."`)·날짜 재반복(`text: "**2026-08-21**\n\n..."`)이 함께
확인됐다(research.md §9).

### Tests for User Story 2

- [X] T020 [P] [US2] `__tests__/diary/prompt.test.ts`에 다음을 추가한다
  (**먼저 작성해 실패를 확인**) — contracts/title.md TL2·TL3·TL4·TL7·TL9·
  TL10·TL11 근거:
  - 지시문 문자열이 "{이름}의 오늘 일기"류 재조합 패턴을 금지하는 구체적
    반례를 포함한다.
  - 지시문 문자열이 짐작 어미 규칙(014의 `SPEAKER_RULES` 마지막 항목)이
    제목에도 적용됨을 언급한다.
  - 지시문 문자열이 마크다운 서식 기호(`#`, `*`, `**`, `-` 등)를 쓰지
    말라는 구체적 예시를 포함한다(TL9).
  - 지시문 문자열에 **"빈 줄"이라는 낱말이 없다**(TL10 역검증 — 기존
    `TITLE_INSTRUCTION`의 해당 표현이 제거됐는지).
  - 지시문 문자열이 본문은 날짜·제목을 반복하지 말고 바로 하루 내용으로
    시작하라는 지시를 포함한다(TL11).
  - 지시문 문자열에 완성된 문장 형태의 긍정 예시(그대로 베낄 수 있는 완전한
    제목 문장)가 **없다**(TL3 역검증).
  - 제목 지시문이 여전히 `instructionLines()`에 포함되어 되뱉기 판정
    대상인지(기존 불변식 회귀 확인, `prompt.ts:101-103`).
- [X] T021 [US2] `src/diary/prompt.ts`의 `TITLE_INSTRUCTION`(필요하면 인근에
  서식 지시문을 추가로 분리)을 research.md §8·§9의 방향대로 보강한다:
  (1) 재조합 패턴 금지 예시, (2) 그날의 구체적 신호(사진 장면·자리 등)를
  담으라는 요구, (3) 짐작 어미 규칙이 제목에도 적용됨을 명시, (4) 마크다운
  기호를 쓰지 말라는 구체적 예시, (5) "빈 줄을 넣어라" 표현을 제거하고
  실제 개행 구조로만 서식을 전달, (6) 본문이 날짜·제목을 반복하지 말고
  바로 시작하라는 지시. 완성된 긍정 예시 문장은 넣지 않는다(TL3). 캐릭터별
  다른 지시문을 만들지 않는다(TL5, `nameLine()`과 같은 구조를 만들지
  않는다). T020의 테스트가 통과해야 한다.
- [X] T022 [P] [US2] `__tests__/diary/acceptance.test.ts`에(기존 파일이면
  확장, 없으면 해당 계약 테스트 파일 위치 확인 후) `judge()`의 판정 갈래
  수가 여전히 4개(empty/echo/language/unfinished)인지 재확인하는 회귀
  테스트가 이미 있는지 확인하고, 없으면 추가한다(TL1, 005 FR-018b 재확인 —
  이 기능이 갈래 수를 늘리지 않았는지의 최종 방어).

### Implementation for User Story 2

이 스토리의 구현은 T021 하나뿐이다 — 프롬프트 지시문 텍스트 보강 외에 새
타입·새 배선이 없다(연구 §8 「대안 기각」— 별도 판정 갈래를 만들지 않기로
했으므로).

**Checkpoint**: User Story 1·2 모두 독립적으로 동작한다. 이 시점에 사용자가
지적한 "금동이의 하루 기록"류 재조합 제목, 마크다운 기호 노출, "빈 줄"
문자 그대로 노출, 본문 첫 줄의 부제목성 날짜 반복 문제가 전부 프롬프트
수준에서 다뤄졌다 — 실제 개선 여부는 quickstart D3a의 사람 검수로
확인한다(TL8, 자동 채점 없음).

---

## Phase 4: User Story 3 - 소요 시간을 사후에 담담히 듣는다 (Priority: P2)

**Goal**: `on-device.ts`가 사진 분석·글쓰기 각 구간을 벽시계로 재고,
`DiaryEntry.timing`으로 저장되어 상세 화면에 문법적으로 올바른 문장으로
보인다.

**Independent Test**: 사진이 있는 하루로 새 일기를 생성한 뒤 상세 화면에서
캐릭터 이름과 조사가 올바른 소요 시간 문장이 보이는지 확인한다(spec
Independent Test 그대로).

### Tests for User Story 3

- [X] T023 [P] [US3] `__tests__/inference/on-device.test.ts`에 다음을
  추가한다(**먼저 작성해 실패를 확인**) — contracts/elapsed-time.md T1~T4
  근거:
  - 사진을 실제로 읽은 성공 경로에서 `DiaryDraft.timing.visionMs`가
    양수이고, `writingMs`도 양수다.
  - 사진을 읽지 않은 경로(vision `none`, 사진 0장)에서 `timing.visionMs`가
    없고 `timing.writingMs`만 있다(FR-013).
  - 실패 경로(판정 거부·타임아웃·끊김 등) 전부에서 `timing` 필드 자체가
    없다.
  - `writingMs`가 모델 로드 시간을 포함하지 않는다(로드에 시간이 걸리는
    대역을 주입해, `writingMs`가 `runWithTimeout()` 구간만 반영하는지
    확인).
- [X] T024 [US3] `src/inference/on-device.ts`의 `generate()`를 고친다:
  `readPhotos()` 호출 직전·직후에 `Date.now()`로 `visionMs`를 재고(호출한
  경우만), `runWithTimeout()` 호출 직전·직후에 `Date.now()`로 `writingMs`를
  잰다. 성공 시 `DiaryDraft.timing`에 담는다(T1~T4). 실패로 반환하는 모든
  경로에는 담지 않는다. T023의 테스트가 통과해야 한다.
- [X] T025 [P] [US3] `__tests__/diary/pipeline.test.ts`에 `generated.timing`
  이 있으면 `entry.timing`으로 그대로 옮겨지는지 검사하는 테스트를
  추가한다(**먼저 작성해 실패를 확인**).
- [X] T026 [P] [US3] `__tests__/ui/diary-detail.test.tsx`에 다음을 추가한다
  (**먼저 작성해 실패를 확인**) — contracts/elapsed-time.md T5~T9 근거:
  - `entry.timing`이 `visionMs`·`writingMs` 둘 다 있으면 두 문장(사진 분석
    + 글쓰기)이 모두 렌더된다.
  - `entry.timing.visionMs`가 없으면(사진 0장) 사진 분석 문장은 없고
    글쓰기 문장만 렌더된다(FR-013).
  - `entry.timing`이 아예 없으면(옛 일기) 소요 시간 문장이 전혀 렌더되지
    않는다(FR-018, 회귀 확인).
  - 로스터 5인 각각의 `entry.character`에서 문장의 조사가 올바르다(전부
    "는" — research.md §5의 한계 그대로 반영, "은" 분기는 particle.test.ts
    가 커버).
  - 렌더된 문장 어디에도 모델 식별자·"지난번보다"류 비교 표현이 없다
    (T8, 원칙 III·헌법 1.2.0).
  - `formatDuration()`이 1분 미만은 "SS초", 그 이상은 "M분 SS초"로
    포맷한다(T10).
- [X] T027 [US3] `src/ui/DiaryDetailScreen.tsx`에 소요 시간 문장 렌더링을
  추가한다: `personaOf(entry.character).name`으로 이름을 얻고,
  `topicParticleFor(name)`으로 조사를 고른 뒤, `entry.timing`이 있으면
  "이 일기가 본 것" 절 하단에 계약대로(contracts/elapsed-time.md T6) 문장을
  그린다. `formatDuration(ms): string` 헬퍼를 같은 파일 또는
  `src/diary/`에 순수 함수로 둔다(T10). T026의 테스트가 통과해야 한다.
  - **2026-08-24 사용자 실기기 피드백으로 수정**: 처음 구현은 캐릭터 문장
    ("{이름}는 이렇게 일기를 작성했어요.")을 고정 타이틀("이 일기가 본 것")
    **아래**에 추가만 해, 실기기 화면에 두 문구가 중복으로 남았다(사용자가
    "대체를 했었어야 하는데 본문에 남았다"고 지적). `SignalsTitle` 컴포넌트를
    새로 분리해 `entry.timing`이 있으면 절 제목 자리 자체가 캐릭터 문장이
    되고, 고정 타이틀은 사라지도록 고쳤다(`entry.timing`이 없는 옛 일기는
    회귀 없이 고정 타이틀 그대로). `TimingLines`에서는 중복되던 캐릭터 문장
    줄을 제거했다. contracts/elapsed-time.md에 T6a로 명시, quickstart.md
    D3·D4 문구도 함께 갱신. `diary-detail.test.tsx`에 대체·회귀 테스트 2건
    추가, 실기기(debug, R3CTB084WDP)에서 timing 있는 일기·없는 일기 둘 다
    확인(스크린샷 기준 중복 없음 확인).
  - **같은 날 두 번째 사용자 지적**: "사진: N장"(신호 목록)과 "사진을 N장을
    분석하는 데 M초가 걸렸어요"(TimingLines)도 같은 사실의 중복이었다.
    `timing.visionMs`가 있을 때만 신호 목록의 "사진" 줄을 걸러내도록
    `signalLines()` 호출부에 필터를 추가했다(`visionMs`가 없으면 — 사진
    0장·옛 일기 — "사진" 줄이 유일한 정보원이므로 그대로 남는다, 회귀 없음).
    "다닌 자리" 줄은 소요 시간 문장과 겹치지 않으므로 손대지 않았다.
    `diary-detail.test.tsx`에 두 경우(visionMs 있음 → 사라짐, 없음 → 유지)
    테스트 추가, 실기기에서 두 케이스 모두 스크린샷으로 확인.

**Checkpoint**: User Story 1·2·3 모두 독립적으로 동작한다.

---

## Phase 5: User Story 4 - 좌표 대신 장소 이름으로 읽는다 (Priority: P3)

**Goal**: 사용자가 설정을 켜면 대표 좌표가 기기 역지오코딩으로 이름이 되어
화면과 프롬프트 양쪽에 일관되게 반영된다. 기본값은 꺼짐이며, 꺼진 동안은
회귀가 없다.

**Independent Test**: 좌표가 있는 사진으로 하루를 만들고, 설정에서 장소명
기능을 켠 뒤 새 일기를 생성해 상세 화면에 장소 이름이 뜨는지 확인한다. 설정을
끈 상태에서는 기존 숫자 표시와 동일한지 확인한다(spec Independent Test 그대로).

### Tests for User Story 4

- [X] T028 [P] [US4] `__tests__/signals/geocoding-port.test.ts`를 새로
  작성한다(**먼저 작성해 실패를 확인**) — contracts/place-name.md L5 근거:
  - 좌표를 주면 이름 문자열을 돌려주는 대역에서 `{ kind: "known"; value:
    string }`을 돌려준다.
  - 빈 결과를 돌려주는 대역에서 `{ kind: "unknown" }`을 돌려준다.
  - 예외를 던지는 대역에서도 `{ kind: "unknown" }`을 돌려준다(던지지
    않는다).
- [X] T029 [US4] `src/signals/geocoding-port.ts`를 새로 만든다:
  `GeocodingPort`·`GeocodingResult` 타입과 `expoGeocodingPort()`를
  구현한다(data-model.md §8) — `expo-location`의 `reverseGeocodeAsync`를
  지연 import로 감싸고, 성공/빈 응답/예외 세 입력을 `known`/`unknown`
  두 갈래로만 접는다(research.md §3, contracts/place-name.md L5). T028의
  테스트가 통과해야 한다.
- [X] T030 [P] [US4] `__tests__/app/geocoding-setting-store.test.ts`를 새로
  작성한다(**먼저 작성해 실패를 확인**, `vision-setting-store.test.ts`와
  같은 모양) — 읽기 실패(파일 없음·깨짐) 시 꺼짐(`false`)으로 귀결되는지,
  쓰기 후 왕복이 보존되는지(data-model.md §7 L1).
- [X] T031 [US4] `src/app/geocoding-setting-store.ts`를 새로 만든다:
  `GeocodingSettingPort`·`loadGeocodingSetting`·`saveGeocodingSetting`·
  `expoGeocodingSettingPort`를 `vision-setting-store.ts`와 같은 패턴으로
  구현한다(`preferences/geocoding-setting.json`, 별도 파일). T030의
  테스트가 통과해야 한다.
- [X] T032 [P] [US4] `__tests__/diary/pipeline.test.ts`에 다음을 추가한다
  (**먼저 작성해 실패를 확인**) — contracts/place-name.md L2·L3·L4 근거:
  - 설정 꺼짐이면 좌표가 있어도 지오코딩 포트가 호출되지 않는다(대역
    스파이로 확인).
  - 좌표가 없으면(신호 `none`/`unknown`, `representativeCoordinate` 부재)
    설정이 켜져 있어도 호출되지 않는다.
  - 설정 켜짐 + 좌표 있음이면 정확히 1회만 호출된다.
  - 호출 결과가 `known`이면 `entry.placeName`과, `buildPrompt()`에 전달된
    요청 양쪽에 **같은 문자열**이 반영된다(L4 — 같은 호출 결과를 공유).
  - 호출 결과가 `unknown`이면 `entry.placeName = { kind: "unknown" }`이고
    프롬프트에는 장소 이름 문장이 추가되지 않는다.
- [X] T033 [US4] `src/diary/pipeline.ts`의 `runStages()`를 고친다: 4단계
  (요청 생성) 직후·5단계(생성) 직전에, 설정이 켜져 있고
  `signals.places`가 `known`이며 `representativeCoordinate`가 있으면
  `deps.geocoding.reverseGeocode()`를 1회 호출한다(contracts/place-name.md
  「흐름」의 순서 주의). 결과를 `request`(프롬프트가 읽을 값)와 저장할
  `placeName` 양쪽에 반영한다. `PipelineDeps`에
  `geocoding?: GeocodingPort`를 추가한다. T032의 테스트가 통과해야 한다.
- [X] T034 [US4] `src/diary/types.ts`의 `DiaryRequest`에 장소 이름을 실을
  자리(예: `placeName?: string`, 이미 `known`으로 확정된 문자열만)를
  추가하고, `src/diary/prompt.ts`의 `buildPrompt()`가 그 값이 있으면
  장소 이름을 문장에 반영하도록 고친다(원칙 II 문체 그대로 — 단정형이
  아니라 "다녀온 곳은 ○○ 근처였다" 류의 관측 서술). `src/diary/types.ts`
  의 `DiaryEntry`에 `placeName?: { kind: "known"; value: string } | {
  kind: "unknown" }`을 추가한다(data-model.md §6).
- [X] T035 [P] [US4] `__tests__/ui/diary-detail.test.tsx`에 다음을 추가한다
  (**먼저 작성해 실패를 확인**):
  - `entry.placeName`이 없으면 기존 "다닌 자리: N곳" 텍스트만 렌더된다
    (문자열이 이 기능 이전과 정확히 동일한지, 회귀 확인 L2).
  - `entry.placeName = { kind: "known", value: "..." }`이면 "대표 장소 ·
    N곳" 형태로 렌더된다(L6·L7).
  - `entry.placeName = { kind: "unknown" }`이면 이름 자리에 "모른다"류
    문구가 렌더된다(L5).
- [X] T036 [US4] `src/ui/DiaryDetailScreen.tsx`의 `signalLines()`를
  고쳐 `entry.placeName`이 있으면 "다닌 자리" 줄을 "대표 장소 · N곳"
  형태로 바꾸고, 없으면 기존 그대로 둔다(L2·L6·L7). T035의 테스트가
  통과해야 한다.

### Implementation for User Story 4 — 화면 토글·의존성 추가

- [X] T037 [US4] `npx expo install expo-location --check`로 SDK 57 호환
  버전을 추가한다(plan.md Technical Context). `package.json`에 새 의존이
  반영됐는지 확인한다.
  [2026-08-24: `npx expo install expo-location` 실행, `package.json`에
  `expo-location@~57.0.12` 반영 확인. `expo-location`과 무관한 기존 패키지
  3개(`@expo/metro-runtime`·`expo`·`expo-file-system`)의 patch 버전 드리프트가
  `--check`에서 함께 나왔으나 이 기능 범위 밖이라 건드리지 않았다.]
- [X] T038 [P] [US4] `__tests__/ui/diary-list.test.tsx`(또는 신설 토글
  전용 테스트 파일)에 장소명 설정 토글이 렌더되고, 켤 때 고지 문구가
  나타나는지 검사하는 테스트를 추가한다(**먼저 작성해 실패를 확인**,
  contracts/place-name.md L8). [2026-08-24 구현 메모: 별도 파일
  `__tests__/ui/geocoding-setting-toggle.test.tsx`로 만들었다 — 토글
  자체가 독립 컴포넌트(`GeocodingSettingToggle.tsx`)이므로.]
- [X] T039 [US4] `src/ui/DiaryListScreen.tsx`의 `VisionPicker` 인근에
  장소명 설정 토글을 추가한다(research.md §6) — 켤 때 "좌표를 기기의
  지도 서비스에 물어봅니다" 류 고지 문구를 보이고, 위치 런타임 권한을
  요청한다(research.md §3 L8). 권한이 영구 거부된 상태에서 다시 켜도
  토글 자체는 사용자가 낸 값(켜짐)을 그대로 유지하고, 앱이 임의로 다시
  끄지 않는다(L9 — 권한 대화상자가 안 떠도 토글 상태는 건드리지 않는다).
  `geocoding-setting-store.ts`(T031)로 설정을 영속화한다. T038의 테스트가
  통과해야 한다.
  [2026-08-24 부분 완료: `DiaryListScreen.tsx`에 `GeocodingSettingToggle`
  배선 완료(`onToggleGeocoding?`·`geocodingEnabled?` props, 고지 문구
  포함). **`DiaryHomeScreen.tsx`→`App.tsx`로의 props relay와 실제 위치
  런타임 권한 요청은 사용자 판단으로 보류** — `expo-location`이 아직
  `npm install`되지 않아(T037 대기 중) 권한 요청 코드를 지금 작성하면
  타입이 맞지 않는다. T037(패키지 설치) 이후 남은 배선을 마저 잇는다.]
  [2026-08-24 완료: T037 이후 나머지 배선을 마쳤다. `wiring.ts`의
  `WiringDeps`에 `geocodingEnabled?`를 더하고 `createAppPipeline()`이
  `expoGeocodingPort()`(지연 import)를 `createPipeline()`에 항상 넘기되
  `geocodingEnabled`는 호출자가 준 값을 그대로 전달한다.
  `DiaryHomeScreen.tsx`가 `onToggleGeocoding?`·`geocodingEnabled?`를 받아
  `DiaryListScreen`에 그대로 잇는다. `App.tsx`의 `DiarySection`이
  `geocoding-setting-store.ts`로 설정을 로드·저장하고, 토글을 켤 때
  `expo-location`의 `requestForegroundPermissionsAsync()`를 지연
  import로 부른다 — 요청이 실패하거나 거부돼도 `catch`로 삼키고 토글
  값은 그대로 둔다(L9, 사용자가 낸 값을 앱이 조용히 무르지 않는다).
  설정이 바뀌면 `wiring`을 다시 만들도록 `useMemo` deps에
  `geocodingEnabled`를 추가했다 — 그러지 않으면 토글이 다음 생성에
  반영되지 않는다. `npm test`(1529개) 전부 통과, `npm run lint`
  클린(eslint·tsc·헌법 검사·prettier).]
  [2026-08-24 실기기 확인(quickstart.md D1 겸함, SM-S901N/Android 16):
  토글을 켜자 시스템 `GrantPermissionsActivity`가 실제로 열렸고(logcat의
  WindowManagerShell 전이 로그로 확인), 승인 후
  `requestForegroundPermissionsAsync()`가
  `{"android":{"accuracy":"fine"},"granted":true,"status":"granted"}`를
  돌려줬다. `adb shell dumpsys package`로 `ACCESS_FINE_LOCATION`·
  `ACCESS_COARSE_LOCATION` 둘 다 `granted=true`로 전환된 것을 확인했다 —
  research.md §3이 "실기기 확인 필요"로 남겨 둔 지점(권한이 실제로
  요구되는가)이 이것으로 확정됐다. 화면의 고지 문구("좌표를 기기의 지도
  서비스에 물어봅니다.")도 토글을 켜는 즉시 정확히 나타났다. **설정
  영속화도 함께 확인**(quickstart.md D5 겸함) — 앱을 강제 종료 후
  재시작해도 토글이 "선택" 상태로 그대로 유지됐고,
  `files/preferences/geocoding-setting.json`에 `{"enabled":true}`가
  정확히 저장돼 있음을 `run-as`로 확인했다.]
- [X] T040 [US4] `npx expo prebuild --platform android --clean`을 실행하고
  서명 키를 되돌린다(`cp ~/.alpharium-signing/alpharium.jks
  android/app/`, plan.md/quickstart.md 사전 준비). `adb shell dumpsys
  package <패키지>`로 위치 권한이 매니페스트에 실제로 들어갔는지 확인한다
  (AGENTS.md 004 교훈, quickstart.md 사전 준비 5).
  [2026-08-24: `prebuild --clean` 실행 → 서명 키 복원 → debug APK 빌드·설치
  (SM-... 아님, 실기기 R3CTB084WDP) → `adb shell dumpsys package
  com.anonymous.alpharium`로 확인. `requested permissions`에
  `ACCESS_FINE_LOCATION`·`ACCESS_COARSE_LOCATION`이 실제로 들어갔다(런타임
  승인은 아직 `granted=false` — 앱에서 토글을 켜기 전이므로 정상). 새 네이티브
  모듈이므로 debug 실기기 확인 1회로 충분하다(AGENTS.md 「테스트」 절 기준) —
  release 재확인은 하지 않는다.]

**Checkpoint**: User Story 1~4 모두 독립적으로 동작한다. 설정이 꺼진
기본 상태에서는 이 기능 이전과 화면·일기 본문 모두 동일하다.

---

## Phase 6: Polish & 실기기 검증

**Purpose**: 계약 문서가 요구한 마지막 확인들.

- [X] T041 [P] `.maestro/diary-body-screen.yml`을 새로 작성하고
  `scripts/run-device-tests.mjs`의 `FLOWS`에 등록한다(등록하지 않으면
  파일이 있어도 실행기가 돌리지 않는다 — AGENTS.md 경고). quickstart.md
  D2~D6를 흐름으로 옮긴다(D3a는 사람 검수 절차라 자동화 흐름 대상이
  아니다 — T042가 별도로 다룬다).
  [2026-08-24: 사진 있는 저장된 일기를 열어 `diary-photo` testID가
  보이는지(M1), 사진 없는 저장된 일기의 소요 시간 문장(M2), 목록 화면의
  장소명 토글·고지 문구(M3)를 검사하는 흐름을 작성하고 등록했다.
  ⚠️ **작성 도중 실기기에서 실제 결함을 하나 잡았다** — vision 설정이
  켜져 있지만 그날 사진이 0장이면(`readPhotos()`가 `no-photos`로 즉시
  반환) `on-device.ts`가 `visionMs`를 여전히 재고 있어, "사진을 0장을
  분석하는 데 0초가 걸렸어요."라는 문장이 화면에 그대로 나왔다 —
  contracts/elapsed-time.md T4("사진을 0장 분석했으면 visionMs가
  없다") 위반. `__tests__/inference/on-device.test.ts`에 재현 테스트를
  먼저 추가해 실패를 확인한 뒤, `outcome.kind !== "no-photos"`일
  때만 `visionMs`를 재도록 고쳤다. `npm test`(1530개) 전부 통과,
  실기기에서 재생성해 문장이 사라진 것을 확인했다. Maestro 흐름
  전체가 COMPLETED로 통과한다.]
  [2026-08-24 회귀 확인 후속: 새 흐름 등록 후 전체 Maestro 스위트
  (`npm run test:device`)를 돌려보니 017과 무관하게 있던 흐름 다섯
  (`past-day-diary`·`photo-vision`·`today-diary`·`writing-monologue`·
  `writing-monologue-expansion`)이 함께 깨져 있었다 — 원인은 전부
  화면이 사진 설정·장소명 토글로 길어지며 기존 `scrollUntilVisible`이
  목표 지점 전에서 멈춘 것(타이틀까지만 스크롤하고 그 아래 버튼은
  아직 화면 밖). `past-day-diary.yml`에서는 추가로 012의 덮어쓰기
  확인 화면("취소"/"확인")을 이 흐름이 애초부터 처리하지 않던 기존
  결함도 함께 걸렸다(이번 세션에서 지난 하루 셋에 전부 일기를 채워
  실제로 노출됨). 각 흐름의 스크롤 대상을 실제 목표 요소로 바꾸고
  덮어쓰기 확인 처리를 추가해 다섯 모두 재실행으로 COMPLETED 확인.
  `download-conflict.yml`(`english` 텍스트로 캐릭터를 찾음)은 014의
  persona 표시 이름 변경 이후 갱신되지 않은 **017 이전부터의 기존
  결함**으로 확인돼 이 세션에서는 건드리지 않았다 — 별도 사안으로
  남긴다.
  전체 `npm run test:device` 재확인에서 같은 스크롤 회귀가
  `diary-user-path.yml`·`diary-character-select.yml`에도 있어 함께
  고쳤다(둘 다 "일기 쓰기" 버튼을 스크롤 없이 바로 찾고 있었다).
  `diary-character-select.yml`은 스크롤을 고친 뒤에도 "quiet" 같은
  내부 키 표시 이름을 찾다가 실패하는데, 이건 014 이후 늘 그랬을
  기존 결함이라 이 세션에서는 그대로 두고 주석으로 명시했다.
  `skeleton.yml`("환경"을 진단 화면에서 바로 찾음)·
  `model-acquisition.yml`("quiet")·`generate-diary.yml`("일기
  생성")은 001~005 시절 진단 화면이 첫 화면이던 구조를 그대로
  전제하고 있어 006(진단 화면을 개발자 탭으로 옮김) 이후 줄곧
  깨져 있었을 것으로 보인다 — 017과 무관하며 이 세션에서는
  건드리지 않았다. 이 셋과 `diary-character-select.yml`·
  `download-conflict.yml`을 합쳐 **다섯 개의 기존 Maestro 흐름
  결함**이 별도 사안으로 남는다(017이 만든 것은 스크롤 회귀 다섯
  건뿐이며 전부 고쳤다).]
- [X] T042 quickstart.md D1(`reverseGeocodeAsync`의 권한 요구 사실 확인)을
  실기기에서 수행하고 결과를 research.md §3에 실측으로 갱신한다(원칙
  V — 문서 기반 추정을 실측으로 바꾼다).
  [2026-08-24: T040 검증과 함께 수행했다. SM-S901N(Android 16)에서 토글을
  켜면 `requestForegroundPermissionsAsync()`가 실제로 시스템
  `GrantPermissionsActivity`를 띄우고, 승인 시 `granted:true`를 돌려주는
  것을 logcat으로 확인했다. research.md §3에 실측 결과를 반영했다.]
- [ ] T043 quickstart.md D2·D3·D3a·D4~D6를 실기기(dev 빌드)에서 수행한다:
  사진 표시(원본 삭제 후에도 유지), 사진 0장 경계, **제목 헤드라인 사람
  검수(D3a — 자동 채점 없이 여러 하루의 제목을 나란히 읽는다, TL8)**,
  소요 시간 문장, 장소명 켜짐/꺼짐/unknown, 로스터 5인 조사 확인. 관측된
  것과 관측하지 못한 것을 구분해 AGENTS.md에 결과를 기록한다(원칙 V,
  016의 T024와 같은 방식).
  [2026-08-24 부분 확인 — 관측된 것: (1) 사진 있는 하루(08-22, 3장)를
  「빠르게 봄」·「장소 이름으로 보기」 켜짐으로 실제 생성해 상세 화면에
  사진 3장이 정확히 렌더됨을 확인(D2 화면 표시 자체, Maestro
  `diary-photo` 검사와 겸함). (2) 그 과정에서 **실제 결함**을 하나
  잡았다 — 사진 0장인 하루(08-23)에서 "사진을 0장을 분석하는 데 0초가
  걸렸어요."가 화면에 그대로 나온 것(T4 위반) → `on-device.ts` 수정,
  재생성으로 사라짐 확인(D3, T041 항목 참조). (3) D3a 제목 사람 검수 —
  `TITLE_INSTRUCTION` 개선(§9) 이후 실제 생성분 둘을 읽었다: 마크다운
  기호(`#`·`**`)는 재현되지 않았으나(개선 확인), "날짜+캐릭터+장르어"
  재조합 패턴은 quiet(금동이) 캐릭터에서 남아 있다(research.md §9
  실측 항목에 상세 기록, 코드로 다시 거르지 않고 관측된 한계로 남김
  — 원칙 IV). (4) D4 소요 시간 문장이 08-22 상세 화면에서 계약된
  형태로 정확히 보임("사진을 3장을 분석하는 데 20초가 걸렸어요. 일기를
  작성하는 데 1분 2초가 걸렸어요."). (5) D5 장소명 — 실제
  `reverseGeocodeAsync()` 호출로 "중구"를 얻어 화면("대표 장소 · 중구 ·
  2곳")과 본문("중구 근처를 다녔다") 둘 다에서 같은 이름이 나오는 것을
  확인(L4 "두 개의 진실 없음" 충족).
  **관측하지 못한 것** — D2의 원본 삭제 후 유지(갤러리 앱 조작 필요),
  D3a의 로스터 전수(narrative 등 다른 캐릭터의 재조합 경향), D4의
  콜드 스타트 체감 시간과 진행 중 미노출 재확인, D5의 위치 권한 거부
  경로(unknown 귀결)와 영구 거부 뒤 토글 유지, D6 로스터 5인 조사 확인.
  이 갈래들은 시간 제약으로 이번 세션에 다루지 못했다 — 건너뛴 것은
  통과가 아니다(원칙 V).]
- [X] T044 [P] `npm test` 전체(기기 불필요 스위트)와 `npm run lint`를
  돌려 기존 계약 테스트가 전부 그대로 통과하는지 최종 확인한다(옵셔널
  확장이 기존 계약을 깨지 않았는지의 최종 게이트) — `acceptance.test.ts`
  가 여전히 4갈래만 세는지 포함(TL1 최종 재확인).
  [2026-08-24: `npm test` 76개 스위트 1529개 테스트 전부 통과.
  `npm run lint`(eslint·tsc·헌법 검사·prettier) 클린 — 기존 무관 경고
  2건(require-imports) 제외.]
- [ ] T045 [P] 위반 주입으로 헌법 검사·계약을 재확인한다(개발 방식 관례):
  소요 시간 문장에 임시로 밀리초를 이어붙이거나 두 일기를 비교하는 코드를
  넣어 코드 리뷰/테스트가 잡는지 확인한 뒤 되돌린다(contracts/
  elapsed-time.md 「위반 주입」).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: 의존성 없음 — 즉시 시작. US1·US3·US4가 이
  phase를 막는다(BLOCKS). US2는 막지 않는다(독립). 내부 순서: 캡션 사본
  경로(T001~T002)·대표 좌표(T003~T004)·은는 조사(T005~T006)는 서로 다른
  파일이라 완전히 병렬 가능. T007(주석 개정)은 독립적으로 아무 때나.
- **User Story 1 (Phase 2)**: Foundational 완료 후 시작. 다른 스토리에
  의존하지 않는다. 🎯 MVP.
- **User Story 2 (Phase 3)**: **Foundational 완료를 기다릴 필요가 없다** —
  `prompt.ts` 한 파일만 건드리고 다른 어떤 phase의 산출물도 쓰지 않는다.
  다만 문서상 순서는 US1 다음에 둔다(US1이 이 저장소의 옵셔널 확장 패턴을
  먼저 확립하므로 읽기 순서상 자연스럽다) — 실제로는 Phase 1과 병행
  가능.
- **User Story 3 (Phase 4)**: Foundational 완료 후 시작 가능. US1과 파일
  일부(`on-device.ts`의 `generate()`, `pipeline.ts`의 6단계,
  `DiaryDetailScreen.tsx`)가 겹치므로 **US1 완료 후 진행을 권장**한다
  (병합 충돌 최소화).
- **User Story 4 (Phase 5)**: Foundational 완료 후 시작 가능. `pipeline.ts`
  의 4~5단계 사이 삽입(T033)이 US1·US3가 손댄 6단계와 다른 지점이라
  파일 충돌은 적지만, `DiaryDetailScreen.tsx`의 `signalLines()`를
  같이 건드리므로(US1의 사진 렌더링과 US4의 장소명 렌더링) **US1·US3
  완료 후 진행을 권장**한다. 새 네이티브 의존(`expo-location`)과 새
  권한이 있어 넷 중 검증 범위가 가장 넓다.
- **Polish (Phase 6)**: 네 User Story 완료 후.

### Within Each Phase

- 테스트를 먼저 작성해 실패를 확인한 뒤 구현 태스크를 완성한다(AGENTS.md
  「개발 방식」).
- `[P]` 표시가 없는 태스크는 같은 파일을 건드리거나 앞 태스크의 산출물에
  의존하므로 순서대로 진행한다.

### Parallel Opportunities

- Phase 1에서 T001~T002(vision/types.ts), T003~T004(signals/places.ts),
  T005~T006(diary/particle.ts)는 서로 다른 파일이므로 세 축 모두 완전히
  병렬 가능. T007은 어느 것과도 파일이 겹치지 않는다.
- **Phase 3(US2, 제목)은 Phase 1(Foundational)과도 완전히 병렬 가능하다**
  — `prompt.ts`는 어느 Foundational 태스크와도 파일이 겹치지 않는다.
  시간이 촉박하면 가장 먼저 처리해도 된다(가장 가벼운 스토리).
- Phase 2에서 T008(caption.test.ts)·T010(on-device.test.ts)·
  T011(pipeline.test.ts)·T017(store.test.ts)·T018(diary-detail.test.tsx)
  은 서로 다른 파일이므로 테스트 작성은 병렬 가능. 구현(T009→T013→T015→
  T016→T019)은 캡션→어댑터→파이프라인→저장→화면 순서를 지킨다(값이
  위로 전파되는 방향과 같다).
- Phase 4에서 T023·T025·T026은 서로 다른 파일이므로 병렬 작성 가능.
  구현(T024→T027)은 순서를 지킨다.
- Phase 5에서 T028·T030·T032·T035는 서로 다른 파일이므로 병렬 작성
  가능. T029와 T031은 완전히 독립된 신규 파일이라 병렬 구현 가능.
  T033(pipeline.ts)은 T034(types.ts·prompt.ts)에 의존하므로 순서 주의.
- Phase 6의 T041·T042·T044·T045는 서로 다른 관심사이므로 병렬 가능
  (T043은 D1 결과 문서화가 끝난 뒤가 자연스러워 T042 이후 권장).

---

## Parallel Example: Foundational + User Story 2 (동시 착수)

```bash
# Foundational 세 축과 US2(제목)는 파일이 전혀 겹치지 않는다 — 네 갈래 동시 시작 가능:
Task: "PhotoCaption.resizedPath 계약 테스트 (__tests__/vision/types.test.ts)"
Task: "PlaceTrace.representativeCoordinate 계약 테스트 (__tests__/signals/places.test.ts)"
Task: "topicParticleFor 계약 테스트 (__tests__/diary/particle.test.ts)"
Task: "TITLE_INSTRUCTION 계약 테스트 (__tests__/diary/prompt.test.ts)"
```

## Parallel Example: User Story 1 테스트 작성

```bash
Task: "caption.ts 지연 삭제 테스트 (__tests__/vision/caption.test.ts)"
Task: "on-device.ts usedPhotos 테스트 (__tests__/inference/on-device.test.ts)"
Task: "pipeline.ts 사진 보존 판정 테스트 (__tests__/diary/pipeline.test.ts)"
Task: "DiaryDetailScreen 사진 렌더링 테스트 (__tests__/ui/diary-detail.test.tsx)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1(Foundational) 완료 — 캡션 사본 경로·대표 좌표·은는 조사 준비.
2. Phase 2(User Story 1) 완료 — 본문에서 실제로 사진이 보이고, 원본 삭제
   에도 살아남는다.
3. **여기서 멈추고 검증**: quickstart D2·D3를 실기기에서 수행한다.
4. 이 시점에 이미 사용자 요구사항의 첫 항목("일기에 쓰인 사진을 본문에
   보여준다")이 채워진 배포 가능한 증분이다.

### Incremental Delivery

1. Foundational(+ 병행 가능한 US2) → User Story 1 → 실기기 확인(D2·D3) →
   배포 가능한 MVP.
2. User Story 2(제목) → 사람 검수(D3a) → 완료(가장 가벼우므로 실제로는
   1번과 병행해도 무방).
3. User Story 3(소요 시간) → 실기기 확인(D4·D6) → 완료.
4. User Story 4(장소명) → `expo-location` 추가·prebuild·실기기 확인
   (D1·D5) → 완료.
5. Polish(Maestro 등록, 최종 회귀 테스트, 위반 주입 재확인).

---

## Notes

- `[P]` 태스크 = 다른 파일, 의존성 없음.
- `[Story]` 라벨이 태스크를 User Story에 연결한다(추적성).
- 각 구현 태스크 앞의 테스트 태스크는 반드시 먼저 실패를 확인한다
  (AGENTS.md 「개발 방식」).
- **캡션 계층은 스스로 삭제 여부를 최종 결정하지 않는다**(T009·T013·T015)
  — `vision/`이 `diary/store`를 몰라야 하는 경계(AGENTS.md)를 지키려면
  정보만 위로 올리고, 최종 판정은 저장 결과를 아는 `pipeline.ts`가 한다
  (research.md §1).
- **대표 좌표는 새로 재는 값이 아니다**(T004) — `tracePlaces()`가 이미
  계산하던 값을 반환 범위 밖으로 낼 뿐, 체류 시간 등 새 축을 측정하는
  코드를 추가하지 않는다(원칙 IV).
- **제목·본문 서두 품질은 코드가 채점하지 않는다**(T020·T021) — 지시문
  텍스트 자체만 계약 테스트로 검사하고, 실제 생성물의 품질(재조합 여부·
  마크다운 잔존·부제목 여부)은 사람이 실기기에서 읽는다(TL6~TL8). "재조합
  패턴 탐지기"·"마크다운 탐지기"류 코드를 어느 태스크에서도 만들지 않는다.
- **제목·본문 서두 보강은 `judge()`의 4갈래를 늘리지 않는다**(T022) —
  형식(한 줄·40자 이하)을 못 지키면 지금처럼 제목 없이 본문 전체로
  저장되는 기존 동작을 그대로 유지한다.
- **"빈 줄" 문제는 되뱉기 판정을 조이는 것이 아니라 지시문에서 그 낱말을
  없애는 것으로 고친다**(T021) — 짧은 되뱉음을 잡도록 `isEcho()`의 임계값을
  조정하는 방향은 채택하지 않는다(오탐 위험, research.md §9).
- **소요 시간은 `on-device.ts`의 두 지점에서만 잰다**(T024) — 네이티브
  `timings`는 여전히 `llama-port.ts` 경계에서 버려진다. 다른 파일에서
  `Date.now()`로 생성 시간을 재는 코드를 추가하지 않는다.
- **화면과 프롬프트는 같은 지오코딩 호출 결과를 공유한다**(T033·T034) —
  화면이 별도로 다시 지오코딩을 부르지 않는다("두 개의 진실" 금지, L4).
- **장소명 설정이 꺼진 동안은 이 기능 이전과 완전히 동일해야 한다**(T032·
  T035·T036) — 회귀 테스트가 문자열 수준까지 확인한다.
- **은/는 조사 테스트는 로스터만으로 부족하다**(T005·T026) — 다섯 이름이
  전부 받침 없이 끝나므로, 받침 있는 합성 이름이 없으면 "은" 분기가
  죽은 코드로 남는다(research.md §5).
- **`DiaryDraft`·`GenerationFailure`의 필드 경계는 타입으로 방어한다**
  (T012) — 실패 갈래에 `timing`·`usedPhotos`가 물리적으로 들어갈 자리를
  만들지 않는다(002·005가 이미 세운 「자리가 없으면 담을 수 없다」 패턴).
