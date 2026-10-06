/**
 * 진단 정보 수집.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/diagnostics.md, specs/060-diagnostics-screen/contracts/diagnostics.md RP1~RP3
 *
 * 헌법 원칙 IV — 추론 속도·출력 점수·모델 비교를 여기에 넣지 않는다.
 *                이 파일은 상태를 모을 뿐 품질을 재지 않는다.
 *
 * 060 — 화면이 안 읽는 것을 걷었다(캐릭터별 모델 표시 이름·모듈 상태·옛 저장 점검 왕복·수집 실패). 모듈 상태는 059 개발자 화면,
 * 저장 점검은 `src/app/diary-inspect.ts`가 맡는다. 화면을 열 때마다 파일을 쓰던 점검 왕복도 없어졌다.
 */

import { currentEnvironment } from "../config/environment";
import type { CustomNames } from "../diary/types";
import { selectLocation } from "../inference/select";
import type { InferenceLocation } from "../inference/types";
import { collectPromptPreviews } from "./prompt-preview";
import type { DiagnosticReport } from "./types";

export type ReportOptions = {
  requested?: InferenceLocation;
  /**
   * 035 — 사용자 지정 캐릭터 이름. 프롬프트 미리보기의 호칭 줄에 흐른다(FR-018).
   * 안 주면 코드 기본 이름으로 미리보기가 조립된다.
   */
  customNames?: CustomNames;
};

/**
 * 지금 상태를 모은다(FR-017). 던지지 않는다 — 환경 판정이 실패해도 그 사실이 `environment`에 실려 온다.
 */
export async function collectReport(options: ReportOptions = {}): Promise<DiagnosticReport> {
  const environment = currentEnvironment();
  const location = selectLocation(environment, options.requested);

  return {
    environment,
    inferenceLocation: location.ok
      ? { ok: true, location: location.location }
      : { ok: false, reason: location.reason, requested: location.requested },
    promptPreviews: collectPromptPreviews(options.customNames),
  };
}
