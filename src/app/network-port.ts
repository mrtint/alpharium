/**
 * 연결 종류 읽기 (059, 모듈 다시 받기 확인 문구의 「모바일 데이터로 {size}」).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md RD5·RD7, research R5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`expo-network`를 import하는 유일한 파일이다**(지연 import — jest `logic`에서 네이티브 모듈이 열리지 않게). `NetworkStateType.CELLULAR`가
 * 확인될 때만 `"cellular"`다 — 이더넷·VPN은 Wi-Fi 위일 수 있어 `"other"`이고, 읽지 못하면 `"unknown"`이다(원칙 V — 확인된 것만 말한다).
 * 신호 축 `connectivity`는 여전히 `unknown`이다(AGENTS) — 이 값은 일기 신호가 아니라 **사용자가 보는 안내**에만 쓴다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Connection = "wifi" | "cellular" | "other" | "unknown";

type NetworkModule = Pick<
  typeof import("expo-network"),
  "getNetworkStateAsync" | "NetworkStateType"
>;

/** `load`는 테스트가 갈아끼운다(jest `logic`은 동적 import를 못 연다). 기본값이 지연 import다. */
export async function readConnection(
  load: () => Promise<NetworkModule> = () => import("expo-network"),
): Promise<Connection> {
  try {
    const Network = await load();
    const state = await Network.getNetworkStateAsync();
    if (state.type === Network.NetworkStateType.WIFI) return "wifi";
    if (state.type === Network.NetworkStateType.CELLULAR) return "cellular";
    return "other";
  } catch {
    return "unknown";
  }
}
