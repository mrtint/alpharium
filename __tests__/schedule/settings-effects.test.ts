import {
  applyTargetHour,
  applyToggleOff,
  applyToggleOn,
  type SettingsEffectDeps,
} from "../../src/schedule/settings-effects";
import type { AutoDiarySettings } from "../../src/schedule/settings";

/**
 * 자동 생성 설정 변경의 부수 효과 순서 계약 테스트.
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/auto-diary-settings.md
 *       S6
 *       specs/020-scheduled-diary-notification/contracts/battery-exception.md
 *       E3
 *       spec.md FR-009·FR-010
 *
 * `App.tsx`의 useCallback 안에 두면 순서가 기기 없이 검증되지 않는다 —
 * 화면 밖 순수 조합 함수로 떼어 mock 통로로 검증한다(007~019 공통 관례).
 */

const OFF: AutoDiarySettings = {
  enabled: false,
  targetHour: 7,
  batteryExceptionPrompted: false,
};

function mockDeps() {
  const written: string[] = [];
  const calls: string[] = [];

  const deps: SettingsEffectDeps = {
    settingsPort: {
      read: async () => null,
      write: async (s) => {
        written.push(s);
        calls.push("save");
      },
    },
    backgroundPort: {
      register: async () => {
        calls.push("register");
      },
      unregister: async () => {
        calls.push("unregister");
      },
      reschedule: async () => {
        calls.push("reschedule");
      },
    },
    batteryPort: {
      requestException: async () => {
        calls.push("requestException");
      },
      openSettingsList: async () => {
        calls.push("openSettingsList");
      },
    },
    notificationPort: {
      ensureChannel: async () => {},
      requestPermission: async () => {
        calls.push("requestPermission");
        return "granted" as const;
      },
      present: async () => "id",
      dismiss: async () => {},
      lastResponse: async () => null,
      onResponse: () => () => {},
    },
  };

  return { deps, written, calls };
}

describe("applyToggleOn — S6 순서 (최초 켬)", () => {
  it("권한 → 배터리 예외 1회 → save → register 순서로 부른다", async () => {
    const { deps, calls } = mockDeps();
    await applyToggleOn(OFF, deps);
    expect(calls).toEqual(["requestPermission", "requestException", "save", "register"]);
  });

  it("batteryExceptionPrompted를 true로 만들어 저장한다", async () => {
    const { deps, written } = mockDeps();
    const { settings } = await applyToggleOn(OFF, deps);
    expect(settings).toEqual({ enabled: true, targetHour: 7, batteryExceptionPrompted: true });
    expect(JSON.parse(written[0])).toMatchObject({ batteryExceptionPrompted: true });
  });
});

describe("applyToggleOn — FR-010 MUST NOT (재차 켬)", () => {
  it("batteryExceptionPrompted: true면 requestException을 부르지 않는다", async () => {
    const { deps, calls } = mockDeps();
    await applyToggleOn({ ...OFF, batteryExceptionPrompted: true }, deps);
    expect(calls).not.toContain("requestException");
    expect(calls).toEqual(["requestPermission", "save", "register"]);
  });
});

describe("applyToggleOn — N8 알림 권한 거부", () => {
  it("denied면 notificationDenied: true지만 register는 그대로 진행한다", async () => {
    const { deps, calls } = mockDeps();
    deps.notificationPort.requestPermission = async () => "denied" as const;
    const r = await applyToggleOn(OFF, deps);
    expect(r.notificationDenied).toBe(true);
    expect(calls).toContain("register");
  });
});

describe("applyToggleOff — S6 순서", () => {
  it("save → unregister, register/reschedule는 안 부른다", async () => {
    const { deps, calls } = mockDeps();
    await applyToggleOff({ ...OFF, enabled: true }, deps);
    expect(calls).toEqual(["save", "unregister"]);
  });
});

describe("applyTargetHour — S6 순서", () => {
  it("enabled면 save → reschedule", async () => {
    const { deps, calls } = mockDeps();
    const next = await applyTargetHour({ ...OFF, enabled: true }, 21, deps);
    expect(next.targetHour).toBe(21);
    expect(calls).toEqual(["save", "reschedule"]);
  });

  it("꺼져 있으면 save만 — reschedule 안 함(등록 자체가 없다)", async () => {
    const { deps, calls } = mockDeps();
    await applyTargetHour({ ...OFF, enabled: false }, 21, deps);
    expect(calls).toEqual(["save"]);
  });
});
