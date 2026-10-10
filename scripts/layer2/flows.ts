/**
 * 073 — 층 2 흐름 표 (사람이 못 박은 상수).
 *
 * 계약: specs/073-e2e-layer2-stale-flows/contracts/layer2-flows.md, data-model.md `Layer2Flow`
 *
 * 층 2는 실제 모델로 일기를 쓴다. 흐름마다 출발 상태가 다르므로(어제만 비워 둠, 자동 쓰기 켬, 온보딩 되돌림 …) 표가 그 전제를 적고
 * 실행기가 흐름 하나를 돌리기 전에 기준 상태 위에 덮는다. 코드가 분포·결과를 보고 정하지 않는다.
 *
 * 이 파일의 `file` 목록은 `scripts/run-device-tests.mjs`의 `LAYER2_FLOWS`·`FLOWS`와 같아야 한다(계약 테스트가 잠근다 —
 * `.mjs`가 `.ts`를 정적으로 불러오지 않는 069 관례 때문에 배열이 양쪽에 있다).
 */

import type { FixtureDayKey } from "../layer1/fixtures.ts";

export type PreferenceWrite = { file: string; content: string };

export type Layer2Flow = {
  /** 저장소 상대 경로. `FLOWS`에도 있어야 한다 */
  file: string;
  /** 지키는 기능 한 줄 (대응표 「층 2」 열과 같은 말) */
  story: string;
  /** 기준 상태 위에 덮는 `preferences/*.json` */
  preferenceOverrides: (now: Date) => PreferenceWrite[];
  /** 기준 상태 뒤 추가로 지우는 `preferences/` 파일 */
  deleteFiles: readonly string[];
  /** 일기 픽스처에서 뺄 날 — 흐름이 쓸 날은 비어 있어야 한다 */
  absentDays: readonly FixtureDayKey[];
  /** 흐름이 쓰는 날 — 끝나고 그 날의 일기를 가져온다 */
  writtenDay: "today" | "yesterday";
};

const none = (): PreferenceWrite[] => [];

export const LAYER2_FLOWS: readonly Layer2Flow[] = [
  {
    file: ".maestro/layer2-write-and-read.yml",
    story: "일기 쓰기 → 저장 → 쓴 날 홈 (어제, 사진 5장)",
    preferenceOverrides: none,
    deleteFiles: [],
    absentDays: ["yesterday"],
    writtenDay: "yesterday",
  },
  {
    file: ".maestro/layer2-open-app-writes.yml",
    story: "자동 쓰기가 켜진 채 앱을 열면 쓰는 중 → 쓴 날 (057)",
    // 목표 시각 = 지금 시 — 시도 창(3시간) 안이어야 판정이 `act`다(`decideSchedule`). 오늘 일기가 있어야 가장 최근 미작성일이 어제다.
    preferenceOverrides: (now) => [
      { file: "auto-diary.json", content: JSON.stringify({ enabled: true, targetHour: now.getHours() }) },
    ],
    deleteFiles: [],
    absentDays: ["yesterday"],
    writtenDay: "yesterday",
  },
  {
    file: ".maestro/layer2-diagnostics-try-write.yml",
    story: "진단 「한 번 써 보기」 → 쓰는 중 → 쓴 날 (060)",
    preferenceOverrides: none,
    deleteFiles: [],
    absentDays: ["today"],
    writtenDay: "today",
  },
  {
    file: ".maestro/layer2-first-run-auto-diary.yml",
    story: "첫 실행 자동 첫 일기 — 모델은 이미 있다 (040)",
    preferenceOverrides: () => [
      {
        file: "onboarding.json",
        content: JSON.stringify({
          completed: false,
          batteryNoticeShown: true,
          welcomeShown: false,
          downloadConsented: true,
        }),
      },
    ],
    // 이름을 새로 짓는 단계가 돌도록 지난 실행의 이름을 지운다
    deleteFiles: ["character-names.json"],
    absentDays: ["today"],
    writtenDay: "today",
  },
];
