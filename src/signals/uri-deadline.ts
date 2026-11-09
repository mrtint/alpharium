/**
 * 2026-11-09 — 사진 경로 요청(`getUri()`)의 기다림 한도.
 *
 * 실기기(iPhone 14 2026-11-09 09:36 재현, iPhone 13 mini 11-06 20:09, iPhone 14 11-05 08:19): 앱이 정지한 사이 사진 서비스(assetsd)가
 * 바뀌면, 깨어난 뒤 `getUri()` 안의 `requestContentEditingInput` 콜백이 오지 않았다. 백그라운드 쓰기는 거기서 300초 예산까지 멈췄다.
 * 정상 호출은 1초 안에 끝난다.
 *
 * 한도에 걸리면 한 번 다시 부른다. 두 번 다 걸리면 `UriTimedOut`을 던진다 — 부르는 쪽은 그 장을 「못 읽음」으로 둔다(원칙 V).
 * 걸린 첫 요청은 취소할 길이 없어 그대로 남는다. **10초·두 번은 사람이 정한 값이다(측정이 아니다).**
 *
 * **두 번 다 걸린 프로세스는 막힘으로 남는다.** 같은 프로세스에서 다시 부른 요청은 iOS 사진 쪽에서 시작조차 되지 않았고(2026-11-09 10:22
 * 재현), 그 프로세스의 다음 깨움도 쓰지 못했다(10:52). 그 뒤의 요청은 부르지 않고 곧바로 던진다. 백그라운드 태스크가 `photoUriStalled()`를
 * 읽어 프로세스를 내린다(`schedule/task.ts`) — 새로 뜬 프로세스는 매번 읽었다.
 */

export const URI_WAIT_MS = 10_000;
export const URI_ATTEMPTS = 2;

export class UriTimedOut extends Error {
  constructor(waitMs: number, attempts: number) {
    super(`getUri did not answer within ${waitMs}ms (${attempts} tries)`);
    this.name = "UriTimedOut";
  }
}

/** 타이머를 걸고, 지우는 함수를 돌려준다. 테스트가 시각 없이 부른다. */
export type SetTimer = (fire: () => void, ms: number) => () => void;

const realTimer: SetTimer = (fire, ms) => {
  const id = setTimeout(fire, ms);
  return () => clearTimeout(id);
};

const TIMED_OUT = Symbol("timed-out");

let stalled = false;

/** 이 프로세스에서 사진 경로 요청이 두 번 다 한도에 걸린 적이 있는가 */
export function photoUriStalled(): boolean {
  return stalled;
}

/** 테스트용 — 막힘을 지운다 */
export function resetPhotoUriStall(): void {
  stalled = false;
}

export async function readUriWithin(
  read: () => Promise<string>,
  options: { waitMs?: number; attempts?: number; setTimer?: SetTimer } = {},
): Promise<string> {
  const waitMs = options.waitMs ?? URI_WAIT_MS;
  const attempts = options.attempts ?? URI_ATTEMPTS;
  const setTimer = options.setTimer ?? realTimer;
  if (stalled) throw new UriTimedOut(waitMs, attempts);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let clear = () => {};
    const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
      clear = setTimer(() => resolve(TIMED_OUT), waitMs);
    });
    try {
      const result = await Promise.race([read(), deadline]);
      if (result !== TIMED_OUT) return result;
    } finally {
      clear();
    }
  }
  stalled = true;
  throw new UriTimedOut(waitMs, attempts);
}
