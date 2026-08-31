/**
 * 내려받기 상태를 화면에 보이는 규칙 — **순수 함수 하나.**
 *
 * 계약: specs/026-parallel-model-download/contracts/download-view.md
 *       specs/008-download-conflict-feedback/contracts/download-view.md (원형)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 화면이 아니라 여기인가.**
 *
 * 판정해야 할 것이 상태의 조합이고, 그중 하나(「거부 안내가 아직 참인가」)가 **시간에
 * 따라 거짓이 된다.** 화면의 `useEffect`로 다루면 타이밍 버그가 들어오고 그 버그는
 * 기기에서만 보인다.
 *
 * 007이 같은 문제를 `resolveSelection()`으로 풀었고, 그 덕에 「옮김」 규칙 전체가 기기
 * 없이 검증됐다. 여기서도 같은 구조를 쓴다.
 *
 * **008의 두 버그가 여기서 판정 쪽으로 막힌다**:
 *  - 버그 ① 거부가 화면에 닿지 않음 → `notice`가 그 통로다
 *  - 버그 ② 거부가 받던 것을 지움 → **`active`는 `rejection`을 보지 않는다**
 *
 * **026이 `active`를 단수 → 복수(`DownloadProgress[]`)로 바꿨다.** 서로 다른 캐릭터를
 * 동시에 받을 수 있으므로, 여러 줄에 동시에 진행 표시가 붙는다. 008의 불변식은 전부
 * 유지된다 — `noticeFor`의 "받는 중인가"만 "배열에 있는가"로 바뀐다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DownloadProgress, DownloadRejection, DownloadView } from "./types";

/**
 * 무엇을 보일지 정한다.
 *
 * @param active 지금 받는 중인 것들. 없으면 빈 배열
 * @param rejection 마지막 거부. 없거나 사용자가 닫았으면 null
 *
 * **부수효과가 없고 포트에 닿지 않는다.** 그래서 규칙 전체가 기기 없이 검증된다.
 */
export function resolveDownloadView(
  active: DownloadProgress[],
  rejection: DownloadRejection | null,
): DownloadView {
  return { active, notice: noticeFor(active, rejection) };
}

/**
 * 거부 안내를 보일 것인가.
 *
 * **★ 여기가 이 모듈의 핵심이다.** 「quiet을 받는 중이라 거부했다」는 quiet이 끝나거나
 * 멈추는 순간 **거짓이 된다.** 안내를 지우는 코드를 따로 두지 않고 **매번 다시 물어서**
 * 자동으로 사라지게 한다.
 *
 * 008의 4단계를 배열 대응 3단계로 (contracts/download-view.md 「noticeFor — 배열로」):
 *  008의 "받는 중인가(2번)"와 "받던 것이 바뀜(3번)"이 배열에서는 "busyWith가 목록에
 *  있는가" 하나로 합쳐진다.
 */
function noticeFor(
  active: DownloadProgress[],
  rejection: DownloadRejection | null,
): DownloadRejection | null {
  // 1. 거부가 없으면 안내도 없다.
  if (rejection === null) return null;

  // 2. **거부가 아직 참인가.** `busyWith`였던 캐릭터가 더 이상 받는 중 목록에 없으면,
  //    거부는 거짓이 됐다 — 그 캐릭터가 다 받았거나 멈췄으면 사용자는 그냥 다시
  //    누르면 된다(008 I4). 받던 것이 **바뀐** 경우도 여기에 함께 걸린다.
  if (!active.some((p) => p.character === rejection.busyWith)) return null;

  // 3. 요청했던 캐릭터가 지금 받는 중이면(= 재시도가 성공함) 옛 거부는 안 보인다(008 I2).
  //    003/026이 같은 캐릭터의 재요청을 다루므로, 이 거부는 나면 안 되지만 —
  //    **불변식은 「나지 않는다」가 아니라 「나도 보이지 않는다」여야 한다.**
  if (active.some((p) => p.character === rejection.requested)) return null;

  // 4. 그 외에는 그대로 싣는다.
  return rejection;
}
