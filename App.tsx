import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { expoSelectionPort, loadSelection, saveSelection } from "./src/app/selection-store";
import { resolveGenerationParams } from "./src/app/resolve-generation";
import { routeFromNotification } from "./src/app/notification-routing";
import type { DayDate } from "./src/config/day-boundary";
import {
  ensureAutoDiaryTaskDefined,
  // 부수 효과: 전역 스코프 TaskManager.defineTask 등록 경로를 모듈에 들인다.
} from "./src/schedule/task";
import { expoBackgroundSchedulePort } from "./src/schedule/background-port";
import { expoBatteryExceptionPort } from "./src/schedule/battery-exception-port";
import { expoNotificationPort } from "./src/schedule/notification-port";
import { acknowledgeNotified, expoNotifiedStorePort } from "./src/schedule/notified-store";
import { clearStaleLocksOnStart } from "./src/schedule/lock";
import { expoLockPort } from "./src/schedule/lock-port";
import {
  expoAutoDiarySettingsPort,
  loadAutoDiarySettings,
  type AutoDiarySettings,
} from "./src/schedule/settings";
import { applyTargetHour, applyToggleOff, applyToggleOn } from "./src/schedule/settings-effects";
import { expoPhotoPort } from "./src/signals/expo-port";
import { loadOnboardingFlag, saveOnboardingFlag, type OnboardingFlag } from "./src/onboarding/flag";
import { shouldShowOnboarding } from "./src/onboarding/decision";
import {
  essentialAssetsReady,
  ONBOARDING_DEFAULT_CHARACTER,
} from "./src/onboarding/essential-assets";
import { expoEssentialAssetsPort } from "./src/app/essential-assets-port";
import { expoOnboardingFlagPort } from "./src/onboarding/flag-port";
import { expoLocationPermissionPort } from "./src/onboarding/location-permission-port";
import { expoOsSettingsPort } from "./src/onboarding/os-settings-port";
import { PERMISSION_REQUIREMENTS } from "./src/onboarding/requirements";
import { AutoDiarySettingsScreen } from "./src/ui/AutoDiarySettingsScreen";
import { OnboardingScreen, type OnboardingPorts } from "./src/ui/OnboardingScreen";
import { PermissionsSection } from "./src/ui/PermissionsSection";
import {
  expoGeocodingSettingPort,
  loadGeocodingSetting,
  saveGeocodingSetting,
  type GeocodingPreference,
} from "./src/app/geocoding-setting-store";
import {
  expoVisionSettingPort,
  loadVisionSetting,
  saveVisionSetting,
  type VisionPreference,
} from "./src/app/vision-setting-store";
import { dayBounds, selectableDays } from "./src/config/day-boundary";
import { createAppPipeline } from "./src/app/wiring";
import { currentEnvironment } from "./src/config/environment";
import { showsOnScreen } from "./src/diagnostics/sink";
import { expoFileSystemPort, fileStore } from "./src/diary/store";
import { CHARACTERS, type Character } from "./src/diary/types";
import { type Acquisition, createAcquisition } from "./src/models/acquisition";
import { resolveDownloadView } from "./src/models/download-view";
import { expoModelPorts } from "./src/models/expo-port";
import { readinessOf } from "./src/models/readiness";
import { assetFor } from "./src/models/roster";
import { pausedFor, readState, removeAsset, segmentedFor, verdictFor } from "./src/models/storage";
import type { DownloadProgress, DownloadRejection, ModelReadiness } from "./src/models/types";
import {
  prepareVision,
  removeVision,
  visionReadiness,
  visionStorageBytes,
} from "./src/vision/acquisition";
import { CharacterListScreen } from "./src/ui/CharacterListScreen";
import { AuthorPicker } from "./src/ui/AuthorPicker";
import { VisionPicker } from "./src/ui/VisionPicker";
import { GeocodingSettingToggle } from "./src/ui/GeocodingSettingToggle";
import { personaOf } from "./src/diary/persona";
import { DiagnosticsScreen } from "./src/ui/DiagnosticsScreen";
import { DiaryHomeScreen } from "./src/ui/DiaryHomeScreen";

/**
 * 루트 컴포넌트(FR-002).
 *
 * 진단 화면은 local·dev에서만 보인다(FR-007a). prod에서 그 화면에 도달하는 경로가
 * 존재하지 않아야 한다(SC-013) — 그 판단을 sinksFor()에 위임한다.
 *
 * **003이 캐릭터 목록을 더한다.** 사용자가 캐릭터를 골라야 일기를 쓸 수 있기 때문이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **006이 일기 화면을 더한다.** 이것이 엔드유저가 보는 첫 화면이며 **진단 화면을
 * 거치지 않는다**(FR-009, SC-009) — 005까지는 생성 버튼이 진단 안에만 있어 배포
 * 빌드에서 일기에 닿을 길이 없었다.
 *
 * **캐릭터 준비는 여전히 003의 화면이 한다.** 일기와 캐릭터를 오가는 자리를 여기 둔다 —
 * 화면이 둘뿐이므로 상태 하나로 가른다(research.md §5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **⚠️ `SafeAreaView`는 `react-native`가 아니라 `react-native-safe-area-context`에서
 * 온다.**
 *
 * 전자는 **iOS 전용이며 안드로이드에서는 아무 일도 하지 않는다.** 그런데 이 앱은
 * `edgeToEdgeEnabled=true`(gradle.properties)에 상태 표시줄이 투명이라 **화면이 시스템
 * 막대 아래까지 그려진다** — 그래서 시계·배터리·블루투스 표시와 탭이 겹쳐 보였다.
 *
 * **조용히 실패하는 것이 이 버그의 성질이다**: 이름도 쓰임새도 맞아 보이고, iOS에서는
 * 실제로 동작하며, 빌드도 테스트도 통과한다. 안드로이드에서 눈으로 봐야 드러난다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function App() {
  return (
    // 인셋을 재는 자리. 이것이 없으면 아래 `SafeAreaView`가 잴 값을 얻지 못한다.
    <SafeAreaProvider>
      <AppFrame />
    </SafeAreaProvider>
  );
}

function AppFrame() {
  const environment = currentEnvironment();
  const showsDiagnostics = showsOnScreen(environment);
  const [tab, setTab] = useState<"diary" | "characters" | "settings" | "developer">("diary");

  /**
   * 020 — 알림 라우팅.
   *
   * ───────────────────────────────────────────────────────────────────────────
   * **웜**: `onResponse`가 탭 응답을 준다. **콜드**: 마운트 시 `lastResponse()`를
   * 1회 await한다(앱을 연 마지막 알림). 둘 다 `routeFromNotification`(순수)을
   * 거쳐 `pendingRoute`가 된다 — `DiaryHomeScreen`이 `initialDay`로 받아
   * 목록을 건너뛰고 상세를 첫 화면으로 만든다(FR-006, SC-004).
   *
   * `ensureChannel()`도 여기서 1회 — 채널이 없으면 안드로이드에서 권한
   * 프롬프트도 안 뜨고 알림도 안 보인다(notification.md N3).
   * ───────────────────────────────────────────────────────────────────────────
   */
  const notificationPort = useMemo(() => expoNotificationPort(), []);
  const [pendingRoute, setPendingRoute] = useState<{ day: DayDate } | null>(null);

  useEffect(() => {
    // 전역 백그라운드 태스크를 등록한다(019 research §1 — 전역 스코프 요건).
    ensureAutoDiaryTaskDefined();

    // 020 — 앱이 방금 시작했으므로 이전 프로세스가 남긴 죽은 잠금을 청소한다
    // (generation-lock.md L7 보강). `force-stop`·크래시로 `pipeline.run()`의
    // `finally { release() }`가 안 돌면 잠금 파일이 5분까지 살아 화면 생성이
    // 전부 `already-running`으로 막힌다. `clearStaleLocksOnStart`가 "screen"은
    // 무조건, "background"는 stale일 때만 지운다(진행 중인 백그라운드 생성을
    // 방해하지 않기 위해).
    void clearStaleLocksOnStart(expoLockPort(), Date.now()).catch(() => {});

    void notificationPort.ensureChannel().catch(() => {});

    // 포그라운드에서도 배너를 띄운다(research.md §1).
    void import("expo-notifications")
      .then((Notifications) => {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });
      })
      .catch(() => {});

    let alive = true;
    void notificationPort
      .lastResponse()
      .then((r) => {
        const route = routeFromNotification(r);
        if (alive && route !== null) setPendingRoute(route);
      })
      .catch(() => {});

    const unsubscribe = notificationPort.onResponse((r) => {
      const route = routeFromNotification(r);
      if (route !== null) {
        setPendingRoute(route);
        setTab("diary");
      }
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [notificationPort]);

  const onAcknowledge = useCallback((day: DayDate) => {
    void acknowledgeNotified(expoNotifiedStorePort(), day);
  }, []);

  /**
   * ★ **008이 내려받기 상태를 여기로 올린다**(FR-013·014).
   *
   * ───────────────────────────────────────────────────────────────────────────
   * **007까지 이 넷이 `ModelSection` 안에 있었고, 그것이 셋째 결함이었다.**
   *
   * 아래의 탭이 **삼항 연산자로** 갈리므로 캐릭터 탭을 떠나면 `ModelSection`이
   * 언마운트되고, `useState`에 있던 **`Acquisition` 인스턴스가 통째로 사라진다** —
   * `running`도 `handle`도 함께. 돌아오면 새 인스턴스라 `busyWith()`가 `null`이고
   * **받던 것을 멈출 방법이 없다.**
   *
   * 오류가 나지 않고 **아무 일도 일어나지 않을 뿐**이라, 006의 `GenerationProbe`나
   * 007의 끊긴 `stop` 배선과 **같은 종류의 조용한 결함**이었다.
   *
   * **`AppFrame`은 탭이 바뀌어도 언마운트되지 않으므로** 여기가 그 자리다.
   *
   * **`expoModelPorts()`를 여기서 만들어도 안전하다**(2026-08-21 코드 확인):
   * 클로저 객체 넷을 만들 뿐이고 기기 통로는 메서드 안의 `await import`로 열린다.
   * 일기 탭에서도 만들어지지만 비용이 없다.
   *
   * **지연 생성(`useState(() => …)`)은 유지한다** — 모듈 수준 상수로 바꾸면 모듈 로드
   * 시점에 불려 기기 통로가 없는 환경(웹·시뮬레이터)에서 터진다.
   * ───────────────────────────────────────────────────────────────────────────
   */
  const [ports] = useState(() => expoModelPorts());
  const [acquisition] = useState(() => createAcquisition(ports));
  /**
   * 026 — 받는 중인 캐릭터들의 진행 상태.
   *
   * **단수 → `Map`으로 바꿨다** — 서로 다른 캐릭터를 동시에 받을 수 있으므로
   * (026 FR-005). 각 캐릭터의 진행 콜백이 자기 항목만 갱신하고, 탭 복귀 시
   * `busyWith()` 배열 전부를 복원한다.
   */
  const [progress, setProgress] = useState<ReadonlyMap<Character, DownloadProgress>>(new Map());
  const [rejection, setRejection] = useState<DownloadRejection | null>(null);

  /**
   * 021 — 통합 권한 온보딩 진입 게이트.
   *
   * ───────────────────────────────────────────────────────────────────────────
   * `onboarding.json`을 읽어 `completed !== true`이면 탭 UI 대신
   * `OnboardingScreen`만 그린다(FR-005). 006이 세운 "화면이 둘뿐이므로 상태
   * 하나로 가른다"와 같은 패턴 — 온보딩은 세 번째 최상위 상태다.
   *
   * `forceOnboarding`은 설정 "권한" 섹션의 [온보딩 다시 하기]가 켠다 — `completed`는
   * 그대로 두고 화면만 다시 보여준다(FR-019).
   * ───────────────────────────────────────────────────────────────────────────
   */
  const onboardingFlagPort = useMemo(() => expoOnboardingFlagPort(), []);
  const [onboardingFlag, setOnboardingFlag] = useState<OnboardingFlag | null>(null);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadOnboardingFlag(onboardingFlagPort).then((flag) => {
      if (alive) setOnboardingFlag(flag);
    });
    return () => {
      alive = false;
    };
  }, [onboardingFlagPort]);

  /** 온보딩·설정 "권한" 섹션이 공유하는 통로 묶음. `expo-*`는 여기서만 만든다. */
  const onboardingPorts: OnboardingPorts = useMemo(
    () => ({
      photo: expoPhotoPort(),
      notification: expoNotificationPort(),
      battery: expoBatteryExceptionPort(),
      location: expoLocationPermissionPort(),
      osSettings: expoOsSettingsPort(),
      // 029 — 필수 에셋 다운로드 통로 (FR-015). `src/app/`에 있어 로스터 접근 허용.
      essentialAssets: expoEssentialAssetsPort(),
    }),
    [],
  );

  /**
   * 029 — 필수 에셋(공용 사진 모델 + 기본 캐릭터)이 준비됐는가 (FR-019·020).
   *
   * 진입 게이트에 AND로 들어간다 — `completed`가 true여도 이게 false면 온보딩(에셋
   * 단계)이 다시 뜬다. `onboarding.json`에 저장하지 않고 003·011 readiness를
   * 실시간 조회한다(모델을 지우면 즉시 false, 028 결함의 방어).
   */
  const [essentialsReady, setEssentialsReady] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    const check = () =>
      void onboardingPorts.essentialAssets
        .readFacts()
        .then((facts) => {
          if (live) setEssentialsReady(essentialAssetsReady(facts));
        })
        .catch(() => {
          if (live) setEssentialsReady(false);
        });
    check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [onboardingPorts]);

  const platform: "android" | "ios" = Platform.OS === "ios" ? "ios" : "android";

  /**
   * 021 — 거부된 권한으로 제한되는 기능의 정직한 안내 (FR-014, SC-004).
   *
   * 사진·위치 권한 상태를 읽어 `PERMISSION_REQUIREMENTS[...].ifDenied`를 모은다.
   * 문구 정의는 `requirements.ts` 한 곳뿐 — 화면은 계산하지 않는다. 포그라운드
   * 복귀 시 다시 읽는다.
   */
  const [deniedNotices, setDeniedNotices] = useState<readonly string[]>([]);
  useEffect(() => {
    let live = true;
    async function compute() {
      const [photo, photoLoc] = await Promise.all([
        onboardingPorts.photo.photoPermission().catch(() => "unknown" as const),
        onboardingPorts.photo.locationPermission().catch(() => "unknown" as const),
      ]);
      const notices: string[] = [];
      const isDenied = (s: string) => s === "denied" || s === "blocked";
      const req = (key: string) => PERMISSION_REQUIREMENTS.find((r) => r.key === key);
      if (isDenied(photo)) notices.push(req("photos")?.ifDenied ?? "");
      const locReq = req("location");
      if (isDenied(photoLoc) || (locReq?.platforms.includes(platform) && isDenied(photoLoc))) {
        notices.push(req("photo-location")?.ifDenied ?? "");
      }
      if (live) setDeniedNotices(notices.filter(Boolean));
    }
    void compute();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void compute();
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [onboardingPorts, platform]);

  const onOnboardingComplete = useCallback(
    (flag: OnboardingFlag) => {
      setOnboardingFlag(flag);
      setForceOnboarding(false);
      void saveOnboardingFlag(onboardingFlagPort, flag).catch(() => {});
    },
    [onboardingFlagPort],
  );

  // 플래그·에셋 상태를 아직 읽지 못했으면 아무것도 그리지 않는다(짧다).
  if (onboardingFlag === null || essentialsReady === null) {
    return <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]} />;
  }

  // 029 — 진입 게이트: shouldShowOnboarding(flag, essentialsReady). `completed`가
  // true여도 필수 에셋이 준비 안 됐으면 온보딩(에셋 단계)이 다시 뜬다(FR-020).
  if (shouldShowOnboarding(onboardingFlag, essentialsReady) || forceOnboarding) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
        <OnboardingScreen
          platform={platform}
          requirements={PERMISSION_REQUIREMENTS}
          flag={onboardingFlag}
          ports={onboardingPorts}
          onComplete={onOnboardingComplete}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    // `edges`를 적어 둔다 — 기본값은 네 변 전부이며, 무엇을 피하는지가 코드에 보이는
    // 편이 낫다. 좌우는 세로 화면에서 0이지만 가로로 눕히면 노치가 파고든다.
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.tabs}>
        <Pressable accessibilityRole="button" onPress={() => setTab("diary")} style={styles.tab}>
          <Text style={tab === "diary" ? styles.tabOn : styles.tabOff}>일기</Text>
        </Pressable>
        {/*
          020 — 자동 생성 설정 탭. **개발자 탭과 달리 prod에도 있다**(FR-001).
          029 — "캐릭터" 탭이 사라지고 "일기 작성자"·"사진 보기"·"장소명" 섹션이
          이 탭으로 흡수됐다(Q1=A).
        */}
        <Pressable accessibilityRole="button" onPress={() => setTab("settings")} style={styles.tab}>
          <Text style={tab === "settings" ? styles.tabOn : styles.tabOff}>설정</Text>
        </Pressable>
        {/*
          **개발자 탭은 진단과 같은 조건으로 존재 자체가 사라진다**(FR-024·SC-013을
          그대로 이어받는다). prod에서는 `showsDiagnostics`가 false이므로 이 자리에
          아무것도 그려지지 않는다 — 조건부로 숨기는 것이 아니라 탭이 없다.
        */}
        {showsDiagnostics && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setTab("developer")}
            style={styles.tab}
          >
            <Text style={tab === "developer" ? styles.tabOn : styles.tabOff}>개발자</Text>
          </Pressable>
        )}
      </View>

      {tab === "diary" ? (
        <DiarySection
          onGoToSettings={() => setTab("settings")}
          // 020 — 알림을 눌러 열렸으면 그 하루의 상세로 바로 간다(FR-006).
          initialDay={pendingRoute?.day ?? null}
          onDayOpened={() => setPendingRoute(null)}
          onAcknowledge={onAcknowledge}
          // 021 — 거부된 권한으로 제한되는 기능의 정직한 안내(FR-014).
          deniedNotices={deniedNotices}
        />
      ) : tab === "settings" ? (
        // 020 — 자동 생성 설정(FR-001). 021 — "권한" 섹션. 029 — "일기 작성자"·
        // "사진 보기"·"장소명" 섹션도 여기(FR-023~025).
        <AutoDiarySection
          platform={platform}
          onboardingPorts={onboardingPorts}
          onRestartOnboarding={() => setForceOnboarding(true)}
          modelPorts={ports}
          acquisition={acquisition}
          progress={progress}
          setProgress={setProgress}
          rejection={rejection}
          setRejection={setRejection}
        />
      ) : (
        // **개발자 탭도 진단과 같은 조건에서만 그려진다** — 탭이 없으면 이 갈래에
        // 닿을 수 없지만, `showsDiagnostics`가 false인데 `tab`이 남아 있는 경우를
        // 대비해 한 번 더 지킨다(예: 실행 중 환경이 바뀌는 것은 없지만 방어적으로).
        showsDiagnostics && (
          <ScrollView style={styles.diagnostics}>
            <DiagnosticsScreen />
          </ScrollView>
        )
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

/**
 * 일기 화면을 조립한다.
 *
 * **어댑터를 직접 만들지 않는다**(FR-026, SC-024) — `createAppPipeline()`이 `select.ts`를
 * 거쳐 고른다. 조립이 실패하면 파이프라인을 넘기지 않고, 그러면 화면이 `build-error`로
 * 간다(FR-035a).
 */
function DiarySection({
  onGoToSettings,
  initialDay,
  onDayOpened,
  onAcknowledge,
  deniedNotices,
}: {
  /** 029 — no-ready-character 실패 시 설정 탭으로 (FR-014) */
  onGoToSettings?: () => void;
  /** 020 — 알림을 눌러 열렸으면 그 하루 (FR-006) */
  initialDay?: DayDate | null;
  /** 020 — 상세를 실제로 연 뒤 pendingRoute를 비운다 */
  onDayOpened?: () => void;
  /** 020 — 상세 진입 시 그 하루의 알림을 확인 처리 (FR-007 (2)) */
  onAcknowledge?: (day: DayDate) => void;
  /** 021 — 거부된 권한 안내 (FR-014). 부모가 계산 */
  deniedNotices?: readonly string[];
}) {
  const environment = currentEnvironment();

  // 화면이 다시 그려질 때마다 새로 만들지 않는다. 지연 import 하는 통로이므로
  // 여기서 만들어도 모듈이 즉시 해석되지 않는다.
  const store = useMemo(() => fileStore(expoFileSystemPort("diary")), []);

  /** 저장된 선택. 아직 읽지 않았으면 null이며 그것은 「고른 적 없음」과 다르다 */
  const [stored, setStored] = useState<Character | null>(null);
  const [ready, setReady] = useState<Character[]>([]);

  const selectionPort = useMemo(() => expoSelectionPort(), []);

  /**
   * 029 — 설정 탭의 세 선호. 홈의 위젯이 사라졌으므로 여기서 읽어 자동 판정
   * (`resolveGenerationParams`)에 넘긴다. `AppState active`에서 다시 읽는다 —
   * 설정 탭에서 바꾸고 일기 탭으로 돌아오면 반영돼야 한다.
   */
  const visionPort = useMemo(() => expoVisionSettingPort(), []);
  const geocodingSettingPort = useMemo(() => expoGeocodingSettingPort(), []);
  const [visionPreference, setVisionPreference] = useState<VisionPreference>("auto");
  const [geocodingPreference, setGeocodingPreference] = useState<GeocodingPreference>("auto");
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    let alive = true;
    async function readPrefs() {
      const [v, g] = await Promise.all([
        loadVisionSetting(visionPort).catch(() => "auto" as const),
        loadGeocodingSetting(geocodingSettingPort).catch(() => "auto" as const),
      ]);
      let loc = false;
      try {
        const Location = await import("expo-location");
        const status = await Location.getForegroundPermissionsAsync();
        loc = status.granted === true;
      } catch {
        // 통로가 없는 환경 — 권한 없음으로 다룬다.
      }
      if (alive) {
        setVisionPreference(v);
        setGeocodingPreference(g);
        setLocationPermission(loc);
      }
    }
    void readPrefs();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void readPrefs();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [visionPort, geocodingSettingPort]);

  /**
   * 029 — 최근 3일 중 사진 신호가 1장 이상인 하루들 (FR-010, 임계값 없음).
   *
   * 자동 판정("auto" → 사진 있으면 quick)의 입력이다. 3일치를 한 번 훑어 캐시하고
   * `AppState active`에서 다시 훑는다. 정밀 판정은 pipeline이 신호에서 다시 한다.
   */
  const [photoDays, setPhotoDays] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    let alive = true;
    async function probe() {
      const port = expoPhotoPort();
      const days = selectableDays(new Date());
      const withPhotos = new Set<string>();
      for (const day of days) {
        try {
          const { startMs, endMs } = dayBounds(day);
          const photos = await port.photosBetween(startMs, endMs);
          if (photos.length > 0) withPhotos.add(day);
        } catch {
          // 권한 없음·통로 없음 — 그 하루는 "사진 없음"으로 다룬다.
        }
      }
      if (alive) setPhotoDays(withPhotos);
    }
    void probe();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void probe();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  // 029 — 장소명이 켜짐(자동+권한 있음, 또는 고정 on)인지 배선에 넘긴다.
  // `createPipeline`이 구성 시점에 이 값을 고정하므로, 바뀌면 파이프라인을 다시 만든다.
  const geocodingEnabled =
    geocodingPreference === "on"
      ? true
      : geocodingPreference === "off"
        ? false
        : locationPermission;

  const wiring = useMemo(
    () => createAppPipeline(environment, { store, geocodingEnabled }),
    [environment, store, geocodingEnabled],
  );

  /**
   * 저장된 선택과 준비 상태를 함께 읽는다 (007 FR-001·003).
   *
   * 029 — 홈에 CharacterPicker가 없으므로 여기서 사용자가 고르는 일은 없다.
   * `stored`는 "마지막에 쓴 캐릭터"(생성 성공 시 기록) 또는 설정 탭 "일기 작성자"
   * 고정값이며, 자동 판정(`resolveGenerationParams`)의 `lastCharacter`·`fixedAuthor`로
   * 넘어간다. `AppState active`에서 다시 읽는다(설정 탭 변경 반영).
   */
  const refreshSelection = useCallback(async () => {
    const [found, saved] = await Promise.all([
      readyCharacters(),
      loadSelection(selectionPort).catch(() => null),
    ]);
    return { found, saved };
  }, [selectionPort]);

  useEffect(() => {
    let alive = true;
    const run = () =>
      void refreshSelection().then(({ found, saved }) => {
        if (!alive) return;
        setReady(found);
        setStored(saved);
      });
    run();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") run();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [refreshSelection]);

  /**
   * 029 — "일기 쓰기"가 눌린 하루에 대해 생성 파라미터를 정한다 (FR-007).
   *
   * **순수 함수(`resolveGenerationParams`)가 배선 계층에서 돈다** — 화면은 자기
   * `chosenDay`를 넘기고 결과만 받는다. `fixedAuthor`는 설정 탭 "일기 작성자" 고정값
   * 이지만, 홈 CharacterPicker가 없는 지금은 `stored`(마지막에 쓴 캐릭터) 하나가
   * `lastCharacter`이자 폴백 대상이다 — 설정 탭 고정 선택도 같은 파일에 쓰므로(FR-026),
   * `fixedAuthor`를 `stored`와 별개로 두지 않는다.
   */
  const resolveWrite = useCallback(
    (day: DayDate) =>
      resolveGenerationParams({
        lastCharacter: stored,
        onboardingDefault: ONBOARDING_DEFAULT_CHARACTER,
        readyCharacters: ready,
        fixedAuthor: stored,
        chosenDay: day,
        // 029 — 그 날 사진 신호가 1장 이상인가. 임계값 없음(FR-010).
        photoSignalPresent: photoDays.has(day),
        locationPermission,
        visionPreference,
        geocodingPreference,
      }),
    [stored, ready, photoDays, locationPermission, visionPreference, geocodingPreference],
  );

  /** 생성 성공 시 실제로 쓴 캐릭터를 기록한다 (029 FR-008a). */
  const onGenerated = useCallback(
    (character: Character) => {
      setStored(character);
      void saveSelection(selectionPort, character).catch(() => {});
    },
    [selectionPort],
  );

  return (
    <DiaryHomeScreen
      resolution={environment}
      pipeline={wiring.ok ? wiring.pipeline : undefined}
      store={store}
      stop={wiring.stop}
      resolve={resolveWrite}
      onGenerated={onGenerated}
      deniedNotices={deniedNotices}
      onGoToSettings={onGoToSettings}
      initialDay={initialDay}
      onAcknowledge={(day) => {
        onAcknowledge?.(day);
        if (initialDay != null && day === initialDay) onDayOpened?.();
      }}
    />
  );
}

/**
 * 준비된 캐릭터를 **전부** 찾는다 (007 FR-001).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 006까지 이 자리가 「먼저 준비된 것 하나」를 돌려주었다.**
 *
 * 그래서 사용자는 누가 자기 일기를 썼는지 모르고 바꿀 수도 없었다 — 헌법 원칙 III이
 * 요구하는 「고르는 행위」가 화면에서 사라져 있었다. 이제 **목록을 주고 고르는 것은
 * `resolveSelection()`과 사용자가 한다**(FR-008).
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function readyCharacters(): Promise<Character[]> {
  const ports = expoModelPorts();
  try {
    const state = await readState(ports.metadata);
    const found: Character[] = [];
    for (const character of CHARACTERS) {
      const asset = assetFor(character);
      const facts = await ports.files.facts(asset.key);
      const readiness = readinessOf({
        assetKey: asset.key,
        expectedBytes: asset.expectedBytes,
        expectedMd5: asset.md5,
        file: facts,
        verdict: verdictFor(state, asset.key),
        paused: pausedFor(state, asset.key),
        hasPartialFile: false,
      });
      if (readiness.kind === "ready") found.push(character);
    }
    return found;
  } catch {
    // 기기 통로가 없는 환경(웹·시뮬레이터). 「없다」가 아니라 모르는 것이므로
    // 준비된 캐릭터를 지어내지 않는다.
    return [];
  }
}

/** 준비 상태를 모른다는 것과 "받지 않음"은 다르다(원칙 V). 읽기 전에는 아무것도 그리지 않는다. */
type Readiness = Record<Character, ModelReadiness> | null;

/**
 * 캐릭터 목록과 그 상태를 잇는다.
 *
 * **판정은 순수 함수(`readinessOf`)가 하고 여기서는 재료만 모은다.** 그래야 판정 규칙이
 * 기기 없이 검증된다.
 */
type ModelSectionProps = {
  ports: ReturnType<typeof expoModelPorts>;
  acquisition: Acquisition;
  /** 026 — 받는 중인 캐릭터별 진행 상태 */
  progress: ReadonlyMap<Character, DownloadProgress>;
  setProgress: React.Dispatch<React.SetStateAction<ReadonlyMap<Character, DownloadProgress>>>;
  rejection: DownloadRejection | null;
  setRejection: (rejection: DownloadRejection | null) => void;
};

function ModelSection(props: ModelSectionProps) {
  const { ports, acquisition, progress, setProgress, rejection, setRejection } = props;

  /**
   * **준비 상태는 올리지 않는다**(008).
   *
   * 화면에 들어올 때 다시 읽으면 되는 것이며, 오래된 값을 들고 있을 이유가 없다.
   * 올려야 하는 것은 **내려받기처럼 화면보다 오래 사는 것**뿐이다.
   */
  const [readiness, setReadiness] = useState<Readiness>(null);

  /**
   * 다섯 캐릭터의 준비 상태를 읽는다.
   *
   * **판정은 순수 함수가 하고 여기서는 재료만 모은다** — 파일이 있는지, 검증 기록이
   * 있는지, 중단 정보가 있는지. 그래야 규칙이 기기 없이 검증된다.
   *
   * 기기 통로가 없는 환경(웹·시뮬레이터)에서는 **null을 돌려준다.** "받지 않음"으로
   * 채우지 않는다 — 모르는 것을 아는 것처럼 만들지 않는다(원칙 V).
   */
  const read = useCallback(async (): Promise<Readiness> => {
    try {
      const state = await readState(ports.metadata);
      const entries = await Promise.all(
        CHARACTERS.map(async (character) => {
          const asset = assetFor(character);
          const facts = await ports.files.facts(asset.key);
          return [
            character,
            readinessOf({
              assetKey: asset.key,
              expectedBytes: asset.expectedBytes,
              expectedMd5: asset.md5,
              file: facts,
              verdict: verdictFor(state, asset.key),
              paused: pausedFor(state, asset.key),
              // 026 — 세그먼트 재개 상태가 있으면 partial + resumable: true (FR-023).
              segmentedResume: segmentedFor(state, asset.key),
              // 부분 파일 판정은 파일 통로가 아직 구분해 주지 않는다.
              // 중단 정보가 있으면 그쪽으로 잡히므로 지금은 false로 둔다.
              hasPartialFile: false,
            }),
          ] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<Character, ModelReadiness>;
    } catch {
      return null;
    }
  }, [ports]);

  // 화면이 뜬 뒤 한 번 읽는다. 언마운트된 뒤에는 반영하지 않는다 —
  // 002의 DiagnosticsScreen이 `alive` 플래그를 쓴 것과 같은 방식이다.
  useEffect(() => {
    let alive = true;
    read().then((next) => {
      if (alive) setReadiness(next);
    });
    return () => {
      alive = false;
    };
  }, [read]);

  /**
   * 탭에서 돌아왔을 때 받는 중인 것을 **전부** 되찾는다 (008 FR-013, 026 FR-006).
   *
   * **`Acquisition`이 이제 탭보다 오래 살므로 물어볼 대상이 남아 있다.** 026에서
   * 여러 캐릭터가 동시에 받는 중일 수 있으므로 `busyWith()` 배열 전부를 순회한다.
   *
   * ⚠️ **백분율은 되찾을 수 없다.** `Acquisition`은 마지막 진행률을 들고 있지 않고
   * 콜백으로 흘려보낼 뿐이다. 그래서 `fraction: null`로 시작하고 **다음 진행 콜백이
   * 오면 붙는다** — 「받는 중…」으로 보이며 **0%로 채우지 않는다**(원칙 V).
   */
  useEffect(() => {
    const running = acquisition.busyWith();
    if (running.length === 0) return;
    setProgress((prev) => {
      const next = new Map(prev);
      for (const character of running) {
        if (!next.has(character)) next.set(character, { character, fraction: null });
      }
      return next;
    });
    // 화면이 뜰 때 한 번만 본다. `progress`가 바뀔 때마다 되돌리면 안 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acquisition]);

  const refresh = useCallback(async () => {
    setReadiness(await read());
  }, [read]);

  /**
   * ★ **008이 고치는 자리 — 두 버그가 여기서 함께 났다.**
   *
   * ───────────────────────────────────────────────────────────────────────────
   * **006까지 이 함수가 두 줄이었고 둘 다 틀렸다:**
   *
   * ```ts
   * await acquisition.prepare(character, setProgress);   // ← 반환값을 버린다 (버그 ①)
   * setProgress(null);                                   // ← 거부에서도 돈다 (버그 ②)
   * ```
   *
   * **버그 ①**: `prepare()`가 `{ ok: false, failure: { kind: "busy", busyWith } }`를
   * 정확히 돌려주는데 호출자가 값을 받지 않아, **거부가 화면까지 갈 통로가 없었다.**
   * 사용자에게는 「눌렀는데 아무 일이 없다」로 보였다.
   *
   * **버그 ②**: `busy` 거부는 네트워크를 타지 않고 **즉시 반환되므로** 곧바로
   * `setProgress(null)`이 돌아 **받던 것의 진행률이 지워졌다.** 그러면 멈추기 버튼이
   * 함께 사라지고 — 그런데 `acquisition`의 `running`은 그대로라 — 사용자는
   * **받는 줄도 모르고, 멈출 수도 없고, 다른 것도 못 받는** 상태에 갇혔다.
   * 003 FR-020a가 약속한 「멈추면 새 요청이 통한다」가 화면에서 실행 불가능했다.
   *
   * **고침**: 반환값을 받고, **자기 요청의 결과로만 진행 표시를 거둔다.**
   * ───────────────────────────────────────────────────────────────────────────
   */
  const onPrepare = useCallback(
    async (character: Character) => {
      // 026 — 이 캐릭터의 진행만 갱신하는 콜백. 다른 캐릭터의 항목은 건드리지 않는다.
      const reportOne = (p: DownloadProgress) =>
        setProgress((prev) => new Map(prev).set(p.character, p));

      const result = await acquisition.prepare(character, reportOne);

      // ★ 거부는 **받던 것을 건드리지 않는다**(FR-008). 진행률도 멈추기 버튼도 그대로
      //   남아야 사용자가 빠져나갈 수 있다(FR-009, 003 FR-020a).
      if (!result.ok && result.failure.kind === "busy") {
        setRejection({ requested: character, busyWith: result.failure.busyWith });
        return;
      }

      // 그 외(완료·멈춤·실패)는 **내 요청이 끝난 것이므로** 이 캐릭터의 진행 표시만
      // 거둔다(FR-012) — 026에서 다른 캐릭터가 동시에 받는 중일 수 있으므로 `Map`
      // 전체를 비우지 않는다. 거부 통지도 함께 비운다(008 FR-005).
      setProgress((prev) => {
        const next = new Map(prev);
        next.delete(character);
        return next;
      });
      setRejection(null);
      await refresh();
    },
    [acquisition, refresh, setProgress, setRejection],
  );

  const onRemove = useCallback(
    async (character: Character) => {
      await removeAsset(ports.files, ports.metadata, assetFor(character).key);
      await refresh();
    },
    [ports, refresh],
  );

  /* ───────────── 011 — 사진을 보는 데 필요한 것 ───────────── */

  /**
   * 사진 보는 모델의 준비 상태와 진행률.
   *
   * **캐릭터와 따로 둔다**(FR-025). 같은 상태에 넣으면 그것이 곧 「캐릭터가 사진을
   * 본다」는 잘못된 모양이다.
   *
   * ⚠️ **지금은 캐릭터와 동시에 받을 수 있다** — 003의 「한 번에 하나」가 이 쌍에는
   * 적용되지 않는다(tasks.md T009~T011의 「미룬 까닭」). 잊은 것이 아니라 미룬 것이다.
   */
  const [visionState, setVisionState] = useState<ModelReadiness | null>(null);
  const [visionProgress, setVisionProgress] = useState<number | null>(null);
  const [visionBytes, setVisionBytes] = useState(0);

  const readVision = useCallback(async () => {
    const [state, bytes] = await Promise.all([
      visionReadiness(ports).catch(() => ({ kind: "not-downloaded" }) as ModelReadiness),
      visionStorageBytes(ports).catch(() => 0),
    ]);
    return { state, bytes };
  }, [ports]);

  const refreshVision = useCallback(async () => {
    const { state, bytes } = await readVision();
    setVisionState(state);
    setVisionBytes(bytes);
  }, [readVision]);

  // **`alive` 자물쇠를 둔다** — 화면이 사라진 뒤 상태를 세우면 경고가 난다.
  // 007의 선택 읽기가 같은 방식이다.
  useEffect(() => {
    let alive = true;
    void readVision().then(({ state, bytes }) => {
      if (!alive) return;
      setVisionState(state);
      setVisionBytes(bytes);
    });
    return () => {
      alive = false;
    };
  }, [readVision]);

  const onPrepareVision = useCallback(async () => {
    await prepareVision(ports, setVisionProgress);
    setVisionProgress(null);
    await refreshVision();
  }, [ports, refreshVision]);

  const onRemoveVision = useCallback(async () => {
    await removeVision(ports);
    await refreshVision();
  }, [ports, refreshVision]);

  if (readiness === null) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.title}>캐릭터 상태를 읽는 중…</Text>
      </View>
    );
  }

  return (
    <CharacterListScreen
      readiness={readiness}
      // **판정은 순수 함수가 하고 화면은 그린다**(008). 「거부 안내가 아직 참인가」가
      // 시간에 따라 거짓이 되므로, 지우는 코드를 두지 않고 **매번 다시 묻는다.**
      view={resolveDownloadView([...progress.values()], rejection)}
      onPrepare={(character) => void onPrepare(character)}
      onPause={(character) => void acquisition.pause(character)}
      onRemove={(character) => void onRemove(character)}
      onDismissNotice={() => setRejection(null)}
      // ★ 011 — **이 줄들이 없으면 사진 보는 모델을 받을 길이 없다.**
      visionReadiness={visionState ?? undefined}
      visionProgress={visionProgress}
      visionBytes={visionBytes}
      onPrepareVision={() => void onPrepareVision()}
      onRemoveVision={() => void onRemoveVision()}
    />
  );
}

/**
 * 자동 생성 설정을 조립한다 (020) + 권한 섹션 (021).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **화면은 판정하지 않는다** — `AutoDiarySettingsScreen`은 props와 콜백만
 * 받는다. 부수 효과 순서(S6)는 여기가 지킨다:
 *
 *   토글 켬:  알림 권한 요청 → save → register
 *   토글 끔:  save → unregister
 *   시각 변경: save → reschedule
 *
 * **배터리 예외 요청은 021이 걷어냈다** — 자동 생성 토글은 더 이상 배터리
 * 인텐트를 띄우지 않는다(FR-010). 배터리 안내는 아래 `PermissionsSection`의
 * 상시 링크와 통합 온보딩이 맡는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function AutoDiarySection({
  platform,
  onboardingPorts,
  onRestartOnboarding,
  modelPorts,
  acquisition,
  progress,
  setProgress,
  rejection,
  setRejection,
}: {
  platform: "android" | "ios";
  onboardingPorts: OnboardingPorts;
  onRestartOnboarding: () => void;
  /** 029 — "일기 작성자" 섹션의 다운로드 관리에 쓴다 (기존 ModelSection). */
  modelPorts: ReturnType<typeof expoModelPorts>;
  acquisition: Acquisition;
  progress: ReadonlyMap<Character, DownloadProgress>;
  setProgress: React.Dispatch<React.SetStateAction<ReadonlyMap<Character, DownloadProgress>>>;
  rejection: DownloadRejection | null;
  setRejection: (rejection: DownloadRejection | null) => void;
}) {
  const settingsPort = useMemo(() => expoAutoDiarySettingsPort(), []);
  const backgroundPort = useMemo(() => expoBackgroundSchedulePort(), []);
  const notificationPort = useMemo(() => expoNotificationPort(), []);

  const [settings, setSettings] = useState<AutoDiarySettings | null>(null);
  const [notificationDenied, setNotificationDenied] = useState(false);

  /* ── 029 — "일기 작성자"·"사진 보기"·"장소명" 섹션 ─────────────────────── */
  const selectionPort = useMemo(() => expoSelectionPort(), []);
  const visionPort = useMemo(() => expoVisionSettingPort(), []);
  const geoPort = useMemo(() => expoGeocodingSettingPort(), []);
  const [author, setAuthor] = useState<Character | null>(null);
  const [readyChars, setReadyChars] = useState<readonly Character[]>([]);
  const [visionPref, setVisionPref] = useState<VisionPreference>("auto");
  const [geoPref, setGeoPref] = useState<GeocodingPreference>("auto");

  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadSelection(selectionPort).catch(() => null),
      readyCharacters(),
      loadVisionSetting(visionPort).catch(() => "auto" as const),
      loadGeocodingSetting(geoPort).catch(() => "auto" as const),
    ]).then(([a, r, v, g]) => {
      if (!alive) return;
      setAuthor(a);
      setReadyChars(r);
      setVisionPref(v);
      setGeoPref(g);
    });
    return () => {
      alive = false;
    };
  }, [selectionPort, visionPort, geoPort]);

  const onSelectAuthor = useCallback(
    (index: number) => {
      const character = CHARACTERS[index];
      if (character === undefined || !readyChars.includes(character)) return;
      setAuthor(character);
      void saveSelection(selectionPort, character).catch(() => {});
    },
    [readyChars, selectionPort],
  );

  const onSelectVisionPref = useCallback(
    (v: VisionPreference) => {
      setVisionPref(v);
      void saveVisionSetting(visionPort, v).catch(() => {});
    },
    [visionPort],
  );

  const onSelectGeoPref = useCallback(
    (g: GeocodingPreference) => {
      setGeoPref(g);
      void saveGeocodingSetting(geoPort, g).catch(() => {});
      // "켬"일 때 위치 런타임 권한을 요청한다(017 L8·L9 — 실패해도 값은 유지).
      if (g === "on") {
        void import("expo-location")
          .then((Location) => Location.requestForegroundPermissionsAsync())
          .catch(() => {});
      }
    },
    [geoPort],
  );

  useEffect(() => {
    let alive = true;
    void loadAutoDiarySettings(settingsPort).then((loaded) => {
      if (alive) setSettings(loaded);
    });
    return () => {
      alive = false;
    };
  }, [settingsPort]);

  // `enabled: true`인 채 마운트되면 태스크를 재등록한다(B5 — 재부팅 후
  // 재등록). `register()`는 idempotent다.
  useEffect(() => {
    if (settings?.enabled === true) void backgroundPort.register().catch(() => {});
  }, [settings?.enabled, backgroundPort]);

  // S6 순서는 `settings-effects.ts`의 순수 조합 함수가 지킨다(기기 없이 검증).
  const effectDeps = useMemo(
    () => ({ settingsPort, backgroundPort, notificationPort }),
    [settingsPort, backgroundPort, notificationPort],
  );

  const onToggleEnabled = useCallback(
    async (enabled: boolean) => {
      if (settings === null) return;
      if (!enabled) {
        setSettings(await applyToggleOff(settings, effectDeps));
        return;
      }
      const { settings: next, notificationDenied: denied } = await applyToggleOn(
        settings,
        effectDeps,
      );
      setSettings(next);
      setNotificationDenied(denied);
    },
    [settings, effectDeps],
  );

  const onChangeTargetHour = useCallback(
    async (hour: number) => {
      if (settings === null) return;
      setSettings(await applyTargetHour(settings, hour, effectDeps));
    },
    [settings, effectDeps],
  );

  const onOpenBatterySettings = useCallback(() => {
    void onboardingPorts.battery.openSettingsList().catch(() => {});
  }, [onboardingPorts]);

  if (settings === null) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.title}>설정을 읽는 중…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.settingsPage}>
      <AutoDiarySettingsScreen
        settings={settings}
        onToggleEnabled={(enabled) => void onToggleEnabled(enabled)}
        onChangeTargetHour={(hour) => void onChangeTargetHour(hour)}
        onOpenBatterySettings={onOpenBatterySettings}
        notificationDenied={notificationDenied}
      />

      {/* 029 — 일기 작성자 (FR-023). persona 이름·소개·준비 여부만. */}
      <AuthorPicker
        options={CHARACTERS.map((character) => ({
          name: personaOf(character).name,
          tagline: personaOf(character).tagline,
          ready: readyChars.includes(character),
          selected: author === character,
        }))}
        onSelect={onSelectAuthor}
      />

      {/* 029 — 사진 보기 (FR-024). 자동/보지 않음/빠르게 봄/자세히 봄. */}
      <VisionPicker selected={visionPref} onSelect={onSelectVisionPref} />

      {/* 029 — 장소명 (FR-025). 자동/켬/끔. */}
      <GeocodingSettingToggle mode={geoPref} onSelect={onSelectGeoPref} />

      {/* 029 — 미준비 캐릭터·VLM 다운로드 관리 (기존 ModelSection, SS4). */}
      <ModelSection
        ports={modelPorts}
        acquisition={acquisition}
        progress={progress}
        setProgress={setProgress}
        rejection={rejection}
        setRejection={setRejection}
      />

      {/* 021 — 권한 상태·재요청·온보딩 재실행 (FR-017~020). prod에도 있다. */}
      <PermissionsSection
        platform={platform}
        requirements={PERMISSION_REQUIREMENTS}
        ports={onboardingPorts}
        onRestartOnboarding={onRestartOnboarding}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 이전에는 탭 위에 얹힌 작은 창이라 `maxHeight`가 있었다(260). 이제 개발자
  // 탭이 다른 두 탭과 같은 자격으로 화면 전체를 쓰므로 그 제약이 없다.
  diagnostics: { flex: 1 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  tab: { paddingVertical: 12, paddingHorizontal: 20 },
  tabOn: { fontSize: 15, fontWeight: "600" },
  tabOff: { fontSize: 15, opacity: 0.5 },
  placeholder: {
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 16,
  },
  settingsPage: { gap: 20, paddingBottom: 24 },
});
