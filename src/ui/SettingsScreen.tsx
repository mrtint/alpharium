/**
 * 설정 화면의 내용 (055, 보드 `6c` ② ③토글 ④ ⑤표시).
 *
 * 계약: specs/055-settings-entry-frame/contracts/settings-stack.md F3~F5·C1~C8
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정하지 않는다** — 이름·토글 상태·권한 꼬리표·버전 문자열을 조립부(`App.tsx`)에서 받아 그린다. 권한 꼬리표는
 * `permissionTagFor`(src/app)가 이미 정했고, 이 화면은 `expo-*`에도 로스터에도 닿지 않는다(원칙 III, 007 헌법 검사).
 *
 * 묶음은 넷 — 캐릭터 · 일기 · 권한 · 정보(FR-016). 「일기」 묶음의 토글 아래(`diaryExtras`)에는 §3.2가 행으로 옮기기
 * 전까지 지금의 시각 선택과 장소명을 그대로 둔다(FR-019). 「이 휴대폰」(§3.4)·말투(S1)는 없다.
 *
 * 묶음 머리·행·토글·꼬리표 부품은 이 파일 안에 둔다 — 공용화는 그것이 필요한 조각의 몫이다(C7).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ReactNode } from "react";
import { Pressable, View, type TextStyle, type ViewStyle } from "react-native";

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
  /** 토글 아래 — §3.2 전까지의 시각 선택·장소명(FR-019) */
  diaryExtras?: ReactNode;
  permissionTags: Record<TaggedPermission, PermissionTag>;
  /** 네 행 모두 — 이 앱의 안드로이드 앱 정보 화면(FR-026) */
  onOpenAppSettings: () => void;
  /** 「1.0.0 (9)」. 읽지 못했으면 `null` — 값을 비운다 */
  versionText: string | null;
};

export function SettingsScreen({
  characterName,
  onOpenRename,
  autoWriteEnabled,
  onToggleAutoWrite,
  diaryExtras,
  permissionTags,
  onOpenAppSettings,
  versionText,
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
        {diaryExtras}
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
  trailing,
  onPress,
  testID,
}: {
  label: string;
  hint?: string;
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
        {hint !== undefined && <AppText style={HINT}>{hint}</AppText>}
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

/** 토글 — 44×26, 안쪽 3. 켜짐 = accent 면 + 오른쪽 손잡이, 꺼짐 = 회색 면 + 왼쪽 손잡이(055 Clarification) */
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
        style={{ width: toggle.knob, height: toggle.knob, backgroundColor: COLORS.bg }}
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
