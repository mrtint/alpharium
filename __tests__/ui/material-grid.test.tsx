/**
 * 053 US1 — 쓸 재료 두 칸 (contracts/material.md GRID1~3·6~8, SRC1·SRC3·SRC4).
 *
 * **「없음」·「모름」·「셀 수 있음」은 서로 다른 글자다**(원칙 V) — 관측된 0은 회색 `0`, 셀 수 없음은
 * 「모름」이고 0으로 채우지 않는다. 색·간격은 인라인 style 검사로, 움직임 없는 화면이라 육안은
 * 실기기(quickstart D1·D2)가 맡는다.
 *
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise를 반환한다 — `await`한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react-native";
import { Dimensions, StyleSheet } from "react-native";

import type { DayPreview } from "../../src/app/state";
import { MaterialGrid } from "../../src/ui/MaterialGrid";
import { COLORS, MATERIAL_GRID } from "../../src/ui/theme/tokens";

const DAY = "2026-09-23";

const preview = (
  photos: DayPreview["photos"],
  places: DayPreview["places"],
  photoAccess: DayPreview["photoAccess"] = "ok",
): DayPreview => ({ day: DAY, photos, places, photoAccess });

const styleOf = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

describe("053 GRID — 두 칸", () => {
  it("GRID1 — 사진 3·장소 2 → 「사진」 3 장, 「장소」 2 곳. 「쓸 수 있는 때」 칸이 없다", async () => {
    await render(
      <MaterialGrid preview={preview({ kind: "known", count: 3 }, { kind: "known", count: 2 })} />,
    );

    expect(screen.getByText("사진")).toBeTruthy();
    expect(screen.getByText("장소")).toBeTruthy();
    expect(screen.getByTestId("signal-photos")).toHaveTextContent("3장");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("2곳");
    expect(screen.queryByTestId("signal-window")).toBeNull();
    expect(screen.queryByText("쓸 수 있는 때")).toBeNull();
    expect(screen.queryByText("다닌 자리")).toBeNull();
  });

  it("GRID2 — 칸 사이 세로 구분선이 없다 (격자 아래 1px만)", async () => {
    await render(
      <MaterialGrid preview={preview({ kind: "known", count: 3 }, { kind: "known", count: 2 })} />,
    );

    for (const id of ["signal-photos-cell", "signal-places-cell"]) {
      const style = styleOf(id);
      expect(style.borderRightWidth ?? 0).toBe(0);
      expect(style.borderLeftWidth ?? 0).toBe(0);
    }
    expect(styleOf("signal-row").borderBottomWidth).toBe(1);
  });

  it("GRID3 — 관측된 0은 숫자에만 보조색이다 (단위는 본색)", async () => {
    await render(<MaterialGrid preview={preview({ kind: "none" }, { kind: "none" })} />);

    expect(screen.getByTestId("signal-photos-number")).toHaveTextContent("0");
    expect(styleOf("signal-photos-number").color).toBe(COLORS.textMuted);
    expect(styleOf("signal-photos-unit").color).not.toBe(COLORS.textMuted);
    expect(styleOf("signal-places-number").color).toBe(COLORS.textMuted);
  });

  it("GRID3 — 양수는 보조색이 아니다", async () => {
    await render(
      <MaterialGrid preview={preview({ kind: "known", count: 3 }, { kind: "known", count: 2 })} />,
    );

    expect(styleOf("signal-photos-number").color).toBe(COLORS.text);
  });

  it("★ GRID3 — 「모름」은 0으로 채워지지 않는다 (원칙 V)", async () => {
    await render(
      <MaterialGrid preview={preview({ kind: "known", count: 3 }, { kind: "unknown" })} />,
    );

    expect(screen.getByTestId("signal-places")).toHaveTextContent("모름");
    expect(screen.getByTestId("signal-places")).not.toHaveTextContent(/0/);
  });

  it("GRID6 — 안내 한 줄은 사진 0·장소 0일 때만 보인다", async () => {
    await render(<MaterialGrid preview={preview({ kind: "none" }, { kind: "none" })} />);
    expect(screen.getByTestId("material-empty-note")).toHaveTextContent(
      "기록 대신 상상으로 하루를 채워요.",
    );
  });

  it("GRID6 — 사진이 있으면 안내 한 줄이 없다", async () => {
    await render(<MaterialGrid preview={preview({ kind: "known", count: 3 }, { kind: "none" })} />);
    expect(screen.queryByTestId("material-empty-note")).toBeNull();
  });

  it("GRID6 — 셀 수 없음(모름)이 섞이면 안내 한 줄이 없다", async () => {
    await render(<MaterialGrid preview={preview({ kind: "none" }, { kind: "unknown" })} />);
    expect(screen.queryByTestId("material-empty-note")).toBeNull();
  });

  it("GRID7 — 읽는 중이면 「…」, 미리보기가 없으면(통로 없음) 「모름」", async () => {
    await render(<MaterialGrid preview={{ kind: "loading", day: DAY }} />);
    expect(screen.getByTestId("signal-photos")).toHaveTextContent("…");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("…");
    expect(screen.queryByTestId("material-empty-note")).toBeNull();
  });

  it("GRID7 — 통로가 없으면 두 칸 모두 「모름」", async () => {
    await render(<MaterialGrid preview={undefined} />);
    expect(screen.getByTestId("signal-photos")).toHaveTextContent("모름");
    expect(screen.getByTestId("signal-places")).toHaveTextContent("모름");
  });

  it("GRID8 — 숫자 48/800, 단위 15/700, 라벨 13/600, 안내 14", async () => {
    await render(<MaterialGrid preview={preview({ kind: "none" }, { kind: "none" })} />);

    const number = styleOf("signal-photos-number");
    // 큰 숫자는 글꼴 배율을 선형으로 곱한다(안드로이드의 비선형 배율은 큰 글자를 안 키운다 — `font-scale.ts`)
    const scale = Dimensions.get("window").fontScale || 1;
    expect(number.fontSize).toBeCloseTo(MATERIAL_GRID.number.fontSize * scale, 5);
    expect(number.lineHeight).toBeCloseTo(MATERIAL_GRID.number.lineHeight * scale, 5);
    expect(screen.getByTestId("signal-photos-number").props.allowFontScaling).toBe(false);
    expect(number.fontWeight).toBe("800");
    expect(styleOf("signal-photos-unit").fontSize).toBe(MATERIAL_GRID.unitSize);
    expect(styleOf("signal-photos-unit").fontWeight).toBe("700");
    expect(styleOf("signal-photos-label").fontSize).toBe(MATERIAL_GRID.labelSize);
    expect(styleOf("signal-photos-label").fontWeight).toBe("600");
    expect(styleOf("material-empty-note").fontSize).toBe(MATERIAL_GRID.note.fontSize);
  });
});

describe("053 SRC — 소스 계약", () => {
  const read = (file: string) =>
    readFileSync(join(__dirname, "../../src/ui", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  // 두 화면 부품(두 칸, 두 확인 대화상자)이 같은 경계를 지킨다.
  const FILES = ["MaterialGrid.tsx", "MaterialDialogs.tsx"];

  it.each(FILES)("SRC1 — %s는 신호 원형·expo를 모른다", (file) => {
    const code = read(file);
    expect(code).not.toMatch(/DaySignals/);
    expect(code).not.toMatch(/from\s+["']expo-/);
    expect(code).not.toMatch(/signals\/(?!types)/);
  });

  it.each(FILES)("SRC3 — %s 소스에 문구 글자가 없다 (home-text.ts에서만 온다)", (file) => {
    const code = read(file);
    for (const literal of [
      "권한이 없어요",
      "기록 대신",
      "기록을 볼 수",
      "아무 기록",
      "설정에서",
      "설정 열기",
      "사진",
      "장소",
    ]) {
      expect(code).not.toContain(literal);
    }
  });

  it.each(FILES)("SRC4 — %s에 색 리터럴이 없다", (file) => {
    expect(read(file)).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
