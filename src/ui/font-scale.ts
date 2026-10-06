/**
 * 큰 숫자가 글꼴 배율을 따라 자라게 한다 (홈의 큰 날짜·사진 수·장소 수).
 *
 * 안드로이드 14+는 글꼴 배율을 비선형으로 적용해 큰 글자(약 50sp 넘는 것)는 거의 안 키운다 — 62·48 숫자만 제자리에 있고 옆의 요일·상태 줄·
 * 라벨은 자라서 한 묶음이 어긋났다. 큰 숫자는 `allowFontScaling={false}` + 크기에 배율을 직접 곱해(선형) 같이 움직이게 한다.
 */

import { useWindowDimensions } from "react-native";

/** 지금의 글꼴 배율. 값이 없거나 0 이하면 1 */
export function useFontScale(): number {
  const { fontScale } = useWindowDimensions();
  return fontScale > 0 ? fontScale : 1;
}
