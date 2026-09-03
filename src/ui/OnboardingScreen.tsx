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
import { essentialAssetsReady } from "../onboarding/essential-assets";
import type { EssentialAssetFact, EssentialAssetsPort } from "../app/essential-assets-port";
import type { LocationPermissionPort } from "../onboarding/location-permission-port";
import type { OsSettingsPort } from "../onboarding/os-settings-port";
import type { PermissionKey, PermissionRequirement } from "../onboarding/requirements";
import type { PermissionState } from "../signals/port";

/** 온보딩이 쓰는 통로 묶음. `App.tsx`가 실제 통로를 만들어 주입한다. */
export type OnboardingPorts = {
  photo: {
    photoPermission(): Promise<PermissionState>;
    requestPhotoPermission(): Promise<PermissionState>;
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
  /** 029 — 필수 에셋(공용 사진 모델 + 기본 캐릭터) 다운로드 통로 (FR-015). */
  essentialAssets: EssentialAssetsPort;
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

/** 사진·위치·알림 권한을 한 번에 조회한다 (battery는 조회 대상이 아님). */
async function readStates(
  ports: OnboardingPorts,
): Promise<Partial<Record<PermissionKey, PermissionState>>> {
  const [photos, location, notifications] = await Promise.all([
    ports.photo.photoPermission().catch(() => "undetermined" as PermissionState),
    ports.location.status().catch(() => "undetermined" as PermissionState),
    ports.notification.getPermission().catch(() => "undetermined" as const),
  ]);
  return { photos, location, notifications };
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

  /* ── 029 — 필수 에셋 다운로드 단계 (FR-015~017·022) ──────────────────── */
  const [assetFacts, setAssetFacts] = useState<EssentialAssetFact[]>([]);
  const [assetFraction, setAssetFraction] = useState(0);
  const [assetStatus, setAssetStatus] = useState<"idle" | "downloading" | "failed">("idle");
  const [assetFailReason, setAssetFailReason] = useState<
    "insufficient-space" | "network" | "unknown" | null
  >(null);
  const assetsReady = essentialAssetsReady(assetFacts);

  const refresh = useCallback(async () => {
    const next = await readStates(ports);
    if (alive.current) setStates(next);
  }, [ports]);

  const refreshAssets = useCallback(async () => {
    const facts = await ports.essentialAssets.readFacts().catch(() => [] as EssentialAssetFact[]);
    if (alive.current) setAssetFacts(facts);
  }, [ports]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    void refreshAssets();

    // 온보딩 도중 앱이 백그라운드로 갔다가 돌아오면 권한·에셋 상태를 다시 읽는다
    // (spec Edge Case, SC-006, SR7).
    const sub = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void refresh();
        void refreshAssets();
      }
    });

    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [refresh, refreshAssets]);

  const downloadAssets = useCallback(async () => {
    if (assetStatus === "downloading") return;
    setAssetStatus("downloading");
    setAssetFailReason(null);
    // 026 이어받기가 자동으로 이미 받은 부분을 건너뛴다(SR6, FR-021).
    const result = await ports.essentialAssets.downloadEssentials((fraction) => {
      if (alive.current) setAssetFraction(fraction);
    });
    await refreshAssets();
    if (!alive.current) return;
    if (result.ok) {
      setAssetStatus("idle");
    } else {
      setAssetStatus("failed");
      setAssetFailReason(result.reason);
    }
  }, [assetStatus, ports, refreshAssets]);

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

  // 029 — 권한 단계가 전부 끝났지만(current === null) 필수 에셋이 아직 준비 안 됐으면
  // "필수 에셋 다운로드" 단계를 보인다. 이 단계는 건너뛸 수 없다(FR-016, SR2).
  const showAssetsStep = current === null && !assetsReady;

  return (
    <ScrollView contentContainerStyle={styles.page} testID="onboarding-screen">
      <Text style={styles.title}>시작하기 전에</Text>
      <Text style={styles.lead}>
        휴대폰이 하루를 일기로 쓰려면 몇 가지 허락이 필요해요. 원치 않으면 건너뛰어도 됩니다.
      </Text>

      {showAssetsStep ? (
        <View style={styles.section} testID="onboarding-step-assets">
          <Text style={styles.rationale}>
            일기를 쓰는 데 필요한 것을 내려받는 중입니다. 캐릭터 하나와 사진을 보는 도구예요.
          </Text>
          <Text style={styles.ifDenied}>
            이 단계는 건너뛸 수 없어요 — 없으면 일기를 쓸 수 없습니다.
          </Text>

          {/* SR3 — 합산 진행률 바 하나. 항목별 나열 없음(FR-017). */}
          <View style={styles.progressTrack} testID="onboarding-assets-progress">
            <View style={[styles.progressFill, { width: `${Math.round(assetFraction * 100)}%` }]} />
          </View>

          {assetStatus === "failed" && (
            <>
              <Text style={styles.warn}>
                {assetFailReason === "insufficient-space"
                  ? "저장 공간이 부족해요. 공간을 확보한 뒤 다시 시도하세요."
                  : assetFailReason === "network"
                    ? "네트워크가 불안정해요. 연결을 확인하고 다시 시도하세요."
                    : "내려받다 문제가 생겼어요. 다시 시도해 주세요."}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void downloadAssets()}
                style={styles.primary}
                testID="onboarding-assets-retry"
              >
                <Text style={styles.primaryText}>다시 시도</Text>
              </Pressable>
            </>
          )}

          {assetStatus === "idle" && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void downloadAssets()}
              style={styles.primary}
              testID="onboarding-assets-download"
            >
              <Text style={styles.primaryText}>내려받기</Text>
            </Pressable>
          )}

          {assetStatus === "downloading" && (
            <Text style={styles.ifDenied}>내려받는 중… 잠시만 기다려 주세요.</Text>
          )}
          {/* SR2 — [건너뛰기] 버튼 없음. [시작하기]도 assetsReady 전에는 없음(SR3). */}
        </View>
      ) : current === null ? (
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
  warn: { fontSize: 13, opacity: 0.9, lineHeight: 19 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e0e0e0",
    overflow: "hidden",
  },
  progressFill: { height: 8, backgroundColor: "#333" },
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
