/**
 * 모듈 다시 받기 계획 (059, 보드 `6e` ① 「모듈 다시 받기 — 확인(AlertDialog) 후 온보딩 다운로드 화면으로」).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md RD1~RD4·RD6, research R3·R5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 순수 조합이다 — 통로 셋을 주입받는다. **받을 것이 없으면 `nothing`**(대화상자 대신 한 줄로 알린다), 있으면 `confirm`이다. 「모바일 데이터로 {size}」는
 * 연결이 **`"cellular"`로 확인될 때만** 쓴다 — Wi-Fi이거나 연결 종류·받을 양을 못 읽으면 `cellularSize`는 `null`이다(모르는 것을 모바일로,
 * 용량을 지어내지 않는다, 원칙 V). **사실을 못 읽었으면 「다 있다」로 세지 않고 `confirm`으로 다룬다.**
 *
 * 이 경로는 이미 받은 모듈 파일을 지우지 않는다(037) — 빠졌거나 잘린 것만 받는 것은 `onRedownload`(055)와 다운로드 흐름의 일이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { essentialAssetsReady } from "../onboarding/essential-assets";
import type { Connection } from "./network-port";
import { formatModuleBytes } from "./module-size";

export type RedownloadPlan = { kind: "nothing" } | { kind: "confirm"; cellularSize: string | null };

export type RedownloadDeps = {
  readFacts(): Promise<readonly { key: string; ready: boolean }[]>;
  /** 준비되지 않은 필수 모듈의 받을 양(바이트) */
  readRemainingBytes(): Promise<number>;
  readConnection(): Promise<Connection>;
};

export async function planRedownload(deps: RedownloadDeps): Promise<RedownloadPlan> {
  let facts: readonly { key: string; ready: boolean }[];
  try {
    facts = await deps.readFacts();
  } catch {
    return { kind: "confirm", cellularSize: null };
  }
  if (essentialAssetsReady(facts)) return { kind: "nothing" };

  const connection = await deps.readConnection().catch((): Connection => "unknown");
  if (connection !== "cellular") return { kind: "confirm", cellularSize: null };

  const remaining = await deps.readRemainingBytes().catch(() => null);
  return {
    kind: "confirm",
    cellularSize: remaining === null ? null : formatModuleBytes(remaining),
  };
}

/**
 * 받을 양(바이트) — 준비되지 않은 키마다 `max(0, 기대 크기 − 이미 받은 만큼)`의 합이다(받다 만 조각은 이어받으므로 뺀다, RD4).
 * **이미 받은 만큼을 못 읽은 키(`null`)는 기대 크기 전체로 센다** — 적게 말하지 않는다. 준비된 키는 0이다.
 */
export function remainingBytes({
  facts,
  expectedBytes,
  usedBytes,
}: {
  facts: readonly { key: string; ready: boolean }[];
  expectedBytes: Readonly<Record<string, number>>;
  usedBytes: Readonly<Record<string, number | null>>;
}): number {
  let total = 0;
  for (const key of Object.keys(expectedBytes)) {
    if (facts.some((f) => f.key === key && f.ready === true)) continue;
    const expected = expectedBytes[key] ?? 0;
    const used = usedBytes[key];
    total += used === null || used === undefined ? expected : Math.max(0, expected - used);
  }
  return total;
}
