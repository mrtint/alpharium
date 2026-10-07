/**
 * 개발자 화면의 내용 (059, 보드 `6e` 개발 빌드·`6j` 배포 빌드).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md DV4~DV9·DG2·BD1·BD2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정하지 않는다** — 모듈 줄 문자열·환경(`showsDiagnostics`)·핸들러를 조립부(`App.tsx`)에서 받아 그린다. 모듈 줄은 `src/app/module-lines.ts`가 이미
 * 문자열로 만들었고(원칙 III — 이 화면은 모델·키에 닿지 못한다, `UI_TOUCHES_ASSET`), 「진단」 그룹을 그릴지는 조립부가 `showsOnScreen`으로 정한 값이다
 * (S7). **이 파일은 `DiagnosticsScreen`을 import하지 않는다** — 행만 그리고, 누르면 조립부가 진단 겹을 연다(DG2).
 *
 * 그룹 머리·행·값·›는 설정 화면(`SettingsScreen.tsx`)의 부품을 그대로 쓴다(복제하지 않는다, C7). 확인 대화상자는 조립부가 이 화면 옆에 둔다.
 * 핸들러가 없는 행은 누를 수 없는 행이다(058 — `onPress`도 안 넘긴다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { View } from "react-native";

import { AppText } from "./components/Text";
import type { SimulationState } from "../app/simulation";
import { DEVELOPER_TEXT, SIMULATION_TEXT } from "./developer-text";
import { Chevron, Group, Row, Toggle, Value } from "./SettingsScreen";
import { COLORS, SETTINGS } from "./theme/tokens";

export type DeveloperScreenProps = {
  /** 모듈 줄(「loaded · 610MB」). 읽지 못한 줄은 `null` — 값을 비운다 */
  modules: { reading: string | null; writing: string | null };
  /** 개발 환경에서만 참 — 「진단」 그룹을 그린다(S7) */
  showsDiagnostics: boolean;
  onRedownload?: () => void;
  onReplayOnboarding?: () => void;
  onDisable?: () => void;
  onOpenDiagnostics?: () => void;
  /**
   * 064 — 「상태 흉내」 묶음(보드 `6e` ③). **개발 환경일 때만 조립부가 넘긴다**(S7) — 없으면 묶음 자체가 없다. 화면은 상태를 그리고 누름을
   * 알릴 뿐이다(저장·효력은 `use-simulation.ts`).
   */
  simulation?: {
    state: SimulationState;
    onPressDate: () => void;
    onToggle: (key: SimulationToggle) => void;
  };
};

/** 토글로 켜고 끄는 흉내 셋(날짜는 대화상자로 고른다) */
export type SimulationToggle = "failToast" | "noMaterial" | "noPhoto";

export function DeveloperScreen({
  modules,
  showsDiagnostics,
  onRedownload,
  onReplayOnboarding,
  onDisable,
  onOpenDiagnostics,
  simulation,
}: DeveloperScreenProps) {
  return (
    <View testID="developer-screen">
      <Group first label={DEVELOPER_TEXT.groupModules} testID="developer-group-modules">
        <Row
          label={DEVELOPER_TEXT.readModule}
          testID="developer-module-reading"
          trailing={<Value mono text={modules.reading ?? ""} />}
        />
        <Row
          label={DEVELOPER_TEXT.writeModule}
          testID="developer-module-writing"
          trailing={<Value mono text={modules.writing ?? ""} />}
        />
        <Row
          label={DEVELOPER_TEXT.redownload}
          {...(onRedownload !== undefined ? { onPress: onRedownload } : {})}
          testID="developer-redownload"
          trailing={<Chevron />}
        />
      </Group>

      {showsDiagnostics && (
        <Group
          aside={<DevOnlyAside testID="developer-diag-aside" />}
          label={DEVELOPER_TEXT.groupDiag}
          testID="developer-group-diag"
        >
          <Row
            hint={DEVELOPER_TEXT.diagSummary}
            hintMono
            label={DEVELOPER_TEXT.diag}
            {...(onOpenDiagnostics !== undefined ? { onPress: onOpenDiagnostics } : {})}
            testID="developer-diagnostics"
            trailing={<Chevron />}
          />
        </Group>
      )}

      {simulation !== undefined && (
        <Group
          aside={<DevOnlyAside />}
          label={SIMULATION_TEXT.groupSim}
          testID="developer-group-sim"
        >
          <Row
            label={SIMULATION_TEXT.date}
            onPress={simulation.onPressDate}
            testID="sim-date"
            trailing={<Value chevron mono text={simulation.state.date ?? ""} />}
          />
          <SimulationToggleRow
            label={SIMULATION_TEXT.fail}
            on={simulation.state.failToast}
            onToggle={() => simulation.onToggle("failToast")}
            testID="sim-fail"
          />
          <SimulationToggleRow
            label={SIMULATION_TEXT.empty}
            on={simulation.state.noMaterial}
            onToggle={() => simulation.onToggle("noMaterial")}
            testID="sim-empty"
          />
          <SimulationToggleRow
            label={SIMULATION_TEXT.noPhoto}
            on={simulation.state.noPhoto}
            onToggle={() => simulation.onToggle("noPhoto")}
            testID="sim-nophoto"
          />
        </Group>
      )}

      <Group label={DEVELOPER_TEXT.groupReplay} testID="developer-group-replay">
        <Row
          label={DEVELOPER_TEXT.replayOnboarding}
          {...(onReplayOnboarding !== undefined ? { onPress: onReplayOnboarding } : {})}
          testID="developer-replay-onboarding"
          trailing={<Chevron />}
        />
      </Group>

      {/* 묶음 머리가 없는 맨 아래 한 행(보드 `6e` ⑤) — 위 묶음과 같은 간격만 둔다 */}
      <View style={{ marginTop: SETTINGS.group.marginTop }} testID="developer-group-off">
        <Row
          label={DEVELOPER_TEXT.off}
          {...(onDisable !== undefined ? { onPress: onDisable } : {})}
          testID="developer-off"
        />
      </View>
    </View>
  );
}

/**
 * 묶음 머리 오른쪽 「개발 빌드만」(보드 `6e` ②·③ — 10/600).
 *
 * ★ 보드는 고정폭 글꼴이지만 **고정폭으로 두면 안드로이드가 한글을 좁게 재서 「개발」만 보이고 나머지가 잘린다**(2026-10-07 실기기 — 머리 줄의 가로
 * 배치에서 잰 폭 147px에 여섯 글자가 안 들어가 두 줄로 접힌 뒤 한 줄 높이에서 잘렸다. 060부터 진단 묶음에도 있던 결함). 글꼴을 빼면 다 보인다.
 * 세로 묶음의 보조 줄(`hintMono`)은 폭이 넉넉해 드러나지 않는다.
 */
function DevOnlyAside({ testID }: { testID?: string }) {
  return (
    <AppText
      style={{
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textMuted,
      }}
      testID={testID}
    >
      {DEVELOPER_TEXT.devOnly}
    </AppText>
  );
}

/** 흉내 토글 한 행 — 설정 「자동으로 쓰기」와 같은 토글(보드 `6e` ③) */
function SimulationToggleRow({
  label,
  on,
  onToggle,
  testID,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  testID: string;
}) {
  return (
    <Row
      label={label}
      testID={testID}
      trailing={
        <Toggle
          accessibilityLabel={label}
          on={on}
          onChange={() => onToggle()}
          testID={`${testID}-toggle`}
        />
      }
    />
  );
}
