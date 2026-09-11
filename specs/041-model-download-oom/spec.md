# 041 — 모델 내려받기 OOM 해소 (구간 수신을 네이티브로)

**상태**: 구현 완료 (2026-09-11)
**브랜치**: `040-onboarding-parallel-setup` (040 실기기 검증에서 발견돼 같은 브랜치에서 고친다)
**발단**: 040 실기기 검증(2026-09-11, SM-S901N) — a1(1.5GB) 내려받기 중
`java.lang.OutOfMemoryError`로 앱이 죽었다. 040이 `src/models/`를 한 줄도 고치지
않았으므로 040의 결함이 아니라 **026이 남긴 기존 결함**이다.

## 왜 이것이 문제인가

첫 실행이 이 다운로드를 반드시 지난다(040 FR-006 대기 화면). 여기서 죽으면
**사용자가 앱을 처음 쓰는 자리에서 앱이 사라지고**, 크래시 후 재시작해도 이어받지
못했다. 로스터가 하나인 지금(037) 이 모델 하나를 못 받으면 앱이 아무것도 못 한다.

## 근본 원인 — 관측된 사실

040은 `expo-port.ts`의 `arrayBuffer()` 폴백을 "의심 지점"으로 적고 **어느 조건에서
`res.body`가 null이 되는가**를 다음 조사 대상으로 남겼다. 답은 **"항상"**이다.

1. React Native 0.86의 전역 `fetch`는 `whatwg-fetch` 폴리필이다 —
   `node_modules/react-native/Libraries/Core/setUpXHR.js:27`이
   `polyfillGlobal('fetch', () => require('../Network/fetch').fetch)`이고,
   `Libraries/Network/fetch.js:15`가 `require('whatwg-fetch')`다.
2. `whatwg-fetch`의 `Body`에는 **`body` 속성이 아예 없다** — `dist/fetch.umd.js`의
   `Body()`는 `_bodyText`·`_bodyBlob`·`_bodyArrayBuffer`만 세우고 `body` getter를
   정의하지 않는다. XHR 기반이라 `ReadableStream`이 존재하지 않는다.
3. 따라서 `expo-port.ts:229`의 `if (!res.body)`는 **언제나 참**이고, 모든 구간이
   `arrayBuffer()` 경로를 탄다. 그 아래 스트리밍 루프(237~249행)는 **한 번도 실행된
   적이 없는 죽은 코드**였다.
4. a1은 1.5GB, `SEGMENT_COUNT = 4`이므로 구간 하나가 약 380MB다. 4구간이 **동시에**
   각자의 `arrayBuffer()`를 JS 힙에 올리려 한다 — 관측된 힙 한계는 268MB였고,
   1.39GB 지점에서 OkHttp 스레드가 `OutOfMemoryError`를 냈다.

**"스트림으로 받아 이어 쓴다 — 구간 전체를 메모리에 담지 않는다"는 236행 주석이
사실이 아니었다.** 코드가 의도를 적었을 뿐 그 의도가 성립한 적이 없다. 이것이
011의 `has_media=0`, 013의 URI 계약 불일치, 020의 헤드리스 `defineTask` 미등록과
같은 계열이다 — **오류 없이 조용히 다른 경로를 타는 결함**이고, 기기 없는 테스트가
구조적으로 못 잡는다(jest의 `fetch` 대역은 `body`를 주므로 오히려 죽은 코드 쪽이
검증됐다).

## 요구사항

- **FR-001**: 구간 수신은 받은 바이트를 **JS 힙에 구간 단위로 쌓지 않아야 한다.**
  파일 크기·구간 크기와 무관하게 상주 메모리가 일정해야 한다.
- **FR-002**: 기존 계약을 바꾸지 않는다 — `RangeFetchPort.fetchRange`의 시그니처,
  `RangeOutcome` 세 갈래, `onBytes(delta)` 증분 보고, `AbortSignal` 취소가 그대로다.
  `src/models/segmented/`(순수 코어)와 `port.ts`는 **한 줄도 고치지 않는다.**
- **FR-003**: 부분 쓰기의 멱등성을 유지한다 — 구간 i가 받은 바이트는 최종 파일의
  `segment.start` 오프셋부터 놓이고, 재개 시 `receivedBytes[i]`만큼 밀어 이어받는다.
- **FR-004**: 취소가 즉시 듣는다 — 다른 구간이 실패하거나 사용자가 멈추면 진행 중인
  수신이 중단되고 `aborted`를 돌려준다.
- **FR-005**: 임시 산출물을 남기지 않는다 — 구간 수신에 임시 파일을 쓴다면 성공·실패·
  취소 어느 경로에서도 정리되어야 한다.
- **FR-006**: 속도·처리량을 재지 않는다(원칙 IV). 진행 보고는 `onBytes(delta)` 증분
  하나뿐이다.

## 결정 — 네이티브 `DownloadTask`에 `Range` 헤더를 준다

`expo-file-system` 57의 `DownloadTask`는 `DownloadTaskOptions.headers`를 받는다
(`build/NetworkTasks.types.d.ts`). 즉 **구간 요청을 네이티브가 대신 수행하고 바이트를
JS를 거치지 않고 곧바로 디스크에 쓴다.** 이것이 FR-001을 구조적으로 성립시킨다 —
"메모리에 담지 않는다"가 주석의 약속이 아니라 **바이트가 JS 힙에 올라올 자리 자체가
없는 것**이 된다.

각 구간은 자기 임시 파일(`<key>.bin.seg<i>`)로 받고, 다 받으면 `FileHandle`의
`offset`을 옮겨 최종 파일의 제자리에 **청크 단위로** 옮겨 붙인다(`readBytes`/
`writeBytes`, 1MiB씩). 옮겨 붙이는 동안에도 힙에 올라오는 것은 청크 하나뿐이다.

**기각한 대안**:
- _`SEGMENT_COUNT`를 줄인다_ — 구간이 커지든 작아지든 `arrayBuffer()`는 구간 전체를
  올린다. 1구간이어도 1.5GB를 올리므로 해결이 아니다. 상수는 사람이 정한 값이고
  (원칙 V) 결함을 상수로 덮는 것은 원인을 남긴다.
- _`XMLHttpRequest`로 직접 스트리밍_ — RN의 XHR도 `responseType: 'arraybuffer'`에서
  전체를 메모리에 올린다. `onprogress`의 부분 응답은 텍스트뿐이라 바이너리에 못 쓴다.
- _`fetch` 스트리밍 폴리필 도입_ — 새 의존성이고, RN의 XHR 위에 얹는 폴리필은 결국
  같은 메모리 특성을 갖는다.
- _세그먼트를 버리고 003 단일 스트림으로 되돌린다_ — 026이 실측으로 얻은 병렬 이득을
  버린다. 원인은 병렬이 아니라 JS 힙 버퍼링이다.

## 성공 기준

- **SC-001**: a1(1.5GB)을 끝까지 받는다 — `OutOfMemoryError` 없음. (실기기)
- **SC-002**: 받은 파일의 지문이 로스터 값과 일치한다 — 구간 조립이 정확하다.
- **SC-003**: 기기 없는 테스트에서 `fetchRange`가 응답 전체를 버퍼링하는 API
  (`arrayBuffer`·`blob`·`text`)를 부르지 않음이 소스로 잠긴다.
- **SC-004**: 026의 기존 계약 테스트가 전부 그대로 통과한다(순수 코어 무변경).

## 실기기 검증 — 완료 (2026-09-11, SM-S901N, dev)

`a1.bin`을 지우고 `state.json`의 a1 verdict를 제거해 **처음부터 받는 상태**로 만든
뒤 앱을 띄웠다(040 첫 실행 대기 화면과 같은 경로). 관측:

- **SC-001 통과** — 1.5GB를 끝까지 받았다. `adb logcat`에 `OutOfMemoryError`
  **0건**. 고치기 전에는 1.39GB 지점에서 죽었다.
- **SC-002 통과** — `state.json`의 a1 verdict가 `passed: true`,
  `verifiedMd5: d8506380fd1f0fdb8e4318a01b8b8e34`, `verifiedBytes: 1522796768`.
  **지우기 전 값과 정확히 같다** — 4구간을 임시 파일로 나눠 받아 옮겨 붙인 결과가
  바이트 단위로 옳다는 뜻이다.
- **FR-005 통과** — `files/models/`에 `.seg` 파일이 **0개** 남았다. 임시 파일이
  정리됐다.

## 미확인으로 남는 것

- **취소·재개 갈래는 이번 세션에서 유도하지 않았다.** `aborted` 처리와 `resume`
  경로는 026의 기존 계약 테스트와 041의 계약 테스트가 잠그고 있으나, 1.5GB
  수신 도중 멈췄다 이어받는 실기기 관측은 하지 않았다.
- dev(debug)로만 검증했다(AGENTS.md 「테스트」 기준 — release 빌드를 만들지 않는다).
  새 네이티브 모듈은 없고 `expo-file-system`의 기존 API만 쓴다.
