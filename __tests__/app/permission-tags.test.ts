/**
 * 055 — 권한 꼬리표 판정 (data-model PermissionFacts → PermissionTag, spec FR-021~FR-023).
 *
 * 모든 갈래를 표로 잠근다. ★ 읽지 못한 것(`unknown`)이 「허용 안 함」이 되면 안 된다(원칙 V).
 */
import {
  permissionTagFor,
  type PermissionFacts,
  type PermissionReading,
  type PhotoLocationReading,
} from "../../src/app/permission-tags";

const base: PermissionFacts = {
  photos: "granted",
  photoLocation: "ok",
  location: "granted",
  notifications: "granted",
  battery: "exempt",
};

describe("055 사진 — 사진 읽기 + 사진의 위치 정보", () => {
  it.each([
    ["unknown", "ok", "unread"],
    ["unknown", "denied", "unread"],
    ["denied", "ok", "denied"],
    ["blocked", "ok", "denied"],
    ["undetermined", "ok", "denied"],
    ["denied", "denied", "denied"],
    ["limited", "ok", "partial"],
    ["limited", "denied", "partial"],
    ["granted", "denied", "partial"],
    ["granted", "ok", "allowed"],
    ["granted", "no-photo", "allowed"],
    ["granted", "unknown", "allowed"],
  ] as const satisfies readonly (readonly [PermissionReading, PhotoLocationReading, string])[])(
    "사진 %s · 위치 정보 %s → %s",
    (photos, photoLocation, expected) => {
      expect(permissionTagFor("photos", { ...base, photos, photoLocation })).toBe(expected);
    },
  );
});

describe("055 위치·알림", () => {
  it.each([
    ["granted", "allowed"],
    ["denied", "denied"],
    ["blocked", "denied"],
    ["undetermined", "denied"],
    ["limited", "denied"],
    ["unknown", "unread"],
  ] as const)("%s → %s", (reading, expected) => {
    expect(permissionTagFor("location", { ...base, location: reading })).toBe(expected);
    expect(permissionTagFor("notifications", { ...base, notifications: reading })).toBe(expected);
  });

  it("★ 원칙 V — 읽지 못한 행은 어느 것도 「허용 안 함」이 아니다", () => {
    const unknownAll: PermissionFacts = {
      photos: "unknown",
      photoLocation: "unknown",
      location: "unknown",
      notifications: "unknown",
      battery: "unknown",
    };
    for (const key of ["photos", "location", "notifications", "battery"] as const) {
      expect(permissionTagFor(key, unknownAll)).toBe("unread");
    }
  });
});

// 104 PT1 — 배터리 행의 꼬리표. 예외 상태는 읽은 순간의 값이다.
describe("104 PT1 — 배터리", () => {
  it.each([
    ["exempt", "allowed"],
    ["restricted", "denied"],
    ["unknown", "unread"],
  ] as const)("%s → %s", (battery, expected) => {
    expect(permissionTagFor("battery", { ...base, battery })).toBe(expected);
  });

  it("PT7 — 배터리 상태가 다른 세 행의 판정을 바꾸지 않는다", () => {
    for (const battery of ["exempt", "restricted", "unknown"] as const) {
      const facts = { ...base, battery };
      expect(permissionTagFor("photos", facts)).toBe("allowed");
      expect(permissionTagFor("location", facts)).toBe("allowed");
      expect(permissionTagFor("notifications", facts)).toBe("allowed");
    }
  });
});
