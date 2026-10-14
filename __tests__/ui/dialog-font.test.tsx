/**
 * 083 코드 리뷰 — 대화상자 제목·설명도 Pretendard다 (FR-001·FR-008).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `@rn-primitives`의 대화상자 `Title`·`Description`은 `asChild` 없이 쓰면 라이브러리 안에서 RN `Text`를 직접 그린다 — 저장소 소스를
 * 세는 F2(`font-rules.test.ts`)로는 보이지 않는 넷째 통로였다. 처음 구현은 이 길을 놓쳐 대화상자 제목·설명이 두 플랫폼 모두 시스템
 * 서체로 남았다(안드로이드 고치기 전·후 「날짜로 이동」 제목 캡처가 바이트까지 같았다). 그려진 글자의 스타일을 직접 본다.
 * ⚠️ RNTL 14의 `render`는 Promise다 — await한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import {
  ConfirmDialog,
  DialogCancelButton,
  DismissibleDialog,
} from "../../src/ui/components/Dialog";
import { FONT } from "../../src/ui/theme/tokens";
import { renderWithPortal } from "./render-with-portal";

jest.setTimeout(30000);

const fontOf = (text: string) =>
  (StyleSheet.flatten(screen.getByText(text).props.style) as { fontFamily?: string }).fontFamily;

describe("대화상자 제목·설명의 서체", () => {
  it("ConfirmDialog — 제목과 설명이 FONT.family", async () => {
    await renderWithPortal(
      <ConfirmDialog
        actions={<DialogCancelButton onPress={jest.fn()}>닫기</DialogCancelButton>}
        description="설명 줄"
        open
        testID="t-confirm"
        title="확인 제목"
      />,
    );
    expect(fontOf("확인 제목")).toBe(FONT.family);
    expect(fontOf("설명 줄")).toBe(FONT.family);
  });

  it("DismissibleDialog — 제목이 FONT.family", async () => {
    await renderWithPortal(
      <DismissibleDialog onClose={jest.fn()} open testID="t-dismiss" title="닫는 제목" />,
    );
    expect(fontOf("닫는 제목")).toBe(FONT.family);
  });
});
