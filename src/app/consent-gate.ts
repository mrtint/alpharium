/**
 * 첫 실행 다운로드 동의의 갈래 판정과 읽기 한도 (074).
 *
 * 계약: specs/074-wifi-download-consent/contracts/consent-gate.md CG1~CG4, spec FR-001·FR-001a·FR-002
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **모바일 갈래는 연결 종류가 `cellular`로 확인될 때만이다**(원칙 V — 모르는 것을 모바일로 단정하지 않는다). Wi-Fi·이더넷·VPN·읽지 못함·한도 초과는 모두
 * 표준 동의다. 059 `readConnection()`의 판정을 그대로 쓴다 — 여기서 새로 정의하지 않는다.
 *
 * **알려진 한계**: `expo-network`는 핫스팟에 붙은 Wi-Fi를 `WIFI`로 보고하므로 그 경우 모바일 갈래가 서지 않는다(Android 공식 지침도 전송 종류로 과금 여부를
 * 추정하지 말라고 한다). 받는 도중 Wi-Fi→모바일 전환도 다루지 않는다 — 시작 시점의 판정뿐이다.
 *
 * **읽기 한도(3초)는 한 곳이다.** 응답이 없는 조회가 첫 실행을 빈 화면에 세워 두지 않게 한다(조용한 실패 방지). 순수 모듈 — 기기 모듈·`Date`를 쓰지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Connection } from "./network-port";

/** 연결 종류 읽기와 받을 양 읽기 각각의 한도(ms) */
export const READ_LIMIT_MS = 3000;

/** 훅이 화면에 내는 상태 — `reading`은 대화상자를 아직 안 띄우는 때, `deferred`는 「나중에 받기」 뒤 */
export type ConsentView = "reading" | "standard" | "cellular" | "deferred";

export function consentViewOf(connection: Connection): "standard" | "cellular" {
  return connection === "cellular" ? "cellular" : "standard";
}

/** `p`가 한도 안에 끝나면 그 값, 넘기거나 거부되면 `fallback` */
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    p.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}
