/**
 * 설정 「버전」 행의 연속 탭 → 토스트·켜짐 강조 (059 FR-001~FR-006, research R12).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md DV2·DV12
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 판정은 `registerTap`(순수)이고 이 훅은 **그 결과를 화면에 옮길 뿐**이다 — 토스트는 부르는 쪽이 준 `showToast`로 보이고(토스트 한 줄은
 * `AppFrame`이 한 자리에서 든다, `use-toast-line.ts`), 켜진 순간의 강조(1.5초)만 이 훅이 든다. 탭 상태는 `useRef`다(저장하지 않는다 — 훅을 든
 * 설정 겹이 닫히면 언마운트되어 비워진다, Edge Case). `Date.now()`는 이벤트 핸들러 안에서만 부른다(렌더 중 부르지 않는다 — React Compiler).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { INITIAL_TAP_STATE, registerTap, type TapState } from "../app/developer-taps";
import { DEVELOPER_TEXT } from "./developer-text";

/** 「개발자」 행의 켜짐 강조 수명(ms). 보드 `6d` ① 「1.5초 뒤 사라짐」 */
export const HIGHLIGHT_MS = 1500;

export function useDeveloperTaps({
  alreadyOn,
  onEnable,
  showToast,
}: {
  alreadyOn: boolean;
  onEnable: () => void;
  showToast: (text: string, sub?: string) => void;
}): { onPressVersion: () => void; highlight: boolean } {
  const tapState = useRef<TapState>(INITIAL_TAP_STATE);
  const [highlight, setHighlight] = useState(false);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (highlightTimer.current !== null) clearTimeout(highlightTimer.current);
    },
    [],
  );

  const onPressVersion = useCallback(() => {
    const result = registerTap(tapState.current, Date.now(), alreadyOn);
    tapState.current = result.state;
    switch (result.effect.kind) {
      case "none":
        return;
      case "tapsLeft":
        showToast(DEVELOPER_TEXT.tapsLeft(result.effect.n));
        return;
      case "already-on":
        showToast(DEVELOPER_TEXT.already);
        return;
      case "enabled":
        onEnable();
        showToast(DEVELOPER_TEXT.enabled, DEVELOPER_TEXT.enabledSub);
        if (highlightTimer.current !== null) clearTimeout(highlightTimer.current);
        setHighlight(true);
        highlightTimer.current = setTimeout(() => setHighlight(false), HIGHLIGHT_MS);
        return;
    }
  }, [alreadyOn, onEnable, showToast]);

  return { onPressVersion, highlight };
}
