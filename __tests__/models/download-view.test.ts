/**
 * 내려받기 상태를 화면에 보이는 규칙 (008, V1~V7·V21).
 *
 * 계약: specs/008-download-conflict-feedback/contracts/download-view.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 008의 두 버그를 판정 쪽에서 막는다.**
 *
 * 버그 ②의 정체는 「거부가 받던 것의 진행 표시를 지운다」였다. I1이 그것을 못 박으며,
 * 그래서 **거부는 `active`를 절대 건드리지 못한다.**
 *
 * 전부 순수 함수이므로 기기 없이 돈다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveDownloadView } from "../../src/models/download-view";
import type { DownloadProgress, DownloadRejection } from "../../src/models/types";

const receiving = (character: "quiet" | "narrative", fraction: number | null = 0.4) =>
  ({ character, fraction }) as DownloadProgress;

const rejected = (
  requested: "quiet" | "narrative" | "imaginative",
  busyWith: "quiet" | "narrative",
) => ({ requested, busyWith }) as DownloadRejection;

/* ───────────────────── 판정 순서 (계약 「판정 순서」 5줄) ───────────────────── */

describe("판정 순서", () => {
  // 1번 — 받는 중인 것을 그대로 싣는다 (FR-008)
  it("받는 중인 것을 그대로 싣는다", () => {
    const view = resolveDownloadView(receiving("quiet"), null);

    expect(view.active).toEqual({ character: "quiet", fraction: 0.4 });
  });

  // 2번 — 거부가 없으면 안내도 없다
  it("거부가 없으면 안내가 없다", () => {
    expect(resolveDownloadView(receiving("quiet"), null).notice).toBeNull();
    expect(resolveDownloadView(null, null).notice).toBeNull();
  });

  // 5번 — 그 외에는 그대로 싣는다 (FR-001)
  it("받는 중에 다른 것을 요청해 거부되면 안내가 실린다", () => {
    const view = resolveDownloadView(receiving("quiet"), rejected("narrative", "quiet"));

    expect(view.notice).toEqual({ requested: "narrative", busyWith: "quiet" });
  });

  /**
   * 3번 — **거부가 아직 참인가.**
   *
   * 「quiet을 받는 중이라 거부했다」는 quiet이 끝나거나 멈추는 순간 **거짓이 된다.**
   * 안내를 지우는 코드를 따로 두지 않고 **판정이 매번 다시 물어서** 사라지게 한다 —
   * `useEffect`로 지우면 타이밍 버그가 들어오고 그 버그는 기기에서만 보인다.
   */
  it("받던 것이 바뀌면 옛 안내가 사라진다", () => {
    const view = resolveDownloadView(receiving("narrative"), rejected("narrative", "quiet"));

    expect(view.notice).toBeNull();
  });

  // 4번 — 같은 캐릭터의 재요청은 거부되지 않는다. 나도 보이지 않는다
  it("받는 중인 것과 같은 것을 요청한 거부는 보이지 않는다", () => {
    const view = resolveDownloadView(receiving("quiet"), rejected("quiet", "quiet"));

    expect(view.notice).toBeNull();
  });
});

/* ─────────────────────────── 불변식 I1~I4 ─────────────────────────── */

describe("불변식", () => {
  /**
   * ★ **I1 — 거부가 `active`를 절대 지우지 않는다** (FR-008, V1).
   *
   * ─────────────────────────────────────────────────────────────────────────
   * **이것이 버그 ②의 판정 쪽 방어다.**
   *
   * 006까지 `App.tsx`가 거부된 요청에서도 `setProgress(null)`을 불러 받던 것의
   * 진행률을 지웠고, 그러면 멈추기 버튼이 함께 사라져 **사용자가 갇혔다.**
   * 여기서 그것이 불가능해진다.
   * ─────────────────────────────────────────────────────────────────────────
   */
  it("★ 거부가 받는 중인 것을 지우지 않는다(I1)", () => {
    const active = receiving("quiet", 0.7);
    const view = resolveDownloadView(active, rejected("narrative", "quiet"));

    expect(view.active).toEqual(active);
  });

  // I2 — 받는 중인 것이 동시에 거부당한 것일 수 없다 (FR-010, V6)
  it("거부당한 것과 받는 중인 것이 같지 않다(I2)", () => {
    const cases: [DownloadProgress | null, DownloadRejection | null][] = [
      [receiving("quiet"), rejected("narrative", "quiet")],
      [receiving("quiet"), rejected("quiet", "quiet")],
      [receiving("narrative"), rejected("narrative", "quiet")],
      [null, rejected("narrative", "quiet")],
    ];

    for (const [active, rejection] of cases) {
      const view = resolveDownloadView(active, rejection);
      if (view.notice !== null && view.active !== null) {
        expect(view.notice.requested).not.toBe(view.active.character);
      }
    }
  });

  /**
   * I3 — 안내가 쌓이지 않는다 (FR-006, V5).
   *
   * **타입이 배열이 아니므로 구조적으로 막힌다.** 이 테스트는 그 방어가 살아 있는지
   * 확인하는 것이지 새로 세우는 것이 아니다.
   */
  it("안내가 쌓이지 않는다(I3)", () => {
    let view = resolveDownloadView(receiving("quiet"), rejected("narrative", "quiet"));
    view = resolveDownloadView(receiving("quiet"), rejected("imaginative", "quiet"));

    expect(Array.isArray(view.notice)).toBe(false);
    expect(view.notice).toEqual({ requested: "imaginative", busyWith: "quiet" });
  });

  /**
   * I4 — 받는 것이 없으면 안내도 없다 (FR-005, V3).
   *
   * 반직관적으로 보이지만, 그때 안내는 **거짓말이다** — 「받는 중이라 거부했다」인데
   * 받는 것이 없으므로. 사용자는 이제 그냥 다시 누르면 된다.
   */
  it("받던 것이 끝나면 안내가 사라진다(I4)", () => {
    const view = resolveDownloadView(null, rejected("narrative", "quiet"));

    expect(view.notice).toBeNull();
    expect(view.active).toBeNull();
  });
});

/* ─────────────────── I5 — 선언을 직접 읽는다 (V7) ─────────────────── */

describe("원칙 IV — 담을 자리가 없다", () => {
  /**
   * ★ **타입 선언 자체를 읽어 검사한다**(FR-016, V7).
   *
   * ─────────────────────────────────────────────────────────────────────────
   * **런타임 검사만으로는 부족하다는 것이 007에서 실측으로 확인됐다**(2026-08-20).
   *
   * `AppScreen`의 writing 갈래에 `stage: string`을 주입해 보니 **jest는 38개 전부
   * 통과했다** — 타입은 지워지므로 `Object.keys()`가 여전히 `["kind"]`였다.
   * 잡은 것은 `tsc`뿐이었고, 그것은 `npm test`가 아니라 `npm run lint`에 있다.
   *
   * 그래서 **선언을 직접 읽는다.** 이제 어느 쪽으로 들어와도 걸린다.
   * ─────────────────────────────────────────────────────────────────────────
   */
  const source = readFileSync(join(__dirname, "..", "..", "src", "models", "types.ts"), "utf8");

  const declarationOf = (name: string) => {
    const start = source.indexOf(`export type ${name} = {`);
    expect(start).toBeGreaterThan(-1);
    return source.slice(start, source.indexOf("};", start));
  };

  it("★ DownloadView에 시간·속도·바이트를 담을 자리가 없다(I5)", () => {
    const declaration = declarationOf("DownloadView");

    expect(declaration).not.toMatch(/elapsed|remaining|eta|speed|perSecond|bytes|시간|속도/i);
    // 자리는 둘뿐이다.
    expect(declaration.match(/^\s{2}\w+[?]?:/gm)).toHaveLength(2);
  });

  it("★ DownloadRejection에 시각·횟수·까닭을 담을 자리가 없다", () => {
    const declaration = declarationOf("DownloadRejection");

    expect(declaration).not.toMatch(/at|count|times|reason|elapsed/i);
    expect(declaration.match(/^\s{2}\w+[?]?:/gm)).toHaveLength(2);
  });

  it("★ 화면이 그릴 것에 모델 정보가 없다(I6)", () => {
    const declaration = declarationOf("DownloadView") + declarationOf("DownloadRejection");

    expect(declaration).not.toMatch(/asset|url|md5|expectedBytes|gguf|quant/i);
  });
});

/* ─────────────────── V21 — 003 FR-020이 유지된다 ─────────────────── */

describe("한 번에 하나 (FR-015, V21)", () => {
  /**
   * `active`는 **하나이거나 없다.** 타입이 배열이 아니므로 두 캐릭터가 동시에 받는
   * 중으로 보일 수 없다 — 003 FR-020이 화면에서도 유지된다.
   */
  it("받는 중으로 보이는 것이 최대 하나다", () => {
    const view = resolveDownloadView(receiving("quiet"), rejected("narrative", "quiet"));

    expect(Array.isArray(view.active)).toBe(false);
    expect(view.active?.character).toBe("quiet");
  });

  it("받는 것이 없으면 아무 줄도 받는 중이 아니다", () => {
    expect(resolveDownloadView(null, null).active).toBeNull();
  });
});

/* ─────────────────── 원칙 V — 모르는 것을 지어내지 않는다 ─────────────────── */

describe("원칙 V — 백분율을 지어내지 않는다", () => {
  /**
   * 탭에서 돌아온 직후는 **받는 중이라는 것은 알지만 백분율은 모른다**
   * (`busyWith()`가 캐릭터만 준다). 그 상태가 그대로 살아 나가야 한다.
   */
  it("백분율이 null인 채로 통과한다", () => {
    const view = resolveDownloadView(receiving("quiet", null), null);

    expect(view.active).toEqual({ character: "quiet", fraction: null });
  });
});
