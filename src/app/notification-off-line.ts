/**
 * 설정 알림 행의 「알림이 꺼져 있어 …」 줄 (085).
 *
 * 계약: specs/085-write-reminder/contracts/write-reminder.md ST1
 *       spec.md FR-015·FR-016
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 쓸 차례 알림은 알림 권한이 없으면 보이지 않는다 — 자동 쓰기가 켜져 있는데 알림이 「허용 안 함」이면 그 사실을 한 줄로 말한다.
 * 자동 쓰기는 그대로 둔다(FR-016 — 허용하면 그때부터 뜬다). 꼬리표가 아직 읽히지 않았으면(`unread`) 말하지 않는다 — 모르는 것을
 * 「꺼져 있다」로 단정하지 않는다(원칙 V). 순수 함수 — 화면은 문자열만 받는다(057 `skippedLineText`와 같은 방식).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { text } from "../i18n/current";
import type { PermissionTag } from "./permission-tags";

export function notificationOffLine(
  autoWriteEnabled: boolean,
  notificationTag: PermissionTag,
): string | undefined {
  return autoWriteEnabled && notificationTag === "denied"
    ? text().reminder.notificationOff
    : undefined;
}
