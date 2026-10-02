/**
 * 화면 이동 구조 — 탭 줄 없이 홈 ↔ 설정 ↔ 개발자 (048 US4).
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md H7, M6, N1~N5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `App.tsx`의 `AppFrame`은 첫 실행 게이트·권한·모델 통로를 한꺼번에 조립하므로 여기서 그리기엔
 * 무겁다. 그래서 **조립은 소스를 읽어 잠그고**(007 이후 관례), 하위 화면 껍데기는 직접 렌더한다.
 * 소스는 주석을 걷어낸 뒤 본다 — 주석은 무엇을 왜 금지하는지 적으므로 금지어가 정당하게 나온다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.setTimeout(30000);

const app = readFileSync(join(__dirname, "../../App.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "")
  .replace(/\{\s*\}/g, "{}");

/** `function Name(` 로 시작하는 본문을 잘라낸다 — 다음 최상위 `function`까지 */
function functionBody(name: string): string {
  const start = app.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = app.indexOf("\nfunction ", start + 1);
  return app.slice(start, next === -1 ? undefined : next);
}

/*
 * 048 N2·N3(`SubScreenFrame` 렌더)은 055가 없앴다 — 하위 화면은 홈 위에 겹치는 `StackLayer`이고, 그 뒤로 가기 계약(S6)은
 * `settings-stack.test.tsx`가, 머리 「‹ 일기」(F1)는 `settings-frame.test.tsx`가 잠근다.
 */

describe("★ 048 — App.tsx 조립 (소스 검사)", () => {
  it("H7·N1 — 전역 탭 줄이 없고 화면 상태가 셋이다", () => {
    expect(app).toMatch(/useState<"home" \| "settings" \| "developer">/);
    expect(app).not.toContain("setTab(");
    expect(app).not.toContain("styles.tabs");
    expect(app).not.toMatch(/\btabOn\b|\btabOff\b/);
    expect(app).not.toContain('"characters"');
  });

  /**
   * 051 수정 — 홈의 `⋯` 메뉴(048 M1~M6)를 없앴다(저장소 소유자 지시). 설정·개발자 진입점은 설정 화면 구성
   * 과제에서 다시 둔다. 059가 진입점(설정 「버전」 7번 탭)을 두었고 개발자 겹은 켜져 있을 때만 열린다 — 진단은 여전히
   * `showsDiagnostics` 조건 안에서만 그려진다(FR-024의 뒷부분, 059가 둘로 나눴다).
   */
  it("★ M6 — 홈에 메뉴 항목이 없고, 개발자 겹은 켜져 있을 때만 열린다 (059)", () => {
    const frame = functionBody("AppFrame");
    expect(frame).not.toMatch(/menuItems|HomeMenu|key: "developer"/);
    expect(frame).toMatch(/open=\{developer\.enabled && route === "developer"\}/);
  });

  it("N4 — 설정 진입·알림 라우팅이 화면 상태를 쓴다 (055 — 설정 진입은 점 세 개, 실패 안내는 「모듈 다시 받기」)", () => {
    expect(app).toMatch(/onOpenSettings=\{openSettings\}/);
    expect(app).toMatch(/const openSettings = useCallback\(\(\) => setRoute\(/);
    expect(app).not.toContain("onGoToSettings");
    const frame = functionBody("AppFrame");
    const onResponse = frame.slice(frame.indexOf("onResponse("));
    expect(onResponse.slice(0, 400)).toContain('setRoute("home")');
  });

  it("★ N5 — 고른 날은 AppFrame이 들고 홈 화면까지 흘려보낸다 (Q4)", () => {
    const frame = functionBody("AppFrame");
    // 049 AF1 — 초기값은 마운트 시점의 오늘이다(앱을 새로 열면 오늘, FR-010a). `null`이 아니다.
    expect(frame).toMatch(
      /const \[chosenDay, setChosenDay\] = useState<DayDate \| null>\(\(\) => dayOf\(new Date\(\)\)\)/,
    );
    // 057 — AppFrame에는 고른 날 말고도 `DayDate | null` 상태(건너뛴 날)가 있다. 고른 날만 본다.
    expect(frame).not.toMatch(/\[chosenDay, setChosenDay\] = useState<DayDate \| null>\(null\)/);
    expect(frame).toMatch(/chosenDay=\{chosenDay\}/);

    const section = functionBody("DiarySection");
    expect(section).toMatch(/chosenDay=\{chosenDay\}/);
    expect(section).toMatch(/onChooseDay=\{onChooseDay\}/);
    // 049 AF2 — 미리 준비의 범위(사흘)를 홈 화면에 넘긴다(FR-020a, R5).
    expect(section).toMatch(
      /canPrepare=\{\(day\) => selectableDays\(new Date\(\)\)\.includes\(day\)\}/,
    );
  });

  it("055·059 — 설정·개발자는 홈 위의 StackLayer 겹이다 (설정은 닫으면 홈, 개발자는 설정, 그 위에 이름 바꾸기·진단)", () => {
    const frame = functionBody("AppFrame");
    expect(frame.match(/<StackLayer[\s>]/g)?.length).toBe(4);
    expect(frame.match(/onClose=\{goHome\}/g)?.length).toBe(1);
    expect(frame.match(/onClose=\{backToSettings\}/g)?.length).toBe(1);
  });

  it("신호 미리보기 통로가 홈 화면까지 온다 (US3)", () => {
    const section = functionBody("DiarySection");
    expect(section).toMatch(/previewDay=\{wiring\.ok \? wiring\.previewDay : undefined\}/);
  });
});
