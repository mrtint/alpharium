/**
 * 한국어 카탈로그 — 진단·개발자 「날짜별 백그라운드」 묶음 (078 → 109). 보드에 없는 묶음이라 문구는 이 작업이 정했다.
 *
 * 062 규칙: 옛 `diagnostics` 영역에 키를 더하지 않고 새 영역으로 둔다(골든 G2가 옛 영역의 키 짝을 잠근다).
 * 109: 최근 20건 줄(경로·시각 머리, 깨운 상태·요청 꼬리)을 걷고 날짜별 요약 문구로 바꿨다. 결과 열다섯 문구는 요약의 결과별 횟수가 쓴다.
 */

export const attempts = {
  group: "날짜별 백그라운드",
  empty: "아직 기록이 없어요",
  /** 머리 — 「10월 13일」 */
  dayHead: (month: number, date: number): string => `${month}월 ${date}일`,
  /** 요약 값 — 「깨움 3번」 (0번이면 이것만) */
  wakes: (count: number): string => `깨움 ${count}번`,
  /** 첫~마지막 깨움 시각 — 「02:22~06:52」, 하나뿐이면 「22:05」 */
  range: (first: string, last: string): string => (first === last ? first : `${first}~${last}`),
  /** 결과별 횟수 꼬리 — 「재료 없음 2」 */
  count: (outcome: string, count: number): string => `${outcome} ${count}`,
  /** 결과 열다섯 — `AttemptOutcome` 순서 */
  started: "시작한 뒤 끝나지 않음",
  simulation: "상태 흉내가 막음",
  disabled: "자동 쓰기 꺼짐",
  notNearTarget: "쓰는 시각이 아님",
  /** 창 밖 따라잡기는 백그라운드에서 하루에 한 번이다 — 오늘 몫을 이미 썼다 */
  catchUpSpent: "오늘 창 밖에서 이미 한 번 시도함",
  allWritten: "모두 써 있음",
  noPhotoAccess: "사진 권한 없음",
  noMaterial: "재료 없음",
  noCharacter: "캐릭터 없음",
  write: "홈에 넘김",
  alreadyRunning: "다른 쓰기가 진행 중",
  /** 080 — 합류한 홈에서 그만두었거나 「일기 모두 지우기」가 그 쓰기를 멈췄다 */
  cancelled: "사용자가 그만둠",
  ran: "썼음",
  failed: "실패",
  /** 090 — iOS가 백그라운드 실행의 시간 예산이 끝났다고 알렸다 (요약은 따로 세지 않는다) */
  expired: "시간 예산이 끝남",
};
