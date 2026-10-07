// 032 — NativeWind 스타일 부수 효과 import. `metro.config.js`의 `input`과 짝이며
// 이 줄이 없으면 런타임에 tailwind base/유틸리티가 실리지 않는다(BC4).
import "./global.css";
import { PortalHost } from "@rn-primitives/portal";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { expoSelectionPort, loadSelection, saveSelection } from "./src/app/selection-store";
import { resolveGenerationParams } from "./src/app/resolve-generation";
import { routeFromNotification } from "./src/app/notification-routing";
import type { DayDate } from "./src/config/day-boundary";
import {
  ensureAutoDiaryTaskDefined,
  runAutoDiaryTask,
  // 부수 효과: 전역 스코프 TaskManager.defineTask 등록 경로를 모듈에 들인다.
} from "./src/schedule/task";
import {
  expoBackgroundSchedulePort,
  type BackgroundSchedulePort,
} from "./src/schedule/background-port";
import { expoBatteryExceptionPort } from "./src/schedule/battery-exception-port";
import { expoNotificationPort } from "./src/schedule/notification-port";
import { acknowledgeNotified, expoNotifiedStorePort } from "./src/schedule/notified-store";
import { clearStaleLocksOnStart } from "./src/schedule/lock";
import { expoLockPort } from "./src/schedule/lock-port";
import {
  clearSkippedDay,
  expoSkipStorePort,
  loadSkippedDay,
  type SkipStorePort,
} from "./src/schedule/skip-store";
import { resolveAutoWrite } from "./src/schedule/auto-write";
import {
  expoAutoDiarySettingsPort,
  loadAutoDiarySettings,
  type AutoDiarySettings,
  type AutoDiarySettingsPort,
} from "./src/schedule/settings";
import { applyTargetHour, applyToggleOff, applyToggleOn } from "./src/schedule/settings-effects";
import { expoPhotoPort } from "./src/signals/expo-port";
import { loadOnboardingFlag, saveOnboardingFlag, type OnboardingFlag } from "./src/onboarding/flag";
import {
  essentialAssetsReady,
  ONBOARDING_DEFAULT_CHARACTER,
} from "./src/onboarding/essential-assets";
import {
  expoEssentialAssetsPort,
  readEssentialRemainingBytes,
} from "./src/app/essential-assets-port";
import { expoOnboardingFlagPort } from "./src/onboarding/flag-port";
import { expoLocationPermissionPort } from "./src/onboarding/location-permission-port";
import { expoOsSettingsPort } from "./src/onboarding/os-settings-port";
import { PERMISSION_REQUIREMENTS } from "./src/onboarding/requirements";
// 035 — 환영 연출·작명. 조립부가 파일을 읽고 화면에는 문자열만 넘긴다.
import { displayNameOf, type CustomNames } from "./src/diary/character-name";
import { shouldShowWelcome } from "./src/welcome/decision";
import { validateCharacterName } from "./src/welcome/naming";
import { expoCharacterNamesPort, loadCustomNames, saveCustomNames } from "./src/welcome/names-port";
import { shouldShowLogo } from "./src/firstrun/logo";
import { resolveFirstRunStage } from "./src/firstrun/progress";
import { shouldAutoGenerate } from "./src/firstrun/auto-diary";
import { LogoScreen } from "./src/ui/LogoScreen";
import { OnboardingScreen, type OnboardingPorts } from "./src/ui/OnboardingScreen";
import { DownloadConsentDialog } from "./src/ui/DownloadConsentDialog";
import { DownloadProgressScreen } from "./src/ui/DownloadProgressScreen";
import { WelcomeScreen, type WelcomePhase } from "./src/ui/WelcomeScreen";
import { SettingsFrame } from "./src/ui/SettingsFrame";
import { DeveloperScreen, type SimulationToggle } from "./src/ui/DeveloperScreen";
import { DeveloperToast } from "./src/ui/DeveloperToast";
import { RedownloadConfirmDialog } from "./src/ui/RedownloadConfirmDialog";
import { DEVELOPER_TEXT, SIMULATION_TEXT } from "./src/ui/developer-text";
import { useDeveloperMenu } from "./src/ui/use-developer-menu";
import { SimulationDateDialog } from "./src/ui/SimulationDateDialog";
import { useSimulation } from "./src/ui/use-simulation";
import { useDeveloperTaps } from "./src/ui/use-developer-taps";
import { useToastLine } from "./src/ui/use-toast-line";
import { SettingsScreen } from "./src/ui/SettingsScreen";
import { TargetHourDialog } from "./src/ui/TargetHourDialog";
import { PlaceNameDialog } from "./src/ui/PlaceNameDialog";
import { formatTargetHour, timeZoneLine } from "./src/app/target-hour";
import { readDeviceClock } from "./src/app/device-clock";
import { RenameScreen } from "./src/ui/RenameScreen";
import { usePermissionTags } from "./src/ui/use-permission-tags";
import type { PermissionFacts, PhotoLocationReading } from "./src/app/permission-tags";
import { photoLocationProbe } from "./src/app/photo-location-probe";
import { formatVersion } from "./src/app/version";
import { expoDeveloperMenuStorePort } from "./src/app/developer-menu-store";
import {
  simulatedNow,
  simulatedPreviewDay,
  simulationBlocksWriting,
  type SimulationState,
} from "./src/app/simulation";
import { expoSimulationStorePort } from "./src/app/simulation-store";
import type { DayPreview } from "./src/app/state";
import { buildLabelFor } from "./src/app/developer-build-label";
import { readDeviceModuleLines, type ModuleLines } from "./src/app/module-lines";
import { planRedownload } from "./src/app/redownload-plan";
import { readConnection } from "./src/app/network-port";
import { onboardingGateNeeded, permissionStepsDecided } from "./src/app/onboarding-gate";
import { skippedLineText } from "./src/app/skipped-line";
import { formatModuleBytes, readModuleBytes } from "./src/app/module-size";
import { wipeDiaries, type WipeOutcome } from "./src/app/wipe-diaries";
import { clearPhotoCopies } from "./src/app/wipe-port";
import { WipeConfirmDialog } from "./src/ui/WipeConfirmDialog";
import { SETTINGS_TEXT } from "./src/ui/settings-text";
import { StackLayer } from "./src/ui/StackLayer";
import { AppText } from "./src/ui/components/Text";
import { COLORS } from "./src/ui/theme/tokens";
import {
  expoGeocodingSettingPort,
  loadGeocodingSetting,
  saveGeocodingSetting,
  type GeocodingPreference,
  type GeocodingSettingPort,
} from "./src/app/geocoding-setting-store";
import { dayBounds, dayOf, isDayWritable, selectableDays } from "./src/config/day-boundary";
import { createAppPipeline, triggerFirstRunAutoDiary } from "./src/app/wiring";
import { currentEnvironment } from "./src/config/environment";
import { showsOnScreen } from "./src/diagnostics/sink";
import { collectReport } from "./src/diagnostics/report";
import type { DiagnosticReport } from "./src/diagnostics/types";
import { languageResolution, text } from "./src/i18n/current";
import { DIAGNOSTICS_TEXT } from "./src/app/diagnostics-text";
import {
  canRequestPhoto,
  environmentLines,
  languageLine,
  failureLines,
  photoPermissionLines,
  probeCells,
  storageValue,
  type FailureLine,
  type PhotoPermissionLines,
  type ProbeCell,
} from "./src/app/diagnostics-view";
import { inspectDiaries, type DiaryInspection } from "./src/app/diary-inspect";
import {
  expoWriteFailurePort,
  loadWriteFailures,
  recordWriteFailure,
} from "./src/app/write-failures";
import type { PermissionState } from "./src/signals/port";
import { collectDaySignals } from "./src/signals/collect";
import { expoFileSystemPort, fileStore } from "./src/diary/store";
import { CHARACTERS, type Character } from "./src/diary/types";
import { expoModelPorts } from "./src/models/expo-port";
import { readinessOf } from "./src/models/readiness";
import { assetFor } from "./src/models/roster";
import { pausedFor, readState, verdictFor } from "./src/models/storage";
import { DiagnosticsScreen, type AutoRunResult } from "./src/ui/DiagnosticsScreen";
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
    // 046 — react-native-reanimated-carousel(다운로드 진행 화면)의 필수
    // peer dependency인 react-native-gesture-handler가 요구하는 배선.
    // 공식 가이드가 앱 루트 1회 래핑을 권장한다(research.md R3) — 이
    // 안의 다른 화면들이 제스처 기반 컴포넌트를 쓸 때도 다시 감쌀 필요가
    // 없다.
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 인셋을 재는 자리. 이것이 없으면 아래 `SafeAreaView`가 잴 값을 얻지 못한다. */}
      <SafeAreaProvider>
        <AppFrame />
        {/* 050 — RNR 대화상자·메뉴가 열릴 때 내용을 올리는 자리(research R4). 안전 영역 안의
            마지막 자식이라 모든 화면 위에 겹친다. 하나만 둔다(contracts DEP5). */}
        <PortalHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * 다운로드 실패 시 자동 재시도 간격(046 spec Assumptions — 사람이 정한
 * 고정 값, 원칙 V). 성공할 때까지 이 간격으로 무한 반복한다.
 */
const DOWNLOAD_RETRY_INTERVAL_MS = 10_000;

/**
 * 060 — 홈에서 뜨는 토스트의 바닥(dp). 쓰는 중 하단 바(「그만두기」, 높이 56 안팎) 위로 12 + 여유. 사람이 정한 값이다 —
 * 실기기에서 바와 겹치지 않는지 본다(quickstart 5).
 */
const HOME_TOAST_BOTTOM = 88;

function AppFrame() {
  /*
   * ★ 055 — 환경 판정은 **마운트 때 한 번만** 한다. `currentEnvironment()`는 부를 때마다 새 객체를 돌려준다 — 렌더마다
   * 부르면 그 값을 의존성으로 쓰는 effect·`useMemo`가 매 렌더 다시 돈다(아래 `DiarySection` 주석의 실기기 결함).
   */
  const [environment] = useState(() => currentEnvironment());
  const showsDiagnostics = showsOnScreen(environment);
  /**
   * 048 — 지금 어느 화면인가. 탭이 아니라 **홈이 뿌리이고 나머지는 하위 화면**이다(설계 D1).
   * `developer`는 `showsDiagnostics`일 때만 들어갈 수 있다 — 메뉴에 항목이 아예 없다(FR-003).
   */
  const [route, setRoute] = useState<"home" | "settings" | "developer">("home");
  /**
   * 059 — 개발자 메뉴가 켜져 있는가(보드 `6d`). 환경이 이긴다 — 개발 환경은 늘 켜짐이고 끄기는 그 실행 동안만(`use-developer-menu.ts`).
   * 설정 겹은 닫히면 언마운트되므로 상태는 여기서 한 번 든다(056 설정 값과 같은 이유).
   */
  const developerStore = useMemo(() => expoDeveloperMenuStorePort(), []);
  const developer = useDeveloperMenu({ devEnvironment: showsDiagnostics, port: developerStore });
  /** 059 — 설정·개발자 겹이 함께 쓰는 토스트 한 줄(한 번에 하나, 2초) */
  const toastLine = useToastLine();
  /** 059 — 진단 겹이 개발자 겹 위에 열려 있는가(개발 환경에서만 참이 될 수 있다) */
  const [diagnosing, setDiagnosing] = useState(false);
  const openDiagnostics = useCallback(() => setDiagnosing(true), []);
  const closeDiagnostics = useCallback(() => setDiagnosing(false), []);
  /* ── 055 → 059 — 버전. 설치본의 값을 읽는다(R5). 읽지 못하면 비운다. 설정 「버전」 행과 개발자 화면 머리글이 함께 쓴다 ─── */
  const [versionText, setVersionText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void import("expo-application")
      .then((Application) =>
        formatVersion(Application.nativeApplicationVersion, Application.nativeBuildVersion),
      )
      .catch(() => null)
      .then((text) => {
        if (alive) setVersionText(text);
      });
    return () => {
      alive = false;
    };
  }, []);
  /** 059 — 개발자 화면의 모듈 줄. 겹이 열릴 때 읽고, 읽기 전·실패한 줄은 `null`(값을 비운다) */
  const [moduleLines, setModuleLines] = useState<ModuleLines>({ reading: null, writing: null });
  useEffect(() => {
    if (route !== "developer") return;
    let alive = true;
    void readDeviceModuleLines()
      .catch((): ModuleLines => ({ reading: null, writing: null }))
      .then((lines) => {
        if (alive) setModuleLines(lines);
      });
    return () => {
      alive = false;
    };
  }, [route]);
  /**
   * 055 — 이름 바꾸기 겹이 설정 위에 열려 있는가. 설정이 닫히면 함께 닫힌다(홈으로 돌아올 때 남지 않는다).
   */
  const [renaming, setRenaming] = useState(false);
  const closeRename = useCallback(() => setRenaming(false), []);
  const goHome = useCallback(() => {
    setRoute("home");
    setRenaming(false);
    setDiagnosing(false);
  }, []);
  /** 059 — 개발자 화면의 「‹ 설정」: 설정은 아래에 그대로 열려 있으므로 `route`만 되돌린다(R8) */
  const backToSettings = useCallback(() => {
    setDiagnosing(false);
    setRoute("settings");
  }, []);
  /**
   * ★ 060 — 진단의 「지금 한 번 써 보기」(보드 `6k`). 설정·개발자·진단 세 겹을 닫아 홈의 오늘로 돌아가고, 홈에 쓰기 요청을 올린다.
   * 홈이 054 제자리 쓰기로 시작한다 — 진단이 파이프라인을 따로 돌리지 않는다(042: 검증 경로가 제품과 다르면 검증이 아니다).
   * 요청은 번호표(`id`)다 — 홈이 시작하거나 거절하면 `onWriteRequestHandled`로 비운다.
   */
  const [writeRequest, setWriteRequest] = useState<{ id: number; day: DayDate } | null>(null);
  const writeRequestId = useRef(0);
  const showToast = toastLine.show;
  const onDiagnosticsTryOnce = useCallback(() => {
    goHome();
    writeRequestId.current += 1;
    // 「오늘」은 누른 순간의 오늘이다 — 홈은 하루 경계를 따로 계산하지 않는다(051 BAR7)
    setWriteRequest({ id: writeRequestId.current, day: dayOf(new Date()) });
    showToast(DIAGNOSTICS_TEXT.tryOnceToast);
  }, [goHome, showToast]);
  const onWriteRequestHandled = useCallback(
    (id: number) => setWriteRequest((request) => (request?.id === id ? null : request)),
    [],
  );
  const openDeveloper = useCallback(() => setRoute("developer"), []);
  const openSettings = useCallback(() => setRoute((r) => (r === "settings" ? r : "settings")), []);

  /**
   * 055 — 겹이 그려져 있는가(닫히는 움직임이 끝날 때까지 참). **홈은 언마운트하지 않는다**(설계 D4) — 겹이 그 위에
   * 덮일 뿐이다. 덮인 동안 홈은 뒤로 가기·누름·스크린리더에서 빠진다(`covered`, research R2·R3). `route`만 보면 닫히는
   * 240ms 동안 홈이 뒤로 가기를 다시 등록해 겹과 겨룬다 — 그래서 겹이 알려 주는 마운트 상태를 함께 본다.
   */
  const [layersMounted, setLayersMounted] = useState({ settings: false, developer: false });
  const onSettingsSettled = useCallback(
    (mounted: boolean) => setLayersMounted((m) => ({ ...m, settings: mounted })),
    [],
  );
  const onDeveloperSettled = useCallback(
    (mounted: boolean) => setLayersMounted((m) => ({ ...m, developer: mounted })),
    [],
  );
  const homeCovered = route !== "home" || layersMounted.settings || layersMounted.developer;
  /** 060 — 홈에서 뜨는 토스트(진단에서 쓰기를 시작했어요)는 하단 바 위로, 설정·개발자의 토스트는 아래 그대로 */
  const toastBottom = route !== "home" ? 24 : HOME_TOAST_BOTTOM;

  /**
   * ★ 056 — 설정 값(자동 쓰기 설정·장소 갈래)은 여기서 **앱 실행마다 한 번** 읽어 들고 있는다(FR-030, research R5).
   * 설정 겹은 닫히면 언마운트되므로(`StackLayer`) 거기서 읽으면 열 때마다 「설정을 읽는 중…」이 약 1초 보였다(055 관측).
   * 이 두 파일을 쓰는 곳은 설정 화면뿐이라(백그라운드 태스크는 읽기만) 여기 값이 낡을 경로가 없다. 생성 파이프라인은 장소명
   * 파일을 매번 직접 읽는다(아래 `DiarySection`) — 이 보관과 무관하다. 아직 못 읽었으면 `null` — 기본값을 그리지 않는다(FR-031).
   */
  const settingsPort = useMemo(() => expoAutoDiarySettingsPort(), []);
  const backgroundPort = useMemo(() => expoBackgroundSchedulePort(), []);
  const geoPort = useMemo(() => expoGeocodingSettingPort(), []);
  const [settingsValues, setSettingsValues] = useState<SettingsValues | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadAutoDiarySettings(settingsPort),
      loadGeocodingSetting(geoPort).catch(() => "auto" as const),
    ]).then(([autoDiary, geocoding]) => {
      if (alive) setSettingsValues({ autoDiary, geocoding });
    });
    return () => {
      alive = false;
    };
  }, [settingsPort, geoPort]);
  const onAutoDiaryChange = useCallback(
    (autoDiary: AutoDiarySettings) =>
      setSettingsValues((v) => (v === null ? v : { ...v, autoDiary })),
    [],
  );
  const onGeocodingChange = useCallback(
    (geocoding: GeocodingPreference) =>
      setSettingsValues((v) => (v === null ? v : { ...v, geocoding })),
    [],
  );
  // 020 B5 — `enabled: true`면 태스크를 재등록한다(재부팅 후 재등록). `register()`는 idempotent다. 056부터 설정을 열지
  // 않아도 앱을 열면 돈다(값을 여기서 들고 있으므로).
  const autoDiaryEnabled = settingsValues?.autoDiary.enabled === true;
  useEffect(() => {
    if (autoDiaryEnabled) void backgroundPort.register().catch(() => {});
  }, [autoDiaryEnabled, backgroundPort]);

  /**
   * 048 — 홈에서 고른 하루 (Clarification Q4, FR-005a).
   *
   * 설정·개발자에 다녀오면 홈(`DiarySection`)이 언마운트되고, 040의 자동 첫 일기 후에도 다시
   * 마운트된다. 여기 들고 있어야 돌아왔을 때 같은 날이 골라져 있다. **파일에는 남기지 않는다**
   * (009).
   *
   * **049 — 앱을 새로 열면 오늘이다**(FR-010a, 048 D9를 뒤집음). 초기값을 `null`로 두지 않는다 —
   * `null`이면 기본값(오늘)이 켜 둔 채 자정을 넘길 때 새 오늘을 따라가 「보던 날 유지」(FR-019)가
   * 깨진다. 마운트 시점의 오늘을 값으로 들고 있는다(AF1).
   */
  const [chosenDay, setChosenDay] = useState<DayDate | null>(() => dayOf(new Date()));

  /** 064 — 흉내 기록을 읽었다. 날짜 흉내가 있으면 홈이 그 날을 고른다(앱을 열면 오늘이다 — 049) */
  const onSimulationLoaded = useCallback((loaded: SimulationState) => {
    if (loaded.date !== null) setChosenDay(loaded.date);
  }, []);
  /**
   * ★ 064 — 상태 흉내(보드 `6e` ③·`6i`). 개발 환경에서만 읽고 쓴다(S7). 흉내 값은 **홈 표시에만** 들어간다 — 홈의 「지금」(`homeNow`)과
   * 미리보기(`homePreviewDay`). 하나라도 켜져 있으면 다섯 쓰기 진입점이 쓰지 않는다(`writeBlocked`, S8): 홈 쓰기 바·앱 열기 자동 시작·
   * 진단 쓰기 요청은 홈이, 진단 두 버튼은 진단 화면이, 백그라운드는 `runAutoDiaryTask`가 기록을 직접 읽어 막는다.
   */
  const simulationStore = useMemo(() => expoSimulationStorePort(), []);
  const simulation = useSimulation({
    devEnvironment: showsDiagnostics,
    port: simulationStore,
    // 064 — 앱을 열면 오늘이다(049) — 날짜 흉내가 저장돼 있으면 그 날이 오늘이므로 읽은 뒤 홈이 그 날을 고른다(AF1)
    onLoaded: onSimulationLoaded,
  });
  const writeBlocked = simulationBlocksWriting(simulation.state);
  const simulationDate = simulation.state.date;
  const homeNow = useCallback(() => simulatedNow(simulationDate, new Date()), [simulationDate]);
  const homePreviewDay = useMemo(() => simulatedPreviewDay(simulation.state), [simulation.state]);
  const [simulationDateOpen, setSimulationDateOpen] = useState(false);

  /**
   * 064 — 날짜 흉내를 켜거나 바꾸면 홈이 그 날을 고르고, 끄면 실제 오늘을 고른다(Clarification Q1, AF1). 대화상자는 닫는다.
   */
  const simulationState = simulation.state;
  const setSimulationState = simulation.set;
  const setSimulationDate = useCallback(
    (date: DayDate | null) => {
      setSimulationState({ ...simulationState, date });
      setChosenDay(date ?? dayOf(new Date()));
      setSimulationDateOpen(false);
    },
    [simulationState, setSimulationState, setSimulationDateOpen],
  );
  const toggleSimulation = useCallback(
    (key: SimulationToggle) =>
      setSimulationState({ ...simulationState, [key]: !simulationState[key] }),
    [simulationState, setSimulationState],
  );
  const showToastLine = toastLine.show;
  const onWriteBlocked = useCallback(
    () => showToastLine(SIMULATION_TEXT.blockedToast),
    [showToastLine],
  );

  /*
   * 051 수정 — 홈의 `⋯` 메뉴(048)를 없앴다(저장소 소유자 지시 — 보드 `1d`·`2c`의 하단 바에 메뉴가
   * 없다). 설정·개발자로 가는 길은 설정 화면 구성 과제에서 다시 둔다. 그때까지 설정은 「캐릭터를 먼저
   * 준비해야 한다」 실패 화면의 링크(029)로만 닿고, 개발자 화면은 닿을 길이 없다.
   */

  /**
   * 020 — 알림 라우팅.
   *
   * ───────────────────────────────────────────────────────────────────────────
   * **웜**: `onResponse`가 탭 응답을 준다. **콜드**: 마운트 시 `lastResponse()`를
   * 1회 await한다(앱을 연 마지막 알림). 둘 다 `routeFromNotification`(순수)을
   * 거쳐 `pendingRoute`가 된다 — `DiaryHomeScreen`이 `initialDay`로 받아
   * **그 하루를 홈의 고른 날로 만든다**(051 FR-027 — 상세 화면이 사라졌다). 홈이 그 날을
   * 적용하면(`onInitialDayApplied`) 경로를 비운다 — 일기가 없어 확인이 안 불려도 설정 왕복 뒤
   * 그 날로 되돌아가지 않게(051 research R6).
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
        setRoute("home");
        setRenaming(false);
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

  /**
   * 040 — 이번 세션에 로고를 이미 지났는가.
   *
   * ───────────────────────────────────────────────────────────────────────────
   * **세션 로컬 상태이며 영구 저장하지 않는다**(research.md #6, contracts G3).
   * `onboarding.json`에 필드를 추가하면 021의 `FLAG_GROWS_HISTORY` 검사가
   * 막아온 패턴(boolean 이력이 아닌 세션성 상태를 영구 파일에 쌓는 것)에
   * 가까워진다 — 앱을 껐다 켜면 다시 로고부터 보여도 spec과 상충하지 않는다
   * (Edge Case가 막는 것은 "권한 재질문"이지 "로고 1회성 보장"이 아니다).
   * ───────────────────────────────────────────────────────────────────────────
   */
  const [onboardingStarted, setOnboardingStarted] = useState(false);

  /**
   * 040 — 권한 스텝이 전부 결정됐는가(에셋 준비와 무관, FR-004).
   *
   * ───────────────────────────────────────────────────────────────────────────
   * `OnboardingScreen`의 `onAllStepsDecided`가 세운다 — 021의 `shouldShowOnboarding`
   * (에셋 준비까지 요구)과 달리, 이 값은 **권한 결정만** 본다. 이것이 true가
   * 되면 `App.tsx`는 `OnboardingScreen`(그 안의 "필수 에셋 다운로드" 단계 UI
   * 포함)을 떠나 작명 화면으로 전환하고, 다운로드는 백그라운드로 계속된다
   * (research.md #3 — `shouldShowWelcome`이 `essentialAssetsReady`를 더 이상
   * 요구하지 않는 것과 같은 판단).
   *
   * ★ **이미 온보딩을 완료한 기존 사용자**(`flag.completed === true`)는 이
   * 세션에서 권한 스텝을 한 번도 안 밟아도 권한 결정이 이미 끝난 것과 같다
   * — 아래 `useEffect`가 플래그 로드 직후 이 값을 `true`로 시드한다. 시드하지
   * 않으면 `flag.completed === true`인데 에셋만 없는 사용자(028/029가 고친
   * 결함)가 `OnboardingScreen`도 `WelcomeScreen`도 못 보고 곧장 깨진 탭
   * UI로 떨어진다 — 반드시 시드해야 한다.
   * ───────────────────────────────────────────────────────────────────────────
   */
  const [permissionStepsDecidedThisSession, setPermissionStepsDecidedThisSession] = useState(false);
  // 플래그 로드 결과가 이미 "완료"라면 이번 세션에서 권한 스텝을 밟지
  // 않아도 결정된 것과 같다 — 렌더 중 파생값으로 합쳐 effect의
  // setState-in-effect 경고(react-hooks/set-state-in-effect)를 피한다.
  // 059 R7 — 「이미 완료함」은 다시 보기(`forceOnboarding`)를 요청한 동안은 결정으로 세지 않는다(옛 식은 force를 죽였다).
  const stepsDecided = permissionStepsDecided({
    decidedThisSession: permissionStepsDecidedThisSession,
    completed: onboardingFlag?.completed === true,
    force: forceOnboarding,
  });
  const setPermissionStepsDecided = setPermissionStepsDecidedThisSession;

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
  const [essentialsReady, setEssentialsReadyState] = useState<boolean | null>(null);

  /**
   * ★ 048 실기기 — 이번 세션에 필수 에셋이 **없는** 것을 한 번이라도 봤는가.
   *
   * 다운로드 완료 화면(「준비됐어요 / 시작할게요」)은 **내려받기가 끝난 직후 한 번**만
   * 뜬다. 이미 모델이 있는 채로 앱을 켜면 이 값이 `false`로 남아 완료 화면을 건너뛴다 —
   * 045는 이 구분 없이 `downloadProceedConfirmed`(세션 로컬)만 봐서 **재실행할 때마다**
   * 완료 화면이 먼저 떴다. 파일에 저장하지 않는다(받는 도중 앱이 죽어도 다음 실행에서
   * 에셋이 없으면 다시 참이 된다).
   */
  const [essentialsMissingSeen, setEssentialsMissingSeen] = useState(false);
  const setEssentialsReady = useCallback((ready: boolean) => {
    setEssentialsReadyState(ready);
    if (!ready) setEssentialsMissingSeen(true);
  }, []);

  /**
   * 필수 에셋 준비 여부를 다시 읽어 `essentialsReady`에 반영한다.
   *
   * 029 버그 수정 — 온보딩에서 다운로드가 **같은 세션 안에서** 끝나면 앱이
   * 백그라운드로 가지 않아 `AppState "active"`가 안 오고, `OnboardingScreen`의
   * 로컬 `assetFacts`만 갱신돼 "시작하기"가 보인다. 그런데 진입 게이트가 보는
   * 이 state는 그대로 false라 [시작하기]를 눌러도 온보딩이 다시 그려진다.
   * `onOnboardingComplete`가 이 함수를 불러 게이트가 최신 값을 보게 한다.
   */
  const refreshEssentialsReady = useCallback(
    () =>
      onboardingPorts.essentialAssets
        .readFacts()
        .then((facts) => setEssentialsReady(essentialAssetsReady(facts)))
        .catch(() => setEssentialsReady(false)),
    [onboardingPorts, setEssentialsReady],
  );

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
  }, [onboardingPorts, setEssentialsReady]);

  /**
   * ★ 057 — 사진 권한 때문에 자동 쓰기를 건너뛴 가장 최근 날 (보드 `6g`, FR-010·FR-012, research R4).
   *
   * 설정 겹은 닫히면 언마운트되므로 056의 설정 값처럼 여기서 들고 있는다. 앱이 실행될 때와 앞으로 돌아올 때 사진 권한을 읽어
   * **허용(전체·부분)이면 기록을 지운다** — 사용자가 권한을 허용하고 돌아오면 줄이 사라지고, 다시 꺼도 옛 날짜는 되살아나지
   * 않는다. **권한을 읽지 못하면 지우지 않는다**(모르는 것을 허용으로 채우지 않는다, 원칙 V). `AppState`는 다시 읽을 때를
   * 알리는 신호일 뿐 판정 입력이 아니다. 앱을 연 채 자동 쓰기가 건너뛰면 `onSkipped`가 이 값을 바로 바꾼다.
   */
  const skipPort = useMemo(() => expoSkipStorePort(), []);
  const [skippedDay, setSkippedDay] = useState<DayDate | null>(null);
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const permission = await onboardingPorts.photo.photoPermission().catch(() => null);
      if (permission === "granted" || permission === "limited") {
        await clearSkippedDay(skipPort).catch(() => {});
        if (alive) setSkippedDay(null);
        return;
      }
      const day = await loadSkippedDay(skipPort);
      if (alive) setSkippedDay(day);
    };
    void sync();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void sync();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [onboardingPorts, skipPort]);
  const onSkipped = useCallback((day: DayDate) => setSkippedDay(day), []);

  /**
   * ★ 045 — 필수 에셋 내려받기는 이제 **동의 후에만** 시작한다(FR-002).
   * `permissionStepsDecided && onboardingFlag.downloadConsented`가 함께
   * 참이 되는 순간 1회 트리거한다 — 040은 권한 결정만으로 즉시 시작했지만,
   * 이 스펙이 동의 Dialog를 그 사이에 끼워 넣었다(research.md, spec FR-001·
   * FR-002).
   *
   * **진행률 콜백은 이제 화면에 전달하지 않는다**(원칙 IV, C6) —
   * `DownloadProgressScreen`은 `essentialsReady`(완료 여부)만 구독하고
   * 041의 바이트 단위 진행률은 구독하지 않는다. 콜백 자체는 041 API 계약상
   * 필요해 넘기되 받은 값을 버린다.
   *
   * 세션 스코프 `useRef`로 중복 시작을 막는다 — `essentialsReady`가 이미
   * true(재개 등)이거나 이미 시작한 뒤에는 다시 부르지 않는다.
   *
   * ★ convergence(T022) — **실패를 더 이상 조용히 삼키지 않는다**(FR-011,
   * 원칙 I). `downloadFailed` 상태가 실패를 화면에 노출한다.
   *
   * ★ 046 — **재시도는 더 이상 사용자 버튼이 아니다.** 실패하면 10초 간격
   * 자동 재시도 `useEffect`(아래)가 `essentialDownloadStarted.current`를
   * 스스로 되돌려 이 effect를 재트리거한다(research.md R6, contracts D8 —
   * 재시도는 화면이 아니라 이 조립 계층의 책임).
   */
  const essentialDownloadStarted = useRef(false);
  const [downloadFailed, setDownloadFailed] = useState(false);

  /**
   * 자동 재시도를 다시 돌게 하는 신호(046) — 값 자체엔 의미가 없고
   * (원칙 IV, 지표 아님) 아래 `useEffect`의 의존성 배열용이다.
   * `essentialDownloadStarted.current`가 `useRef`라 값 변경만으로는
   * effect가 재실행되지 않으므로 state 하나가 필요하다.
   */
  const [downloadRetryToken, setDownloadRetryToken] = useState(0);

  /**
   * 필수 자산 합산 진행률(0~1) — `DownloadProgressScreen`의 4분할
   * 프로그레스 바에 그대로 전달한다(046 FR-005). 화면은 이 값만 받고
   * 자산 개수·식별자를 모른다(원칙 IV).
   */
  const [downloadFraction, setDownloadFraction] = useState(0);

  useEffect(() => {
    if (!stepsDecided) return;
    if (onboardingFlag?.downloadConsented !== true) return;
    if (essentialsReady === null || essentialsReady === true) return;
    if (essentialDownloadStarted.current) return;
    essentialDownloadStarted.current = true;
    setDownloadFailed(false);

    void onboardingPorts.essentialAssets
      .downloadEssentials((fraction) => {
        setDownloadFraction(fraction);
      })
      .then((result) => {
        // 066 — 통로는 실패를 던지지 않고 값으로 돌려준다(`{ ok: false, reason }`).
        // `.catch`만 보면 실패해도 「받는 중이에요」에 영영 머문다(iOS 시뮬레이터의
        // TLS 실패에서 관측). 이유는 화면에 올리지 않는다(원칙 III).
        if (!result.ok) {
          setDownloadFailed(true);
          return;
        }
        return refreshEssentialsReady();
      })
      .catch(() => {
        // 오류 원문을 저장하지 않는다(원칙 III) — 실패했다는 사실만
        // 화면에 노출한다. 아래 자동 재시도 useEffect가 10초 뒤
        // essentialDownloadStarted를 되돌려 이 effect를 재트리거한다.
        setDownloadFailed(true);
      });
  }, [
    stepsDecided,
    onboardingFlag,
    essentialsReady,
    onboardingPorts,
    refreshEssentialsReady,
    downloadRetryToken,
  ]);

  /**
   * ★ 046 — 실패 시 자동 재시도(FR-012, contracts D8). 사용자 조작 없이
   * 10초 간격으로 계속 시도하며, 성공(또는 화면 이탈)할 때까지 반복한다
   * (research.md R6 — 재시도 타이머는 조립 계층에 둔다, 화면은 `failed`
   * boolean만 받는다).
   */
  useEffect(() => {
    if (!downloadFailed) return;
    const id = setTimeout(() => {
      essentialDownloadStarted.current = false;
      setDownloadFailed(false);
      setDownloadRetryToken((n) => n + 1);
    }, DOWNLOAD_RETRY_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [downloadFailed]);

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
      // 031 — photo-location 단계 제거로 좌표 권한 안내는 여기서 다루지 않는다.
      // (원래도 `location`(FINE_LOCATION) 거부 안내는 push하지 않았다.)
      const photo = await onboardingPorts.photo.photoPermission().catch(() => "unknown" as const);
      const notices: string[] = [];
      const isDenied = (s: string) => s === "denied" || s === "blocked";
      const req = (key: string) => PERMISSION_REQUIREMENTS.find((r) => r.key === key);
      if (isDenied(photo)) notices.push(req("photos")?.ifDenied ?? "");
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
  }, [onboardingPorts]);

  const onOnboardingComplete = useCallback(
    (flag: OnboardingFlag) => {
      setOnboardingFlag(flag);
      setForceOnboarding(false);
      void saveOnboardingFlag(onboardingFlagPort, flag).catch(() => {});
      // 029 버그 수정 — 세션 안에서 에셋 다운로드가 끝났으면 `essentialsReady`가
      // stale이다(위 `refreshEssentialsReady` 주석 참조). 게이트가 최신 값을 보게 한다.
      void refreshEssentialsReady();
    },
    [onboardingFlagPort, refreshEssentialsReady],
  );

  /**
   * ★ 040 — 권한 스텝이 전부 결정된 순간(FR-004) 온보딩 화면을 떠나면서
   * **`completed: true`를 함께 저장한다**.
   *
   * ───────────────────────────────────────────────────────────────────────────
   * 021에서는 마지막 [시작하기] 버튼이 `onComplete`를 불러 이 플래그를
   * 세웠는데, 040은 권한 결정 직후 작명 화면으로 전환하므로 **그 버튼에
   * 도달하지 않는다** — 저장하지 않으면 `completed`가 영원히 `false`로 남아
   * 앱을 다시 열 때마다 권한 온보딩이 재노출된다(FR-010·FR-011 위반).
   *
   * 실기기에서 실제로 관측된 결함이다(2026-09-11, SM-S901N): 배터리 예외를
   * 건너뛰고 작명·자동 생성까지 정상 완주했는데, 재시작하면 배터리 스텝
   * 4/4로 되돌아갔다. `onboarding.json`이 `{"completed":false,...}`였다.
   *
   * `batteryNoticeShown`은 `OnboardingScreen`이 세션 안에서 갱신하는 값이라
   * 여기서는 현재 플래그의 것을 그대로 넘긴다 — 배터리 안내를 실제로 본
   * 경우의 저장은 021의 기존 경로(`onComplete`)가 여전히 담당한다.
   * ───────────────────────────────────────────────────────────────────────────
   */
  const onAllPermissionStepsDecided = useCallback(() => {
    setPermissionStepsDecided(true);
    // 059 — 「온보딩부터 다시」가 켠 force 를 끈다(세션 결정이 참이라 게이트는 닫힌 채 남는다).
    setForceOnboarding(false);
    setOnboardingFlag((prev) => {
      if (prev === null || prev.completed === true) return prev;
      const next = { ...prev, completed: true };
      void saveOnboardingFlag(onboardingFlagPort, next).catch(() => {});
      return next;
    });
  }, [onboardingFlagPort, setPermissionStepsDecided]);

  /* ─────────────────── 035 — 환영 연출 (게이트 세 번째 단) ─────────────────── */

  /**
   * 사용자가 지은 캐릭터 이름들 (035 FR-015).
   *
   * **조립부가 파일을 읽고 화면에는 문자열만 넘긴다** — `displayNameOf()`가
   * 순수 함수로 남아야 `buildPrompt()`의 결정성(005 P6)이 지켜진다.
   */
  const characterNamesPort = useMemo(() => expoCharacterNamesPort(), []);
  const [customNames, setCustomNames] = useState<CustomNames>({});

  useEffect(() => {
    let alive = true;
    void loadCustomNames(characterNamesPort).then((names) => {
      if (alive) setCustomNames(names);
    });
    return () => {
      alive = false;
    };
  }, [characterNamesPort]);

  /**
   * ★ 040 — 작명이 다운로드와 병렬로 뜨도록, 035의 "확인 먼저 → 작명" 순서를
   * "작명 먼저 → (작명+다운로드 완료 후) 확인"으로 뒤집는다.
   *
   * ───────────────────────────────────────────────────────────────────────────
   * `namingDone`(사용자가 이름을 확정하거나 건너뛰었다)과 `livenessOutcome`
   * (아직 안 돎/성공/실패)을 각자 상태로 두고, `resolveFirstRunStage`가 이
   * 둘과 다운로드 완료 여부를 합쳐 "지금 무엇을 보여줄지"를 판정한다
   * (research.md #3·#4, contracts G4·G5). `WelcomeScreen`(035 원본)은
   * 여전히 `checking`/`welcome`/`failed` 세 갈래만 받는다 — 040은 그
   * `phase` 값을 `firstRunStage`에서 파생시킬 뿐, 035의 화면 계약 자체는
   * 건드리지 않는다.
   * ───────────────────────────────────────────────────────────────────────────
   */
  const [namingDoneThisSession, setNamingDoneThisSession] = useState(false);
  const [livenessOutcome, setLivenessOutcome] = useState<"ok" | "failed" | null>(null);
  /**
   * 사용자가 liveness 실패 화면에서 [그냥 시작하기]를 눌러 확인 자체를
   * 건너뛰기로 했다 — 아래 `onSkipLiveness` 정의부의 실기기 결함 설명 참조.
   */
  const [livenessSkipped, setLivenessSkipped] = useState(false);

  /**
   * ★ 045 — 다운로드 완료 화면("시작할게요")의 버튼을 눌렀다.
   *
   * `downloadReady`가 `true`가 되는 즉시 `firstRunStage`가 `"naming"`으로
   * 넘어가면 완료 화면이 사용자가 버튼을 누를 틈도 없이 사라진다(FR-007
   * 위반, 구현 중 발견). `namingDone`과 같은 세션 로컬 패턴으로 막는다 —
   * 파일에 저장하지 않는다(009 "고른 하루를 파일에 남기지 않는다"와 같은
   * 이유, 앱을 재시작하면 다시 한번 완료 화면을 보되 041 덕에 다운로드
   * 자체를 다시 받지는 않는다).
   */
  const [downloadProceedConfirmed, setDownloadProceedConfirmed] = useState(false);

  /**
   * 작명이 끝났는가 — 이번 세션에 끝냈거나(`namingDoneThisSession`), 이전
   * 세션에 이미 끝낸 적이 있으면(`onboardingFlag.welcomeShown === true`)
   * 참이다.
   *
   * ★ **시드하지 않으면 재실행마다 작명 화면이 다시 뜬다.** 앱을 재시작하면
   * `namingDoneThisSession`이 `false`로 초기화되는데, `onboardingFlag.
   * welcomeShown`을 함께 보지 않으면 `firstRunStage`가 매번 `"naming"`으로
   * 되돌아간다 — `permissionStepsDecided`를 `flag.completed`로 시드한 것과
   * 같은 이유(FR-011, 위 주석 참조).
   */
  const namingDone = namingDoneThisSession || onboardingFlag?.welcomeShown === true;

  /**
   * 035의 게이트 함수(W1~W3 계약)를 여전히 부른다 — "언제 작명이 한 번이라도
   * 필요한가"의 1차 판정은 이 함수가 갖고 있다(원칙 III 경계는 035가 소유,
   * `checkWelcomeFile`이 이 모듈의 순수성을 지킨다).
   *
   * ★ 040 — **다만 어느 화면을 렌더할지는 이 값만으로 가르지 않는다** —
   * 아래 `firstRunStage`가 대신한다. `welcomeShown`이 `finishWelcome()`에서
   * 작명 직후 곧바로 `true`가 되므로(W9), `welcomeNeeded`만으로 렌더
   * 분기를 가르면 다운로드/liveness가 아직 안 끝났는데도 대기·확인
   * 화면을 건너뛰는 결함이 생긴다(아래 렌더 게이트 주석 참조) —
   * `firstRunStage`는 위에서 시드된 `namingDone`으로 판정하므로 이 문제가
   * 없다.
   */
  // 040: 렌더 분기는 firstRunStage가 대신하지만, 035의 shouldShowWelcome
  // (W1~W3 계약)을 여전히 호출해 App.tsx가 그 게이트를 우회하지 않았음을
  // 소스 검사(위 FR-005 테스트)로 확인할 수 있게 값을 남긴다.
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const welcomeNeeded =
    onboardingFlag !== null &&
    shouldShowWelcome({
      // 040 — 권한 스텝이 전부 결정돼야(에셋 준비와 무관) 여기로 넘어온다
      // (research.md #3).
      onboardingNeeded: !stepsDecided,
      essentialAssetsReady: essentialsReady ?? false,
      welcomeShown: onboardingFlag.welcomeShown === true,
    });

  /**
   * ★ 045 — 이 세션의 첫 실행 단계(동의 → 다운로드 → 작명 순서,
   * download-consent-gate.md C1~C4).
   *
   * `onboardingNeeded`는 **권한 결정만** 본다(`!permissionStepsDecided`) —
   * 029의 `essentialAssetsReady`를 포함하지 않는다(040 research.md #3과
   * 같은 판단, 위 `permissionStepsDecided` 주석 참조). `downloadConsented`는
   * `onboardingFlag`에서 직접 온다 — 040의 `namingDone`과 달리 세션 로컬
   * 상태로 따로 두지 않는다(동의는 다시 되돌릴 UI 자체가 없으므로, C5).
   */
  /**
   * ★ 048 실기기 — 정상 동작 확인은 **이번 세션에 작명을 거친 첫 실행에서만** 돈다.
   *
   * 작명을 이미 끝낸 사용자가 앱을 켜면 `livenessOutcome`이 세션 로컬이라 `null`로
   * 시작해, 045까지는 **재실행할 때마다** 모델을 적재하는 확인 화면을 지나야 홈에
   * 닿았다. 확인은 첫 만남 연출의 일부(035)이지 매 실행의 관문이 아니다.
   * `livenessOutcome` state를 `"ok"`로 덮어쓰지 않는다 — 판정 입력에서만 지나간
   * 것으로 보므로, 040의 첫 일기 자동 생성(`livenessOutcome === "ok"` state를 봄)도
   * 돌지 않는다.
   */
  const livenessPassed = livenessSkipped || !namingDoneThisSession;

  const firstRunStage =
    onboardingFlag !== null && essentialsReady !== null
      ? resolveFirstRunStage({
          onboardingNeeded: !stepsDecided,
          onboardingStarted,
          downloadConsented: onboardingFlag.downloadConsented,
          downloadReady: essentialsReady,
          // 이번 세션에 내려받지 않았으면(이미 모델이 있었다) 완료 화면을 지나간 것으로 본다.
          downloadProceedConfirmed: downloadProceedConfirmed || !essentialsMissingSeen,
          namingDone,
          // `livenessSkipped`(위 onSkipLiveness 주석)는 "확인됐다"가 아니라
          // "사용자가 [그냥 시작하기]로 확인을 건너뛰기로 했다"는 별개의
          // 사실이다 — 035 W11 계약이 이 우회 자체를 요구하므로 원칙 I
          // 위반이 아니다(확인 안 된 것을 확인됐다고 속이는 것과 다르다).
          livenessOutcome: livenessPassed ? "ok" : livenessOutcome,
        })
      : null;

  /** `resolveFirstRunStage`가 낸 단계를 035 `WelcomeScreen`의 `phase`로 옮긴다. */
  const welcomePhase: WelcomePhase =
    firstRunStage === "liveness"
      ? livenessOutcome === "failed"
        ? "failed"
        : "checking"
      : "welcome";

  /**
   * 정상 동작 확인을 **정확히 한 번** 돌린다 (035 L12).
   *
   * 자동 재시도 루프를 만들지 않는다 — 루프를 두면 "몇 번 만에 성공했나"가
   * 생기고 그것이 지표다(원칙 IV). 실패하면 사용자가 [다시 시도]를 눌러야 한다.
   *
   * **040 — 시작 조건이 바뀌었다**: 035 원본은 온보딩 직후 바로 돌았지만,
   * 040은 작명 완료 + 다운로드 완료 **이후**로 미룬다(`firstRunStage ===
   * "liveness"`이고 아직 실패로 확정되지 않았을 때만, research.md #3,
   * contracts G5).
   */
  const [retryToken, setRetryToken] = useState(0);
  const livenessShouldRun = firstRunStage === "liveness" && livenessOutcome !== "failed";

  useEffect(() => {
    if (!livenessShouldRun) return;
    let alive = true;

    async function check() {
      // 어댑터는 `createAppPipeline`에서만 온다(006 FR-026) — 직접 만들지 않는다.
      const wiring = createAppPipeline(environment);
      const probe = wiring.ok ? wiring.checkLiveness : undefined;

      // 데스크톱 경로거나 조립이 실패했으면 확인할 엔진이 없다 — 「살아 있다」고
      // 말할 근거가 없으므로 실패로 둔다(원칙 I).
      if (probe === undefined) return "failed" as const;

      return await probe(ONBOARDING_DEFAULT_CHARACTER);
    }

    void check()
      .then((outcome) => {
        if (alive) setLivenessOutcome(outcome);
      })
      .catch(() => {
        if (alive) setLivenessOutcome("failed");
      });

    return () => {
      alive = false;
    };
    // `retryToken`이 바뀌면 확인을 다시 돌린다(L12 — 자동 루프가 아니라
    // 사용자가 [다시 시도]를 누른 것이다).
  }, [livenessShouldRun, environment, retryToken]);

  /** 사용자가 [다시 시도]를 눌렀다. **연출 완료 플래그를 쓰지 않는다**(W9). */
  const retryLivenessCheck = useCallback(() => {
    setLivenessOutcome(null);
    setRetryToken((n) => n + 1);
  }, []);

  /**
   * ★ 040 US3 — liveness 통과 직후 그날 첫 일기를 자동 생성한다(FR-008·
   * FR-008a·FR-009).
   *
   * ───────────────────────────────────────────────────────────────────────────
   * `shouldAutoGenerate()`(순수 판정)가 `livenessOutcome === "ok" &&
   * dayWritable`을 확인하고, 참이면 `triggerFirstRunAutoDiary()`(조립 계층,
   * `pipeline.run()`을 직접 부르는 유일한 자리)를 1회 호출한다.
   *
   * **세션 스코프 `useRef`로 중복 호출을 막는다**(contracts G6) —
   * `firstRunStage`가 리렌더마다 다시 `"done"`으로 계산돼도 생성은 1회만
   * 시도된다. **이 플래그는 자동 트리거만 막는다** — 홈 화면의 기존 "일기
   * 쓰기" 버튼이 부르는 수동 `pipeline.run()` 경로(`DiaryHomeScreen`의
   * `generate()`)는 이 ref와 전혀 무관하다(FR-009 — 자동 생성이 실패·스킵돼도
   * 수동 경로는 항상 동작해야 한다).
   *
   * **트리거 결과를 화면에 노출하지 않는다**(research.md #5) — 성공하면
   * 일기가 저장돼 홈 화면에 보이고, 실패하면 조용히 아무 일도 없던 것처럼
   * 남는다(SC-004, 새 실패 배너를 만들지 않는다).
   * ───────────────────────────────────────────────────────────────────────────
   */
  /**
   * 040 — 자동 첫 일기 생성이 끝났음을 홈 화면에 알리는 토큰(SC-003).
   * 값이 바뀌면 `DiaryHomeScreen`이 새로 마운트되어 목록을 다시 읽는다.
   * 값 자체에 의미는 없다(횟수를 세는 지표가 아니다 — 원칙 IV).
   */
  const [autoGeneratedToken, setAutoGeneratedToken] = useState(0);

  const autoGenerateTried = useRef(false);
  useEffect(() => {
    if (firstRunStage !== "done") return;
    if (livenessOutcome !== "ok") return;
    if (autoGenerateTried.current) return;

    const now = new Date();
    const day = dayOf(now);
    if (!shouldAutoGenerate({ livenessOutcome, dayWritable: isDayWritable(day, now) })) return;

    autoGenerateTried.current = true;
    void triggerFirstRunAutoDiary(environment, {
      day,
      now,
      character: ONBOARDING_DEFAULT_CHARACTER,
      // 사진 신호 유무를 여기서 미리 구하지 않는다 — 최초 실행은 아직 홈
      // 화면에 진입한 적이 없어 photoDays 캐시가 없다. "quick"으로 고정해도
      // 안전하다 — 011 "VLM 안 열기": 사진이 실제로 0장이면 파이프라인이
      // 스스로 캡션 단계를 건너뛰고 "사진 없음"으로 정직하게 처리한다
      // (원칙 V, 과장 없음). vision 설정을 "auto"로 미리 조회해 맞추는
      // 대신 이 방식이 최초 실행 1회성 트리거를 단순하게 유지한다.
      vision: "quick",
    })
      // ★ 생성이 끝나면 홈 화면을 다시 마운트해 목록을 읽게 한다(SC-003).
      //   `DiaryHomeScreen`은 마운트·`AppState` 변화·자기가 돌린 생성에서만
      //   `refresh()`를 부르는데, 이 트리거는 그 셋 중 어디에도 해당하지
      //   않아 **파일에는 일기가 있는데 화면은 "아직 일기가 없다"로 남았다**
      //   (2026-09-11 실기기 관측). 성공·실패 어느 쪽이든 한 번 다시 읽으면
      //   되므로 `finally`에 둔다 — 실패 시에도 화면이 최신 목록을 보는 것이
      //   맞다(FR-009, 새 실패 UI를 만들지 않는다).
      .catch(() => {})
      .finally(() => setAutoGeneratedToken((n) => n + 1));
  }, [firstRunStage, livenessOutcome, environment]);

  /**
   * ★ 057 — 앱을 열 때의 자동 쓰기는 한 실행에 한 번이다 (FR-017·FR-020, research R5).
   *
   * 홈이 **실제로 시작하는 순간** 이것을 부른다. 거짓이면 시작하지 않는다 — 이번 실행에서 이미 시작했거나(그만두거나 실패해도
   * 다시 저절로 시작하지 않는다), 첫 실행 흐름의 자동 첫 일기(040)를 시도한 실행이다(첫 실행이 이긴다, Clarification Q3).
   * 첫 실행 흐름이 아직 끝나지 않았으면 홈(`DiarySection`)이 아예 그려지지 않으므로 그것은 따로 보지 않는다. ref는 렌더가
   * 아니라 이 콜백 안에서 읽는다.
   */
  const autoWriteClaimed = useRef(false);
  // 064 — 흉내가 켜진 실행에서는 앱 열기 자동 쓰기가 없다 — 흉내를 꺼도 같은 실행에서 저절로 시작하지 않게 한 번을 소모한다(AF3).
  useEffect(() => {
    if (writeBlocked) autoWriteClaimed.current = true;
  }, [writeBlocked]);
  const simulationLoaded = simulation.loaded;
  const claimAutoWrite = useCallback(() => {
    // 064 — 흉내 기록을 읽기 전에는 판정하지 않는다(소모하지도 않는다) — 읽은 뒤 이 콜백이 바뀌어 홈이 다시 판정한다.
    if (!simulationLoaded) return false;
    if (autoGenerateTried.current || autoWriteClaimed.current) return false;
    autoWriteClaimed.current = true;
    return !writeBlocked;
  }, [simulationLoaded, writeBlocked]);

  /**
   * ★ 058 — 일기 모두 지우기 (설정 「이 휴대폰」, research R1·R2·R11).
   *
   * 1. 요청 토큰(`wipeRequest`)을 올려 홈에 알린다. 홈은 쓰는 중이면 054 그만두기처럼 멈추고 **그 생성이 끝난 뒤에**
   *    `onWipeReady(token)`을 부른다 — 홈을 다시 마운트하는 것만으로는 생성이 멈추지 않아 지운 뒤에 저장된다.
   * 2. 응답이 오면 `wipeDiaries`가 쓰기 잠금을 쥔 채 일기·사진 사본·알림 확인 기록을 지운다. 잠금을 못 얻으면(백그라운드가 쓰는 중)
   *    아무것도 지우지 않고 `busy` — 설정이 한 줄로 알린다(FR-016a).
   * 3. `busy`가 아니면(지웠거나 일부 실패) 설정을 닫고, 고른 날을 오늘로 두고, 홈을 다시 마운트해 목록을 새로 읽힌다 — 일부
   *    실패여도 홈은 실제로 남은 일기를 보인다(FR-018).
   *
   * 기다리는 동안 홈이 다른 이유로 다시 마운트되면 응답이 오지 않는다 — 그 다른 이유(`autoGeneratedToken`)는 첫 실행 단계에서만
   * 오르고, 그동안은 설정에 닿을 수 없다(R1).
   */
  const [wipeRequest, setWipeRequest] = useState(0);
  const [diaryKey, setDiaryKey] = useState(0);
  const wipeWaiter = useRef<{ token: number; resolve: () => void } | null>(null);
  const onWipeReady = useCallback((token: number) => {
    const waiter = wipeWaiter.current;
    if (waiter === null || waiter.token !== token) return;
    wipeWaiter.current = null;
    waiter.resolve();
  }, []);
  const wipeTokenRef = useRef(0);
  /**
   * 059 — 쓰는 중인 홈을 먼저 멈춘다(058에서 뽑았다). 지우기·모듈 다시 받기·온보딩부터 다시가 함께 쓴다 — 셋 모두 홈을 곧 언마운트하거나 그 밑의
   * 파일을 건드리므로, 멈추지 않으면 생성이 뒤에서 이어져 저장되거나 잠금을 쥔 채 남는다. 쓰는 중이 아니면 곧바로 끝난다.
   */
  const stopHome = useCallback(async (): Promise<void> => {
    const token = ++wipeTokenRef.current;
    const ready = new Promise<void>((resolve) => {
      wipeWaiter.current = { token, resolve };
    });
    setWipeRequest(token);
    await ready;
  }, []);
  const requestWipe = useCallback(async (): Promise<WipeOutcome> => {
    await stopHome();
    const notifications = expoNotificationPort();
    const outcome = await wipeDiaries({
      store: fileStore(expoFileSystemPort("diary")),
      clearPhotoCopies,
      notifiedPort: expoNotifiedStorePort(),
      dismiss: (id) => notifications.dismiss(id),
      lockPort: expoLockPort(),
      nowMs: Date.now(),
    }).catch((error: unknown): WipeOutcome => ({ kind: "failed", reason: String(error) }));
    if (outcome.kind !== "busy") {
      goHome();
      setChosenDay(dayOf(new Date()));
      setDiaryKey((k) => k + 1);
    }
    return outcome;
  }, [goHome, stopHome]);

  /**
   * ★ 045 — 사용자가 동의 Dialog의 [확인/시작]을 눌렀다(FR-002a, C5).
   *
   * `downloadConsented: true`를 즉시 저장한다 — 되돌리는 코드 경로가
   * 없으므로(C5) 이후 재확인·재요청은 일어나지 않는다. 다운로드 자체는
   * 이 저장이 끝난 뒤 `onboardingFlag` 갱신을 본 `useEffect`(위)가
   * 트리거한다.
   */
  const onConfirmDownloadConsent = useCallback(() => {
    setOnboardingFlag((prev) => {
      if (prev === null || prev.downloadConsented === true) return prev;
      const next = { ...prev, downloadConsented: true };
      void saveOnboardingFlag(onboardingFlagPort, next).catch(() => {});
      return next;
    });
  }, [onboardingFlagPort]);

  /**
   * 작명 화면을 마쳤다(W9) — 이름 확정·건너뛰기·실패 후 건너뛰기 셋뿐이다.
   *
   * ★ 045 — `namingDone`도 함께 세운다. 이 시점엔 다운로드가 **이미 완료된
   * 상태다**(`firstRunStage`의 우선순위가 동의·다운로드를 작명보다 앞에
   * 두므로, C2) — 040 시절에는 다운로드가 아직 안 끝났을 수 있었지만 이
   * 스펙이 그 순서를 뒤집었다. `welcomeShown`을 영구 플래그로 미리 남겨도
   * 무방한 이유는 W9이 이미 "셋 다 사용자의 행동"이라 정의했기 때문이다
   * (작명을 다시 보여줄 필요가 없다, 이후는 liveness 확인이 이어받는다).
   */
  const finishWelcome = useCallback(
    (names?: CustomNames) => {
      if (names !== undefined) {
        setCustomNames(names);
        void saveCustomNames(characterNamesPort, names).catch(() => {});
      }
      setNamingDoneThisSession(true);
      setOnboardingFlag((prev) => {
        if (prev === null) return prev;
        const next = { ...prev, welcomeShown: true };
        void saveOnboardingFlag(onboardingFlagPort, next).catch(() => {});
        return next;
      });
    },
    [characterNamesPort, onboardingFlagPort],
  );

  /**
   * 사용자가 liveness 실패 화면에서 [그냥 시작하기]를 눌렀다.
   *
   * ★ 실기기에서 발견한 결함(2026-09-19, 045 검증 세션) — `WelcomeScreen`의
   * `onSkip`이 작명 단계(`welcome-name-skip`)와 실패 단계(`welcome-failed-
   * skip`) 양쪽에서 재사용되는데, `App.tsx`는 이 콜백을 `finishWelcome()`
   * 하나에만 연결하고 있었다. `finishWelcome()`은 `namingDone`만 세우고
   * `livenessOutcome`은 그대로 두므로, `resolveFirstRunStage`의 우선순위
   * (`!namingDone` 먼저, `livenessOutcome !== "ok"` 그다음)상 실패 화면에서
   * 이 버튼을 눌러도 `firstRunStage`가 여전히 `"liveness"`로 남아
   * **막다른 길**이 됐다(035 계약 W11 "막다른 길을 만들지 않는다" 위반).
   *
   * `livenessOutcome` state 자체를 `"ok"`로 덮어쓰지 않는다 — 실제로
   * 확인되지 않은 것을 확인됐다고 기록하면 원칙 I 위반이다. 대신
   * `livenessSkipped`(위에서 선언, 009·040 `namingDoneThisSession`과 같은
   * 세션 로컬 패턴)를 별도로 세워 `firstRunStage` 계산에서만 참조한다.
   */
  const onSkipLiveness = useCallback(() => {
    finishWelcome();
    setLivenessSkipped(true);
  }, [finishWelcome]);

  /**
   * 준비된 캐릭터의 이름을 바꾼다 (035 FR-022·FR-024·FR-025).
   *
   * **첫 만남과 같은 검증을 쓴다**(W18) — 두 자리에 각각 규칙을 두면 갈라진다.
   * **비우면 키를 제거해 기본 이름으로 되돌린다**(W19) — `{ quiet: "" }`를
   * 저장하면 파일에 뜻 없는 값이 남는다.
   *
   * **저장된 일기를 건드리지 않는다**(W20/N11) — 이 경로는 `DiaryStore`를
   * 부르지 않으며, 과거 일기의 `authorName`은 생성 시점 그대로 남는다.
   */
  const onRenameCharacter = useCallback(
    (character: Character, raw: string) => {
      setCustomNames((prev) => {
        const next: CustomNames = { ...prev };
        const validated = validateCharacterName(raw);

        if (validated.ok) {
          next[character] = validated.value;
        } else if (validated.reason === "empty") {
          // 비운 것은 「기본 이름으로 되돌린다」는 뜻이다(FR-025).
          delete next[character];
        } else {
          // too-long — 저장하지 않고 직전 값을 유지한다(FR-024).
          return prev;
        }

        void saveCustomNames(characterNamesPort, next).catch(() => {});
        return next;
      });
    },
    [characterNamesPort],
  );

  const onSubmitWelcomeName = useCallback(
    (raw: string) => {
      // 화면이 아니라 조립부가 검증한다 — 첫 만남과 설정 편집이 같은 규칙을
      // 쓰도록(W18) `validateCharacterName()` 하나를 공유한다.
      const validated = validateCharacterName(raw);
      finishWelcome(
        validated.ok
          ? { ...customNames, [ONBOARDING_DEFAULT_CHARACTER]: validated.value }
          : undefined,
      );
    },
    [customNames, finishWelcome],
  );

  /**
   * 055 — 쓰기 시작 전 「캐릭터를 먼저 준비해야 한다」 안내의 「모듈 다시 받기」(FR-030, research R9).
   *
   * 설정에서 캐릭터 준비가 사라졌으므로(S5) 그 길은 첫 실행의 다운로드 화면(045·046)이다. 필수 에셋을 다시 읽어 없으면
   * `essentialsReady=false` → `resolveFirstRunStage`가 `"downloading"`을 내 진행 화면이 뜬다(동의는 이미 저장돼 있다).
   *
   * ★ **다운로드 시작 ref와 완료 확인을 먼저 되돌린다.** 위 다운로드 effect는 `essentialDownloadStarted`로 세션당 한 번만
   * 돈다 — 이번 세션에 이미 받은 적이 있으면 ref가 참이라 진행 화면만 뜬 채 아무것도 받지 않는다(조용한 결함). 완료 화면도
   * 다시 보여야 하므로 `downloadProceedConfirmed`를 끈다. 이미 준비돼 있으면 `true` — 홈이 쓰기 전 화면으로 돌아간다.
   */
  const onRedownload = useCallback(async (): Promise<boolean> => {
    essentialDownloadStarted.current = false;
    setDownloadProceedConfirmed(false);
    try {
      const ready = essentialAssetsReady(await onboardingPorts.essentialAssets.readFacts());
      setEssentialsReady(ready);
      return ready;
    } catch {
      setEssentialsReady(false);
      return false;
    }
  }, [onboardingPorts, setEssentialsReady]);

  /**
   * ★ 059 — 개발자 화면의 「모듈 다시 받기」(보드 `6e` ①, research R3·R5·R6).
   *
   * 받을 것이 없으면(필수 모듈이 모두 준비됨) 대화상자 대신 토스트 한 줄 — 개발자 화면에 머문다. 있으면 확인 대화상자(모바일이 확인될 때만 용량).
   * **사실을 못 읽었으면 「다 있다」로 세지 않고 확인으로 간다**(`planRedownload`). 이 경로는 모듈 파일을 지우지 않는다(037) — 빠졌거나 잘린 것만
   * 받는 것은 `onRedownload`(055)와 다운로드 흐름의 일이다.
   */
  const [redownloadDialog, setRedownloadDialog] = useState<{ cellularSize: string | null } | null>(
    null,
  );
  const onRequestRedownload = useCallback(async () => {
    const plan = await planRedownload({
      readFacts: () => onboardingPorts.essentialAssets.readFacts(),
      readRemainingBytes: readEssentialRemainingBytes,
      readConnection,
    });
    if (plan.kind === "nothing") {
      toastLine.show(DEVELOPER_TEXT.allReady);
      return;
    }
    setRedownloadDialog({ cellularSize: plan.cellularSize });
  }, [onboardingPorts, toastLine]);
  const onCancelRedownload = useCallback(() => setRedownloadDialog(null), []);
  /**
   * 확정: 쓰는 중인 홈을 먼저 멈추고(`stopHome` — 필수 모듈이 빠져도 사진 없는 하루는 쓰기가 시작될 수 있다, R6) 055의 `onRedownload`(시작 표식·완료 확인을
   * 되돌린 뒤 필수 모듈을 다시 읽는다)를 부른 다음 겹을 닫는다. `essentialsReady`가 거짓이면 프레임이 다운로드 진행 화면으로 갈라진다.
   */
  const onConfirmRedownload = useCallback(async () => {
    setRedownloadDialog(null);
    await stopHome();
    await onRedownload();
    goHome();
  }, [stopHome, onRedownload, goHome]);

  /**
   * ★ 059 — 「온보딩부터 다시」(보드 `6e` ④, research R7). 일기·이름·설정·모듈은 건드리지 않고 첫 실행 흐름(로고 → 권한)만 다시 시작한다.
   * 게이트가 켜지면 프레임이 온보딩 화면으로 바뀌어 홈이 언마운트되므로 **먼저 쓰는 중인 홈을 멈춘다**(`stopHome`). 로고가 다시 나오도록 세션 상태 둘도
   * 되돌린다 — 안 그러면 로고 없이 권한 단계부터 뜨거나(`onboardingStarted`) 이번 세션에 이미 끝낸 것으로 보아 게이트가 안 열린다.
   */
  const onReplayOnboarding = useCallback(async () => {
    await stopHome();
    setForceOnboarding(true);
    setPermissionStepsDecidedThisSession(false);
    setOnboardingStarted(false);
    goHome();
  }, [stopHome, goHome]);

  /** 059 — 「개발자 메뉴 끄기」: 꺼지고 개발자 겹은 설정으로 돌아간다(개발 환경은 그 실행 동안만, 배포는 저장된 켜짐을 지운다) */
  const simulationClear = simulation.clear;
  const onDisableDeveloper = useCallback(() => {
    developer.disable();
    // 064 — 끄면 상태 흉내도 모두 꺼진다(보드 `6e` ⑤, AF2). 날짜 흉내가 있었으면 홈을 실제 오늘로 되돌린다.
    simulationClear();
    setChosenDay(dayOf(new Date()));
    setDiagnosing(false);
    setRoute("settings");
  }, [developer, simulationClear]);

  // 플래그·에셋 상태를 아직 읽지 못했으면 아무것도 그리지 않는다(짧다).
  if (onboardingFlag === null || essentialsReady === null) {
    return <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]} />;
  }

  /*
   * ★ 040 — `OnboardingScreen`(권한 스텝) 렌더 게이트는 **권한 결정만**
   * 본다 — 029의 `essentialAssetsReady`를 더 이상 포함하지 않는다
   * (research.md #3, `permissionStepsDecided` 주석 참조). `flag.completed
   * !== true`(한 번도 완료한 적 없음)이거나 `forceOnboarding`([온보딩
   * 다시 하기])이면 시작하되, `onAllStepsDecided`가 이 세션에서 이미
   * 불렸으면(=`permissionStepsDecided`) 에셋 준비와 무관하게 이 화면을
   * 떠난다.
   */
  // 059 R7 — 판정은 `onboarding-gate.ts`(순수)다. `force`가 켜지면 완료한 기기에서도 열린다.
  const gateNeeded = onboardingGateNeeded({
    completed: onboardingFlag.completed === true,
    force: forceOnboarding,
    decidedThisSession: permissionStepsDecidedThisSession,
  });

  /*
   * 로고는 온보딩이 필요하고 아직 이번 세션에서 스텝을 시작하지 않았을
   * 때만(FR-001, research.md #6, contracts G3). `shouldShowLogo`는
   * `onboardingGateNeeded`만 보고, "이미 시작했는가"는 `App.tsx`가 소유하는
   * 세션 로컬 상태로 가른다.
   */
  if (gateNeeded && shouldShowLogo(gateNeeded) && !onboardingStarted) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
        <LogoScreen onDone={() => setOnboardingStarted(true)} />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  if (gateNeeded) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
        <OnboardingScreen
          platform={platform}
          requirements={PERMISSION_REQUIREMENTS}
          flag={onboardingFlag}
          ports={onboardingPorts}
          onComplete={onOnboardingComplete}
          onAllStepsDecided={onAllPermissionStepsDecided}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  /*
   * ★ 045 — 진입 게이트의 세 번째 단: 온보딩(권한) → **동의 → 다운로드** →
   * 작명 → liveness 확인 → 홈. `firstRunStage`(=`resolveFirstRunStage`의
   * 결과)로 직접 가른다 — 040이 "작명이 다운로드보다 먼저 뜨는" 병렬
   * 배치를 썼던 자리에, 이 스펙은 순서를 되돌려 동의·다운로드가 항상
   * 먼저 온다(C2). `welcomeNeeded`(`shouldShowWelcome`)는 035의 게이트
   * 함수를 여전히 호출했음을 소스 검사로 확인할 수 있게 남긴 값일 뿐,
   * 렌더 분기는 전부 `firstRunStage`가 정한다.
   *
   * **029 FR-020 보호막이 더 이상 별도로 필요 없다** — 이전에는 "권한은
   * 끝났고 작명도 이미 봤는데 에셋이 사라졌다"는 특수 케이스를 여기서
   * 따로 잡았지만, 새 우선순위(C3)에서는 `downloadReady`가 `namingDone`
   * 보다 먼저 검사되므로 `namingDone` 값과 무관하게 `"downloading"`이
   * 자연히 반환된다 — 별도 분기 없이 이 우선순위 자체가 그 보호막이다.
   *
   * **이 자리 밖에서 `WelcomeScreen`을 그리지 않는다**(035 W5) — 설정
   * 탭에서 캐릭터를 새로 받아도 연출은 뜨지 않는다(040 FR-002a).
   */
  if (firstRunStage === "download-consent") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
        <DownloadConsentDialog onConfirm={onConfirmDownloadConsent} visible={true} />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  if (firstRunStage === "downloading") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
        <DownloadProgressScreen
          downloadReady={essentialsReady === true}
          // 다운로드가 이미 완료된 상태(essentialsReady: true)에서만 이
          // 완료 화면의 버튼이 보인다(FR-007). 누르면 세션 로컬 플래그를
          // 세워 firstRunStage가 다음 렌더에서 "naming"으로 넘어가게 한다
          // (구현 중 발견한 갭 — 이 플래그 없이는 essentialsReady가 true가
          // 되는 즉시 버튼을 누를 틈도 없이 화면이 사라진다).
          onProceed={() => setDownloadProceedConfirmed(true)}
          downloadFraction={downloadFraction}
          // 046 — 실패해도 막다른 길이 아니라 같은 레이아웃 위 안내
          // 문구만 바뀐다(FR-011). 재시도는 이 화면이 아니라 위
          // useEffect(DOWNLOAD_RETRY_INTERVAL_MS)가 자동으로 한다.
          failed={downloadFailed}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  if (firstRunStage === "naming" || firstRunStage === "liveness") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
        <WelcomeScreen
          characterName={displayNameOf(ONBOARDING_DEFAULT_CHARACTER, customNames)}
          onRetry={retryLivenessCheck}
          // `onSkip`은 `WelcomeScreen` 안에서 "naming"(이름 건너뛰기)과
          // "failed"(liveness 확인 건너뛰기) 두 자리에 재사용된다 — 실기기
          // 결함(위 onSkipLiveness 주석)이 이 둘을 구분하지 않고 있었다.
          onSkip={welcomePhase === "failed" ? onSkipLiveness : () => finishWelcome()}
          onSubmitName={onSubmitWelcomeName}
          phase={welcomePhase}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    // `edges`를 적어 둔다 — 기본값은 네 변 전부이며, 무엇을 피하는지가 코드에 보이는
    // 편이 낫다. 좌우는 세로 화면에서 0이지만 가로로 눕히면 노치가 파고든다.
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      {/*
        **048 — 전역 탭 줄이 없다**(설계 D1). 홈이 뿌리이고 설정·개발자는 그 위의 하위 화면이다. 새 내비게이션
        라이브러리 없이 상태 하나(`route`)로 가른다(006 관례, FR-008).

        055 — 홈은 늘 그려진다(`route` 삼항으로 바꿔 끼우지 않는다, contracts S1). 설정·개발자는 그 위에 겹쳐 오른쪽에서
        밀려 들어오는 겹(`StackLayer`)이다 — 그래서 설정에 다녀와도 쓰는 중·지면 스크롤·접힘이 그대로다.

        ★ 겹들을 안쪽 `View` 하나에 담는다 — 절대 배치는 부모의 **패딩을 무시**하므로 `SafeAreaView` 바로 아래에 두면
        겹이 상태 표시줄·내비게이션 바 밑까지 덮는다(2026-10-01 실기기). 안쪽 `View`는 인셋을 뺀 자리만 차지한다.
      */}
      <View style={styles.stack}>
        <DiarySection
          // ★ 040 — 자동 첫 일기 생성이 끝나면 다시 마운트해 목록을 읽게
          //   한다(SC-003, 위 `autoGeneratedToken` 주석 참조). 048 — 고른 날은 이 재마운트와
          //   설정 왕복에도 남도록 `AppFrame`이 들고 있다(Q4).
          // 058 — 일기를 모두 지운 뒤에도 다시 마운트한다(`diaryKey`).
          key={`diary-${autoGeneratedToken}-${diaryKey}`}
          onRedownload={onRedownload}
          onOpenSettings={openSettings}
          covered={homeCovered}
          // 020 → 051 — 알림을 눌러 열렸으면 그 하루를 홈의 고른 날로(FR-027). 적용하면 비운다.
          initialDay={pendingRoute?.day ?? null}
          onInitialDayApplied={() => setPendingRoute(null)}
          onAcknowledge={onAcknowledge}
          // 021 — 거부된 권한으로 제한되는 기능의 정직한 안내(FR-014).
          deniedNotices={deniedNotices}
          // 035 — 사용자가 지은 이름. 화면은 문자열만 받는다(FR-018).
          characterNames={customNames}
          chosenDay={chosenDay}
          onChooseDay={setChosenDay}
          // 057 — 앱을 열 때의 자동 쓰기. 설정 값을 아직 못 읽었으면 판정하지 않는다.
          autoDiarySettings={settingsValues?.autoDiary ?? null}
          claimAutoWrite={claimAutoWrite}
          onSkipped={onSkipped}
          skipPort={skipPort}
          // 058 — 일기 모두 지우기 요청. 홈이 멈춘 뒤 응답한다.
          wipeRequest={wipeRequest}
          onWipeReady={onWipeReady}
          // 060 — 진단 「지금 한 번 써 보기」가 홈에 올리는 쓰기 요청
          writeRequest={writeRequest}
          onWriteRequestHandled={onWriteRequestHandled}
          // 064 — 상태 흉내: 홈 표시(지금·미리보기·실패 토스트)와 쓰기 차단
          now={homeNow}
          homePreviewDay={homePreviewDay}
          writeBlocked={writeBlocked}
          onWriteBlocked={onWriteBlocked}
          simulation={writeBlocked ? { onOpenDeveloper: openDeveloper } : undefined}
          simulatedFailToast={simulation.state.failToast}
        />
        {/* 059 — 설정 겹은 개발자가 열린 동안에도 열려 있다(개발자가 그 위에 쌓인다, R8). 그동안 뒤로 가기는 등록하지 않는다. */}
        <StackLayer
          active={!renaming && route !== "developer"}
          onClose={goHome}
          onSettled={onSettingsSettled}
          open={route === "settings" || route === "developer"}
        >
          <SettingsFrame backLabel={SETTINGS_TEXT.back} onBack={goHome} title={SETTINGS_TEXT.title}>
            <SettingsSection
              backgroundPort={backgroundPort}
              characterName={displayNameOf(ONBOARDING_DEFAULT_CHARACTER, customNames)}
              geoPort={geoPort}
              onAutoDiaryChange={onAutoDiaryChange}
              onGeocodingChange={onGeocodingChange}
              onOpenRename={() => setRenaming(true)}
              onboardingPorts={onboardingPorts}
              settingsPort={settingsPort}
              skippedDay={skippedDay}
              values={settingsValues}
              requestWipe={requestWipe}
              versionText={versionText}
              developerEnabled={developer.enabled}
              onEnableDeveloper={developer.enable}
              onOpenDeveloper={openDeveloper}
              showToast={toastLine.show}
            />
          </SettingsFrame>
          {/*
          055 — 이름 바꾸기는 설정 위에 한 겹 더 쌓인다(Clarification). 열린 동안 설정 겹은 뒤로 가기를 등록하지 않는다
          (`active`) — 겹 사이에서도 등록 순서에 기대지 않는다(S6).
        */}
          <StackLayer onClose={closeRename} open={renaming}>
            <RenameScreen
              initialName={displayNameOf(ONBOARDING_DEFAULT_CHARACTER, customNames)}
              onClose={closeRename}
              onSave={(raw) => {
                onRenameCharacter(ONBOARDING_DEFAULT_CHARACTER, raw);
                closeRename();
              }}
            />
          </StackLayer>
        </StackLayer>
        {/*
          059 — 개발자 화면(보드 `6e` 개발 빌드·`6j` 배포 빌드). 켜져 있을 때만 열린다(`developer.enabled`). 진단 그룹은 `showsDiagnostics`일 때만
          그려진다(S7). 뒤로 가기는 설정으로 돌아간다 — 설정 겹은 아래에 그대로 열려 있다.
        */}
        <StackLayer
          active={!diagnosing}
          onClose={backToSettings}
          onSettled={onDeveloperSettled}
          open={developer.enabled && route === "developer"}
        >
          <SettingsFrame
            backLabel={SETTINGS_TEXT.backToSettings}
            backTestID="back-to-settings"
            onBack={backToSettings}
            title={DEVELOPER_TEXT.title}
            titleAside={buildLabelFor({ devEnvironment: showsDiagnostics, versionText })}
          >
            <DeveloperScreen
              modules={moduleLines}
              onDisable={onDisableDeveloper}
              onOpenDiagnostics={showsDiagnostics ? openDiagnostics : undefined}
              onRedownload={() => void onRequestRedownload()}
              onReplayOnboarding={() => void onReplayOnboarding()}
              showsDiagnostics={showsDiagnostics}
              simulation={
                showsDiagnostics
                  ? {
                      state: simulation.state,
                      onPressDate: () => setSimulationDateOpen(true),
                      onToggle: toggleSimulation,
                    }
                  : undefined
              }
            />
          </SettingsFrame>
        </StackLayer>
        {/* 059 — 진단은 개발 환경에서만, 개발자 겹 위에 한 겹 더(R8). 배포에서는 트리에 없다(S7). */}
        {showsDiagnostics && (
          <StackLayer onClose={closeDiagnostics} open={diagnosing}>
            <SettingsFrame
              backLabel={DEVELOPER_TEXT.diagBack}
              backTestID="back-to-developer"
              onBack={closeDiagnostics}
              title={DEVELOPER_TEXT.diag}
              titleAside={DEVELOPER_TEXT.diagTag}
            >
              {/* 060 — 값·핸들러는 조립 컴포넌트가 만든다. 035 — 프롬프트 미리보기의 호칭 줄에 사용자 지정 이름이 흐른다(FR-018). */}
              <DiagnosticsLayer
                buildLabel={buildLabelFor({ devEnvironment: showsDiagnostics, versionText })}
                characterNames={customNames}
                onTryOnce={onDiagnosticsTryOnce}
                writeBlocked={writeBlocked}
              />
            </SettingsFrame>
          </StackLayer>
        )}
        {/* 064 — 「오늘 날짜」 흉내 대화상자. 개발 환경에서만 트리에 있다(S7) */}
        {showsDiagnostics && (
          <SimulationDateDialog
            date={simulation.state.date}
            initialDay={dayOf(new Date())}
            onClose={() => setSimulationDateOpen(false)}
            onOff={() => setSimulationDate(null)}
            onPick={(day) => setSimulationDate(day)}
            open={simulationDateOpen}
          />
        )}
        {redownloadDialog !== null && (
          <RedownloadConfirmDialog
            cellularSize={redownloadDialog.cellularSize}
            onCancel={onCancelRedownload}
            onConfirm={() => void onConfirmRedownload()}
          />
        )}
        {toastLine.toast !== null && (
          <DeveloperToast
            // 060 — 진단에서 쓰기를 시작하면 홈의 하단 바(「그만두기」)를 가리지 않게 올린다
            bottom={toastBottom}
            key={toastLine.toast.key}
            onDismiss={toastLine.dismiss}
            text={toastLine.toast.text}
            {...(toastLine.toast.sub !== undefined ? { sub: toastLine.toast.sub } : {})}
          />
        )}
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

/**
 * 진단 프롬프트 미리보기가 쓰는 캐릭터 (060). 옛 `PROBE_CHARACTER`처럼 **목록 순서에 기대지 않고 식별자를 직접 적는다** — 캐릭터가
 * 늘 때 진단이 조용히 다른 캐릭터를 보이는 일이 없게 한다(037).
 */
const PREVIEW_CHARACTER: Character = "quiet";

/**
 * ★ 060 — 진단 겹의 값·핸들러를 만든다 (보드 `6h`). `DiagnosticsScreen`은 값과 핸들러만 받고 기기 통로·파이프라인을 모른다(DS8).
 *
 * 겹이 열릴 때(마운트) 한 번 읽는다 — 환경·사진 권한·신호·실패 기록. **화면을 열 때와 「다시 읽기」를 누를 때만 읽는다**(DS4): `AppState`·
 * 타이머로 읽지 않는다. 저장 점검은 행을 누를 때만 읽는다. 「지금 한 번 써 보기」는 홈의 쓰기 요청이다(`onTryOnce`, 진단이 파이프라인을
 * 돌리지 않는다). 「자동 쓰기 지금 실행」은 `runAutoDiaryTask({ manual: true })`다 — 시도 창·토글만 무시하고 재료·사진 권한 규칙은 그대로다.
 * 늦게 온 결과는 화면이 닫힌 뒤(언마운트)에는 버린다(DS11).
 */
function DiagnosticsLayer({
  buildLabel,
  characterNames,
  onTryOnce,
  writeBlocked,
}: {
  buildLabel: string;
  characterNames: CustomNames;
  onTryOnce: () => void;
  /** 064 — 상태 흉내가 켜져 있으면 두 쓰기 버튼을 누를 수 없다 */
  writeBlocked: boolean;
}) {
  const photoPort = useMemo(() => expoPhotoPort(), []);
  const diaryStore = useMemo(() => fileStore(expoFileSystemPort("diary")), []);
  const failurePort = useMemo(() => expoWriteFailurePort(), []);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const [report, setReport] = useState<DiagnosticReport | null>(null);
  useEffect(() => {
    void collectReport({ customNames: characterNames }).then((r) => {
      if (alive.current) setReport(r);
    });
  }, [characterNames]);

  const [photo, setPhoto] = useState<{
    permission: PermissionState | "unknown";
    location: PhotoLocationReading;
  } | null>(null);
  const [probe, setProbe] = useState<ProbeCell[] | null>(null);

  const readPhoto = useCallback(async () => {
    const permission = await photoPort.photoPermission().catch(() => "unknown" as const);
    const location = await photoLocationProbe(photoPort, Date.now());
    if (alive.current) setPhoto({ permission, location });
  }, [photoPort]);
  const readProbe = useCallback(async () => {
    const signals = await collectDaySignals(photoPort, dayOf(new Date()));
    if (alive.current) setProbe(probeCells(signals));
  }, [photoPort]);
  useEffect(() => {
    void readPhoto();
    void readProbe();
  }, [readPhoto, readProbe]);

  const onRequestPhoto = useCallback(() => {
    void photoPort
      .requestPhotoPermission()
      .catch(() => undefined)
      .then(() => Promise.all([readPhoto(), readProbe()]));
  }, [photoPort, readPhoto, readProbe]);

  const [inspection, setInspection] = useState<DiaryInspection | null>(null);
  const onInspectStorage = useCallback(() => {
    void inspectDiaries(diaryStore).then((result) => {
      if (alive.current) setInspection(result);
    });
  }, [diaryStore]);

  const [failures, setFailures] = useState<FailureLine[]>([]);
  const readFailures = useCallback(async () => {
    const items = await loadWriteFailures(failurePort);
    if (alive.current) setFailures(failureLines(items));
  }, [failurePort]);
  useEffect(() => {
    void readFailures();
  }, [readFailures]);

  const [autoRunning, setAutoRunning] = useState(false);
  const [autoResult, setAutoResult] = useState<AutoRunResult | null>(null);
  const onRunAuto = useCallback(() => {
    setAutoRunning(true);
    setAutoResult(null);
    void runAutoDiaryTask({ manual: true })
      .catch((): AutoRunResult => "failed")
      .then((result) => {
        if (!alive.current) return;
        setAutoResult(result);
        setAutoRunning(false);
        void readFailures();
      });
  }, [readFailures]);

  const photoLines: PhotoPermissionLines | null =
    photo === null ? null : photoPermissionLines(photo);

  return (
    <DiagnosticsScreen
      autoResult={autoResult}
      autoRunning={autoRunning}
      canRequestPhoto={photo !== null && canRequestPhoto(photo.permission)}
      environment={
        report === null
          ? null
          : environmentLines({
              buildLabel,
              androidRelease: Platform.OS === "android" ? String(Platform.constants.Release) : null,
              inference: report.inferenceLocation.ok
                ? { ok: true, location: report.inferenceLocation.location }
                : { ok: false },
            })
      }
      language={languageLine(languageResolution())}
      failures={failures}
      onInspectStorage={onInspectStorage}
      onRefreshProbe={() => void readProbe()}
      onRequestPhoto={onRequestPhoto}
      onRunAuto={onRunAuto}
      onTryOnce={onTryOnce}
      photo={photoLines}
      previews={report === null ? null : report.promptPreviews[PREVIEW_CHARACTER]}
      probe={probe}
      storage={storageValue(inspection)}
      writeBlocked={writeBlocked}
    />
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
  onRedownload,
  onOpenSettings,
  covered,
  initialDay,
  onInitialDayApplied,
  onAcknowledge,
  deniedNotices,
  characterNames,
  chosenDay,
  onChooseDay,
  autoDiarySettings,
  claimAutoWrite,
  onSkipped,
  skipPort,
  wipeRequest,
  onWipeReady,
  writeRequest,
  onWriteRequestHandled,
  now,
  homePreviewDay,
  writeBlocked,
  onWriteBlocked,
  simulation,
  simulatedFailToast,
}: {
  /** 064 — 홈의 「지금」(날짜 흉내가 있으면 그 날). 홈에만 간다 — 자동 쓰기 판정은 실제 시각을 쓴다(FR-015) */
  now?: () => Date;
  /** 064 — 흉내 미리보기. 있으면 **홈에만** 넘기고 자동 쓰기 판정은 실제 `wiring.previewDay`를 쓴다(AF4) */
  homePreviewDay?: (day: DayDate) => Promise<DayPreview>;
  /** 064 — 상태 흉내가 하나라도 켜져 있다 — 홈이 새 쓰기를 시작하지 않는다 */
  writeBlocked?: boolean;
  onWriteBlocked?: () => void;
  simulation?: { onOpenDeveloper: () => void };
  simulatedFailToast?: boolean;
  /** 060 — 진단 「지금 한 번 써 보기」가 올린 쓰기 요청. 홈이 시작하거나 거절하면 `onWriteRequestHandled`로 비운다 */
  writeRequest?: { id: number; day: DayDate } | null;
  onWriteRequestHandled?: (id: number) => void;
  /** 058 — 일기 모두 지우기 요청 토큰. 홈이 멈춘 뒤 `onWipeReady`로 응답한다 */
  wipeRequest?: number;
  onWipeReady?: (token: number) => void;
  /** 057 — 자동 쓰기 설정. `AppFrame`이 들고 있다. 아직 못 읽었으면 `null` — 앱 열기 판정을 하지 않는다 */
  autoDiarySettings?: AutoDiarySettings | null;
  /** 057 — 홈이 자동 쓰기를 실제로 시작하는 순간 부른다(한 실행에 한 번) */
  claimAutoWrite?: () => boolean;
  /** 057 — 앱 열기 판정이 사진 권한 때문에 건너뛰었다 — 설정의 보조 줄을 바로 갱신한다 */
  onSkipped?: (day: DayDate) => void;
  /** 057 — 사진 권한 건너뜀 기록 통로 */
  skipPort?: SkipStorePort;
  /** 048 — 고른 하루. `AppFrame`이 들고 있다(Q4) */
  chosenDay?: DayDate | null;
  onChooseDay?: (day: DayDate) => void;
  /** 029 → 055 — no-ready-character 실패 시 「모듈 다시 받기」(FR-030) */
  onRedownload?: () => Promise<boolean>;
  /** 055 — 홈 월 라벨 줄의 설정 버튼 */
  onOpenSettings?: () => void;
  /** 055 — 설정·개발자 겹이 덮여 있다 (FR-007) */
  covered?: boolean;
  /** 020 — 알림을 눌러 열렸으면 그 하루 (051 — 홈의 고른 날이 된다, FR-027) */
  initialDay?: DayDate | null;
  /** 051 — 홈이 알림의 날을 고른 날로 적용했다 → pendingRoute를 비운다 (research R6) */
  onInitialDayApplied?: () => void;
  /** 020 — 읽을 수 있는 일기가 보인 날의 알림을 확인 처리 (FR-007 (2), 051 FR-028·029) */
  onAcknowledge?: (day: DayDate) => void;
  /** 021 — 거부된 권한 안내 (FR-014). 부모가 계산 */
  deniedNotices?: readonly string[];
  /** 035 — 캐릭터 → 지금 부르는 이름. 조립부가 만든 문자열만 (FR-018) */
  characterNames?: CustomNames;
}) {
  /*
   * ★ 055 실기기 결함 — **환경 판정을 렌더마다 하지 않는다.** `currentEnvironment()`는 부를 때마다 새 객체를 주고,
   * `DiaryHomeScreen`은 `resolution`이 바뀌면 화면을 처음 상태로 되돌린다(목록을 다시 읽는 effect). 048까지는 쓰는 중에
   * 이 컴포넌트가 다시 그려질 일이 거의 없어 드러나지 않았는데, 055가 설정을 홈 위에 겹치자 설정을 여는 순간(`covered`·
   * 겹 마운트 상태가 바뀌어 다시 그려진다) **쓰는 중 화면이 안 쓴 날로 돌아가고 생성만 뒤에서 계속 돌았다**(2026-10-01,
   * SM-S901N — 저장은 됐지만 화면은 그것을 몰랐다). 파이프라인 조립(`wiring`)도 같은 값에 기대 매 렌더 새로 만들어졌다.
   */
  const [environment] = useState(() => currentEnvironment());

  // 화면이 다시 그려질 때마다 새로 만들지 않는다. 지연 import 하는 통로이므로
  // 여기서 만들어도 모듈이 즉시 해석되지 않는다.
  const store = useMemo(() => fileStore(expoFileSystemPort("diary")), []);
  // 060 — 쓰기 실패 기록(진단 「최근 실패」). 홈이 결과를 받아 부르고 기록 실패는 삼킨다.
  const failurePort = useMemo(() => expoWriteFailurePort(), []);
  const recordFailure = useCallback(
    (result: { ok: boolean; stage?: string; reason?: string }) =>
      void recordWriteFailure(failurePort, result, new Date()),
    [failurePort],
  );

  /** 저장된 선택. 아직 읽지 않았으면 null이며 그것은 「고른 적 없음」과 다르다 */
  const [stored, setStored] = useState<Character | null>(null);
  const [ready, setReady] = useState<Character[]>([]);

  const selectionPort = useMemo(() => expoSelectionPort(), []);

  /**
   * 029 — 설정 탭의 선호. 홈의 위젯이 사라졌으므로 여기서 읽어 자동 판정
   * (`resolveGenerationParams`)에 넘긴다. `AppState active`에서 다시 읽는다 —
   * 설정 탭에서 바꾸고 일기 탭으로 돌아오면 반영돼야 한다.
   *
   * **042 — 「사진 보기」가 빠졌다.** 고를 것이 없어졌으므로 읽을 설정도 없다.
   */
  const geocodingSettingPort = useMemo(() => expoGeocodingSettingPort(), []);
  const [geocodingPreference, setGeocodingPreference] = useState<GeocodingPreference>("auto");
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    let alive = true;
    async function readPrefs() {
      const g = await loadGeocodingSetting(geocodingSettingPort).catch(() => "auto" as const);
      let loc = false;
      try {
        const Location = await import("expo-location");
        const status = await Location.getForegroundPermissionsAsync();
        loc = status.granted === true;
      } catch {
        // 통로가 없는 환경 — 권한 없음으로 다룬다.
      }
      if (alive) {
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
  }, [geocodingSettingPort]);

  /**
   * 029 — 최근 3일 중 사진 신호가 1장 이상인 하루들 (FR-010, 임계값 없음).
   *
   * **049 — 화면은 지난 날 전부를 고르지만 이 탐색은 사흘 그대로다**(FR-020). 사흘 밖의 날은
   * 사진 유무를 모르므로 미리 준비를 하지 않는다(`canPrepare`, R5).
   *
   * 자동 판정("auto" → 사진 있으면 quick)의 입력이다. 3일치를 한 번 훑어 캐시하고
   * `AppState active`에서 다시 훑는다. 정밀 판정은 pipeline이 신호에서 다시 한다.
   */
  const [photoDays, setPhotoDays] = useState<ReadonlySet<string>>(new Set());

  /**
   * 053 — 「권한이 없어요 ›」가 부르는 통로. 021의 사진 권한 요청과 OS 설정 열기를 그대로 감싼다 — 새 통로가
   * 아니다. `expo-*`는 조립부(여기)에서만 만든다.
   */
  const photoAccessPort = useMemo(
    () => ({
      request: () => expoPhotoPort().requestPhotoPermission(),
      openSettings: () => expoOsSettingsPort().openAppSettings(),
    }),
    [],
  );
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
        geocodingPreference,
      }),
    [stored, ready, photoDays, locationPermission, geocodingPreference],
  );

  /**
   * ★ 057 — 목표 시각이 지난 뒤 앱을 열면 홈이 쓰는 중으로 시작한다 (보드 `6c` ③, FR-014~FR-022, research R5).
   *
   * 백그라운드와 **같은 판정**(`resolveAutoWrite` — 020 시도 창 · 사흘 중 안 쓴 날 · 사진 권한 · 053 재료)을 홈이 처음
   * 그려질 때와 앱이 앞으로 돌아올 때 한다. `AppState`는 「다시 판정할 때」의 신호일 뿐 입력이 아니다(FR-022, AGENTS). 쓸 날이
   * 나오면 홈에 넘기고, 홈이 054 제자리 쓰기로 시작한다(`runAutoDiaryTask`를 부르지 않는다 — 혼잣말·그만두기·토스트를 홈이
   * 그대로 갖는다). 사진 권한 건너뜀은 판정 안에서 기록되고 `AppFrame`의 보조 줄 상태도 바꾼다(FR-021).
   */
  const [autoWriteDay, setAutoWriteDay] = useState<DayDate | null>(null);
  const previewForAuto = wiring.ok ? wiring.previewDay : undefined;
  useEffect(() => {
    if (autoDiarySettings == null || previewForAuto === undefined || skipPort === undefined) return;
    let alive = true;
    const check = () =>
      void resolveAutoWrite({
        settings: autoDiarySettings,
        now: new Date(),
        listDiaryDays: () => store.listDays(),
        previewDay: previewForAuto,
        skipPort,
      })
        .then((decision) => {
          if (!alive) return;
          if (decision.kind === "write") setAutoWriteDay(decision.day);
          else if (decision.kind === "skip" && decision.because === "no-photo-access") {
            onSkipped?.(decision.day);
          }
        })
        .catch(() => {});
    check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [autoDiarySettings, previewForAuto, skipPort, store, onSkipped]);

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
      onRedownload={onRedownload}
      onOpenSettings={onOpenSettings}
      covered={covered}
      characterNames={characterNames}
      initialDay={initialDay}
      // 051 — 확인은 기록만 한다. 알림 경로는 적용 때 비운다(onInitialDayApplied).
      onAcknowledge={onAcknowledge}
      onInitialDayApplied={onInitialDayApplied}
      chosenDay={chosenDay}
      onChooseDay={onChooseDay}
      // ★ 049 R5 — 미리 준비(018)는 사진 유무를 훑은 날(사흘, `photoDays`와 같은 함수)에서만.
      //   사흘 밖의 날에 캐릭터 모델을 미리 열면 쓰기 때 VLM과 겹쳐 기기가 죽는다(FR-020a).
      canPrepare={(day) => selectableDays(new Date()).includes(day)}
      // 048 US3 — 신호 줄. 파이프라인과 같은 신호 통로에서 개수로 좁혀 온다.
      // 064 — 상태 흉내(재료 0·권한 없음)가 있으면 그 미리보기를 **홈에만** 넘긴다(AF4).
      previewDay={homePreviewDay ?? (wiring.ok ? wiring.previewDay : undefined)}
      // 053 — 권한 요청·설정 열기. 없으면 「권한이 없어요 ›」를 눌러도 아무 일도 없다.
      photoAccessPort={photoAccessPort}
      // 057 — 앱을 열 때의 자동 쓰기. 판정은 위에서 했고 홈은 그 날을 쓴다.
      autoWriteDay={autoWriteDay}
      claimAutoWrite={claimAutoWrite}
      // 058 — 홈이 늘 그려진다(조립이 실패해도 `DiaryHomeScreen`이 실패 화면을 그린다) — 요청은 언제나 홈이 받는다.
      wipeRequest={wipeRequest}
      onWipeReady={onWipeReady}
      // 060 — 진단의 쓰기 요청과 쓰기 실패 기록(홈은 통로를 모른다 — 조립부가 연결한다)
      writeRequest={writeRequest}
      onWriteRequestHandled={onWriteRequestHandled}
      recordFailure={recordFailure}
      // 064 — 상태 흉내
      {...(now !== undefined ? { now } : {})}
      writeBlocked={writeBlocked}
      onWriteBlocked={onWriteBlocked}
      simulation={simulation}
      simulatedFailToast={simulatedFailToast}
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

/**
 * 설정 화면을 조립한다 (055, 보드 `6c` — 이전 020·021·029의 `AutoDiarySection`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **화면은 판정하지 않는다** — `SettingsScreen`은 문자열·불리언·꼬리표만 받는다. 기기 통로(`expo-*`)는 여기서만 만든다.
 *
 * - 이름: 첫 실행이 정한 기본 캐릭터(로스터 하나, 037)의 지금 이름. 바꾸기는 위 겹(`RenameScreen`)에서 한다.
 * - 자동으로 쓰기: 020의 부수 효과 순서(S6)를 `settings-effects.ts`가 지킨다 — 토글 켬: 알림 권한 요청 → save → register,
 *   끔: save → unregister, 시각 변경: save → reschedule.
 * - 056 — 그 아래 「매일 쓰는 시각」(토글이 켜졌을 때만)과 「장소 이름으로 보기」 행. 누르면 대화상자(`6f`·`6l`)가 열리고 칸
 *   한 번에 적용된다(Clarification Q4). 값은 `AppFrame`이 들고 있고(FR-030) 이 조립은 바뀐 값을 올린다. 형식(12/24)·시간대는
 *   마운트 때 한 번 `readDeviceClock`으로 읽는다(겹이 닫히면 언마운트되므로 열 때마다 새로 읽힌다).
 * - 권한 네 행: `usePermissionTags`가 마운트·전경 복귀 때 읽고 `permissionTagFor`가 정한다. 누르면 앱 정보 화면(R7).
 * - 버전: 설치본의 versionName·versionCode(`expo-application`, R5).
 * - 058 이 휴대폰: 「쓰는 모듈」은 마운트 때 한 번 `readModuleBytes`(필수 모듈 바이트 합) → `formatModuleBytes`(1000 기준) 문자열,
 *   못 읽으면 `null`(값을 비운다). 「일기 모두 지우기」는 마운트 때 센 편수가 1 이상일 때만 누를 수 있고, 누르면 편수를 **다시 센다**
 *   (대화상자의 n은 여는 순간의 값, FR-010). 확정하면 `AppFrame`의 `requestWipe`가 멈춤·지우기·홈으로를 한다. 잠금에 막히면 행
 *   아래 한 줄(FR-016a). 지우는 동안 설정을 닫을 수 있다 — 끝난 뒤 언마운트된 화면은 건드리지 않는다.
 *
 * **걷은 것**(S5): 작성자 고르기(`AuthorPicker`), 캐릭터·사진 모델 받기(`CharacterListScreen`), 설명 카드형 권한 섹션과
 * 「온보딩 다시 하기」(`PermissionsSection`), 배터리 목록 인텐트 링크. 059가 그 파일들을 지웠고 대체 경로는 개발자 화면(「모듈 다시 받기」·
 * 「온보딩부터 다시」)이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function SettingsSection({
  onboardingPorts,
  characterName,
  onOpenRename,
  values,
  onAutoDiaryChange,
  onGeocodingChange,
  settingsPort,
  backgroundPort,
  geoPort,
  skippedDay,
  requestWipe,
  versionText,
  developerEnabled,
  onEnableDeveloper,
  onOpenDeveloper,
  showToast,
}: {
  /** 055 — 「1.0.0 (9)」. `AppFrame`이 한 번 읽어 든다(059 — 개발자 화면 머리글도 쓴다). 못 읽었으면 `null` */
  versionText: string | null;
  /** 059 — 개발자 메뉴가 켜져 있는가·켜기·열기·토스트 */
  developerEnabled: boolean;
  onEnableDeveloper: () => void;
  onOpenDeveloper: () => void;
  showToast: (text: string, sub?: string) => void;
  /** 058 — 일기 모두 지우기. `AppFrame`이 멈춤·지우기·홈으로를 맡는다 */
  requestWipe: () => Promise<WipeOutcome>;
  onboardingPorts: OnboardingPorts;
  /** 035 — 지금 부르는 이름 (`displayNameOf`) */
  characterName: string;
  onOpenRename: () => void;
  /** 056 — `AppFrame`이 들고 있는 설정 값. 아직 못 읽었으면 `null` */
  values: SettingsValues | null;
  onAutoDiaryChange: (next: AutoDiarySettings) => void;
  onGeocodingChange: (next: GeocodingPreference) => void;
  settingsPort: AutoDiarySettingsPort;
  backgroundPort: BackgroundSchedulePort;
  geoPort: GeocodingSettingPort;
  /** 057 — 사진 권한 때문에 건너뛴 가장 최근 날. `AppFrame`이 들고 있다 */
  skippedDay: DayDate | null;
}) {
  const notificationPort = useMemo(() => expoNotificationPort(), []);
  const [clock] = useState(() => readDeviceClock(new Date()));
  const [openDialog, setOpenDialog] = useState<"time" | "place" | null>(null);
  const closeDialog = useCallback(() => setOpenDialog(null), []);

  // S6 순서는 `settings-effects.ts`의 순수 조합 함수가 지킨다(기기 없이 검증).
  const effectDeps = useMemo(
    () => ({ settingsPort, backgroundPort, notificationPort }),
    [settingsPort, backgroundPort, notificationPort],
  );

  const autoDiary = values?.autoDiary ?? null;
  const geocoding = values?.geocoding ?? null;

  const onToggleEnabled = useCallback(
    async (enabled: boolean) => {
      if (autoDiary === null) return;
      // 056 FR-033 — 알림 거부 안내를 걷었다. 권한 묶음의 알림 행이 같은 사실을 말한다.
      const next = enabled
        ? (await applyToggleOn(autoDiary, effectDeps)).settings
        : await applyToggleOff(autoDiary, effectDeps);
      onAutoDiaryChange(next);
    },
    [autoDiary, effectDeps, onAutoDiaryChange],
  );

  /** 056 — 칸을 누르면 대화상자가 먼저 닫히고, 저장 → 다시 예약 뒤 반환값으로 갱신한다(저장 실패면 그대로, FR-016·FR-018). */
  const onSelectTargetHour = useCallback(
    async (hour: number) => {
      setOpenDialog(null);
      if (autoDiary === null) return;
      onAutoDiaryChange(await applyTargetHour(autoDiary, hour, effectDeps));
    },
    [autoDiary, effectDeps, onAutoDiaryChange],
  );

  /**
   * 056 — 장소 갈래. 대화상자를 닫고, 저장이 성공한 뒤에만 값을 바꾼다(FR-018). 「켬」으로 바뀌었을 때만 닫힌 직후 위치 권한을
   * 요청한다(017 L8·L9 — 거부돼도 값은 「켬」, 이미 허용이면 OS가 창을 띄우지 않는다, FR-025).
   */
  const onSelectGeocoding = useCallback(
    async (g: GeocodingPreference) => {
      setOpenDialog(null);
      const saved = await saveGeocodingSetting(geoPort, g).then(
        () => true,
        () => false,
      );
      if (!saved) return;
      onGeocodingChange(g);
      if (g === "on") {
        void import("expo-location")
          .then((Location) => Location.requestForegroundPermissionsAsync())
          .catch(() => {});
      }
    },
    [geoPort, onGeocodingChange],
  );

  /* ── 055 — 권한 꼬리표. 재료는 021의 통로 + 사진 한 장의 좌표 읽기(R6) ─── */
  // 좌표 읽기에는 021 온보딩 통로가 주지 않는 `photosBetween`·`locationOf`가 필요하다 — 004의 사진 통로를 쓴다.
  const photoPort = useMemo(() => expoPhotoPort(), []);
  const readPermissions = useCallback(async (): Promise<PermissionFacts> => {
    const unknown = () => "unknown" as const;
    const [photos, photoLocation, location, notifications] = await Promise.all([
      onboardingPorts.photo.photoPermission().catch(unknown),
      photoLocationProbe(photoPort, Date.now()),
      onboardingPorts.location.status().catch(unknown),
      onboardingPorts.notification.getPermission().catch(unknown),
    ]);
    return { photos, photoLocation, location, notifications };
  }, [onboardingPorts, photoPort]);
  const permissionTags = usePermissionTags(readPermissions);

  const onOpenAppSettings = useCallback(() => {
    void onboardingPorts.osSettings.openAppSettings().catch(() => {});
  }, [onboardingPorts]);

  /* ── 059 — 버전 7번 탭 → 개발자 메뉴. 판정은 `registerTap`(순수), 토스트는 `AppFrame`이 한 자리에서 그린다 ─── */
  const { onPressVersion, highlight: developerHighlight } = useDeveloperTaps({
    alreadyOn: developerEnabled,
    onEnable: onEnableDeveloper,
    showToast,
  });

  /* ── 058 — 이 휴대폰: 모듈 용량·일기 편수·지우기 ─── */
  const diaryStore = useMemo(() => fileStore(expoFileSystemPort("diary")), []);
  const [moduleSizeText, setModuleSizeText] = useState<string | null>(null);
  const [diaryCount, setDiaryCount] = useState<number | null>(null);
  const [wipeCount, setWipeCount] = useState<number | null>(null);
  const [wiping, setWiping] = useState(false);
  const [wipeBlocked, setWipeBlocked] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    void readModuleBytes(expoModelPorts().files)
      .then(formatModuleBytes)
      .catch(() => null)
      .then((text) => {
        if (alive.current) setModuleSizeText(text);
      });
    void diaryStore
      .listDays()
      .then((days) => days.length)
      .catch(() => null)
      .then((count) => {
        if (alive.current) setDiaryCount(count);
      });
    return () => {
      alive.current = false;
    };
  }, [diaryStore]);

  const onOpenWipe = useCallback(async () => {
    const count = await diaryStore
      .listDays()
      .then((days) => days.length)
      .catch(() => null);
    if (!alive.current) return;
    setDiaryCount(count);
    if (count !== null && count > 0) setWipeCount(count);
  }, [diaryStore]);

  const onConfirmWipe = useCallback(async () => {
    setWipeCount(null);
    setWiping(true);
    setWipeBlocked(false);
    const outcome = await requestWipe();
    if (!alive.current) return;
    setWiping(false);
    if (outcome.kind === "busy") setWipeBlocked(true);
  }, [requestWipe]);

  // FR-031 — 아직 한 번도 못 읽었을 때만(같은 실행에서 두 번째로 열면 `AppFrame`의 값이 있다).
  if (values === null || autoDiary === null || geocoding === null) {
    return (
      <View style={styles.placeholder}>
        <AppText variant="bodyStrong">{text().frame.settingsLoading}</AppText>
      </View>
    );
  }

  return (
    <>
      <SettingsScreen
        autoWriteEnabled={autoDiary.enabled}
        characterName={characterName}
        onOpenAppSettings={onOpenAppSettings}
        onOpenPlaceNames={() => setOpenDialog("place")}
        onOpenRename={onOpenRename}
        onOpenTargetHour={() => setOpenDialog("time")}
        onToggleAutoWrite={(enabled) => void onToggleEnabled(enabled)}
        permissionTags={permissionTags}
        placeNamesText={PLACE_NAME_TEXT[geocoding]}
        targetHourText={formatTargetHour(autoDiary.targetHour, clock.format)}
        versionText={versionText}
        onPressVersion={onPressVersion}
        developerEnabled={developerEnabled}
        developerHighlight={developerHighlight}
        onOpenDeveloper={onOpenDeveloper}
        // 057 SL3 — 기록이 있고 사진 꼬리표가 「허용 안 함」일 때만(읽지 못함·일부 허용·허용이면 그리지 않는다, FR-010).
        {...(skippedDay !== null && permissionTags.photos === "denied"
          ? { photoSkipText: skippedLineText(skippedDay, new Date()) }
          : {})}
        moduleSizeText={moduleSizeText}
        wipeEnabled={diaryCount !== null && diaryCount > 0 && !wiping}
        onOpenWipe={() => void onOpenWipe()}
        {...(wipeBlocked ? { wipeBlockedText: SETTINGS_TEXT.wipeBlocked } : {})}
      />
      {wipeCount !== null && (
        <WipeConfirmDialog
          count={wipeCount}
          onCancel={() => setWipeCount(null)}
          onConfirm={() => void onConfirmWipe()}
        />
      )}
      {openDialog === "time" && (
        <TargetHourDialog
          format={clock.format}
          hour={autoDiary.targetHour}
          onClose={closeDialog}
          onSelect={(hour) => void onSelectTargetHour(hour)}
          open
          timeZoneLine={timeZoneLine(clock.timeZoneId, clock.offsetMinutes)}
        />
      )}
      {openDialog === "place" && (
        <PlaceNameDialog
          onClose={closeDialog}
          onSelect={(g) => void onSelectGeocoding(g)}
          open
          value={geocoding}
        />
      )}
    </>
  );
}

/** 056 — 설정 화면의 값. `AppFrame`이 들고 있다(FR-030) */
type SettingsValues = { autoDiary: AutoDiarySettings; geocoding: GeocodingPreference };

/** 056 — 장소 갈래 → 행 값(보드 `place.auto`·`place.on`·`place.off`) */
const PLACE_NAME_TEXT: Record<GeocodingPreference, string> = {
  auto: SETTINGS_TEXT.placeAuto,
  on: SETTINGS_TEXT.placeOn,
  off: SETTINGS_TEXT.placeOff,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 032 — 앱 전체의 따뜻한 라이트 바탕. 개별 화면이 같은 색을 다시 칠해도 무해.
    backgroundColor: COLORS.bg,
  },
  /** 055 — 홈과 그 위의 겹들. 겹의 절대 배치 기준이 안전 영역 안쪽이 되게 한다 */
  stack: { flex: 1 },
  placeholder: {
    padding: 24,
    alignItems: "center",
  },
});
