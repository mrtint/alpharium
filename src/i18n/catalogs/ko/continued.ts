/**
 * 한국어 카탈로그 — iPhone 이어 쓰기의 시스템 진행 표시 (092).
 *
 * 앱을 나간 뒤 잠금 화면·알림 센터에 보이는 제목과 보조 줄이다. **소유자 결정 2026-10-20**(설계문서
 * `docs/superpowers/specs/2026-10-20-ios-continued-write-design.md`): 보조 줄은 단계만 말하고 숫자(퍼센트·장 수·시간)를 쓰지 않는다.
 * 062 골든 키에 묶인 영역에 새 키를 섞지 않으려고 따로 둔다(085 `reminder` 선례).
 *
 * **일기 내용을 담지 않는다**(020 FR-012, 원칙 II) — 이름과 날짜만. 이름은 사용자가 지은 호칭이다(원칙 III).
 */

import { particleFor } from "../../../diary/particle";

export const continued = {
  /** 「{이름}{이|가} {M}월 {d}일 일기를 쓰고 있어요」 */
  title: (name: string, month: number, date: number): string =>
    `${name}${particleFor(name)} ${month}월 ${date}일 일기를 쓰고 있어요`,
  /** 보조 줄 — 단계 셋(제목 질문은 글 단계에 든다) */
  stage: {
    prepare: "준비하는 중",
    photos: "사진을 보는 중",
    writing: "글을 쓰는 중",
  },
};
