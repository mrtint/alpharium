/**
 * 결과를 두 겹으로 낸다 (FR-018a·018b, 명확화 Q3).
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/cli.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **에이전트가 부르므로 오독할 수 없는 모양이어야 한다** (명확화 Q2).
 *
 * 사람이라면 「어 이상한데」 하고 멈출 자리를 에이전트는 그냥 지나쳐 다음 단계로 간다.
 * 그래서:
 *
 *  1. **표준 출력의 마지막 줄이 항상 JSON 한 줄이다** — 성공이든 실패든
 *  2. 그 앞은 사람이 읽는 문장이며 기계가 읽지 않는다
 *  3. **종료 코드가 성공과 실패를 가른다**(FR-018a)
 *
 * `run-device-tests.mjs`가 이미 같은 결이다(`PASSED`/`FAILED` + 종료 코드).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FailureReason } from "./plan.ts";

/**
 * 에이전트가 읽는 것.
 *
 * **⚠️ 지표를 담지 않는다**(헌법 원칙 IV). `elapsedMs`·`durationMs`·`speed` 같은
 * 자리를 두면 그것이 측정의 시작이고, 「어느 모양이 더 빠른가」가 뒤따른다.
 * `__tests__/seed/result.test.ts`가 **이 선언을 직접 읽어** 그것을 막는다.
 */
export type RunResult =
  | {
      ok: true;
      day: string;
      shape: string;
      /** 이번에 심은 수 */
      seeded: number;
      /** 그중 좌표가 박힌 수 */
      withLocation: number;
      /** ★ 심기 전부터 폴더에 있던 수 (FR-011b) */
      existing: number;
    }
  | { ok: false; reason: FailureReason; detail: string };

/** 종료 코드 (FR-018a, contracts/cli.md) */
export const EXIT_OK = 0;
export const EXIT_FAILED = 1;
/** **실패했고 치우다가 또 실패했다** — 기기가 어긋난 채로 남았다 */
export const EXIT_DIRTY = 2;

/**
 * 결과를 찍는다. **마지막 줄이 JSON이다.**
 *
 * `lines`는 사람이 읽는 것이고, 없어도 된다. **JSON 줄을 먼저 찍고 뒤에 뭔가를 더
 * 찍으면 안 된다** — 마지막 줄이 JSON이 아니게 되어 에이전트가 읽지 못한다.
 */
export function report(result: RunResult, lines: string[] = []): void {
  for (const line of lines) console.log(line);
  console.log(JSON.stringify(result));
}

/** 실패 하나를 만든다. 갈래와 까닭이 함께 다닌다(FR-019) */
export function failure(reason: FailureReason, detail: string): RunResult {
  return { ok: false, reason, detail };
}

/**
 * 결과를 사람이 읽는 문장으로 옮긴다.
 *
 * **남은 것이 있으면 반드시 말한다**(FR-011b) — 자동으로 치우지 않기로 했으므로
 * (명확화 Q4) 남은 것이 안 보이는 일이 없어야 한다. 008에서 받다 만 모델 셋이 기기에
 * 남았고 앱에서 치울 길이 없었던 것이 이 자리의 선례다.
 */
export function describeRun(result: RunResult): string[] {
  if (!result.ok) return [`실패: ${result.detail}`];

  const lines = [
    result.seeded === 0
      ? `${result.day}를 사진 0장인 하루로 두었다.`
      : `${result.day}에 ${result.seeded}장을 심었다 (좌표 ${result.withLocation}장).`,
  ];

  if (result.existing > 0) {
    lines.push(
      `⚠️ 심기 전부터 폴더에 ${result.existing}장이 있었다 — 앱에서 보이는 수가 다를 수 있다.`,
      `   치우려면: npm run seed:clear`,
    );
  }

  return lines;
}
