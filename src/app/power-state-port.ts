/**
 * 시도 줄에 싣는 전원 상태 (2026-11-03 소유자 결정). 기록 전용이다 — 판정·알림 시각에 쓰지 않는다.
 * 쓸 차례 알림이 보는 예외 상태는 `schedule/battery-exception-port.ts`가 따로 읽는다.
 */

/** 2026-11-03 — 시도 줄에 싣는 전원 상태. 값마다 따로 읽어 못 읽은 것은 빠진다(원칙 V) */
export type PowerState = {
  battery?: "charging" | "full" | "unplugged";
  batteryLevel?: number;
  lowPower?: boolean;
};

type PowerModule = {
  getBatteryStateAsync(): Promise<number>;
  getBatteryLevelAsync(): Promise<number>;
  isLowPowerModeEnabledAsync(): Promise<boolean>;
};

/** `expo-battery`의 `BatteryState` 값: 1 빼 둠, 2 충전 중, 3 가득 참. 0(모름)은 싣지 않는다 */
const BATTERY_STATES: Readonly<Record<number, NonNullable<PowerState["battery"]>>> = {
  1: "unplugged",
  2: "charging",
  3: "full",
};

export async function readPowerState(
  load: () => Promise<PowerModule> = () =>
    import("expo-battery") as unknown as Promise<PowerModule>,
): Promise<PowerState> {
  const battery = await load();
  const [state, level, lowPower] = await Promise.allSettled([
    battery.getBatteryStateAsync(),
    battery.getBatteryLevelAsync(),
    battery.isLowPowerModeEnabledAsync(),
  ]);
  const name = state.status === "fulfilled" ? BATTERY_STATES[state.value] : undefined;
  return {
    ...(name !== undefined ? { battery: name } : {}),
    ...(level.status === "fulfilled" && level.value >= 0
      ? { batteryLevel: Math.round(level.value * 100) }
      : {}),
    ...(lowPower.status === "fulfilled" ? { lowPower: lowPower.value } : {}),
  };
}
