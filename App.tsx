import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { currentEnvironment } from "./src/config/environment";
import { showsOnScreen } from "./src/diagnostics/sink";
import { CHARACTERS, type Character } from "./src/diary/types";
import { createAcquisition } from "./src/models/acquisition";
import { expoModelPorts } from "./src/models/expo-port";
import { readinessOf } from "./src/models/readiness";
import { assetFor } from "./src/models/roster";
import { pausedFor, readState, removeAsset, verdictFor } from "./src/models/storage";
import type { DownloadProgress, ModelReadiness } from "./src/models/types";
import { CharacterListScreen } from "./src/ui/CharacterListScreen";
import { DiagnosticsScreen } from "./src/ui/DiagnosticsScreen";

/**
 * 루트 컴포넌트(FR-002).
 *
 * 진단 화면은 local·dev에서만 보인다(FR-007a). prod에서 그 화면에 도달하는 경로가
 * 존재하지 않아야 한다(SC-013) — 그 판단을 sinksFor()에 위임한다.
 *
 * **003이 캐릭터 목록을 더한다.** 이것이 엔드유저가 보는 첫 화면이며, 진단과 달리
 * prod에서도 보인다 — 사용자가 캐릭터를 골라야 일기를 쓸 수 있기 때문이다.
 */
export default function App() {
  const environment = currentEnvironment();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {showsOnScreen(environment) && <DiagnosticsScreen />}
        <ModelSection />
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
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
  placeholder: {
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 16,
  },
});
