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
  /**
   * 대표 장소의 사람이 읽는 이름 (017 FR-008, 장소명 설정이 켜진 경우만).
   *
   * **이미 `known`으로 확정된 문자열만 담는다** — `unknown`/좌표 없음이면
   * 이 필드 자체가 없다. 화면(`entry.placeName`)과 같은 지오코딩 호출
   * 결과에서 나온 값이어야 한다("두 개의 진실" 금지, 원칙 II).
   */
  placeName?: string;
};

/**
 * 저장되고 사용자가 읽는 일기.
 *
 * 계약: specs/017-diary-body-screen/contracts/elapsed-time.md
 *
 * **불변식**:
 *  1. **모델 식별자를 담지 않는다**(FR-013, 원칙 III).
 *  2. **출력 점수·품질 지표는 담지 않는다**(원칙 IV). **완료된 생성 1건의 소요
 *     시간만은 헌법 1.2.0이 사후 1회성 기록으로 허용한다**(017) — 다른
 *     일기·다른 실행과 비교하거나 평균 내는 필드를 만드는 순간 그 경계를 어기는
 *     것이다. 필요하면 별도 저장소에서 한다.
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
  /**
   * 이 일기가 실제로 분석한 사진들 (017 FR-001).
   *
   * `signalsUsed.photos`(그날 수집된 사진 전부)와 다르다 — 이것은 VLM이
   * 실제로 캡션한 것만, 최대 5장(VISION_PHOTO_LIMIT)이다. 옵셔널이며 옛
   * 일기에는 없다.
   */
  photos?: { photoId: string; takenAt: Date; resizedPath: string }[];
  /**
   * 소요 시간 (017, 헌법 1.2.0).
   *
   * **완료된 이 생성 1건의 사실이다.** 다른 일기·다른 실행과 비교하는
   * 필드를 만들지 않는다 — 이 타입에 "평균"·"이전 대비" 같은 필드가 생기는
   * 순간 헌법 1.2.0이 그은 경계(비교·평균·순위 금지)를 어기는 것이다.
   * 옵셔널이며 옛 일기에는 없다.
   */
  timing?: { visionMs?: number; writingMs: number };
  /**
   * 대표 장소 이름 (017 FR-007, 장소명 설정이 켜진 경우만).
   *
   * `SignalValue`와 같은 성격의 구분을 갖는다 — 좌표 자체가 없으면(또는
   * 설정이 꺼져 있으면) 이 필드가 아예 없고, 좌표는 있는데 이름을 못
   * 얻었으면 `{ kind: "unknown" }`, 얻었으면 `{ kind: "known"; value:
   * string }`이다.
   */
  placeName?: { kind: "known"; value: string } | { kind: "unknown" };
};
