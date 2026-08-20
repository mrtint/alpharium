import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { createAppPipeline } from "./src/app/wiring";
import { currentEnvironment } from "./src/config/environment";
import { showsOnScreen } from "./src/diagnostics/sink";
import { expoFileSystemPort, fileStore } from "./src/diary/store";
import { CHARACTERS, type Character } from "./src/diary/types";
import { createAcquisition } from "./src/models/acquisition";
import { expoModelPorts } from "./src/models/expo-port";
import { readinessOf } from "./src/models/readiness";
import { assetFor } from "./src/models/roster";
import { pausedFor, readState, removeAsset, verdictFor } from "./src/models/storage";
import type { DownloadProgress, ModelReadiness } from "./src/models/types";
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
          <ModelSection />
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

  const [character, setCharacter] = useState<Character | null>(null);

  // 준비된 캐릭터 하나를 고른다. **고르는 화면은 아직 없다** — 003의 목록이 준비를
  // 맡고, 일기는 준비된 것 중 하나로 쓴다. 고르는 자리는 다음 기능의 몫이다.
  useEffect(() => {
    let alive = true;
    void readyCharacter().then((found) => {
      if (alive) setCharacter(found);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <DiaryHomeScreen
      resolution={environment}
      pipeline={wiring.ok ? wiring.pipeline : undefined}
      store={store}
      // 준비된 캐릭터가 없으면 파이프라인이 `model-not-ready`로 멈추고, 화면이
      // 「캐릭터를 먼저 준비해야 한다」로 옮긴다(FR-028).
      character={character ?? "quiet"}
      // 「캐릭터를 먼저 준비해야 한다」로 끝났을 때 갈 곳을 준다(FR-028).
      onGoToCharacters={onGoToCharacters}
    />
  );
}

/** 준비된 캐릭터 하나를 찾는다. 없으면 null */
async function readyCharacter(): Promise<Character | null> {
  const ports = expoModelPorts();
  try {
    const state = await readState(ports.metadata);
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
      if (readiness.kind === "ready") return character;
    }
    return null;
  } catch {
    // 기기 통로가 없는 환경(웹·시뮬레이터). 「없다」가 아니라 모르는 것이므로
    // 준비된 캐릭터를 지어내지 않는다.
    return null;
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
function ModelSection() {
  const [readiness, setReadiness] = useState<Readiness>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [ports] = useState(() => expoModelPorts());
  const [acquisition] = useState(() => createAcquisition(ports));

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

  const refresh = useCallback(async () => {
    setReadiness(await read());
  }, [read]);

  const onPrepare = useCallback(
    async (character: Character) => {
      await acquisition.prepare(character, setProgress);
      setProgress(null);
      await refresh();
    },
    [acquisition, refresh],
  );

  const onRemove = useCallback(
    async (character: Character) => {
      await removeAsset(ports.files, ports.metadata, assetFor(character).key);
      await refresh();
    },
    [ports, refresh],
  );

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
      progress={progress}
      onPrepare={(character) => void onPrepare(character)}
      onPause={() => void acquisition.pause()}
      onRemove={(character) => void onRemove(character)}
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
