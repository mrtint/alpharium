/**
 * generate() 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/diary.md 「추론 어댑터 확장」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 헌법 원칙 I의 방어선이다.**
 *
 * 두 가지를 지킨다:
 *  1. 두 어댑터 모두 정직하게 `not-implemented`를 반환한다(FR-015)
 *  2. **실패 결과 어디에도 텍스트가 없다**(FR-016, SC-004)
 *
 * 2번이 핵심이다. "일기를 생성할 수 없습니다" 같은 플레이스홀더가 일기 자리에 들어가는
 * 순간 가짜 일기와 구분이 사라진다. 실패가 텍스트를 반환하기 시작하면 이 제품은 원칙 I을
 * 잃는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { buildRequest } from "../../src/diary/request";
import type { DiaryRequest } from "../../src/diary/types";
import { createDesktopServerBackend } from "../../src/inference/desktop-server";
import { createOnDeviceBackend } from "../../src/inference/on-device";
import type { GenerationFailure, InferenceBackend } from "../../src/inference/types";
import { emptyDay, richDay, unknownDay } from "../../src/signals/fake";

/** 요청 하나를 만든다. buildRequest를 거쳐 실제 경로와 같은 모양을 쓴다. */
function requestFor(day = richDay("2026-08-12")): DiaryRequest {
  const result = buildRequest(day, "quiet", "quick");
  if (!result.ok) throw new Error("테스트 준비 실패: 요청을 만들지 못했다");
  return result.request;
}

/** 두 어댑터를 같은 표로 검증한다. 어느 쪽도 예외가 아니다. */
const backends: readonly { name: string; make: () => InferenceBackend }[] = [
  { name: "온디바이스", make: () => createOnDeviceBackend(async () => ({})) },
  {
    name: "데스크톱 서버",
    make: () => createDesktopServerBackend("http://localhost:8080", async () => true),
  },
];

describe("generate — 아직 구현되지 않았음을 정직하게 반환한다 (FR-015)", () => {
  // contracts/diary.md 「추론 어댑터 검증 표」 2행
  it.each(backends)("$name: 어떤 요청이든 not-implemented", async ({ make }) => {
    const result = await make().generate(requestFor());

    expect(result).toEqual({ kind: "not-implemented" });
  });

  it.each(backends)("$name: 신호가 비어도 not-implemented", async ({ make }) => {
    const backend = make();

    expect(await backend.generate(requestFor(emptyDay("2026-08-12")))).toEqual({
      kind: "not-implemented",
    });
    expect(await backend.generate(requestFor(unknownDay("2026-08-12")))).toEqual({
      kind: "not-implemented",
    });
  });

  it.each(backends)("$name: 예외를 던지지 않는다 — 실패는 값이다", async ({ make }) => {
    // 실패가 값이어야 파이프라인이 어느 단계에서 멈췄는지 말할 수 있다(FR-019).
    await expect(make().generate(requestFor())).resolves.toBeDefined();
  });

  it.each(backends)("$name: isAvailable()은 001 그대로 남아 있다", async ({ make }) => {
    const backend = make();

    expect(typeof backend.isAvailable).toBe("function");
    expect(await backend.isAvailable()).toEqual({ kind: "loaded" });
  });
});

describe("실패 결과에 텍스트가 없다 (FR-016, SC-004) — 원칙 I의 방어선", () => {
  /**
   * GenerationFailure의 어느 갈래에도 text 필드가 없어야 한다.
   * 있으면 그 순간 가짜 일기가 만들어질 자리가 생긴다.
   */
  const failures: readonly GenerationFailure[] = [
    { kind: "not-implemented" },
    { kind: "backend-unavailable", reason: "네이티브 모듈이 없다" },
    { kind: "generation-failed", reason: "추론 중 중단됐다" },
  ];

  it.each(failures)("$kind 갈래에 text 필드가 없다", (failure) => {
    expect("text" in failure).toBe(false);
    expect(Object.keys(failure)).not.toContain("text");
  });

  it.each(backends)("$name: 반환된 실패에 text가 없다", async ({ make }) => {
    const result = await make().generate(requestFor());

    expect("text" in result).toBe(false);
  });

  it.each(backends)("$name: 반환값을 직렬화해도 본문이 없다", async ({ make }) => {
    const result = await make().generate(requestFor());
    const serialized = JSON.stringify(result);

    // 플레이스홀더가 끼어들었다면 여기서 잡힌다.
    expect(serialized).toBe('{"kind":"not-implemented"}');
    expect(serialized).not.toContain("생성할 수 없");
    expect(serialized).not.toContain("일기");
  });

  it("실패의 reason은 원인이지 일기 본문이 아니다", () => {
    // reason이 있는 두 갈래도 그것은 진단용 사실이지 사용자가 읽을 일기가 아니다.
    // 호출자가 reason을 일기 자리에 넣지 않도록 타입이 text와 이름을 달리한다.
    const failure: GenerationFailure = { kind: "generation-failed", reason: "중단됨" };

    expect(Object.keys(failure).sort()).toEqual(["kind", "reason"]);
  });
});

describe("not-implemented는 가짜 응답이 아니다", () => {
  /**
   * 원칙 I이 금지한 것은 *미리 만들어 둔 응답을 보여주는 경로*다.
   * 없는 것을 없다고 말하는 것은 그 반대다(contracts/diary.md 불변식 2).
   */
  it("반환값에 담긴 것은 상태뿐이고 내용이 없다", async () => {
    const result = await createOnDeviceBackend(async () => ({})).generate(requestFor());

    expect(Object.keys(result)).toEqual(["kind"]);
  });

  it("요청이 달라도 같은 값을 돌려준다 — 요청에 맞춘 그럴듯한 답을 만들지 않는다", async () => {
    const backend = createOnDeviceBackend(async () => ({}));

    const forRich = await backend.generate(requestFor(richDay("2026-08-12")));
    const forEmpty = await backend.generate(requestFor(emptyDay("2026-08-13")));

    expect(forRich).toEqual(forEmpty);
  });
});
