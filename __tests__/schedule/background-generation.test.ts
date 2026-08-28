import { readFileSync } from "node:fs";
import { join } from "node:path";

import { runAutoDiaryTask, AUTO_DIARY_TASK_NAME } from "../../src/schedule/task";
import type { AutoDiarySettings } from "../../src/schedule/settings";

/**
 * 백그라운드 자동 일기 생성 태스크의 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/background-generation.md
 *       B2·B3·B6·B7·B8
 *       specs/020-scheduled-diary-notification/contracts/notification.md N7
 *       spec.md FR-003·FR-005·FR-011
 *
 * `runAutoDiaryTask`는 의존을 주입받는 조합 함수이므로 기기 없이 검증한다
 * (007~019가 순수 함수를 밖에서 테스트한 것과 같은 구조).
 */

const ENABLED: AutoDiarySettings = { enabled: true, targetHour: 7, batteryExceptionPrompted: true };

function at(hour: number): Date {
  return new Date(2026, 7, 28, hour, 30, 0, 0);
}

/** decideSchedule이 act:true를 내는 최소 조합. */
function baseDeps(overrides: Record<string, unknown> = {}) {
  const pipelineRun = jest.fn().mockResolvedValue({ ok: true, entry: {}, overwrote: false });
  const present = jest.fn().mockResolvedValue("notif-1");
  const dismiss = jest.fn().mockResolvedValue(undefined);
  const notifiedWrite = jest.fn().mockResolvedValue(undefined);

  return {
    pipelineRun,
    present,
    dismiss,
    notifiedWrite,
    deps: {
      now: at(7),
      resolution: { ok: true, environment: "dev" } as never,
      settingsPort: {
        read: async () => JSON.stringify(ENABLED),
        write: async () => {},
      },
      notifiedPort: {
        read: async () => null,
        write: notifiedWrite,
      },
      notificationPort: {
        ensureChannel: async () => {},
        requestPermission: async () => "granted" as const,
        present,
        dismiss,
        lastResponse: async () => null,
        onResponse: () => () => {},
      },
      listDiaryDays: async () => [] as string[],
      loadCharacter: async () => "quiet" as const,
      loadVision: async () => "none" as const,
      makePipeline: (() => ({
        ok: true,
        pipeline: { run: pipelineRun },
        location: "on-device",
        store: {
          listDays: async () => [],
          load: async () => null,
          has: async () => false,
          save: async () => ({ ok: true, overwrote: false }),
        },
      })) as never,
      ...overrides,
    },
  };
}

describe("B2 — 판정 순서", () => {
  it("조건이 맞으면 pipeline.run()을 부르고 'ran'을 반환한다", async () => {
    const { deps, pipelineRun } = baseDeps();
    const result = await runAutoDiaryTask(deps);
    expect(result).toBe("ran");
    expect(pipelineRun).toHaveBeenCalledTimes(1);
    expect(pipelineRun).toHaveBeenCalledWith(
      expect.objectContaining({ day: "2026-08-27", character: "quiet", vision: "none" }),
    );
  });

  it("enabled: false면 pipeline.run()을 부르지 않고 'skipped'", async () => {
    const { deps, pipelineRun } = baseDeps({
      settingsPort: {
        read: async () => JSON.stringify({ ...ENABLED, enabled: false }),
        write: async () => {},
      },
    });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(pipelineRun).not.toHaveBeenCalled();
  });

  it("목표 시각 근방이 아니면 'skipped'", async () => {
    const { deps, pipelineRun } = baseDeps({ now: at(3) });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(pipelineRun).not.toHaveBeenCalled();
  });

  it("모든 하루가 써졌으면 'skipped'", async () => {
    const { deps, pipelineRun } = baseDeps({
      listDiaryDays: async () => ["2026-08-27", "2026-08-26", "2026-08-25"],
    });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(pipelineRun).not.toHaveBeenCalled();
  });

  it("고른 캐릭터가 없으면 'skipped'", async () => {
    const { deps, pipelineRun } = baseDeps({ loadCharacter: async () => null });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(pipelineRun).not.toHaveBeenCalled();
  });

  it("파이프라인 조립이 실패하면 'failed'", async () => {
    const { deps } = baseDeps({
      makePipeline: (() => ({ ok: false, reason: "environment-unresolved", detail: "x" })) as never,
    });
    expect(await runAutoDiaryTask(deps)).toBe("failed");
  });
});

describe("B2-9 / N7 — 실패엔 알림이 없다 (FR-005, SC-006)", () => {
  it("pipeline.run()이 실패하면 present()를 부르지 않고 'failed'", async () => {
    const { deps, present } = baseDeps();
    (deps.makePipeline as unknown as jest.Mock) = undefined as never;
    const failingRun = jest
      .fn()
      .mockResolvedValue({ ok: false, stage: "model-not-ready", reason: "x" });
    deps.makePipeline = (() => ({
      ok: true,
      pipeline: { run: failingRun },
      location: "on-device",
      store: { listDays: async () => [] },
    })) as never;

    expect(await runAutoDiaryTask(deps)).toBe("failed");
    expect(present).not.toHaveBeenCalled();
  });

  it("already-running(잠금 취득 실패)이면 'skipped', 알림 없음", async () => {
    const { deps, present } = baseDeps();
    deps.makePipeline = (() => ({
      ok: true,
      pipeline: {
        run: jest.fn().mockResolvedValue({ ok: false, stage: "already-running", reason: "x" }),
      },
      location: "on-device",
      store: { listDays: async () => [] },
    })) as never;

    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(present).not.toHaveBeenCalled();
  });
});

describe("B2-8 / N4 — 성공하면 알림을 쏜다 (FR-004)", () => {
  it("성공 시 present(day)를 정확히 1회 부른다", async () => {
    const { deps, present } = baseDeps();
    await runAutoDiaryTask(deps);
    expect(present).toHaveBeenCalledWith("2026-08-27");
    expect(present).toHaveBeenCalledTimes(1);
  });

  it("이미 확인된 날짜면 알림을 보내지 않는다 (FR-007 (2))", async () => {
    const { deps, present } = baseDeps({
      notifiedPort: {
        read: async () =>
          JSON.stringify({
            "2026-08-27": { sentAt: "x", acknowledged: true, notificationId: "old" },
          }),
        write: async () => {},
      },
    });
    await runAutoDiaryTask(deps);
    expect(present).not.toHaveBeenCalled();
  });

  it("미확인 알림이 있으면 dismiss 후 재발행한다 (FR-007 (1))", async () => {
    const { deps, present, dismiss } = baseDeps({
      notifiedPort: {
        read: async () =>
          JSON.stringify({
            "2026-08-27": { sentAt: "x", acknowledged: false, notificationId: "old-id" },
          }),
        write: async () => {},
      },
    });
    await runAutoDiaryTask(deps);
    expect(dismiss).toHaveBeenCalledWith("old-id");
    expect(present).toHaveBeenCalledWith("2026-08-27");
  });
});

describe("B7 — now를 한 번만 만든다", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/schedule/task.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("runAutoDiaryTask 본문에 new Date()가 한 번뿐이다", () => {
    const fnMatch = CODE.match(/export async function runAutoDiaryTask[\s\S]*?\n}/);
    const body = fnMatch?.[0] ?? "";
    const occurrences = (body.match(/new Date\(\)/g) ?? []).length;
    expect(occurrences).toBeLessThanOrEqual(1);
  });
});

describe("B3 / B8 — wiring.ts만 거친다 (원칙 IV)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/schedule/task.ts"), "utf8");
  const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("backend.generate()를 직접 부르지 않는다", () => {
    expect(CODE).not.toMatch(/\b(?:backend|adapter|engine)\s*\.\s*generate\s*\(/);
  });

  it("acceptance / prompt를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/diary\/acceptance|diary\/prompt/);
  });

  it("createAppPipeline을 쓴다 (직접 어댑터를 만들지 않는다)", () => {
    expect(CODE).toMatch(/createAppPipeline|makePipeline/);
  });

  it("검증 전용 로그(verification-log)를 남기지 않는다", () => {
    expect(CODE).not.toMatch(/verification-log|appendVerificationEvent/);
  });
});

describe("B1 — 태스크 이름", () => {
  it("AUTO_DIARY_TASK_NAME이 정의돼 있다", () => {
    expect(AUTO_DIARY_TASK_NAME).toBe("alpharium-auto-diary");
  });
});
