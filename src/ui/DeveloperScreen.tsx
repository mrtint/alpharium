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
import { DEVELOPER_TEXT } from "./developer-text";
import { Chevron, Group, Row, Value } from "./SettingsScreen";
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
};

export function DeveloperScreen({
  modules,
  showsDiagnostics,
  onRedownload,
  onReplayOnboarding,
  onDisable,
  onOpenDiagnostics,
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
        <Group label={DEVELOPER_TEXT.groupDiag} testID="developer-group-diag">
          <Row
            label={DEVELOPER_TEXT.diag}
            {...(onOpenDiagnostics !== undefined ? { onPress: onOpenDiagnostics } : {})}
            testID="developer-diagnostics"
            trailing={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <AppText style={{ fontSize: 12, color: COLORS.textMuted }}>
                  {DEVELOPER_TEXT.devOnly}
                </AppText>
                <Chevron />
              </View>
            }
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
