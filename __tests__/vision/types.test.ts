import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 사진 읽기 타입의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/data-model.md
 *       specs/011-photo-vision-summary/contracts/vision-engine.md V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **선언을 문자열로 직접 읽는다. 값을 만들어 검사하지 않는다.**
 *
 * **007이 실측으로 배운 것이다**: `AppScreen`에 `stage: string`을 주입해 보니 jest는
 * 38개가 전부 통과했다 — 타입은 지워지므로 `Object.keys()`가 그것을 보지 못한다.
 * **잡은 것은 `tsc`뿐이었고 그것은 `npm run lint`에 있었다.**
 *
 * 그래서 `npm test`만 돌리는 사람에게도 방어가 서도록 선언을 직접 읽는다.
 * 008의 `download-view` 검사, 009의 `day-boundary` 검사가 같은 방식으로 고쳐졌다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SOURCE = readFileSync(join(__dirname, "../../src/vision/types.ts"), "utf8");

/**
 * 주석을 걷어낸 소스.
 *
 * **008이 배운 것**: 「이 파일이 `ModelAsset`을 import 하지 않는다」는 주석이 그 단어를
 * 담고 있어서 소스 전체를 훑으면 걸린다. **설명이 위반으로 잡히면 아무도 설명을 쓰지
 * 않는다.**
 */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/**
 * 선언 하나를 잘라 낸다 — 다음 `export type`이 나오기 전까지.
 *
 * **잘라 낸 것이 실제로 그 선언인지 확인하는 단언을 함께 둔다.** 008이 배운 것이며,
 * 슬라이스가 어긋나도 검사는 통과할 수 있다 — 그때 **실패하지 않으면서 방어만 사라진다.**
 */
function declarationOf(name: string): string {
  const start = CODE.indexOf(`export type ${name} =`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = CODE.slice(start);

  const nextExport = rest.indexOf("\nexport type ", 1);
  const declaration = nextExport >= 0 ? rest.slice(0, nextExport) : rest;

  // 잘라 낸 것이 이 선언 하나가 맞는가.
  expect(declaration).toContain(`export type ${name} =`);
  expect(declaration.match(/export type \w+ =/g)).toHaveLength(1);
  return declaration;
}

describe("PhotoCaption — 원칙 IV의 첫 방어선", () => {
  const declaration = declarationOf("PhotoCaption");

  it("자리가 넷이다 — photoId·takenAt·text·resizedPath (017)", () => {
    const fields = [...declaration.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]);
    expect(fields.sort()).toEqual(["photoId", "resizedPath", "takenAt", "text"]);
  });

  it("resizedPath는 옵셔널이다 (017 — 원본과 같은 경로면 없다)", () => {
    expect(declaration).toMatch(/resizedPath\?:\s*string/);
  });

  // ★ 이것이 이 파일의 핵심이다. 자리가 없으면 담을 수 없다.
  it.each([
    ["elapsedMs", "처리 시간"],
    ["durationMs", "처리 시간"],
    ["tokens", "토큰 수"],
    ["imageTokens", "토큰 수"],
    ["confidence", "확신도"],
    ["score", "점수"],
    ["perSecond", "속도"],
  ])("%s를 담지 않는다 (%s — 원칙 IV)", (field) => {
    expect(declaration).not.toContain(field);
  });

  it("확신도를 두면 「낮은 것은 빼자」가 한 줄로 가능해진다 — 그것이 임계값이다", () => {
    expect(declaration).not.toMatch(/confidence|certainty|probability/i);
  });
});

describe("PhotoVision — 세 수가 함께 다닌다 (FR-006)", () => {
  const declaration = declarationOf("PhotoVision");

  it("captions·considered·available 셋을 지닌다", () => {
    const fields = [...declaration.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]);
    expect(fields.sort()).toEqual(["available", "captions", "considered"]);
  });

  it("시간·속도·점수를 담지 않는다 (원칙 IV)", () => {
    expect(declaration).not.toMatch(/elapsed|duration|tokens|perSecond|score/i);
  });
});

describe("VisionOutcome — 대체가 타입 수준에서 불가능하다 (원칙 I)", () => {
  const declaration = declarationOf("VisionOutcome");

  it("갈래가 여섯이다", () => {
    const kinds = [...declaration.matchAll(/kind:\s*"([a-z-]+)"/g)].map((m) => m[1]);
    expect(kinds.sort()).toEqual([
      "cancelled",
      "failed",
      "no-photos",
      "not-ready",
      "seen",
      "skipped",
    ]);
  });

  it("seen과 no-photos가 갈린다 — 「보았다」와 「볼 것이 없었다」는 다르다", () => {
    expect(declaration).toContain('kind: "seen"');
    expect(declaration).toContain('kind: "no-photos"');
  });

  // 002의 GenerationFailure에 `text`가 없는 것과 같은 구조.
  it("실패 갈래에 대신 쓸 캡션이 없다 (FR-021, 원칙 I)", () => {
    const failures = declaration.slice(declaration.indexOf('kind: "not-ready"'));
    expect(failures).not.toMatch(/captions|vision:|fallback/);
  });
});

describe("VisionDepth — none이 들어오지 못한다", () => {
  const declaration = declarationOf("VisionDepth");

  it("quick과 detailed 둘뿐이다", () => {
    expect(declaration).toContain('"quick"');
    expect(declaration).toContain('"detailed"');
  });

  // 「깊이가 none인 캡션」은 뜻이 없는 상태다.
  it("none을 담지 않는다", () => {
    expect(declaration).not.toContain('"none"');
  });
});
