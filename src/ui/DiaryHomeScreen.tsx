/**
 * 사용자 경로의 화면 전환.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md, data-model.md §3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **네비게이션 라이브러리를 들이지 않는다**(research.md §5).
 *
 * 화면이 셋뿐이고(목록·상세·쓰는 중) 전이가 단순하다. `expo-router`나
 * `react-navigation`은 네이티브 의존을 더하고, **그러면 release 빌드에서 처음 도는 것을
 * 확인해야 할 표면이 넓어진다** — 이 기능의 가장 큰 미확인 영역이 바로 거기다.
 *
 * **판단은 `src/app/state.ts`가 하고 여기서는 그리기만 한다.** 그래야 전이 규칙이
 * 기기 없이 검증된다(SC-023) — 002가 `readinessOf`를, 005가 `acceptance`를 순수 함수로
 * 둔 것과 같은 구조다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  afterGeneration,
  initialScreen,
  toDetail,
  toList,
  toWriting,
  type AppScreen,
  type DiaryListItem,
} from "../app/state";
import { latestClosedDay } from "../config/day-boundary";
import type { EnvironmentResolution } from "../config/types";
import type { Pipeline } from "../diary/pipeline";
import type { DiaryStore } from "../diary/store";
import { listDiaries } from "../diary/store";
import type { Character, VisionSetting } from "../diary/types";
import { BuildErrorScreen } from "./BuildErrorScreen";
import { DiaryDetailScreen } from "./DiaryDetailScreen";
import { DiaryListScreen } from "./DiaryListScreen";

export type DiaryHomeScreenProps = {
  resolution: EnvironmentResolution;
  /** 조립이 실패했으면 없다 — 그때는 `build-error`로 간다(FR-035a) */
  pipeline?: Pipeline;
  store: DiaryStore;
  character: Character;
  vision?: VisionSetting;
  /** 생성을 끊는 통로(005 FR-014b). 앱이 앞을 벗어날 때 쓴다 */
  stop?: () => Promise<void>;
  /** "지금". 밖에서 받아야 경계값을 테스트할 수 있다(002 FR-018a) */
  now?: () => Date;
};

export function DiaryHomeScreen({
  resolution,
  pipeline,
  store,
  character,
  vision = "none",
  stop,
  now = () => new Date(),
}: DiaryHomeScreenProps) {
  const [screen, setScreen] = useState<AppScreen>(() => initialScreen(resolution, []));

  /** 지금 도는 생성이 있는가. `AppState` 구독이 본다 */
  const running = useRef(false);

  /** 목록을 다시 읽는다. 성공·실패 뒤 돌아올 때마다 부른다(FR-022) */
  const refresh = useCallback(async (): Promise<DiaryListItem[]> => {
    try {
      return await listDiaries(store);
    } catch {
      // 목록을 못 읽어도 화면이 무너지지 않는다. 빈 목록이 아니라 「없다」로 보인다.
      return [];
    }
  }, [store]);

  // 화면이 뜬 뒤 한 번 읽는다. 언마운트된 뒤에는 반영하지 않는다.
  useEffect(() => {
    let alive = true;
    void refresh().then((items) => {
      if (alive) setScreen(initialScreen(resolution, items));
    });
    return () => {
      alive = false;
    };
  }, [refresh, resolution]);

  /**
   * 앱이 앞을 벗어나면 끊는다 (005 FR-014b).
   *
   * **`stop()`이 생성을 거부시키지 않는다** — 끊김은 `interrupted: true`인 값으로
   * 돌아오고 판정이 거부한다. 여기서는 신호만 보낸다.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" && running.current) {
        void stop?.().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [stop]);

  const openItem = useCallback(
    async (item: DiaryListItem) => {
      // **읽지 못하면 빈 일기를 지어내지 않는다**(FR-017a). 판단은 state.ts가 한다.
      const entry = item.readable ? await store.load(item.day).catch(() => null) : null;
      setScreen(toDetail(item, entry));
    },
    [store],
  );

  const backToList = useCallback(async () => {
    setScreen(toList(await refresh()));
  }, [refresh]);

  /**
   * 일기를 쓴다.
   *
   * **★ 저장 상태를 보지 않는다**(S1, 원칙 I). 목록에 그 하루가 이미 있어도 **언제나
   * 실제 생성을 돈다** — 「이미 있으면 보여준다」는 지름길을 만들면 저장된 것이 생성을
   * 대신하고, 그 순간 헌법 원칙 I이 깨진다.
   */
  const write = useCallback(async () => {
    if (pipeline === undefined) return;

    setScreen(toWriting());
    running.current = true;

    try {
      const at = now();
      const result = await pipeline.run({
        // **오늘이 아니라 마지막으로 닫힌 하루다**(FR-030). 오늘은 정의상 닫히지 않았다.
        day: latestClosedDay(at),
        now: at,
        character,
        vision,
      });
      setScreen(afterGeneration(result));
    } finally {
      running.current = false;
    }
  }, [pipeline, character, vision, now]);

  switch (screen.kind) {
    case "build-error":
      return <BuildErrorScreen />;

    case "list":
      return (
        <DiaryListScreen
          items={screen.items}
          onOpen={(item) => void openItem(item)}
          onWrite={() => void write()}
        />
      );

    case "detail":
      return (
        <Frame onBack={() => void backToList()}>
          <DiaryDetailScreen entry={screen.entry} />
        </Frame>
      );

    case "unreadable":
      return (
        <Frame onBack={() => void backToList()}>
          <View style={styles.notice}>
            <Text style={styles.day}>{screen.day}</Text>
            {/* **「일기가 없다」와 다른 상태다**(S3, 원칙 V) */}
            <Text style={styles.noticeText}>이 날의 일기를 읽을 수 없다.</Text>
            <Text style={styles.hint}>파일이 손상됐다. 그 하루를 다시 쓸 수 있다.</Text>
          </View>
        </Frame>
      );

    case "writing":
      return (
        <View style={styles.center}>
          {/* **수치도 생성 중인 글도 없다**(S6, 원칙 IV). 돌고 있다는 사실 하나뿐이다 */}
          <Text style={styles.writing}>쓰고 있다</Text>
        </View>
      );

    case "written":
      return (
        <Frame onBack={() => void backToList()}>
          <DiaryDetailScreen entry={screen.entry} saved={screen.saved} />
        </Frame>
      );

    case "failed":
      return (
        <Frame onBack={() => void backToList()}>
          <View style={styles.notice}>
            {/* **거부된 글은 여기 없다**(S2) — 애초에 화면 상태에 담기지 않는다 */}
            <Text style={styles.noticeText}>{screen.message}</Text>
          </View>
        </Frame>
      );
  }
}

/** 뒤로 갈 수 있는 화면의 껍데기. 하드웨어 뒤로 가기는 목록에서만 앱을 닫는다 */
function Frame({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.frame}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Text>← 목록</Text>
      </Pressable>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  frame: { paddingTop: 12 },
  back: { paddingHorizontal: 20, paddingVertical: 8, alignSelf: "flex-start" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  writing: { fontSize: 16 },
  notice: { padding: 20, gap: 8 },
  day: { fontSize: 14, opacity: 0.6 },
  noticeText: { fontSize: 16, lineHeight: 24 },
  hint: { fontSize: 14, opacity: 0.7 },
});
