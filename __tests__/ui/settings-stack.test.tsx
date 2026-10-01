/**
 * 055 — 홈 위에 쌓이는 하위 화면 겹(`StackLayer`)과 `App.tsx` 조립.
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md S1·S6·S7·S8·F6·D3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **jest는 배선만 본다**(C9) — reanimated 목은 `useAnimatedStyle`이 빈 스타일이라 겹이 실제로 밀려 들어오는지는
 * 실기기 녹화로 본다. 여기서는 (1) 밀리는 목표값을 순수 함수로, (2) 마운트·언마운트 시각을 fake timers로,
 * (3) 뒤로 가기 등록을 `BackHandler` 스파이로 잠근다.
 *
 * `App.tsx`의 `AppFrame`은 jest에서 그리기엔 무거워(048 home-navigation 머리 주석) 조립은 소스를 읽어 잠근다.
 * 소스는 주석을 걷은 뒤 본다 — 주석은 무엇을 왜 금지하는지 적으므로 금지어가 정당하게 나온다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render, screen } from "@testing-library/react-native";
import { BackHandler, Text } from "react-native";

import { SETTINGS } from "../../src/ui/theme/tokens";
import { slideTarget, StackLayer } from "../../src/ui/StackLayer";

jest.setTimeout(30000);

type BackListener = () => boolean | null | undefined;

/** 등록·해제를 붙잡는다. `mockRestore`하지 않는다(AGENTS — jest-expo 스파이 복원 함정과 같은 계열). */
function captureBackHandlers() {
  const live = new Set<BackListener>();
  jest.spyOn(BackHandler, "addEventListener").mockImplementation(((
    event: string,
    fn: BackListener,
  ) => {
    if (event === "hardwareBackPress") live.add(fn);
    return { remove: () => live.delete(fn) };
  }) as never);
  return live;
}

function last(live: Set<BackListener>): BackListener | undefined {
  return [...live].at(-1);
}

describe("055 S7 — 겹이 밀리는 목표값", () => {
  it("열리면 0, 닫히면 화면 폭이다 (오른쪽에서 들어와 오른쪽으로 나간다)", () => {
    expect(slideTarget(true, 412)).toBe(0);
    expect(slideTarget(false, 412)).toBe(412);
  });
});

describe("055 S6·S7 — StackLayer", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("닫혀 있으면 아무것도 그리지 않고 뒤로 가기도 등록하지 않는다", async () => {
    const live = captureBackHandlers();
    await render(
      <StackLayer onClose={() => {}} open={false}>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    expect(screen.queryByText("설정 내용")).toBeNull();
    expect(live.size).toBe(0);
  });

  it("★ S6 — 열려 있는 동안 뒤로 가기를 가로채 onClose를 부르고 true를 돌려준다", async () => {
    const live = captureBackHandlers();
    const onClose = jest.fn();
    await render(
      <StackLayer onClose={onClose} open>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    expect(screen.getByText("설정 내용")).toBeTruthy();
    expect(live.size).toBe(1);
    let handled: boolean | null | undefined;
    await act(async () => {
      handled = last(live)?.();
    });
    expect(handled).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("★ S6 — active가 거짓이면(위에 다른 겹) 등록하지 않고, 참이 되면 등록한다", async () => {
    const live = captureBackHandlers();
    const view = await render(
      <StackLayer active={false} onClose={() => {}} open>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    expect(live.size).toBe(0);
    await view.rerender(
      <StackLayer active onClose={() => {}} open>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    expect(live.size).toBe(1);
  });

  it("★ S7 — 닫히면 움직임 시간 동안 마운트돼 있다가 그 뒤에 언마운트한다", async () => {
    const live = captureBackHandlers();
    const onSettled = jest.fn();
    const view = await render(
      <StackLayer onClose={() => {}} onSettled={onSettled} open>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    expect(onSettled).toHaveBeenLastCalledWith(true);

    await view.rerender(
      <StackLayer onClose={() => {}} onSettled={onSettled} open={false}>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    // 닫히는 중 — 아직 그려져 있다(홈이 덮인 채다, FR-007).
    expect(screen.getByText("설정 내용", { includeHiddenElements: true })).toBeTruthy();
    expect(onSettled).not.toHaveBeenLastCalledWith(false);
    // 닫히는 중에는 뒤로 가기를 가로채지 않는다 — 이미 닫는 중이다.
    expect(live.size).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(SETTINGS.slideMs);
    });
    expect(screen.queryByText("설정 내용", { includeHiddenElements: true })).toBeNull();
    expect(onSettled).toHaveBeenLastCalledWith(false);
  });

  it("★ 연타 — 열리는 도중에 닫으면 닫힘으로 바뀌고 움직임 시간 뒤 언마운트된다", async () => {
    captureBackHandlers();
    const view = await render(
      <StackLayer onClose={() => {}} open>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    await act(async () => {
      jest.advanceTimersByTime(SETTINGS.slideMs / 2);
    });
    await view.rerender(
      <StackLayer onClose={() => {}} open={false}>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    await act(async () => {
      jest.advanceTimersByTime(SETTINGS.slideMs);
    });
    expect(screen.queryByText("설정 내용", { includeHiddenElements: true })).toBeNull();
  });

  it("닫히는 도중 다시 열면 언마운트하지 않는다", async () => {
    captureBackHandlers();
    const view = await render(
      <StackLayer onClose={() => {}} open>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    await view.rerender(
      <StackLayer onClose={() => {}} open={false}>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    await view.rerender(
      <StackLayer onClose={() => {}} open>
        <Text>설정 내용</Text>
      </StackLayer>,
    );
    await act(async () => {
      jest.advanceTimersByTime(SETTINGS.slideMs * 2);
    });
    expect(screen.getByText("설정 내용")).toBeTruthy();
  });
});

/* ─────────────────────────── App.tsx 조립 (소스) ─────────────────────────── */

const app = readFileSync(join(__dirname, "../../App.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "")
  .replace(/\{\s*\}/g, "{}");

function functionBody(name: string): string {
  const start = app.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = app.indexOf("\nfunction ", start + 1);
  return app.slice(start, next === -1 ? undefined : next);
}

describe("★ 055 — App.tsx 조립 (소스 검사)", () => {
  it("★ S1 — 홈을 route 삼항으로 바꿔 끼우지 않는다: DiarySection은 늘 한 번 그려진다", () => {
    const frame = functionBody("AppFrame");
    expect(frame).not.toMatch(/route === "home" \?/);
    expect(frame.match(/<DiarySection\b/g)?.length).toBe(1);
  });

  it("S2 — 겹이 열려 있거나 닫히는 중이면 홈에 covered가 간다", () => {
    const frame = functionBody("AppFrame");
    expect(frame).toMatch(/covered=\{homeCovered\}/);
    expect(frame).toMatch(/const homeCovered =/);
    expect(functionBody("DiarySection")).toMatch(/covered=\{covered\}/);
  });

  it("설정 겹은 SettingsFrame(‹ 일기 · 설정)이고 닫기는 goHome이다", () => {
    const frame = functionBody("AppFrame");
    expect(frame).toMatch(/<StackLayer[^>]*open=\{route === "settings"\}/);
    expect(frame).toMatch(
      /<SettingsFrame\s+backLabel=\{SETTINGS_TEXT\.back\}\s+onBack=\{goHome\}\s+title=\{SETTINGS_TEXT\.title\}/,
    );
  });

  it("개발자 겹은 showsDiagnostics 조건 안에서만 열린다 (048 FR-024)", () => {
    const frame = functionBody("AppFrame");
    expect(frame).toMatch(/open=\{showsDiagnostics && route === "developer"\}/);
  });

  it("S8 — 알림 응답은 홈으로 돌아온다 (020)", () => {
    const frame = functionBody("AppFrame");
    const onResponse = frame.slice(frame.indexOf("onResponse("));
    expect(onResponse.slice(0, 400)).toContain('setRoute("home")');
  });

  it("SubScreenFrame은 없어졌다 — StackLayer가 대신한다", () => {
    expect(app).not.toContain("SubScreenFrame");
  });
});

describe("★ 055 F6·D3 — 설정에서 걷은 것과 「모듈 다시 받기」 (소스)", () => {
  it("F6 — 설정 조립에 캐릭터 목록·작성자 고르기·설명 카드형 권한 섹션·온보딩 다시 하기가 없다", () => {
    for (const absent of [
      "<CharacterListScreen",
      "<AuthorPicker",
      "<PermissionsSection",
      "onRestartOnboarding",
      "setForceOnboarding(true)",
      "openSettingsList",
      "function ModelSection",
    ]) {
      expect(app).not.toContain(absent);
    }
    expect(functionBody("SettingsSection")).toMatch(/<SettingsScreen\b/);
  });

  it("★ D3 — onRedownload는 다운로드 시작 ref와 완료 확인을 되돌린 뒤 필수 에셋을 다시 읽는다", () => {
    const frame = functionBody("AppFrame");
    const start = frame.indexOf("const onRedownload = useCallback(");
    expect(start).toBeGreaterThanOrEqual(0);
    const body = frame.slice(start, start + 600);
    const reset = body.indexOf("essentialDownloadStarted.current = false");
    const confirm = body.indexOf("setDownloadProceedConfirmed(false)");
    const read = body.indexOf("essentialAssets.readFacts()");
    expect(reset).toBeGreaterThan(0);
    expect(confirm).toBeGreaterThan(0);
    expect(read).toBeGreaterThan(Math.max(reset, confirm));
    expect(frame).toMatch(/onRedownload=\{onRedownload\}/);
  });

  it("이름 바꾸기 겹이 열린 동안 설정 겹은 뒤로 가기를 등록하지 않는다(active), 저장은 035 검증을 거친다", () => {
    const frame = functionBody("AppFrame");
    expect(frame).toMatch(/active=\{!renaming\}/);
    expect(frame).toMatch(/<StackLayer onClose=\{closeRename\} open=\{renaming\}>/);
    expect(frame).toMatch(/onRenameCharacter\(ONBOARDING_DEFAULT_CHARACTER, raw\)/);
  });
});

describe("★ 055 실기기 결함 — 환경 판정은 마운트 때 한 번 (소스)", () => {
  /*
   * `currentEnvironment()`는 부를 때마다 새 객체다. `DiarySection`이 렌더마다 부르면 `DiaryHomeScreen`의 `resolution`이
   * 바뀌어 화면이 처음 상태로 돌아간다 — 설정을 여는 순간(홈이 다시 그려진다) 쓰는 중이 안 쓴 날로 돌아가고 생성은
   * 뒤에서 계속 돌았다(2026-10-01 실기기). jest의 `covered` 테스트는 같은 `resolution` 상수로 다시 그려 이것을 못 잡았다.
   */
  it("AppFrame·DiarySection 모두 useState 초기화로 한 번만 읽는다", () => {
    for (const name of ["AppFrame", "DiarySection"]) {
      const body = functionBody(name);
      expect(body).toMatch(/const \[environment\] = useState\(\(\) => currentEnvironment\(\)\)/);
      expect(body).not.toMatch(/const environment = currentEnvironment\(\)/);
    }
  });
});
