/**
 * T019 — 활동 소스 어댑터 (003 FR-247·FR-248)
 *
 * 내놓는 것은 **걸음 수(0시~관측 시점 누적)와 활동 시간대**뿐이다.
 * **분 단위 로그를 담지 않는다** — 걸음이 있었던 구간을 시간대로 옮기고 원본은 버린다.
 *
 * 관측하지 못하면 미관측으로 남긴다. 0으로 대신하지 않는다 (001 FR-010).
 */
import { observed, unobserved } from "../observation";
import { periodOfHour, type ActivityReading, type CollectionWindow, type DayPeriod } from "./source";
import { log } from "../../logging";

/** 만보계가 돌려주는 구간 하나. 이 자리에서만 존재하고 집계로 넘어가지 않는다. */
export interface StepSample {
  readonly hour: number;
  readonly steps: number;
}

export interface ActivityProvider {
  /** 0시부터 관측 시점까지의 걸음 표본. 거부·미지원이면 `null`. */
  readSteps(window: CollectionWindow): Promise<readonly StepSample[] | null>;
}

/** 걸음이 있었던 시간대만 남긴다. 분 단위는 여기서 사라진다 (003 FR-248). */
function activePeriodsOf(samples: readonly StepSample[]): readonly DayPeriod[] {
  const periods = new Set<DayPeriod>();
  for (const s of samples) {
    if (s.steps > 0) periods.add(periodOfHour(s.hour));
  }
  return [...periods];
}

export async function readActivity(
  window: CollectionWindow,
  provider: ActivityProvider,
): Promise<ActivityReading> {
  let samples: readonly StepSample[] | null;
  try {
    samples = await provider.readSteps(window);
  } catch (error) {
    // 소스 하나의 실패가 집계 전체를 막지 않는다 (003 FR-217).
    log.warn("활동 소스 읽기 실패 — 미관측으로 남긴다", {
      error: error instanceof Error ? error.name : "unknown",
    });
    samples = null;
  }

  if (samples === null) {
    return { steps: unobserved(), activePeriods: unobserved() };
  }

  return {
    steps: observed(samples.reduce((sum, s) => sum + s.steps, 0)),
    activePeriods: observed(activePeriodsOf(samples)),
  };
}

/**
 * `expo-sensors`의 만보계를 provider로 감싼다. 네이티브 접근은 이 자리에만 있다 —
 * 위 함수는 순수하므로 모델·기기 없이 검사할 수 있다.
 */
export function pedometerProvider(): ActivityProvider {
  return {
    async readSteps(window) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Pedometer } = require("expo-sensors") as typeof import("expo-sensors");

      if (!(await Pedometer.isAvailableAsync())) return null;

      const start = new Date(window.observedAt);
      start.setHours(0, 0, 0, 0);

      // 시간대 세분도까지만 읽는다 — 분 단위 표본을 만들지 않는다 (003 FR-248).
      const samples: StepSample[] = [];
      for (let hour = 0; hour <= window.observedAt.getHours(); hour++) {
        const from = new Date(start);
        from.setHours(hour);
        const to = new Date(start);
        to.setHours(hour + 1);
        const until = to > window.observedAt ? window.observedAt : to;
        if (from >= until) continue;

        const { steps } = await Pedometer.getStepCountAsync(from, until);
        samples.push({ hour, steps });
      }
      return samples;
    },
  };
}
