/**
 * 진단 정보 수집.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/diagnostics.md
 *
 * 헌법 원칙 III — **사용자 화면에는** 모델 식별자를 싣지 않는다. 이 파일은 예외다 —
 * local·dev 전용 진단 경로이며 배포 빌드에서 닿지 않는다(001 SC-013). 014가
 * `characterModels`를 더해 캐릭터→모델 대응을 진단 리포트에 담는다.
 * 헌법 원칙 IV — 추론 속도·출력 점수·모델 비교를 여기에 넣지 않는다.
 *                이 파일은 상태를 모을 뿐 품질을 재지 않는다.
 */

import { currentEnvironment, desktopInferenceUrl } from "../config/environment";
import { CHARACTERS } from "../diary/types";
import { selectBackend, selectLocation } from "../inference/select";
import type { InferenceLocation } from "../inference/types";
import { displayName } from "../models/roster";
import { collectPromptPreviews } from "./prompt-preview";
import { checkStorage } from "./storage-check";
import type { DiagnosticReport, Failure } from "./types";

/**
 * 다섯 캐릭터의 모델 표시 이름 (014 FR-017).
 *
 * `roster.ts`의 `displayName()`을 부르는 유일한 자리다. `src/ui/`는 이 값을
 * `DiagnosticReport`를 통해서만 받고, `roster.ts`를 직접 import할 수 없다
 * (007 헌법 검사).
 */
function collectCharacterModels(): Readonly<Record<(typeof CHARACTERS)[number], string>> {
  return Object.fromEntries(CHARACTERS.map((c) => [c, displayName(c)])) as Readonly<
    Record<(typeof CHARACTERS)[number], string>
  >;
}

export type ReportOptions = {
  requested?: InferenceLocation;
  serverBaseUrl?: string;
};

/**
 * 지금 상태를 모은다(FR-017).
 *
 * 실패는 예외로 던지지 않고 failures에 실린다 — 진단 화면 자체가 뜨지 않으면 개발자가
 * 원인을 알 수 없다(FR-007).
 */
export async function collectReport(options: ReportOptions = {}): Promise<DiagnosticReport> {
  const environment = currentEnvironment();
  const failures: Failure[] = [];

  if (!environment.ok) {
    failures.push({
      what: "환경 판정",
      reason:
        environment.reason === "missing"
          ? "EXPO_PUBLIC_APP_ENV가 설정되지 않았다"
          : `알 수 없는 환경 값: ${environment.received}`,
    });
  }

  const location = selectLocation(environment, options.requested);

  if (!location.ok && location.reason === "location-forbidden") {
    // dev·prod에서 서버 추론이 시도되면 차단하고 그 사실을 드러낸다(FR-009c).
    failures.push({
      what: "추론 위치 선택",
      reason: `${location.environment} 환경에서 ${location.requested}는 허용되지 않는다`,
    });
  }

  const selection = selectBackend(
    environment,
    options.requested,
    options.serverBaseUrl ?? desktopInferenceUrl(),
  );

  // 저장 점검은 추론 위치와 무관하게 돈다 — 파일 시스템은 어느 환경에서든 있어야 한다.
  const storage = await checkStorage();

  if (storage.kind === "failed") {
    failures.push({ what: "일기 저장", reason: storage.reason });
  }

  if (!selection.ok) {
    return {
      environment,
      inferenceLocation: location.ok
        ? { ok: true, location: location.location }
        : { ok: false, reason: location.reason, requested: location.requested },
      moduleStatus: { kind: "unavailable", reason: "추론 위치를 고르지 못했다" },
      storage,
      characterModels: collectCharacterModels(),
      promptPreviews: collectPromptPreviews(),
      failures,
    };
  }

  const moduleStatus = await selection.backend.isAvailable();

  if (moduleStatus.kind === "failed") {
    failures.push({ what: "추론 모듈", reason: moduleStatus.reason });
  }

  return {
    environment,
    inferenceLocation: location.ok
      ? { ok: true, location: location.location }
      : { ok: false, reason: location.reason, requested: location.requested },
    moduleStatus,
    storage,
    characterModels: collectCharacterModels(),
    promptPreviews: collectPromptPreviews(),
    failures,
  };
}
