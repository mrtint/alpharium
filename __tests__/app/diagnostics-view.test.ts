/**
 * 진단 화면 값 조립 계약 (060, DV1~DV8).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  canRequestPhoto,
  environmentLines,
  failureLines,
  photoPermissionLines,
  probeCells,
  storageValue,
} from "../../src/app/diagnostics-view";
import type { DaySignals } from "../../src/signals/types";

const base = {
  date: "2026-10-06",
  photos: { kind: "none" },
  places: { kind: "none" },
  steps: { kind: "unknown", reason: "x" },
  battery: { kind: "unknown", reason: "x" },
  connectivity: { kind: "unknown", reason: "x" },
} as unknown as DaySignals;

function signals(over: Record<string, unknown>): DaySignals {
  return { ...base, ...over } as unknown as DaySignals;
}

const photosKnown = (n: number, complete = true) => ({
  kind: "known",
  value: { photos: Array.from({ length: n }, (_, i) => ({ id: String(i) })), complete },
});
const placesKnown = (visitCount: number) => ({
  kind: "known",
  value: {
    trace: { visitCount, approximateDistanceMeters: 10 },
    photosWithLocation: 1,
    photosConsidered: 1,
  },
});

describe("DV1 — 환경 줄", () => {
  const input = {
    buildLabel: "DEV · 1.0.0 (24)",
    os: { platform: "android", version: "16" } as const,
  };

  it("기기 추론은 「기기 · CPU」, 로컬 서버는 「로컬 서버」, 못 골랐으면 「선택되지 않음」", () => {
    expect(environmentLines({ ...input, inference: { ok: true, location: "on-device" } })).toEqual({
      build: "DEV · 1.0.0 (24)",
      device: "Android 16",
      inference: "기기 · CPU",
    });
    expect(
      environmentLines({ ...input, inference: { ok: true, location: "desktop-server" } }).inference,
    ).toBe("로컬 서버");
    expect(environmentLines({ ...input, inference: { ok: false } }).inference).toBe(
      "선택되지 않음",
    );
  });

  it("릴리스를 못 읽으면 기기 값이 null이다", () => {
    expect(environmentLines({ ...input, os: null, inference: { ok: false } }).device).toBeNull();
  });

  it("068 — iOS는 「iOS 버전」이다(iOS에서 기기 줄이 비어 있던 것을 막는다)", () => {
    expect(
      environmentLines({
        ...input,
        os: { platform: "ios", version: "26.5" },
        inference: { ok: false },
      }).device,
    ).toBe("iOS 26.5");
  });
});

describe("068 — 진단 화면의 기기 줄은 iOS에서도 값을 준다 (조립 계약)", () => {
  it("App.tsx가 iOS에서 `Platform.Version`으로 os를 만든다", () => {
    const app = readFileSync(join(__dirname, "../../App.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(app).toMatch(/platform:\s*"ios",\s*version:\s*String\(Platform\.Version\)/);
  });
});

describe("DV2 — 신호 다섯 칸", () => {
  it("항상 다섯 칸, 순서는 사진·장소·걸음·배터리·연결", () => {
    expect(probeCells(base).map((c) => c.axis)).toEqual([
      "photos",
      "places",
      "steps",
      "battery",
      "network",
    ]);
  });

  it("걸음·배터리·연결은 입력이 known이어도 「모름」이다", () => {
    const cells = probeCells(
      signals({
        steps: { kind: "known", value: 9000 },
        battery: { kind: "known", value: {} },
        connectivity: { kind: "known", value: {} },
      }),
    );
    for (const axis of ["steps", "battery", "network"]) {
      const cell = cells.find((c) => c.axis === axis);
      expect(cell).toEqual({ axis, kind: "unknown", text: "모름" });
    }
  });
});

describe("DV3 — 사진·장소", () => {
  it("known → 숫자, none → 없음, unknown → 모름(0이 아니다)", () => {
    expect(
      probeCells(signals({ photos: photosKnown(3), places: placesKnown(2) })).slice(0, 2),
    ).toEqual([
      { axis: "photos", kind: "number", text: "3장" },
      { axis: "places", kind: "number", text: "2곳" },
    ]);
    expect(probeCells(signals({ photos: { kind: "none" } }))[0]).toEqual({
      axis: "photos",
      kind: "none",
      text: "없음",
    });
    const unknown = probeCells(signals({ photos: { kind: "unknown", reason: "권한 없음" } }));
    expect(unknown[0]).toEqual({ axis: "photos", kind: "unknown", text: "모름" });
  });

  it("잘린 사진 수는 일부임을 밝힌다", () => {
    expect(probeCells(signals({ photos: photosKnown(5, false) }))[0]?.text).toBe("5장 (일부)");
  });

  it("사진이 관측된 0장이면 장소도 없음이다", () => {
    expect(
      probeCells(
        signals({ photos: { kind: "none" }, places: { kind: "unknown", reason: "x" } }),
      )[1],
    ).toEqual({ axis: "places", kind: "none", text: "없음" });
  });

  it("사진이 unknown이면 장소를 없음으로 승격하지 않는다", () => {
    const cells = probeCells(
      signals({ photos: { kind: "unknown", reason: "x" }, places: { kind: "none" } }),
    );
    expect(cells[1]).toEqual({ axis: "places", kind: "unknown", text: "모름" });
  });
});

describe("DV4·DV5 — 사진 권한", () => {
  it.each([
    ["granted", "allowed", "all"],
    ["limited", "partial", "selected"],
    ["denied", "denied", null],
    ["blocked", "denied", null],
    ["undetermined", "denied", null],
    ["unknown", null, null],
  ] as const)("%s → 읽기 %s · 범위 %s", (permission, read, scope) => {
    const lines = photoPermissionLines({ permission, location: "unknown" });
    expect(lines.read).toBe(read);
    expect(lines.scope).toBe(scope);
  });

  it.each([
    ["ok", "allowed"],
    ["denied", "denied"],
    ["unknown", null],
    ["no-photo", null],
  ] as const)("위치 정보 %s → %s", (location, expected) => {
    expect(photoPermissionLines({ permission: "granted", location }).location).toBe(expected);
  });

  it("요청은 denied·undetermined에서만 한다", () => {
    expect(canRequestPhoto("denied")).toBe(true);
    expect(canRequestPhoto("undetermined")).toBe(true);
    for (const state of ["granted", "limited", "blocked", "unknown"] as const) {
      expect(canRequestPhoto(state)).toBe(false);
    }
  });
});

describe("DV6 — 실패 줄", () => {
  it("기록 순서 그대로, 갈래 → 문구, 시각은 M월 d일 HH:mm", () => {
    const lines = failureLines([
      { reason: "save", at: new Date(2026, 9, 6, 9, 5) },
      { reason: "unwritten", at: new Date(2026, 9, 5, 21, 30) },
      { reason: "empty", at: new Date(2026, 11, 25, 0, 0) },
    ]);
    expect(lines).toEqual([
      { reasonText: "저장하지 못함", timeText: "10월 6일 09:05" },
      { reasonText: "일기를 쓰지 못함", timeText: "10월 5일 21:30" },
      { reasonText: "글이 비어 있음", timeText: "12월 25일 00:00" },
    ]);
    for (const line of lines) expect(Object.keys(line).sort()).toEqual(["reasonText", "timeText"]);
  });

  it("다섯 갈래 문구가 모두 있다", () => {
    const texts = (["module", "photos", "empty", "save", "unwritten"] as const).map(
      (reason) => failureLines([{ reason, at: new Date(2026, 0, 1) }])[0]?.reasonText,
    );
    expect(texts).toEqual([
      "모듈을 불러오지 못함",
      "사진을 읽지 못함",
      "글이 비어 있음",
      "저장하지 못함",
      "일기를 쓰지 못함",
    ]);
  });
});

describe("저장 점검 값", () => {
  it("점검 전·점검하지 못함은 빈 값이고 정상으로 적지 않는다", () => {
    expect(storageValue(null)).toBe("");
    expect(storageValue({ kind: "unavailable" })).toBe("");
  });
  it("정상·읽기 실패", () => {
    expect(storageValue({ kind: "done", total: 41, unreadable: 0 })).toBe("41편 · 정상");
    expect(storageValue({ kind: "done", total: 41, unreadable: 2 })).toBe("41편 · 2편 읽기 실패");
  });
});

describe("소스 계약 — DV7·DV8", () => {
  const code = (file: string) =>
    readFileSync(join(__dirname, "..", "..", file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  it("DV7 — 시계를 부르지 않는다", () => {
    const src = code("src/app/diagnostics-view.ts");
    expect(src).not.toContain("new Date()");
    expect(src).not.toContain("Date.now()");
  });

  it("DV8 — 「기기 · CPU」는 GPU 오프로드 0 고정에 근거한다", () => {
    expect(code("src/inference/llama-port.ts")).toMatch(/const GPU_LAYERS = 0;/);
    const src = code("src/app/diagnostics-view.ts");
    const uses = src.match(/inferenceCpu/g) ?? [];
    expect(uses).toHaveLength(1);
    expect(src).toMatch(/location === "on-device"\) inference = T\.inferenceCpu/);
  });

  it("사용자 화면의 축 제외 상수를 보지 않는다 (DIAGNOSTICS_HIDES_AXES)", () => {
    expect(code("src/app/diagnostics-view.ts")).not.toContain("USER_VISIBLE_SIGNAL_AXES");
  });
});
