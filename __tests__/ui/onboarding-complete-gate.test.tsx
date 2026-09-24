/**
 * 온보딩 [시작하기]를 누르면 홈으로 넘어간다 — 세션 안에서 에셋을 다 받았어도.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 렌더가 아니라 소스를 보는가** (safe-area.test.tsx와 같은 성격)
 *
 * 이 버그는 `App.tsx`의 진입 게이트가 보는 `essentialsReady` state가 마운트 +
 * `AppState "active"`에서만 갱신되는데, 온보딩에서 다운로드가 **같은 포그라운드
 * 세션 안에서** 끝나면 앱이 백그라운드로 안 가 그 갱신이 안 오는 것이었다.
 * `OnboardingScreen`의 로컬 `assetFacts`만 갱신돼 "시작하기"가 보이지만, 눌러도
 * 게이트가 stale한 false를 봐서 온보딩이 다시 그려진다(얼어붙은 것처럼 보임).
 *
 * 릴리즈에서만 드러났다 — dev는 매번 앱을 새로 띄워(재마운트) 게이트가 최신을
 * 읽었다. 실기기 검증(029 Q1)도 다운로드 후 매번 `launchApp`으로 확인해 이
 * 경로를 안 밟았다.
 *
 * 렌더 테스트로 잡기 어렵다 — `essentialAssets` 통로의 시간차·`AppState` 상호작용을
 * 태워야 한다. 잡을 수 있는 것은 「완료 콜백이 에셋 상태를 다시 읽는가」이고 그것은
 * 소스에 드러나 있다. **이 테스트가 막는 것은 되돌아가는 것이다**(원칙 V — 실제
 * 확인은 기기 화면).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP_SOURCE = readFileSync(join(__dirname, "../../App.tsx"), "utf8");

describe("★ 온보딩 완료 게이트 (029 버그 수정)", () => {
  it("onOnboardingComplete가 essentialsReady를 다시 읽는다", () => {
    // 완료 콜백 본문을 잘라내 그 안에서 재조회가 일어나는지 본다.
    const body = APP_SOURCE.match(
      /const onOnboardingComplete = useCallback\(\s*\([^)]*\) => \{([\s\S]*?)\n {4}\},\s*\[[^\]]*\],\s*\);/,
    );
    expect(body).not.toBeNull();
    // `refreshEssentialsReady()` 호출(또는 readFacts 직접 호출)이 본문에 있어야 한다.
    expect(body?.[1]).toMatch(/refreshEssentialsReady\(\)|essentialAssets\s*\.?\s*readFacts/);
  });

  it("refreshEssentialsReady가 essentialAssetsReady 판정으로 essentialsReady를 세운다", () => {
    // 재조회 함수가 실제로 facts → essentialAssetsReady → setEssentialsReady를 잇는다.
    const fn = APP_SOURCE.match(
      /const refreshEssentialsReady = useCallback\(([\s\S]*?)\n {4}\[[^\]]*\],\s*\);/,
    );
    expect(fn).not.toBeNull();
    expect(fn?.[1]).toContain("readFacts");
    expect(fn?.[1]).toContain("essentialAssetsReady(");
    expect(fn?.[1]).toContain("setEssentialsReady(");
  });

  it("refreshEssentialsReady가 onOnboardingComplete의 의존성 배열에 있다", () => {
    // useCallback 의존성에서 빠지면 stale 클로저로 첫 마운트의 함수를 잡는다.
    const deps = APP_SOURCE.match(
      /const onOnboardingComplete = useCallback\([\s\S]*?\n {4}\[([^\]]*)\],\s*\);/,
    );
    expect(deps).not.toBeNull();
    expect(deps?.[1]).toMatch(/\brefreshEssentialsReady\b/);
  });

  /*
   * ★ 045 — 029 FR-020("완료했지만 에셋이 없는 사용자는 온보딩 화면 없이도
   * 방치되지 않는다")을 위한 별도 보호 분기가 더 이상 없다. 새
   * `resolveFirstRunStage` 우선순위(C3)에서 `downloadReady`가 `namingDone`
   * 보다 먼저 검사되므로, `namingDone`(=`welcomeShown`) 값과 무관하게
   * `downloadReady: false`면 항상 `"downloading"`이 반환된다 — 우선순위
   * 자체가 이 보호막을 흡수했다(별도 조건식이 코드에 남아 있지 않다).
   */
  it("045 — 별도 029 FR-020 보호 분기 없이 firstRunStage 우선순위가 그 역할을 흡수한다", () => {
    expect(APP_SOURCE).not.toMatch(
      /permissionStepsDecided\s*&&\s*!essentialsReady\s*&&\s*onboardingFlag\.welcomeShown\s*===\s*true/,
    );
    expect(APP_SOURCE).not.toMatch(/WaitingForDownloadScreen/);
  });

  it("040 — permissionStepsDecided가 completed===true인 기존 사용자에게 시드된다", () => {
    // 시드하지 않으면 완료된 사용자가 OnboardingScreen도 WelcomeScreen도 못 보고
    // 곧장 깨진 탭 UI로 떨어진다(본문 주석 참조).
    expect(APP_SOURCE).toMatch(
      /permissionStepsDecidedThisSession\s*\|\|\s*onboardingFlag\?\.completed\s*===\s*true/,
    );
  });
});

/*
 * ★ liveness 실패 화면의 [그냥 시작하기]가 막다른 길이었다 — 실기기에서
 * 발견(2026-09-19, 045 검증 세션).
 *
 * `WelcomeScreen`의 `onSkip`은 작명 단계(`welcome-name-skip`)와 실패 단계
 * (`welcome-failed-skip`) 양쪽에 재사용되는 콜백인데, `App.tsx`가 이걸
 * `finishWelcome()` 하나에만 연결하고 있었다. `finishWelcome()`은
 * `namingDone`만 세우고 `livenessOutcome`은 그대로 두므로,
 * `resolveFirstRunStage`의 우선순위(`!namingDone` 먼저, `livenessOutcome
 * !== "ok"` 그다음)상 이미 `namingDone`이 true인 실패 화면에서 이 버튼을
 * 눌러도 `firstRunStage`가 여전히 `"liveness"`로 남았다(035 계약 W11
 * "막다른 길을 만들지 않는다" 위반) — 실기기에서 무한정 실패 화면에
 * 머무르는 것으로 재현됐다.
 *
 * 렌더 테스트로 잡기 어렵다(liveness는 실제 엔진 확인을 필요로 한다) —
 * 소스 검사로 "phase별로 다른 콜백이 연결되는가"만 잠근다.
 */
describe("★ liveness 실패 화면의 [그냥 시작하기] 막다른 길 (실기기 발견, 045 검증 세션)", () => {
  it("welcomePhase가 failed일 때만 onSkipLiveness를 쓴다 — finishWelcome 하나로 통일하지 않는다", () => {
    expect(APP_SOURCE).toMatch(
      /onSkip=\{welcomePhase === "failed" \? onSkipLiveness : \(\) => finishWelcome\(\)\}/,
    );
  });

  it("onSkipLiveness가 존재하고 livenessSkipped를 세운다", () => {
    const fn = APP_SOURCE.match(/const onSkipLiveness = useCallback\(\(\) => \{([\s\S]*?)\}, \[/);
    expect(fn).not.toBeNull();
    expect(fn?.[1]).toMatch(/finishWelcome\(\)/);
    expect(fn?.[1]).toMatch(/setLivenessSkipped\(true\)/);
  });

  it("firstRunStage 계산이 livenessSkipped를 반영한다 — livenessOutcome을 그대로 넘기지 않는다", () => {
    expect(APP_SOURCE).toMatch(
      /livenessOutcome:\s*livenessPassed\s*\?\s*"ok"\s*:\s*livenessOutcome,/,
    );
    expect(APP_SOURCE).toMatch(
      /const livenessPassed = livenessSkipped \|\| !namingDoneThisSession;/,
    );
  });

  it("★ 048 실기기 — 이미 모델이 있는 채로 켜면 다운로드 완료 화면을 건너뛴다", () => {
    expect(APP_SOURCE).toMatch(
      /downloadProceedConfirmed:\s*downloadProceedConfirmed \|\| !essentialsMissingSeen,/,
    );
    // 「없음을 봤다」는 에셋이 없다고 읽혔을 때만 세운다.
    expect(APP_SOURCE).toMatch(/if \(!ready\) setEssentialsMissingSeen\(true\);/);
    expect(APP_SOURCE.match(/setEssentialsMissingSeen\(/g)).toHaveLength(1);
  });

  it('livenessOutcome state 자체를 직접 "ok"로 덮어쓰지 않는다(원칙 I) — setLivenessOutcome("ok") 호출이 없다', () => {
    expect(APP_SOURCE).not.toMatch(/setLivenessOutcome\(\s*"ok"\s*\)/);
  });
});
