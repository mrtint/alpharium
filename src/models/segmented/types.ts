/**
 * 세그먼트 병렬 내려받기의 값 모양.
 *
 * 계약: specs/026-parallel-model-download/contracts/segmented-transfer.md
 *       specs/026-parallel-model-download/data-model.md 「신규 타입」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 타입들은 전부 「안쪽 값」이다** (003 types.ts의 경계). 화면으로 나가지 않는다.
 *
 * 밖으로 나가는 것은 003의 `DownloadProgress { character, fraction }` 하나뿐이며,
 * 세그먼트 개수·구간별 바이트가 그 타입에 들어갈 자리가 **타입 수준에서** 없다
 * (원칙 III·IV).
 *
 * **`Character`를 import하지 않는다** (FR-019). 세그먼트 계획은 자산키·바이트·구간만
 * 다룬다 — `checkSegmentedFile`이 이 경계를 잠근다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { AssetKey } from "../types";

/**
 * 한 구간. `planSegments()`가 결정론적으로 만든다.
 *
 * `start`·`end`는 HTTP `Range: bytes=start-end`와 같은 규약 — 둘 다 **포함**이다.
 * 구간 크기 = `end - start + 1`.
 */
export type Segment = {
  /** 0부터. 파일 내 순서 */
  index: number;
  /** 바이트 오프셋(포함) */
  start: number;
  /** 바이트 오프셋(포함) */
  end: number;
};

/**
 * 전체 파일을 구간들로 나눈 결과.
 *
 * **불변식** (`segmented-plan.test.ts`가 검사):
 *  - `segments[0].start === 0`
 *  - `segments[last].end === totalBytes - 1`
 *  - 인접 구간: `segments[i].end + 1 === segments[i+1].start` (빈틈·겹침 없음)
 *  - `segments.length === SEGMENT_COUNT` (파일이 작으면 `1`)
 */
export type SegmentPlan = {
  totalBytes: number;
  segments: Segment[];
};

/**
 * 받다 만 세그먼트 다운로드. **`state.json`에 저장되는 유일한 세그먼트 값**.
 *
 * 003의 `PausedDownload`(단일 스트림 재개)와 **한 자산당 상호배타** — `withSegmentedResume`가
 * 같은 키를 `paused`에서 제거하고, `withPaused`가 `segmented`에서 제거한다.
 *
 * **저장하지 않는 것**: 구간 오프셋(`planSegments(totalBytes, segmentCount)`로 재구성).
 * 경과 시간·속도(원칙 IV). `url`(로스터가 준다).
 *
 * **`totalBytes`·`segmentCount`를 저장하는 이유**: 재개 시 로스터/서버 값이 바뀌었으면
 * 재개 계획이 어긋나므로, 저장 당시 값으로 계획을 복원하고 최종 지문 검증이 어긋남을
 * 잡는다(FR-024).
 */
export type SegmentedResume = {
  assetKey: AssetKey;
  /** 재개 계획을 복원하는 데 필요 */
  totalBytes: number;
  /** 저장 당시의 구간 수. `SEGMENT_COUNT`가 나중에 바뀌어도 재개는 이 값으로 */
  segmentCount: number;
  /** 길이 = `segmentCount`. `receivedBytes[i]` = 구간 i가 이미 받은 바이트 */
  receivedBytes: number[];
};

/**
 * 서버가 구간 요청을 지원하는지 탐지한 결과. 밖으로 나가지 않는다.
 *
 * **애매하면 `unsupported`다** (원칙 V) — `Accept-Ranges` 헤더가 없거나,
 * `Content-Length`가 없거나, 리다이렉트 후 헤더가 불분명하면 폴백한다.
 */
export type RangeSupport = { kind: "supported"; totalBytes: number } | { kind: "unsupported" };
