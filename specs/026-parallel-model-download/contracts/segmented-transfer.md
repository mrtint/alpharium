# 계약: 세그먼트 병렬 전송 — 순수 코어 + RangeFetchPort

**대응 요구사항**: FR-011~FR-026

**구현 위치**: `src/models/segmented/plan.ts` (순수), `src/models/segmented/transfer.ts`
(포트 주입), `src/models/port.ts` (`RangeFetchPort`), `src/models/expo-port.ts`
(`expoRangeFetchPort`, `expoDownloadPort`의 탐지 분기)

---

## 이 계약이 지키는 것

- **원칙 III** — 세그먼트 코어는 `Character`를 모른다. `AssetKey`·바이트·구간 정보만 다룬다.
- **원칙 IV** — 속도·처리량·경과 시간을 재는 코드가 없다. 진행률은 `mergeProgress`가 낸
  `fraction` 하나.
- **원칙 V** — `SEGMENT_COUNT`·`MIN_SEGMENT_BYTES`는 사람이 정한 상수. Range 지원 여부는
  탐지하고, 애매하면 폴백(지어내지 않음).
- **003 경계** — `acquisition.ts`는 이 계약을 직접 부르지 않는다. `DownloadPort` 뒤에 있다.

---

## 모양

```
planSegments(totalBytes)          → SegmentPlan            (순수)
remainingSegments(resume)         → Segment[]              (순수)
mergeProgress(receivedBytes[], totalBytes) → fraction|null (순수)
isComplete(receivedBytes[], plan) → boolean                (순수)

RangeFetchPort.fetchRange(key, url, segment, onBytes) → Promise<RangeOutcome>   (기기)
RangeFetchPort.probeRange(url)    → Promise<RangeSupport>                        (기기)

runSegmented(deps, key, url, opts) → Promise<SegmentedTransferResult>  (transfer.ts)
```

**`planAll()`·`allAssets()`를 두지 않는다** — 003·로스터의 판단을 잇는다.

---

## 순수 함수 — `segmented/plan.ts`

### `planSegments(totalBytes, count = SEGMENT_COUNT): SegmentPlan`

| 입력 | 출력 |
| --- | --- |
| `totalBytes <= 0` | `{ totalBytes, segments: [] }` (호출자가 폴백) |
| `totalBytes < MIN_SEGMENT_BYTES * 2` | `count = 1` — 단일 구간 `{ index:0, start:0, end:totalBytes-1 }` |
| 그 외 | `count` 구간, 균등 분할, 나머지 바이트는 마지막 구간에 |

**불변식** (계약 테스트가 검사):
- `segments[0].start === 0`
- `segments[last].end === totalBytes - 1`
- 인접 구간: `segments[i].end + 1 === segments[i+1].start` (빈틈·겹침 없음)
- `segments.length === count` (작은 파일이면 `1`)

### `remainingSegments(resume: SegmentedResume): Segment[]`

`planSegments(resume.totalBytes, resume.segmentCount)`로 계획 복원. 각 구간 i에 대해:
- `segmentSize = plan.segments[i].end - plan.segments[i].start + 1`
- `resume.receivedBytes[i] >= segmentSize` → **제외** (완료)
- 아니면 `{ ...plan.segments[i], start: plan.segments[i].start + resume.receivedBytes[i] }`

**불변식**: 반환된 각 구간의 `start <= end`. 빈 배열이면 재개할 것이 없음(전부 완료 —
호출자가 곧바로 지문 검증으로).

### `mergeProgress(receivedBytes: number[], totalBytes: number): number | null`

`totalBytes <= 0` → `null` (003 `fractionOf`와 동형). 아니면
`Math.min(1, sum(receivedBytes) / totalBytes)`.

### `isComplete(receivedBytes: number[], plan: SegmentPlan): boolean`

모든 i에 대해 `receivedBytes[i] >= (plan.segments[i].end - plan.segments[i].start + 1)`.

### `remainingCapacity(expectedBytes: number, receivedSoFar: number): number`

`Math.max(0, expectedBytes - receivedSoFar)`. `acquisition.ts`의 동시 공간 판정(§6)이 쓴다.

---

## 기기 포트 — `RangeFetchPort` (`src/models/port.ts`)

```
type RangeOutcome =
  | { kind: "completed" }
  | { kind: "failed"; reason: string }
  | { kind: "aborted" };   // 다른 구간 실패로 취소됨 / 사용자 멈춤

interface RangeFetchPort {
  /**
   * 서버가 구간 요청을 지원하는지 본다.
   * HEAD 또는 Range: bytes=0-0 요청 → Accept-Ranges: bytes + 유효한 크기.
   * 리다이렉트를 따라간 최종 응답을 본다. 애매하면 { kind: "unsupported" }.
   */
  probeRange(url: string): Promise<RangeSupport>;

  /**
   * 한 구간을 받아 파일의 segment.start 오프셋에 쓴다.
   * onBytes(delta)로 이 구간이 방금 받은 바이트 증분을 보고한다.
   * AbortSignal로 취소 가능(다른 구간 실패 시 호출자가 취소).
   */
  fetchRange(
    key: AssetKey,
    url: string,
    segment: Segment,
    onBytes: (delta: number) => void,
    signal?: AbortSignal,
  ): Promise<RangeOutcome>;
}
```

**`RangeFetchPort`는 `Character`를 모른다** — `AssetKey`만. `expo-port.ts`가 파일 이름을
`fileNameFor(key)`로 만든다(003과 동일).

**부분 쓰기 원자성**: `fetchRange`는 받은 만큼을 오프셋에 쓴다. 앱이 죽으면 이미 쓰인
바이트는 남고, `receivedBytes`가 아직 저장 안 됐으면 그 부분은 재개 시 다시 받아 덮어쓴다
(멱등). 파일 크기가 커지는 방향으로만 쓴다.

---

## 조립 — `runSegmented` (`src/models/segmented/transfer.ts`)

```
type SegmentedDeps = { range: RangeFetchPort };

type SegmentedTransferResult =
  | { kind: "completed" }
  | { kind: "fallback" }        // Range 미지원 → 호출자가 단일 스트림으로
  | { kind: "paused"; resume: SegmentedResume }
  | { kind: "failed"; reason: string };

runSegmented(
  deps: SegmentedDeps,
  key: AssetKey,
  url: string,
  opts: {
    resume?: SegmentedResume;               // 있으면 이어받기
    onProgress: (fraction: number | null) => void;
    pauseSignal: AbortSignal;               // 사용자 "멈추기"
  },
): Promise<SegmentedTransferResult>
```

**흐름**:

1. `opts.resume`가 없으면 `probeRange(url)`.
   - `{ kind: "unsupported" }` → `return { kind: "fallback" }`. **여기서 끝** — 호출자가
     기존 `createDownloadTask` 경로로.
   - `{ kind: "supported", totalBytes }` → `plan = planSegments(totalBytes)`.
     `plan.segments.length === 1`이면(작은 파일) 세그먼트 이득이 없으므로
     `return { kind: "fallback" }`.
2. `opts.resume`가 있으면 `segments = remainingSegments(resume)`, `totalBytes`·`receivedBytes`는
   `resume`에서.
3. `receivedBytes: number[]` (구간별 누적) 준비. 재개면 `resume.receivedBytes` 복사, 아니면
   `plan.segments.map(() => 0)`.
4. 모든 구간을 `Promise.all`로 `fetchRange(key, url, seg, delta => { receivedBytes[seg.index] += delta; opts.onProgress(mergeProgress(receivedBytes, totalBytes)); }, combinedSignal)`.
   `combinedSignal` = `opts.pauseSignal` OR 내부 abort(한 구간 실패 시).
5. 결과 취합:
   - 전부 `completed` → `opts.onProgress(1)`, `return { kind: "completed" }`.
   - 하나라도 `failed` → 나머지 abort, `return { kind: "failed", reason }`.
   - `pauseSignal` 발동(`aborted`) → `return { kind: "paused", resume: { assetKey: key, totalBytes, segmentCount: plan/resume.segmentCount, receivedBytes } }`.

**`runSegmented`는 지문 검증을 하지 않는다** — 호출자(`expoDownloadPort` 또는 그 위)가
`{ kind: "completed" }` 후 003의 `verifyDownloaded`를 부른다(FR-015).

**`runSegmented`는 `state.json`을 쓰지 않는다** — `{ kind: "paused", resume }`를 반환만
하고, 저장은 `acquisition.ts`가 003의 `withPaused`와 나란히 `withSegmentedResume`로 한다.

---

## `__DEV__` 강제 폴백 (SC-004, quickstart Q3·Q4)

`expo-port.ts`에 개발 전용 스위치를 둔다: `__DEV__ && globalThis.__FORCE_DOWNLOAD_FALLBACK__`
가 참이면 `probeRange`를 부르지 않고 곧바로 `{ kind: "unsupported" }`로 취급해 단일 스트림
경로를 탄다. 프로덕션 번들에서는 `__DEV__`가 거짓이라 이 분기가 트리셰이킹된다. 별도 빌드를
만들지 않으며, 개발자 탭이나 콘솔에서 플래그를 토글해 켬/끔 대조와 폴백 완주를 같은 앱에서
확인한다. **이 스위치는 `probeRange` 결과만 가로챈다** — 세그먼트 코어(`runSegmented`)와
순수 함수는 이 플래그를 모른다.

## `expoDownloadPort()` 탐지 분기 (`src/models/expo-port.ts`)

`start(key, url, onProgress)`가 반환하는 `TransferHandle.wait()` 안에서:

1. `runSegmented(deps, key, url, { onProgress: wrapToTransferProgress, pauseSignal })`.
   - **`runSegmented`는 `fraction`(`number | null`)만 낸다** — 구간 바이트를 콜백 밖으로
     내보내지 않는다(원칙 III). `TransferProgress` 변환은 **`expo-port.ts`가 소유한다**:
     `wrapToTransferProgress`가 `fraction`을 `{ bytesWritten: Math.round(fraction * total),
     totalBytes: total }`로 되돌려(`total`은 `probeRange`가 준 `totalBytes`)
     **`acquisition.ts`의 `fractionOf`가 그대로 동작**하게 한다. `runSegmented`의
     시그니처는 `onProgress: (fraction: number | null) => void`로 고정 — `TransferProgress`를
     직접 받지 않는다(그러면 세그먼트 코어가 바이트를 알게 됨).
2. `{ kind: "fallback" }` → 기존 `File.createDownloadTask(url, target, ...)` 경로 실행.
3. `{ kind: "completed" }` → `{ kind: "completed" }` (003 `TransferOutcome`).
4. `{ kind: "paused", resume }` → `{ kind: "paused", state: resume }`. **003의
   `TransferOutcome.paused.state: unknown`에 `SegmentedResume`를 담는다** — 타입이 이미
   `unknown`이라 안 깨진다. `acquisition.ts`가 이 값을 받아 `withSegmentedResume`로 저장.
5. `{ kind: "failed", reason }` → `{ kind: "failed", reason }`.

`resume(key, state, onProgress)`:
- `state`가 `SegmentedResume` 모양이면(`"segmentCount" in state`) `runSegmented(deps, key, url, { resume: state, ... })`.
- 아니면(003의 `DownloadPauseState`) 기존 `DownloadTask.fromSavable` 경로.
- **`url`은 로스터가 준다** — `acquisition.ts`가 `assetFor(character).url`을 넘긴다(003과
  동일). `resume`이 `url`을 인자로 받도록 003 `DownloadPort.resume` 시그니처에 `url`
  추가가 필요할 수 있다(현재 `resume(key, state, onProgress)`) — **계약 확장**: `resume(key, url, state, onProgress)`. `vision/acquisition.ts`는 `resume`을 안 부르므로 FR-027 영향 없음.

---

## 검증 표 (기기 없이 도는 것)

| # | 확인 | 방법 |
| --- | --- | --- |
| C1 | `planSegments` 균등 분할·경계 불변식 | 순수, 여러 `totalBytes` |
| C2 | `planSegments` 작은 파일 → `count = 1` | `totalBytes = MIN_SEGMENT_BYTES` |
| C3 | `planSegments` 나머지 바이트가 마지막 구간에 | `totalBytes % count !== 0` |
| C4 | `remainingSegments` 완료 구간 제외 | `receivedBytes[i] = segmentSize` |
| C5 | `remainingSegments` 부분 구간의 `start` 이동 | `receivedBytes[i] = segmentSize / 2` |
| C6 | `mergeProgress` `totalBytes <= 0` → `null` | 003 `fractionOf` 동형 |
| C7 | `mergeProgress` `[0,1]` 클램프 | `sum > totalBytes` |
| C8 | `isComplete` 전부 채워야 true | 한 구간만 부족 |
| C9 | `runSegmented` Range 미지원 → `{ fallback: true }` | `probeRange` 대역이 `unsupported` |
| C10 | `runSegmented` 정상 완주 → `{ completed }` + `onProgress(1)` | `fetchRange` 대역 전부 `completed` |
| C11 | `runSegmented` 한 구간 실패 → 나머지 abort + `{ failed }` | 대역 하나가 `failed`, 나머지 `signal.aborted` 확인 |
| C12 | `runSegmented` pause → `{ paused, resume }`, `receivedBytes` 정확 | `pauseSignal` 발동, 부분 `onBytes` 후 |
| C13 | `runSegmented` 재개 → 남은 구간만 `fetchRange` 호출 | `resume` 주입, 호출된 `segment.start` 확인 |
| C14 | `SEGMENT_COUNT`·`MIN_SEGMENT_BYTES`가 `readonly` 리터럴 | `readFileSync`로 소스 검사 (FR-030) |
| C15 | 값을 바꾸면 C14 실패 | 위반 주입 (SC-011) |
| C16 | `segmented/*`가 `Character`·`diary/*`·`models/roster` 미import | `checkSegmentedFile` (research §9) |
| C17 | `segmented/*` 소스에 속도 어휘(`elapsed`·`speed` 등) 없음 | 〃 |

**기기 필요** (Maestro / 실기기): quickstart.md 참조.
