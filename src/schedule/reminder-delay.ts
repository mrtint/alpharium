/**
 * 배터리 예외가 있을 때 쓸 차례 알림을 늦추는 분 (104).
 *
 * `timing.ts`와 `reminder-plan.ts`가 함께 읽는다 — 한쪽에 두면 둘이 서로를 불러 순환이 생긴다(2026-11-09, `__tests__/config/no-require-cycle.test.ts`).
 *
 * **사람이 정한 값이다 — 측정이 아니다**(원칙 V). 백그라운드 잡의 최소 반복 간격 15분(`background-port.ts`) + 백그라운드 쓰기 한도 600초(10분,
 * `assembly.ts`) = 최악 약 25분을 덮는다. 쓰기가 이 안에 저장되면 알림은 뜨기 전에 거둬지고 완성 알림만 온다.
 */
export const REMINDER_DELAY_MINUTES = 30;
