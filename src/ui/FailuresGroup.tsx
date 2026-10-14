/**
 * 「최근 실패」 묶음 (060 보드 `6h` ⑦, 081) — 진단 화면과 개발자 화면이 함께 쓴다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 두 화면인가**: 진단 화면은 개발 환경에서만 열린다(060). 자동 쓰기 시도 기록(078)의 `백그라운드 · 실패`가 어떤 실패였는지는
 * 이 묶음의 같은 시각 줄이 말해 주는데, 배포 빌드(TestFlight·Play 내부 테스트)에는 그것을 볼 자리가 없었다. 그래서 배포 빌드에서도
 * 열리는 개발자 화면(버전 7번 탭, 059)의 시도 묶음 바로 아래에 같은 묶음을 둔다 — 스크린샷 한 장에 둘이 함께 찍힌다.
 *
 * 값만 받는다 — 줄은 조립부가 `diagnostics-view.ts`의 `failureLines()`로 옮긴 문자열이다. 기록 모듈에 닿지 않는다.
 * 줄이 담는 것은 까닭의 갈래와 시각뿐이다(060 D3, 원칙 IV).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { DIAGNOSTICS_TEXT as T } from "../app/diagnostics-text";
import type { FailureLine } from "../app/diagnostics-view";
import { Group, Row, Value } from "./SettingsScreen";

export function FailuresGroup({
  failures,
  idPrefix,
}: {
  /** 최신이 위 */
  failures: readonly FailureLine[];
  /** testID 머리 — 화면마다 다르다(`diagnostics-group-failures`·`developer-group-failures`) */
  idPrefix: "diagnostics" | "developer";
}) {
  return (
    <Group label={T.failures} testID={`${idPrefix}-group-failures`}>
      {failures.length === 0 ? (
        <Row label={T.failuresEmpty} labelTone="muted" testID={`${idPrefix}-failures-empty`} />
      ) : (
        failures.map((line, index) => (
          // 위치가 키다 — 같은 갈래·같은 시각이 이어질 수 있다(035)
          <Row
            key={index}
            label={line.reasonText}
            testID={`${idPrefix}-failure-${index}`}
            trailing={<Value text={line.timeText} />}
          />
        ))
      )}
    </Group>
  );
}
