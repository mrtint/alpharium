/**
 * 통합 권한 온보딩 화면 (021, ★ 040 — 스텝 자동 전환 추가).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-screen.md
 *       S1
 *       spec.md FR-005~FR-008·FR-013·FR-015·FR-016, SC-001·SC-003·SC-008
 *       specs/040-onboarding-parallel-setup/research.md #1·#2
 *       specs/040-onboarding-parallel-setup/spec.md FR-001~FR-003
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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 040 — 스텝 진입 시 목적 설명을 렌더한 직후 고정 지연으로 시스템 권한
 * 요청을 자동 호출한다**(FR-001). 사용자가 [허용]을 눌러도 되고, 누르지 않아도
 * 지연 후 같은 요청이 자동으로 나간다 — 둘 다 같은 `allow()`를 부르므로 중복
 * 호출 방지(`busy` 플래그)가 그대로 방어한다.
 *
 * **배터리 예외 스텝은 자동 타이머 대상이 아니다**(research.md #2, FR-002) —
 * 조회 API가 없어 사용자가 설정에서 돌아왔는지 자동으로 알 수 없으므로, 이
 * 스텝만 [설정 열기]/[건너뛰기]를 사용자가 직접 눌러야 한다.
 *
 * **지연값은 화면 계층 상수다**(research.md #1) — `onboarding/decision.ts`
 * (순수 판정)에 시간 관련 로직을 두지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "./components/Text";
import { Button } from "./components/Button";
import { COLORS } from "./theme/tokens";
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

/**
 * 목적 설명을 보여준 뒤 시스템 권한 요청을 자동 호출하기까지의 고정 지연
 * (research.md #1, FR-001). 화면 계층 상수 — 순수 판정 파일에 두지 않는다.
 *
 * `battery-exception` 스텝에는 적용하지 않는다(research.md #2).
 */
export const ONBOARDING_STEP_AUTO_ADVANCE_MS = 1500;

export type OnboardingScreenProps = {
  platform: "android" | "ios";
  requirements: readonly PermissionRequirement[];
  /** 이미 로드된 플래그 — `App.tsx`가 읽어 넘긴다. */
  flag: OnboardingFlag;
  ports: OnboardingPorts;
  /** 모든 단계를 마치거나 건너뛰고 [시작하기]를 누르면. batteryNoticeShown 최종값 포함. */
  onComplete: (flag: OnboardingFlag) => void;
  /**
   * ★ 040 — 권한 스텝이 전부 결정됐다(`current === null`, FR-004). 필수 에셋
   * 준비 여부와 **무관하다** — 040은 이 시점에 내려받기를 백그라운드로
   * 시작하고 작명 화면으로 바로 넘어간다(이 화면 안의 "필수 에셋 다운로드"
   * 단계 UI는 이 콜백이 있으면 `App.tsx`가 그 전에 화면을 이미 전환하므로
   * 사실상 도달하지 않는다). 옵셔널이라 021 단독 사용(콜백 없이 이 화면
   * 안에서 에셋 단계까지 마치는 흐름)과 호환된다. **매 렌더마다 안정적인
   * 함수가 아니어도 되도록 값(불리언) 변화 시에만 1회 호출한다.**
   */
  onAllStepsDecided?: () => void;
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
  onAllStepsDecided,
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

  /*
   * ★ 040 — 권한 스텝이 전부 결정되는 순간(에셋 준비와 무관) 한 번만
   * `onAllStepsDecided`를 부른다(FR-004). `current`가 `null`이 된 이후에도
   * 리렌더가 여러 번 있을 수 있으므로(예: `refresh` 폴링) ref로 1회만
   * 보장한다 — `App.tsx`가 이 콜백에서 화면을 전환하면 이 컴포넌트가
   * 언마운트되므로 정상적으로는 문제되지 않지만, 콜백 없이 021 단독으로
   * 쓰이는 자리(온보딩만 있는 기존 화면)에서도 안전하게 멱등이어야 한다.
   */
  const decidedRef = useRef(false);
  useEffect(() => {
    if (current === null && !decidedRef.current) {
      decidedRef.current = true;
      onAllStepsDecided?.();
    }
    if (current !== null) {
      decidedRef.current = false;
    }
  }, [current, onAllStepsDecided]);

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

  /*
   * ★ 040 — 스텝 진입 시 목적 설명을 렌더한 직후, 고정 지연으로 시스템 권한
   * 요청을 자동 호출한다(FR-001, research.md #1). `battery-exception`은
   * 제외한다(research.md #2) — 조회 API가 없어 사용자가 설정에서 돌아왔는지
   * 자동으로 알 수 없다.
   *
   * `current?.requirement.key`가 바뀔 때마다(=스텝이 바뀔 때마다) 새 타이머를
   * 걸고, 언마운트·스텝 변경 시 정리한다 — 이전 스텝의 타이머가 살아남아
   * 엉뚱한 스텝에서 `allow()`를 부르는 것을 막는다(T012 clean-up 검증 대상).
   *
   * `current.status`가 `blocked`면 [허용]이 아니라 [설정 열기]가 유효한
   * 경로이므로 자동 타이머를 걸지 않는다 — OS 설정은 화면 버튼으로만 연다.
   */
  useEffect(() => {
    if (current === null) return;
    if (current.requirement.key === "battery-exception") return;
    if (current.status === "blocked") return;

    const step = current;
    const timer = setTimeout(() => {
      void allow(step);
    }, ONBOARDING_STEP_AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.requirement.key]);

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
    // 035 — `welcomeShown`은 이 화면이 정하지 않는다. 온보딩을 끝냈다고 해서 연출을
    // 본 것이 아니다(순서가 온보딩 → 에셋 → 연출이다). 들어온 값을 그대로 넘긴다.
    onComplete({ completed: true, batteryNoticeShown, welcomeShown: flag.welcomeShown });
  }, [onComplete, batteryNoticeShown, flag.welcomeShown]);

  const total = steps.length;
  const doneCount = steps.filter(
    (s) => s.status === "satisfied" || s.status === "skipped-eligible",
  ).length;

  // 029 — 권한 단계가 전부 끝났지만(current === null) 필수 에셋이 아직 준비 안 됐으면
  // "필수 에셋 다운로드" 단계를 보인다. 이 단계는 건너뛸 수 없다(FR-016, SR2).
  const showAssetsStep = current === null && !assetsReady;

  return (
    <ScrollView
      className="bg-bg"
      contentContainerStyle={styles.page}
      style={{ backgroundColor: COLORS.bg }}
      testID="onboarding-screen"
    >
      <AppText variant="title">시작하기 전에</AppText>
      <AppText variant="body" style={{ opacity: 0.75 }}>
        휴대폰이 하루를 일기로 쓰려면 몇 가지 허락이 필요해요. 원치 않으면 건너뛰어도 됩니다.
      </AppText>

      {showAssetsStep ? (
        <View style={styles.section} testID="onboarding-step-assets">
          <AppText variant="body">
            일기를 쓰는 데 필요한 것을 내려받는 중입니다. 캐릭터 하나와 사진을 보는 도구예요.
          </AppText>
          <AppText variant="caption">
            이 단계는 건너뛸 수 없어요 — 없으면 일기를 쓸 수 없습니다.
          </AppText>

          {/* SR3 — 합산 진행률 바 하나. 항목별 나열 없음(FR-017). 029가 온보딩
              다운로드 진행으로 정리한 것 — 생성 진행률이 아니다(원칙 IV 무관). */}
          <View style={styles.progressTrack} testID="onboarding-assets-progress">
            <View style={[styles.progressFill, { width: `${Math.round(assetFraction * 100)}%` }]} />
          </View>

          {assetStatus === "failed" && (
            <>
              <AppText variant="caption">
                {assetFailReason === "insufficient-space"
                  ? "저장 공간이 부족해요. 공간을 확보한 뒤 다시 시도하세요."
                  : assetFailReason === "network"
                    ? "네트워크가 불안정해요. 연결을 확인하고 다시 시도하세요."
                    : "내려받다 문제가 생겼어요. 다시 시도해 주세요."}
              </AppText>
              <View style={{ alignSelf: "flex-start" }}>
                <Button onPress={() => void downloadAssets()} testID="onboarding-assets-retry">
                  다시 시도
                </Button>
              </View>
            </>
          )}

          {assetStatus === "idle" && (
            <View style={{ alignSelf: "flex-start" }}>
              <Button onPress={() => void downloadAssets()} testID="onboarding-assets-download">
                내려받기
              </Button>
            </View>
          )}

          {assetStatus === "downloading" && (
            <AppText variant="caption">내려받는 중… 잠시만 기다려 주세요.</AppText>
          )}
          {/* SR2 — [건너뛰기] 버튼 없음. [시작하기]도 assetsReady 전에는 없음(SR3). */}
        </View>
      ) : current === null ? (
        <View style={styles.section}>
          <AppText variant="body">
            준비가 끝났어요. {doneCount}/{total}단계를 확인했습니다.
          </AppText>
          <View style={{ alignSelf: "flex-start" }}>
            <Button onPress={finish} testID="onboarding-start">
              시작하기
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.section} testID={`onboarding-step-${current.requirement.key}`}>
          <AppText variant="caption" style={{ opacity: 0.5 }}>
            {Math.min(doneCount + 1, total)} / {total}
          </AppText>
          <AppText variant="body">{current.requirement.rationale}</AppText>
          <AppText variant="caption">{current.requirement.ifDenied}</AppText>

          <View style={{ alignSelf: "flex-start" }}>
            {current.status === "blocked" ? (
              <Button onPress={() => void openSettings(current)} testID="onboarding-open-settings">
                설정 열기
              </Button>
            ) : (
              <Button disabled={busy} onPress={() => void allow(current)} testID="onboarding-allow">
                허용
              </Button>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => skip(current.requirement.key)}
            style={styles.secondary}
            testID="onboarding-skip"
          >
            <AppText variant="caption">건너뛰기</AppText>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// 032 — 색은 tokens.ts에서. 단계 순서·문안·testID·건너뛰기 가능성·에셋 진행률
// 규칙(합산 바 하나, 건너뛰기 없음) 불변(SM4).
const styles = StyleSheet.create({
  page: { padding: 20, gap: 16 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  progressFill: { height: 8, backgroundColor: COLORS.accent },
  section: { gap: 10, marginTop: 8 },
  secondary: { paddingVertical: 8, paddingHorizontal: 4, alignSelf: "flex-start" },
});
