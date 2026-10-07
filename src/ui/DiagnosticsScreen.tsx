/**
 * 진단 화면 — 개발자가 실기기에서 상태를 눈으로 확인한다 (보드 `6h`, 060).
 *
 * 계약: specs/060-diagnostics-screen/contracts/diagnostics.md DS1~DS11
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정하지 않고 파이프라인을 만들지 않는다** — 값(문자열·태그)과 핸들러를 조립부(`App.tsx`의 진단 겹)에서 받아 그린다. 059
 * `DeveloperScreen`과 같은 방식이다. 옛 화면은 모듈 최상단에서 `createAppPipeline`을 만들고 진단 안에서 일기를 돌렸는데, 그래서
 * 「지금 한 번 써 보기」가 제품 경로와 달랐다(042). 지금은 홈의 제자리 쓰기(054)로 넘어간다(`onTryOnce`).
 *
 * **헌법 원칙 IV** — 추론 속도·출력 점수·모델 비교를 넣지 않는다. 걸린 시간 같은 측정값도 두지 않는다. **원칙 III** — 모델 이름·
 * 파라미터 수·양자화 표기를 어디에도 두지 않는다(옛 캐릭터별 모델 줄은 보드에 없어 지웠다).
 *
 * 개발 환경에서만 닿는다 — 진입은 059가 두었고(개발자 화면의 「진단」 행) 배포 환경에는 행도 트리도 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, View, type TextStyle, type ViewStyle } from "react-native";

import { DIAGNOSTICS_TEXT as T } from "../app/diagnostics-text";
import type {
  EnvironmentLines,
  FailureLine,
  PhotoPermissionLines,
  ProbeCell,
} from "../app/diagnostics-view";
import type { PromptPreview } from "../diagnostics/types";
import { ProbeGrid, PromptPreviewBox } from "./DiagnosticsParts";
import { AppText } from "./components/Text";
import { SIMULATION_TEXT } from "./developer-text";
import { SETTINGS_TEXT } from "./settings-text";
import { text } from "../i18n/current";
import { Group, Row, Value } from "./SettingsScreen";
import { COLORS } from "./theme/tokens";

/** 자동 쓰기 한 번의 결과 — 진단은 스케줄 계층 타입에 닿지 않는다(DS8) */
export type AutoRunResult = "ran" | "skipped" | "failed";

export type DiagnosticsScreenProps = {
  /** 아직 읽지 못했으면 `null` — 값을 비운다 */
  environment: EnvironmentLines | null;
  /** 062 FR-011b — 「감지한 기기 언어 → 고른 화면 언어」 한 줄(`languageLine()`). 주지 않으면 값을 비운다 */
  language?: string;
  /** 저장 점검 행 값 — 점검 전·점검하지 못함은 빈 문자열이다 */
  storage: string;
  onInspectStorage: () => void;
  photo: PhotoPermissionLines | null;
  /** 사진 읽기 행을 눌러 권한을 물을 수 있는 상태인가(`blocked`·허용 상태에서는 아니다) */
  canRequestPhoto: boolean;
  onRequestPhoto: () => void;
  /** 읽기 전에는 `null` */
  probe: readonly ProbeCell[] | null;
  onRefreshProbe: () => void;
  /** 프리셋 id → 미리보기 (진단 계층이 조립한 문자열) */
  previews: Readonly<Record<string, PromptPreview>> | null;
  onTryOnce: () => void;
  onRunAuto: () => void;
  autoRunning: boolean;
  autoResult: AutoRunResult | null;
  /** 최신이 위 */
  failures: readonly FailureLine[];
  /**
   * 064 — 상태 흉내가 켜져 있다(S8). 참이면 두 쓰기 버튼에 콜백을 넘기지 않고(058 — 누를 수 없는 것은 `onPress`도 없다) 흐리게 그리며 아래에
   * 차단 문구를 보인다. 홈·백그라운드도 각각 막는다 — 이 화면은 첫 방어다.
   */
  writeBlocked?: boolean;
};

/** 보드 `6h`는 권한 값을 고정폭 글자로만 적는다(꼬리표 모양이 아니다) — 말은 설정과 같은 한국어 */
const PERMISSION_TEXT = {
  allowed: SETTINGS_TEXT.permAllowed,
  partial: SETTINGS_TEXT.permPartial,
  denied: SETTINGS_TEXT.permDenied,
} as const;

/** 064 — 차단 문구(설정 행 보조 줄과 같은 크기·색) */
const BLOCKED_TEXT: TextStyle = { marginTop: 8, fontSize: 13, color: COLORS.textMuted };

const BUTTON: ViewStyle = {
  height: 48,
  borderRadius: 6,
  alignItems: "center",
  justifyContent: "center",
};
const BUTTON_TEXT: TextStyle = { fontSize: 15, fontWeight: "700" };

/** 062 — 모듈을 불러올 때 문구를 읽지 않게 함수로 둔다(contracts C4) */
function autoText(result: AutoRunResult): string {
  const byResult: Readonly<Record<AutoRunResult, string>> = {
    ran: T.autoRan,
    skipped: T.autoSkipped,
    failed: T.autoFailed,
  };
  return byResult[result];
}

export function DiagnosticsScreen({
  environment,
  language = "",
  storage,
  onInspectStorage,
  photo,
  canRequestPhoto,
  onRequestPhoto,
  probe,
  onRefreshProbe,
  previews,
  onTryOnce,
  onRunAuto,
  autoRunning,
  autoResult,
  failures,
  writeBlocked = false,
}: DiagnosticsScreenProps) {
  const autoValue = autoRunning ? T.autoRunning : autoResult === null ? "" : autoText(autoResult);

  return (
    <View testID="diagnostics-screen">
      <Group first label={T.env} testID="diagnostics-group-env">
        <Row
          label={T.build}
          testID="diagnostics-build"
          trailing={<Value mono text={environment?.build ?? ""} />}
        />
        <Row
          label={T.device}
          testID="diagnostics-device"
          trailing={<Value mono text={environment?.device ?? ""} />}
        />
        <Row
          label={T.inference}
          testID="diagnostics-inference"
          trailing={<Value mono text={environment?.inference ?? ""} />}
        />
        <Row
          label={text().diagnosticsLanguage.label}
          testID="diagnostics-language"
          trailing={<Value mono text={language} />}
        />
      </Group>

      <Group label={T.storage} testID="diagnostics-group-storage">
        <Row
          label={T.storage}
          onPress={onInspectStorage}
          testID="diagnostics-storage"
          trailing={
            <View testID="diagnostics-storage-value">
              <Value chevron mono text={storage} />
            </View>
          }
        />
      </Group>

      <Group label={T.photoPerm} testID="diagnostics-group-photo">
        <Row
          label={T.photoRead}
          // 요청할 수 없는 상태에서는 콜백도 넘기지 않는다 — 모양만이 아니라 동작도 막는다(058)
          {...(canRequestPhoto ? { onPress: onRequestPhoto } : {})}
          testID="diagnostics-photo-read"
          trailing={
            photo?.read != null ? (
              <View testID="diagnostics-photo-read-tag">
                <Value mono text={PERMISSION_TEXT[photo.read]} />
              </View>
            ) : undefined
          }
        />
        <Row
          label={T.photoLocation}
          testID="diagnostics-photo-location"
          trailing={
            photo?.location != null ? (
              <View testID="diagnostics-photo-location-tag">
                <Value mono text={PERMISSION_TEXT[photo.location]} />
              </View>
            ) : undefined
          }
        />
        <Row
          label={T.photoScope}
          testID="diagnostics-photo-scope"
          trailing={
            <Value
              mono
              text={
                photo?.scope === "all"
                  ? T.scopeAll
                  : photo?.scope === "selected"
                    ? T.scopeSelected
                    : ""
              }
            />
          }
        />
      </Group>

      <Group
        aside={
          <Pressable
            accessibilityRole="button"
            onPress={onRefreshProbe}
            testID="diagnostics-probe-refresh"
          >
            <AppText style={{ fontSize: 13, fontWeight: "700", textDecorationLine: "underline" }}>
              {T.probeRefresh}
            </AppText>
          </Pressable>
        }
        label={T.probe}
        testID="diagnostics-group-probe"
      >
        <ProbeGrid cells={probe} />
      </Group>

      <Group label={T.prompt} testID="diagnostics-group-prompt">
        <PromptPreviewBox previews={previews} />
      </Group>

      <Group label={T.gen} testID="diagnostics-group-gen">
        {/* 보드 `6h` ⑦: 높이 48·모서리 6의 전폭 버튼 둘 — 위는 테두리, 아래는 검정 면 */}
        <View style={{ gap: 8, opacity: writeBlocked ? 0.35 : 1 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: writeBlocked }}
            {...(writeBlocked ? {} : { onPress: onTryOnce })}
            style={{ ...BUTTON, borderWidth: 1, borderColor: COLORS.text }}
            testID="diagnostics-try-once"
          >
            <AppText style={{ ...BUTTON_TEXT, color: COLORS.text }}>{T.tryOnce}</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            // 도는 동안은 콜백도 넘기지 않는다 — 중복 실행을 막는다
            accessibilityState={{ disabled: writeBlocked }}
            {...(autoRunning || writeBlocked ? {} : { onPress: onRunAuto })}
            style={{ ...BUTTON, backgroundColor: COLORS.text }}
            testID="diagnostics-run-auto"
          >
            <AppText style={{ ...BUTTON_TEXT, color: COLORS.bg }}>{T.runAuto}</AppText>
          </Pressable>
        </View>
        {/* 064 — 흉내 중이면 왜 눌리지 않는지 알린다(문구는 홈 차단 토스트와 같다, 새 문구를 만들지 않는다) */}
        {writeBlocked && (
          <AppText style={BLOCKED_TEXT} testID="diagnostics-write-blocked">
            {SIMULATION_TEXT.blockedToast}
          </AppText>
        )}
        {/* 결과 한 줄 — 보드에는 자리가 없어(보드 밖) 버튼 아래 작은 고정폭 글자로 둔다 */}
        <View style={{ minHeight: 20, marginTop: 6 }} testID="diagnostics-auto-result">
          <Value mono text={autoValue} />
        </View>
      </Group>

      <Group label={T.failures} testID="diagnostics-group-failures">
        {failures.length === 0 ? (
          <Row label={T.failuresEmpty} labelTone="muted" testID="diagnostics-failures-empty" />
        ) : (
          failures.map((line, index) => (
            // 위치가 키다 — 같은 갈래·같은 시각이 이어질 수 있다(035)
            <Row
              key={index}
              label={line.reasonText}
              testID={`diagnostics-failure-${index}`}
              trailing={<Value text={line.timeText} />}
            />
          ))
        )}
      </Group>
    </View>
  );
}
