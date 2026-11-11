# Contract: 구간 체크포인트와 재개 정합

## DownloadPort (port.ts)

```ts
type SegmentCheckpoint = (resume: SegmentedResume) => void | Promise<void>;
start(key, url, onProgress, checkpoint?): TransferHandle;
resume(key, url, state, onProgress, checkpoint?): TransferHandle;
```

- `checkpoint`는 구간 하나가 최종 파일에 놓인 **직후** 누적 기록 전체(`doneIndices` 오름차순)로 불린다. 호출은 순서대로, 겹치지 않는다(코어가 직전 호출이 끝난 뒤 다음을 부른다).
- `checkpoint`가 던지거나 거부해도 받기는 계속된다.
- 폴백(단일 스트림) 경로는 `checkpoint`를 부르지 않는다.
- `paused`의 `state`는 같은 모양의 `SegmentedResume`이다.

## runSegmented (transfer.ts)

- `opts.onCheckpoint?: SegmentCheckpoint`. 남은 구간을 동시 `SEGMENT_CONCURRENCY`개로 받는다.
- 결과: `completed`(모든 구간 끝) · `paused`(멈춤 신호, `resume.doneIndices`=끝난 것만) · `failed`(구간 실패) · `fallback`.
- 받던 구간은 `doneIndices`에 들어가지 않는다.
- 진행률: 끝난 구간은 전체 크기에서 그 구간 크기만큼 이미 받은 것으로 센다.

## storage.ts

- `mutateState(metadata, fn): Promise<void>` — 같은 `MetadataPort`에 대한 호출을 한 줄로 세워 `fn(최신 state) → 새 state`를 읽고 쓴다. 앞 호출이 실패해도 사슬은 이어진다.
- `readState`는 `segmented` 항목 중 형태가 맞지 않는 것을 버린다(구간 수와 계획의 일치는 보지 않는다 — `resume.ts` 몫).

## resume.ts

```ts
isResumeConsistent(resume, file: FileFacts, expectedBytes): boolean
```

순수 함수. 규칙은 plan.md 결정 4.
