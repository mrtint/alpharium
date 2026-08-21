/**
 * 심은 기록 — **개발 기계에 남는다.**
 *
 * 계약: specs/010-synthetic-day-fixture/data-model.md 「심은 기록」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 기기가 아니라 개발 기계인가**: 기기에 두면 앱이 볼 수 있는 자리가 되고, 그러면
 * 「앱이 도구가 심은 것임을 안다」로 가는 길이 열린다(FR-017 위반). 앱은 심은 사진과
 * 진짜 사진을 구분하지 않아야 하고, 구분해서도 안 된다.
 *
 * **기록은 편의이고 폴더가 경계다**(FR-016a). 되돌리기는 이 기록이 아니라 폴더를 보고
 * 지운다 — 기록이 사라져도(개발 기계를 바꿈) 치울 수 있어야 하고, 반대로 기록만 믿으면
 * 「기록에 없는데 폴더에 있는」 것이 영영 남는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

export type SeededPhoto = {
  devicePath: string;
  takenAtMs: number;
  hasLocation: boolean;
};

export type SeedEntry = {
  day: string;
  shape: string;
  /** 심은 시각. **사진의 시각이 아니다** */
  seededAtMs: number;
  photos: SeededPhoto[];
};

export type SeedLedger = { entries: SeedEntry[] };

/** `.gitignore`에 있다 — 개발 기계마다 다르므로 커밋하지 않는다 */
const LEDGER_PATH = () => join(process.cwd(), ".seed-ledger.json");

export function readLedger(): SeedLedger {
  const path = LEDGER_PATH();
  if (!existsSync(path)) return { entries: [] };

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(parsed?.entries) ? parsed : { entries: [] };
  } catch {
    // 망가진 기록이 도구를 막지 않는다. 폴더가 경계이므로 되돌리기는 여전히 된다.
    return { entries: [] };
  }
}

export function writeLedger(ledger: SeedLedger): void {
  writeFileSync(LEDGER_PATH(), `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
}

/** 같은 하루를 다시 심으면 **더한다.** 덮어쓰지 않는다 — 기기에 둘 다 남기 때문이다 */
export function recordSeeding(entry: SeedEntry): void {
  const ledger = readLedger();
  ledger.entries.push(entry);
  writeLedger(ledger);
}

/** 하루를 지정하면 그 하루만, 아니면 전부 지운다 */
export function forgetSeeding(day?: string): void {
  if (day === undefined) {
    rmSync(LEDGER_PATH(), { force: true });
    return;
  }

  const ledger = readLedger();
  writeLedger({ entries: ledger.entries.filter((e) => e.day !== day) });
}
