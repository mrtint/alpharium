/**
 * 설정 "권한" 섹션 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-screen.md
 *       S2
 *       spec.md FR-015·FR-016·FR-017·FR-018·FR-019·FR-020, SC-005·SC-006
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 020의 "설정" 탭 안에 있다 — **prod에도 있는 사용자 화면**(진단 화면의
 * `PermissionPanel`은 dev 전용, 별개).
 *
 * 각 권한의 현재 상태 + 거부/`blocked` 권한의 OS 설정 링크(FR-017) + 배터리 예외
 * 상시 링크(FR-018) + 온보딩 재실행(FR-019)을 한자리에 모은다.
 *
 * **포그라운드 복귀 시 재조회**(FR-020, SC-006) — 사용자가 OS 설정에서 권한을
 * 바꾸고 돌아온 경우를 반영한다.
 *
 * **모델 정보 없음**(원칙 III) — `expo-*`를 직접 import하지 않고 통로를 주입받는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, View } from "react-native";

import { AppText } from "./components/Text";
import { Card } from "./components/Card";
import { SectionHeader } from "./components/SectionHeader";
import { COLORS } from "./theme/tokens";
import { describePhotoAccessLimit } from "../onboarding/decision";
import type { OnboardingPorts } from "./OnboardingScreen";
import type { PermissionKey, PermissionRequirement } from "../onboarding/requirements";
import type { PermissionState } from "../signals/port";

export type PermissionsSectionProps = {
  platform: "android" | "ios";
  requirements: readonly PermissionRequirement[];
  ports: OnboardingPorts;
  /** [온보딩 다시 하기] — App.tsx가 온보딩 화면을 강제 마운트한다 (FR-019). */
  onRestartOnboarding: () => void;
};

type RowState = PermissionState | "unknown";

/** 사진·위치·알림 권한을 조회한다. battery는 조회 대상이 아님(`unknown`). */
async function readStates(ports: OnboardingPorts): Promise<Record<PermissionKey, RowState>> {
  const [photos, location, notifications] = await Promise.all([
    ports.photo.photoPermission().catch(() => "unknown" as const),
    ports.location.status().catch(() => "unknown" as const),
    ports.notification.getPermission().catch(() => "unknown" as const),
  ]);
  return {
    photos,
    location,
    notifications,
    "battery-exception": "unknown",
  };
}

function describe(state: RowState): string {
  switch (state) {
    case "granted":
      return "허용됨";
    case "limited":
      return "일부만 허용됨";
    case "denied":
      return "거부됨 — 다시 요청할 수 있어요";
    case "blocked":
      return "거부됨 — 설정에서 직접 바꿔야 해요";
    case "undetermined":
      return "아직 묻지 않음";
    case "unknown":
      return "";
  }
}

export function PermissionsSection({
  platform,
  requirements,
  ports,
  onRestartOnboarding,
}: PermissionsSectionProps) {
  const [states, setStates] = useState<Record<PermissionKey, RowState> | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const next = await readStates(ports);
    if (alive.current) setStates(next);
  }, [ports]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    // 포그라운드 복귀 시 재조회 (FR-020, SC-006).
    const sub = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") void refresh();
    });
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [refresh]);

  const requestFor = useCallback(
    async (key: PermissionKey) => {
      switch (key) {
        case "photos":
          await ports.photo.requestPhotoPermission();
          break;
        case "location":
          await ports.location.request();
          break;
        case "notifications":
          await ports.notification.ensureChannel().catch(() => {});
          await ports.notification.requestPermission();
          break;
        case "battery-exception":
          await ports.battery.openSettingsList();
          break;
      }
      await refresh();
    },
    [ports, refresh],
  );

  const openSettings = useCallback(
    async (key: PermissionKey) => {
      if (key === "battery-exception") await ports.battery.openSettingsList();
      else await ports.osSettings.openAppSettings();
    },
    [ports],
  );

  const rows = requirements
    .filter((r) => r.platforms.includes(platform))
    .slice()
    .sort((a, b) => a.order - b.order);

  return (
    <View className="gap-3.5" style={SECTION} testID="permissions-section">
      <SectionHeader>권한</SectionHeader>

      {states === null ? (
        <AppText variant="caption">확인 중…</AppText>
      ) : (
        rows.map((req) => {
          const state = states[req.key];
          const isBattery = req.key === "battery-exception";
          const photoLimit =
            req.key === "photos"
              ? describePhotoAccessLimit({
                  state: state === "unknown" ? "undetermined" : state,
                  visiblePhotoCount: null,
                })
              : "full";
          const showFullAccessLink = photoLimit === "partial" || state === "limited";

          return (
            <Card
              key={req.key}
              className="gap-1"
              style={CARD_ROW}
              testID={`permission-row-${req.key}`}
            >
              <AppText variant="body">{req.rationale}</AppText>
              {!isBattery && state !== "unknown" && (
                <AppText variant="caption">{describe(state)}</AppText>
              )}

              {isBattery && (
                <>
                  <AppText variant="caption">{req.ifDenied}</AppText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void openSettings("battery-exception")}
                    className="py-2 px-3 rounded-md border border-border self-start"
                    style={LINK}
                    testID="permission-battery-open-settings"
                  >
                    <AppText variant="caption">배터리 예외 설정</AppText>
                  </Pressable>
                </>
              )}

              {!isBattery && (state === "denied" || state === "undetermined") && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void requestFor(req.key)}
                  className="py-2 px-3 rounded-md border border-border self-start"
                  style={LINK}
                  testID={`permission-${req.key}-request`}
                >
                  <AppText variant="caption">허용</AppText>
                </Pressable>
              )}

              {!isBattery && state === "blocked" && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void openSettings(req.key)}
                  className="py-2 px-3 rounded-md border border-border self-start"
                  style={LINK}
                  testID={`permission-${req.key}-open-settings`}
                >
                  <AppText variant="caption">설정 열기</AppText>
                </Pressable>
              )}

              {!isBattery && showFullAccessLink && (
                <>
                  <AppText variant="caption">그날의 사진 전부를 보지 못할 수 있어요.</AppText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void openSettings(req.key)}
                    className="py-2 px-3 rounded-md border border-border self-start"
                    style={LINK}
                    testID={`permission-${req.key}-open-settings`}
                  >
                    <AppText variant="caption">전체 허용</AppText>
                  </Pressable>
                </>
              )}
            </Card>
          );
        })
      )}

      <Pressable
        accessibilityRole="button"
        className="py-2 px-3 rounded-md border border-border self-start"
        onPress={onRestartOnboarding}
        style={LINK}
        testID="permission-restart-onboarding"
      >
        <AppText variant="caption">권한 안내 다시 보기</AppText>
      </Pressable>
    </View>
  );
}

/**
 * 034 — 색은 tokens.ts에서(032 패턴). NativeWind 변환은 Metro 시점이라 jest에
 * 없으므로 인라인 `style`을 함께 준다.
 *
 * **`SECTION`에 좌우·상하 padding이 없다**(OQ-2 / ES14) — 좌우는 `App.tsx`의
 * `settingsSection`(`paddingHorizontal: 20`) 래퍼가, 섹션 상하 간격은 `App.tsx`
 * 조립부가 형제 섹션 사이에서 관리한다(`AuthorPicker`·`VisionPicker`와 동일).
 *
 * **각 권한 행은 `Card`로 감싼다**(OQ-3 / ES13) — `Card` 기본 `padding: 16`을
 * `CARD_ROW`의 12로 오버라이드해 현행 행 여백(`AuthorPicker` `paddingVertical: 12`)에
 * 맞춘다. `Card` 컴포넌트 자체는 무변경.
 */
const SECTION = { gap: 14 } as const;

const CARD_ROW = { padding: 12, gap: 4 } as const;

const LINK = {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 6,
  alignSelf: "flex-start",
} as const;
