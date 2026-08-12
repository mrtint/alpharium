import { checkEnvFile, formatViolations } from "../../scripts/constitution-rules";

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
