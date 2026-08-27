/**
 * 계약: specs/019-background-diary-feasibility/data-model.md
 *
 * `VerificationEvent` 로그 기록·읽기 계약. 이 검증 하네스가 남기는 로그가
 * FR-004(3단계 완주 판정)·FR-010(권한 유효성 구분)을 실제로 지원할 수
 * 있는지, 그리고 H3(로그 실패가 실행 결과에 영향을 주지 않음)을 확인한다.
 */

import {
  appendVerificationEvent,
  readVerificationLog,
  type VerificationEvent,
} from "../../src/spike/verification-log";

function memoryFileSystemPort() {
  let contents: string | null = null;
  let failNext = false;

  return {
    port: {
      async readAll(): Promise<string | null> {
        return contents;
      },
      async append(line: string): Promise<void> {
        if (failNext) {
          failNext = false;
          throw new Error("디스크 오류(테스트 주입)");
        }
        contents = (contents ?? "") + line;
      },
    },
    failNext() {
      failNext = true;
    },
  };
}

describe("appendVerificationEvent / readVerificationLog", () => {
  test("다섯 가지 이벤트 종류를 기록한 뒤 순서대로 다시 읽힌다", async () => {
    const { port } = memoryFileSystemPort();

    const events: VerificationEvent[] = [
      {
        kind: "task-entered",
        at: "2026-08-27T19:00:00.000Z",
        day: "2026-08-26",
        appState: "background",
      },
      { kind: "permission-checked", at: "2026-08-27T19:00:01.000Z", axis: "photos", valid: true },
      { kind: "pipeline-stage", at: "2026-08-27T19:00:02.000Z", stage: "signals" },
      { kind: "task-completed", at: "2026-08-27T19:00:10.000Z", outcome: "ok" },
      { kind: "task-result", at: "2026-08-27T19:00:10.500Z", result: "Success" },
    ];

    for (const event of events) {
      await appendVerificationEvent(event, port);
    }

    const read = await readVerificationLog(port);
    expect(read).toEqual(events);
  });

  test("appState는 네 값 중 하나로 왕복한다", async () => {
    const { port } = memoryFileSystemPort();
    const states: (VerificationEvent & { kind: "task-entered" })[] = (
      ["active", "background", "inactive", "unknown"] as const
    ).map((appState) => ({
      kind: "task-entered",
      at: "2026-08-27T19:00:00.000Z",
      day: "2026-08-26",
      appState,
    }));

    for (const event of states) {
      await appendVerificationEvent(event, port);
    }

    const read = await readVerificationLog(port);
    expect(read.map((e) => (e.kind === "task-entered" ? e.appState : undefined))).toEqual([
      "active",
      "background",
      "inactive",
      "unknown",
    ]);
  });

  test("파일이 없으면 readVerificationLog는 예외 없이 빈 배열을 돌려준다", async () => {
    const { port } = memoryFileSystemPort();
    await expect(readVerificationLog(port)).resolves.toEqual([]);
  });

  test("한 줄 기록이 실패해도 예외가 상위로 전파되지 않는다 (H3)", async () => {
    const { port, failNext } = memoryFileSystemPort();
    failNext();

    await expect(
      appendVerificationEvent(
        { kind: "task-result", at: "2026-08-27T19:00:10.500Z", result: "Failed" },
        port,
      ),
    ).resolves.toBeUndefined();
  });

  test("기록 실패 후에도 이전에 기록된 줄은 읽힌다", async () => {
    const { port, failNext } = memoryFileSystemPort();

    await appendVerificationEvent(
      {
        kind: "task-entered",
        at: "2026-08-27T19:00:00.000Z",
        day: "2026-08-26",
        appState: "unknown",
      },
      port,
    );

    failNext();
    await appendVerificationEvent(
      { kind: "task-result", at: "2026-08-27T19:00:10.500Z", result: "Failed" },
      port,
    );

    const read = await readVerificationLog(port);
    expect(read).toHaveLength(1);
    expect(read[0].kind).toBe("task-entered");
  });
});
