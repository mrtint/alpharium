/**
 * 설정 화면의 내용 (055, 보드 `6c` ② ③토글 ④ ⑤표시).
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md F3~F5·C1~C8
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정하지 않는다** — 이름·토글 상태·권한 꼬리표·버전 문자열을 조립부(`App.tsx`)에서 받아 그린다. 권한 꼬리표는
 * `permissionTagFor`(src/app)가 이미 정했고, 이 화면은 `expo-*`에도 로스터에도 닿지 않는다(원칙 III, 007 헌법 검사).
 *
 * 묶음은 넷 — 캐릭터 · 일기 · 권한 · 정보(FR-016). 「이 휴대폰」(§3.4)·말투(S1)는 없다.
 *
 * 056 — 「일기」 묶음은 자동으로 쓰기 토글 → 「매일 쓰는 시각」(토글이 켜졌을 때만 펼쳐진다) → 「장소 이름으로 보기」(늘)다
 * (보드 `6c` ③, specs/056-settings-time-place FR-001~FR-006·FR-019). 값 문자열은 조립부가 `src/app/target-hour.ts`로 만들어
 * 넘기고, 누르면 조립부가 대화상자를 연다. 055가 임시로 두었던 자리(옛 24칸 시각 목록·장소명 카드)는 걷었다.
 *
 * 057 — 사진 권한 때문에 자동 쓰기를 건너뛴 날이 있으면 사진 행 라벨 아래에 빨간 보조 줄 하나(보드 `6g`). 문장과 「그릴지」는
 * 조립부가 정한다(`skippedLineText`, 사진 꼬리표가 「허용 안 함」일 때만) — 이 화면은 받은 글자를 그린다.
 *
 * 묶음 머리·행·토글·꼬리표 부품은 이 파일 안에 둔다 — 공용화는 그것이 필요한 조각의 몫이다(C7).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, type ReactNode } from "react";
import { Pressable, View, type TextStyle, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import type { PermissionTag, TaggedPermission } from "../app/permission-tags";
import { AppText } from "./components/Text";
import { SETTINGS_TEXT } from "./settings-text";
import { COLORS, SETTINGS } from "./theme/tokens";

const { group, row, tag, toggle } = SETTINGS;

export type SettingsScreenProps = {
  /** 지금 부르는 캐릭터 이름 — 조립부가 `displayNameOf()`로 만든 문자열 */
  characterName: string;
  onOpenRename: () => void;
  autoWriteEnabled: boolean;
  onToggleAutoWrite: (enabled: boolean) => void;
  /** 056 — 「매일 쓰는 시각」 행 값(「오후 10시쯤」). 토글이 꺼져도 지우지 않는다(FR-003) */
  targetHourText: string;
  onOpenTargetHour: () => void;
  /** 056 — 「장소 이름으로 보기」 행 값(「자동」·「켬」·「끔」) */
  placeNamesText: string;
  onOpenPlaceNames: () => void;
  permissionTags: Record<TaggedPermission, PermissionTag>;
  /** 네 행 모두 — 이 앱의 안드로이드 앱 정보 화면(FR-026) */
  onOpenAppSettings: () => void;
  /** 「1.0.0 (9)」. 읽지 못했으면 `null` — 값을 비운다 */
  versionText: string | null;
  /** 057 — 사진 행의 건너뜀 보조 줄(보드 `6g`). 없으면 그리지 않는다 */
  photoSkipText?: string;
};

export function SettingsScreen({
  characterName,
  onOpenRename,
  autoWriteEnabled,
  onToggleAutoWrite,
  targetHourText,
  onOpenTargetHour,
  placeNamesText,
  onOpenPlaceNames,
  permissionTags,
  onOpenAppSettings,
  versionText,
  photoSkipText,
}: SettingsScreenProps) {
  return (
    <View testID="settings-screen">
      <Group first label={SETTINGS_TEXT.groupCharacter} testID="settings-group-character">
        <Row
          label={SETTINGS_TEXT.name}
          onPress={onOpenRename}
          testID="settings-name"
          trailing={<Value chevron text={characterName} />}
        />
      </Group>

      <Group label={SETTINGS_TEXT.groupDiary} testID="settings-group-diary">
        <Row
          label={SETTINGS_TEXT.autoWrite}
          trailing={<Toggle on={autoWriteEnabled} onChange={onToggleAutoWrite} />}
        />
        <ExpandingRow open={autoWriteEnabled}>
          <Row
            label={SETTINGS_TEXT.autoWriteTime}
            onPress={onOpenTargetHour}
            testID="settings-target-hour"
            trailing={<Value chevron text={targetHourText} />}
          />
        </ExpandingRow>
        <Row
          label={SETTINGS_TEXT.placeNames}
          onPress={onOpenPlaceNames}
          testID="settings-place-names"
          trailing={<Value chevron text={placeNamesText} />}
        />
      </Group>

      <Group label={SETTINGS_TEXT.groupPerm} testID="settings-group-perm">
        {(
          [
            ["photos", SETTINGS_TEXT.permPhotos],
            ["location", SETTINGS_TEXT.permLocation],
            ["notifications", SETTINGS_TEXT.permNotif],
          ] as const
        ).map(([key, label]) => (
          <Row
            key={key}
            label={label}
            {...(key === "photos" && photoSkipText !== undefined
              ? { hint: photoSkipText, hintTone: "danger" as const }
              : {})}
            onPress={onOpenAppSettings}
            testID={`settings-perm-${key}`}
            trailing={
              <PermissionTrailing tag={permissionTags[key]} testID={`settings-tag-${key}`} />
            }
          />
        ))}
        <Row
          hint={SETTINGS_TEXT.permBatteryHint}
          label={SETTINGS_TEXT.permBattery}
          onPress={onOpenAppSettings}
          testID="settings-perm-battery"
          trailing={<Chevron />}
        />
      </Group>

      <Group label={SETTINGS_TEXT.groupAbout} testID="settings-group-about">
        <Row
          label={SETTINGS_TEXT.version}
          testID="settings-version"
          trailing={<Value text={versionText ?? ""} />}
        />
      </Group>
    </View>
  );
}

/* ─────────────────────────────── 부품 ─────────────────────────────── */

function Group({
  label,
  first,
  children,
  testID,
}: {
  label: string;
  first?: boolean;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID}>
      <AppText
        accessibilityRole="header"
        style={{
          fontSize: group.fontSize,
          fontWeight: group.fontWeight,
          letterSpacing: group.fontSize * group.letterSpacingEm,
          textTransform: "uppercase",
          color: COLORS.accent,
          marginTop: first ? 0 : group.marginTop,
          marginBottom: group.marginBottom,
        }}
        testID={testID === undefined ? undefined : `${testID}-label`}
      >
        {label}
      </AppText>
      {children}
    </View>
  );
}

function Row({
  label,
  hint,
  hintTone = "muted",
  trailing,
  onPress,
  testID,
}: {
  label: string;
  hint?: string;
  /** 057 — 건너뜀 보조 줄은 빨강(보드 `6g` `accent-700` = `COLORS.danger`) */
  hintTone?: "muted" | "danger";
  trailing?: ReactNode;
  onPress?: () => void;
  testID?: string;
}) {
  const style: ViewStyle = {
    minHeight: hint === undefined ? row.minHeight : row.minHeightWithHint,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // 053 교훈 — 글꼴 2.0배에서 라벨과 값이 한 줄에 안 들어가면 줄을 바꾸되 자르지 않는다.
    flexWrap: "wrap",
    gap: row.gap,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  };
  const body = (
    <>
      <View style={{ flexShrink: 1, gap: row.hintGap }}>
        <AppText style={LABEL}>{label}</AppText>
        {hint !== undefined && (
          <AppText style={hintTone === "danger" ? HINT_DANGER : HINT}>{hint}</AppText>
        )}
      </View>
      {trailing}
    </>
  );
  if (onPress === undefined) {
    return (
      <View style={style} testID={testID}>
        {body}
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={style} testID={testID}>
      {body}
    </Pressable>
  );
}

function Value({ text, chevron }: { text: string; chevron?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: row.valueGap }}>
      <AppText style={VALUE}>{text}</AppText>
      {chevron === true && <Chevron />}
    </View>
  );
}

function Chevron() {
  return (
    <AppText
      style={{ fontSize: row.chevronSize, color: SETTINGS.chevron }}
      testID="settings-chevron"
    >
      ›
    </AppText>
  );
}

function PermissionTrailing({ tag: kind, testID }: { tag: PermissionTag; testID: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: row.valueGap }}>
      {kind !== "unread" && <Tag kind={kind} testID={testID} />}
      <Chevron />
    </View>
  );
}

/** 꼬리표 — 허용됨(회색 면) · 일부 허용(회색 테두리) · 허용 안 함(빨강 테두리). 보드 `6c` ④ */
function Tag({ kind, testID }: { kind: Exclude<PermissionTag, "unread">; testID: string }) {
  const text =
    kind === "allowed"
      ? SETTINGS_TEXT.permAllowed
      : kind === "partial"
        ? SETTINGS_TEXT.permPartial
        : SETTINGS_TEXT.permDenied;
  const box: ViewStyle =
    kind === "allowed"
      ? {
          backgroundColor: SETTINGS.tagFill,
          paddingVertical: tag.filledPadding.v,
          paddingHorizontal: tag.filledPadding.h,
        }
      : {
          borderWidth: 1,
          borderColor: kind === "denied" ? COLORS.accent : COLORS.border,
          paddingVertical: tag.outlinedPadding.v,
          paddingHorizontal: tag.outlinedPadding.h,
        };
  const color =
    kind === "allowed" ? SETTINGS.tagText : kind === "denied" ? COLORS.danger : COLORS.textMuted;
  return (
    <View style={box} testID={testID}>
      <AppText style={{ fontSize: tag.fontSize, fontWeight: tag.fontWeight, color }}>
        {text}
      </AppText>
    </View>
  );
}

/**
 * 056 — 토글 아래에서 펼쳐지고 접히는 행(보드 `6c` ③ 「높이 0→44, 200ms」, FR-002).
 *
 * ★ 안쪽 행을 절대 배치로 빼고 감쌈의 높이만 옮긴다 — 안쪽을 흐름에 두고 감쌈 크기를 옮기면 잰 높이가 되먹임으로 줄어든다
 * (052 교훈). 펼친 높이는 안쪽 행이 잰 높이다(기본 글꼴 44, 글꼴이 커지면 그만큼 — 자르지 않는다). 시작값은 마운트 때의 상태로
 * 정한다 — effect에서 되돌리면 첫 프레임이 샌다(049 교훈). 접힌 동안은 누를 수 없고 스크린리더에서 숨는다.
 */
function ExpandingRow({ open, children }: { open: boolean; children: ReactNode }) {
  const [measured, setMeasured] = useState<number>(row.minHeight);
  const height = useSharedValue(open ? measured : 0);
  // 바뀐 뒤에만 움직인다 — 마운트 때는 시작값이 이미 목표와 같아 아무 일도 없다.
  useEffect(() => {
    height.value = withTiming(open ? measured : 0, { duration: SETTINGS.expandMs });
  }, [open, measured, height]);
  const style = useAnimatedStyle(() => ({ height: height.value }));
  return (
    <Animated.View
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      pointerEvents={open ? "auto" : "none"}
      style={[{ overflow: "hidden" }, style]}
      testID="settings-target-hour-wrap"
    >
      <View
        onLayout={(e) => {
          const next = e.nativeEvent.layout.height;
          // 1px 미만의 흔들림은 거른다(052 — 부동소수 같은 값이 773.9999↔774.0001로 되풀이된다).
          if (next > 0 && Math.abs(next - measured) >= 1) setMeasured(next);
        }}
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

/**
 * 토글 — 44×26, 안쪽 3. 켜짐 = accent 면 + 오른쪽 바탕색 손잡이, 꺼짐 = 회색 면 + 왼쪽 진한 손잡이.
 * 꺼짐 손잡이는 056 FR-029가 바탕색에서 `knobOff`로 바꿨다(055 실기기 — 바탕색 손잡이가 회색 면 위에서 거의 안 보였다).
 */
function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable
      accessibilityLabel={SETTINGS_TEXT.autoWrite}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={() => onChange(!on)}
      style={{
        width: toggle.width,
        height: toggle.height,
        padding: toggle.padding,
        flexDirection: "row",
        justifyContent: on ? "flex-end" : "flex-start",
        backgroundColor: on ? COLORS.accent : SETTINGS.tagFill,
      }}
      // 020의 Maestro(`scheduled-diary-notification.yml`)가 이 id로 누른다 — 그대로 둔다.
      testID="auto-diary-toggle"
    >
      <View
        style={{
          width: toggle.knob,
          height: toggle.knob,
          backgroundColor: on ? COLORS.bg : toggle.knobOff,
        }}
        testID="auto-diary-toggle-knob"
      />
    </Pressable>
  );
}

const LABEL: TextStyle = {
  fontSize: row.labelSize,
  fontWeight: row.labelWeight,
  color: COLORS.text,
};
const VALUE: TextStyle = {
  fontSize: row.valueSize,
  color: COLORS.textMuted,
  fontVariant: ["tabular-nums"],
};
const HINT: TextStyle = {
  fontSize: row.hintSize,
  lineHeight: row.hintSize * row.hintLineHeightRatio,
  color: COLORS.textMuted,
};
const HINT_DANGER: TextStyle = { ...HINT, color: COLORS.danger };
