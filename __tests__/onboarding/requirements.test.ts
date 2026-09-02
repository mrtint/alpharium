import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PERMISSION_REQUIREMENTS, type PermissionKey } from "../../src/onboarding/requirements";

/**
 * 필수 권한 목록의 계약 테스트.
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/permission-requirements.md
 *       R2·R3·R4
 *       spec.md FR-001·FR-002·FR-003·FR-004, SC-008
 *
 * **목록은 사람이 못 박은 상수다**(원칙 V) — 코드가 항목을 더하거나 빼지 않는다.
 * 007·009·012·020 관례대로 소스 선언을 `readFileSync`로 직접 읽어 검사한다(jest는
 * 타입을 지우므로).
 */

const SOURCE = readFileSync(join(__dirname, "../../src/onboarding/requirements.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** 모델을 역추적할 수 있는 토큰. 문안에 있으면 원칙 III 위반(SC-008). */
const MODEL_TOKENS = /kanana|exaone|hyperclovax|qwen3?|gemma3?|\.gguf|Q4_|Q8_|\b\d+(?:\.\d+)?B\b/i;

describe("R2 — order와 목록 구조", () => {
  it("order가 [1,2,3,4]와 정확히 일치한다 (연속, 중복 없음)", () => {
    // 031 — photo-location 단계 제거로 5 → 4개. `ACCESS_MEDIA_LOCATION`은 조회·요청
    // API가 없어 온보딩에서 판정할 수 없다(무한 루프의 원인) — collect.ts가 실제
    // 좌표 읽기로 처리한다(021 FR-013a).
    const orders = PERMISSION_REQUIREMENTS.map((r) => r.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4]);
  });

  it("battery-exception의 order가 가장 크다 (마지막 단계)", () => {
    const battery = PERMISSION_REQUIREMENTS.find((r) => r.key === "battery-exception");
    const maxOrder = Math.max(...PERMISSION_REQUIREMENTS.map((r) => r.order));
    expect(battery?.order).toBe(maxOrder);
  });

  it("PermissionKey 유니온에 정확히 4개 멤버가 있다 (031 — photo-location 제거)", () => {
    const keys: PermissionKey[] = ["photos", "location", "notifications", "battery-exception"];
    const actual = PERMISSION_REQUIREMENTS.map((r) => r.key).sort();
    expect(actual).toEqual([...keys].sort());
  });

  it("고정 순서가 사진 → 위치 → 알림 → 배터리 예외다", () => {
    const byOrder = [...PERMISSION_REQUIREMENTS].sort((a, b) => a.order - b.order);
    expect(byOrder.map((r) => r.key)).toEqual([
      "photos",
      "location",
      "notifications",
      "battery-exception",
    ]);
  });

  it("★ 소스에 photo-location이 남아 있지 않다 (031, 위반 주입 방어)", () => {
    // PermissionKey union·PERMISSION_REQUIREMENTS 정의 어디에도 문자열이 없어야 한다.
    // 도로 넣으면 무한 루프가 재발한다.
    expect(CODE).not.toMatch(/["']photo-location["']/);
  });
});

describe("R3 — 문안 규칙 (원칙 II·III, SC-008)", () => {
  it("모든 rationale에 모델 식별자 토큰이 없다", () => {
    for (const r of PERMISSION_REQUIREMENTS) {
      expect(r.rationale).not.toMatch(MODEL_TOKENS);
    }
  });

  it("모든 ifDenied에 모델 식별자 토큰이 없다", () => {
    for (const r of PERMISSION_REQUIREMENTS) {
      expect(r.ifDenied).not.toMatch(MODEL_TOKENS);
    }
  });

  it("rationale·ifDenied가 비어 있지 않다", () => {
    for (const r of PERMISSION_REQUIREMENTS) {
      expect(r.rationale.trim().length).toBeGreaterThan(0);
      expect(r.ifDenied.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("R4 — platforms 메타데이터 (FR-003)", () => {
  it("모든 platforms가 비어 있지 않고 android/ios만 포함한다", () => {
    for (const r of PERMISSION_REQUIREMENTS) {
      expect(r.platforms.length).toBeGreaterThan(0);
      for (const p of r.platforms) {
        expect(["android", "ios"]).toContain(p);
      }
    }
  });

  it("photos·location·notifications·battery-exception은 android를 포함한다", () => {
    for (const key of ["photos", "location", "notifications", "battery-exception"] as const) {
      const r = PERMISSION_REQUIREMENTS.find((x) => x.key === key);
      expect(r?.platforms).toContain("android");
    }
  });
});

describe("R4 — 소스 선언 검사 (readFileSync)", () => {
  it("PERMISSION_REQUIREMENTS가 readonly로 선언된다", () => {
    expect(CODE).toMatch(
      /PERMISSION_REQUIREMENTS[\s\S]*?(?:readonly PermissionRequirement\[\]|as const)/,
    );
  });

  it("requirements.ts가 diary/·models/·schedule/를 import하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*diary\//);
    expect(CODE).not.toMatch(/from\s+["'][^"']*models\//);
    expect(CODE).not.toMatch(/from\s+["'][^"']*schedule\//);
  });

  it("requirements.ts가 expo-*·react-native를 import하지 않는다 (순수 상수)", () => {
    expect(CODE).not.toMatch(/from\s+["']expo-/);
    expect(CODE).not.toMatch(/from\s+["']react-native["']/);
  });
});
