/**
 * 환경 판정.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/environment.md
 *
 * **저장소에서 EXPO_PUBLIC_APP_ENV를 읽는 유일한 곳이다(FR-009a).**
 * 다른 모듈이 환경 변수를 다시 읽으면 단일 판정이 무너진다.
 */

import { ENVIRONMENTS, type Environment, type EnvironmentResolution } from "./types";

const isEnvironment = (value: string): value is Environment =>
  (ENVIRONMENTS as readonly string[]).includes(value);

/**
 * 원시 값을 환경으로 판정한다.
 *
 * 입력을 인자로 받는다 — 함수 안에서 process.env를 읽지 않아야 테스트가 전역 상태를
 * 건드리지 않는다.
 *
 * 대소문자와 공백을 관대하게 처리하지 않는다. 관대하면 설정 오타가 조용히 통과하고,
 * FR-009b가 막으려는 "모르는 채로 진행"이 발생한다.
 *
 * 판정에 실패해도 기본값으로 떨어지지 않는다. local이든 prod든, 어느 쪽으로 떨어지든
 * 모르는 상태에서 진행하는 것이기 때문이다.
 */
export function resolveEnvironment(raw: string | undefined): EnvironmentResolution {
  if (raw === undefined || raw === "") {
    return { ok: false, reason: "missing", received: raw };
  }

  if (!isEnvironment(raw)) {
    return { ok: false, reason: "unknown", received: raw };
  }

  return { ok: true, environment: raw };
}

/**
 * 실행 중인 앱의 환경을 판정한다.
 *
 * process.env를 읽는 진입점이며, 이 파일 밖에서는 읽지 않는다.
 * EXPO_PUBLIC_ 접두사가 붙은 값만 클라이언트 런타임에서 읽을 수 있다.
 */
export function currentEnvironment(): EnvironmentResolution {
  return resolveEnvironment(process.env.EXPO_PUBLIC_APP_ENV);
}

/**
 * 데스크톱 추론 서버 주소.
 *
 * local 설정에만 존재하는 키다(FR-014). dev·prod에서는 undefined이며, 그 환경에서는
 * 애초에 서버 어댑터가 선택되지 않으므로 쓰이지 않는다.
 */
export function desktopInferenceUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_DESKTOP_INFERENCE_URL;
}
