/**
 * 설정 「권한 · 휴대폰 설정으로 이동」 행의 꼬리표 판정 (055 FR-021~FR-023, data-model, research R6).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 함수다** — 재료(`PermissionFacts`)는 조립부(`App.tsx`)가 021의 통로와 사진 좌표 읽기(`photoLocationProbe`)에서
 * 모아 넘긴다. 화면은 결과 꼬리표만 받는다. 저장하지 않는다(실시간으로 읽은 권한에서 매번 판정).
 *
 * **모르는 것을 거부로 채우지 않는다**(원칙 V, FR-023) — 읽기에 실패한 행은 `unread`이고 화면은 꼬리표를 그리지 않는다.
 * 「아직 묻지 않음」은 「허용 안 함」이다 — 지금 쓸 수 없다는 사실이 같고 이 행은 앱 안에서 묻지 않는다(spec Assumptions).
 *
 * 사진은 사진 읽기 + 사진의 위치 정보를 한 행으로 묶는다(보드 `6c` ④, S4). 위치 정보는 조회 API가 없어(AGENTS) 사진
 * 한 장의 좌표를 실제로 읽어 본 결과다. 볼 사진이 없거나(`no-photo`) 읽어 보지 못했으면(`unknown`) 사진 읽기만으로 정한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PermissionState } from "../signals/port";

/** 021 권한 상태 + 읽기 실패 */
export type PermissionReading = PermissionState | "unknown";
/** 사진 한 장의 좌표를 읽어 본 결과 — 읽힘 / 예외(권한 없음) / 볼 사진 없음 / 시도 못 함 */
export type PhotoLocationReading = "ok" | "denied" | "no-photo" | "unknown";

export type PermissionFacts = {
  photos: PermissionReading;
  photoLocation: PhotoLocationReading;
  location: PermissionReading;
  notifications: PermissionReading;
};

/** 꼬리표 셋 + 그리지 않음 */
export type PermissionTag = "allowed" | "partial" | "denied" | "unread";
/** 꼬리표가 있는 행 — 배터리는 상태를 읽을 수 없어 꼬리표가 없다(FR-025) */
export type TaggedPermission = "photos" | "location" | "notifications";

export function permissionTagFor(key: TaggedPermission, facts: PermissionFacts): PermissionTag {
  if (key === "photos") return photoTag(facts.photos, facts.photoLocation);
  return simpleTag(facts[key]);
}

function photoTag(photos: PermissionReading, location: PhotoLocationReading): PermissionTag {
  if (photos === "unknown") return "unread";
  if (photos === "limited") return "partial";
  if (photos !== "granted") return "denied";
  return location === "denied" ? "partial" : "allowed";
}

function simpleTag(reading: PermissionReading): PermissionTag {
  if (reading === "unknown") return "unread";
  return reading === "granted" ? "allowed" : "denied";
}
