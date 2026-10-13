/**
 * 「최근 자동 쓰기 시도」 묶음 (078) — 진단 화면과 개발자 화면이 함께 쓴다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 두 화면인가**: 진단 화면은 개발 환경에서만 열린다(060). 이 기록의 쓸모는 실제 iPhone(TestFlight = 배포 빌드)에서 「자동 쓰기가
 * 왜 안 돌았는가」를 읽는 것이라, 배포 빌드에서도 열리는 개발자 화면(버전 7번 탭, 059)에 같은 묶음을 둔다.
 *
 * 값만 받는다 — 줄은 조립부가 `diagnostics-view.ts`의 `attemptLines()`로 옮긴 문자열이다. 기록 모듈에 닿지 않는다.
 * 읽는 법은 AGENTS 078에 있다 — 요지는 「`백그라운드` 줄이 없으면 OS가 깨우지 않았다」(앱을 여는 순간 `앱 열기` 줄은 늘 생긴다)와
 * 「시작한 뒤 끝나지 않음은 도는 중이거나 프로세스가 죽은 것」이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ATTEMPT_TEXT as A } from "../app/diagnostics-text";
import type { AttemptLine } from "../app/diagnostics-view";
import { Group, Row, Value } from "./SettingsScreen";

export function AttemptsGroup({
  attempts,
  idPrefix,
}: {
  /** 최신이 위 */
  attempts: readonly AttemptLine[];
  /** testID 머리 — 화면마다 다르다(`diagnostics-group-attempts`·`developer-group-attempts`) */
  idPrefix: "diagnostics" | "developer";
}) {
  return (
    <Group label={A.group} testID={`${idPrefix}-group-attempts`}>
      {attempts.length === 0 ? (
        <Row label={A.empty} labelTone="muted" testID={`${idPrefix}-attempts-empty`} />
      ) : (
        attempts.map((line, index) => (
          // 위치가 키다 — 같은 경로·같은 결과가 이어질 수 있다(035)
          <Row
            key={index}
            label={line.headText}
            testID={`${idPrefix}-attempt-${index}`}
            trailing={<Value text={line.outcomeText} />}
          />
        ))
      )}
    </Group>
  );
}
