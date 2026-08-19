import { checkEnvFile, checkSourceFile, formatViolations } from "../../scripts/constitution-rules";

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
