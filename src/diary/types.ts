/**
 * 일기의 모양.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/diary.md
 *
 * 헌법 원칙 III — 모델은 캐릭터로만 드러난다. 이 파일 어디에도 모델 식별자가 없다.
 * 헌법 원칙 IV — 측정 장치를 제품에 두지 않는다. 속도·점수 필드가 없다.
 */

import type { DayDate } from "../config/day-boundary";
import type { DaySignals } from "../signals/types";

/**
 * 사용자가 고른 글 쓰는 성격. **모델이 아니다**(헌법 원칙 III).
 *
 * 헌법 「로스터」의 다섯 자리를 가리킨다. **아래 식별자는 자리표시일 뿐 최종 이름이
 * 아니다** — 헌법이 "캐릭터 이름은 사람이 짓는다"고 했으므로 이 기능은 자리만 두고
 * 표시 이름을 짓지 않는다(research.md §5).
 *
 * **금지**(FR-008):
 *  - 캐릭터를 모델 파일명·모델 식별자와 잇지 않는다
 *  - 파라미터 수·양자화 방식을 어디에도 담지 않는다
 *  - 캐릭터→모델 매핑 테이블을 이 기능에서 만들지 않는다
 */
export type Character = "quiet" | "narrative" | "imaginative" | "chinese" | "english";

/** 캐릭터 자리 전체. 순회와 검증에 쓴다. */
export const CHARACTERS: readonly Character[] = [
  "quiet",
  "narrative",
  "imaginative",
  "chinese",
  "english",
] as const;

/**
 * 사진을 어떻게 다룰지. **캐릭터가 아니라 설정이다**(헌법 「사진과 시각 처리」).
 *
 * 사용자에게 시각 인코더를 고르게 하지 않는다(FR-009). 아래 셋으로만 제시한다.
 */
export type VisionSetting = "none" | "quick" | "detailed";

/** 시각 설정 전체. 순회와 검증에 쓴다. */
export const VISION_SETTINGS: readonly VisionSetting[] = ["none", "quick", "detailed"] as const;

/**
 * 추론 어댑터가 받는 입력.
 *
 * **모델 식별자를 담지 않는다**(FR-008). 어느 모델이 도는지는 요청이 알 바가 아니다 —
 * 001에서 일기 생성 코드가 추론 위치를 모르게 한 것과 같은 구조다.
 *
 * 신호가 비어도 요청은 만들어진다(FR-005b). 신호의 양으로 거부하지 않는다(FR-005a).
 */
export type DiaryRequest = {
  signals: DaySignals;
  character: Character;
  vision: VisionSetting;
  /**
   * 이 하루가 아직 끝나지 않았는가 (012, 헌법 원칙 II "하루의 끝").
   *
   * **`buildRequest()`가 `pipeline.ts`의 `isDayClosed(day, now)`를 재사용해 채운다**
   * (research.md §8) — `buildPrompt()`는 여전히 `now`를 읽지 않고 결정적이다.
   * 오늘인지 여부는 이미 계산된 값으로 전달받을 뿐이다.
   */
  dayStillOpen: boolean;
};

/**
 * 저장되고 사용자가 읽는 일기.
 *
 * **불변식**:
 *  1. **모델 식별자를 담지 않는다**(FR-013, 원칙 III).
 *  2. **추론 속도·출력 점수·품질 지표를 담지 않는다**(원칙 IV). 이 타입이 원칙 IV를
 *     어기기 가장 쉬운 자리다 — "생성에 몇 초 걸렸는지" 정도는 무해해 보이지만, 그것이
 *     모델 비교의 시작점이 된다. 필요하면 별도 저장소에서 한다.
 *  3. **실패는 DiaryEntry가 되지 않는다**(FR-012). 빈 본문이나 플레이스홀더 텍스트로
 *     일기를 만들지 않는다.
 *  4. `signalsUsed`가 있어야 "이 일기가 무엇을 보고 쓰였나"를 되짚을 수 있다(FR-011).
 */
export type DiaryEntry = {
  date: DayDate;
  text: string;
  /**
   * 일기 제목 (014, 옵셔널).
   *
   * **판정을 통과한 전체 텍스트에서 사후 분리된 것**이지, 별도로 생성되거나
   * 검증되지 않는다 — `src/diary/title.ts`의 `extractTitle()` 참조.
   *
   * **옵셔널이어야 한다.** 이 필드 이전에 저장된 파일에는 이 키가 없고, 모델이
   * 제목 형식을 지키지 않아도 일기는 거부되지 않는다(제목 없이 저장된다).
   */
  title?: string;
  character: Character;
  signalsUsed: DaySignals;
  createdAt: Date;
};
