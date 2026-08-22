import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { resolveSelection } from "./src/app/selection";
import { expoSelectionPort, loadSelection, saveSelection } from "./src/app/selection-store";
import {
  expoVisionSettingPort,
  loadVisionSetting,
  saveVisionSetting,
} from "./src/app/vision-setting-store";
import { createAppPipeline } from "./src/app/wiring";
import { currentEnvironment } from "./src/config/environment";
import { showsOnScreen } from "./src/diagnostics/sink";
import { expoFileSystemPort, fileStore } from "./src/diary/store";
import { CHARACTERS, type Character, type VisionSetting } from "./src/diary/types";
import { type Acquisition, createAcquisition } from "./src/models/acquisition";
import { resolveDownloadView } from "./src/models/download-view";
import { expoModelPorts } from "./src/models/expo-port";
import { readinessOf } from "./src/models/readiness";
import { assetFor } from "./src/models/roster";
import { pausedFor, readState, removeAsset, verdictFor } from "./src/models/storage";
import type { DownloadProgress, DownloadRejection, ModelReadiness } from "./src/models/types";
import {
  prepareVision,
  removeVision,
  visionReadiness,
  visionStorageBytes,
} from "./src/vision/acquisition";
import { CharacterListScreen } from "./src/ui/CharacterListScreen";
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
  const [tab, setTab] = useState<"diary" | "characters">("diary");

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
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [rejection, setRejection] = useState<DownloadRejection | null>(null);

  return (
    // `edges`를 적어 둔다 — 기본값은 네 변 전부이며, 무엇을 피하는지가 코드에 보이는
    // 편이 낫다. 좌우는 세로 화면에서 0이지만 가로로 눕히면 노치가 파고든다.
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      {/* 진단은 local·dev에서만. **사용자 경로는 세 환경 전부에서 돈다**(FR-024) */}
      {showsOnScreen(environment) && (
        <ScrollView style={styles.diagnostics}>
          <DiagnosticsScreen />
        </ScrollView>
      )}

      <View style={styles.tabs}>
        <Pressable accessibilityRole="button" onPress={() => setTab("diary")} style={styles.tab}>
          <Text style={tab === "diary" ? styles.tabOn : styles.tabOff}>일기</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTab("characters")}
          style={styles.tab}
        >
          <Text style={tab === "characters" ? styles.tabOn : styles.tabOff}>캐릭터</Text>
        </Pressable>
      </View>

      {tab === "diary" ? (
        <DiarySection onGoToCharacters={() => setTab("characters")} />
      ) : (
        // 003의 목록은 스스로 스크롤하지 않는다 — 다섯 자리가 화면을 넘길 수 있으므로
        // 여기서 감싼다.
        <ScrollView>
          <ModelSection
            ports={ports}
            acquisition={acquisition}
            progress={progress}
            setProgress={setProgress}
            rejection={rejection}
            setRejection={setRejection}
          />
        </ScrollView>
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
function DiarySection({ onGoToCharacters }: { onGoToCharacters?: () => void }) {
  const environment = currentEnvironment();

  // 화면이 다시 그려질 때마다 새로 만들지 않는다. 지연 import 하는 통로이므로
  // 여기서 만들어도 모듈이 즉시 해석되지 않는다.
  const store = useMemo(() => fileStore(expoFileSystemPort("diary")), []);
  const wiring = useMemo(() => createAppPipeline(environment, { store }), [environment, store]);

  /** 저장된 선택. 아직 읽지 않았으면 null이며 그것은 「고른 적 없음」과 다르다 */
  const [stored, setStored] = useState<Character | null>(null);
  const [ready, setReady] = useState<Character[]>([]);

  const selectionPort = useMemo(() => expoSelectionPort(), []);

  /**
   * 고른 사진 설정 (011 FR-015·017·018).
   *
   * **`null`이면 고른 적이 없다는 뜻이고, 그때 「보지 않음」을 쓴다**(FR-018).
   * 007이 캐릭터를 말없이 집지 않은 것과 같은 판단이다 — 사진을 보는 것은 시간과
   * 저장 공간을 쓰는 일이므로 고르지 않았는데 시작하지 않는다.
   */
  const [vision, setVision] = useState<VisionSetting | null>(null);
  const visionPort = useMemo(() => expoVisionSettingPort(), []);

  useEffect(() => {
    let alive = true;
    void loadVisionSetting(visionPort)
      .catch(() => null)
      .then((saved) => {
        if (alive) setVision(saved);
      });
    return () => {
      alive = false;
    };
  }, [visionPort]);

  /** 사용자가 고른다. **저장은 그 즉시** — 앱을 껐다 켜도 남는다(FR-017) */
  const onSelectVision = useCallback(
    async (chosen: VisionSetting) => {
      setVision(chosen);
      await saveVisionSetting(visionPort, chosen).catch(() => {
        // 저장하지 못해도 이번 실행 동안은 고른 대로 쓴다. 다음에 다시 고르면 된다.
      });
    },
    [visionPort],
  );

  /**
   * 저장된 선택과 준비 상태를 함께 읽는다 (007 FR-001·003).
   *
   * **판정은 여기서 하지 않는다** — 재료만 모아 `resolveSelection()`에 넘긴다.
   * 그래야 「옮김」 규칙 전체가 기기 없이 검증된다(research.md §7).
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
    void refreshSelection().then(({ found, saved }) => {
      if (!alive) return;
      setReady(found);
      setStored(saved);
    });
    return () => {
      alive = false;
    };
  }, [refreshSelection]);

  // **순수 함수가 판정한다.** 옮겨졌으면 `movedFrom`이 실려 화면이 알린다(FR-005a).
  const selection = resolveSelection(stored, ready);

  /** 사용자가 고른다. **저장은 그 즉시** — 앱을 껐다 켜도 남는다(FR-003) */
  const onSelect = useCallback(
    async (character: Character) => {
      setStored(character);
      await saveSelection(selectionPort, character).catch(() => {
        // 저장하지 못해도 이번 실행 동안은 고른 대로 쓴다. 다음에 다시 고르면 된다.
      });
    },
    [selectionPort],
  );

  return (
    <DiaryHomeScreen
      resolution={environment}
      pipeline={wiring.ok ? wiring.pipeline : undefined}
      store={store}
      // **★ 007이 잇는 끊긴 배선**(research.md §3). 006까지 이 줄이 없어 005의 끊김
      // 기능이 실기기에서 한 번도 돈 적이 없다 — 넘길 것이 없었기 때문이다.
      stop={wiring.stop}
      // 고른 것이 없으면 파이프라인이 `model-not-ready`로 멈추고, 화면이
      // 「캐릭터를 먼저 준비해야 한다」로 옮긴다(FR-006, 006 FR-028).
      selection={selection}
      characters={CHARACTERS.map((character) => ({
        character,
        ready: ready.includes(character),
      }))}
      onSelectCharacter={(character) => void onSelect(character)}
      // ★ 011 — **이 두 줄이 없으면 화면에서 골라도 언제나 「보지 않음」이 쓰인다.**
      // 007의 끊긴 `stop`, 009의 `day:` 한 줄과 같은 자리다.
      vision={vision ?? "none"}
      onSelectVision={(chosen) => void onSelectVision(chosen)}
      // 「캐릭터를 먼저 준비해야 한다」로 끝났을 때 갈 곳을 준다(FR-028).
      onGoToCharacters={onGoToCharacters}
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
  progress: DownloadProgress | null;
  setProgress: (progress: DownloadProgress | null) => void;
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
   * 탭에서 돌아왔을 때 받는 중인 것을 되찾는다 (008 FR-013).
   *
   * **`Acquisition`이 이제 탭보다 오래 살므로 물어볼 대상이 남아 있다.**
   *
   * ⚠️ **백분율은 되찾을 수 없다.** `Acquisition`은 마지막 진행률을 들고 있지 않고
   * 콜백으로 흘려보낼 뿐이다. 그래서 `fraction: null`로 시작하고 **다음 진행 콜백이
   * 오면 붙는다** — 「받는 중…」으로 보이며 **0%로 채우지 않는다**(원칙 V).
   */
  useEffect(() => {
    const running = acquisition.busyWith();
    if (running !== null && progress === null) {
      setProgress({ character: running, fraction: null });
    }
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
      const result = await acquisition.prepare(character, setProgress);

      // ★ 거부는 **받던 것을 건드리지 않는다**(FR-008). 진행률도 멈추기 버튼도 그대로
      //   남아야 사용자가 빠져나갈 수 있다(FR-009, 003 FR-020a).
      if (!result.ok && result.failure.kind === "busy") {
        setRejection({ requested: character, busyWith: result.failure.busyWith });
        return;
      }

      // 그 외(완료·멈춤·실패)는 **내 요청이 끝난 것이므로** 진행 표시를 거둔다(FR-012).
      // 거부 통지도 함께 비운다 — 받던 것이 끝났으면 「받는 중이라 거부했다」가
      // 더 이상 참이 아니다(FR-005). `resolveDownloadView()`도 같은 판정을 하므로
      // 이것은 **이중 방어**이지 유일한 방어가 아니다.
      setProgress(null);
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
      view={resolveDownloadView(progress, rejection)}
      onPrepare={(character) => void onPrepare(character)}
      onPause={() => void acquisition.pause()}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  diagnostics: { maxHeight: 260 },
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
});
