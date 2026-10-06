/**
 * 062 K2·K3 — 카탈로그 모양이 어긋나면 tsc가 실패한다. **테스트 파일이 아니다** — jest는 돌리지 않고 `npm run lint`의 `tsc --noEmit`이
 * 본다(이 파일은 `tsconfig`의 검사 대상이다). `@ts-expect-error` 아래 줄이 오류가 아니게 되면 그 지시문 자체가 오류가 되어 lint가 실패한다.
 */

import type { Catalog } from "../../src/i18n/catalogs";
import { ko } from "../../src/i18n/catalogs/ko";
import type { Week } from "../../src/i18n/catalogs/shapes";
import { xx } from "./fixtures/xx";

// K2 — 영역 하나를 빼면 실패한다
const { notification: _dropped, ...withoutNotification } = xx;
// @ts-expect-error — `notification` 영역이 없다
export const missingArea: Catalog = withoutNotification;

// K2 — 영역 안의 항목 하나를 빼면 실패한다
const { channelName: _droppedKey, ...notificationWithoutChannel } = ko.notification;
export const missingKey = {
  ...xx,
  // @ts-expect-error — `notification.channelName`이 없다
  notification: notificationWithoutChannel,
} satisfies Catalog;

// K2 — 함수 모양이 다르면 실패한다(인자 순서·개수가 다른 문장 틀)
export const wrongFunction = {
  ...xx,
  notification: {
    ...xx.notification,
    // @ts-expect-error — `(name, month, date) => string`이 아니다
    autoWriteDone: (name: string): number => name.length,
  },
} satisfies Catalog;

// K2 — 개수가 중요한 표를 줄이면 실패한다(요일 일곱)
// @ts-expect-error — 요일이 여섯이다
export const sixDays: Week = ["일", "월", "화", "수", "목", "금"];

// K3 — 지원 목록에 언어를 더하고 카탈로그를 안 넣으면 실패한다
type WithXx = "ko" | "xx";
// @ts-expect-error — `xx` 카탈로그가 없다
export const registryMissingXx: Readonly<Record<WithXx, Catalog>> = { ko };

// 비교 — 다 갖추면 통과한다
export const registryComplete: Readonly<Record<WithXx, Catalog>> = { ko, xx };
