/**
 * 진단 화면에 보일 값을 문자열로 옮긴다 (060, 보드 `6h`).
 *
 * 계약: specs/060-diagnostics-screen/contracts/diagnostics.md DV1~DV8, research R8·R9
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 함수다** — 「지금」은 부르는 쪽이 정한다(이 파일에 시계가 없다). 화면(`DiagnosticsScreen`)은 신호·권한 타입에 닿지 못하고
 * 여기서 옮긴 문자열·태그만 받는다(헌법 검사 `UI_TOUCHES_PROMPT`·화면 소스 계약). 문구 정본은 `diagnostics-text.ts`다.
 *
 * **모르는 것을 0으로 채우지 않는다**(원칙 V). 걸음·배터리·연결은 수집하는 통로가 없는 축이라 입력이 무엇이든 늘 「모름」이고,
 * 사진이 `unknown`이면 장소를 「없음」으로 승격하지 않는다. **헌법 검사 `DIAGNOSTICS_HIDES_AXES`**: 이 파일은 다섯 축을 다 그린다 — 사용자
 * 화면의 축 제외 상수를 보지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PermissionState } from "../signals/port";
import type { DaySignals, SignalValue } from "../signals/types";
import { DIAGNOSTICS_TEXT as T } from "./diagnostics-text";
import { text } from "../i18n/current";
import type { Language } from "../i18n/languages";
import type { LanguageResolution } from "../i18n/resolve";
import type { PhotoLocationReading } from "./permission-tags";
import type { WriteFailure, WriteFailureReason } from "./write-failures";

/* ─────────────────────────────── 환경 ─────────────────────────────── */

/** 추론 위치 선택 결과 중 이 화면이 보는 모양 */
export type InferenceChoice =
  { ok: true; location: "on-device" | "desktop-server" } | { ok: false };

export type EnvironmentLines = {
  build: string;
  /** 읽지 못하면 `null` — 화면은 값을 비운다 */
  device: string | null;
  inference: string;
};

/**
 * 「기기 · CPU」는 기기 추론이 GPU 오프로드 0으로 고정돼 있다는 코드 사실에 근거한다(`llama-port.ts`의 `GPU_LAYERS = 0`) —
 * 계약 테스트가 그 상수를 잠그므로 상수가 바뀌면 이 문구도 같이 고치게 된다(research R8).
 */
export function environmentLines(input: {
  buildLabel: string;
  /** 운영체제 이름과 버전 — 읽지 못하면 `null`. iOS에서도 값이 있다(068, 안드로이드 전제였던 줄) */
  os: { platform: "android" | "ios"; version: string } | null;
  inference: InferenceChoice;
}): EnvironmentLines {
  let inference: string;
  if (!input.inference.ok) inference = T.inferenceNone;
  else if (input.inference.location === "on-device") inference = T.inferenceCpu;
  else inference = T.inferenceServer;

  return {
    build: input.buildLabel,
    device:
      input.os === null
        ? null
        : `${input.os.platform === "ios" ? "iOS" : "Android"} ${input.os.version}`,
    inference,
  };
}

/**
 * 062 FR-011b — 「감지한 기기 언어 → 고른 화면 언어」 (contracts V1). 감지한 것은 선호 순서의 첫 태그 원문이고, 감지하지 못했으면 「모름」이다.
 * 고른 것은 언어 이름이다. 둘을 따로 보여 「영어 기기인데 한국어로 떨어졌다」를 기기에서 눈으로 확인할 수 있게 한다(원칙 V).
 */
export function languageLine(resolution: LanguageResolution<Language>): string {
  // 고른 언어의 이름은 그 언어의 카탈로그가 스스로 말한다 — 지금 카탈로그가 곧 고른 언어의 것이다(current.ts가 함께 정한다)
  const T = text().diagnosticsLanguage;
  const detected = resolution.detected?.[0] ?? T.unknown;
  return T.line(detected, T.selfName);
}

/* ───────────────────────────── 신호 프로브 ───────────────────────────── */

export type ProbeAxis = "photos" | "places" | "steps" | "battery" | "network";

export type ProbeCell = {
  axis: ProbeAxis;
  /** `number`는 앱이 실제로 읽은 숫자, `none`은 관측된 0, `unknown`은 모름 */
  kind: "number" | "none" | "unknown";
  text: string;
};

const UNKNOWN_CELL = (axis: ProbeAxis): ProbeCell => ({
  axis,
  kind: "unknown",
  text: T.probeUnknown,
});

function cellFor<V>(
  axis: ProbeAxis,
  signal: SignalValue<V>,
  describe: (value: V) => string,
): ProbeCell {
  if (signal.kind === "known") return { axis, kind: "number", text: describe(signal.value) };
  if (signal.kind === "none") return { axis, kind: "none", text: T.none };
  return UNKNOWN_CELL(axis);
}

/** 항상 다섯 칸, 순서는 사진·장소·걸음·배터리·연결. 걸음·배터리·연결은 입력과 무관하게 「모름」이다. */
export function probeCells(signals: DaySignals): ProbeCell[] {
  const photos = cellFor("photos", signals.photos, (v) =>
    v.complete ? T.photoCount(v.photos.length) : T.photoCountPartial(v.photos.length),
  );

  let places: ProbeCell;
  if (signals.photos.kind === "none") {
    // 사진이 관측된 0장이면 장소도 없다(053 — 「0 장 · 모름」 방지)
    places = { axis: "places", kind: "none", text: T.none };
  } else if (signals.photos.kind === "unknown" && signals.places.kind === "none") {
    // 사진을 못 읽었는데 장소만 「없음」이라 하지 않는다 — 승격하지 않는다
    places = UNKNOWN_CELL("places");
  } else {
    places = cellFor("places", signals.places, (v) => T.placeCount(v.trace.visitCount));
  }

  return [photos, places, UNKNOWN_CELL("steps"), UNKNOWN_CELL("battery"), UNKNOWN_CELL("network")];
}

/* ───────────────────────────── 사진 권한 ───────────────────────────── */

export type PermissionTagKind = "allowed" | "partial" | "denied";

export type PhotoPermissionLines = {
  /** 읽지 못했으면 `null` */
  read: PermissionTagKind | null;
  location: PermissionTagKind | null;
  scope: "all" | "selected" | null;
};

export function photoPermissionLines(input: {
  permission: PermissionState | "unknown";
  location: PhotoLocationReading;
}): PhotoPermissionLines {
  let read: PermissionTagKind | null;
  switch (input.permission) {
    case "granted":
      read = "allowed";
      break;
    case "limited":
      read = "partial";
      break;
    case "denied":
    case "blocked":
    case "undetermined":
      read = "denied";
      break;
    default:
      read = null;
  }

  let location: PermissionTagKind | null = null;
  if (input.location === "ok") location = "allowed";
  else if (input.location === "denied") location = "denied";

  let scope: PhotoPermissionLines["scope"] = null;
  if (input.permission === "granted") scope = "all";
  else if (input.permission === "limited") scope = "selected";

  return { read, location, scope };
}

/** 요청이 소용 있는 상태인가 — `blocked`에서는 안드로이드가 창을 띄우지 않는다(004 FR-023) */
export function canRequestPhoto(state: PermissionState | "unknown"): boolean {
  return state === "denied" || state === "undetermined";
}

/* ───────────────────────────── 최근 실패 ───────────────────────────── */

export type FailureLine = { reasonText: string; timeText: string };

/** 062 — 모듈을 불러올 때 문구를 읽지 않게 함수로 둔다(contracts C4) */
function reasonText(reason: WriteFailureReason): string {
  const byReason: Readonly<Record<WriteFailureReason, string>> = {
    module: T.failModule,
    photos: T.failPhotos,
    empty: T.failEmpty,
    save: T.failSave,
    unwritten: T.failUnwritten,
  };
  return byReason[reason];
}

/** 기록 순서 그대로(최신이 위) 줄로 옮긴다. 시각은 현지 「M월 d일 HH:mm」 한 가지 형식이다. */
export function failureLines(items: readonly WriteFailure[]): FailureLine[] {
  return items.map((item) => ({
    reasonText: reasonText(item.reason),
    // `toTimeString()`은 현지 「HH:MM:SS GMT…」다 — 앞 다섯 글자가 현지 시:분이다(`getHours()`를 쓰지 않는다 — 하루 기준 계산과 섞이지 않게).
    timeText: T.failureTime(
      item.at.getMonth() + 1,
      item.at.getDate(),
      item.at.toTimeString().slice(0, 5),
    ),
  }));
}

/* ───────────────────────────── 저장 점검 ───────────────────────────── */

/** 점검 결과를 행 값으로. 점검 전·점검하지 못함은 빈 값이다(정상으로 적지 않는다, FR-006). */
export function storageValue(
  result: { kind: "done"; total: number; unreadable: number } | { kind: "unavailable" } | null,
): string {
  if (result === null || result.kind === "unavailable") return "";
  return result.unreadable === 0
    ? T.storageOk(result.total)
    : T.storageBad(result.total, result.unreadable);
}
