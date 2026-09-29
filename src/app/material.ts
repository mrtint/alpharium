/**
 * 쓸 재료 — 「셀 수 있는 재료가 있는가」의 판정 (053, 보드 `1d` ④·`2f`).
 *
 * 계약: specs/053-writing-material/contracts/material.md MAT·DEC·MADE, data-model.md §1·§2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **세 갈래를 뭉개지 않는다**(원칙 V). 한 항목(사진 또는 장소)은 셋 중 하나다.
 *
 * - `some`   — 관측된 수가 1 이상.
 * - `zero`   — 관측된 0. 찾아봤는데 없었다.
 * - `unseen` — 셀 수 없다. 권한이 없거나 읽지 못했거나 모른다. **0이 아니다.**
 *
 * **같은 규칙이 두 곳에 쓰인다.** 쓰기 전에는 화면이 받은 미리보기(`CountHint`)에, 읽을 때는 저장된
 * 신호(`DaySignals`)에 적용한다. 「확인이 뜬 하루」와 「지어낸 하루로 보이는 하루」가 어긋나면 사용자가
 * 본 경고와 읽을 때의 표식이 다른 말을 한다 — 그래서 옮김만 둘이고 판정은 `decideMaterial` 하나다.
 *
 * **순서가 계약이다**: `some` → `zero` → `unseen`. 하나라도 `some`이면 쓴다. 없으면 확인을 묻는데,
 * `zero`가 하나라도 있으면 「기록이 없다」이고 전부 `unseen`이면 「볼 수 없다」다(확인 대화상자의
 * 제목만 가른다, FR-017).
 *
 * **순수하다.** 시각·파일·화면을 모르고 어떤 값도 기록하지 않는다(원칙 IV).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DaySignals, PhotoObservation, PhotoPlaces, SignalValue } from "../signals/types";
import type { CountHint } from "./state";

export type MaterialState = "some" | "zero" | "unseen";

export type MaterialDecision = { kind: "write" } | { kind: "confirm"; because: "zero" | "unseen" };

/** 쓰기 전 — 화면이 받은 개수 요약을 옮긴다 */
export function fromCountHint(hint: CountHint): MaterialState {
  switch (hint.kind) {
    case "known":
      return hint.count >= 1 ? "some" : "zero";
    case "none":
      return "zero";
    case "unknown":
      return "unseen";
  }
}

/** 읽을 때 — 저장된 사진 신호를 옮긴다 */
export function fromPhotoSignal(signal: SignalValue<PhotoObservation>): MaterialState {
  switch (signal.kind) {
    case "known":
      return signal.value.photos.length >= 1 ? "some" : "zero";
    case "none":
      return "zero";
    case "unknown":
      return "unseen";
  }
}

/** 읽을 때 — 저장된 장소 신호를 옮긴다. 장소 수는 사진 좌표에서 온 `visitCount`다 */
export function fromPlaceSignal(signal: SignalValue<PhotoPlaces>): MaterialState {
  switch (signal.kind) {
    case "known":
      return signal.value.trace.visitCount >= 1 ? "some" : "zero";
    case "none":
      return "zero";
    case "unknown":
      return "unseen";
  }
}

/** 두 항목에서 바로 쓸지, 확인을 먼저 물을지 정한다 */
export function decideMaterial(photos: MaterialState, places: MaterialState): MaterialDecision {
  if (photos === "some" || places === "some") return { kind: "write" };
  if (photos === "zero" || places === "zero") return { kind: "confirm", because: "zero" };
  return { kind: "confirm", because: "unseen" };
}

/**
 * 셀 수 있는 항목이 모두 관측된 0인가 — 안내 한 줄 「기록 대신 상상으로…」가 보이는 조건(FR-013·014).
 * 권한 없음(`unseen`)이 하나라도 섞이면 거짓이다.
 */
export function allZero(photos: MaterialState, places: MaterialState): boolean {
  return photos === "zero" && places === "zero";
}

/**
 * 쓰인 때 셀 수 있는 재료가 없었던 하루인가 (「지어낸 하루」, FR-020).
 *
 * **저장하지 않고 읽을 때 계산한다** — 일기 파일 형식을 바꾸지 않는다. 옛 일기·백그라운드에서 쓴
 * 일기도 같은 규칙으로 판정된다.
 */
export function madeUpDay(signals: DaySignals): boolean {
  return (
    decideMaterial(fromPhotoSignal(signals.photos), fromPlaceSignal(signals.places)).kind ===
    "confirm"
  );
}
