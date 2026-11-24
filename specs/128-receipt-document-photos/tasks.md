# Tasks: 영수증·문서 사진 거르기 (128)

**Input**: [plan.md](plan.md) · [spec.md](spec.md) · [contracts/detection.md](contracts/detection.md) · [data-model.md](data-model.md)
**Tests**: 필수 — 프로젝트 규칙(TDD, 「계약을 먼저 정하고 테스트를 먼저 쓴다」).

## Phase 1: Setup

- [ ] T001 임시 관찰 줄(`console.log("[probe-caption] …")`)을 src/vision/caption.ts에서 걷어낸다(원인 가름용, 커밋 금지)

## Phase 2: Foundational (모든 이야기의 전제)

- [ ] T002 [P] `PhotoFacts`에 `filename?: string`·`width?: number`·`height?: number`를 더하고 「모르면 없음(`null`→`undefined`)」을 주석으로 적는다 — src/signals/port.ts
- [ ] T003 [P] `Photo`에 같은 세 필드를 더한다 — src/signals/types.ts
- [ ] T004 실패 테스트 먼저: `photosBetween()`이 메타데이터의 filename·width·height를 싣고 `null`은 싣지 않는다 — __tests__/signals/expo-port.test.ts, 이월은 __tests__/signals/collect.test.ts
- [ ] T005 `photosBetween()`이 세 값을 싣고(`null`→생략) collect가 `Photo`로 이월한다 — src/signals/expo-port.ts, src/signals/collect.ts
- [ ] T006 `PhotoVision`에 `unreadable: number`(문서류로 거른 장 수, 불변식 `captions.length + unreadable ≤ considered`)를 더하고 기존 생성 자리·테스트 대역의 타입 오류를 0으로 만든다 — src/vision/types.ts 및 `tsc`가 가리키는 곳

## Phase 3: User Story 1 — 섞인 날에 지어낸 값이 없다 (P1)

**Independent Test**: 보통 묘사 2·문서 묘사 2 대역으로 `captionAll`을 돌려 captions 2·unreadable 2·문서 장 사본 삭제.

- [ ] T007 [US1] 실패 테스트 먼저(contracts D3·D4·D5): 문답 꼴(`**Question:** …`, 앞 공백·`#` 포함)·낱말 4개(복수형·대소문자)는 거르고 사본을 지우며 unreadable+1, `table`·`text`·`paper`·보통 묘사는 남김, 빈 묘사는 unreadable에 안 셈, 그만두기는 `null` — __tests__/vision/caption.test.ts
- [ ] T008 [US1] 소스 계약 테스트: 판정 상수·함수가 caption.ts 밖에 없고 export되지 않으며 「사람이 정한 값」 주석이 있다(주석을 걷고 읽는 규칙) — __tests__/vision/caption.test.ts
- [ ] T009 [US1] 읽은 뒤 판정(D3)과 `unreadable` 셈을 구현한다 — src/vision/caption.ts

## Phase 4: User Story 2 — 영수증뿐인 날은 읽지 못했다고 쓴다 (P1)

**Independent Test**: 문서 묘사만 나오는 하루가 실패가 아니고 프롬프트에 고정 줄이 있다.

- [ ] T010 [P] [US2] 실패 테스트 먼저(P1): 묘사 0·unreadable>0 → `seen`, 묘사 0·unreadable 0 → 종전 실패 — __tests__/inference/on-device.test.ts
- [ ] T011 [P] [US2] 실패 테스트 먼저(P2·FR-009a): 하루 종류 `unread` + unreadable N → 사진 문장 뒤 「글자가 적힌 사진이 N장 있었지만 내용은 읽지 못했어요.」(koCount 표기), `scenes` 날·unreadable 0 날에는 없음, 본문이 이 줄을 옮겨도 echo 아님 — __tests__/diary/prompt-e2sn.test.ts
- [ ] T012 [US2] `on-device.ts` 전량 실패 조건에 `result.unreadable === 0`을 더한다 — src/inference/on-device.ts
- [ ] T013 [US2] `sentenceSignalLines`에 고정 줄을 더하고 문구 골든(`ADDED_AFTER_GOLDEN`) 규칙이 프롬프트에 해당하면 따른다 — src/diary/prompt.ts
- [ ] T014 [US2] 조립 테스트 한 번: 실제 `captionAll` + on-device 파이프라인 대역으로 문서뿐인 날이 고정 줄로 이어지고, 섞인 날에 거른 장이 일기 사진(`photos`)에 들어가지 않는다(FR-007, 상태 공유 부품 규칙) — __tests__/inference/on-device.test.ts

## Phase 5: User Story 3 — 화면 캡처는 읽기 전에 건너뛴다 (P2)

**Independent Test**: `Screenshot_…`·세로 2:1 장은 경로 해석·리사이즈·묘사가 불리지 않는다.

- [ ] T015 [US3] 실패 테스트 먼저(D2): 이름 접두(대소문자 무시)·비율 ≥2는 resolvePath·resize·engine 미호출 + unreadable+1, 가로 파노라마(가로/세로 ≥2)·값 없음·0 크기는 종전대로 읽음 — __tests__/vision/caption.test.ts
- [ ] T016 [US3] 읽기 전 판정(D2)을 구현한다 — src/vision/caption.ts

## Phase 6: Polish

- [ ] T017 위반 주입: D2·D3 판정 제거, P1 조건 제거, 고정 줄을 `scenes` 날에도 넣기 — 각각 테스트가 잡는지 보고 되돌린다(치환 적용 단언 먼저)
- [ ] T018 「바꾸지 않는다」 확인(FR-011·012·013): 브랜치 diff에 src/vision/select.ts·재료 판정(src/app/material.ts·src/schedule/auto-write.ts)·package.json 의존성 변경이 없음을 확인하고 quickstart 「기록」에 적는다
- [ ] T019 `npm test`·`npm run lint` 통과
- [ ] T020 실기기 전후 비교(안드로이드 SM-S901N·iPhone 14) — quickstart.md 「기록」에 적는다(본문 지어낸 값·캐러셀·오탐·놓친 사례·장당 시간, iOS 앱 밖 포함)
- [ ] T021 AGENTS.md에 유효한 결론(판정 자리·기준·원인 가름·미확인)을 주제별로 반영한다

## Dependencies

Phase 2 → US1 → US2(T014는 T009에 의존) · US3(T016은 T009와 같은 파일이라 그 뒤) → Polish. T002·T003, T010·T011은 병렬.

## Implementation Strategy

MVP = US1+US2(소유자 증상의 주 사례: 카메라 영수증). US3는 그 뒤.
