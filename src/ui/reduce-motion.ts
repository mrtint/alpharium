/**
 * OS 「동작 줄이기」(안드로이드 「애니메이션 제거」, iOS 「동작 줄이기」)가 켜져 있는지 (100).
 *
 * reanimated와 RN `Modal`은 시작할 때 읽은 OS 값을 따라 움직임을 줄이지만, **자동으로 넘어가는 것**(내려받기 슬라이드의 `autoplay`)은
 * 라이브러리가 이 값을 보지 않아 앱이 직접 읽어 멈춰야 한다(안드로이드 실측: 켜도 약 4.06초마다 넘어갔다).
 *
 * 읽기 전에는 모른다(`undefined`) — 모르는 것을 기본값으로 채우지 않는다(원칙 V). 읽지 못하면 켜지 않은 것으로 본다(종전 동작).
 * 앱이 켜진 채 OS 설정이 바뀌면 알림을 받아 따라간다. `isReduceMotionEnabled()`가 끝내 끝나지 않으면 값을 모르는 채로 남고 자동 넘김은
 * 돌지 않는다 — 접근성 쪽으로 안전한 방향의 실패다(현재 플랫폼은 끝낸다).
 */

import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReduceMotion(): boolean | undefined {
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    // 알림이 먼저 오면 늦게 도착한 처음 읽은 값이 그것을 덮어쓰지 않는다
    let notified = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive && !notified) setEnabled(value);
      })
      .catch(() => {
        if (alive && !notified) setEnabled(false);
      });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      notified = true;
      setEnabled(value);
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
