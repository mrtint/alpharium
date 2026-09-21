/**
 * 040 — App.tsx 게이트가 resolveFirstRunStage를 호출해 naming/
 * downloading/liveness 단계에 맞는 화면을 렌더하는지 (US2).
 * ★ 045가 우선순위와 화면 배선을 재작성했다 — 동의(download-consent) →
 * 다운로드(downloading) → 작명(naming) 순서로 뒤집혔다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `App.tsx`는 새 네이티브 모듈·통로를 여럿 직접 import해 jest에서 완전히
 * 렌더하기 어렵다 — 021·029가 세운 `onboarding-complete-gate.test.tsx`의
 * 선례(소스를 읽어 배선이 있는지 확인)를 그대로 따른다(006·021·029와 같은
 * "렌더보다 소스가 정확한 자리"의 성격, safe-area.test.tsx와 동일한 논리).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C1~C4
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP_SOURCE = readFileSync(join(__dirname, "../../App.tsx"), "utf8");

describe("040/045 — App.tsx가 resolveFirstRunStage를 호출한다", () => {
  it("resolveFirstRunStage를 import하고 firstRunStage 변수에 결과를 담는다", () => {
    expect(APP_SOURCE).toMatch(
      /import \{ resolveFirstRunStage \} from ".\/src\/firstrun\/progress"/,
    );
    expect(APP_SOURCE).toMatch(/const firstRunStage =/);
  });

  it("downloadConsented·downloadReady(essentialsReady)·downloadProceedConfirmed·namingDone·livenessOutcome을 함께 넘긴다", () => {
    const call = APP_SOURCE.match(/resolveFirstRunStage\(\{([\s\S]*?)\}\)/);
    expect(call).not.toBeNull();
    expect(call?.[1]).toMatch(/downloadConsented:\s*onboardingFlag\.downloadConsented/);
    expect(call?.[1]).toMatch(/downloadReady:\s*essentialsReady/);
    expect(call?.[1]).toMatch(/downloadProceedConfirmed/);
    expect(call?.[1]).toMatch(/namingDone/);
    expect(call?.[1]).toMatch(/livenessOutcome/);
  });
});

describe('045 C2 — "download-consent"/"downloading" 단계면 각 화면을 그린다', () => {
  it('firstRunStage === "download-consent" 분기가 DownloadConsentDialog를 렌더한다', () => {
    const region = APP_SOURCE.slice(
      APP_SOURCE.indexOf('firstRunStage === "download-consent"'),
      APP_SOURCE.indexOf('firstRunStage === "download-consent"') + 500,
    );
    expect(region).toMatch(/<DownloadConsentDialog/);
  });

  it('firstRunStage === "downloading" 분기가 DownloadProgressScreen을 렌더한다', () => {
    const region = APP_SOURCE.slice(
      APP_SOURCE.indexOf('firstRunStage === "downloading"'),
      APP_SOURCE.indexOf('firstRunStage === "downloading"') + 500,
    );
    expect(region).toMatch(/<DownloadProgressScreen/);
  });

  it("WaitingForDownloadScreen을 더 이상 참조하지 않는다(045 R4, 완전히 대체됨)", () => {
    expect(APP_SOURCE).not.toMatch(/WaitingForDownloadScreen/);
  });
});

describe("045 FR-008 — 작명 화면은 다운로드 완료 후에만 온다 (040 FR-005를 대체)", () => {
  it("welcomeNeeded 판정에 essentialsReady/downloadReady 필수 조건이 없다(035 게이트 자체는 무변경)", () => {
    // shouldShowWelcome 호출에서 onboardingNeeded는 permissionStepsDecided만
    // 본다 — essentialAssetsReady를 값으로 넘기긴 하지만(하위 호환), 그 값이
    // 판정에 쓰이지 않는 것은 src/welcome/decision.ts 쪽 계약(W3 040 예외)이
    // 이미 잠갔다. 어느 화면을 렌더할지는 firstRunStage가 정하며(045 C2가
    // 순서를 뒤집었다), 이 값은 035 게이트를 우회하지 않았음을 확인하는
    // 소스 검사용으로만 남아 있다.
    const call = APP_SOURCE.match(/const welcomeNeeded =([\s\S]*?);\n\n/);
    expect(call).not.toBeNull();
    expect(call?.[0]).toMatch(/onboardingNeeded:\s*!permissionStepsDecided/);
  });
});

describe("US3 — 자동 생성 트리거 배선 (contracts G6, FR-008/FR-008a/FR-009)", () => {
  it("firstRunStage==='done' && livenessOutcome==='ok'일 때만 트리거하고, 세션 스코프 ref로 중복을 막는다", () => {
    const effectBody = APP_SOURCE.match(
      /const autoGenerateTried = useRef\(false\);\s*useEffect\(\(\) => \{([\s\S]*?)\}, \[firstRunStage, livenessOutcome, environment\]\);/,
    );
    expect(effectBody).not.toBeNull();
    const body = effectBody?.[1] ?? "";
    expect(body).toMatch(/if \(firstRunStage !== "done"\) return;/);
    expect(body).toMatch(/if \(livenessOutcome !== "ok"\) return;/);
    expect(body).toMatch(/if \(autoGenerateTried\.current\) return;/);
    expect(body).toMatch(/autoGenerateTried\.current = true;/);
    expect(body).toMatch(/shouldAutoGenerate\(/);
    expect(body).toMatch(/triggerFirstRunAutoDiary\(/);
  });

  it("shouldAutoGenerate를 import해 dayWritable 게이트를 판정에 쓴다(FR-008 정오 단서)", () => {
    expect(APP_SOURCE).toMatch(
      /import \{ shouldAutoGenerate \} from ".\/src\/firstrun\/auto-diary"/,
    );
    expect(APP_SOURCE).toMatch(/isDayWritable\(day, now\)/);
  });

  it("트리거 결과를 새 상태(배너 등)에 담지 않는다(research.md #5) — .catch(() => {})로 끝난다", () => {
    const call = APP_SOURCE.match(
      /void triggerFirstRunAutoDiary\([\s\S]*?\.catch\(\(\) => \{\}\);/,
    );
    expect(call).not.toBeNull();
  });
});

describe("T027a — 자동 생성 실패가 수동 재시도를 막지 않는다 (FR-009/SC-004)", () => {
  it("autoGenerateTried ref는 App.tsx의 자동 트리거 effect 안에서만 쓰이고, DiarySection/수동 generate() 경로에는 없다", () => {
    // 040의 세션 스코프 중복 방지 ref가 수동 "일기 쓰기" 경로로 새지 않았는지 —
    // DiaryHomeScreen.tsx(수동 생성 화면)에 이 식별자가 전혀 없어야 한다.
    const homeScreenSource = readFileSync(
      join(__dirname, "../../src/ui/DiaryHomeScreen.tsx"),
      "utf8",
    );
    expect(homeScreenSource).not.toMatch(/autoGenerateTried/);
    expect(homeScreenSource).not.toMatch(/triggerFirstRunAutoDiary/);
  });

  it("autoGenerateTried는 App.tsx 안에 정확히 한 번만 선언된다(다른 경로가 재사용하지 않음)", () => {
    const declarations = [...APP_SOURCE.matchAll(/const autoGenerateTried = /g)];
    expect(declarations).toHaveLength(1);
  });
});

describe("SC-003 — 자동 생성이 끝나면 홈 화면이 목록을 다시 읽는다", () => {
  /*
   * ★ 실기기에서만 드러난 결함(2026-09-11, SM-S901N). 파일에는 일기가
   * 저장됐는데 홈 화면은 "아직 일기가 없다"로 남았다 — `DiaryHomeScreen`은
   * 마운트·`AppState` 변화·자기가 돌린 생성에서만 `refresh()`를 부르는데,
   * 040의 자동 트리거는 그 셋 중 어디에도 해당하지 않는다. 앱을 껐다 켜야
   * 첫 일기가 보였다.
   */
  it("트리거가 끝나면(성공·실패 무관) autoGeneratedToken을 올린다", () => {
    const trigger = APP_SOURCE.match(/triggerFirstRunAutoDiary\(([\s\S]*?)\n  \}, \[/);
    expect(trigger).not.toBeNull();
    // finally에 둬야 실패 시에도 최신 목록을 본다(FR-009).
    expect(trigger?.[1]).toMatch(/\.finally\(\(\) => setAutoGeneratedToken/);
  });

  it("그 토큰이 DiarySection의 key에 연결돼 재마운트를 일으킨다", () => {
    expect(APP_SOURCE).toMatch(/key=\{`diary-\$\{autoGeneratedToken\}`\}/);
  });

  it("토큰은 지표가 아니다 — 화면 문구나 비교에 쓰이지 않는다(원칙 IV)", () => {
    const source = APP_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const uses = [...source.matchAll(/autoGeneratedToken/g)];
    // 선언 + setState 호출 + key 참조, 그 밖의 쓰임이 없다.
    expect(uses.length).toBeLessThanOrEqual(4);
  });
});

describe("FR-010·FR-011 — 권한 결정이 끝나면 completed를 저장한다", () => {
  /*
   * ★ 실기기에서만 드러난 결함(2026-09-11, SM-S901N). 021은 마지막
   * [시작하기] 버튼이 `onComplete`로 `completed: true`를 세웠는데, 040은
   * 권한 결정 직후 작명 화면으로 전환해 **그 버튼에 도달하지 않는다** —
   * 저장하지 않으면 앱을 다시 열 때마다 권한 온보딩이 재노출된다.
   * 기기 없는 테스트는 이 결함을 못 잡았다(플래그 저장은 파일 통로라
   * 소스 검사로 배선 존재만 확인한다).
   */
  it("onAllStepsDecided 핸들러가 completed: true를 저장한다", () => {
    const handler = APP_SOURCE.match(
      /const onAllPermissionStepsDecided = useCallback\(([\s\S]*?)\}, \[/,
    );
    expect(handler).not.toBeNull();
    // 세션 상태만 세우고 끝나면 안 된다 — 파일에도 남겨야 한다.
    expect(handler?.[1]).toMatch(/setPermissionStepsDecided\(true\)/);
    expect(handler?.[1]).toMatch(/completed:\s*true/);
    expect(handler?.[1]).toMatch(/saveOnboardingFlag/);
  });

  it("OnboardingScreen의 onAllStepsDecided에 그 핸들러가 연결된다", () => {
    expect(APP_SOURCE).toMatch(/onAllStepsDecided=\{onAllPermissionStepsDecided\}/);
  });

  it("이미 completed === true면 다시 저장하지 않는다(불필요한 쓰기 방지)", () => {
    const handler = APP_SOURCE.match(
      /const onAllPermissionStepsDecided = useCallback\(([\s\S]*?)\}, \[/,
    );
    expect(handler?.[1]).toMatch(/prev\.completed === true/);
  });
});

describe("작명 완료는 오직 사용자 행동으로만 (자동 타이머·다운로드 완료 콜백으로 세우지 않음)", () => {
  it("namingDoneThisSession은 오직 finishWelcome()에서만 true로 설정된다(자동 타이머·다운로드 완료 콜백에서 세우지 않음)", () => {
    const setters = [...APP_SOURCE.matchAll(/setNamingDoneThisSession\(([^)]*)\)/g)].map(
      (m) => m[1],
    );
    expect(setters.length).toBeGreaterThan(0);
    for (const arg of setters) {
      expect(arg.trim()).toBe("true");
    }
    // finishWelcome 함수 본문 안에 있는지 확인한다.
    const fnBody = APP_SOURCE.match(
      /const finishWelcome = useCallback\(([\s\S]*?)\[characterNamesPort/,
    );
    expect(fnBody).not.toBeNull();
    expect(fnBody?.[1]).toMatch(/setNamingDoneThisSession\(true\)/);
  });
});

/**
 * 046 D8 — 다운로드 실패 시 자동 재시도는 화면(`DownloadProgressScreen`)이
 * 아니라 이 조립 계층(`App.tsx`)의 책임이다(research.md R6). 재시도
 * 타이머 자체를 렌더 테스트로 실행하지 않고(App.tsx는 새 네이티브 통로를
 * 여럿 직접 import해 이 파일 상단 주석대로 전체 렌더가 어렵다), 소스가
 * `downloadFailed` 상태에 반응해 `DOWNLOAD_RETRY_INTERVAL_MS` 간격으로
 * 스스로 재시도를 되돌리는 `useEffect`를 갖는지 확인한다.
 */
describe("046 D8 — 다운로드 실패 자동 재시도는 App.tsx가 스스로 한다(화면은 failed만 받는다)", () => {
  it("DOWNLOAD_RETRY_INTERVAL_MS 상수가 10초(10_000ms)로 정의돼 있다", () => {
    expect(APP_SOURCE).toMatch(/const DOWNLOAD_RETRY_INTERVAL_MS = 10_000;/);
  });

  it("downloadFailed에 반응하는 useEffect가 essentialDownloadStarted를 리셋하고 재시도 토큰을 올린다", () => {
    const effectMatch = APP_SOURCE.match(
      /useEffect\(\(\) => \{\s*if \(!downloadFailed\) return;([\s\S]*?)\}, \[downloadFailed\]\);/,
    );
    expect(effectMatch).not.toBeNull();
    const body = effectMatch?.[1] ?? "";
    expect(body).toMatch(/setTimeout\(/);
    expect(body).toMatch(/DOWNLOAD_RETRY_INTERVAL_MS/);
    expect(body).toMatch(/essentialDownloadStarted\.current = false;/);
    expect(body).toMatch(/setDownloadFailed\(false\);/);
    expect(body).toMatch(/setDownloadRetryToken\(\(n\) => n \+ 1\);/);
    // 타이머를 정리하지 않으면 화면 이탈 후에도 재시도가 계속 돈다.
    expect(body).toMatch(/return \(\) => clearTimeout\(id\);/);
  });

  it("DownloadProgressScreen에 onRetry를 더 이상 넘기지 않는다(재시도 콜백 제거, contracts D8)", () => {
    const region = APP_SOURCE.slice(
      APP_SOURCE.indexOf("<DownloadProgressScreen"),
      APP_SOURCE.indexOf("<DownloadProgressScreen") + 800,
    );
    expect(region).not.toMatch(/onRetry=/);
    expect(region).toMatch(/downloadFraction=\{downloadFraction\}/);
  });
});
