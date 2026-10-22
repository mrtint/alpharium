/**
 * 097 — 표준 입력이 터미널이 아닐 때(에이전트·CI 셸) 사람이 「조작을 마쳤다」를 신호 파일로 알린다 (`touch <파일>`).
 *
 * 터미널에서는 Enter가 같은 일을 한다(`run.ts`). 앞 흐름이 남긴 신호는 시작할 때 지우고, 읽은 신호도 지운다 — 다음 흐름이 이어 읽지 않게.
 * 시계·파일은 주입받아 기기 없이 테스트된다.
 */

export type SignalDeps = {
  exists(path: string): boolean;
  remove(path: string): void;
  sleep(ms: number): Promise<void>;
  nowMs(): number;
};

const POLL_MS = 1000;

export async function waitForSignalFile(
  path: string,
  timeoutMs: number,
  deps: SignalDeps,
): Promise<"entered" | "timeout"> {
  deps.remove(path);
  const deadline = deps.nowMs() + timeoutMs;
  for (;;) {
    if (deps.exists(path)) {
      deps.remove(path);
      return "entered";
    }
    if (deps.nowMs() >= deadline) return "timeout";
    await deps.sleep(POLL_MS);
  }
}
