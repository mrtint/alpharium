/**
 * 세그먼트 병렬 내려받기의 순수 계획.
 *
 * 계약: specs/026-parallel-model-download/contracts/segmented-transfer.md 「순수 함수」
 *       specs/026-parallel-model-download/data-model.md 「순수 함수 시그니처」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **전부 순수 함수다.** `Date`·난수·파일을 쓰지 않고 인자만 본다 — 023의 `select.ts`,
 * 020의 `src/schedule/` 판정 함수와 같은 성격이다. 그 덕에 구간 나누기·재개 계산·진행
 * 병합·완료 판정 전체가 기기 없이 검증된다.
 *
 * **`Character`를 import하지 않는다** (FR-019). 자산키·바이트·구간만 다룬다 —
 * `checkSegmentedFile`이 이 경계를 잠근다.
 *
 * **속도를 재지 않는다** (원칙 IV). 진행률은 `mergeProgress`가 낸 `fraction` 하나뿐이며,
 * 003의 `fractionOf`와 같은 규칙("모름을 지어내지 않는다")을 따른다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Segment, SegmentPlan, SegmentedResume } from "./types";

/**
 * 파일 하나를 몇 구간으로 나눌 것인가.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 값은 사람이 정한 것이지 계산이 아니다** (원칙 V, FR-012). 012의
 * `USER_VISIBLE_SIGNAL_AXES`, 021의 `PERMISSION_REQUIREMENTS`, 023의 `BUCKET_COUNT`가
 * 같은 방식으로 못박은 상수다. 코드가 파일 크기·네트워크 상태를 보고 개수를 정하면
 * 그것이 임계값이고 원칙 IV로 가는 길이다.
 *
 * **실기기 확인 (2026-08-31, SM-S901N / Galaxy S22, Android 16, WiFi 5GHz)**: 4구간
 * 병렬이 정상 동작했다 — `state.json`의 재개 상태에 `receivedBytes: [185M, 185M,
 * 185M, 185M]`처럼 4구간이 균등하게 채워졌고, HF CDN이 리다이렉트 후 Range·
 * Content-Length를 유지해(§2) 로스터 5개 모델 전부 세그먼트 경로를 탄다. 세그먼트
 * 병렬로 받은 파일의 md5가 로스터와 정확히 일치(a3). **상수를 바꿀 이유가 없어
 * 유지한다.** 켬/끔 벽시계 A/B 정밀 측정은 미실시(findings.md §3).
 *
 * **왜 4인가** (research.md §3): 모바일 네트워크에서 4~8 병렬이 처리량 이득의 대부분을
 * 준다. 동시 다운로드 상한이 없으므로(FR-002) 6모델 × 4 = 24 커넥션이 실질 상한 —
 * 안드로이드/OkHttp 커넥션 풀(호스트당 5, 전체 64)과 CDN이 감당 가능한 범위. 8로
 * 올리면 48 커넥션이라 스로틀·소켓 고갈 위험.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const SEGMENT_COUNT = 4;

/**
 * 이보다 작은 구간은 만들지 않는다.
 *
 * **이 값도 사람이 정한 상수다** (원칙 V, FR-013). 파일이 `MIN_SEGMENT_BYTES * 2`보다
 * 작으면 구간으로 쪼개지 않고 단일 스트림으로 받는다 — 구간 수는 1 또는 `SEGMENT_COUNT`
 * 둘 중 하나이며 중간 값을 만들지 않는다.
 *
 * **왜 8MiB인가** (research.md §3): 이보다 작은 조각은 요청 오버헤드가 전송 시간을
 * 앞질러 병렬 이득이 사라진다. 로스터의 가장 작은 모델(gemma3-1b, 806MB)도 8MiB로
 * 나누면 100구간이 넘으므로, 이 상수는 "파일이 극단적으로 작을 때"의 안전장치이며
 * 로스터 모델에서는 dead path에 가깝다 — 그래도 상수로 둔다(로스터가 바뀔 수 있고,
 * 원칙 V가 "코드가 판정하지 않는다"를 요구한다).
 *
 * **실기기 확인 (2026-08-31, SM-S901N)**: 로스터 5개 모델 전부 이 하한을 훌쩍 넘어
 * 세그먼트 경로를 탔다 — 이 상수는 예상대로 dead path에 가깝고 값을 바꿀 이유가 없다.
 */
export const MIN_SEGMENT_BYTES = 8 * 1024 * 1024;

/**
 * 전체 크기를 구간들로 나눈다.
 *
 * | 입력 | 출력 |
 * | --- | --- |
 * | `totalBytes <= 0` | `{ totalBytes, segments: [] }` — 호출자가 폴백 |
 * | `totalBytes < MIN_SEGMENT_BYTES * 2` | 단일 구간 |
 * | 그 외 | `count` 구간, 균등 분할, 나머지 바이트는 마지막 구간에 |
 *
 * `count`의 기본값은 `SEGMENT_COUNT` 상수 — 파일 크기로 계산하지 않는다.
 */
export function planSegments(totalBytes: number, count: number = SEGMENT_COUNT): SegmentPlan {
  if (totalBytes <= 0) {
    return { totalBytes, segments: [] };
  }

  // 작은 파일은 쪼개지 않는다 (FR-013). 구간 수는 1 아니면 SEGMENT_COUNT.
  const effectiveCount = totalBytes < MIN_SEGMENT_BYTES * 2 ? 1 : count;

  const base = Math.floor(totalBytes / effectiveCount);
  const segments: Segment[] = [];

  for (let i = 0; i < effectiveCount; i++) {
    const start = i * base;
    // 마지막 구간이 나머지 바이트를 가져간다.
    const end = i === effectiveCount - 1 ? totalBytes - 1 : start + base - 1;
    segments.push({ index: i, start, end });
  }

  return { totalBytes, segments };
}

/**
 * 재개 시 각 구간의 남은 Range를 계산한다.
 *
 * 저장된 `totalBytes`·`segmentCount`로 계획을 복원하고, 각 구간 i에 대해:
 *  - `receivedBytes[i] >= 구간 크기` → **제외** (완료)
 *  - 아니면 `start`를 `receivedBytes[i]`만큼 밀어 남은 Range를 만든다
 */
export function remainingSegments(resume: SegmentedResume): Segment[] {
  const plan = planSegments(resume.totalBytes, resume.segmentCount);

  const remaining: Segment[] = [];
  for (const segment of plan.segments) {
    const size = segment.end - segment.start + 1;
    const received = resume.receivedBytes[segment.index] ?? 0;
    if (received >= size) continue; // 완료
    remaining.push({
      index: segment.index,
      start: segment.start + received,
      end: segment.end,
    });
  }

  return remaining;
}

/**
 * 구간별 받은 바이트를 하나의 진행률로 합친다.
 *
 * **`totalBytes <= 0`이면 `null`** — 003의 `fractionOf`와 같은 규칙. 모름을 지어내지
 * 않는다 (원칙 V).
 */
export function mergeProgress(receivedBytes: number[], totalBytes: number): number | null {
  if (totalBytes <= 0) return null;
  const sum = receivedBytes.reduce((n, b) => n + b, 0);
  return Math.min(1, sum / totalBytes);
}

/** 모든 구간이 자기 크기만큼 받았는가. */
export function isComplete(receivedBytes: number[], plan: SegmentPlan): boolean {
  return plan.segments.every((segment) => {
    const size = segment.end - segment.start + 1;
    return (receivedBytes[segment.index] ?? 0) >= size;
  });
}

/**
 * 이 자산이 앞으로 더 받아야 하는 바이트.
 *
 * `acquisition.ts`의 동시 공간 판정(§6)이 쓴다 — "이미 받는 중인 것들의 남은 용량"을
 * 여유에서 빼기 위해. 밖으로 나가지 않는다.
 */
export function remainingCapacity(expectedBytes: number, receivedSoFar: number): number {
  return Math.max(0, expectedBytes - receivedSoFar);
}
