/**
 * 내려받기 상태를 화면에 보이는 규칙 — **순수 함수 하나.**
 *
 * 계약: specs/008-download-conflict-feedback/contracts/download-view.md
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
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DownloadProgress, DownloadRejection, DownloadView } from "./types";

/**
 * 무엇을 보일지 정한다.
 *
 * @param active 지금 받는 중인 것. 없으면 null
 * @param rejection 마지막 거부. 없거나 사용자가 닫았으면 null
 *
 * **부수효과가 없고 포트에 닿지 않는다.** 그래서 규칙 전체가 기기 없이 검증된다.
 */
export function resolveDownloadView(
  active: DownloadProgress | null,
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
 */
function noticeFor(
  active: DownloadProgress | null,
  rejection: DownloadRejection | null,
): DownloadRejection | null {
  // 2. 거부가 없으면 안내도 없다.
  if (rejection === null) return null;

  // 3. **거부가 아직 참인가.** 받는 것이 없으면 그 말은 거짓말이다 — 「받는 중이라
  //    거부했다」인데 받는 것이 없으므로. 사용자는 이제 그냥 다시 누르면 된다(I4).
  if (active === null) return null;

  //    받던 것이 **바뀌었어도** 참이 아니다. 옛 안내가 새 내려받기에 얹히지 않는다.
  if (active.character !== rejection.busyWith) return null;

  // 4. 받는 중인 것과 같은 것을 요청한 거부는 보이지 않는다(I2).
  //
  //    003이 같은 캐릭터의 재요청을 허용하므로 이런 거부는 나지 않아야 한다. 그래도
  //    막는다 — **불변식은 「나지 않는다」가 아니라 「나도 보이지 않는다」여야 한다.**
  if (active.character === rejection.requested) return null;

  // 5. 그 외에는 그대로 싣는다.
  return rejection;
}
