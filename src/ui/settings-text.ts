/**
 * 설정 화면(055, 보드 `6a`·`6c`)의 문구.
 *
 * 계약: specs/055-settings-entry-frame/spec.md FR-031, contracts/settings-stack.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **보드 「KO 문자열 — 설정 · 개발자 (6c–6l)」 표의 원문이다**(C4). 키 이름은 보드 키를 따른다 —
 * `settings-screen.test.tsx`가 글자 단위로 잠근다. 이 구역에는 EN이 없다.
 *
 * 보드 표에 없는 셋(`save`·`backToSettings`·`redownload`)은 보드의 다른 자리에서 온 낱말이다 —
 * `save`는 `6c` ② 메모의 「저장 버튼」, `backToSettings`는 `6e`·`6h` 마크업의 「‹ 설정」, `redownload`는
 * `dev.redownload` 「모듈 다시 받기」(055 Clarification).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const SETTINGS_TEXT = {
  title: "설정",
  /** 앞에 ‹ 를 따로 그린다 */
  back: "일기",
  groupCharacter: "캐릭터",
  name: "이름",
  groupDiary: "일기",
  autoWrite: "자동으로 쓰기",
  groupPerm: "권한 · 휴대폰 설정으로 이동",
  permPhotos: "사진",
  permLocation: "위치",
  permNotif: "알림",
  permBattery: "배터리",
  permBatteryHint: "배터리 사용 · 제한 없음으로 두면 제때 써요",
  permAllowed: "허용됨",
  permPartial: "일부 허용",
  permDenied: "허용 안 함",
  groupAbout: "정보",
  version: "버전",
  /** 진입점 점 세 개의 스크린리더 라벨(보드 `6a` 「스크린리더 라벨 "설정"」) */
  entryLabel: "설정",
  /** 이름 바꾸기의 확정 버튼 */
  save: "저장",
  /** 설정 위에 쌓인 화면의 뒤로 — 앞에 ‹ 를 따로 그린다 */
  backToSettings: "설정",
  /** 쓰기 시작 전 「캐릭터를 먼저 준비해야 한다」 안내의 버튼 */
  redownload: "모듈 다시 받기",
  /** 개발자 겹의 제목(보드 `dev.title`) — 진입점은 개발자 메뉴 조각 몫 */
  developerTitle: "개발자",
} as const;

/** 진입점·머리의 ‹ 글리프. 문구와 따로 그린다(보드 마크업이 ‹ 를 22, 글자를 15로 다르게 그린다). */
export const BACK_CHEVRON = "‹";
