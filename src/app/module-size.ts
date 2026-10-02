/**
 * 058 — 「쓰는 모듈」 용량 (설정 「이 휴대폰」, 보드 `6c` ⑥).
 *
 * 계약: specs/058-settings-this-phone/contracts/this-phone.md MS1~MS3, spec FR-003~FR-006, research R7
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **합계는 여기서 구하고 화면은 문자열만 받는다**(FR-006, 원칙 III). `src/ui/`는 `ESSENTIAL_ASSET_KEYS`에 닿지 못한다(헌법 검사
 * `UI_TOUCHES_ASSET`) — `src/app/`은 조립 계층이라 허용된다(`essential-assets-port.ts`와 같은 자리).
 *
 * 대상은 첫 실행에 받는 필수 모듈 셋(`v1`·`v2` 사진 모듈, `a1` 쓰는 모듈)이다. `bytesUsed`는 받다 만 구간 파일까지 센다(041) —
 * 실제로 차지하는 공간이다. 로스터의 예상 크기를 더하지 않는다(받지 않은 것을 받은 것으로 보이게 된다).
 *
 * 표기는 **1000 기준**이다(FR-004) — 안드로이드 저장 공간·앱 정보 화면이 같은 기준이라 사용자가 대조할 수 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ModelFilePort } from "../models/port";
import { ESSENTIAL_ASSET_KEYS } from "../onboarding/essential-assets";

const GB = 1_000_000_000;
const MB = 1_000_000;

/** 1GB 이상이면 소수 한 자리 GB, 아니면 정수 MB(반올림이 1000이면 「1.0GB」). 띄어쓰기·천 단위 구분 없음 */
export function formatModuleBytes(bytes: number): string {
  // 0.1GB 단위로 먼저 반올림한다 — `(1.95).toFixed(1)`은 부동소수 표현 때문에 「1.9」가 된다.
  if (bytes >= GB) return `${(Math.round(bytes / (GB / 10)) / 10).toFixed(1)}GB`;
  const mb = Math.round(bytes / MB);
  return mb >= 1000 ? "1.0GB" : `${mb}MB`;
}

/** 필수 모듈 파일이 차지하는 바이트 합. 하나라도 못 읽으면 던진다 — 부르는 쪽이 값을 비운다(FR-005) */
export async function readModuleBytes(files: Pick<ModelFilePort, "bytesUsed">): Promise<number> {
  const sizes = await Promise.all(ESSENTIAL_ASSET_KEYS.map((key) => files.bytesUsed(key)));
  return sizes.reduce((sum, n) => sum + n, 0);
}
