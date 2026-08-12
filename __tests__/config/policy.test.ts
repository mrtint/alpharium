import { defaultLocationFor, isLocationAllowed } from "../../src/config/policy";
import type { Environment } from "../../src/config/types";
import type { InferenceLocation } from "../../src/inference/types";

/**
 * contracts/environment.md 「추론 위치 규칙」의 검증 표.
 *
 * 이 파일이 이 기능에서 가장 중요한 테스트다. dev·prod에서 desktop-server가 거부되는
 * 두 경우가 헌법 원칙 I의 방어선이며, 여기가 뚫리면 엔드유저의 일기가 기기 밖에서
 * 생성될 수 있다.
 */
describe("defaultLocationFor", () => {
  it.each([
    ["local", "desktop-server"],
    ["dev", "on-device"],
    ["prod", "on-device"],
  ] as const)("%s의 기본값은 %s", (env, expected) => {
    expect(defaultLocationFor(env)).toBe(expected);
  });

  it("local만 서버가 기본값이다 — 시뮬레이터에 네이티브 모듈이 없기 때문(FR-010)", () => {
    expect(defaultLocationFor("local")).toBe("desktop-server");
    expect(defaultLocationFor("dev")).not.toBe("desktop-server");
    expect(defaultLocationFor("prod")).not.toBe("desktop-server");
  });
});

describe("isLocationAllowed", () => {
  const table: [Environment, InferenceLocation, boolean][] = [
    ["local", "on-device", true],
    ["local", "desktop-server", true],
    ["dev", "on-device", true],
    ["dev", "desktop-server", false],
    ["prod", "on-device", true],
    ["prod", "desktop-server", false],
  ];

  it.each(table)("%s x %s -> %s", (env, loc, expected) => {
    expect(isLocationAllowed(env, loc)).toBe(expected);
  });

  describe("헌법 원칙 I의 방어선", () => {
    it("dev에서 desktop-server는 금지된다(FR-012)", () => {
      expect(isLocationAllowed("dev", "desktop-server")).toBe(false);
    });

    it("prod에서 desktop-server는 금지된다(FR-012)", () => {
      expect(isLocationAllowed("prod", "desktop-server")).toBe(false);
    });

    it("모든 환경에서 on-device는 허용된다", () => {
      expect(isLocationAllowed("local", "on-device")).toBe(true);
      expect(isLocationAllowed("dev", "on-device")).toBe(true);
      expect(isLocationAllowed("prod", "on-device")).toBe(true);
    });
  });

  it("local은 온디바이스 경로가 막힌 환경이 아니다(FR-011)", () => {
    expect(isLocationAllowed("local", "on-device")).toBe(true);
  });
});
