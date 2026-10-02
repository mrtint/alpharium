/**
 * 설정·개발자 겹이 함께 쓰는 토스트 한 줄의 수명 (059, research R11).
 *
 * 토스트는 **한 번에 하나**다 — 새 문구가 이전 타이머를 지우고 `key`를 올려 `DeveloperToast`가 새로 마운트되게 한다(049 교훈: 시작값을
 * 마운트 값으로 준다). 수명은 `TOAST_SHOW_MS`(2초)다. `AppFrame`이 한 자리에서 들고 설정(버전 탭)·개발자(「이미 모두 준비돼 있어요」)가 같은 토스트를 쓴다.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { TOAST_SHOW_MS } from "./DeveloperToast";

export type ToastState = { key: number; text: string; sub?: string };

export function useToastLine(): {
  toast: ToastState | null;
  show: (text: string, sub?: string) => void;
  dismiss: () => void;
} {
  const [toast, setToast] = useState<ToastState | null>(null);
  const key = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback((text: string, sub?: string) => {
    if (timer.current !== null) clearTimeout(timer.current);
    key.current += 1;
    setToast({ key: key.current, text, ...(sub !== undefined ? { sub } : {}) });
    timer.current = setTimeout(() => setToast(null), TOAST_SHOW_MS);
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  return { toast, show, dismiss };
}
