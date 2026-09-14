import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 042 — 사진이 있으면 반드시 보고, 끄는 길을 두지 않는다.
 *
 * 계약: specs/042-photo-vision-always/contracts/photo-vision-always.md C1·C3·C6·C7
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이 파일이 `tsc`가 구조적으로 못 잡는 자리를 지킨다.**
 *
 * 유니온을 **좁히는** 위반은 `tsc`가 잡지만, **넓히는** 것은 타입 오류가 아니다 —
 * `VisionSetting`에 `"none"`을 되살려도 컴파일은 통과한다. 그 순간 「사용자가 끄는
 * 경로를 두지 않는다」(헌법 v1.7.0 MUST NOT)가 조용히 깨진다.
 *
 * 011의 `vision/types.test.ts`, 007 이후의 관례대로 **선언을 문자열로 직접 읽는다.**
 *
 * **주석은 걷어내고 검사한다**(011이 세우고 035가 재확인). 이 저장소의 주석은 «무엇을
 * 왜 금지하는가»를 적으므로 금지어가 설명 안에 정당하게 등장한다 — 주석째로 검사하면
 * 이유를 적을 수 없게 되고, 그것은 이 저장소가 지켜 온 것과 정반대다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ROOT = join(__dirname, "../..");

/** 주석을 걷어낸 소스를 읽는다. */
function codeOf(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

/* ═══════════════ C1 — 사진을 볼지 고르는 자리가 없다 (FR-005·FR-006) ═══════════════ */

describe("C1 — 고를 자리가 없다 (헌법 v1.7.0 MUST NOT)", () => {
  const TYPES = codeOf("src/diary/types.ts");

  /**
   * ★ **`tsc`는 이 위반을 못 잡는다.** 유니온을 넓히는 것은 타입 오류가 아니므로
   * `"none"`을 되살려도 컴파일이 통과한다 — 이 테스트가 유일한 방어다.
   */
  it("VisionSetting의 멤버가 하나뿐이다", () => {
    const line = TYPES.split(/\r?\n/).find((l) => l.includes("export type VisionSetting"));
    expect(line).toBeDefined();

    const members = [...(line ?? "").matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    expect(members).toEqual(["quick"]);
  });

  it("VISION_SETTINGS의 원소가 하나뿐이고 VisionSetting과 같다", () => {
    const line = TYPES.split(/\r?\n/).find((l) => l.includes("VISION_SETTINGS"));
    expect(line).toBeDefined();

    const members = [...(line ?? "").matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    expect(members).toEqual(["quick"]);
  });

  it("사진 보기 선택 화면이 없다 (VisionPicker 제거)", () => {
    expect(() => readFileSync(join(ROOT, "src/ui/VisionPicker.tsx"), "utf8")).toThrow();
  });

  it("사진 보기 설정 저장소가 없다 (vision-setting-store 제거)", () => {
    expect(() => readFileSync(join(ROOT, "src/app/vision-setting-store.ts"), "utf8")).toThrow();
  });

  it("App.tsx가 사진 보기 설정을 읽거나 쓰지 않는다", () => {
    const APP = codeOf("App.tsx");
    expect(APP).not.toMatch(/loadVisionSetting|saveVisionSetting|VisionPicker/);
  });
});

/* ═══════════════ C2 — 깊이가 하나다 (FR-009·FR-010) ═══════════════ */

describe("C2 — 보는 깊이가 하나로 고정됐다 (헌법 v1.7.0 MUST)", () => {
  it("VisionDepth에 detailed가 없다", () => {
    const line = codeOf("src/vision/types.ts")
      .split(/\r?\n/)
      .find((l) => l.includes("export type VisionDepth"));

    expect(line).toBeDefined();
    expect(line).toContain('"quick"');
    expect(line).not.toContain('"detailed"');
  });

  it("깊이를 되살릴 설정·플래그·환경 변수가 없다", () => {
    // `IMAGE_TOKENS`가 유일한 자리이며 키가 하나여야 한다.
    const PORT = codeOf("src/vision/vision-port.ts");
    expect(PORT).not.toMatch(/detailed/);
    expect(PORT).not.toMatch(/EXPO_PUBLIC_[A-Z_]*VISION/);
  });
});

/* ═══════════════ C3 — 모든 경로가 같은 규칙을 따른다 (FR-004·FR-004a) ═══════════════ */

describe("C3 — 사진 설정으로 캡션을 거르는 분기가 없다", () => {
  /**
   * ★ **029가 여기서 「자동」·설정 없음을 전부 `"none"`으로 떨궜다.** 그래서 기본
   * 설정으로 자동 생성을 쓰는 사용자의 일기는 **사진이 아무리 많아도 한 장도 보지
   * 않았다.** 이 기능의 실질적 이행 지점이다.
   */
  it("백그라운드 자동 생성이 사진 설정을 읽지 않는다 (FR-004)", () => {
    const TASK = codeOf("src/schedule/task.ts");

    expect(TASK).not.toMatch(/loadVisionSetting|expoVisionSettingPort|VisionPreference/);
    expect(TASK).not.toMatch(/"none"/);
  });

  it("개발자 진단 화면에 사진 설정 인자가 없다 (FR-004a)", () => {
    const PROBE = codeOf("src/ui/GenerationProbe.tsx");
    const start = PROBE.indexOf("export type GenerationProbeProps");
    const declaration = PROBE.slice(start, PROBE.indexOf("};", start));

    // 슬라이스가 실제로 그 선언인지 함께 확인한다(008의 교훈).
    expect(declaration).toContain("pipeline: Pipeline");
    expect(declaration).not.toMatch(/vision/);
  });
});

/* ═══════════════ C6 — 판정이 설정을 보지 않는다 (FR-012a) ═══════════════ */

describe("C6 — 판정 결과가 사진 유무를 담고, 화면에 신호를 내려보내지 않는다", () => {
  const RESOLVE = codeOf("src/app/resolve-generation.ts");

  it("ResolveInput에 사진 보기 설정이 없다", () => {
    expect(RESOLVE).not.toMatch(/visionPreference/);
  });

  it("photoSignalPresent는 입력으로 남는다 (볼 것이 없으면 열지 않는다의 근거)", () => {
    expect(RESOLVE).toContain("photoSignalPresent");
  });

  it("판정 결과가 hasPhotos를 담는다", () => {
    expect(RESOLVE).toContain("hasPhotos");
  });

  /**
   * **"두 개의 진실" 금지** — 같은 사실이 판정 결과와 prop 두 곳에 생기면 둘이
   * 어긋나도 `tsc`가 못 잡는다. 029가 세운 「화면은 신호를 모른다」도 함께 지킨다.
   */
  it("화면 props에 신호가 직접 내려가지 않는다", () => {
    const SCREEN = codeOf("src/ui/DiaryHomeScreen.tsx");
    const start = SCREEN.indexOf("export type DiaryHomeScreenProps");
    const declaration = SCREEN.slice(start, SCREEN.indexOf("};", start));

    expect(declaration).toContain("resolve:");
    expect(declaration).not.toMatch(/photoSignalPresent/);
  });
});

/* ═══════════════ C7 — 기기에 남은 옛 설정을 읽지도 지우지도 않는다 (FR-007) ═══════════════ */

describe("C7 — 사용자 저장물에 손대지 않는다", () => {
  /**
   * 008(받다 만 모델)·037(로스터 밖 모델 파일)과 같은 **의도적 빈자리**다.
   * 앱이 사용자 저장물을 지우는 판단을 코드가 하지 않는다.
   */
  it("src/ 어디에도 vision-setting.json을 다루는 코드가 없다", () => {
    const files = [
      "App.tsx",
      "src/app/resolve-generation.ts",
      "src/schedule/task.ts",
      "src/ui/DiaryHomeScreen.tsx",
    ];

    for (const file of files) {
      expect(codeOf(file)).not.toContain("vision-setting.json");
    }
  });
});
