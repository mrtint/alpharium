/**
 * 한국어 카탈로그 — 진단 「최근 자동 쓰기 시도」 묶음 (078). 보드에 없는 묶음이라 문구는 이 작업이 정했다.
 *
 * 062 규칙: 옛 `diagnostics` 영역에 키를 더하지 않고 새 영역으로 둔다(골든 G2가 옛 영역의 키 짝을 잠근다).
 */

export const attempts = {
  group: "최근 자동 쓰기 시도",
  empty: "아직 시도가 없어요",
  /** 경로 셋 */
  pathBackground: "백그라운드",
  pathAppOpen: "앱 열기",
  pathManual: "지금 실행",
  /** 머리 줄 — 「백그라운드 · 10월 13일 22:05」 */
  line: (path: string, time: string): string => `${path} · ${time}`,
  /** 결과 열둘 — `AttemptOutcome` 순서 */
  started: "시작한 뒤 끝나지 않음",
  simulation: "상태 흉내가 막음",
  disabled: "자동 쓰기 꺼짐",
  notNearTarget: "쓰는 시각이 아님",
  allWritten: "모두 써 있음",
  noPhotoAccess: "사진 권한 없음",
  noMaterial: "재료 없음",
  noCharacter: "캐릭터 없음",
  write: "홈에 넘김",
  alreadyRunning: "다른 쓰기가 진행 중",
  ran: "썼음",
  failed: "실패",
};
