/**
 * T004 — 어댑터 선택 지점 (헌법 원칙 III·I)
 *
 * **엔진 교체는 이 파일 한 곳의 변경으로 끝나야 한다** (원칙 III).
 *
 * 클라우드 어댑터의 `import`가 **빌드 시점 조건 안**에 있다 — Metro는
 * `process.env.EXPO_PUBLIC_*`를 번들 시점에 상수로 치환하므로, 프로덕션 빌드에서는
 * 이 가지가 죽은 코드가 되어 어댑터가 번들에 포함되지 않는다 (원칙 I MUST NOT).
 * 최상단에서 무조건 `import`하면 이 보장이 깨진다.
 */
import type { AIEngine } from "../engine";

export type AiMode = "CLOUD" | "ON_DEVICE";

export function currentMode(): AiMode {
  return process.env.EXPO_PUBLIC_AI_MODE === "CLOUD" ? "CLOUD" : "ON_DEVICE";
}

/** 클라우드 모드인가 — 006 FR-590의 표시가 이것을 쓴다. */
export function isCloudMode(): boolean {
  return currentMode() === "CLOUD";
}

export function selectEngine(): AIEngine {
  if (process.env.EXPO_PUBLIC_AI_MODE === "CLOUD") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CloudEngine } = require("./cloud") as typeof import("./cloud");
    return new CloudEngine();
  }

  // 온디바이스 어댑터는 아직 이식되지 않았다. 헌법 원칙 II에 따라 **대체 문장으로
  // 메우지 않고** 실패로 둔다 — 여기에 mock을 놓는 것이 원칙 II의 핵심 위반이다.
  throw new Error(
    "온디바이스 어댑터가 아직 없다. 개발 중에는 EXPO_PUBLIC_AI_MODE=CLOUD로 실행한다 (헌법 원칙 I 개발 예외)",
  );
}
