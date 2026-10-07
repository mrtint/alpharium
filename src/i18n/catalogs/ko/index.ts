/**
 * 한국어 카탈로그 (062) — 기본 언어이자 모든 카탈로그 모양의 기준이다(`Catalog = typeof ko`, FR-003).
 *
 * 계약: specs/062-ui-text-i18n/contracts/i18n.md K1~K4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`as const`를 쓰지 않는다**(K1) — 문자열이 리터럴 타입으로 좁아지면 다른 언어 카탈로그가 이 모양을 만족할 수 없다. 개수가 중요한 표는
 * `../shapes.ts`의 튜플 타입으로 적는다.
 *
 * 영역은 원래 문구가 있던 화면·계층을 따른다(data-model 「Catalog」). 화면 문구만 담는다 — 일기 프롬프트·신호의 「모른다」 까닭·
 * 프롬프트 호칭 같은 모델 입력은 여기 오지 않는다(FR-015, 원칙 II·IV).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { calendar } from "./calendar";
import { developer } from "./developer";
import { diagnostics, diagnosticsLanguage } from "./diagnostics";
import { download } from "./download";
import { home } from "./home";
import { monologue } from "./monologue";
import { notification } from "./notification";
import { onboarding } from "./onboarding";
import { frame, settings, skippedLine, targetHour } from "./settings";
import { simulation } from "./simulation";
import { welcome } from "./welcome";

export const ko = {
  calendar,
  home,
  settings,
  frame,
  skippedLine,
  targetHour,
  developer,
  diagnostics,
  diagnosticsLanguage,
  simulation,
  welcome,
  download,
  onboarding,
  monologue,
  notification,
};
