/**
 * 재개 기록과 파일이 맞는지 본다 (113, FR-006).
 *
 * **순수 함수다** — 파일을 안에서 읽지 않고 인자만 본다(`readiness.ts`와 같은 이유).
 *
 * 이 판정은 **크기로 볼 수 있는 어긋남만** 잡는다. 구간 데이터가 실제로 파일에 있는지는
 * 보장하지 않는다 — 기기 전원이 꺼져 데이터가 디스크에 닿지 못했는데 기록만 남았다면 여기를
 * 지나고, 마지막 안전망인 최종 지문 검증이 잡아 처음부터 다시 받는다. 앱이 죽은 것은 OS
 * 캐시가 남아 해당하지 않는다.
 */

import type { FileFacts } from "./port";
import { planSegments } from "./segmented/plan";
import type { SegmentedResume } from "./segmented/types";

/**
 * 이 기록으로 이어받아도 되는가.
 *
 * 맞으려면 모두 만족해야 한다:
 *  1. `segmentCount`가 `planSegments(totalBytes)`의 구간 수와 같다.
 *  2. 기준 크기가 있으면(`expectedBytes > 0`) 기록의 `totalBytes`와 같다.
 *  3. 최종 파일이 있고, 크기가 **끝난 구간 중 가장 뒤 구간의 end + 1** 이상 `totalBytes` 이하다
 *     (구간은 제 오프셋에 쓰이므로 순서대로 끝나지 않아 크기가 전체와 같다고 요구할 수 없다).
 *  4. `doneIndices`가 구간 범위 안이다.
 */
export function isResumeConsistent(
  resume: SegmentedResume,
  file: FileFacts,
  expectedBytes: number,
): boolean {
  const plan = planSegments(resume.totalBytes);
  if (plan.segments.length !== resume.segmentCount) return false;
  if (expectedBytes > 0 && expectedBytes !== resume.totalBytes) return false;
  if (!file.exists || file.bytes === null) return false;
  if (file.bytes > resume.totalBytes) return false;

  let minimumBytes = 0;
  for (const index of resume.doneIndices) {
    const segment = plan.segments[index];
    if (segment === undefined) return false;
    minimumBytes = Math.max(minimumBytes, segment.end + 1);
  }
  return file.bytes >= minimumBytes;
}
