/**
 * 069 — 층 1 기준 상태: `files/preferences/` 설정 파일을 어떻게 되돌리는가 (순수 표).
 *
 * 계약: specs/069-e2e-layer1-screen-flows/contracts/baseline-state.md
 *
 * **이 표가 앱이 읽는 설정 파일 전부를 덮는다는 것은 `__tests__/e2e/baseline.test.ts`(G-1)가 잠근다.**
 * 앱이 새 설정 파일을 읽기 시작하면 테스트가 실패해 여기에 한 줄을 더하게 한다.
 *
 * 모델 파일(`files/models/`)은 이 표에 없다 — 층 1은 모델을 읽기만 한다(존재 점검).
 */

export type BaselineAction = "write" | "delete" | "keep";

export type BaselineEntry = {
  /** `files/preferences/` 아래 파일 이름 */
  file: string;
  action: BaselineAction;
  /** `write`일 때 JSON 문자열 */
  content?: string;
  reason: string;
};

export const BASELINE: readonly BaselineEntry[] = [
  {
    file: "onboarding.json",
    action: "write",
    content: JSON.stringify({
      completed: true,
      batteryNoticeShown: true,
      welcomeShown: true,
      downloadConsented: true,
    }),
    reason: "첫 실행 게이트(resolveFirstRunStage)가 done이 되게",
  },
  {
    file: "auto-diary.json",
    action: "write",
    content: JSON.stringify({ enabled: false, targetHour: 22 }),
    reason: "자동 쓰기 꺼짐 — 앱을 열어도, 목표 시각에도 일기 생성이 시작되지 않게(앱 기본값과 같다)",
  },
  { file: "developer-menu.json", action: "delete", reason: "배포 환경의 개발자 메뉴 켜짐 기록" },
  { file: "simulation.json", action: "delete", reason: "상태 흉내 기록(064)" },
  { file: "auto-write-skipped.json", action: "delete", reason: "사진 권한 건너뜀 기록(057)" },
  { file: "notified.json", action: "delete", reason: "완성 알림 확인 기록(020)" },
  { file: "write-failures.json", action: "delete", reason: "쓰기 실패 기록(060) — 진단이 비어 시작" },
  { file: "character-names.json", action: "delete", reason: "이름 바꾸기 훑기가 만든 값이 다음 실행으로 새지 않게" },
  { file: "geocoding-setting.json", action: "delete", reason: "장소 이름으로 보기 기본값" },
  { file: "selected-character.json", action: "keep", reason: "로스터가 하나라 값이 하나뿐" },
];

/** 소스에 `*.json`으로 나오지만 `preferences/`의 설정이 아닌 것들 */
export const NON_PREFERENCE_JSON: readonly { file: string; reason: string }[] = [
  { file: "state.json", reason: "모델 내려받기 상태(files/models/) — 층 1은 모델을 건드리지 않는다" },
];
