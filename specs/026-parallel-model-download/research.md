# Phase 0 연구: 모델 병렬·동시 내려받기

각 항목은 **Decision / Rationale / Alternatives considered** 형식이다. spec.md의 Assumptions
와 brainstorming 대화에서 확정된 것을 근거로 정리한다.

---

## §1. HuggingFace가 HTTP Range를 유지하는가 (NEEDS CLARIFICATION → 실측 계획으로 해소)

**Decision**: 코드는 **Range 지원을 실행 시점에 탐지**하고, 미지원·불명이면 단일 스트림으로
폴백한다. HF가 Range를 유지하는지는 이 스펙의 **실기기 검증에서 재고** `findings.md`에
기록한다 — 코드가 이 사실에 의존하지 않게 만든다.

**Rationale**:

- 로스터의 모델은 전부 `huggingface.co/.../resolve/main/...`이고, HF는 302로
  CDN(cloudfront/S3)에 넘긴다. 리다이렉트 후 `Accept-Ranges: bytes`와 `Content-Length`가
  유지되는지는 003이 관측하지 않았다(003은 `Content-Length` 없으면 `-1`만 다뤘다).
- 탐지 방법: 다운로드 시작 시 `HEAD` 또는 `Range: bytes=0-0` 요청을 보내
  `Accept-Ranges: bytes` + 유효한 `Content-Range`/`Content-Length`를 확인한다. 리다이렉트는
  `fetch`가 따라가므로 최종 응답 헤더를 본다.
- 원칙 V — 모르는 상태(헤더가 애매함)를 "지원한다"로 지어내지 않는다. 애매하면 폴백.

**Alternatives considered**:

- _세그먼트 전용, 폴백 없음_ (brainstorming Q3=B) — 기각. HF CDN이 특정 순간 Range를
  거부하면 모델을 아예 못 받게 되는 회귀. 사용자가 A(폴백 필수) 선택.
- _로스터에 `rangeSupported: boolean` 상수를 미리 박기_ — 기각. 어디서 왔든 짐작이며
  (원칙 V), CDN 동작은 시간에 따라 변할 수 있다. 실행 시점 탐지가 정직하다.

---

## §2. 세그먼트 병렬을 어디에 구현하는가

**Decision**: `expo-file-system`의 `createDownloadTask`는 **폴백 경로에만** 쓴다. 세그먼트
병렬은 이 저장소가 직접 구현한다: 순수 계획(`segmented/plan.ts`) + 병렬 수신
(`segmented/transfer.ts`, `RangeFetchPort` 주입) + 조각을 파일 오프셋에 쓰고 병합
(`expoRangeFetchPort()`).

**Rationale**:

- `createDownloadTask`는 단일 스트림 전용이고 Range 분할 API를 노출하지 않는다.
- 방식 3+1 조합(brainstorming 확정): 계산은 순수 함수(기기 없이 검증), 기기에 닿는 것은
  `RangeFetchPort` 하나. `acquisition.ts`는 전송 방식을 모른다(003 경계 유지).
- `expo-file-system` 57의 `File`은 임의 오프셋 쓰기를 지원한다(핸들 기반 쓰기). 각 구간을
  받아 `file.write(bytes, { position })` 형태로 제자리에 쓰면 병합이 곧 완료다 — 별도
  concat 단계가 필요 없다. (정확한 API 시그니처는 구현 시 `expo-file-system` 57 문서로
  확인 — context7 `/expo/expo` 또는 SDK 문서. 003이 `File.createDownloadTask`를 쓴 것과
  같은 모듈.)
- 미확인: 57의 `File` 쓰기가 스트리밍/부분 쓰기를 어떤 시그니처로 주는지. 구현 첫 단계에서
  실기기로 "한 구간을 오프셋에 쓰고 되읽어 일치"를 확인한다(quickstart Q0).

**Alternatives considered**:

- _별도 `SegmentedDownloadPort` + `acquisition.ts`가 선택_ (방식 2) — 기각.
  `acquisition.ts`가 전송 방식을 알게 되어 003의 "판정·규칙은 순수, 기기 통로는 포트 하나"
  경계를 침범. 폴백 판정이 비즈니스 로직에 샌다.
- _`DownloadPort`를 확장하지 않고 `acquisition.ts`에서 직접 fetch_ — 기각. 011의
  `vision/acquisition.ts`가 `DownloadPort`를 재사용하는 구조가 깨진다(FR-027 위반).

---

## §3. 세그먼트 개수와 최소 구간 크기 — 상수의 초기값

**Decision**: `SEGMENT_COUNT = 4`, `MIN_SEGMENT_BYTES = 8 * 1024 * 1024` (8MiB)로 **잠정**
확정한다. 둘 다 `src/models/segmented/plan.ts`에 `readonly` 리터럴로 못박고, 계약 테스트가
소스를 `readFileSync`로 읽어 잠근다(FR-030). 실기기 실측으로 확정한다.

**Rationale**:

- **4**: 모바일 네트워크에서 4~8 병렬이 처리량 이득의 대부분을 준다는 것이 일반적 관측이다
  (HTTP/1.1 커넥션 오버헤드 상쇄 + TCP 슬로스타트 병렬화). 동시 다운로드 상한이 없으므로
  (FR-002) 6모델 × 4 = 24 커넥션이 상한 — 안드로이드/OkHttp 기본 커넥션 풀(호스트당 5,
  전체 64)과 CDN이 감당 가능한 범위. 8로 올리면 48 커넥션이라 CDN 스로틀·소켓 고갈 위험.
- **8MiB**: 이보다 작은 조각은 요청 오버헤드가 전송 시간을 앞질러 병렬 이득이 사라진다.
  가장 작은 모델(gemma3-1b, 806MB)도 8MiB로 나누면 100구간이 넘으므로, `SEGMENT_COUNT=4`
  기준 구간당 200MB — 최소 크기에 한참 여유. 즉 `MIN_SEGMENT_BYTES`는 "파일이 극단적으로
  작을 때(두 배 미만) 구간으로 쪼개지 않고 단일 스트림으로"라는 안전장치이며 로스터
  모델에서는 dead path에 가깝다(그래도 상수로 둔다 — 로스터가 바뀔 수 있고, 원칙 V가
  "코드가 판정하지 않는다"를 요구한다). **구간 수는 1 아니면 `SEGMENT_COUNT` — 중간 값을
  만들지 않는다**(FR-013).
- 003의 `SPACE_HEADROOM = 1.15`가 "판단이지 실측 아님, 실기기에서 확정" 주석을 단 전례를
  그대로 따른다. 주석에 "이 값은 잠정이며 T037(quickstart Q3)에서 실측으로 확정한다"를
  명시한다.

**Alternatives considered**:

- _`SEGMENT_COUNT`를 파일 크기로 계산_ (예: `min(8, ceil(bytes / 256MB))`) — 기각. 원칙 V,
  FR-012 — "코드가 파일 크기를 보고 개수를 정하지 않는다". 012·021·023이 "사람이 상수로
  못박는다"를 확립.
- _동시성 상한을 두어 곱을 통제_ (brainstorming Q2=B) — 기각. 사용자가 A(무제한) 선택.
  대신 `SEGMENT_COUNT`를 낮게(4) 잡아 곱을 통제.

---

## §4. 세그먼트 이어받기 상태 모델

**Decision**: `ModelState`(003 `storage.ts`)에 `segmented: SegmentedResume[]` 필드를
추가한다. `SegmentedResume = { assetKey, totalBytes, segmentCount, receivedBytes: number[] }`
— `receivedBytes[i]`가 구간 i가 이미 받은 바이트. `PausedDownload`(단일 스트림 재개)와 **한
캐릭터당 상호배타**(둘 중 하나만). 재개 시 `remainingSegments(resume)`가 각 구간의 남은
Range(`start + receivedBytes[i]` ~ `end`)를 순수 함수로 계산한다.

**Rationale**:

- brainstorming Q4=B — 세그먼트 이어받기를 직접 구현한다.
- 003이 "메타데이터를 한 파일에 모은다"(캐릭터 5 고정, 늘 전부 조회)를 확립. `segmented`도
  같은 파일에 둔다. `withVerdict`/`withPaused`/`withoutAsset` 옆에 `withSegmentedResume`/
  `withoutSegmented` 헬퍼를 추가한다.
- `receivedBytes`만 남기고 구간 오프셋은 남기지 않는다 — 오프셋은 `totalBytes`+`segmentCount`
  로 `planSegments()`가 결정론적으로 다시 만든다(재구성 가능한 값을 저장하지 않는다).
  단, `totalBytes`와 `segmentCount`는 저장해야 한다 — 재개 시 로스터/서버 값이 바뀌었으면
  재개 계획이 어긋나므로, 저장된 값으로 계획을 복원하고 최종 지문 검증이 어긋남을 잡는다
  (FR-024).
- 앱이 갑자기 죽어 `segmented`를 못 남긴 경우: 부분 파일은 남지만 `SegmentedResume`가
  없으므로 `readiness.ts`가 `partial` + `resumable: false`로 판정(FR-026, 003 FR-006a가
  이미 가르는 갈래). 그 부분 파일은 처음부터 다시 받는다.

**Alternatives considered**:

- _구간별 오프셋까지 저장_ — 기각. `planSegments()`가 결정론적이므로 중복. 저장 값이
  많을수록 스키마 마이그레이션 위험.
- _`PausedDownload`를 재사용해 `state: unknown`에 세그먼트 정보를 넣기_ — 기각. 003의
  `PausedDownload.state`는 `DownloadTask.savable()`의 불투명 값이고 "안을 해석하지 않는다"가
  계약. 세그먼트 재개는 우리가 만든 구조라 명시적 타입이 맞다. 상호배타로 두어 혼동 방지.
- _별도 파일 `segmented-resume.json`_ — 기각. 003의 "한 파일에 모은다" 판단과 어긋난다.

---

## §5. 동시성: 슬롯 → 맵, `busy` 거부의 새 의미

**Decision**: `acquisition.ts`의 `running: Character | null`을
`Map<Character, { pause(): Promise<void> }>`로 바꾼다. `prepare(character)`는
`running.has(character)`일 때만 `{ kind: "busy", busyWith: character }`를 반환한다 —
**같은 캐릭터 중복 요청**만 막는다. 다른 캐릭터는 무제한 병행.

**Rationale**:

- FR-001·002·003. `busy` 갈래를 제거하지 않고(FR-028 — 003 계약의 갈래는 확장만) 의미를
  좁힌다: "다른 것을 받는 중" → "같은 것을 이미 받는 중". `DownloadFailure`·
  `DownloadRejection` 타입은 그대로(`busyWith: Character`).
- 008의 거부 안내(`download-view.ts`)는 여전히 유효 — 사용자가 같은 캐릭터를 빠르게 두 번
  누르면 두 번째가 거부되고, 안내가 뜬다. `noticeFor`의 "거부가 아직 참인가"는
  "`active`에 `rejection.busyWith`(= `rejection.requested`)가 있는가"로 바뀐다. 그 캐릭터가
  다 받으면 안내 자동 소멸(008 핵심 로직 유지).
- 003의 "자리를 곧바로 잡는다"(`await` 사이 끼어듦 방어)는 `running.set(character, handle)`을
  첫 `await` 전에 두는 것으로 유지.
- 003의 "진행 중은 메모리에만"(FR-009)은 `Map`도 메모리이므로 유지.

**Alternatives considered**:

- _`busy` 갈래를 완전히 제거하고 같은 캐릭터 중복도 허용_ — 기각. 같은 파일을 두 다운로드가
  동시에 쓰면 파일이 손상된다. 중복 방지는 필요하다.
- _동시성 상한 N개 슬롯 + 큐_ (brainstorming Q2=B/C) — 기각. 사용자가 A(무제한) 선택.

---

## §6. 공간 판정: 동시 다운로드에서

**Decision**: `prepare()`의 공간 검사를 `availableBytes() - Σ(받는 중인 것들의 남은 용량)`
< `asset.expectedBytes * SPACE_HEADROOM` 로 바꾼다. "받는 중인 것들의 남은 용량"은
`segmented/plan.ts`(또는 `acquisition.ts` 내 순수 헬퍼)가 `Map`의 각 항목에 대해
`expectedBytes - 지금까지 받은 바이트`로 계산한다.

**Rationale**:

- FR-007. 003의 시작 시점 1회 판정은 동시 다운로드에서 여러 개가 나란히 통과해 공간을 다
  써 버릴 수 있다.
- 근사임을 spec Assumptions에 명시 — 진행 중 서버 실제 크기가 예상과 다를 수 있고, 그
  경우는 개별 다운로드의 network/write 실패로 드러나며 다른 다운로드를 망가뜨리지 않는다
  (spec Edge Cases).
- `SPACE_HEADROOM`은 003 상수 재사용(새 상수 아님).
- "받은 바이트"는 진행 콜백에서 `acquisition.ts`가 `Map` 항목에 기록해 둔다(진행률과 별개로,
  공간 판정용 최신 바이트). 밖으로 나가지 않으므로 원칙 III 위반 아님.

**Alternatives considered**:

- _003 그대로(개별 시작 시점 판정)_ — 기각. FR-007이 명시적으로 합산을 요구.
- _예상 크기 총합을 미리 예약(reserve)_ — 과설계. 근사 판정으로 충분하고, 실패 시 격리됨.

---

## §7. `download-view.ts` — `active` 단수 → 복수

**Decision**: `DownloadView.active: DownloadProgress | null` → `DownloadProgress[]`.
`resolveDownloadView(active: DownloadProgress[], rejection)`. `noticeFor`의 판정:
`active`에 `rejection.busyWith`인 캐릭터가 **없으면** 안내 소멸(008의 `active === null`
분기를 배열 대응으로).

**Rationale**:

- FR-005·010. 008의 불변식(안내는 하나뿐, 자동 소멸, `active`와 `notice.requested`가 같은
  경우 없음)은 전부 유지 — `active`가 배열이 되어도 "그 캐릭터가 받는 중 목록에 있으면
  `requested`로 그리지 않는다"는 판정은 동일.
- 008의 계약 파일(`contracts/download-view.md`)을 이 스펙의 `contracts/download-view.md`가
  확장한다(FR-029).

**Alternatives considered**:

- _`active`를 `Map`으로_ — 기각. 화면이 `.map()`으로 순회하므로 배열이 자연스럽고, 008의
  기존 테스트 변경 폭이 작다.

---

## §8. `src/vision/acquisition.ts` 무변경 확인

**Decision**: `vision/acquisition.ts`는 한 줄도 고치지 않는다(FR-027, SC-009). 계약 테스트
또는 CI 체크가 `git diff --stat`로 이 파일이 0줄임을 확인한다(024의 "`collect.ts`는 이
스펙에서 한 줄도 안 고쳤다" 검증 방식).

**Rationale**:

- 011이 `DownloadPort`(`start(key, url, onProgress)`)를 캐릭터를 모른 채 재사용하는 구조.
  `expoDownloadPort()`가 세그먼트/폴백을 그 계약 뒤에서 고르므로, `vision`은 자동으로
  세그먼트 병렬을 얻는다.
- `vision/acquisition.ts`는 이미 "두 파일을 차례로 받는다"(base → projector). 각 파일이
  이제 세그먼트 병렬로 받아지지만, `vision` 코드 입장에서는 `handle.wait()`가 더 빨리
  resolve될 뿐이다.

**Alternatives considered**: 없음 — FR-027이 명시적 제약.

---

## §9. 헌법 검사 규칙 추가

**Decision**: `scripts/constitution-rules.ts`에 `checkSegmentedFile` 추가 —
`src/models/segmented/`가 (1) `diary/*`·`Character`·`models/roster`를 import하는 것,
(2) `elapsed`·`bytesPerSecond`·`throughput`·`speed` 같은 속도 측정 어휘를 소스에 두는 것을
차단한다. 위반 주입 3종으로 검증(FR-019, 원칙 III·IV).

**Rationale**: 020의 `checkScheduleFile`, 021의 `checkOnboardingFile`, 023의
`checkVisionFile`(`VISION_SCORES_IMAGE`) 전례. 새 경계를 만들 때마다 헌법 검사로 잠근다.

**Alternatives considered**: 없음 — 이 저장소의 확립된 관례.

---

## 미확인으로 남기고 실기기 검증으로 넘기는 것 (spec Assumptions, 원칙 V)

1. HF CDN이 리다이렉트 후 Range·`Content-Length`를 유지하는가 (§1) — 유지 안 하면 폴백이
   기본. 동시 다운로드(Story 1)는 독립적으로 유효.
2. `expo-file-system` 57 `File`의 부분/오프셋 쓰기 시그니처 (§2) — 구현 첫 단계 실기기
   확인(quickstart Q0).
3. `SEGMENT_COUNT=4` / `MIN_SEGMENT_BYTES=8MiB`가 이 기기·이 CDN에서 적정한가 (§3) —
   실기기 대조로 확정, `plan.ts` 주석 갱신.
4. 세그먼트 "받는 도중 앱 강제 종료" 재개 — 타이밍 제어가 어려워(012·025 계열) 계약
   테스트로 잠그고 재현 불가분은 `findings.md`에 "미확인" 명시(brainstorming Q5=A).
5. Range 미지원 서버 폴백 — 로스터에서 실제로 안 만날 수 있어 dead path 가능. 계약 테스트가
   대역으로 검증.
