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

const ENABLED: AutoDiarySettings = { enabled: true, targetHour: 7 };

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
        getPermission: async () => "granted" as const,
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

/**
 * ★ 024 — B1a: `defineTask`는 모듈 부수 효과로 등록돼야 한다 (헤드리스 배경 실행).
 *
 * **왜**: WorkManager가 화면 꺼진 채 태스크를 깨우면 RN 헤드리스 런타임이
 * 번들을 로드하지만 `App.tsx`의 컴포넌트 트리는 렌더되지 않는다 —
 * `useEffect`가 안 돈다. 020은 `defineTask` 호출을 `ensureAutoDiaryTaskDefined()`
 * → `App.tsx`의 `useEffect`에 뒀고, 그래서 헤드리스 배경 실행에서
 * "No task registered for key expo-task-manager" → `expo-task-manager`가
 * 태스크를 **자동 해제**했다(2026-08-30 실기기 SM-S901N 확인).
 *
 * 019 스파이크는 `TaskManager.defineTask()`를 모듈 최상단에서 불렀다
 * (`src/spike/background-diary-task.ts:209`) — 그래서 모듈을 import하는
 * 어떤 JS 컨텍스트(헤드리스 포함)에서도 등록됐다. 이 계약이 그 회귀를
 * 막는다: `task.ts` 소스에서 `defineTask` 호출이 함수 선언 밖(모듈 최상단
 * 또는 최상단에서 동기 호출되는 IIFE/require 가드) 스코프에 있어야 한다.
 */
describe("B1a — defineTask는 모듈 부수 효과다 (024, 헤드리스 배경 실행)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/schedule/task.ts"), "utf8");

  it("소스에 defineTask 호출이 있다", () => {
    expect(SOURCE).toMatch(/\.defineTask\s*\(/);
  });

  it("defineTask 호출이 async 함수 선언 안에만 갇혀 있지 않다 (모듈 최상단 부수 효과)", () => {
    // 주석 제거.
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    // `defineTask(` 각 호출의 들여쓰기를 본다. 모듈 최상단 부수 효과라면
    // 최소 한 번은 함수 본문 밖(들여쓰기 0~2칸, 또는 최상단 IIFE/try 블록)에서
    // 불려야 한다. 020의 버그 버전은 `async function defineAutoDiaryTask()`
    // 안에서만(들여쓰기 4칸 + `App.tsx` useEffect 의존) 불렀다.
    const lines = code.split(/\r?\n/);
    const defineTaskLines = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => /\.defineTask\s*\(/.test(l));
    expect(defineTaskLines.length).toBeGreaterThan(0);

    // "모듈 최상단 부수 효과"의 증거: `defineTask`를 부르는 지점보다 위에
    // `App.tsx`나 `useEffect`, `ensureAutoDiaryTaskDefined`를 거치지 않고
    // 모듈이 로드되는 순간 실행되는 경로가 있어야 한다. 구조적으로:
    //  - 최상단 `try {` … `require("expo-task-manager")` … `.defineTask(` … `}`, 또는
    //  - 최상단 IIFE `(() => { … .defineTask( … })()`, 또는
    //  - 최상단 `import` 후 바로 `.defineTask(`.
    const hasTopLevelGuardedRequire =
      /(^|\n)\s*try\s*\{[\s\S]*?require\(["']expo-task-manager["']\)[\s\S]*?\.defineTask\s*\(/.test(
        code,
      );
    const hasTopLevelIife =
      /(^|\n)\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?\.defineTask\s*\([\s\S]*?\}\s*\)\s*\(\s*\)/.test(
        code,
      );
    const hasTopLevelStaticImportThenDefine =
      /(^|\n)import\s+\*\s+as\s+\w+\s+from\s+["']expo-task-manager["'][\s\S]*?(^|\n)\w+\.defineTask\s*\(/.test(
        code,
      );

    expect(hasTopLevelGuardedRequire || hasTopLevelIife || hasTopLevelStaticImportThenDefine).toBe(
      true,
    );
  });

  it("defineTask 등록이 App.tsx의 useEffect/ensureAutoDiaryTaskDefined에만 의존하지 않는다", () => {
    // 020 버그: `ensureAutoDiaryTaskDefined`가 유일한 등록 경로였고, 그것은
    // `App.tsx`의 `useEffect`에서만 불렸다 → 헤드리스 배경 실행에서 등록 안 됨.
    //
    // 고친 뒤의 불변식: 등록을 하는 최상단 문장(들여쓰기 0칸, `import`/`export`도
    // `function`/`describe`도 아닌 실행 문장)이 있어야 한다 — 모듈을 import하는
    // 순간 `defineTask`가 걸리게. 대표적으로 `const X = registerAutoDiaryTask();`
    // 또는 `registerAutoDiaryTask();` 또는 `(() => { ... .defineTask( ... })();`.
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const topLevelExecStatement =
      // `const/let/var NAME = <call>();` (등록 함수를 즉시 부르는 형태)
      /(^|\n)(?:const|let|var)\s+\w+\s*=\s*\w+\s*\(\s*\)\s*;/.test(code) ||
      // 최상단 `NAME();`
      /(^|\n)\w+\s*\(\s*\)\s*;/.test(code) ||
      // 최상단 IIFE with defineTask
      /(^|\n)\(\s*(?:async\s*)?\(\)\s*=>\s*\{[\s\S]*?\.defineTask\s*\(/.test(code);
    expect(topLevelExecStatement).toBe(true);

    // 그리고 그 등록이 `expo-task-manager`를 (정적 import든 가드된 require든)
    // 모듈 로드 시점에 참조해야 한다.
    const loadsTaskManagerAtModuleScope =
      /(^|\n)import\s+.*expo-task-manager/.test(code) ||
      /require\(\s*["']expo-task-manager["']\s*\)/.test(code);
    expect(loadsTaskManagerAtModuleScope).toBe(true);
  });
});
