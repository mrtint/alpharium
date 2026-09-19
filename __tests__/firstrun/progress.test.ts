import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveFirstRunStage } from "../../src/firstrun/progress";

/**
 * 첫 실행 단계 판정의 계약 테스트 (040, ★ 045가 우선순위 재작성).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C1~C4
 *
 * 순수 함수이며 `now`/`Date`/파일 접근을 쓰지 않는다(`day-boundary.ts`·
 * `onboarding/decision.ts`·`welcome/decision.ts`와 같은 규칙).
 *
 * `downloadProceedConfirmed`는 구현 중 발견한 spec 갭 보강이다 —
 * `downloadReady`가 true가 되는 즉시 `"naming"`으로 넘어가면
 * `DownloadProgressScreen`의 완료 화면 버튼이 누를 틈도 없이 사라진다.
 */

const SOURCE = readFileSync(join(__dirname, "../../src/firstrun/progress.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

const BASE = {
  onboardingNeeded: false,
  onboardingStarted: true,
  downloadConsented: false,
  downloadReady: false,
  downloadProceedConfirmed: false,
  namingDone: false,
  livenessOutcome: null as null,
};

describe("우선순위 판정 7가지 (045 순서)", () => {
  it("1. 온보딩이 필요하고 아직 스텝이 시작 안 됨 → logo", () => {
    expect(
      resolveFirstRunStage({ ...BASE, onboardingNeeded: true, onboardingStarted: false }),
    ).toBe("logo");
  });

  it("2. 온보딩이 필요하고 이미 시작됨 → onboarding", () => {
    expect(resolveFirstRunStage({ ...BASE, onboardingNeeded: true, onboardingStarted: true })).toBe(
      "onboarding",
    );
  });

  it("3. 온보딩 끝났지만 동의도 다운로드도 안 됨 → download-consent (C2)", () => {
    expect(resolveFirstRunStage({ ...BASE, downloadConsented: false, downloadReady: false })).toBe(
      "download-consent",
    );
  });

  it("4. 동의는 했지만 다운로드 미완료 → downloading", () => {
    expect(resolveFirstRunStage({ ...BASE, downloadConsented: true, downloadReady: false })).toBe(
      "downloading",
    );
  });

  it("4a. 다운로드는 완료됐지만 완료 화면 버튼을 아직 안 눌렀다 → downloading", () => {
    expect(
      resolveFirstRunStage({
        ...BASE,
        downloadConsented: true,
        downloadReady: true,
        downloadProceedConfirmed: false,
      }),
    ).toBe("downloading");
  });

  it("5. 다운로드 완료 + 완료 화면 버튼도 눌렀지만 작명 미완 → naming", () => {
    expect(
      resolveFirstRunStage({
        ...BASE,
        downloadConsented: true,
        downloadReady: true,
        downloadProceedConfirmed: true,
        namingDone: false,
      }),
    ).toBe("naming");
  });

  it("6. 작명·다운로드 완료, liveness 아직 통과 안 함 → liveness", () => {
    const afterNaming = {
      ...BASE,
      downloadConsented: true,
      downloadReady: true,
      downloadProceedConfirmed: true,
      namingDone: true,
    };
    expect(resolveFirstRunStage({ ...afterNaming, livenessOutcome: null })).toBe("liveness");
    expect(resolveFirstRunStage({ ...afterNaming, livenessOutcome: "pending" })).toBe("liveness");
    expect(resolveFirstRunStage({ ...afterNaming, livenessOutcome: "failed" })).toBe("liveness");
  });

  it("7. 그 외 — 다운로드·작명·liveness 모두 통과 → done", () => {
    expect(
      resolveFirstRunStage({
        ...BASE,
        downloadConsented: true,
        downloadReady: true,
        downloadProceedConfirmed: true,
        namingDone: true,
        livenessOutcome: "ok",
      }),
    ).toBe("done");
  });
});

describe("G2 — 되돌아가지 않음 불변식 (040 계승)", () => {
  it("onboardingNeeded: false 고정, 나머지 임의 조합에서 logo/onboarding이 나오지 않는다", () => {
    for (const downloadConsented of [true, false]) {
      for (const downloadReady of [true, false]) {
        for (const downloadProceedConfirmed of [true, false]) {
          for (const namingDone of [true, false]) {
            for (const livenessOutcome of [null, "pending", "ok", "failed"] as const) {
              const stage = resolveFirstRunStage({
                onboardingNeeded: false,
                onboardingStarted: true,
                downloadConsented,
                downloadReady,
                downloadProceedConfirmed,
                namingDone,
                livenessOutcome,
              });
              expect(stage).not.toBe("logo");
              expect(stage).not.toBe("onboarding");
            }
          }
        }
      }
    }
  });
});

describe("C2 — 동의·다운로드는 작명보다 먼저다 (040 G4를 대체)", () => {
  it("downloadConsented: false, downloadReady: false, namingDone: false → naming이 아니라 download-consent", () => {
    const stage = resolveFirstRunStage({ ...BASE });
    expect(stage).toBe("download-consent");
    expect(stage).not.toBe("naming");
  });

  it("namingDone: true여도 downloadReady: false인 동안은 naming으로 가지 않는다 (모순 입력 방어, SC-003)", () => {
    // 040은 반대로 "다운로드 안 끝나도 작명 먼저"였다 — 045는 이 우선순위를
    // 뒤집었으므로, 작명이 이미 끝난 것으로 표시된 모순 입력에서도
    // 다운로드 미완료가 우선한다.
    const stage = resolveFirstRunStage({
      ...BASE,
      downloadConsented: true,
      downloadReady: false,
      namingDone: true,
    });
    expect(stage).toBe("downloading");
    expect(stage).not.toBe("naming");
  });
});

describe("C3 — 이미 준비된 사용자는 동의 화면을 보지 않는다", () => {
  it("downloadReady: true면 downloadConsented 값과 무관하게 download-consent가 나오지 않는다", () => {
    for (const downloadConsented of [true, false]) {
      for (const namingDone of [true, false]) {
        const stage = resolveFirstRunStage({
          onboardingNeeded: false,
          onboardingStarted: true,
          downloadConsented,
          downloadReady: true,
          downloadProceedConfirmed: true,
          namingDone,
          livenessOutcome: namingDone ? "ok" : null,
        });
        expect(stage).not.toBe("download-consent");
      }
    }
  });
});

describe("C4 — liveness는 여전히 작명 이후에만 (040 G5 계승)", () => {
  it("namingDone: false면 livenessOutcome 값과 무관하게 liveness가 나오지 않는다", () => {
    for (const livenessOutcome of [null, "pending", "ok", "failed"] as const) {
      const stage = resolveFirstRunStage({
        ...BASE,
        downloadConsented: true,
        downloadReady: true,
        downloadProceedConfirmed: true,
        namingDone: false,
        livenessOutcome,
      });
      expect(stage).not.toBe("liveness");
    }
  });
});

describe("G1 — 순수 함수다", () => {
  it("같은 입력에 같은 출력", () => {
    const input = {
      ...BASE,
      downloadConsented: true,
      downloadReady: true,
      downloadProceedConfirmed: true,
      namingDone: true,
      livenessOutcome: "ok" as const,
    };
    expect(resolveFirstRunStage(input)).toBe(resolveFirstRunStage(input));
  });

  it("Date.now()·난수·파일을 읽지 않는다", () => {
    expect(SOURCE).not.toMatch(/new Date\(|Date\.now|Math\.random|readFile|expo-file-system/);
  });
});

describe("FR-011 — 재시작 이어가기: 실시간 재판정으로 이미 충족됨", () => {
  it("같은 입력을 다시 넣어도 이미 지난 단계로 되돌아가지 않는다(멱등)", () => {
    const afterConsent = { ...BASE, downloadConsented: true };
    // 앱을 재시작해도(=새 호출) 같은 입력이면 같은 단계 — downloading에서
    // download-consent로 되돌아가지 않는다.
    expect(resolveFirstRunStage(afterConsent)).toBe("downloading");
    expect(resolveFirstRunStage(afterConsent)).toBe("downloading");
  });
});

describe("FR-010/SC-005 — 이미 온보딩을 마친 기존 사용자에게 재노출되지 않는다", () => {
  it("완료된 사용자(동의·다운로드·작명·liveness 전부 통과)는 매 재계산에서 항상 done", () => {
    const completedUser = {
      onboardingNeeded: false,
      onboardingStarted: true,
      downloadConsented: true,
      downloadReady: true,
      downloadProceedConfirmed: true,
      namingDone: true,
      livenessOutcome: "ok" as const,
    };
    // 여러 번(예: 앱 업데이트 후 재실행 시뮬레이션) 재계산해도 항상 done —
    // logo/onboarding/download-consent/downloading/naming/liveness로 절대
    // 안 돌아간다.
    for (let i = 0; i < 5; i += 1) {
      expect(resolveFirstRunStage(completedUser)).toBe("done");
    }
  });

  it("onboardingNeeded가 애초에 false(021 completed===true)면 onboardingStarted 값과 무관하게 logo가 안 나온다", () => {
    for (const onboardingStarted of [true, false]) {
      const stage = resolveFirstRunStage({
        onboardingNeeded: false,
        onboardingStarted,
        downloadConsented: true,
        downloadReady: true,
        downloadProceedConfirmed: true,
        namingDone: true,
        livenessOutcome: "ok",
      });
      expect(stage).toBe("done");
    }
  });
});
