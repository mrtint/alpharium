/**
 * 통합 권한 온보딩 화면 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-screen.md
 *       S1
 *       spec.md FR-005~FR-008·FR-013·FR-015·FR-016, SC-001·SC-003·SC-008
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **판정은 화면이 하지 않는다.** `planOnboardingSteps`·`nextStep`(순수)이 정하고,
 * 화면은 통로를 부르고 재조회할 뿐이다. 007의 `CharacterPicker`, 020의
 * `AutoDiarySettingsScreen`이 그리기만 하는 것과 같은 구조.
 *
 * **고정 순서, 뒤로 가기 없음**(spec Clarifications). 단계 완료는 저장하지 않고
 * 매번 실시간 권한 상태로 재판정한다.
 *
 * **생성 트리거·진행률 없음**(원칙 IV) — 이 화면은 권한만 다룬다.
 *
 * **모델 정보 없음**(원칙 III) — `expo-*`를 직접 import하지 않고 통로를 주입받는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  nextStep,
  planOnboardingSteps,
  type OnboardingFlag,
  type OnboardingStep,
} from "../onboarding/decision";
import type { LocationPermissionPort } from "../onboarding/location-permission-port";
import type { OsSettingsPort } from "../onboarding/os-settings-port";
import type { PermissionKey, PermissionRequirement } from "../onboarding/requirements";
import type { PermissionState } from "../signals/port";

/** 온보딩이 쓰는 통로 묶음. `App.tsx`가 실제 통로를 만들어 주입한다. */
export type OnboardingPorts = {
  photo: {
    photoPermission(): Promise<PermissionState>;
    locationPermission(): Promise<PermissionState>;
    requestPhotoPermission(): Promise<PermissionState>;
    requestLocationPermission(): Promise<PermissionState>;
  };
  notification: {
    ensureChannel(): Promise<void>;
    requestPermission(): Promise<"granted" | "denied">;
    getPermission(): Promise<"granted" | "denied" | "undetermined" | "blocked">;
  };
  battery: {
    requestException(): Promise<void>;
    openSettingsList(): Promise<void>;
  };
  location: LocationPermissionPort;
  osSettings: OsSettingsPort;
};

export type OnboardingScreenProps = {
  platform: "android" | "ios";
  requirements: readonly PermissionRequirement[];
  /** 이미 로드된 플래그 — `App.tsx`가 읽어 넘긴다. */
  flag: OnboardingFlag;
  ports: OnboardingPorts;
  /** 모든 단계를 마치거나 건너뛰고 [시작하기]를 누르면. batteryNoticeShown 최종값 포함. */
  onComplete: (flag: OnboardingFlag) => void;
};

/** 사진·좌표·위치·알림 권한을 한 번에 조회한다 (battery는 조회 대상이 아님). */
async function readStates(
  ports: OnboardingPorts,
): Promise<Partial<Record<PermissionKey, PermissionState>>> {
  const [photos, photoLocation, location, notifications] = await Promise.all([
    ports.photo.photoPermission().catch(() => "undetermined" as PermissionState),
    ports.photo.locationPermission().catch(() => "denied" as PermissionState),
    ports.location.status().catch(() => "undetermined" as PermissionState),
    ports.notification.getPermission().catch(() => "undetermined" as const),
  ]);
  return { photos, "photo-location": photoLocation, location, notifications };
}

export function OnboardingScreen({
  platform,
  requirements,
  flag,
  ports,
  onComplete,
}: OnboardingScreenProps) {
  const [states, setStates] = useState<Partial<Record<PermissionKey, PermissionState>>>({});
  const [skipped, setSkipped] = useState<PermissionKey[]>([]);
  const [batteryNoticeShown, setBatteryNoticeShown] = useState(flag.batteryNoticeShown);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const next = await readStates(ports);
    if (alive.current) setStates(next);
  }, [ports]);

  useEffect(() => {
    alive.current = true;
    void refresh();

    // 온보딩 도중 앱이 백그라운드로 갔다가 돌아오면 권한 상태를 다시 읽는다
    // (spec Edge Case, SC-006). 이미 허용된 단계는 satisfied로 유지된다.
    const sub = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") void refresh();
    });

    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [refresh]);

  const steps = planOnboardingSteps({
    platform,
    requirements,
    states,
    batteryNoticeShown,
    skippedThisSession: skipped,
  });
  const current = nextStep(steps);

  const allow = useCallback(
    async (step: OnboardingStep) => {
      if (busy) return;
      setBusy(true);
      try {
        switch (step.requirement.key) {
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
            await ports.battery.requestException();
            if (alive.current) setBatteryNoticeShown(true);
            break;
        }
        await refresh();
      } finally {
        if (alive.current) setBusy(false);
      }
    },
    [busy, ports, refresh],
  );

  const openSettings = useCallback(
    async (step: OnboardingStep) => {
      if (step.requirement.key === "battery-exception") {
        await ports.battery.openSettingsList();
      } else {
        await ports.osSettings.openAppSettings();
      }
    },
    [ports],
  );

  const skip = useCallback((key: PermissionKey) => {
    setSkipped((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const finish = useCallback(() => {
    onComplete({ completed: true, batteryNoticeShown });
  }, [onComplete, batteryNoticeShown]);

  const total = steps.length;
  const doneCount = steps.filter(
    (s) => s.status === "satisfied" || s.status === "skipped-eligible",
  ).length;

  return (
    <ScrollView contentContainerStyle={styles.page} testID="onboarding-screen">
      <Text style={styles.title}>시작하기 전에</Text>
      <Text style={styles.lead}>
        휴대폰이 하루를 일기로 쓰려면 몇 가지 허락이 필요해요. 원치 않으면 건너뛰어도 됩니다.
      </Text>

      {current === null ? (
        <View style={styles.section}>
          <Text style={styles.done}>
            준비가 끝났어요. {doneCount}/{total}단계를 확인했습니다.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={finish}
            style={styles.primary}
            testID="onboarding-start"
          >
            <Text style={styles.primaryText}>시작하기</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.section} testID={`onboarding-step-${current.requirement.key}`}>
          <Text style={styles.progress}>
            {Math.min(doneCount + 1, total)} / {total}
          </Text>
          <Text style={styles.rationale}>{current.requirement.rationale}</Text>
          <Text style={styles.ifDenied}>{current.requirement.ifDenied}</Text>

          {current.status === "blocked" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void openSettings(current)}
              style={styles.primary}
              testID="onboarding-open-settings"
            >
              <Text style={styles.primaryText}>설정 열기</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void allow(current)}
              style={styles.primary}
              testID="onboarding-allow"
            >
              <Text style={styles.primaryText}>허용</Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => skip(current.requirement.key)}
            style={styles.secondary}
            testID="onboarding-skip"
          >
            <Text style={styles.secondaryText}>건너뛰기</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 16 },
  title: { fontSize: 20, fontWeight: "600" },
  lead: { fontSize: 14, opacity: 0.75, lineHeight: 20 },
  section: { gap: 10, marginTop: 8 },
  progress: { fontSize: 12, opacity: 0.5 },
  rationale: { fontSize: 16, lineHeight: 23 },
  ifDenied: { fontSize: 13, opacity: 0.6, lineHeight: 19 },
  done: { fontSize: 15, lineHeight: 22 },
  primary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    alignSelf: "flex-start",
  },
  primaryText: { fontSize: 15, fontWeight: "600" },
  secondary: { paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start" },
  secondaryText: { fontSize: 13, opacity: 0.6 },
});
