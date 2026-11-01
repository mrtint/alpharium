/**
 * 109 — 시도 기록(날짜별 장부)의 메모리 통로 대역. 여러 조립 테스트가 함께 쓴다.
 *
 * `read/write/days`는 `AutoWriteAttemptPort` 그대로다(`jest.fn`이라 호출 횟수를 센다). 옛 테스트가 보던 `content`는
 * 모든 날 파일을 합쳐 **최신 줄이 앞**인 `{"items":[…]}` 한 문자열로 돌려준다 — 장부가 없으면 null.
 * ★ 시각으로 다시 정렬하므로 파일 안 줄 순서(시간순 덧붙임)는 이 getter로 확인되지 않는다 — 그건 `files`의 날 파일을 직접 읽는
 * `auto-write-attempts.test.ts`가 잠근다.
 */

import type { AutoWriteAttemptPort } from "../../src/app/auto-write-attempts";

export function ledgerPort() {
  const files = new Map<string, string>();
  const port = {
    files,
    read: jest.fn(async (day: string) => files.get(day) ?? null),
    write: jest.fn(async (day: string, serialized: string) => {
      files.set(day, serialized);
    }),
    days: jest.fn(async () => [...files.keys()]),
    /** 모든 날의 줄을 시각 내림차순(최신이 앞)으로 합친 옛 모양 */
    get content(): string | null {
      if (files.size === 0) return null;
      const all = [...files.values()].flatMap(
        (raw) => (JSON.parse(raw) as { items: { at: string }[] }).items,
      );
      all.reverse();
      all.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
      return JSON.stringify({ items: all });
    },
  };
  const typed: AutoWriteAttemptPort = port;
  void typed;
  return port;
}
