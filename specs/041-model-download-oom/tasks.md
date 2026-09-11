# 041 — 태스크

**스펙**: [spec.md](spec.md)
**브랜치**: `040-onboarding-parallel-setup`

## Phase 1: 원인 확정

- [X] T001 RN 0.86의 전역 `fetch`가 무엇인지 확인 — `Libraries/Core/setUpXHR.js:27`
      → `Libraries/Network/fetch.js:15` → `whatwg-fetch`.
- [X] T002 `whatwg-fetch`의 응답에 `body`가 있는지 확인 — `dist/fetch.umd.js`의
      `Body()`가 `_bodyText`·`_bodyBlob`·`_bodyArrayBuffer`만 세우고 `body` getter를
      정의하지 않는다. **`res.body`는 언제나 `undefined`.**
- [X] T003 결론 — `expo-port.ts:229`의 `if (!res.body)`가 항상 참이라 모든 구간이
      `arrayBuffer()`로 약 380MB를 힙에 올렸고, 4구간 동시 = OOM. 스트리밍 루프는
      죽은 코드였다. spec.md 「근본 원인」에 기록.

## Phase 2: 계약 먼저 (헌법 「개발 방식」)

- [X] T004 `__tests__/models/download-memory.test.ts` 신규 — 수신 경로가
      `arrayBuffer`·`blob`·`text`·`res.body`·`getReader`를 부르지 않고 네이티브
      `DownloadTask` + `Range` 헤더를 쓰는지, 임시 파일 정리(`finally`)가 있는지,
      속도 어휘가 없는지(원칙 IV), 순수 코어가 기기 통로를 import하지 않는지.
- [X] T005 고치기 전에 돌려 **실패하는 것을 확인** — 4개 실패(실제로 결함을 잡는다).

## Phase 3: 구현

- [X] T006 `expoRangeFetchPort.fetchRange`를 네이티브 `DownloadTask` + `Range`
      헤더로 교체. 구간마다 임시 파일(`<key>.bin.seg<i>`)로 받고, 네이티브 진행
      보고(누적)를 `onBytes(delta)` 증분으로 환산(FR-002).
- [X] T007 `copyInto()` — 받은 구간을 `COPY_CHUNK_BYTES`(1MiB)씩 최종 파일의
      `segment.start` 오프셋으로 옮겨 붙인다. 상주 메모리가 청크 하나로 고정(FR-001).
- [X] T008 `finally`에서 임시 파일 정리 — 성공·실패·취소 전부(FR-005).
- [X] T009 `leftoverNamesFor()` — `remove()`·`bytesUsed()`가 구간 임시 파일도
      보게 한다. 수신 도중 죽으면 GB가 사용자 눈에 안 보이는 채로 남는 것을 막는다.
- [X] T010 `tsc` 통과 — 손으로 쓴 구조적 타입 대신 `expo-file-system`의 실제 타입을
      빌린다. **`tsc`가 `FileMode.Read`(없는 멤버)를 잡았다** — 실제는 `ReadOnly`.

## Phase 4: 검증

- [X] T011 `npm test` — 153 스위트 / 2741 통과.
- [X] T012 `npm run lint` — eslint 0 error, `tsc` 0, 헌법 검사 위반 0, prettier 클린.
- [X] T013 위반 주입 — `fetchRange`에 `arrayBuffer()`를 되살리니 T004가 실패한다.
      되돌린 뒤 재통과 확인.
- [X] T014 실기기 — a1(1.5GB) 삭제 후 재다운로드 완주, OOM 없음, 지문 일치.
      (SC-001·SC-002)

## Phase 5: 기록

- [X] T015 `AGENTS.md`에 041 절 추가 — RN `fetch`에 스트림이 없다는 실측 규칙.
