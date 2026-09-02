/**
 * 최초 실행에 반드시 받아야 하는 자산 — **사람이 못 박은 상수 + 순수 판정** (029).
 *
 * 계약: specs/029-writing-flow-simplification/contracts/onboarding-assets.md A
 *       spec.md FR-015·FR-017·FR-018·FR-019
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **로스터를 import하지 않는다** (`checkOnboardingFile`의
 * `ONBOARDING_TOUCHES_PRODUCT_LAYER`). `Character` 타입만 `../diary/types`에서.
 *
 * 021의 `PERMISSION_REQUIREMENTS`, 012의 `USER_VISIBLE_SIGNAL_AXES`가 선례다 —
 * 코드가 로스터를 보고 "무엇이 필수인가"를 정하지 않는다(원칙 V). 사람이 상수로
 * 못 박고, 값이 로스터와 어긋나면 `essential-assets-port.ts`의 계약 테스트(BR5)가
 * 잡는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Character } from "../diary/types";

/**
 * 최초 실행에 받아야 하는 자산의 키.
 *
 * - `v1`·`v2` — 011 vision roster (사진 보는 공용 모델, 캐릭터 무관).
 * - `a1` — quiet 캐릭터의 자산키. `assetFor("quiet").key`와 같아야 하며, 이 대조는
 *   `essential-assets-port.ts`의 계약 테스트가 한다 (여기서 로스터를 부르지 않으려고).
 */
export const ESSENTIAL_ASSET_KEYS = ["v1", "v2", "a1"] as const;

/**
 * 온보딩 기본 캐릭터 — 고정값 (FR-018).
 *
 * quiet(금동이). 018·023·024 실측: 웜 2~3초로 가장 빠르고 안정적으로 완주한다.
 * narrative(exaone)는 024·028이 자동 생성 부적합으로 확정했으므로 기본값이 될 수 없다.
 */
export const ONBOARDING_DEFAULT_CHARACTER: Character = "quiet";

/**
 * 필수 자산 전부가 준비됐는가 (FR-019, AR1).
 *
 * `ESSENTIAL_ASSET_KEYS`의 모든 키가 `facts`에서 `ready: true`일 때만 `true`.
 * 키가 `facts`에 없으면 `false`(미조회 = 미준비).
 */
export function essentialAssetsReady(facts: readonly { key: string; ready: boolean }[]): boolean {
  return ESSENTIAL_ASSET_KEYS.every((key) => facts.some((f) => f.key === key && f.ready === true));
}

/**
 * 합산 진행률 — 하나의 바 (FR-017, AR2).
 *
 * `sum(receivedBytes) / sum(totalBytes)`. `sum(totalBytes) === 0`이면 0. 결과는
 * `[0, 1]`로 clamp. **026의 병렬성·구간·속도를 화면에 노출하지 않는다**(원칙 IV) —
 * 여기서 나오는 것은 비율 하나뿐이다.
 */
export function essentialDownloadFraction(
  parts: readonly { receivedBytes: number; totalBytes: number }[],
): number {
  const total = parts.reduce((sum, p) => sum + p.totalBytes, 0);
  if (total <= 0) return 0;
  const received = parts.reduce((sum, p) => sum + p.receivedBytes, 0);
  const fraction = received / total;
  return fraction < 0 ? 0 : fraction > 1 ? 1 : fraction;
}
