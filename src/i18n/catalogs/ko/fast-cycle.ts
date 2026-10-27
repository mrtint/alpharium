/**
 * 한국어 카탈로그 — 빠른 주기 (106, 개발 빌드 전용 화면의 문구).
 *
 * **새 영역이다** — 062 골든(G1)은 이관 전 문구 집합이라 이 영역의 문구는 `ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`으로만 허용한다.
 * 「개발 빌드만」은 여기 두지 않고 `developer.devOnly`를 쓴다(064 simulation과 같다). **보드 밖**이고 초안이다 — 소유자가 확정한다.
 *
 * 창 길이(주기의 절반)·알림 지연 상한은 사람이 정한 값이다 — 측정이 아니다(원칙 V). 그 사실을 한계 안내가 말한다.
 */

export const fastCycle = {
  group: "빠른 주기",
  /** 켬/끔 행 */
  toggle: "빠른 주기",
  /** 프리셋 행 라벨 — 선택된 행은 `selected`가 뒤에 붙는다 */
  preset: (minutes: number): string => `${minutes}분마다`,
  selected: "선택됨",
  custom: "직접 입력 (5~180분)",
  customPlaceholder: "분",
  customApply: "적용",
  customInvalid: "5~180 사이의 정수를 적어 주세요.",
  currentCycle: "지금 주기",
  nextStart: "다음 주기 시작",
  /** 켜 두어도 자동으로 쓰기가 꺼져 있으면 쓰지 않는다 — 설정 토글은 바뀌지 않는다 */
  autoWriteOff: "「자동으로 쓰기」가 꺼져 있어서, 켜 두어도 쓰지 않아요.",
  startFailed: "지금 쓰는 중이라 켜지 못했어요. 잠시 뒤에 다시 해 주세요.",
  /** 한계 안내 — 안드로이드 잡 간격 하한·iOS 깨움·사람이 정한 값 */
  limits:
    "안드로이드는 잡 간격이 15분 아래로 줄지 않고 OS가 더 미룰 수 있어요. iPhone은 OS가 깨우는 때를 앱이 정하지 못해요. 시도 창(주기의 절반)과 알림 지연 상한은 사람이 정한 값이에요.",
  /** 켤 때 오늘 일기가 있으면 보이는 확인창 */
  confirmTitle: "오늘 일기를 지울까요?",
  confirmBody:
    "빠른 주기는 주기가 바뀔 때마다 오늘 일기를 지우고 다시 써요. 켜거나 주기를 바꾸면 지금 있는 오늘 일기도 지워져요.",
  confirmYes: "지우고 켜기",
  confirmNo: "취소",
  /** 진단 화면 머리 한 줄 */
  diagLine: (minutes: number): string => `빠른 주기 켜짐 · 주기 ${minutes}분`,
};
