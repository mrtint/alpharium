/**
 * 시도 줄에 싣는 기기 상태를 읽는 통로 (2026-11-03 소유자 결정).
 *
 * 전원은 `power-state-port.ts`, 연결은 `network-port.ts`, iOS 열 상태·파일 보호·남은 메모리는 로컬 모듈 `pocketlog-bg-expiry`가 읽는다.
 * **값마다 따로 읽고 던지지 않는다** — 못 읽은 값은 빠지고(원칙 V), 안 돌아오는 호출은 한도 뒤 빠진다. 멈춘 자리를 기록하려는 코드가 함께 멈추면 안 된다.
 */

import type { AttemptDeviceState } from "./auto-write-attempts";
import { readConnection, type Connection } from "./network-port";
import { readPowerState, type PowerState } from "./power-state-port";

type NativeState = Pick<AttemptDeviceState, "thermal" | "protectedData" | "availableMemoryMB">;

export type DeviceStateDeps = {
  now?: () => Date;
  readPower?: () => Promise<PowerState>;
  readConnection?: () => Promise<Connection>;
  readNative?: () => Promise<NativeState>;
  readAppState?: () => AttemptDeviceState["appState"];
  /** 통로 하나의 한도. 사람이 정한 값이다 */
  timeoutMs?: number;
};

const READ_TIMEOUT_MS = 3_000;

async function nativeState(): Promise<NativeState> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireOptionalNativeModule } = require("expo-modules-core") as {
    requireOptionalNativeModule<T>(name: string): T | null;
  };
  const module = requireOptionalNativeModule<{ deviceState?(): Promise<NativeState> }>(
    "PocketlogBgExpiry",
  );
  return (await module?.deviceState?.()) ?? {};
}

/** 호출 시점에 읽는다 — `await import("react-native")`가 아니다(066, iOS에서 앱이 죽는다) */
function appState(): AttemptDeviceState["appState"] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppState } = require("react-native") as { AppState: { currentState: unknown } };
  const state = AppState.currentState;
  return state === "active" || state === "background" || state === "inactive" ? state : undefined;
}

/** 던지거나 한도를 넘기면 `null` */
async function within<T>(read: () => Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    return await Promise.race([read(), expired]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function readDeviceState(deps: DeviceStateDeps = {}): Promise<AttemptDeviceState> {
  const at = (deps.now ?? (() => new Date()))();
  const limit = deps.timeoutMs ?? READ_TIMEOUT_MS;
  const [power, connection, native, state] = await Promise.all([
    within(deps.readPower ?? (() => readPowerState()), limit),
    within(deps.readConnection ?? (() => readConnection()), limit),
    within(deps.readNative ?? nativeState, limit),
    within(async () => (deps.readAppState ?? appState)(), limit),
  ]);
  return {
    at,
    ...power,
    ...(connection !== null && connection !== "unknown" ? { network: connection } : {}),
    ...native,
    ...(state !== null && state !== undefined ? { appState: state } : {}),
  };
}
