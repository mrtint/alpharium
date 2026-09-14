/**
 * 생성 파라미터 자동 판정 — **순수 함수** (029).
 *
 * 계약: specs/029-writing-flow-simplification/contracts/resolve-generation.md
 *       spec.md FR-007·FR-008·FR-008a·FR-009·FR-010·FR-011·FR-012·FR-014
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ FR-007이 요구하는 "배선 계층에서 계산 — 화면 아님"이 여기서 성립한다.**
 *
 * 007~018이 홈 화면에 캐릭터·하루·사진 설정·장소명 위젯을 하나씩 쌓았다. 029가
 * 그것을 걷어내고, "일기 쓰기" 한 번 탭에 필요한 네 값을 이 함수가 정한다.
 *
 * **순수 함수만 둔다.** `new Date()`를 부르지 않고(`chosenDay`를 인자로 받는다),
 * 신호 타입을 import하지 않으며(`photoSignalPresent: boolean`만 받는다), 로스터를
 * import하지 않는다(`Character` 타입만). 007 `selection.ts`, 022 `SIGNAL_PRESETS`와
 * 같은 격리다.
 *
 * **캐릭터 폴백은 007 `resolveSelection()`을 재사용한다**(FR-014). 후보를 만들고
 * 그것이 준비돼 있지 않으면 `resolveSelection`이 옮길 곳을 정한다 — 새 폴백 규칙을
 * 만들지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DayDate } from "../config/day-boundary";
import type { Character } from "../diary/types";

import { resolveSelection } from "./selection";

/** 설정 탭 "장소명"이 돌려주는 값 (contracts/settings-sections.md S3). */
export type GeocodingPreference = "auto" | "on" | "off";

export type ResolveInput = {
  /** selected-character.json 로드값. 로스터 밖·파일 없음이면 null (FR-008). */
  lastCharacter: Character | null;
  /** 사람이 못 박은 고정값 "quiet" (FR-018). 호출자가 essential-assets.ts에서 넘김. */
  onboardingDefault: Character;
  /** 003 readiness가 ready/verified인 캐릭터들 (FR-014). */
  readyCharacters: readonly Character[];
  /** 설정 탭 "일기 작성자" 고정. 없으면 null (FR-012). */
  fixedAuthor: Character | null;
  /** 홈 날짜 셀렉트의 재판정된 값 (FR-009). 재판정은 호출 전에 009가 함. */
  chosenDay: DayDate;
  /** 그 날 사진 신호가 1장 이상인가 (FR-010). 호출자가 신호에서 계산 — 임계값 없음. */
  photoSignalPresent: boolean;
  /** 위치 런타임 권한이 부여됐는가 (FR-011). */
  locationPermission: boolean;
  /** 설정 탭 "장소명" (FR-012·025). */
  geocodingPreference: GeocodingPreference;
};

export type ResolvedParams = {
  character: Character;
  day: DayDate;
  /**
   * 이 하루에 사진이 있는가 (042 FR-012a).
   *
   * **입력 `photoSignalPresent`와 이름이 다른 까닭**: 저것은 배선이 신호에서 계산해
   * 넣는 **입력**이고, 이것은 판정이 내놓는 **결론**이다. 같은 이름이면 「입력을 그대로
   * 통과시킨 것」과 「판정한 것」이 구분되지 않는다 — 지금 값이 같은 것은 R5가 단순해서지
   * 같아야 해서가 아니다.
   *
   * **화면은 이 값으로 018의 두 준비 갈래를 가른다.** 신호를 화면에 따로 내려보내지
   * 않는다(029 경계 유지, "두 개의 진실" 금지).
   */
  hasPhotos: boolean;
  geocodingEnabled: boolean;
  /** 캐릭터가 준비를 잃어 옮겨졌으면 (FR-014). 화면이 알린다. */
  movedFrom?: Character;
};

export type ResolveOutcome =
  { kind: "resolved"; params: ResolvedParams } | { kind: "no-ready-character" };

/**
 * "일기 쓰기"가 눌렸을 때 생성에 넘길 네 값을 정한다.
 *
 * **저장하지 않는다.** `prompt.ts`로 넘어가기 직전의 계산 결과다.
 */
export function resolveGenerationParams(input: ResolveInput): ResolveOutcome {
  // ── 캐릭터 (R1~R3) ──────────────────────────────────────────────────────
  // R1: 고정값이 있고 준비돼 있으면 그대로.
  // R2·R3: 고정값이 없거나 미준비면 후보 = fixedAuthor ?? lastCharacter ??
  //        onboardingDefault. 그 후보를 resolveSelection에 넘겨 옮길 곳을 정한다.
  const candidate =
    input.fixedAuthor !== null && input.readyCharacters.includes(input.fixedAuthor)
      ? input.fixedAuthor
      : (input.lastCharacter ?? input.onboardingDefault);

  const selection = resolveSelection(candidate, input.readyCharacters);
  if (selection.kind === "none") {
    return { kind: "no-ready-character" };
  }

  // ── 사진 유무 (R5, 042에서 개정) ────────────────────────────────────────
  //
  // **설정을 보지 않는다.** 헌법 v1.7.0이 「사용자가 끄는 경로를 두지 않는다(MUST NOT)」
  // 로 못 박아 고를 것이 사라졌다. 남는 것은 **그 하루에 사진이 있는가** 하나이며,
  // 그것은 018의 두 준비 갈래를 가르는 데 쓰인다(화면이 이 값으로 가른다).
  //
  // **임계값 없음**(원칙 V) — `photoSignalPresent`는 boolean 하나다.
  //
  // ⚠️ 이 값은 「캡션을 돌릴까」를 정하지 **않는다.** 그 판정은 파이프라인이 실제
  // 신호를 읽어서 한다(011) — 여기 값은 화면의 미리 읽기 갈래용 근사치다.
  const hasPhotos = input.photoSignalPresent;

  // ── 장소명 (R6) ────────────────────────────────────────────────────────
  const geocodingEnabled =
    input.geocodingPreference === "on"
      ? true
      : input.geocodingPreference === "off"
        ? false
        : input.locationPermission;

  return {
    kind: "resolved",
    params: {
      character: selection.character,
      // R4: 하루는 인자로 받은 것 그대로 — 이 함수는 재계산하지 않는다.
      day: input.chosenDay,
      hasPhotos,
      geocodingEnabled,
      ...(selection.movedFrom !== undefined ? { movedFrom: selection.movedFrom } : {}),
    },
  };
}
