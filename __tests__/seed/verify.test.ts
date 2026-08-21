/**
 * 심은 것을 되읽어 확인한다 (FR-018d).
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/seeding.md 「5단계」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 이 기능의 핵심 방어선이다.**
 *
 * research.md §1의 실측:
 *
 * ```
 * adb push probe.jpg /sdcard/Pictures/AlphariumProbe/probe.jpg
 * → 1 file pushed. 성공.
 *
 * content query ... --projection _id:_data:datetaken
 * → Row: 0 _id=1000000639, _data=..., datetaken=NULL
 * ```
 *
 * **파일이 있고, MediaStore에 행도 있는데, `datetaken`이 NULL이라 앱은 못 본다.**
 * 앱의 질의가 `CREATION_TIME`의 범위를 보기 때문이다(expo-port.ts).
 *
 * 그러므로 **「push 성공」은 「심겼다」가 아니다.** 이 확인이 없으면 006의
 * `GenerationProbe`·007의 끊긴 배선·008의 버려진 반환값·009의 `day:` 한 줄과 **같은
 * 종류의 조용한 실패**를 하나 더 만든다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayBounds } from "../../src/config/day-boundary";
import { verifySeeded } from "../../scripts/seed/verify";
import type { MediaRow } from "../../scripts/seed/device";

const DAY = "2026-08-20";
const { startMs, endMs } = dayBounds(DAY);

const row = (path: string, datetakenMs: number | null): MediaRow => ({ path, datetakenMs });

const goodRows = (count: number): MediaRow[] =>
  Array.from({ length: count }, (_, i) =>
    row(`/sdcard/Pictures/AlphariumSeed/seed-${i}.jpg`, startMs + (i + 1) * 60_000),
  );

describe("확인 — 색인이 됐는가", () => {
  it("모두 색인되고 그 하루 안이면 통과한다", () => {
    expect(verifySeeded(goodRows(3), DAY, 3)).toEqual({ ok: true });
  });

  /**
   * **★ research.md §1이 실측한 실패다.**
   *
   * 행은 생겼는데 `datetaken`이 NULL이다. 앱은 이 사진을 어느 하루에서도 못 본다.
   */
  it("datetaken이 NULL이면 index-failed다", () => {
    const rows = [...goodRows(2), row("/sdcard/Pictures/AlphariumSeed/seed-2.jpg", null)];
    const result = verifySeeded(rows, DAY, 3);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("index-failed");
  });

  it("행이 아예 없으면 index-failed다", () => {
    const result = verifySeeded([], DAY, 3);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("index-failed");
  });

  /** 부분 성공은 실패다(FR-018c). 3장을 심었는데 2장만 보이면 통과가 아니다 */
  it("기대한 수보다 적으면 index-failed다", () => {
    const result = verifySeeded(goodRows(2), DAY, 3);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("index-failed");
  });
});

describe("확인 — 그 하루가 맞는가", () => {
  /**
   * **★ 시간대 어긋남을 여기서 잡는다**(research.md §8).
   *
   * 개발 기계와 기기의 시간대가 다르면 심은 사진이 옆 하루에 걸린다. 지금은 둘 다
   * KST라 드러나지 않지만, **잡지 못하면 검증이 조용히 헛돈다** — 사진은 심겼는데
   * 앱에서 고른 하루에는 안 보인다.
   */
  it("datetaken이 그 하루의 구간 밖이면 verify-mismatch다", () => {
    const rows = [
      ...goodRows(2),
      // 하루가 끝난 뒤 — 옆 하루에 걸렸다
      row("/sdcard/Pictures/AlphariumSeed/seed-2.jpg", endMs + 60_000),
    ];
    const result = verifySeeded(rows, DAY, 3);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("verify-mismatch");
  });

  it("하루가 시작하기 전이어도 verify-mismatch다", () => {
    const rows = [
      ...goodRows(2),
      row("/sdcard/Pictures/AlphariumSeed/seed-2.jpg", startMs - 60_000),
    ];
    const result = verifySeeded(rows, DAY, 3);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("verify-mismatch");
  });

  /** `[startMs, endMs)` — 끝은 포함하지 않는다. 002의 계약과 같아야 한다 */
  it("구간의 시작은 포함하고 끝은 포함하지 않는다", () => {
    expect(verifySeeded([row("a.jpg", startMs)], DAY, 1).ok).toBe(true);
    expect(verifySeeded([row("a.jpg", endMs)], DAY, 1).ok).toBe(false);
    expect(verifySeeded([row("a.jpg", endMs - 1)], DAY, 1).ok).toBe(true);
  });

  /**
   * **색인 실패를 시간대 어긋남보다 먼저 본다.**
   *
   * `datetaken`이 NULL인 것과 「엉뚱한 하루」는 다른 문제이고, 에이전트가 다르게
   * 대응해야 한다. NULL을 「구간 밖」으로 뭉개면 원인이 흐려진다.
   */
  it("NULL과 구간 밖이 섞이면 index-failed가 먼저다", () => {
    const rows = [row("a.jpg", null), row("b.jpg", endMs + 60_000)];
    const result = verifySeeded(rows, DAY, 2);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("index-failed");
  });
});

describe("확인 — 까닭이 구체적이다 (FR-019)", () => {
  it("index-failed가 몇 장이 안 보이는지 말한다", () => {
    const result = verifySeeded(goodRows(1), DAY, 3);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toContain("3");
      expect(result.detail).toContain("1");
    }
  });

  it("verify-mismatch가 어느 하루로 잡혔는지 말한다", () => {
    const rows = [row("a.jpg", endMs + 60_000)];
    const result = verifySeeded(rows, DAY, 1);

    expect(result.ok).toBe(false);
    // 어긋난 하루를 알려 줘야 에이전트가 시간대 문제임을 안다
    if (!result.ok) expect(result.detail).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe("확인 — 사진 0장인 하루", () => {
  /**
   * `empty` 모양은 심을 것이 없다. **행이 0개인 것이 성공이다** — 「없어야 하는데
   * 없다」를 실패로 읽으면 그 갈래를 만들 수 없다.
   */
  it("0장을 기대하면 행이 없어도 통과한다", () => {
    expect(verifySeeded([], DAY, 0)).toEqual({ ok: true });
  });

  /** 다만 0장을 기대했는데 있으면 이상하다 — 앞선 실행이 남긴 것이다 */
  it("0장을 기대했는데 그 하루의 행이 있으면 실패한다", () => {
    const result = verifySeeded(goodRows(1), DAY, 0);

    expect(result.ok).toBe(false);
  });
});
