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

/** 057 — 그 날의 미리보기. 기본은 사진이 있는 날(지금처럼 쓴다). */
function previewOf(
  photos: { kind: "known"; count: number } | { kind: "none" } | { kind: "unknown" },
  photoAccess: "ok" | "denied" | "blocked" = "ok",
) {
  return async (day: string) => ({
    day,
    photos,
    places: { kind: "unknown" as const },
    photoAccess,
  });
}
const WITH_PHOTOS = previewOf({ kind: "known", count: 3 });

/** decideSchedule이 act:true를 내는 최소 조합. */
function baseDeps(overrides: Record<string, unknown> = {}) {
  const pipelineRun = jest.fn().mockResolvedValue({ ok: true, entry: {}, overwrote: false });
  const present = jest.fn().mockResolvedValue("notif-1");
  const dismiss = jest.fn().mockResolvedValue(undefined);
  const notifiedWrite = jest.fn().mockResolvedValue(undefined);
  const skipWrite = jest.fn().mockResolvedValue(undefined);
  const attempts = {
    content: null as string | null,
    async read() {
      return attempts.content;
    },
    async write(serialized: string) {
      attempts.content = serialized;
    },
  };

  const catchUp = {
    content: null as string | null,
    async read() {
      return catchUp.content;
    },
    async write(serialized: string) {
      catchUp.content = serialized;
    },
  };

  return {
    attempts,
    catchUp,
    pipelineRun,
    present,
    dismiss,
    notifiedWrite,
    skipWrite,
    deps: {
      attemptPort: attempts,
      catchUpPort: catchUp,
      skipPort: { read: async () => null, write: skipWrite, remove: async () => {} },
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
      loadNames: async () => ({}),
      makePipeline: (() => ({
        ok: true,
        pipeline: { run: pipelineRun },
        location: "on-device",
        previewDay: WITH_PHOTOS,
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

/** 미리보기·실행을 바꾼 파이프라인 조립 대역 */
function pipelineWith(previewDay: ReturnType<typeof previewOf>, run?: jest.Mock) {
  return (() => ({
    ok: true,
    pipeline: {
      run: run ?? jest.fn().mockResolvedValue({ ok: true, entry: {}, overwrote: false }),
    },
    location: "on-device",
    previewDay,
    store: {
      listDays: async () => [],
      load: async () => null,
      has: async () => false,
      save: async () => ({ ok: true, overwrote: false }),
    },
  })) as never;
}

describe("B2 — 판정 순서", () => {
  it("조건이 맞으면 pipeline.run()을 부르고 'ran'을 반환한다", async () => {
    const { deps, pipelineRun } = baseDeps();
    const result = await runAutoDiaryTask(deps);
    expect(result).toBe("ran");
    expect(pipelineRun).toHaveBeenCalledTimes(1);
    expect(pipelineRun).toHaveBeenCalledWith(
      expect.objectContaining({ day: "2026-08-27", character: "quiet", vision: "quick" }),
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

  it("창 밖이고 오늘만 비어 있으면 'skipped' (오늘은 창 안에서만)", async () => {
    const { deps, pipelineRun } = baseDeps({
      now: at(15),
      listDiaryDays: async () => ["2026-08-27", "2026-08-26", "2026-08-25"],
    });
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(pipelineRun).not.toHaveBeenCalled();
  });

  it("078 — 창이 지난 뒤(15시, 목표 7시)에도 어제가 비어 있으면 어제를 쓴다", async () => {
    const { deps, pipelineRun } = baseDeps({ now: at(15) });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(pipelineRun).toHaveBeenCalledWith(expect.objectContaining({ day: "2026-08-27" }));
  });

  it("078 — 오전 목표(7시)의 어제는 목표 시각 전(3시)에 쓰지 않는다", async () => {
    const { deps, pipelineRun } = baseDeps({
      now: at(3),
      listDiaryDays: async () => ["2026-08-26", "2026-08-25"],
    });
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

/** 057 BG1·BG2 — 자동 쓰기는 재료 없는 날·사진 권한 없는 날을 쓰지 않는다 (FR-007~FR-009). */
describe("057 BG1·BG2 — 재료 없음·사진 권한 없음은 건너뛴다", () => {
  function withPreview(preview: ReturnType<typeof previewOf>) {
    const made = baseDeps();
    made.deps.makePipeline = (() => ({
      ok: true,
      pipeline: { run: made.pipelineRun },
      location: "on-device",
      previewDay: preview,
      store: { listDays: async () => [] },
    })) as never;
    return made;
  }

  it("사진이 관측된 0장이면 쓰지 않고 알림도 기록도 없다", async () => {
    const { deps, pipelineRun, present, skipWrite } = withPreview(
      previewOf({ kind: "known", count: 0 }),
    );
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(pipelineRun).not.toHaveBeenCalled();
    expect(present).not.toHaveBeenCalled();
    expect(skipWrite).not.toHaveBeenCalled();
  });

  it("사진 권한이 없으면 쓰지 않고 알림이 없으며 그 날을 기록한다", async () => {
    const { deps, pipelineRun, present, skipWrite } = withPreview(
      previewOf({ kind: "unknown" }, "denied"),
    );
    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(pipelineRun).not.toHaveBeenCalled();
    expect(present).not.toHaveBeenCalled();
    expect(skipWrite).toHaveBeenCalledTimes(1);
    expect(JSON.parse(skipWrite.mock.calls[0][0])).toEqual({ day: "2026-08-27" });
  });

  it("사진이 있으면 지금처럼 쓴다", async () => {
    const { deps, pipelineRun, skipWrite } = withPreview(previewOf({ kind: "known", count: 3 }));
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(pipelineRun).toHaveBeenCalledTimes(1);
    expect(skipWrite).not.toHaveBeenCalled();
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
      previewDay: WITH_PHOTOS,
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
      previewDay: WITH_PHOTOS,
      store: { listDays: async () => [] },
    })) as never;

    expect(await runAutoDiaryTask(deps)).toBe("skipped");
    expect(present).not.toHaveBeenCalled();
  });
});

describe("B2-8 / N4 — 성공하면 알림을 쏜다 (FR-004)", () => {
  it("성공 시 present(day, title)를 정확히 1회 부른다", async () => {
    const { deps, present } = baseDeps();
    await runAutoDiaryTask(deps);
    expect(present).toHaveBeenCalledWith("2026-08-27", "금동이가 8월 27일 일기를 다 썼어요");
    expect(present).toHaveBeenCalledTimes(1);
  });

  it("057 BG3 — 제목은 지금 이름과 쓴 날의 한 줄이다 (사용자가 지은 이름)", async () => {
    const { deps, present } = baseDeps({ loadNames: async () => ({ quiet: "별님" }) });
    await runAutoDiaryTask(deps);
    expect(present).toHaveBeenCalledWith("2026-08-27", "별님이 8월 27일 일기를 다 썼어요");
  });

  it("057 BG3 — 이름을 읽지 못하면 기본 이름으로 (알림은 그대로 간다)", async () => {
    const { deps, present } = baseDeps({ loadNames: () => Promise.reject(new Error("x")) });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(present).toHaveBeenCalledWith("2026-08-27", "금동이가 8월 27일 일기를 다 썼어요");
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
    expect(present).toHaveBeenCalledWith("2026-08-27", expect.any(String));
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
    expect(AUTO_DIARY_TASK_NAME).toBe("pocketlog-auto-diary");
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

describe("078 AT — 자동 쓰기 시도 기록", () => {
  const lines = (port: { content: string | null }) =>
    (
      JSON.parse(port.content ?? '{"items":[]}') as {
        items: { path: string; outcome: string; at: string }[];
      }
    ).items;

  it("쓰면 background · ran 한 줄 — 시작과 끝이 같은 줄이다(at이 now와 같다)", async () => {
    const { deps, attempts } = baseDeps();
    await runAutoDiaryTask(deps);
    expect(lines(attempts)).toEqual([
      { path: "background", outcome: "ran", at: at(7).toISOString() },
    ]);
  });

  it.each([
    [
      "disabled",
      {
        settingsPort: {
          read: async () => JSON.stringify({ ...ENABLED, enabled: false }),
          write: async () => {},
        },
      },
    ],
    [
      "not-near-target",
      { now: at(15), listDiaryDays: async () => ["2026-08-27", "2026-08-26", "2026-08-25"] },
    ],
    ["all-written", { listDiaryDays: async () => ["2026-08-27", "2026-08-26", "2026-08-25"] }],
    ["no-character", { loadCharacter: async () => null }],
  ] as const)("%s", async (outcome, over) => {
    const { deps, attempts } = baseDeps({ ...over });
    await runAutoDiaryTask(deps);
    expect(lines(attempts).map((l) => l.outcome)).toEqual([outcome]);
  });

  it("사진 0장이면 no-material, 사진 권한 없음이면 no-photo-access", async () => {
    const a = baseDeps({ makePipeline: pipelineWith(previewOf({ kind: "known", count: 0 })) });
    await runAutoDiaryTask(a.deps);
    expect(lines(a.attempts).map((l) => l.outcome)).toEqual(["no-material"]);
    const b = baseDeps({ makePipeline: pipelineWith(previewOf({ kind: "unknown" }, "denied")) });
    await runAutoDiaryTask(b.deps);
    expect(lines(b.attempts).map((l) => l.outcome)).toEqual(["no-photo-access"]);
  });

  it("already-running·실패·예외·조립 실패는 각각 already-running·failed·failed·failed", async () => {
    const cases: [string, Record<string, unknown>][] = [
      [
        "already-running",
        {
          makePipeline: pipelineWith(
            WITH_PHOTOS,
            jest.fn().mockResolvedValue({ ok: false, stage: "already-running", reason: "x" }),
          ),
        },
      ],
      [
        "failed",
        {
          makePipeline: pipelineWith(
            WITH_PHOTOS,
            jest.fn().mockResolvedValue({ ok: false, stage: "storage", reason: "x" }),
          ),
        },
      ],
      [
        "failed",
        { makePipeline: pipelineWith(WITH_PHOTOS, jest.fn().mockRejectedValue(new Error("boom"))) },
      ],
      ["failed", { makePipeline: () => ({ ok: false, reason: "no-engine" }) }],
    ];
    for (const [outcome, over] of cases) {
      const { deps, attempts } = baseDeps(over);
      await runAutoDiaryTask(deps);
      expect(lines(attempts).map((l) => l.outcome)).toEqual([outcome]);
    }
  });

  // 078 리뷰 I3 — 이 기록의 핵심은 「끝나기 전에 started가 디스크에 있다」이다. 끝 기록은 짝이 없으면 스스로 줄을 넣으므로
  // 시작 기록을 지워도 위 테스트는 모두 통과한다 — 도는 도중의 디스크를 직접 본다.
  it("★ 파이프라인이 도는 동안 디스크에는 started 한 줄이 이미 있다", async () => {
    const made = baseDeps();
    const seenMidRun: unknown[] = [];
    const run = jest.fn(async () => {
      seenMidRun.push(JSON.parse(made.attempts.content ?? "null"));
      return { ok: true, entry: {}, overwrote: false };
    });
    await runAutoDiaryTask({ ...made.deps, makePipeline: pipelineWith(WITH_PHOTOS, run as never) });
    expect(seenMidRun).toEqual([
      { items: [{ at: at(7).toISOString(), path: "background", outcome: "started" }] },
    ]);
  });

  it("★ 끝나지 않는 실행은 started로 남는다 (프로세스가 도중에 정지된 경우의 모양)", async () => {
    const never = jest.fn(() => new Promise<never>(() => {}));
    const made = baseDeps();
    void runAutoDiaryTask({
      ...made.deps,
      makePipeline: pipelineWith(WITH_PHOTOS, never as never),
    });
    for (let n = 0; n < 50 && never.mock.calls.length === 0; n += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    expect(never).toHaveBeenCalledTimes(1);
    expect(lines(made.attempts)).toEqual([
      { path: "background", outcome: "started", at: at(7).toISOString() },
    ]);
  });

  it("기록 통로가 던져도 결과와 파이프라인 호출은 그대로다", async () => {
    const broken = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("io")),
    };
    const { deps, pipelineRun } = baseDeps({ attemptPort: broken });
    expect(await runAutoDiaryTask(deps)).toBe("ran");
    expect(pipelineRun).toHaveBeenCalledTimes(1);
  });
});

/**
 * 078 리뷰 I2 — 시도 창은 재시도의 유일한 상한이었다(하루 3시간). 지난 날을 창 밖에서도 쓰게 하면서 그 상한이 사라져, 계속 실패하는
 * 지난 날을 백그라운드가 15분마다 온종일 다시 돌릴 수 있었다(헤드리스 한 번이 18분 걸리는 기기도 있다). **창 밖의 따라잡기는 하루에
 * 한 번만 판정한다.** 창 안은 종전대로다. 앱을 열 때의 경로는 이 상한을 타지 않는다(한 실행에 한 번이고 화면이 보인다).
 */
describe("078 CU — 창 밖 따라잡기는 백그라운드에서 하루에 한 번", () => {
  const FAIL = () => jest.fn().mockResolvedValue({ ok: false, stage: "storage", reason: "x" });
  const lastOutcome = (port: { content: string | null }) =>
    (JSON.parse(port.content ?? '{"items":[]}') as { items: { outcome: string }[] }).items[0]
      ?.outcome;

  it("같은 날 창 밖에서 두 번째는 파이프라인을 부르지 않고 catch-up-spent로 남는다", async () => {
    const run = FAIL();
    const made = baseDeps({ now: at(15), makePipeline: pipelineWith(WITH_PHOTOS, run) });
    expect(await runAutoDiaryTask(made.deps)).toBe("failed");
    expect(JSON.parse(made.catchUp.content ?? "")).toEqual({ on: "2026-08-28" });

    expect(await runAutoDiaryTask({ ...made.deps, now: at(16) })).toBe("skipped");
    expect(run).toHaveBeenCalledTimes(1);
    expect(lastOutcome(made.attempts)).toBe("catch-up-spent");
  });

  it("두 번째는 신호도 읽지 않는다 (재료 없는 날·사진 권한 없는 날을 15분마다 훑지 않는다)", async () => {
    const preview = jest.fn(previewOf({ kind: "known", count: 0 }));
    const made = baseDeps({ now: at(15), makePipeline: pipelineWith(preview as never) });
    expect(await runAutoDiaryTask(made.deps)).toBe("skipped");
    expect(lastOutcome(made.attempts)).toBe("no-material");
    expect(preview).toHaveBeenCalledTimes(1);

    expect(await runAutoDiaryTask({ ...made.deps, now: at(16) })).toBe("skipped");
    expect(preview).toHaveBeenCalledTimes(1);
    expect(lastOutcome(made.attempts)).toBe("catch-up-spent");
  });

  it("다음 날에는 다시 한 번 시도한다", async () => {
    const run = FAIL();
    const made = baseDeps({ now: at(15), makePipeline: pipelineWith(WITH_PHOTOS, run) });
    await runAutoDiaryTask(made.deps);
    const nextDay = new Date(2026, 7, 29, 15, 30, 0, 0);
    expect(await runAutoDiaryTask({ ...made.deps, now: nextDay })).toBe("failed");
    expect(run).toHaveBeenCalledTimes(2);
    expect(JSON.parse(made.catchUp.content ?? "")).toEqual({ on: "2026-08-29" });
  });

  it("창 안의 재시도는 종전대로 막지 않는다 — 기록도 남기지 않는다", async () => {
    const run = FAIL();
    const made = baseDeps({ now: at(7), makePipeline: pipelineWith(WITH_PHOTOS, run) });
    await runAutoDiaryTask(made.deps);
    await runAutoDiaryTask({ ...made.deps, now: at(8) });
    expect(run).toHaveBeenCalledTimes(2);
    expect(made.catchUp.content).toBeNull();
  });

  it("창 밖에서 따라잡기를 쓴 날에도 창 안에서는 쓴다", async () => {
    // 목표 16시: 15시(창 밖)에 어제를 시도해 실패 → 16시(창 안)에는 다시 시도한다
    const run = FAIL();
    const settingsPort = {
      read: async () => JSON.stringify({ enabled: true, targetHour: 16 }),
      write: async () => {},
    };
    const made = baseDeps({
      now: at(15),
      settingsPort,
      makePipeline: pipelineWith(WITH_PHOTOS, run),
    });
    await runAutoDiaryTask(made.deps);
    await runAutoDiaryTask({ ...made.deps, now: at(16) });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("돌 일이 없는 판정(모두 써 있음)은 오늘의 한 번을 쓰지 않는다", async () => {
    const made = baseDeps({
      now: at(15),
      listDiaryDays: async () => ["2026-08-28", "2026-08-27", "2026-08-26"],
    });
    expect(await runAutoDiaryTask(made.deps)).toBe("skipped");
    expect(lastOutcome(made.attempts)).toBe("all-written");
    expect(made.catchUp.content).toBeNull();
  });

  it("기록 통로가 던지면 막지 않는다 (못 읽으면 쓴 적 없음)", async () => {
    const run = FAIL();
    const broken = {
      read: () => Promise.reject(new Error("io")),
      write: () => Promise.reject(new Error("io")),
    };
    const made = baseDeps({
      now: at(15),
      catchUpPort: broken,
      makePipeline: pipelineWith(WITH_PHOTOS, run),
    });
    expect(await runAutoDiaryTask(made.deps)).toBe("failed");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("진단의 수동 실행은 상한을 타지 않는다", async () => {
    const run = FAIL();
    const made = baseDeps({ now: at(15), makePipeline: pipelineWith(WITH_PHOTOS, run) });
    await runAutoDiaryTask(made.deps);
    expect(await runAutoDiaryTask({ ...made.deps, now: at(16), manual: true })).toBe("failed");
    expect(run).toHaveBeenCalledTimes(2);
  });
});
