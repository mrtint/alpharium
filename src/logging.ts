/**
 * T017 — 로그 위생 (001 FR-037, 005 FR-405, 헌법 원칙 I)
 *
 * **일기 본문·집계 내용·원시 신호가 로그·크래시 리포트에 남지 않는다**(MUST NOT).
 *
 * 방식: 로그가 받는 것을 **문자열 하나와 안전한 표지들**로 제한한다. 임의의 객체를
 * 받는 자리를 두지 않으므로, 집계나 일기를 실수로 통째로 넘길 수 없다. 값을 남겨야
 * 할 때는 `redact`를 거쳐 **모양만** 남긴다.
 */

/** 로그에 남겨도 되는 값 — 원시 신호가 될 수 없는 것들. */
export type SafeDetail = string | number | boolean | null | undefined;

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * 값을 로그에 남길 수 있는 형태로 줄인다. 내용을 남기지 않고 **모양만** 남긴다 —
 * 본문은 길이로, 목록은 개수로, 객체는 항목 이름으로.
 */
export function redact(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "string") return `<문자열 ${value.length}자>`;
  if (value instanceof Error) return `${value.name}`;
  if (Array.isArray(value)) return `<목록 ${value.length}개>`;
  if (typeof value === "object") return `<객체 {${Object.keys(value).join(",")}}>`;
  return `<${typeof value}>`;
}

function emit(level: LogLevel, message: string, details: Record<string, SafeDetail>): void {
  const suffix = Object.entries(details)
    .map(([k, v]) => `${k}=${v ?? ""}`)
    .join(" ");
  const line = suffix ? `${message} ${suffix}` : message;

  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

/**
 * 로그를 남긴다. `details`가 `SafeDetail`만 받으므로 집계·일기·원시 신호를 통째로
 * 넘기는 것이 타입 수준에서 막힌다. 값의 모양이 필요하면 `redact`를 거친다.
 */
export const log = {
  debug: (message: string, details: Record<string, SafeDetail> = {}) => emit("debug", message, details),
  info: (message: string, details: Record<string, SafeDetail> = {}) => emit("info", message, details),
  warn: (message: string, details: Record<string, SafeDetail> = {}) => emit("warn", message, details),
  error: (message: string, details: Record<string, SafeDetail> = {}) => emit("error", message, details),
};
