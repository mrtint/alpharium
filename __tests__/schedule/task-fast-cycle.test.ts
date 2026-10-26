/**
 * 106 — 백그라운드 태스크의 빠른 주기 (contracts/cycle-reset.md CR8·CR12 · fast-cycle.md FC2~FC5).
 *
 * `runAutoDiaryTask`는 의존을 주입받는 조합 함수라 기기 없이 검증한다(`task-manual.test.ts`와 같은 구조).
 * 리셋은 일기 목록을 읽기 **전**에 일어난다. 배포 환경과 수동 실행은 빠른 주기를 읽지도 리셋하지도 않는다.
 */

import { runAutoDiaryTask } from "../../src/schedule/task";
import { entry, make, OUT_OF_WINDOW, TODAY } from "./fast-cycle-task-fixture";

describe("CR8 — 빠른 주기: 일기 목록을 읽기 전에 리셋하고 오늘을 쓴다", () => {
  it("주기가 바뀌었으면 오늘 일기를 지운 뒤에 목록을 읽고, 오늘을 다시 쓴다", async () => {
    const m = make();
    await m.store.save(entry(TODAY));
    expect(await runAutoDiaryTask(m.deps)).toBe("ran");
    expect(m.log).toEqual([`removeDay:${TODAY}`, "listDiaryDays"]);
    expect(m.run).toHaveBeenCalledTimes(1);
    expect(m.run.mock.calls[0][0].day).toBe(TODAY);
  });

  it("같은 주기에 다시 깨면 리셋하지 않는다 — 이미 쓴 오늘을 다시 쓰지 않는다", async () => {
    const m = make();
    await m.store.save(entry(TODAY));
    expect(await runAutoDiaryTask(m.deps)).toBe("ran");
    await m.store.save(entry(TODAY)); // 파이프라인 대역은 저장하지 않으므로 이 주기의 일기를 대신 둔다
    m.log.length = 0;
    const second = await runAutoDiaryTask({ ...m.deps, now: new Date(2026, 9, 26, 10, 10) });
    expect(second).toBe("skipped");
    expect(m.log).toEqual(["listDiaryDays"]);
    expect(m.run).toHaveBeenCalledTimes(1);
  });

  it("창 밖이면 리셋은 하되 쓰지 않는다 (not-near-target)", async () => {
    const m = make({ now: OUT_OF_WINDOW });
    await m.store.save(entry(TODAY));
    expect(await runAutoDiaryTask(m.deps)).toBe("skipped");
    expect(m.run).not.toHaveBeenCalled();
  });

  it("자동 쓰기가 꺼져 있으면 리셋하지 않는다 — 다시 쓰지 않을 일기를 지우지 않는다", async () => {
    const m = make({ enabled: false });
    await m.store.save(entry(TODAY));
    expect(await runAutoDiaryTask(m.deps)).toBe("skipped");
    expect(m.log).not.toContain(`removeDay:${TODAY}`);
    expect(await m.store.has(TODAY)).toBe(true);
  });

  it("끝에서 쓸 차례 알림을 맞춘다", async () => {
    const m = make({ now: OUT_OF_WINDOW });
    await runAutoDiaryTask(m.deps);
    expect(m.reconciles()).toBeGreaterThanOrEqual(1);
  });
});

describe("FC2 — 배포 환경은 빠른 주기를 읽지도 리셋하지도 않는다", () => {
  it("기록이 켜진 채여도 통로를 부르지 않고 일기를 지우지 않으며 평소 규칙이다", async () => {
    // 평소 규칙: 목표 10시 → 10:05는 창 안, 정오 전이라 후보는 지난 사흘
    const m = make({ environment: "prod", targetHour: 10 });
    await m.store.save(entry(TODAY));
    expect(await runAutoDiaryTask(m.deps)).toBe("ran");
    expect(m.fast.reads).toBe(0);
    expect(m.log.some((l) => l.startsWith("removeDay"))).toBe(false);
    expect(await m.store.has(TODAY)).toBe(true);
    expect(m.run.mock.calls[0][0].day).toBe("2026-10-25"); // 정오 전이라 오늘이 아니라 어제
  });
});

describe("CR12 — 수동 실행은 빠른 주기를 쓰지 않는다", () => {
  it("빠른 주기 기록이 켜져 있어도 읽지도 리셋하지도 않고, 창 밖에서도 배포 규칙대로 쓴다", async () => {
    const m = make({ manual: true, now: OUT_OF_WINDOW, enabled: false });
    expect(await runAutoDiaryTask(m.deps)).toBe("ran");
    expect(m.fast.reads).toBe(0);
    expect(m.log.some((l) => l.startsWith("removeDay"))).toBe(false);
    expect(m.run).toHaveBeenCalledTimes(1);
  });
});
