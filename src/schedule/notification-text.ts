/**
 * 자동 쓰기 완성 알림의 문구 (057, 보드 `notif.autoWriteDone`).
 *
 * 계약: specs/057-auto-write-rules/contracts/auto-write.md NT1~NT3, spec FR-023·FR-024
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 「{name}{이|가} {M}월 {d}일 일기를 다 썼어요」 한 줄이다. 020은 고정 문구 「오늘의 일기가 준비됐어요」를 썼는데, 자동 쓰기는
 * 어제를 쓰는 일이 흔해(오전 시도 창, 사흘 재시도) **사실과 다른 말**이 됐다(원칙 V). 이름과 날짜를 넣어 무엇이 일어났는지만 말한다.
 *
 * **일기 내용·요약·감상을 담지 않는다**(020 FR-012, 원칙 II) — 열어야 읽는다. 본문 줄도 없다(Clarification Q4).
 * 이름은 부르는 쪽이 035 `displayNameOf()`로 만든 호칭이다(원칙 III — 모델 정보가 아니다). 조사는 017 `particleFor()` 하나로 고른다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import { particleFor } from "../diary/particle";

export function autoWriteDoneText(name: string, day: DayDate): string {
  const [, month, date] = day.split("-").map(Number);
  return `${name}${particleFor(name)} ${month}월 ${date}일 일기를 다 썼어요`;
}
