/**
 * 준비 상태 판정 검증 (D1~D10, D15~D17).
 *
 * 계약: specs/003-character-model-files/contracts/readiness.md
 *
 * **판정이 순수 함수라 전부 기기 없이 돈다.** 파일이 있는·없는·잘린·깨진 상태를 입력으로
 * 만들어 넷이 갈리는지 본다.
 *
 * **D5가 헌법 원칙 V의 방어선이다** — 넷이 서로 구분되지 않으면 "왜 못 쓰는지"를 말할 수
 * 없게 된다. 002의 `SignalValue`가 `none`과 `unknown`을 가른 것과 같은 이유다.
 */

import { readinessOf, type ReadinessInput } from "../../src/models/readiness";

/** 온전히 준비된 상태. 각 테스트가 여기서 한 가지씩 무너뜨린다. */
const READY: ReadinessInput = {
  assetKey: "a1",
  expectedBytes: 1000,
  expectedMd5: "abc",
  file: { exists: true, bytes: 1000 },
  verdict: { assetKey: "a1", verifiedMd5: "abc", verifiedBytes: 1000, passed: true },
  paused: null,
  hasPartialFile: false,
};

describe("준비 상태 판정", () => {
  // D1
  it("파일도 흔적도 없으면 '받지 않음'이다", () => {
    const state = readinessOf({ ...READY, file: { exists: false, bytes: null }, verdict: null });
    expect(state.kind).toBe("not-downloaded");
  });

  // D2 — 이어받을 수 있는 상태
  it("중단 정보가 있으면 '받다 말았음'이고 이어받을 수 있다", () => {
    const state = readinessOf({
      ...READY,
      file: { exists: false, bytes: null },
      verdict: null,
      paused: { assetKey: "a1", state: {} },
    });
    expect(state.kind).toBe("partial");
    if (state.kind === "partial") expect(state.resumable).toBe(true);
  });

  // D2 — 앱이 갑자기 죽어 savable()을 부르지 못한 경우 (research.md §1)
  it("부분 파일만 있으면 '받다 말았음'이되 이어받을 수 없다", () => {
    const state = readinessOf({
      ...READY,
      file: { exists: false, bytes: null },
      verdict: null,
      paused: null,
      hasPartialFile: true,
    });
    expect(state.kind).toBe("partial");
    if (state.kind === "partial") expect(state.resumable).toBe(false);
  });

  // D3
  it("크기가 예상보다 작으면 '받다 말았음'이다", () => {
    const state = readinessOf({ ...READY, file: { exists: true, bytes: 400 }, verdict: null });
    expect(state.kind).toBe("partial");
  });

  // D4
  it("전부 갖추면 '쓸 수 있음'이다", () => {
    expect(readinessOf(READY).kind).toBe("ready");
  });

  // D5 — 이 기능에서 헌법 원칙 V가 걸리는 지점
  it("넷이 서로 구분된다", () => {
    const notDownloaded = readinessOf({
      ...READY,
      file: { exists: false, bytes: null },
      verdict: null,
    });
    const partial = readinessOf({ ...READY, file: { exists: true, bytes: 400 }, verdict: null });
    const unusable = readinessOf({ ...READY, verdict: { ...READY.verdict!, passed: false } });
    const ready = readinessOf(READY);

    const kinds = [notDownloaded.kind, partial.kind, unusable.kind, ready.kind];
    expect(new Set(kinds).size).toBe(4);
  });

  // D6
  it("실패한 갈래에 까닭이 담긴다", () => {
    const partial = readinessOf({ ...READY, file: { exists: true, bytes: 400 }, verdict: null });
    const unusable = readinessOf({ ...READY, verdict: { ...READY.verdict!, passed: false } });

    if (partial.kind === "partial") expect(partial.reason).not.toBe("");
    if (unusable.kind === "unusable") expect(unusable.reason).not.toBe("");
  });

  // D7 — FR-021c. 파일의 존재가 판정 기준이 아니다
  it("검증 기록이 없으면 '쓸 수 있음'이 아니다", () => {
    const state = readinessOf({ ...READY, verdict: null });
    expect(state.kind).toBe("unusable");
  });

  // D8 — 명확화 세션의 결론 (FR-021e, SC-019)
  it("검증을 통과했어도 파일이 사라졌으면 '쓸 수 있음'이 아니다", () => {
    const state = readinessOf({ ...READY, file: { exists: false, bytes: null } });
    expect(state.kind).not.toBe("ready");
  });

  // D9 — 검증 결과는 "그때 온전했다"이지 "지금도 있다"가 아니다
  it("검증을 통과했어도 지금 크기가 다르면 '쓸 수 있음'이 아니다", () => {
    const state = readinessOf({ ...READY, file: { exists: true, bytes: 999 } });
    expect(state.kind).not.toBe("ready");
  });

  // D10 — 설계 중 발견. 로스터가 바뀌면 옛 결과가 새 자산의 것으로 오독된다
  it("다른 자산의 검증 결과면 '쓸 수 있음'이 아니다", () => {
    const state = readinessOf({
      ...READY,
      verdict: { ...READY.verdict!, assetKey: "a9" },
    });
    expect(state.kind).toBe("unusable");
  });

  // D15 — 오류 메시지가 원칙 III의 누출 경로다
  it("까닭에 모델 정보가 담기지 않는다", () => {
    const states = [
      readinessOf({ ...READY, file: { exists: true, bytes: 400 }, verdict: null }),
      readinessOf({ ...READY, verdict: null }),
      readinessOf({ ...READY, verdict: { ...READY.verdict!, passed: false } }),
    ];

    for (const state of states) {
      const reason = "reason" in state ? state.reason : "";
      expect(reason).not.toContain("a1"); // 자산키
      expect(reason).not.toContain("abc"); // 지문
      expect(reason).not.toContain("1000"); // 크기
      expect(reason).not.toMatch(/http/i); // 주소
    }
  });

  // D16 — 기준값을 받은 다음에 재기로 했으므로(research.md) 그 전까지 크기 기준이 없다
  it("기준 크기가 없으면 크기를 이유로 '받다 말았음'이 되지 않는다", () => {
    const state = readinessOf({
      ...READY,
      expectedBytes: 0,
      expectedMd5: "",
      file: { exists: true, bytes: 12345 },
      verdict: { assetKey: "a1", verifiedMd5: "zzz", verifiedBytes: 12345, passed: true },
    });
    expect(state.kind).toBe("ready");
  });

  // D17 — 기준값이 없어도 채록 절차는 반드시 거친다
  it("기준 크기가 없어도 검증 기록이 없으면 '쓸 수 있음'이 아니다", () => {
    const state = readinessOf({
      ...READY,
      expectedBytes: 0,
      expectedMd5: "",
      file: { exists: true, bytes: 12345 },
      verdict: null,
    });
    expect(state.kind).toBe("unusable");
  });
});
