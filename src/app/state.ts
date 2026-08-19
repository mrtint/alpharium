/**
 * 사용자 경로의 화면 상태와 전이.
 *
 * 계약: specs/006-first-diary-app/data-model.md §2·§3, contracts/screens.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 함수만 둔다**(SC-023). 기기에 닿지 않으므로 전 갈래가 기기 없이 검증된다 —
 * 002의 `readinessOf`, 005의 `acceptance`와 같은 구조다.
 *
 * **005의 `PipelineStage`와 다르다.** 그것은 생성 *안쪽*의 단계이고 이것은 사용자가
 * 보는 화면이다. 둘을 섞으면 생성 내부 사정이 화면 구조로 새어 나온다.
 *
 * **타입이 곧 방어다**:
 *  - `writing`에 필드가 없는 것이 원칙 IV의 방어다 — 진행률·시간·토큰을 담을 자리가 없다
 *  - `failed`에 `text`가 없는 것이 FR-030·SC-014의 방어다 — 거부된 글이 화면에 못 오른다
 *  - `build-error`에 필드가 없는 것이 원칙 III의 방어다 — 환경 변수 이름이 샐 자리가 없다
 *
 * **자리가 없으면 담을 수 없다.** 005의 `RunResult`가 `{ text, ending }` 둘뿐인 것과
 * 같은 판단이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import type { EnvironmentResolution } from "../config/types";
import type { PipelineResult, PipelineStage } from "../diary/pipeline";
import type { DiaryEntry } from "../diary/types";

/**
 * 목록의 한 줄 (data-model.md §1).
 *
 * **전문을 담지 않는다.** 목록에서 전부 읽으면 일기가 늘수록 느려지고, 읽지도 않을 글을
 * 전부 역직렬화한다.
 *
 * **`readable`이 두 갈래인 이유**(FR-017a, 원칙 V): 읽을 수 없는 파일이 있는 날짜를
 * 조용히 빼면 「그날 일기가 없다」와 구분이 사라진다. 날짜는 파일 이름에서 오므로
 * **내용이 깨져도 어느 날인지는 안다** — 그것이 이 갈래를 만들 수 있는 이유다.
 */
export type DiaryListItem = { day: DayDate; readable: boolean };

/**
 * 사용자가 지금 어디에 있는가 (data-model.md §2).
 *
 * `build-error`는 **막다른 길이다**(FR-035a) — 일기 기능이 막힌다. 다만 앱은 뜬다
 * (FR-035c): 시작 시점에 죽으면 원인을 알 길이 없다.
 */
export type AppScreen =
  | { kind: "build-error" }
  | { kind: "list"; items: DiaryListItem[] }
  | { kind: "detail"; day: DayDate; entry: DiaryEntry }
  | { kind: "unreadable"; day: DayDate }
  | { kind: "writing" }
  | { kind: "written"; entry: DiaryEntry; saved: boolean }
  | { kind: "failed"; message: string };

/**
 * 첫 화면을 정한다.
 *
 * **환경을 모르면 일기 기능을 막는다**(FR-035a). 저장된 일기가 있어도 마찬가지다 —
 * 추론 위치를 고를 수 없으므로 새 일기를 쓸 수 없고, 그 상태를 감추면 사용자는
 * 빈 화면 앞에서 원인을 짐작하게 된다.
 */
export function initialScreen(
  resolution: EnvironmentResolution,
  items: DiaryListItem[],
): AppScreen {
  if (!resolution.ok) return { kind: "build-error" };
  return { kind: "list", items };
}

/** 목록으로 돌아간다. 돌아올 때마다 새로 읽은 목록을 받는다(FR-022) */
export function toList(items: DiaryListItem[]): AppScreen {
  return { kind: "list", items };
}

/**
 * 목록의 한 줄을 연다.
 *
 * **읽지 못하면 빈 일기를 지어내지 않는다**(FR-017a). `entry`가 `null`이면
 * `unreadable`로 가며, 그것은 「일기가 없다」와 다른 상태다(원칙 V).
 *
 * 목록을 만든 뒤 파일이 깨졌을 수 있으므로 `readable: true`인 항목도 `null`을 받을 수
 * 있다 — 그때도 같은 자리로 간다.
 */
export function toDetail(item: DiaryListItem, entry: DiaryEntry | null): AppScreen {
  if (!item.readable || entry === null) return { kind: "unreadable", day: item.day };
  return { kind: "detail", day: item.day, entry };
}

/**
 * 일기 쓰기를 시작한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 인자가 없는 것이 원칙 I의 방어다**(S1, FR-045).
 *
 * 저장 상태를 인자로 받으면 「이미 있으면 그것을 보여준다」가 한 줄로 가능해지고,
 * 그 순간 저장된 것이 생성을 대신한다. **볼 수 없으면 그것으로 갈릴 수 없다.**
 *
 * 003이 `allAssets()`를 두지 않은 것과 같은 판단이다 — 있으면 잘못된 일이 쉬워진다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function toWriting(): AppScreen {
  return { kind: "writing" };
}

/**
 * 파이프라인 단계를 **사용자가 할 수 있는 말**로 옮긴다 (FR-029, S8).
 *
 * **모델의 실패 양상을 드러내지 않는다**(원칙 III). 「되뱉었다」·「언어가 다르다」는
 * 캐릭터 뒤의 모델을 드러내는 말이며, 사용자는 모델을 모른다.
 *
 * **네 거부 갈래가 하나의 말로 합쳐진다** — 사용자에게 필요한 것은 「무엇이 잘못됐나」가
 * 아니라 「무엇을 할 수 있나」다(005가 `describeFailure`에서 내린 것과 같은 판단).
 */
function messageFor(stage: PipelineStage): string {
  switch (stage) {
    case "day-not-closed":
      return "아직 이르다. 하루가 끝나야 그날의 일기를 쓸 수 있다";
    case "already-running":
      return "이미 쓰고 있다";
    case "signals":
      return "그 하루의 기록을 가져오지 못했다. 다시 시도해 볼 만하다";
    case "request-build":
      return "캐릭터를 먼저 골라야 한다";
    case "model-not-ready":
      return "고른 캐릭터를 먼저 준비해야 한다";
    case "storage":
      return "일기를 저장하지 못했다. 다시 시도해 볼 만하다";
    case "generation":
      // **네 거부 갈래·시간 초과·끊김이 모두 여기로 온다.** 갈래를 화면에서 다시
      // 가르지 않는다 — 가르는 순간 모델의 실패 양상이 사용자에게 드러난다.
      return "일기가 제대로 나오지 않았다. 다시 시도해 볼 만하다";
  }
}

/**
 * 생성 결과를 화면으로 옮긴다 (data-model.md §5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`storage` 실패만 `failed`가 아니다**(FR-012a).
 *
 * 6단계(저장)에 도달했다는 것 자체가 5단계(생성) 성공을 뜻하므로 **보여줄 글이 있다.**
 * 30초를 들인 글이고 다시 생성해도 같은 글이 나오지 않으므로 읽을 기회를 빼앗지 않는다.
 *
 * 다만 `saved: false`로 **남지 않는다는 것을 함께 전한다**(FR-012b) — 성공처럼 보이면
 * 사용자는 일기가 남은 줄 안다(SC-008c).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function afterGeneration(result: PipelineResult): AppScreen {
  if (result.ok) return { kind: "written", entry: result.entry, saved: true };

  // 저장 실패인데 글이 있다 — 보여주되 남지 않는다고 말한다.
  if (result.entry !== undefined) {
    return { kind: "written", entry: result.entry, saved: false };
  }

  // **거부된 글은 여기 오지 않는다** — 애초에 결과에 없다(002 FR-012).
  return { kind: "failed", message: messageFor(result.stage) };
}
