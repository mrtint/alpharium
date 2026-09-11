import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveFirstRunStage } from "../../src/firstrun/progress";

/**
 * 첫 실행 단계 판정의 계약 테스트 (040).
 *
 * 계약: specs/040-onboarding-parallel-setup/data-model.md `FirstRunStage`
 *       contracts/first-run-gate.md G1·G2·G4·G5
 *       tasks.md T004
 *
 * 순수 함수이며 `now`/`Date`/파일 접근을 쓰지 않는다(`day-boundary.ts`·
 * `onboarding/decision.ts`·`welcome/decision.ts`와 같은 규칙).
 */

const SOURCE = readFileSync(join(__dirname, "../../src/firstrun/progress.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

const BASE = {
  onboardingNeeded: false,
  onboardingStarted: true,
  namingDone: false,
  downloadReady: false,
  livenessOutcome: null as null,
};

describe("우선순위 판정 6가지", () => {
  it("1. 온보딩이 필요하고 아직 스텝이 시작 안 됨 → logo", () => {
    expect(
      resolveFirstRunStage({ ...BASE, onboardingNeeded: true, onboardingStarted: false }),
    ).toBe("logo");
  });

  it("2. 온보딩이 필요하고 이미 시작됨 → onboarding", () => {
    expect(
      resolveFirstRunStage({ ...BASE, onboardingNeeded: true, onboardingStarted: true }),
    ).toBe("onboarding");
  });

  it("3. 온보딩 끝났지만 작명 미완 → naming (다운로드 상태 무관)", () => {
    expect(resolveFirstRunStage({ ...BASE, namingDone: false, downloadReady: false })).toBe(
      "naming",
    );
    expect(resolveFirstRunStage({ ...BASE, namingDone: false, downloadReady: true })).toBe(
      "naming",
    );
  });

  it("4. 작명 완료, 다운로드 미완료 → waiting-for-download", () => {
    expect(resolveFirstRunStage({ ...BASE, namingDone: true, downloadReady: false })).toBe(
      "waiting-for-download",
    );
  });

  it("5. 작명·다운로드 완료, liveness 아직 통과 안 함 → liveness", () => {
    expect(
      resolveFirstRunStage({
        ...BASE,
        namingDone: true,
        downloadReady: true,
        livenessOutcome: null,
      }),
    ).toBe("liveness");
    expect(
      resolveFirstRunStage({
        ...BASE,
        namingDone: true,
        downloadReady: true,
        livenessOutcome: "pending",
      }),
    ).toBe("liveness");
    expect(
      resolveFirstRunStage({
        ...BASE,
        namingDone: true,
        downloadReady: true,
        livenessOutcome: "failed",
      }),
    ).toBe("liveness");
  });

  it("6. 그 외 — 작명·다운로드·liveness 모두 통과 → done", () => {
    expect(
      resolveFirstRunStage({
        ...BASE,
        namingDone: true,
        downloadReady: true,
        livenessOutcome: "ok",
      }),
    ).toBe("done");
  });
});

describe("G2 — 되돌아가지 않음 불변식", () => {
  it("onboardingNeeded: false 고정, 나머지 임의 조합에서 logo/onboarding이 나오지 않는다", () => {
    for (const onboardingStarted of [true, false]) {
      for (const namingDone of [true, false]) {
        for (const downloadReady of [true, false]) {
          for (const livenessOutcome of [null, "pending", "ok", "failed"] as const) {
            const stage = resolveFirstRunStage({
              onboardingNeeded: false,
              onboardingStarted,
              namingDone,
              downloadReady,
              livenessOutcome,
            });
            expect(stage).not.toBe("logo");
            expect(stage).not.toBe("onboarding");
          }
        }
      }
    }
  });
});

describe("G4 — 작명은 다운로드 완료를 기다리지 않는다", () => {
  it("downloadReady: true로 바꿔도 namingDone: false인 동안은 여전히 naming", () => {
    expect(
      resolveFirstRunStage({
        onboardingNeeded: false,
        onboardingStarted: true,
        namingDone: false,
        downloadReady: true,
        livenessOutcome: null,
      }),
    ).toBe("naming");
  });
});

describe("G1 — 순수 함수다", () => {
  it("같은 입력에 같은 출력", () => {
    const input = { ...BASE, namingDone: true, downloadReady: true, livenessOutcome: "ok" as const };
    expect(resolveFirstRunStage(input)).toBe(resolveFirstRunStage(input));
  });

  it("Date.now()·난수·파일을 읽지 않는다", () => {
    expect(SOURCE).not.toMatch(/new Date\(|Date\.now|Math\.random|readFile|expo-file-system/);
  });
});

describe("FR-011 — 재시작 이어가기: 실시간 재판정으로 이미 충족됨", () => {
  it("같은 입력을 다시 넣어도 이미 지난 단계로 되돌아가지 않는다(멱등)", () => {
    const afterNaming = {
      onboardingNeeded: false,
      onboardingStarted: true,
      namingDone: true,
      downloadReady: false,
      livenessOutcome: null as null,
    };
    // 앱을 재시작해도(=새 호출) 같은 입력이면 같은 단계 — waiting-for-download에서
    // naming으로 되돌아가지 않는다.
    expect(resolveFirstRunStage(afterNaming)).toBe("waiting-for-download");
    expect(resolveFirstRunStage(afterNaming)).toBe("waiting-for-download");
  });
});
