/**
 * 저장 자기 점검.
 *
 * `expoFileSystemPort()`는 기기 없이 검증할 수 없는 유일한 자리다(research.md §3).
 * 002의 나머지는 전부 순수 함수라 `npm test`로 끝나지만, 이 어댑터만은 실제 파일 시스템이
 * 있어야 돌아본다. 그래서 실기기에서 눈으로 확인할 수 있는 경로를 만든다.
 *
 * **이것은 제품 경로가 아니다.** 진단 화면에서만 부르며, 진단 화면은 local·dev에서만
 * 보인다(FR-007a). prod에서는 도달하지 않는다.
 *
 * **헌법 원칙 IV** — 여기서 시간을 재지 않는다. "저장이 몇 밀리초 걸렸는지"를 넣고
 * 싶어지지만, 그것이 측정 장치의 시작이다. 되는지 안 되는지만 본다.
 *
 * **헌법 원칙 V** — 점검하지 못한 것을 통과로 적지 않는다. 어댑터를 부를 수 없으면
 * `unavailable`이며, 그것은 `ok`가 아니다.
 */

import { expoFileSystemPort, fileStore } from "../diary/store";
import type { DiaryEntry } from "../diary/types";
import type { DaySignals } from "../signals/types";

/**
 * 점검 결과.
 *
 * `ok`와 `unavailable`을 가른다 — 001의 `ModuleStatus`가 `loaded`와 `unavailable`을
 * 가른 것과 같은 이유다. 돌지 못한 것은 통과가 아니다.
 */
export type StorageCheck =
  | { kind: "ok"; detail: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "failed"; reason: string };

/** 점검에만 쓰는 날짜. 실제 일기의 날짜와 겹치지 않게 먼 과거를 쓴다. */
const PROBE_DAY = "1970-01-02";

/**
 * 점검용 신호. 세 상태를 모두 담는다.
 *
 * `steps`가 `unknown`인 것이 핵심이다 — 왕복 후에도 `unknown`으로 남는지가 이 점검의
 * 진짜 확인 대상이다(SC-007, 헌법 원칙 V).
 */
function probeSignals(): DaySignals {
  return {
    date: PROBE_DAY,
    photos: {
      kind: "known",
      value: { photos: [{ id: "probe", takenAt: new Date(0) }], complete: true },
    },
    places: { kind: "none" },
    steps: { kind: "unknown", reason: "점검용 값" },
    battery: { kind: "none" },
    connectivity: { kind: "none" },
  };
}

function probeEntry(text: string): DiaryEntry {
  return {
    date: PROBE_DAY,
    text,
    character: "quiet",
    signalsUsed: probeSignals(),
    createdAt: new Date(0),
  };
}

/**
 * 파일 저장이 실기기에서 실제로 도는지 확인한다.
 *
 * 확인하는 것:
 *  1. 저장이 된다 (`ok: true`)
 *  2. 꺼낸 것이 저장한 것과 같다 (SC-007)
 *  3. **`unknown`이 왕복에서 살아남는다** (헌법 원칙 V) — 메모리에서는 통과하지만
 *     실제 파일 왕복에서 깨질 수 있는 지점이다
 *  4. 덮어쓰기가 `overwrote: true`로 드러난다 (FR-023a)
 *  5. `listDays`가 저장한 날짜를 찾는다 (FR-018f)
 *
 * 실패해도 예외를 던지지 않는다 — 진단 화면 자체가 뜨지 않으면 원인을 알 수 없다.
 */
export async function checkStorage(): Promise<StorageCheck> {
  let store;
  try {
    store = fileStore(expoFileSystemPort("diagnostics-probe"));
  } catch (error) {
    // 시뮬레이터·웹에서는 모듈 해석 자체가 실패할 수 있다. 결함이 아니다.
    return { kind: "unavailable", reason: reasonOf(error) };
  }

  try {
    // 1. 저장
    const first = await store.save(probeEntry("첫 번째"));
    if (!first.ok) return { kind: "failed", reason: `저장 실패: ${first.reason}` };

    // 2. 꺼낸 것이 같은가
    const loaded = await store.load(PROBE_DAY);
    if (loaded === null) return { kind: "failed", reason: "저장했는데 꺼내지 못했다" };
    if (loaded.text !== "첫 번째") {
      return { kind: "failed", reason: `본문이 달라졌다: ${loaded.text}` };
    }

    // 3. unknown이 살아남았는가 — 이 점검의 핵심
    if (loaded.signalsUsed.steps.kind !== "unknown") {
      return {
        kind: "failed",
        reason: `unknown이 ${loaded.signalsUsed.steps.kind}로 뭉개졌다`,
      };
    }
    if (loaded.signalsUsed.places.kind !== "none") {
      return {
        kind: "failed",
        reason: `none이 ${loaded.signalsUsed.places.kind}로 바뀌었다`,
      };
    }

    // Date가 되돌아왔는가
    if (!(loaded.createdAt instanceof Date)) {
      return { kind: "failed", reason: "createdAt이 Date로 되돌아오지 않았다" };
    }

    // 4. 덮어쓰기가 드러나는가
    const second = await store.save(probeEntry("두 번째"));
    if (!second.ok) return { kind: "failed", reason: `덮어쓰기 실패: ${second.reason}` };
    if (!second.overwrote) {
      return { kind: "failed", reason: "덮어썼는데 overwrote가 false다" };
    }

    const overwritten = await store.load(PROBE_DAY);
    if (overwritten?.text !== "두 번째") {
      return { kind: "failed", reason: "덮어썼는데 이전 본문이 남아 있다" };
    }

    // 5. 목록에 잡히는가
    if (!(await store.has(PROBE_DAY))) {
      return { kind: "failed", reason: "저장했는데 has가 false다" };
    }
    const days = await store.listDays();
    if (!days.includes(PROBE_DAY)) {
      return { kind: "failed", reason: `listDays에 없다: ${days.join(",")}` };
    }

    return { kind: "ok", detail: "저장·조회·덮어쓰기·unknown 보존 확인" };
  } catch (error) {
    // 예외를 삼키지 않는다(FR-024). 무엇이 터졌는지 화면에 드러난다.
    return { kind: "failed", reason: reasonOf(error) };
  }
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
