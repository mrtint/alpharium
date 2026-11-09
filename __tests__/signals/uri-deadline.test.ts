/**
 * 2026-11-09 — 사진 경로 요청(`getUri()`)에 기다림 한도를 두고 한 번 다시 부른다.
 *
 * 실기기(iPhone 14, 2026-11-09 09:36 재현 · mini 11-06 20:09 · iPhone 14 11-05 08:19): 앱이 정지한 사이 사진 서비스(assetsd)가
 * 바뀌면, 깨어난 뒤 `getUri()` 안의 `requestContentEditingInput` 콜백이 오지 않아 백그라운드 쓰기가 300초 예산까지 멈췄다.
 * 정상 호출은 1초 안에 끝난다. 한도 값은 사람이 정한 값이다(측정이 아니다).
 */

import {
  photoUriStalled,
  readUriWithin,
  resetPhotoUriStall,
  UriTimedOut,
} from "../../src/signals/uri-deadline";

beforeEach(() => resetPhotoUriStall());

type Timer = { fire(): void; ms: number };

function manualTimers() {
  const pending: Timer[] = [];
  const setTimer = (fire: () => void, ms: number) => {
    const timer = { fire, ms };
    pending.push(timer);
    return () => {
      const at = pending.indexOf(timer);
      if (at >= 0) pending.splice(at, 1);
    };
  };
  return { pending, setTimer };
}

const never = () => new Promise<string>(() => {});
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("readUriWithin", () => {
  it("한도 안에 오면 그 값이고 타이머를 남기지 않는다", async () => {
    const { pending, setTimer } = manualTimers();
    await expect(readUriWithin(() => Promise.resolve("file:///a.jpg"), { setTimer })).resolves.toBe(
      "file:///a.jpg",
    );
    expect(pending).toHaveLength(0);
  });

  it("첫 요청이 한도에 걸리면 한 번 다시 부르고, 그 값을 돌려준다", async () => {
    const { pending, setTimer } = manualTimers();
    const calls: string[] = [];
    const read = () => {
      calls.push("read");
      return calls.length === 1 ? never() : Promise.resolve("file:///b.jpg");
    };
    const result = readUriWithin(read, { setTimer, waitMs: 10_000 });
    await flush();
    expect(pending.map((t) => t.ms)).toEqual([10_000]);
    pending[0].fire();
    await expect(result).resolves.toBe("file:///b.jpg");
    expect(calls).toHaveLength(2);
    expect(pending).toHaveLength(0);
  });

  it("두 번 모두 한도에 걸리면 UriTimedOut을 던진다 — 빈 값으로 채우지 않는다", async () => {
    const { pending, setTimer } = manualTimers();
    let calls = 0;
    const result = readUriWithin(
      () => {
        calls += 1;
        return never();
      },
      { setTimer },
    );
    await flush();
    pending[0].fire();
    await flush();
    pending[0].fire();
    await expect(result).rejects.toBeInstanceOf(UriTimedOut);
    expect(calls).toBe(2);
  });

  it("요청이 던지면 다시 부르지 않고 그 예외를 그대로 둔다", async () => {
    const { pending, setTimer } = manualTimers();
    let calls = 0;
    const boom = new Error("asset not found");
    await expect(
      readUriWithin(
        () => {
          calls += 1;
          return Promise.reject(boom);
        },
        { setTimer },
      ),
    ).rejects.toBe(boom);
    expect(calls).toBe(1);
    expect(pending).toHaveLength(0);
  });

  it("기본 한도는 10초, 부르는 횟수는 두 번이다", async () => {
    const { pending, setTimer } = manualTimers();
    const result = readUriWithin(never, { setTimer });
    await flush();
    expect(pending[0].ms).toBe(10_000);
    pending[0].fire();
    await flush();
    pending[0].fire();
    await expect(result).rejects.toBeInstanceOf(UriTimedOut);
  });
});

/**
 * 같은 프로세스에서 다시 부른 요청은 iOS 사진 쪽에서 시작조차 되지 않았다(2026-11-09 10:22 재현). 한 번 막힌 프로세스는 사진 경로를
 * 다시 기다리지 않고, 태스크가 그 사실을 읽어 백그라운드에서 프로세스를 내린다(task.ts).
 */
describe("한 번 막힌 프로세스", () => {
  it("두 번 모두 한도에 걸리면 막힘으로 남는다 — 그 전에는 아니다", async () => {
    const { pending, setTimer } = manualTimers();
    const result = readUriWithin(never, { setTimer });
    await flush();
    pending[0].fire();
    await flush();
    expect(photoUriStalled()).toBe(false);
    pending[0].fire();
    await expect(result).rejects.toBeInstanceOf(UriTimedOut);
    expect(photoUriStalled()).toBe(true);
  });

  it("막힌 뒤의 요청은 부르지도 기다리지도 않고 곧바로 UriTimedOut", async () => {
    const { pending, setTimer } = manualTimers();
    const first = readUriWithin(never, { setTimer });
    await flush();
    pending[0].fire();
    await flush();
    pending[0].fire();
    await expect(first).rejects.toBeInstanceOf(UriTimedOut);

    const read = jest.fn(() => Promise.resolve("file:///c.jpg"));
    await expect(readUriWithin(read, { setTimer })).rejects.toBeInstanceOf(UriTimedOut);
    expect(read).not.toHaveBeenCalled();
    expect(pending).toHaveLength(0);
  });

  it("다시 불러 받은 경우는 막힘이 아니다", async () => {
    const { pending, setTimer } = manualTimers();
    let calls = 0;
    const result = readUriWithin(
      () => {
        calls += 1;
        return calls === 1 ? never() : Promise.resolve("file:///d.jpg");
      },
      { setTimer },
    );
    await flush();
    pending[0].fire();
    await expect(result).resolves.toBe("file:///d.jpg");
    expect(photoUriStalled()).toBe(false);
  });
});
