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

import { useState } from "react";
import { View } from "react-native";

import { NameField } from "./components/NameField";
import { AppText } from "./components/Text";
import type { AttemptLine, FailureLine } from "../app/diagnostics-view";
import type { SimulationState } from "../app/simulation";
import { AttemptsGroup } from "./AttemptsGroup";
import { FailuresGroup } from "./FailuresGroup";
import { DEVELOPER_TEXT, FAST_CYCLE_TEXT, SIMULATION_TEXT } from "./developer-text";
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
   * 078 — 최근 자동 쓰기 시도(최신이 위). **배포 빌드에서도 그린다** — 진단 화면은 개발 환경 전용이라, 실제 iPhone(TestFlight)에서
   * 「자동 쓰기가 왜 안 돌았는가」를 읽을 자리는 이 화면뿐이다. 보드 `6e`·`6j`에 없는 묶음이다(소유자 확인 대상).
   */
  attempts: readonly AttemptLine[];
  /**
   * 081 — 최근 쓰기 실패(최신이 위, 까닭의 갈래와 시각). **배포 빌드에서도 그린다** — 위 시도 묶음의 `백그라운드 · 실패`가 어떤
   * 실패였는지를 같은 시각의 줄로 짝지어 읽는 자리다. 보드 `6e`·`6j`에 없는 묶음이다(소유자 승인 2026-10-14).
   */
  failures: readonly FailureLine[];
  /**
   * 085 — 운영체제 예약표에서 읽은 쓸 차례 예약 한 줄(「쓸 차례 알림 · N개 예약 · 다음 M월 d일 H시」). 읽지 못했으면 없다 —
   * 「없음」으로 단정하지 않는다(spec FR-022). 배포 빌드에서도 그린다(TestFlight 스크린샷으로 iOS 예약을 확인할 자리).
   */
  reminderLine?: string;
  /**
   * 064 — 「상태 흉내」 묶음(보드 `6e` ③). **개발 환경일 때만 조립부가 넘긴다**(S7) — 없으면 묶음 자체가 없다. 화면은 상태를 그리고 누름을
   * 알릴 뿐이다(저장·효력은 `use-simulation.ts`).
   */
  simulation?: {
    state: SimulationState;
    onPressDate: () => void;
    onToggle: (key: SimulationToggle) => void;
  };
  /**
   * 106 — 「빠른 주기」 묶음(개발 빌드 전용). **개발 환경일 때만 조립부가 넘긴다** — 없으면 묶음 자체가 없다. 화면은 상태를 그리고 누름을 알릴
   * 뿐이다(저장·효력·검증은 `use-fast-cycle.ts`·조립부). 켜기 확인창(오늘 일기가 있을 때)도 조립부가 이 화면 옆에 둔다.
   */
  fastCycle?: FastCycleSection;
};

/** 106 — 「빠른 주기」 묶음이 그리는 것 */
export type FastCycleSection = {
  on: boolean;
  /** 켜져 있을 때 주기 분 */
  periodMinutes: number | null;
  /** 지금 주기 식별자(`YYYY-MM-DD#순번`) — 꺼져 있으면 `null` */
  cycleId: string | null;
  /** 다음 주기 시작 시각의 표시 문자열(`HH:MM`) — 꺼져 있으면 `null` */
  nextStartText: string | null;
  /** 「자동으로 쓰기」가 켜져 있는가 — 꺼져 있으면 켜 두어도 쓰지 않는다는 안내를 보인다 */
  autoWriteEnabled: boolean;
  /** 켜기를 시도했으나 실패했다(쓰기가 칸을 쥐고 있었다 등) */
  startFailed: boolean;
  onToggle: () => void;
  onSelectPreset: (minutes: number) => void;
  /** 직접 입력을 적용한다. 받아들였으면 참 — 거절이면 화면이 입력 오류를 보인다(검증은 조립부) */
  onSubmitCustom: (text: string) => boolean;
};

/** 프리셋(분) — 스펙 FR-004 */
const FAST_CYCLE_PRESETS = [10, 30, 60] as const;

/** 토글로 켜고 끄는 흉내 셋(날짜는 대화상자로 고른다) */
export type SimulationToggle = "failToast" | "noMaterial" | "noPhoto";

export function DeveloperScreen({
  modules,
  showsDiagnostics,
  onRedownload,
  onReplayOnboarding,
  onDisable,
  onOpenDiagnostics,
  attempts,
  failures,
  reminderLine,
  simulation,
  fastCycle,
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

      {fastCycle !== undefined && <FastCycleGroup section={fastCycle} />}

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

      {/* 078 — 「끄기」 아래에 둔다: 위 행들의 자리가 바뀌지 않는다(보드의 행 순서·실기기 흐름의 스크롤 거리를 건드리지 않는다) */}
      <AttemptsGroup attempts={attempts} idPrefix="developer" />

      {/* 081 — 시도 묶음 바로 아래, 새 맨 아래다: 위 행들의 자리가 바뀌지 않고 스크린샷 한 장에 두 묶음이 함께 찍힌다 */}
      <FailuresGroup failures={failures} idPrefix="developer" />

      {/* 085 — 실패 묶음 아래, 새 맨 아래다: 위 행들의 자리가 바뀌지 않는다 */}
      {reminderLine !== undefined ? (
        <View style={{ marginTop: SETTINGS.group.marginTop }}>
          <Row label={reminderLine} testID="developer-reminder-line" />
        </View>
      ) : null}
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

/** 106 — 「빠른 주기」 묶음 */
function FastCycleGroup({ section }: { section: FastCycleSection }) {
  const [custom, setCustom] = useState("");
  const [invalid, setInvalid] = useState(false);
  const apply = () => {
    const accepted = section.onSubmitCustom(custom);
    setInvalid(!accepted);
    if (accepted) setCustom("");
  };
  return (
    <Group
      aside={<DevOnlyAside />}
      label={FAST_CYCLE_TEXT.group}
      testID="developer-group-fast-cycle"
    >
      <Row
        label={FAST_CYCLE_TEXT.toggle}
        testID="fast-cycle-toggle-row"
        trailing={
          <Toggle
            accessibilityLabel={FAST_CYCLE_TEXT.toggle}
            on={section.on}
            onChange={() => section.onToggle()}
            testID="fast-cycle-toggle"
          />
        }
      />
      {FAST_CYCLE_PRESETS.map((minutes) => (
        <Row
          key={minutes}
          label={FAST_CYCLE_TEXT.preset(minutes)}
          onPress={() => section.onSelectPreset(minutes)}
          testID={`fast-cycle-preset-${minutes}`}
          trailing={
            section.on && section.periodMinutes === minutes ? (
              <Value mono text={FAST_CYCLE_TEXT.selected} />
            ) : undefined
          }
        />
      ))}
      <Row
        label={FAST_CYCLE_TEXT.custom}
        onPress={apply}
        testID="fast-cycle-custom-row"
        trailing={
          <AppText
            accessibilityRole="button"
            style={{ color: COLORS.danger, fontWeight: "600" }}
            testID="fast-cycle-custom-apply"
          >
            {FAST_CYCLE_TEXT.customApply}
          </AppText>
        }
      />
      <View style={{ paddingVertical: 4 }}>
        <NameField
          compact
          counterTestID="fast-cycle-custom-counter"
          inputTestID="fast-cycle-custom-input"
          keyboardType="number-pad"
          maxLength={3}
          onChangeText={(next) => {
            setCustom(next);
            setInvalid(false);
          }}
          onSubmitEditing={apply}
          placeholder={FAST_CYCLE_TEXT.customPlaceholder}
          value={custom}
        />
      </View>
      {invalid && (
        <Row
          label={FAST_CYCLE_TEXT.customInvalid}
          labelTone="danger"
          testID="fast-cycle-custom-error"
        />
      )}
      <Row
        label={FAST_CYCLE_TEXT.currentCycle}
        testID="fast-cycle-current"
        trailing={<Value mono text={section.cycleId ?? ""} />}
      />
      <Row
        label={FAST_CYCLE_TEXT.nextStart}
        testID="fast-cycle-next"
        trailing={<Value mono text={section.nextStartText ?? ""} />}
      />
      {section.on && !section.autoWriteEnabled && (
        <Row label={FAST_CYCLE_TEXT.autoWriteOff} labelTone="muted" testID="fast-cycle-auto-off" />
      )}
      {section.startFailed && (
        <Row
          label={FAST_CYCLE_TEXT.startFailed}
          labelTone="danger"
          testID="fast-cycle-start-failed"
        />
      )}
      <Row label={FAST_CYCLE_TEXT.limits} labelTone="muted" testID="fast-cycle-limits" />
    </Group>
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
