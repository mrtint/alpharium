/**
 * 진단 보고 타입.
 *
 * 계약: specs/001-project-skeleton-setup/contracts/diagnostics.md
 *
 * 헌법 원칙 III — 모델 식별자·파라미터 수·양자화 방식을 싣지 않는다. 이 기능은 모델을
 * 다루지 않으므로 실을 것도 없지만, 다음 기능에서 추가되지 않도록 여기에 못 박는다.
 *
 * 헌법 원칙 IV — 이 타입에 추론 속도·출력 점수·모델 비교 필드를 넣지 않는다.
 * 진단은 상태를 보여줄 뿐 품질을 재지 않는다.
 *
 * 022 — `promptPreviews`가 더해졌다. **입력 프롬프트 원본을 진단 경로에서만 보여준다**
 * (사용자 화면 금지의 예외, 014의 `characterModels`와 같은 자격). 담기는 것은 우리가
 * 조립한 텍스트와 그 문자 수 근사값뿐 — 네이티브 토큰 수·추론 지표가 아니다(원칙 IV).
 */

import type { EnvironmentResolution } from "../config/types";
import type { Character } from "../diary/types";
import type { InferenceLocation, ModuleStatus, SelectionFailure } from "../inference/types";
import type { StorageCheck } from "./storage-check";

/** 진단 정보가 나가는 곳. */
export type Sink = "screen" | "log";

/** 추론 위치 선택 결과. */
export type LocationSelection =
  | { ok: true; location: InferenceLocation }
  | {
      ok: false;
      reason: SelectionFailure;
      requested?: InferenceLocation;
    };

/** 발생한 실패 하나. */
export type Failure = {
  what: string;
  reason: string;
};

/**
 * 프롬프트 미리보기 하나의 결과 (022, contracts/prompt-preview.md).
 *
 * **`{ ok: false }` 갈래에 `text`가 없다** — 빈 문자열도 없다. 실패가 텍스트를 반환하지
 * 않는다는 원칙 I이 이 기능에서 반복되는 자리다. 조립이 실패하면 사유를 담아 정직하게
 * 보여준다(FR-009).
 *
 * `approxChars`는 `text.length`다 — **조립 시점 근사치이며 실측 토큰 수가 아니다**(FR-011).
 * 화면이 그 사실을 라벨로 붙인다.
 */
export type PromptPreview =
  { ok: true; text: string; approxChars: number } | { ok: false; reason: string };

/** 한 캐릭터의 프리셋 id → 미리보기 (022). key는 `SignalPreset.id`. */
export type PromptPreviewSet = Readonly<Record<string, PromptPreview>>;

/** 개발자가 지금 상태를 확인하는 값의 묶음(FR-017). */
export type DiagnosticReport = {
  environment: EnvironmentResolution;
  inferenceLocation: LocationSelection;
  moduleStatus: ModuleStatus;
  /**
   * 파일 저장이 실기기에서 실제로 도는가(002).
   *
   * 이 자리는 상태를 담을 뿐 성능을 담지 않는다 — 소요 시간·크기를 넣지 않는다(원칙 IV).
   */
  storage: StorageCheck;
  /**
   * 캐릭터 → 모델 표시 이름 (014, local·dev 전용).
   *
   * **사용자 화면 금지의 예외다**(헌법 원칙 III "사용자 화면과 진단 경로").
   * 진단 화면이 배포 빌드에서 닿지 않는 것(001 SC-013)이 이 필드의 유일한 방어다 —
   * 여기서만 캐릭터와 모델의 대응이 문자열로 드러난다.
   */
  characterModels: Readonly<Record<Character, string>>;
  /**
   * 캐릭터 × 대표 신호 프리셋별 입력 프롬프트 원본 (022, local·dev 전용).
   *
   * `characterModels`와 같은 성격이다 — 진단 계층이 조립해 문자열로 담고, 화면은
   * `promptPreviews[character][presetId]`만 읽는다. `src/ui/`는 `diary/prompt`도
   * `signals/types`도 직접 import하지 않는다(FR-008, 007·012·014 경계).
   */
  promptPreviews: Readonly<Record<Character, PromptPreviewSet>>;
  failures: Failure[];
};
