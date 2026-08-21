---
description: "Task list for 008 — 내려받기 충돌을 사용자에게 알린다"
---

# Tasks: 내려받기 충돌을 사용자에게 알린다

**Input**: Design documents from `/specs/008-download-conflict-feedback/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: **필수다.** 헌법 「개발 방식」이 "계약을 먼저 정하고 테스트를 먼저 쓴다"를
MUST로 정했다. 각 스토리의 테스트를 **먼저 쓰고 실패를 확인한 뒤** 구현한다.

**Organization**: 스토리별로 묶어 각각 독립적으로 구현·검증·중단할 수 있게 한다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (서로 다른 파일, 미완 작업에 의존하지 않음)
- **[Story]**: US1~US3 — spec.md의 사용자 스토리
- 파일 경로를 반드시 적는다

## Path Conventions

이 저장소는 **단일 Expo 프로젝트**다. 소스는 `src/`, 테스트는 `__tests__/`,
실기기 흐름은 `.maestro/`에 둔다(plan.md의 구조 결정).

## ⚠️ 이 기능이 손대지 않는 것

- **[src/models/acquisition.ts](../../src/models/acquisition.ts)** — `busy` 판정도
  자리 잡기도 멈춤·이어받기도 이미 옳고 테스트가 두껍다(A15·A16·A17). **고칠 자리는
  그것을 부르는 쪽이다.**
- **`DownloadProgress`·`DownloadFailure`** — 003이 세운 불변식이 이 기능의 방어선이다.
  `busyWith`가 이미 캐릭터로 실려 있어 FR-002의 재료가 준비돼 있다.
- **동시 내려받기 금지(003 FR-020)** — 유지한다(FR-015). 열려면 003 계약을 먼저 고친다.

---

## Phase 1: Setup

**Purpose**: 008은 새 의존도 새 폴더도 만들지 않는다. 시작 전에 기준선만 확인한다.

- [X] T001 현재 기준선을 확인한다 — `npm test`와 `npm run lint`가 통과하는 것을 보고 시작한다. **실패가 있으면 008이 만든 것이 아니므로 먼저 가른다**
- [X] T002 [P] [src/models/expo-port.ts:235](../../src/models/expo-port.ts#L235)의 `expoModelPorts()`가 **클로저 객체만 만들고 기기 통로를 열지 않는 것**을 눈으로 확인한다 — [data-model.md](data-model.md) 「소유 관계」의 근거이며, 이것이 참이어야 `AppFrame`으로 올려도 안전하다

**⚠️ 새 패키지를 설치하지 않는다**(plan.md Technical Context). `npm install`이 필요하면
그 시점에 설계가 틀린 것이다.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 판정 규칙과 타입. **세 스토리가 전부 여기에 막힌다.**

**⚠️ CRITICAL**: 이 단계가 끝나기 전에는 어떤 스토리도 화면에 닿지 않는다.

### 타입 (data-model.md)

- [X] T003 [src/models/types.ts](../../src/models/types.ts)에 `DownloadRejection`을 더한다 — **`requested`와 `busyWith` 둘뿐이다.** 시각·까닭·횟수를 담지 않는다([data-model.md](data-model.md) 「새로 만드는 것」 1)
- [X] T004 [src/models/types.ts](../../src/models/types.ts)에 `DownloadView`를 더한다 — `active`와 `notice` 둘뿐이며 **`notice`는 배열이 아니다**(FR-006이 타입으로 막힌다)

### 판정 규칙 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T005 [P] `__tests__/models/download-view.test.ts`를 새로 만들어 [contracts/download-view.md](contracts/download-view.md) 「판정 순서」 **5줄**과 **불변식 I1~I4**를 테스트로 옮긴다. **실패를 확인한다**
- [X] T006 [P] `__tests__/models/download-view.test.ts`에 **선언을 직접 읽어** `DownloadView`에 시간·속도·바이트 필드가 없는 것을 검사하는 테스트를 더한다(I5) — **007에서 `npm test`가 타입 위반을 놓쳤고 잡은 것은 `tsc`뿐이었다.** [state.test.ts:453](../../__tests__/app/state.test.ts#L453)의 `readFileSync` + 정규식 패턴을 그대로 베낀다
- [X] T007 [src/models/download-view.ts](../../src/models/download-view.ts)를 새로 만들어 `resolveDownloadView(active, rejection)`을 구현한다 — **순수 함수만 둔다.** 포트도 부수효과도 없다 (T005·T006을 통과시킨다)

**★ T007의 핵심은 「거부가 아직 참인가」다.** 「quiet을 받는 중이라 거부했다」는 quiet이
끝나는 순간 **거짓이 된다.** 안내를 지우는 코드를 따로 두지 않고 **판정이 매번 다시
물어서** 자동으로 사라지게 한다 — `useEffect`로 지우면 타이밍 버그가 들어오고 그 버그는
기기에서만 보인다([research.md](research.md) §3).

**Checkpoint A**: 판정 규칙 전체가 기기 없이 검증된다. **화면은 아직 아무것도 모른다.**

---

## Phase 3: User Story 1 - 거부되었다는 것을 안다 (Priority: P1) 🎯 MVP

**Goal**: 받는 중에 다른 캐릭터를 누른 사용자가 **거부 사실·까닭·빠져나갈 길**을
화면에서 읽는다. **지금은 화면이 침묵한다.**

**Independent Test**: 받는 중에 다른 캐릭터를 눌러 화면에 거부 안내와 받는 중인
캐릭터 이름이 뜨는지 본다([quickstart.md](quickstart.md) F1).

### Tests for User Story 1 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T008 [P] [US1] `__tests__/ui/character-list.test.tsx`를 **새로 만들어** [contracts/download-view.md](contracts/download-view.md) 검증 표 **V10·V11·V12·V13**을 옮긴다 — 안내에 `busyWith` 이름이 있고, 「멈추면 된다」가 있고, 닫을 수 있고, **거부당한 줄이 평소대로다**
- [X] T009 [P] [US1] `__tests__/ui/character-list.test.tsx`에 **V14**(화면에 모델 정보 0건)를 더한다 — 크기·주소·자산키·모델 식별자·양자화가 하나도 없다(FR-004, SC-004)

**⚠️ 이 화면에 device-free 테스트가 지금 하나도 없다**(2026-08-21 확인). `__tests__/ui/`에
파일이 없고 [boundaries.test.ts:51](../../__tests__/models/boundaries.test.ts#L51)이 소스
문자열만 훑는다. **T008이 그 그물을 처음 세운다.**

**⚠️ `await render(...)`를 쓴다** — `@testing-library/react-native` 14의 `render`는
Promise를 반환하며, `await` 없이 쓰면 `screen`이 비고 오류 문구가 원인을 가리키지
않는다(AGENTS.md 실측).

### Implementation for User Story 1

- [X] T010 [US1] [src/ui/CharacterListScreen.tsx](../../src/ui/CharacterListScreen.tsx)의 props를 `progress: DownloadProgress | null`에서 **`view: DownloadView`**로 바꾸고 `onDismissNotice`를 더한다([contracts/download-view.md](contracts/download-view.md) 계약 2)
- [X] T011 [US1] [src/ui/CharacterListScreen.tsx](../../src/ui/CharacterListScreen.tsx)에 거부 안내를 그린다 — **목록 위에 하나**, `busyWith` 이름과 「멈추면 된다」와 닫는 길을 담는다(FR-001·002·003·005·006)
- [X] T012 [US1] [src/ui/CharacterListScreen.tsx](../../src/ui/CharacterListScreen.tsx)에서 **거부당한 줄이 특별해지지 않게** 한다 — `notice.requested`인 줄도 평소대로 「받아야 함」 + 「준비하기」다(FR-007·010). **거부는 그 캐릭터의 상태를 바꾸지 않았다**
- [X] T013 [US1] [App.tsx](../../App.tsx)의 `onPrepare`가 **`prepare()`의 반환값을 받아** `busy` 실패를 거부 통지로 옮긴다([contracts/download-view.md](contracts/download-view.md) 계약 C3-1) — **지금은 `await`만 하고 값을 버린다. 이 한 줄이 버그 ①의 전부다**
- [X] T014 [US1] `App.tsx`가 `resolveDownloadView()`를 불러 `view`를 만들어 내린다 — **화면에서 판정하지 않는다**(research §3)
- [X] T015 [US1] [boundaries.test.ts:51](../../__tests__/models/boundaries.test.ts#L51)의 `CharacterListProps` 슬라이스를 고친다 — **`code.indexOf("function statusText")`로 잘라 내고 있어 T010의 props 변경으로 깨진다.** 경계 검사 자체는 그대로 살린다

**⚠️ T015를 빠뜨리면 기존 테스트가 조용히 엉뚱한 범위를 검사하게 된다** — 실패하지
않고 통과하면서 방어만 사라지는 종류의 결함이다.

**Checkpoint**: 거부가 사용자에게 닿는다. **다만 아직 갇힐 수 있다** — 멈추기 버튼이
사라지는 것은 US2의 몫이다. **US1만으로는 배포하지 않는다**(아래 참조).

---

## Phase 4: User Story 2 - 받는 중인 것이 사라지지 않는다 (Priority: P1)

**Goal**: 다른 캐릭터를 눌러도 **받던 것의 진행률과 멈추기 버튼이 그대로 남는다.**
**003 FR-020a가 약속한 「멈추면 새 요청이 통한다」가 화면에서 처음으로 실행 가능해진다.**

**Independent Test**: 받는 중에 다른 캐릭터를 누른 뒤 받던 줄에 진행률과 멈추기가
남아 있는지 보고, 멈춘 뒤 재요청이 통하는지 확인한다([quickstart.md](quickstart.md) F2·F3).

### Tests for User Story 2 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T016 [P] [US2] `__tests__/ui/character-list.test.tsx`에 **V8·V9**를 더한다 — 진행률이 보이고, **거부 뒤에도 멈추기 버튼이 있다**(FR-008·009)
- [X] T017 [P] [US2] `__tests__/ui/character-list.test.tsx`에 **V15**를 더한다 — 백분율이 `null`이면 「받는 중…」이고 **숫자를 지어내지 않는다**(FR-017, 원칙 V)
- [X] T018 [P] [US2] `__tests__/models/download-view.test.ts`에 **V1**을 못 박는 테스트를 더한다 — **거부가 `active`를 절대 지우지 않는다**(I1). 이것이 버그 ②의 판정 쪽 방어다

### Implementation for User Story 2

- [X] T019 [US2] [App.tsx](../../App.tsx)의 `onPrepare`가 **자기 요청의 결과로만 진행 표시를 거두게** 한다 — `busy` 거부면 **건드리지 않고**, 그 외(완료·멈춤·실패)면 거둔다([contracts/download-view.md](contracts/download-view.md) 계약 C3-2)

**★ T019가 버그 ②가 고쳐지는 자리다.** 지금은 갈래 없이 `setProgress(null)`을 부르고,
`busy` 거부는 즉시 반환되므로 **받던 것의 진행률이 곧바로 지워진다.** 그러면
[CharacterListScreen.tsx:104](../../src/ui/CharacterListScreen.tsx#L104)의 `busy` 판정이
거짓이 되어 **멈추기 버튼이 함께 사라지고 사용자가 갇힌다.**

- [X] T020 [US2] [src/ui/CharacterListScreen.tsx](../../src/ui/CharacterListScreen.tsx)가 `view.active`로 어느 줄이 받는 중인지 가른다 — **`view.notice`는 이 판정에 관여하지 않는다**(FR-010)
- [X] T021 [US2] [src/ui/CharacterListScreen.tsx](../../src/ui/CharacterListScreen.tsx)의 멈추기 버튼이 **`view.active`인 줄에만** 있게 한다 — 무엇이 멈추는지 사용자에게 분명해야 한다(FR-011, 계약 C3-4)
- [X] T022 [US2] [App.tsx](../../App.tsx)에서 받던 것이 끝나거나 멈추거나 실패하면 **거부 안내가 함께 사라지는 것**을 확인한다 — T007의 판정이 이미 그렇게 하므로 **배선이 `active`를 제때 비우기만 하면 된다**(FR-005·012)

**Checkpoint**: **US1 + US2가 이 기능의 최소 배포 단위다.** 거부를 알리고, 빠져나갈 수
있다. 둘 중 하나만으로는 배포하지 않는다 — 아래 「MVP 범위」 참조.

---

## Phase 5: User Story 3 - 화면을 오가도 받는 중인 것이 보인다 (Priority: P2)

**Goal**: 탭을 떠났다 돌아와도 진행 표시가 남고, 떠난 동안에도 내려받기가 이어진다.

**Independent Test**: 받는 중에 일기 탭에 갔다 돌아와 진행률과 멈추기가 보이고
**진척이 늘어 있는지** 확인한다([quickstart.md](quickstart.md) F4).

### ★ research §2가 찾은 셋째 결함

**spec을 쓸 때 몰랐던 것이다.** [App.tsx:88-94](../../App.tsx#L88-L94)가 탭을 삼항
연산자로 가르므로 탭을 옮기면 `ModelSection`이 언마운트되고,
[App.tsx:236](../../App.tsx#L236)의 **`Acquisition` 인스턴스가 그와 함께 사라진다** —
`running`도 `handle`도 죽는다. 돌아오면 `busyWith()`가 `null`이고 **받던 것을 멈출
방법이 없다.**

**그래서 FR-013·FR-014는 「깨지 않기」가 아니라 「고치기」다.**

### Tests for User Story 3 ⚠️ 먼저 쓰고 실패를 확인한다

- [X] T023 [P] [US3] `__tests__/ui/character-list.test.tsx`에 **되찾은 진행 상태**(백분율 없이 `fraction: null`)가 「받는 중…」 + 멈추기로 그려지는 것을 검사하는 테스트를 더한다(FR-013, research §5)

### Implementation for User Story 3

- [X] T024 [US3] [App.tsx](../../App.tsx)의 `ModelPorts`와 `Acquisition`을 **`ModelSection`에서 `AppFrame`으로 올린다** — 탭 상태를 가진 컴포넌트이며 **탭이 바뀌어도 언마운트되지 않는다**(계약 C3-3)
- [X] T025 [US3] `App.tsx`의 진행 상태(`DownloadProgress`)와 거부 통지(`DownloadRejection`)도 **`AppFrame`으로 올린다** — 그래야 백분율이 탭 왕복을 넘어 산다([data-model.md](data-model.md) 「소유 관계」)
- [X] T026 [US3] [App.tsx](../../App.tsx)의 `ModelSection`이 넷을 props로 받게 고친다. **`readiness`는 올리지 않는다** — 화면에 들어올 때 다시 읽으면 되는 것이며 오래된 값을 들고 있을 이유가 없다
- [X] T027 [US3] [App.tsx](../../App.tsx)에서 **지연 생성(`useState(() => …)`)을 유지한다** — 모듈 수준 싱글턴으로 바꾸면 모듈 로드 시점에 `expoModelPorts()`가 불려 **기기 통로가 없는 환경에서 터진다**(research §2)
- [X] T028 [US3] [App.tsx](../../App.tsx)의 `ModelSection`이 다시 뜰 때 `acquisition.busyWith()`로 받는 중인 것을 되찾는다 — **백분율은 `null`로 시작하고 다음 콜백에서 붙는다.** 모르는 숫자를 지어내지 않는다(FR-017)

**Checkpoint**: 탭을 오가도 잃지 않는다.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: 방어를 굳히고 실기기에서 확인한다. **여기를 건너뛰면 초록불인데 아무것도
검증되지 않은 상태가 된다**(원칙 V).

### 방어 굳히기

- [X] T029 [P] `__tests__/models/download-view.test.ts`에 **V21**을 더한다 — `active`가 언제나 최대 하나이며 003 FR-020이 유지된다(FR-015, SC-008)
- [X] T030 [P] [quickstart.md](quickstart.md)의 **위반 주입 4가지**를 실제로 해 본다 — `DownloadView`에 `elapsedMs`를 넣으면 **T006이 실패해야 한다.** 실패하지 않으면 방어가 없는 것이다. **주입한 것은 반드시 되돌린다**
- [X] T031 [P] `npm run lint`로 **`tsc`가 도는 것**을 확인한다 — 007에서 `npm test`만으로는 타입 위반이 잡히지 않았다

### 실기기 검증 (건너뛴 것은 통과가 아니다)

> **✅ release 실기기에서 F1~F4를 손으로 확인했다** (2026-08-21, SM-G986N,
> versionCode=4, `CN=alpharium`).
>
> **덮어 설치가 됐고 일기·모델·사진 권한이 전부 살아남았다** — 서명이 같아서다.
> Metro를 끄고 `adb reverse`를 지운 채 뜨며 진단 화면이 없다(prod).
>
> - **F1 통과** — 「imaginative을(를) 받는 중이라 지금은 받을 수 없다. imaginative을(를)
>   멈추면 받을 수 있다.」 거부·받는 중인 캐릭터·**빠져나갈 길**이 다 있다.
> - **★ F2 통과 (버그 ②)** — 거부당한 뒤에도 `imaginative`의 진행률이 **4%→29%로 계속
>   올랐고 「멈추기」도 그대로였다.** `chinese`는 「받아야 함」으로 평소 그대로다.
> - **★ F3 통과 (003 FR-020a의 첫 화면 검증)** — 멈추니 「받다 멈춤 — 이어받을 수
>   있음」이 되고 **안내가 스스로 사라졌다.** 이어서 `chinese`를 누르니 **거부되지 않고
>   6%로 받기 시작했다.**
> - **★ F4 통과 (셋째 결함)** — 탭을 왕복하니 `chinese`가 **6%→50%**였다. 탭 밖에서
>   내려받기가 **실제로 이어졌고** 진행률·멈추기가 돌아왔다.
>
> **⚠️ 이미 준비된 캐릭터로는 검증할 수 없다** — 「쓸 수 있음」인 줄의 버튼은
> 「지우기」다. `quiet`·`narrative`가 이미 준비돼 있어 **`imaginative`·`chinese`로 했다.**

**⚠️ 두 버그 모두 「받는 중일 때만」 나타난다.** 그래서 **실제 내려받기가 필요하며**,
기기 없는 테스트가 전부 초록불이어도 아무것도 검증되지 않은 것일 수 있다.
**`quiet`을 쓴다** — 006·007에서 실기기 내려받기가 확인된 캐릭터다.

- [X] T032 `.maestro/model-acquisition.yml`에 **거부·진행 유지·탭 왕복** 흐름을 더한다 — [quickstart.md](quickstart.md) F1·F2·F4에 대응(V16·V17·V19)
- [X] T033 새 흐름을 **`scripts/run-device-tests.mjs`의 `FLOWS`에 등록한다** — 등록하지 않으면 파일이 있어도 돌지 않고, 그러면 초록불인데 아무것도 검증되지 않는다
- [X] T034 debug 빌드 실기기에서 [quickstart.md](quickstart.md) **F1~F8을 전부** 확인한다 — 특히 **F2**(★ 버그 ②의 검증)와 **F3**(★ 003 FR-020a의 첫 화면 검증)
- [X] T035 **F4의 관측 결과를** [AGENTS.md](../../AGENTS.md)**에 기록한다** — 탭 밖에서 네이티브 전송이 실제로 이어지는지는 **미해결이었다**(research 「미해결로 남기는 것」). 진척이 늘지 않았다면 **관측한 대로 적고 FR-014를 다시 본다**(원칙 V — 짐작으로 메우지 않는다)
- [X] T036 `npm run test:device`가 PASSED인 것을 확인한다 — **SKIPPED가 나오면 통과가 아니다.** 손으로 확인하고 기록한다
- [X] T037 release 빌드로 [quickstart.md](quickstart.md) **F9**를 확인한다 — 서명이 `CN=alpharium`이고, **거부 안내와 진행 유지가 R8·ProGuard에서 살아남는지**(V22)
- [X] T038 검증용으로 받은 모델을 지운다 — **⚠️ 지울 수 없었다.** 003의 「지우기」는 **`ready`인 줄에만** 있고(`CharacterListScreen`의 `actionLabel`), 받다 만 것은 「이어받기」/「다시 받기」다. release라 `run-as`도 막힌다. **받다 만 셋(`imaginative`·`chinese`·`english`)이 기기에 남아 있으며 앱에서 지울 길이 없다** — 008이 만든 결함이 아니라 003의 빈자리다. 기기 여유가 175GB라 해는 없다
- [X] T039 [AGENTS.md](../../AGENTS.md)에 008의 실측을 기록한다 — **셋째 결함(탭 언마운트)**, F4의 답, 새로 관측된 값. **짐작과 실측을 갈라 적는다**(원칙 V)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존 없음
- **Foundational (Phase 2)**: Setup 뒤. **US1·US2·US3 전부를 막는다**
- **US1 (Phase 3)**: Foundational 뒤
- **US2 (Phase 4)**: Foundational 뒤. **US1과 같은 파일을 만지므로 순서대로 간다**
- **US3 (Phase 5)**: Foundational 뒤. US1·US2와 독립적으로 검증되나 `App.tsx`를 공유한다
- **Polish (Phase 6)**: 원하는 스토리가 전부 끝난 뒤

### 스토리 사이의 의존

- **US1(P1)**: Foundational 뒤 단독으로 구현·검증 가능
- **US2(P1)**: Foundational 뒤 단독으로 구현·검증 가능. **다만 US1 없이 배포하지 않는다**
- **US3(P2)**: Foundational 뒤 단독으로 구현·검증 가능

**⚠️ US1과 US2는 독립적으로 테스트되나 함께 배포된다.** US1만 있으면 「멈추면
됩니다」라고 안내하는데 **멈출 버튼이 사라져 있어 거짓말이 된다.** US2만 있으면
진행 표시는 남지만 **왜 안 눌리는지 알 수 없다.** 스토리의 독립성은 구현·검증의
단위이지 배포의 단위가 아니다.

### 파일 충돌 (같은 파일을 만지는 작업은 [P]가 아니다)

| 파일 | 만지는 작업 |
| --- | --- |
| `App.tsx` | T013·T014(US1), T019(US2), T024~T028(US3) |
| `CharacterListScreen.tsx` | T010·T011·T012(US1), T020·T021(US2) |
| `types.ts` | T003·T004 |
| `download-view.test.ts` | T005·T006, T018, T029 |
| `character-list.test.tsx` | T008·T009, T016·T017, T023 |

**같은 파일이므로 [P]를 붙이지 않았다.** 테스트 파일도 마찬가지다 — 서로 다른 스토리의
테스트라도 같은 파일에 들어가면 병렬로 쓸 수 없다.

### Parallel Opportunities

- **Phase 1**: T002가 [P]
- **Phase 2**: T005·T006이 [P] (같은 파일이나 **T007보다 먼저 둘 다 실패해야 하므로**
  한 번에 쓴다)
- **Phase 3**: T008·T009가 [P]
- **Phase 4**: T016·T017·T018이 [P] (T018만 다른 파일)
- **Phase 6**: T029·T030·T031이 [P]

---

## Parallel Example: Phase 2 Foundational

```bash
# 판정 테스트를 함께 쓴다 (T007보다 먼저 전부 실패해야 한다):
Task: "판정 순서 5줄 + 불변식 I1~I4를 __tests__/models/download-view.test.ts에"
Task: "선언을 직접 읽어 시간·바이트 필드가 없는 것을 검사(I5)"

# 그 뒤에 구현 하나:
Task: "src/models/download-view.ts에 resolveDownloadView() 구현"
```

---

## Implementation Strategy

### MVP 범위 — **US1 + US2** (둘 다 P1)

1. Phase 1: Setup
2. Phase 2: Foundational (**전부를 막는다**)
3. Phase 3: US1 — 거부가 보인다
4. Phase 4: US2 — 받던 것이 사라지지 않는다
5. **멈추고 검증**: [quickstart.md](quickstart.md) F1~F3을 실기기에서
6. 배포할 만하다

**★ US1 하나를 MVP로 삼지 않는다.** 두 스토리가 함께 있어야 사용자가 갇히지 않으며,
그것이 이 기능의 목적 전체다(spec US2 「Why this priority」).

### 점진적 배포

1. Setup + Foundational → 판정 규칙이 기기 없이 검증된다
2. **US1 + US2** → 실기기 F1~F3 → **배포(MVP)**
3. US3 → 실기기 F4 → 배포
4. Polish → release 확인(F9) → 기록(T039)

### 중단해도 되는 자리

- **Checkpoint A 뒤**: 판정만 있고 화면은 그대로다. 되돌리기 쉽다
- **US2 뒤**: 두 버그가 고쳐졌다. US3는 별개의 결함이다

---

## Notes

- **[P]는 서로 다른 파일이고 미완 작업에 의존하지 않는 것만** — 위 충돌 표를 본다
- 커밋 메시지는 **한국어**로 쓴다(헌법 「개발 방식」)
- **테스트가 실패하는 것을 먼저 확인한다** — 통과하면 그 테스트가 아무것도 검사하지
  않는 것이다
- **`npm test`와 `npm run lint`를 둘 다 돌린다** — `tsc`는 후자에 있고, 007에서
  타입 위반을 잡은 것은 그것뿐이었다
- **건너뛴 실기기 검증은 통과가 아니다**(원칙 V)
