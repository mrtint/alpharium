/**
 * 내려받기 상태를 화면에 보이는 규칙 (008 확장 → 026, V1~V9).
 *
 * 계약: specs/026-parallel-model-download/contracts/download-view.md
 *       specs/008-download-conflict-feedback/contracts/download-view.md (원형)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **026이 `active`를 단수 → 복수(`DownloadProgress[]`)로 바꿨다.** 008의 네 불변식은
 * 전부 유지된다 — "거부 안내는 하나뿐, 자동 소멸, `active`와 `notice.requested`가
 * 같은 경우 없음". `noticeFor`의 "받는 중인가"는 "`active`에 `busyWith`가 있는가"로.
 *
 * 008 버그 ②의 정체는 「거부가 받던 것의 진행 표시를 지운다」였다 — V1이 그것을
 * 못 박으며, 거부는 `active` 배열을 절대 건드리지 못한다.
 *
 * 전부 순수 함수이므로 기기 없이 돈다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveDownloadView } from "../../src/models/download-view";
import type { DownloadProgress, DownloadRejection } from "../../src/models/types";

const receiving = (character: "quiet" | "narrative" | "english", fraction: number | null = 0.4) =>
  ({ character, fraction }) as DownloadProgress;

const rejected = (
  requested: "quiet" | "narrative" | "imaginative",
  busyWith: "quiet" | "narrative",
) => ({ requested, busyWith }) as DownloadRejection;

/* ───────────────────── V1~V7 — 판정 (계약 검증 표) ───────────────────── */

describe("resolveDownloadView (V1~V7)", () => {
  it("V1 — active=[], rejection=null → 빈 배열, 안내 없음", () => {
    const view = resolveDownloadView([], null);
    expect(view.active).toEqual([]);
    expect(view.notice).toBeNull();
  });

  it("V2 — active=[A,B], rejection=null → 그대로 싣고 안내 없음", () => {
    const a = receiving("quiet");
    const b = receiving("narrative");
    const view = resolveDownloadView([a, b], null);
    expect(view.active).toEqual([a, b]);
    expect(view.notice).toBeNull();
  });

  it("V3 — active=[], rejection={A,A} → 안내 null (받는 게 없으니 거부는 거짓)", () => {
    const view = resolveDownloadView([], rejected("quiet", "quiet"));
    expect(view.notice).toBeNull();
  });

  it("V4 — active=[A], rejection={A,A} → 안내 null (재시도 성공)", () => {
    const view = resolveDownloadView([receiving("quiet")], rejected("quiet", "quiet"));
    expect(view.notice).toBeNull();
  });

  it("V5 — active=[B], rejection={A,A} → 안내 null (busyWith A가 목록에 없음)", () => {
    const view = resolveDownloadView([receiving("narrative")], rejected("quiet", "quiet"));
    expect(view.notice).toBeNull();
  });

  it("V6 — active=[A], rejection={B,A} → 안내 실림 (008 원형: A 받는 중, B 거부됨)", () => {
    const view = resolveDownloadView([receiving("quiet")], rejected("narrative", "quiet"));
    expect(view.notice).toEqual({ requested: "narrative", busyWith: "quiet" });
  });

  it("V7 — active=[A,C], rejection={B,A} → 안내 실림 (A가 목록에 있고 B는 없음)", () => {
    const view = resolveDownloadView(
      [receiving("quiet"), receiving("english")],
      rejected("narrative", "quiet"),
    );
    expect(view.notice).toEqual({ requested: "narrative", busyWith: "quiet" });
  });
});

/* ─────────────────────────── 008 불변식 (배열 대응) ─────────────────────────── */

describe("008 불변식이 유지된다", () => {
  it("★ 거부가 받는 중인 것을 지우지 않는다 (I1 — 버그 ② 판정 방어)", () => {
    const active = [receiving("quiet", 0.7)];
    const view = resolveDownloadView(active, rejected("narrative", "quiet"));
    expect(view.active).toEqual(active);
  });

  it("active의 어느 원소도 notice.requested와 같은 character를 갖지 않는다 (I2/V7)", () => {
    const cases: [DownloadProgress[], DownloadRejection | null][] = [
      [[receiving("quiet")], rejected("narrative", "quiet")],
      [[receiving("quiet")], rejected("quiet", "quiet")],
      [[receiving("narrative")], rejected("narrative", "quiet")],
      [[], rejected("narrative", "quiet")],
      [[receiving("quiet"), receiving("english")], rejected("narrative", "quiet")],
    ];
    for (const [active, rejection] of cases) {
      const view = resolveDownloadView(active, rejection);
      if (view.notice !== null) {
        expect(active.some((p) => p.character === view.notice!.requested)).toBe(false);
      }
    }
  });

  it("안내가 쌓이지 않는다 (I3 — 타입이 배열이 아니므로 구조적으로 막힘)", () => {
    let view = resolveDownloadView([receiving("quiet")], rejected("narrative", "quiet"));
    view = resolveDownloadView([receiving("quiet")], rejected("imaginative", "quiet"));
    expect(Array.isArray(view.notice)).toBe(false);
    expect(view.notice).toEqual({ requested: "imaginative", busyWith: "quiet" });
  });

  it("받던 것이 전부 끝나면 안내가 사라진다 (I4)", () => {
    const view = resolveDownloadView([], rejected("narrative", "quiet"));
    expect(view.notice).toBeNull();
    expect(view.active).toEqual([]);
  });

  it("active의 character는 유일하다 — 같은 캐릭터가 두 번 나오지 않는다 (불변식 4)", () => {
    // 이 불변식은 acquisition이 그런 배열을 안 만드는 것으로 보장된다
    // (concurrent-acquisition.test.ts A8). resolveDownloadView는 받은 대로 싣는다.
    const view = resolveDownloadView([receiving("quiet"), receiving("narrative")], null);
    const chars = view.active.map((p) => p.character);
    expect(new Set(chars).size).toBe(chars.length);
  });
});

/* ─────────────────── V9 — 타입 선언을 직접 읽는다 ─────────────────── */

describe("원칙 IV — 담을 자리가 없다 (V9)", () => {
  const source = readFileSync(join(__dirname, "..", "..", "src", "models", "types.ts"), "utf8");

  const declarationOf = (name: string) => {
    const start = source.indexOf(`export type ${name} = {`);
    expect(start).toBeGreaterThan(-1);
    return source.slice(start, source.indexOf("};", start));
  };

  it("★ DownloadView에 시간·속도·바이트·구간을 담을 자리가 없다", () => {
    const declaration = declarationOf("DownloadView");
    expect(declaration).not.toMatch(
      /elapsed|remaining|eta|speed|perSecond|\bbytes\b|segment|구간|시간|속도/i,
    );
    // 자리는 둘뿐이다 (active, notice).
    expect(declaration.match(/^\s{2}\w+[?]?:/gm)).toHaveLength(2);
  });

  it("★ DownloadRejection에 시각·횟수·까닭을 담을 자리가 없다", () => {
    const declaration = declarationOf("DownloadRejection");
    expect(declaration).not.toMatch(/\bat\b|count|times|reason|elapsed/i);
    expect(declaration.match(/^\s{2}\w+[?]?:/gm)).toHaveLength(2);
  });

  it("★ DownloadProgress가 여전히 character·fraction 둘뿐이다 (세그먼트 정보 없음)", () => {
    const declaration = declarationOf("DownloadProgress");
    expect(declaration).not.toMatch(/segment|구간|bytesWritten|perSegment|elapsed|speed/i);
    expect(declaration.match(/^\s{2}\w+[?]?:/gm)).toHaveLength(2);
  });

  it("★ 화면이 그릴 것에 모델 정보가 없다", () => {
    const declaration = declarationOf("DownloadView") + declarationOf("DownloadRejection");
    expect(declaration).not.toMatch(/asset|\burl\b|md5|expectedBytes|gguf|quant/i);
  });
});

/* ─────────────────── 원칙 V — 모르는 것을 지어내지 않는다 ─────────────────── */

describe("원칙 V — 백분율을 지어내지 않는다", () => {
  it("탭 복귀 직후 백분율이 null인 채로 통과한다", () => {
    const view = resolveDownloadView([receiving("quiet", null)], null);
    expect(view.active).toEqual([{ character: "quiet", fraction: null }]);
  });

  it("여러 캐릭터가 각각 다른 진행도로 살아 나간다", () => {
    const view = resolveDownloadView(
      [receiving("quiet", null), receiving("narrative", 0.5), receiving("english", 1)],
      null,
    );
    expect(view.active).toHaveLength(3);
    expect(view.active.map((p) => p.fraction)).toEqual([null, 0.5, 1]);
  });
});
