/**
 * 사진을 어떻게 다룰지 고르는 자리.
 *
 * 계약: specs/011-photo-vision-summary/spec.md FR-015·016·019·019a·020
 *       specs/032-nativewind-ui-system/contracts/screen-migration.md SM5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **헌법 「사진과 시각 처리」가 이 화면의 모양을 이미 정했다.**
 *
 * - 사진 이해 방식은 **캐릭터가 아니라 설정**이다(MUST)
 * - 사용자가 **시각 인코더를 고르게 하지 않는다**(MUST NOT)
 * - 「사진을 보지 않음 / 빠르게 봄 / 자세히 봄」 정도로 제시한다
 *
 * 그래서 이 자리에 **모델 이름·파일·크기·토큰 수가 하나도 없다**(FR-016, SC-004).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **설명은 결과의 차이로 쓴다**(FR-019a). 「256토큰 대 1024토큰」이 아니라 「무엇이
 * 달라지는가」다.
 *
 * **032 — `SelectRow` 재사용으로 이관.** 옵션별 `testID`(`vision-<x>`)는
 * `optionTestID`로 유지한다(Maestro·기존 테스트 불변, SM5).
 */

import { SelectRow } from "./components/SelectRow";
import type { VisionPreference } from "../app/vision-setting-store";

/** 029 — "자동"이 앞에 온다. 나머지 셋은 011의 VISION_SETTINGS 순서. */
const OPTIONS: readonly VisionPreference[] = ["auto", "none", "quick", "detailed"];

export type VisionPickerProps = {
  /** 지금 고른 것. **기본값은 "auto"다**(029 FR-024) */
  selected: VisionPreference;
  onSelect: (vision: VisionPreference) => void;
};

/**
 * 사람이 읽을 이름과 설명.
 *
 * **설명이 「무엇이 달라지는가」로 쓰였다**(FR-019a). `detailed`의 「오래 걸린다」가
 * FR-020이다 — **고르기 전에** 알린다. **초·백분율·배수를 쓰지 않는다**(원칙 IV).
 */
const LABELS: Readonly<Record<VisionPreference, { name: string; hint: string }>> = {
  auto: { name: "자동", hint: "그날 사진이 있으면 빠르게 보고, 없으면 보지 않는다" },
  none: { name: "사진을 보지 않음", hint: "사진이 몇 장 있었는지만 안다. 가장 빠르다" },
  quick: { name: "빠르게 봄", hint: "사진에 무엇이 담겼는지 훑어본다" },
  detailed: { name: "자세히 봄", hint: "사진을 더 꼼꼼히 본다. 그만큼 오래 걸린다" },
};

export function VisionPicker({ selected, onSelect }: VisionPickerProps) {
  return (
    <SelectRow
      label="사진을 어떻게 볼까"
      options={OPTIONS.map((s) => ({ label: LABELS[s].name, hint: LABELS[s].hint }))}
      selectedIndex={OPTIONS.indexOf(selected)}
      onSelect={(index) => onSelect(OPTIONS[index])}
      // **설정마다 따로 준다** — RN은 접근성 트리가 평탄화돼 Maestro의 `childOf`가
      // 통하지 않는다(008 실측). `testID`는 release에서 살아남는다.
      optionTestID={(index) => `vision-${OPTIONS[index]}`}
    />
  );
}
