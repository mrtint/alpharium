/**
 * 한국어 카탈로그 — 개발자 메뉴 (062, 원래 자리 `src/ui/developer-text.ts` 059 — 보드 「KO 문자열 — 설정 · 개발자 (6c–6l)」 표의 `dev.*` 원문).
 *
 * **보드 밖**: `allReady`·`redownload*`·`diagBack`·`diagSummary`는 보드 표에 없는 문구다(059 research R3). 개발 빌드 전용 화면도
 * 카탈로그로 옮겼다(062 Clarification Q4).
 */

export const developer = {
  title: "개발자",
  groupModules: "모듈",
  readModule: "읽는 모듈",
  writeModule: "쓰는 모듈",
  redownload: "모듈 다시 받기",
  groupDiag: "진단",
  diag: "진단",
  devOnly: "개발 빌드만",
  /** 보드 밖 — `6e` 마크업의 「진단」 행 보조 줄(KO 표에는 없다). 진단 화면의 묶음 순서와 같다 */
  diagSummary: "환경 · 저장 · 사진 권한 · 프로브 · 프롬프트 · 실패",
  /** 보드 `6h` 머리 오른쪽 작은 글자 */
  diagTag: "DEV",
  groupReplay: "다시 보기",
  replayOnboarding: "온보딩부터 다시",
  off: "개발자 메뉴 끄기",
  enabled: "개발자 메뉴가 켜졌어요",
  enabledSub: "이 기기에서만",
  already: "이미 켜져 있어요",
  /** 보드 `dev.tapsLeft` 「개발자 메뉴까지 {n}번 남았어요」. 숫자 그대로(천 단위 구분 없음) */
  tapsLeft: (n: number): string => `개발자 메뉴까지 ${n}번 남았어요`,
  /** 보드 밖 — 받을 것이 없을 때 대화상자 대신 보이는 한 줄(research R3) */
  allReady: "이미 모두 준비돼 있어요",
  /** 보드 밖 — 모듈 다시 받기 확인(research R3) */
  redownloadTitle: "모듈을 다시 받을까요?",
  /** 보드 밖 — 본문(모바일 데이터로 받을 때, 보드 `dev.redownload.cellular` 「모바일 데이터로 {size}」를 문장으로 이은 것) */
  redownloadCellular: (size: string): string => `모바일 데이터로 ${size}를 받아요.`,
  /** 보드 밖 — 본문 */
  redownloadBody: "빠진 모듈을 받아요. 이미 받은 것은 그대로 둬요.",
  redownloadConfirm: "받기",
  redownloadCancel: "취소",
  /** 보드 밖 — 진단 겹의 뒤로 */
  diagBack: "개발자",
};
