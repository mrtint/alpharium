import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  checkEnvFile,
  checkSeedFile,
  checkSourceFile,
  checkVisionFile,
  formatViolations,
} from "../../scripts/constitution-rules";

/**
 * contracts/constitution-check.md 「검증 표」.
 *
 * 마지막 케이스(local 설정의 서버 주소 키는 통과)가 중요하다. 검사가 과하게 잡으면
 * local의 정당한 설정까지 막아 개발이 불가능해진다.
 */
describe("checkEnvFile", () => {
  it("위반이 없으면 0건", () => {
    expect(checkEnvFile(".env.production", "EXPO_PUBLIC_APP_ENV=prod")).toEqual([]);
  });

  it("prod에 서버 주소 키가 있으면 위반 (FR-014)", () => {
    const violations = checkEnvFile(
      ".env.production",
      "EXPO_PUBLIC_APP_ENV=prod\nEXPO_PUBLIC_DESKTOP_INFERENCE_URL=http://x",
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].key).toBe("EXPO_PUBLIC_DESKTOP_INFERENCE_URL");
    expect(violations[0].file).toBe(".env.production");
  });

  it("dev에 서버 주소 키가 있으면 위반 (FR-014)", () => {
    const violations = checkEnvFile(".env.dev", "EXPO_PUBLIC_DESKTOP_INFERENCE_URL=http://x");
    expect(violations).toHaveLength(1);
  });

  it("원격 API 추론 설정이 있으면 위반 (FR-015)", () => {
    const violations = checkEnvFile(
      ".env.development",
      "EXPO_PUBLIC_AI_API_BASE_URL=https://example.com/v1",
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toContain("원격 API");
  });

  it("대체 응답 스위치가 있으면 위반 (FR-016)", () => {
    const violations = checkEnvFile(".env.development", "EXPO_PUBLIC_ENABLE_MOCK_FALLBACK=true");
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toContain("대체 응답");
  });

  it("local에 서버 주소 키가 있는 것은 통과한다 — 과잉 차단 방지 (FR-011)", () => {
    const violations = checkEnvFile(
      ".env.development",
      "EXPO_PUBLIC_APP_ENV=local\nEXPO_PUBLIC_DESKTOP_INFERENCE_URL=http://localhost:8080/v1",
    );

    expect(violations).toEqual([]);
  });

  it("값을 비워도 키가 있으면 위반이다 — 키가 있으면 언젠가 값이 채워진다", () => {
    const violations = checkEnvFile(".env.production", "EXPO_PUBLIC_DESKTOP_INFERENCE_URL=");
    expect(violations).toHaveLength(1);
  });

  it("주석 처리된 줄은 위반이 아니다", () => {
    const violations = checkEnvFile(
      ".env.production",
      "# EXPO_PUBLIC_AI_API_BASE_URL=https://example.com\nEXPO_PUBLIC_APP_ENV=prod",
    );

    expect(violations).toEqual([]);
  });
});

describe("formatViolations", () => {
  it("위반이 없으면 통과 메시지", () => {
    expect(formatViolations([])).toContain("통과");
  });

  it("어느 파일의 어느 키가 왜 걸렸는지 드러난다 (FR-029)", () => {
    const output = formatViolations([
      { file: ".env.production", key: "EXPO_PUBLIC_DESKTOP_INFERENCE_URL", rule: "테스트 규칙" },
    ]);

    expect(output).toContain(".env.production");
    expect(output).toContain("EXPO_PUBLIC_DESKTOP_INFERENCE_URL");
    expect(output).toContain("테스트 규칙");
  });
});

/**
 * 006 — 소스 검사 (FR-010, FR-026, SC-008b).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **런타임 테스트로는 잡을 수 없는 것을 잡는다.**
 *
 * 005에서 파이프라인 테스트가 전부 초록불이었는데도 화면이 어댑터를 직접 불러
 * `store.save()`가 기기에서 한 번도 돌지 않았다. 「이 경로가 저장까지 간다」를 확인해도
 * **저장소 어딘가에 남은 다른 직접 호출**은 보이지 않기 때문이다.
 *
 * 아래 테스트는 **위반을 일부러 넣으면 잡히는지**를 확인한다 — 초록불이 무엇을 뜻하는지
 * 알 수 없는 검사는 검사가 아니다(원칙 V).
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("checkSourceFile — 어댑터 직접 사용 (006)", () => {
  it("화면이 backend.generate()를 직접 부르면 잡는다", () => {
    const violations = checkSourceFile(
      "src/ui/SomeScreen.tsx",
      "const result = await backend.generate(request);",
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toMatch(/파이프라인/);
  });

  it("조립이 onDeviceBackend()를 직접 만들면 잡는다", () => {
    const violations = checkSourceFile("src/app/wiring.ts", "const b = onDeviceBackend();");

    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toMatch(/select\.ts/);
  });

  it("데스크톱 어댑터를 직접 만들어도 잡는다", () => {
    const violations = checkSourceFile(
      "src/ui/Screen.tsx",
      "const b = createDesktopServerBackend(url, probe);",
    );

    expect(violations).toHaveLength(1);
  });

  it("윈도우 경로 구분자에서도 잡는다", () => {
    const violations = checkSourceFile(
      "src\\ui\\Screen.tsx",
      "const result = await backend.generate(request);",
    );

    expect(violations).toHaveLength(1);
  });

  it("몇 번째 줄인지 지목한다 (FR-029)", () => {
    const violations = checkSourceFile(
      "src/ui/Screen.tsx",
      ["const a = 1;", "const b = 2;", "await backend.generate(request);"].join("\n"),
    );

    expect(violations[0].file).toBe("src/ui/Screen.tsx:3");
  });

  /**
   * **주석은 규칙을 설명하는 자리다.** 설명이 위반으로 잡히면 아무도 설명을 쓰지 않게
   * 되고, 그러면 다음 사람이 왜 이 규칙이 있는지 모른다.
   */
  it("주석에 적힌 것은 위반이 아니다", () => {
    const sources = [
      "// backend.generate()를 직접 부르지 않는다",
      " * onDeviceBackend()를 직접 만들지 않는다",
    ];

    for (const source of sources) {
      expect(checkSourceFile("src/ui/Screen.tsx", source)).toHaveLength(0);
    }
  });

  /**
   * **`src/inference/`는 어댑터를 구현하고 고르는 자리다.** 거기서 `generate`가 나오는
   * 것은 당연하며, 금지 대상은 그것을 건너뛰고 쓰는 쪽이다.
   */
  it("추론 계층 자신은 검사하지 않는다", () => {
    const violations = checkSourceFile("src/inference/select.ts", "return onDeviceBackend();");

    expect(violations).toHaveLength(0);
  });

  it("파이프라인을 거치는 화면은 잡히지 않는다", () => {
    const violations = checkSourceFile(
      "src/ui/Screen.tsx",
      "const result = await pipeline.run({ day, now, character, vision });",
    );

    expect(violations).toHaveLength(0);
  });
});

/**
 * 007 FR-007 — 화면이 모델 자산에 닿는 것을 막는다 (원칙 III).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **「쓸 수 없다」를 사람의 주의력이 아니라 검사로 지킨다.**
 *
 * 003의 `CharacterListScreen`과 007의 `CharacterPicker`가 `roster.ts`를 import 하지
 * 않는 것으로 방어를 세웠는데, **다음 사람이 무심코 넣으면 그 방어가 사라진다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe("checkSourceFile — 화면이 모델 자산에 닿는다 (007 FR-007)", () => {
  it("src/ui가 roster를 import 하면 잡는다", () => {
    const violations = checkSourceFile(
      "src/ui/CharacterPicker.tsx",
      'import { assetFor } from "../models/roster";',
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toContain("원칙 III");
  });

  it("src/ui가 assetFor를 쓰면 잡는다 — 경로를 우회해도 마찬가지다", () => {
    const violations = checkSourceFile("src/ui/Foo.tsx", "const asset = assetFor(character);");

    expect(violations).toHaveLength(1);
  });

  it("src/ui가 ModelAsset 타입에 닿으면 잡는다", () => {
    const violations = checkSourceFile("src/ui/Foo.tsx", "let a: ModelAsset | null = null;");

    expect(violations).toHaveLength(1);
  });

  /**
   * **`ModelReadiness`는 막지 않는다.**
   *
   * 「쓸 수 있는가」는 모델이 무엇인지가 아니다 — 003의 목록이 준비 상태를 그리려면
   * 필요하고, 막으면 화면이 상태를 말할 수 없다.
   */
  it("준비 상태 타입은 막지 않는다 — 모델 정보가 아니다", () => {
    const violations = checkSourceFile(
      "src/ui/CharacterListScreen.tsx",
      'import type { ModelReadiness } from "../models/types";',
    );

    expect(violations).toEqual([]);
  });

  it("src/app은 자산에 닿아도 된다 — 조립이지 화면이 아니다", () => {
    const violations = checkSourceFile(
      "src/app/wiring.ts",
      'import { assetFor } from "../models/roster";',
    );

    expect(violations).toEqual([]);
  });

  it("주석에서 설명하는 것은 위반이 아니다", () => {
    // 왜 쓰지 않는지 설명하는 자리다. 설명이 잡히면 아무도 설명을 쓰지 않는다.
    const violations = checkSourceFile("src/ui/Foo.tsx", "// assetFor를 쓰지 않는다");

    expect(violations).toEqual([]);
  });

  it("실제 CharacterPicker는 통과한다", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "src", "ui", "CharacterPicker.tsx"),
      "utf8",
    );

    expect(checkSourceFile("src/ui/CharacterPicker.tsx", source)).toEqual([]);
  });
});

/* ─────────────────────── 심는 도구 검사 (010) ─────────────────────── */

describe("심는 도구가 일기에 닿는 것을 잡는다 (010 FR-022, 원칙 IV)", () => {
  /**
   * ─────────────────────────────────────────────────────────────────────────
   * **왜 이 검사가 필요한가**: 010의 도구는 하루를 통제할 수 있게 해 준다. 그
   * 자리에서 **「심은 하루로 캐릭터를 비교해 보자」가 아주 자연스럽게 떠오른다** —
   * 조건이 갖춰진 것처럼 보이기 때문이다.
   *
   * 그것이 원칙 IV가 금지한 「측정 장치」이고, 합성 하루로 품질을 재는 것은 원칙 V의
   * 「합성 데이터로 모델 품질을 평가하지 않는다」도 함께 어긴다.
   * ─────────────────────────────────────────────────────────────────────────
   */
  it.each([
    ['import { listDiaries } from "../src/diary/store";', "일기 저장소를 import"],
    ['import { runPipeline } from "../src/diary/pipeline";', "파이프라인을 import"],
    ['import { promptFor } from "../src/diary/prompt";', "프롬프트를 import"],
    ['const path = "files/diary/2026-08-20.json";', "일기 파일 경로"],
    ["const all = await listDiaries(port);", "일기 목록 조회"],
  ])("%s — %s", (line) => {
    const violations = checkSeedFile("scripts/seed/device.ts", line);

    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toContain("원칙 IV");
  });

  it.each([
    ['import { onDeviceBackend } from "../src/inference/on-device";', "추론 어댑터 import"],
    ["const out = await backend.generate(input);", "추론 호출"],
    ["const ctx = await initLlama({ model });", "모델 적재"],
  ])("%s — %s", (line) => {
    expect(checkSeedFile("scripts/seed-day.mts", line).length).toBeGreaterThan(0);
  });

  it("심는 도구가 아닌 파일은 보지 않는다", () => {
    // `src/`의 파일은 `checkSourceFile`의 몫이다. 두 검사가 겹치면 규칙이 두 곳에 생긴다.
    expect(checkSeedFile("src/diary/store.ts", 'import { listDiaries } from "./store";')).toEqual(
      [],
    );
    expect(checkSeedFile("scripts/run-device-tests.mjs", "listDiaries()")).toEqual([]);
  });

  it("윈도우 경로 구분자에서도 잡는다", () => {
    // `String.raw`를 쓴다 — 보통 문자열의 `\`는 런타임에 역슬래시 **하나**라서
    // 윈도우 경로를 흉내 내지 못한다.
    expect(checkSeedFile(String.raw`scripts\seed\plan.ts`, "files/diary")).toHaveLength(1);
  });

  /**
   * **주석은 규칙을 설명하는 자리다.** 008의 교훈 — 설명이 위반으로 잡히면 아무도
   * 설명을 쓰지 않는다. 이 저장소의 코드는 주석으로 근거를 남기는 것이 관행이다.
   */
  it.each([
    "// 도구는 files/diary에 닿지 않는다",
    " * `listDiaries`를 부르지 않는다 — 원칙 IV",
    "  // generate( 를 부르면 안 된다",
  ])("주석은 위반이 아니다: %s", (line) => {
    expect(checkSeedFile("scripts/seed/plan.ts", line)).toEqual([]);
  });

  it("심는 도구가 쓰는 정상적인 것은 잡지 않는다", () => {
    const normal = [
      'import { selectableDays } from "../../src/config/day-boundary.ts";',
      'import { patchDate } from "./exif.ts";',
      "const rows = queryFolder();",
      "const planned = planSeeding(shape, day, new Date());",
    ].join("\n");

    expect(checkSeedFile("scripts/seed-day.mts", normal)).toEqual([]);
  });
});

/* ─────────────────────── 사진 읽기 검사 (011) ─────────────────────── */

/**
 * 011 FR-033·research §7. 010의 심는 도구 검사와 같은 자리다.
 *
 * **캡션이 일기의 재료가 되는 자리에서 「품질을 재 보자」가 자연스럽게 떠오른다.**
 * 옆 저장소가 이미 쟀고(2026-08-10), 그 측정을 이 저장소로 옮기면 측정 장치가 된다.
 */
describe("checkVisionFile", () => {
  it("src/vision/ 밖은 보지 않는다", () => {
    const line = 'import { listDiaries } from "../diary/store";';
    expect(checkVisionFile("src/diary/store.ts", line)).toEqual([]);
    expect(checkVisionFile("src/ui/DiaryHomeScreen.tsx", line)).toEqual([]);
  });

  it.each([
    ['import { saveDiary } from "../diary/store";', "일기 저장소를 import"],
    ['import { createPipeline } from "../diary/pipeline";', "파이프라인을 import"],
    ['import { judge } from "../diary/acceptance";', "판정을 import"],
    ['const path = "files/diary/2026-08-20.json";', "일기 파일 경로"],
    ["const all = await listDiaries(port);", "일기 목록 조회"],
    ["function compare(entry: DiaryEntry) {", "일기 타입에 닿음"],
  ])("%s — %s (원칙 IV)", (line) => {
    const violations = checkVisionFile("src/vision/caption.ts", line);

    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toContain("원칙 IV");
  });

  // research §7 — 원칙 I이 조용히 깨지는 경로다.
  it("캡션이 일기의 샘플링을 함께 쓰면 위반 (원칙 I)", () => {
    const violations = checkVisionFile(
      "src/vision/vision-port.ts",
      'import { SAMPLING } from "../inference/sampling";',
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toContain("원칙 I");
    expect(violations[0].rule).toContain("일기가 함께 바뀐다");
  });

  /** 008의 교훈 — 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다. */
  it.each([
    "// 이 파일은 files/diary에 닿지 않는다",
    " * `DiaryEntry`를 import 하지 않는다 — 원칙 IV",
    "  // inference/sampling을 재사용하지 않는다",
  ])("주석은 위반이 아니다: %s", (line) => {
    expect(checkVisionFile("src/vision/types.ts", line)).toEqual([]);
  });

  it("사진 읽는 자리가 쓰는 정상적인 것은 잡지 않는다", () => {
    const normal = [
      'import type { Photo } from "../signals/types";',
      'import { CAPTION_SAMPLING } from "./sampling";',
      'import type { VisionDepth } from "./types";',
      "const selected = selectForVision(photos);",
    ].join("\n");

    expect(checkVisionFile("src/vision/caption.ts", normal)).toEqual([]);
  });

  it("실제 src/vision/ 파일이 규칙을 지킨다", () => {
    const dir = join(__dirname, "../../src/vision");
    const files = readdirSync(dir);
    const violations = files
      .filter((f) => /\.tsx?$/.test(f))
      .flatMap((f) => checkVisionFile(`src/vision/${f}`, readFileSync(join(dir, f), "utf8")));

    expect(violations).toEqual([]);
  });
});
