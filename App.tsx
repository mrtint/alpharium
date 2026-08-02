/**
 * 앱 진입 — 오늘 자리에 도달한다 (006 FR-501).
 *
 * US1의 세 자리(오늘·기록 목록·일기 상세)만 있다. 퍼소나 자리와 데이터 관리 자리는
 * US3·US5 범위다.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Today } from "./src/ui/screens/Today";
import { RecordList } from "./src/ui/screens/RecordList";
import { DiaryDetail } from "./src/ui/screens/DiaryDetail";
import {
  DEFAULT_PARAMS,
  createStores,
  ensurePersona,
  lazyReaders,
  localDateOf,
  selectEngine,
} from "./src/ui/app-wiring";
import type { Persona } from "./src/persona/persona";
import type { RecordBundle } from "./src/storage/bundle";
import type { AIEngine } from "./src/inference/engine";

type Route = { name: "today" } | { name: "list" } | { name: "detail"; date: string };

const stores = createStores();

export default function App() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [engine, setEngine] = useState<AIEngine | null>(null);
  const [route, setRoute] = useState<Route>({ name: "today" });
  const [bundles, setBundles] = useState<readonly RecordBundle[]>([]);
  // 소스를 실제로 읽을 때 권한을 묻는다 — 렌더마다 새로 만들지 않는다.
  const readers = useMemo(() => lazyReaders(), []);

  useEffect(() => {
    // 퍼소나가 없으면 앱이 부여한다 (001 FR-002).
    void ensurePersona(stores.personaStore).then(setPersona);
    // 어댑터 선택은 한 곳에서만 일어난다 (헌법 원칙 III).
    setEngine(selectEngine());
  }, []);

  const refresh = useCallback(async () => {
    setBundles(await stores.repository.listVisible());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (persona === null || engine === null) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const detail = route.name === "detail" ? bundles.find((b) => b.diary.date === route.date) : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.tabs}>
        <Tab label="오늘" active={route.name === "today"} onPress={() => setRoute({ name: "today" })} />
        <Tab
          label="기록"
          active={route.name !== "today"}
          onPress={() => {
            void refresh();
            setRoute({ name: "list" });
          }}
        />
      </View>

      {route.name === "today" && (
        <Today
          deps={{
            window: { date: localDateOf(new Date()), observedAt: new Date() },
            // 권한은 생성 요청 시점에 묻는다 (헌법 원칙 V).
            readers,
            buildParams: DEFAULT_PARAMS.buildParams,
            persona,
            engine,
            markers: DEFAULT_PARAMS.markers,
            promptParams: DEFAULT_PARAMS.promptParams,
            repository: stores.repository,
          }}
          onCompleted={() => void refresh()}
        />
      )}

      {route.name === "list" && (
        <RecordList bundles={bundles} onOpen={(date) => setRoute({ name: "detail", date })} />
      )}

      {route.name === "detail" && detail !== undefined && <DiaryDetail bundle={detail} />}
    </SafeAreaView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  tabActive: { backgroundColor: "rgba(99,102,241,0.15)" },
  tabLabel: { fontSize: 15, opacity: 0.6 },
  tabLabelActive: { opacity: 1, fontWeight: "700" },
});
