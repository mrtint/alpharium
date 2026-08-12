/**
 * 진단 보고 타입.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/diagnostics.md
 *
 * 헌법 원칙 III — 모델 식별자·파라미터 수·양자화 방식을 싣지 않는다. 이 기능은 모델을
 * 다루지 않으므로 실을 것도 없지만, 다음 기능에서 추가되지 않도록 여기에 못 박는다.
 *
 * 헌법 원칙 IV — 이 타입에 추론 속도·출력 점수·모델 비교 필드를 넣지 않는다.
 * 진단은 상태를 보여줄 뿐 품질을 재지 않는다.
 */

import type { EnvironmentResolution } from "../config/types";
import type { InferenceLocation, ModuleStatus, SelectionFailure } from "../inference/types";

/** 진단 정보가 나가는 곳. */
export type Sink = "screen" | "log";

/** 추론 위치 선택 결과. */
export type LocationSelection =
  | { ok: true; location: InferenceLocation }
  | {
      ok: false;
      reason: SelectionFailure;
      requested?: InferenceLocation;
    };

/** 발생한 실패 하나. */
export type Failure = {
  what: string;
  reason: string;
};

/** 개발자가 지금 상태를 확인하는 값의 묶음(FR-017). */
export type DiagnosticReport = {
  environment: EnvironmentResolution;
  inferenceLocation: LocationSelection;
  moduleStatus: ModuleStatus;
  failures: Failure[];
};
