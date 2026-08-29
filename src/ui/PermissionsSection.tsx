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
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";

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

/** 사진·좌표·위치·알림 권한을 조회한다. battery는 조회 대상이 아님(`unknown`). */
async function readStates(ports: OnboardingPorts): Promise<Record<PermissionKey, RowState>> {
  const [photos, photoLocation, location, notifications] = await Promise.all([
    ports.photo.photoPermission().catch(() => "unknown" as const),
    ports.photo.locationPermission().catch(() => "unknown" as const),
    ports.location.status().catch(() => "unknown" as const),
    ports.notification.getPermission().catch(() => "unknown" as const),
  ]);
  return {
    photos,
    "photo-location": photoLocation,
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
        case "photo-location":
          await ports.photo.requestLocationPermission();
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
    <View style={styles.section} testID="permissions-section">
      <Text style={styles.title}>권한</Text>

      {states === null ? (
        <Text style={styles.hint}>확인 중…</Text>
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
            <View key={req.key} style={styles.row} testID={`permission-row-${req.key}`}>
              <Text style={styles.name}>{req.rationale}</Text>
              {!isBattery && state !== "unknown" && (
                <Text style={styles.state}>{describe(state)}</Text>
              )}

              {isBattery && (
                <>
                  <Text style={styles.hint}>{req.ifDenied}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void openSettings("battery-exception")}
                    style={styles.link}
                    testID="permission-battery-open-settings"
                  >
                    <Text style={styles.linkText}>배터리 예외 설정</Text>
                  </Pressable>
                </>
              )}

              {!isBattery && (state === "denied" || state === "undetermined") && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void requestFor(req.key)}
                  style={styles.link}
                  testID={`permission-${req.key}-request`}
                >
                  <Text style={styles.linkText}>허용</Text>
                </Pressable>
              )}

              {!isBattery && state === "blocked" && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void openSettings(req.key)}
                  style={styles.link}
                  testID={`permission-${req.key}-open-settings`}
                >
                  <Text style={styles.linkText}>설정 열기</Text>
                </Pressable>
              )}

              {!isBattery && showFullAccessLink && (
                <>
                  <Text style={styles.hint}>그날의 사진 전부를 보지 못할 수 있어요.</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void openSettings(req.key)}
                    style={styles.link}
                    testID={`permission-${req.key}-open-settings`}
                  >
                    <Text style={styles.linkText}>전체 허용</Text>
                  </Pressable>
                </>
              )}
            </View>
          );
        })
      )}

      <Pressable
        accessibilityRole="button"
        onPress={onRestartOnboarding}
        style={styles.link}
        testID="permission-restart-onboarding"
      >
        <Text style={styles.linkText}>권한 안내 다시 보기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { padding: 20, gap: 14 },
  title: { fontSize: 15, fontWeight: "600" },
  row: { gap: 4 },
  name: { fontSize: 14, lineHeight: 20 },
  state: { fontSize: 13, opacity: 0.7 },
  hint: { fontSize: 12, opacity: 0.6, lineHeight: 18 },
  link: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  linkText: { fontSize: 13 },
});
