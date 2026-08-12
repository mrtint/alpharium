/**
 * 환경 판정 타입.
 *
 * 헌법 원칙 I: 추론은 사용자의 기기에서 돈다. 환경은 추론 위치의 허용 범위를 결정한다.
 * 계약: specs/001-project-skeleton-setup/contracts/environment.md
 */

/** local: 개발자 기계(시뮬레이터) / dev: 실기기 개발 빌드 / prod: 배포 빌드 */
export type Environment = "local" | "dev" | "prod";

/** 환경 판정에 실패한 까닭. missing은 값이 없음, unknown은 아는 값이 아님. */
export type EnvironmentFailure = "missing" | "unknown";

/**
 * 환경 판정 결과.
 *
 * 실패를 예외가 아니라 값으로 표현한다. 무엇을 받았는지(`received`)를 함께 남겨야
 * 진단에서 원인을 알 수 있다(FR-009b).
 */
export type EnvironmentResolution =
  | { ok: true; environment: Environment }
  | { ok: false; reason: EnvironmentFailure; received: string | undefined };

/** 판정에 성공한 환경 값 전체. 순회와 검증에 쓴다. */
export const ENVIRONMENTS: readonly Environment[] = ["local", "dev", "prod"] as const;
