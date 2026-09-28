/**
 * 050 — 포털을 쓰는 화면을 그리는 테스트 도우미 (`.test`가 아니다 — 스위트로 세지 않는다).
 *
 * RNR 대화상자·메뉴는 열릴 때 내용을 `@rn-primitives/portal`의 `PortalHost`로 올린다(research R4).
 * 앱에서는 `App.tsx` 루트에 호스트가 하나 있고, 테스트에서는 이 도우미가 화면 옆에 같은 호스트를
 * 그린다 — 포털을 목으로 바꾸지 않고 실제 경로를 검증한다.
 *
 * RNTL 14의 `render`는 Promise다(035) — 반드시 await한다.
 */
import { PortalHost } from "@rn-primitives/portal";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

/** 화면 옆에 포털 호스트를 둔다 — `rerender`에도 이것을 넘겨야 호스트가 사라지지 않는다 */
export function withPortal(ui: ReactElement) {
  return (
    <>
      {ui}
      <PortalHost />
    </>
  );
}

export async function renderWithPortal(ui: ReactElement) {
  return render(withPortal(ui));
}
