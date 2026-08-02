/**
 * T023 — 권한 거부 분기 (003 FR-217, 헌법 원칙 V)
 *
 * 거부는 **크래시가 아닌 기능 축소**로 처리한다. 거부된 소스는 미관측을 내놓고,
 * **모든 소스가 거부되어도 집계 한 덩어리를 산출한다** — 비어 있음으로 판정된다.
 *
 * 권한 요청은 사용 시점에 목적과 함께 한다 (헌법 원칙 V).
 */
import { log } from "../logging";

export enum SignalSource {
  Activity = "activity",
  Location = "location",
  Photo = "photo",
  Calendar = "calendar",
}

export enum PermissionState {
  Granted = "granted",
  Denied = "denied",
}

export type PermissionMap = Readonly<Record<SignalSource, PermissionState>>;

export interface PermissionRequester {
  request(source: SignalSource): Promise<PermissionState>;
}

export function isGranted(permissions: PermissionMap, source: SignalSource): boolean {
  return permissions[source] === PermissionState.Granted;
}

/**
 * 네 소스의 권한을 묻는다. 거부도 예외도 **거부 상태로** 돌아온다 — 이 함수는 던지지
 * 않으므로 한 소스의 거부가 나머지 수집을 막지 않는다.
 */
export async function requestSourcePermissions(
  requester: PermissionRequester,
): Promise<PermissionMap> {
  const entries = await Promise.all(
    Object.values(SignalSource).map(async (source) => {
      try {
        return [source, await requester.request(source)] as const;
      } catch (error) {
        // 네이티브 모듈 부재·플랫폼 미지원도 거부와 같이 다룬다 (헌법 원칙 V).
        log.warn("권한 요청 실패 — 거부로 다룬다", { source, error: String(error instanceof Error ? error.name : "unknown") });
        return [source, PermissionState.Denied] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as PermissionMap;
}

/** 모든 소스가 거부된 상태. 이래도 집계는 산출된다 (003 FR-217). */
export const ALL_DENIED: PermissionMap = Object.freeze({
  [SignalSource.Activity]: PermissionState.Denied,
  [SignalSource.Location]: PermissionState.Denied,
  [SignalSource.Photo]: PermissionState.Denied,
  [SignalSource.Calendar]: PermissionState.Denied,
});
