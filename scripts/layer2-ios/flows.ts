/**
 * 097 — iOS 층 2 흐름 표 (사람이 못 박은 상수).
 *
 * 계약: specs/097-ios-e2e-suite/data-model.md 「Layer2IosFlow」, contracts/ios-layer2-runner.md
 *
 * 출발 상태·쓴 날·이야기는 안드로이드 층 2(`scripts/layer2/flows.ts`)와 같은 값이라 **그것을 다시 쓴다**(복제하지 않는다) —
 * 같은 기능을 두 플랫폼에서 같은 전제로 본다. 여기서 더하는 것은 Maestro가 없는 대신 사람이 해야 할 조작(`humanSteps`)과 사진 심기 여부다.
 */

import { LAYER2_FLOWS as ANDROID_FLOWS, type Layer2Flow } from "../layer2/flows.ts";

export type Layer2IosFlow = {
  id: "write-and-read" | "open-app-writes" | "diagnostics-try-write" | "first-run-auto-diary";
  /** 안드로이드 `Layer2Flow`와 같은 출발 상태·쓴 날 (재사용) */
  story: Layer2Flow["story"];
  preferenceOverrides: Layer2Flow["preferenceOverrides"];
  deleteFiles: Layer2Flow["deleteFiles"];
  absentDays: Layer2Flow["absentDays"];
  writtenDay: Layer2Flow["writtenDay"];
  /** `ios:seed`로 쓴 날에 사진을 심는가 */
  seedsPhotos: boolean;
  /** 사람이 할 조작 안내문(순서 있는 목록). 비어 있으면 완전 자동 */
  humanSteps: readonly string[];
  /** 조작 대기 한도 — 사람이 조작을 마치고 Enter를 누를 때까지 */
  operationTimeoutMs: number;
  /** 일기 파일 생성 대기 한도 */
  generationTimeoutMs: number;
};

const OPERATION_TIMEOUT_MS = 5 * 60_000;
const GENERATION_TIMEOUT_MS = 10 * 60_000;

function reuse(id: Layer2IosFlow["id"]): Layer2Flow {
  const flow = ANDROID_FLOWS.find((f) => f.file === `.maestro/layer2-${id}.yml`);
  if (flow === undefined) throw new Error(`안드로이드 층 2에 ${id} 흐름이 없다`);
  return flow;
}

function define(
  id: Layer2IosFlow["id"],
  extra: { seedsPhotos: boolean; humanSteps: readonly string[] },
): Layer2IosFlow {
  const base = reuse(id);
  return {
    id,
    story: base.story,
    preferenceOverrides: base.preferenceOverrides,
    deleteFiles: base.deleteFiles,
    absentDays: base.absentDays,
    writtenDay: base.writtenDay,
    operationTimeoutMs: OPERATION_TIMEOUT_MS,
    generationTimeoutMs: GENERATION_TIMEOUT_MS,
    ...extra,
  };
}

export const IOS_LAYER2_FLOWS: readonly Layer2IosFlow[] = [
  define("write-and-read", {
    seedsPhotos: true,
    humanSteps: [
      "앱이 뜨면 홈에서 어제를 고른다(주간 스트립에서 오늘 왼쪽 한 칸).",
      "「쓰기」를 누른다. 확인 창이 뜨면 확인한다.",
      "쓰는 중 화면이 뜨면 앱을 앞에 두고 기다린다(홈 화면으로 나가지 않는다).",
    ],
  }),
  define("open-app-writes", { seedsPhotos: true, humanSteps: [] }),
  define("diagnostics-try-write", {
    seedsPhotos: false,
    humanSteps: [
      "홈 위의 설정(⋯)을 열고 「개발자」 → 「진단」으로 간다.",
      "「한 번 써 보기」를 누른다.",
      "쓰는 중 화면이 뜨면 앱을 앞에 두고 기다린다.",
    ],
  }),
  define("first-run-auto-diary", {
    seedsPhotos: false,
    humanSteps: [
      "권한 창(사진·위치·알림)이 뜨면 허용한다.",
      "작명 화면에서 이름을 입력하고 완료한다(키보드가 버튼을 가리면 키보드의 완료 키).",
      "「정상 동작 확인」이 끝나고 홈이 뜨면 앱을 앞에 둔다. 실패 화면이면 「그냥 시작하기」를 누른다.",
    ],
  }),
];
