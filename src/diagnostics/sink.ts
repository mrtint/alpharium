/**
 * 진단 정보의 출력 경로.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/diagnostics.md
 */

import type { EnvironmentResolution } from "../config/types";
import type { Sink } from "./types";

/**
 * 이 환경에서 진단 정보가 어디로 나가는가(FR-007a).
 *
 * 불변식:
 *  1. 모든 경우에 "log"가 포함된다. prod에서 화면에 드러내지 않는 것이 남기지 않는다는
 *     뜻은 아니다(FR-007b).
 *  2. prod에서만 "screen"이 빠진다(SC-013).
 *
 * 판정에 실패했을 때 화면에 보이는 것은 의도적 선택이다. "모르면 가장 조용한 쪽"이
 * 안전해 보이지만, 그러면 배포본에서 환경 설정이 깨졌을 때 아무도 모른 채 추론 위치가
 * 불명인 앱이 돌아간다. 헌법 원칙 V가 관측하지 못한 것을 관측한 것처럼 다루지 말라고
 * 요구한다.
 */
export function sinksFor(resolution: EnvironmentResolution): Sink[] {
  if (!resolution.ok) {
    return ["screen", "log"];
  }

  return resolution.environment === "prod" ? ["log"] : ["screen", "log"];
}

/** 진단 정보를 화면에 보여도 되는가. */
export function showsOnScreen(resolution: EnvironmentResolution): boolean {
  return sinksFor(resolution).includes("screen");
}
