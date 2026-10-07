/**
 * 한국어 카탈로그 — 상태 흉내 (064, 보드 「KO 문자열 — 설정 · 개발자 (6c–6l)」 표의 `dev.group.sim`·`sim.*` 원문).
 *
 * **새 영역이다** — 062 골든(G1)은 이관 전 문구 집합이라 이 영역의 문구는 `ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`으로만 허용한다.
 * 「개발 빌드만」은 여기 두지 않고 `developer.devOnly`를 쓴다(FR-017).
 *
 * **보드 밖**: `dateOff`·`dateCancel`(날짜 대화상자의 행동 — 보드에 고르는 화면이 없다, 설계 B2)·`badgeLabel`(DEV 꼬리표의 스크린리더 라벨).
 */

export const simulation = {
  groupSim: "상태 흉내",
  date: "오늘 날짜",
  fail: "실패 토스트 보기",
  empty: "쓸 재료 0으로 보기",
  noPhoto: "사진 권한 없음으로 보기",
  blockedToast: "상태 흉내가 켜져 있어서 일기를 쓰지 않아요. 개발자 화면에서 끌 수 있어요.",
  /** 보드 `6i` ①·③ — 월 라벨 옆·쓰기 바의 꼬리표 */
  badge: "DEV",
  /** 보드 밖 — DEV 꼬리표의 스크린리더 라벨(누르면 개발자 화면) */
  badgeLabel: "개발자",
  /** 보드 밖 — 날짜 대화상자: 날짜 흉내를 끈다 */
  dateOff: "끄기",
  /** 보드 밖 — 날짜 대화상자: 닫는다 */
  dateCancel: "취소",
};
