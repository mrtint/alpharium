/**
 * 환경 → 허용 추론 위치 규칙.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/environment.md
 *
 * **이 파일이 헌법 원칙 I의 방어선이다.**
 * dev·prod에서 desktop-server가 허용되지 않는다는 규칙이 여기 한 곳에만 있으므로,
 * 이 파일의 테스트로 FR-012를 검증할 수 있다. 규칙을 다른 곳에 복제하지 않는다.
 *
 * 순수 함수로 유지한다 — 기기·네트워크·파일 없이 테스트할 수 있어야 한다(FR-021c).
 */

import type { Environment } from "./types";
import type { InferenceLocation } from "../inference/types";

/** 환경별 허용되는 추론 위치. dev·prod에 desktop-server가 없는 것이 핵심이다. */
const ALLOWED: Record<Environment, readonly InferenceLocation[]> = {
  // 시뮬레이터에는 네이티브 모듈이 없어 서버를 쓰지만,
  // 실기기를 붙였을 때 온디바이스로 확인할 길을 막지 않는다(FR-011).
  local: ["desktop-server", "on-device"],
  dev: ["on-device"],
  prod: ["on-device"],
};

/** 환경별 기본 추론 위치(FR-010). */
const DEFAULTS: Record<Environment, InferenceLocation> = {
  local: "desktop-server",
  dev: "on-device",
  prod: "on-device",
};

/** 요청이 없을 때 쓰는 추론 위치. */
export function defaultLocationFor(env: Environment): InferenceLocation {
  return DEFAULTS[env];
}

/**
 * 이 환경에서 이 추론 위치가 허용되는가.
 *
 * dev·prod × desktop-server = false 가 헌법 원칙 I이 타협 불가로 못 박은 지점이다.
 */
export function isLocationAllowed(env: Environment, loc: InferenceLocation): boolean {
  return ALLOWED[env].includes(loc);
}
