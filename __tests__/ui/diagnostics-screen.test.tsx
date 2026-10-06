/**
 * 060 — 진단 화면 (보드 `6h`, 계약 DS1~DS11).
 *
 * 화면은 판정하지 않는다 — 값(문자열·태그)과 핸들러를 넘겨받은 그대로 그린다. 값을 만드는 일은 `__tests__/app/diagnostics-view.test.ts`,
 * 기록은 `write-failures.test.ts`가 잠근다. 이 파일의 앞부분은 그리기, 뒷부분은 소스 계약이다.
 * ⚠️ RNTL 14의 `render`·`fireEvent`는 Promise다 — await한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { DiagnosticsScreen, type DiagnosticsScreenProps } from "../../src/ui/DiagnosticsScreen";
import { collectPromptPreviews, SIGNAL_PRESETS } from "../../src/diagnostics/prompt-preview";
import type { ProbeCell } from "../../src/app/diagnostics-view";
import { COLORS, SETTINGS } from "../../src/ui/theme/tokens";

jest.setTimeout(30000);

const flat = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

const CELLS: ProbeCell[] = [
  { axis: "photos", kind: "number", text: "3장" },
  { axis: "places", kind: "none", text: "없음" },
  { axis: "steps", kind: "unknown", text: "모름" },
  { axis: "battery", kind: "unknown", text: "모름" },
  { axis: "network", kind: "unknown", text: "모름" },
];

function props(over: Partial<DiagnosticsScreenProps> = {}): DiagnosticsScreenProps {
  return {
    environment: { build: "DEV · 1.0.0 (24)", device: "Android 16", inference: "기기 · CPU" },
    storage: "",
    onInspectStorage: jest.fn(),
    photo: { read: "partial", location: "denied", scope: "selected" },
    canRequestPhoto: false,
    onRequestPhoto: jest.fn(),
    probe: CELLS,
    onRefreshProbe: jest.fn(),
    previews: collectPromptPreviews()["quiet"],
    onTryOnce: jest.fn(),
    onRunAuto: jest.fn(),
    autoRunning: false,
    autoResult: null,
    failures: [],
    ...over,
  };
}

const GROUP_IDS = [
  "diagnostics-group-env",
  "diagnostics-group-storage",
  "diagnostics-group-photo",
  "diagnostics-group-probe",
  "diagnostics-group-prompt",
  "diagnostics-group-gen",
  "diagnostics-group-failures",
];

describe("DS1 — 일곱 묶음이 보드 순서로 있다", () => {
  it("환경 → 저장 점검 → 사진 권한 → 신호 프로브 · 오늘 → 입력 프롬프트 미리보기 → 생성 → 최근 실패", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    const tree = JSON.stringify(screen.toJSON());
    const order = GROUP_IDS.map((id) => tree.indexOf(`"testID":"${id}"`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const label of [
      "환경",
      "저장 점검",
      "사진 권한",
      "신호 프로브 · 오늘",
      "입력 프롬프트 미리보기",
      "생성",
      "최근 실패",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});

describe("DS2 — 환경과 저장 점검", () => {
  it("빌드·기기·추론 위치 값이 보인다", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    expect(
      within(screen.getByTestId("diagnostics-build")).getByText("DEV · 1.0.0 (24)"),
    ).toBeTruthy();
    expect(within(screen.getByTestId("diagnostics-device")).getByText("Android 16")).toBeTruthy();
    expect(
      within(screen.getByTestId("diagnostics-inference")).getByText("기기 · CPU"),
    ).toBeTruthy();
  });

  it("062 FR-011b — 환경 묶음에 언어 줄(감지한 것 → 고른 것)이 보인다", async () => {
    await render(<DiagnosticsScreen {...props({ language: "en-US → 한국어" })} />);
    const row = within(screen.getByTestId("diagnostics-group-env")).getByTestId(
      "diagnostics-language",
    );
    expect(within(row).getByText("언어")).toBeTruthy();
    expect(within(row).getByText("en-US → 한국어")).toBeTruthy();
  });

  it("아직 읽지 못했거나 기기 값이 null이면 값을 비운다", async () => {
    await render(
      <DiagnosticsScreen
        {...props({ environment: { build: "DEV", device: null, inference: "기기 · CPU" } })}
      />,
    );
    expect(within(screen.getByTestId("diagnostics-device")).queryByText(/Android/)).toBeNull();
  });

  it("저장 점검 행을 누르면 onInspectStorage가 불리고 값이 보인다 — 점검 전엔 비어 있다", async () => {
    const onInspectStorage = jest.fn();
    const { rerender } = await render(<DiagnosticsScreen {...props({ onInspectStorage })} />);
    expect(within(screen.getByTestId("diagnostics-storage-value")).queryByText(/편/)).toBeNull();
    await fireEvent.press(screen.getByTestId("diagnostics-storage"));
    expect(onInspectStorage).toHaveBeenCalledTimes(1);
    await rerender(
      <DiagnosticsScreen {...props({ onInspectStorage, storage: "41편 · 2편 읽기 실패" })} />,
    );
    expect(
      within(screen.getByTestId("diagnostics-storage-value")).getByText("41편 · 2편 읽기 실패"),
    ).toBeTruthy();
  });
});

describe("DS3 — 사진 권한 셋", () => {
  it("읽기·위치 정보·범위가 따로 보인다", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    expect(screen.getByTestId("diagnostics-photo-read-tag")).toBeTruthy();
    expect(
      within(screen.getByTestId("diagnostics-photo-read")).getByText("일부 허용"),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("diagnostics-photo-location")).getByText("허용 안 함"),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("diagnostics-photo-scope")).getByText("선택한 사진만"),
    ).toBeTruthy();
  });

  it("값이 null이면 꼬리표·범위 글자가 없다", async () => {
    await render(
      <DiagnosticsScreen {...props({ photo: { read: null, location: null, scope: null } })} />,
    );
    expect(screen.queryByTestId("diagnostics-photo-read-tag")).toBeNull();
    expect(screen.queryByTestId("diagnostics-photo-location-tag")).toBeNull();
    expect(
      within(screen.getByTestId("diagnostics-photo-scope")).queryByText(/전체|선택/),
    ).toBeNull();
  });

  it("요청 가능 상태에서만 onRequestPhoto를 호출한다 — 아닐 땐 콜백 자체를 넘기지 않는다", async () => {
    const onRequestPhoto = jest.fn();
    const { rerender } = await render(
      <DiagnosticsScreen {...props({ canRequestPhoto: false, onRequestPhoto })} />,
    );
    await fireEvent.press(screen.getByTestId("diagnostics-photo-read"));
    expect(onRequestPhoto).not.toHaveBeenCalled();

    await rerender(<DiagnosticsScreen {...props({ canRequestPhoto: true, onRequestPhoto })} />);
    await fireEvent.press(screen.getByTestId("diagnostics-photo-read"));
    expect(onRequestPhoto).toHaveBeenCalledTimes(1);
  });
});

describe("DS4 — 신호 프로브 다섯 칸", () => {
  it("다섯 칸이 항상 있고 값이 맞다", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    for (const axis of ["photos", "places", "steps", "battery", "network"]) {
      expect(screen.getByTestId(`diagnostics-probe-${axis}`)).toBeTruthy();
    }
    expect(within(screen.getByTestId("diagnostics-probe-photos")).getByText("3장")).toBeTruthy();
    expect(within(screen.getByTestId("diagnostics-probe-places")).getByText("없음")).toBeTruthy();
    for (const axis of ["steps", "battery", "network"]) {
      expect(
        within(screen.getByTestId(`diagnostics-probe-${axis}`)).getByText("모름"),
      ).toBeTruthy();
    }
  });

  it("읽기 전에도 다섯 칸이 있고 값이 비어 있다 — 「모름」이라고 말하지 않는다", async () => {
    await render(<DiagnosticsScreen {...props({ probe: null })} />);
    for (const axis of ["photos", "places", "steps", "battery", "network"]) {
      expect(screen.getByTestId(`diagnostics-probe-${axis}`)).toBeTruthy();
    }
    expect(screen.queryByText("모름")).toBeNull();
  });

  it("보드 6h ④: 다섯 칸이 한 줄(위 2px·아래 1px 선), 칸마다 왼쪽 1px 선, 모름 칸은 회색 면 + 14/600 회색, 숫자 칸은 면 없이 고정폭 15/700", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    const unknown = flat(screen.getByTestId("diagnostics-probe-steps"));
    expect(unknown.backgroundColor).toBe(SETTINGS.tagFill);
    expect(flat(screen.getByTestId("diagnostics-probe-steps-value")).color).toBe(COLORS.textMuted);

    const known = flat(screen.getByTestId("diagnostics-probe-photos"));
    expect(known.backgroundColor).toBeUndefined();
    expect(known.borderLeftWidth).toBeUndefined(); // 첫 칸은 왼쪽 선이 없다
    expect(unknown.borderLeftWidth).toBe(1);

    const grid = flat(screen.getByTestId("diagnostics-probe-grid"));
    expect(grid.flexDirection).toBe("row");
    expect(grid.flexWrap).toBeUndefined();
    expect(grid.borderTopWidth).toBe(2);
    expect(grid.borderBottomWidth).toBe(1);

    const knownValue = flat(screen.getByTestId("diagnostics-probe-photos-value"));
    expect(knownValue.fontSize).toBe(15);
    expect(knownValue.fontWeight).toBe("700");
    expect(String(knownValue.fontFamily ?? "")).toMatch(/mono|Menlo/i);
    const unknownValue = flat(screen.getByTestId("diagnostics-probe-steps-value"));
    expect(unknownValue.fontSize).toBe(14);
    expect(unknownValue.fontWeight).toBe("600");
  });

  it("「다시 읽기」는 onRefreshProbe를 부른다", async () => {
    const onRefreshProbe = jest.fn();
    await render(<DiagnosticsScreen {...props({ onRefreshProbe })} />);
    await fireEvent.press(screen.getByTestId("diagnostics-probe-refresh"));
    expect(onRefreshProbe).toHaveBeenCalledTimes(1);
  });
});

describe("DS5 — 프롬프트 미리보기", () => {
  it("프리셋 두 토글로 본문이 바뀐다 (기본은 신호 없음)", async () => {
    const previews = collectPromptPreviews()["quiet"];
    await render(<DiagnosticsScreen {...props()} />);
    const empty = previews["empty"];
    const photos = previews["photos"];
    if (!empty?.ok || !photos?.ok) throw new Error("미리보기 조립 실패");

    expect(screen.getByTestId("diagnostics-prompt-text").props.children).toBe(empty.text);
    await fireEvent.press(screen.getByTestId("diagnostics-preset-photos"));
    expect(screen.getByTestId("diagnostics-prompt-text").props.children).toBe(photos.text);
    await fireEvent.press(screen.getByTestId("diagnostics-preset-empty"));
    expect(screen.getByTestId("diagnostics-prompt-text").props.children).toBe(empty.text);
  });

  it("프리셋 id가 진단 계층의 SIGNAL_PRESETS와 같다 (화면이 id를 적어 둔다)", () => {
    expect(SIGNAL_PRESETS.map((p) => p.id).sort()).toEqual(["empty", "photos"]);
  });

  it("본문은 선택만 되고 안쪽 스크롤 상자가 없다 (지면 하나로만 스크롤)", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    expect(screen.getByTestId("diagnostics-prompt-text").props.selectable).toBe(true);
    // 안쪽 ScrollView는 끝에 닿은 손가락을 바깥 지면으로 넘겨 화면 전체가 흐르고 마지막 줄이 잘렸다
    expect(screen.queryByTestId("diagnostics-prompt-scroll")).toBeNull();
    const parts = readFileSync(join(__dirname, "..", "..", "src/ui/DiagnosticsParts.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(parts).not.toMatch(/ScrollView|nestedScrollEnabled/);
  });

  it("크기 줄은 근사치·실측 아님을 밝힌다 (022 PP6)", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    const size = screen.getByTestId("diagnostics-prompt-size");
    expect(JSON.stringify(size.props.children)).toContain("조립 시점 근사치, 실측 토큰 아님");
  });

  it("조립하지 못한 미리보기는 이유만 보이고 본문 자리를 비운다 (원칙 I)", async () => {
    await render(
      <DiagnosticsScreen
        {...props({
          previews: {
            empty: { ok: false, reason: "no-request" },
            photos: { ok: false, reason: "x" },
          },
        })}
      />,
    );
    expect(screen.getByText("조립할 수 없음: no-request")).toBeTruthy();
    expect(screen.queryByTestId("diagnostics-prompt-size")).toBeNull();
    expect(screen.queryByTestId("diagnostics-prompt-scroll")).toBeNull();
  });
});

describe("DS6 — 생성", () => {
  it("「지금 한 번 써 보기」는 onTryOnce를 부른다", async () => {
    const onTryOnce = jest.fn();
    await render(<DiagnosticsScreen {...props({ onTryOnce })} />);
    await fireEvent.press(screen.getByTestId("diagnostics-try-once"));
    expect(onTryOnce).toHaveBeenCalledTimes(1);
  });

  it("「자동 쓰기 지금 실행」은 onRunAuto를 부르고, 도는 동안은 콜백을 넘기지 않아 다시 눌러도 늘지 않는다", async () => {
    const onRunAuto = jest.fn();
    const { rerender } = await render(<DiagnosticsScreen {...props({ onRunAuto })} />);
    await fireEvent.press(screen.getByTestId("diagnostics-run-auto"));
    expect(onRunAuto).toHaveBeenCalledTimes(1);

    await rerender(<DiagnosticsScreen {...props({ onRunAuto, autoRunning: true })} />);
    expect(
      within(screen.getByTestId("diagnostics-auto-result")).getByText("도는 중…"),
    ).toBeTruthy();
    await fireEvent.press(screen.getByTestId("diagnostics-run-auto"));
    expect(onRunAuto).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["ran", "썼음"],
    ["skipped", "건너뜀"],
    ["failed", "실패"],
  ] as const)("결과 %s → 「%s」", async (autoResult, text) => {
    await render(<DiagnosticsScreen {...props({ autoResult })} />);
    expect(within(screen.getByTestId("diagnostics-auto-result")).getByText(text)).toBeTruthy();
  });

  it("결과가 없으면 값이 비어 있다", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    expect(
      within(screen.getByTestId("diagnostics-auto-result")).queryByText(/썼음|건너뜀|실패|도는/),
    ).toBeNull();
  });
});

describe("DS7 — 최근 실패", () => {
  it("없으면 빈 줄 하나", async () => {
    await render(<DiagnosticsScreen {...props()} />);
    expect(
      within(screen.getByTestId("diagnostics-failures-empty")).getByText("아직 실패가 없어요"),
    ).toBeTruthy();
  });

  it("있으면 줄마다 갈래 문구와 시각이 있고 눌러도 아무 일이 없다", async () => {
    await render(
      <DiagnosticsScreen
        {...props({
          failures: [
            { reasonText: "저장하지 못함", timeText: "10월 6일 09:05" },
            { reasonText: "일기를 쓰지 못함", timeText: "10월 5일 21:30" },
          ],
        })}
      />,
    );
    const first = screen.getByTestId("diagnostics-failure-0");
    expect(within(first).getByText("저장하지 못함")).toBeTruthy();
    expect(within(first).getByText("10월 6일 09:05")).toBeTruthy();
    expect(screen.getByTestId("diagnostics-failure-1")).toBeTruthy();
    expect(screen.queryByTestId("diagnostics-failures-empty")).toBeNull();
    // 행에 눌림 핸들러가 없다 — 눌러도 아무것도 호출되지 않는다(진단의 모든 핸들러가 호출 0회).
    expect(first.props.onPress ?? first.props.onClick).toBeUndefined();
  });
});

/* ═══════════════════════════ 소스 계약 (DS8~DS10) ═══════════════════════════ */

const code = (file: string) =>
  readFileSync(join(__dirname, "..", "..", file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const SCREEN_FILES = ["src/ui/DiagnosticsScreen.tsx", "src/ui/DiagnosticsParts.tsx"];

describe("DS8 — 화면은 기기·파이프라인·신호·모델에 닿지 않는다", () => {
  it.each(SCREEN_FILES)("%s", (file) => {
    const src = code(file);
    expect(src).not.toMatch(/from\s+["'][^"']*expo-/);
    expect(src).not.toMatch(
      /from\s+["'][^"']*(?:schedule\/|diary\/pipeline|diary\/prompt|signals\/|models\/|vision\/)/,
    );
    expect(src).not.toMatch(/createAppPipeline|runAutoDiaryTask/);
    // 모델 이름 문자열이 없다(원칙 III)
    expect(src).not.toMatch(/gguf|exaone|kanana|qwen|llama/i);
  });
});

describe("DS9 — 글꼴 2.0배에서 자르지 않고 줄을 바꾼다", () => {
  it("행(055 `Row`)은 flexWrap을 쓰고, 신호 칸 다섯은 한 줄에서 폭을 나눠 글자가 칸 안에서 줄을 바꾼다", () => {
    expect(code("src/ui/SettingsScreen.tsx")).toMatch(/flexWrap: "wrap"/);
    expect(code("src/ui/DiagnosticsParts.tsx")).toMatch(/flex: 1,\s*minWidth: 0/);
  });
});

describe("DS10 — 측정 어휘가 없다 (FR-021, 원칙 IV)", () => {
  it.each([
    ...SCREEN_FILES,
    "src/app/diagnostics-view.ts",
    "src/app/diary-inspect.ts",
    "src/app/write-failures.ts",
  ])("%s", (file) => {
    // import 경로(`theme/tokens` — 디자인 토큰)는 대상이 아니다 — 코드의 낱말만 본다.
    const body = code(file).replace(/from\s+["'][^"']*["']/g, "");
    expect(body).not.toMatch(/duration|elapsed|timing|\btokens?\b/i);
  });
});
