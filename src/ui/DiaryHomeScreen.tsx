/**
 * 사용자 경로의 화면 전환.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md, data-model.md §3
 *       specs/029-writing-flow-simplification/contracts/home-screen.md (H1~H7)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **네비게이션 라이브러리를 들이지 않는다**(research.md §5). 화면이 셋뿐이고 전이가
 * 단순하다.
 *
 * **판단은 `src/app/state.ts`가 하고 여기서는 그리기만 한다.**
 *
 * **★ 029 — 캐릭터·사진 설정·장소명 위젯이 사라졌다**(FR-001·006). "일기 쓰기"가
 * 눌리면 상위(`DiarySection`)가 준 `resolve(day)` 콜백이 배선 계층의 순수 함수
 * (`resolveGenerationParams`)를 불러 네 값을 정한다(FR-007) — 화면은 그 결과만 받아
 * `generate()`에 넘긴다. 날짜 셀렉트(009)와 정오 게이트 안내(012)는 유지한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  afterGeneration,
  cancelOverwrite,
  confirmOverwrite,
  initialScreen,
  startWriting,
  toDetail,
  toFailed,
  toList,
  writePromptFor,
  type AppScreen,
  type DiaryListItem,
} from "../app/state";
import type { ResolveOutcome, ResolvedParams } from "../app/resolve-generation";
import { dayOf, isDayWritable, type DayDate } from "../config/day-boundary";
import type { EnvironmentResolution } from "../config/types";
import { pickMonologue } from "../diary/monologue";
import { personaOf } from "../diary/persona";
import type { Pipeline } from "../diary/pipeline";
import type { DiaryStore } from "../diary/store";
import { listDiaries } from "../diary/store";
import type { Character, VisionSetting } from "../diary/types";
import type { VisionOutcome } from "../vision/types";
import { BuildErrorScreen } from "./BuildErrorScreen";
import { DiaryDetailScreen } from "./DiaryDetailScreen";
import { DiaryListScreen } from "./DiaryListScreen";
import { OverwriteConfirmScreen } from "./OverwriteConfirmScreen";

export type DiaryHomeScreenProps = {
  resolution: EnvironmentResolution;
  /** 조립이 실패했으면 없다 — 그때는 `build-error`로 간다(FR-035a) */
  pipeline?: Pipeline;
  store: DiaryStore;
  /**
   * ★ 029 — "일기 쓰기"가 눌린 하루에 대해 생성 파라미터를 정하는 콜백 (FR-007).
   *
   * **판정은 이 콜백 안(배선 계층의 `resolveGenerationParams`)에서 일어난다** — 화면은
   * 자기 `chosenDay`를 넘기고 결과만 받는다. 화면이 캐릭터·사진 설정·장소명을 정하지
   * 않는다(FR-006·FR-007 MUST NOT).
   */
  resolve: (day: DayDate) => ResolveOutcome;
  /**
   * 생성이 성공한 직후 실제로 쓴 캐릭터를 기록하는 콜백 (029 FR-008a).
   *
   * 옮겨졌으면 옮겨진 쪽(`params.character`). 실패 경로에서는 부르지 않는다(원칙 I).
   */
  onGenerated?: (character: Character) => void;
  /** 거부된 권한으로 제한되는 기능의 정직한 안내 (021 FR-014). 부모가 계산해 넘긴다 */
  deniedNotices?: readonly string[];
  /** 생성을 끊는 통로(005 FR-014b). 앱이 앞을 벗어날 때 쓴다 */
  stop?: () => Promise<void>;
  /**
   * 캐릭터·날짜가 정해지면 미리 준비를 시작하는 통로 (018). **읽을 사진이 없는 날에만**
   * 부른다 (FR-005). 옵셔널 — 배선이 끊겨도 "느릴 뿐" 정상 동작한다(FR-007).
   */
  prepare?: (character: Character) => Promise<void>;
  /** 준비해 둔 것을 놓아준다 (018, FR-008). */
  release?: () => Promise<void>;
  /** 사진만 미리 읽는 통로 (018 2단계, FR-006). */
  captionDay?: (
    day: DayDate,
    character: Character,
    vision: VisionSetting,
  ) => Promise<VisionOutcome>;
  /** "지금". 밖에서 받아야 경계값을 테스트할 수 있다(002 FR-018a) */
  now?: () => Date;
  /** 설정 탭으로 가는 길 (029 FR-014 — no-ready-character일 때). */
  onGoToSettings?: () => void;
  /** 알림을 눌러 열렸으면 그 하루 (020, FR-006·SC-004). */
  initialDay?: DayDate | null;
  /** 그 하루의 일기를 사용자가 확인했음을 기록한다 (020, FR-007 (2)). */
  onAcknowledge?: (day: DayDate) => void;
};

export function DiaryHomeScreen({
  resolution,
  pipeline,
  store,
  resolve,
  onGenerated,
  deniedNotices,
  stop,
  prepare,
  release,
  captionDay,
  now = () => new Date(),
  onGoToSettings,
  initialDay,
  onAcknowledge,
}: DiaryHomeScreenProps) {
  const [screen, setScreen] = useState<AppScreen>(() => initialScreen(resolution, []));

  /**
   * 사용자가 고른 하루 (009 FR-006). `null`이면 고른 적이 없다는 뜻이고 그때
   * 기본값(마지막으로 닫힌 하루)을 쓴다(FR-007).
   *
   * **파일에 남기지 않는다**(009 FR-010, H6) — 매 렌더 재판정.
   */
  const [chosenDay, setChosenDay] = useState<DayDate | null>(null);

  /** 방금 생성에서 캐릭터가 옮겨졌으면 그 안내 문구 (029 FR-014). */
  const [movedNotice, setMovedNotice] = useState<string | undefined>(undefined);

  /** 지금 도는 생성이 있는가. `AppState` 구독이 본다 */
  const running = useRef(false);

  /** 사용자가 그만두었는가 (007 FR-014a). */
  const cancelled = useRef(false);

  /** 덮어쓰기 확인을 통과하면 쓸 params (012 흐름). */
  const pendingParams = useRef<ResolvedParams | null>(null);

  /** 목록을 다시 읽는다. 성공·실패 뒤 돌아올 때마다 부른다(FR-022) */
  const refresh = useCallback(async (): Promise<DiaryListItem[]> => {
    try {
      return await listDiaries(store);
    } catch {
      return [];
    }
  }, [store]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const items = await refresh();
      const entry =
        initialDay != null && items.some((i) => i.day === initialDay && i.readable)
          ? await store.load(initialDay).catch(() => null)
          : null;
      if (!alive) return;
      const next = initialScreen(resolution, items, { initialDay, entry });
      setScreen(next);
      if (next.kind === "detail") onAcknowledge?.(next.day);
    })();
    return () => {
      alive = false;
    };
  }, [refresh, resolution, initialDay, store, onAcknowledge]);

  /**
   * 앱이 앞을 벗어나면 끊는다 (005 FR-014b) / 준비를 놓아준다 (018 FR-008).
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        if (running.current) {
          void stop?.().catch(() => {});
        } else {
          void release?.().catch(() => {});
        }
      }
    });
    return () => subscription.remove();
  }, [stop, release]);

  /**
   * 캐릭터·날짜가 정해지면 미리 준비를 시작한다 (018, FR-005).
   *
   * 029 — 목록 화면에 있을 때, 고른 하루에 사진 신호가 없으면 자동 판정 캐릭터로
   * 준비를 데운다. `resolve(day)`가 `no-ready-character`면 준비할 것이 없다.
   */
  useEffect(() => {
    if (screen.kind !== "list") return;
    if (captionDay !== undefined) return; // 사진 있는 날 경로(아래)가 담당

    const { day } = writePromptFor(screen.items, now(), chosenDay);
    const outcome = resolve(day);
    if (outcome.kind !== "resolved") return;
    if (outcome.params.vision !== "none") return;

    void prepare?.(outcome.params.character).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- screen.items는 매 렌더 새 배열이라 넣으면 무한 루프. day 판정 입력만 의존성으로.
  }, [screen.kind, chosenDay, prepare, resolve, now, captionDay]);

  /**
   * 사진이 있는 날의 미리 읽기 (018 2단계, FR-006).
   */
  const captionRef = useRef<{ day: DayDate; promise: Promise<VisionOutcome> } | null>(null);

  useEffect(() => {
    if (screen.kind !== "list") return;
    if (captionDay === undefined) return;

    const { day } = writePromptFor(screen.items, now(), chosenDay);
    const outcome = resolve(day);
    if (outcome.kind !== "resolved") return;
    if (outcome.params.vision === "none") return;
    if (captionRef.current?.day === day) return;

    const character = outcome.params.character;
    const vision = outcome.params.vision;
    const promise = captionDay(day, character, vision);
    captionRef.current = { day, promise };

    void promise
      .then(() => {
        if (captionRef.current?.day !== day) return;
        return prepare?.(character);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 위와 같은 이유.
  }, [screen.kind, chosenDay, captionDay, prepare, resolve, now]);

  const openItem = useCallback(
    async (item: DiaryListItem) => {
      const entry = item.readable ? await store.load(item.day).catch(() => null) : null;
      const next = toDetail(item, entry);
      setScreen(next);
      if (next.kind === "detail") onAcknowledge?.(next.day);
    },
    [store, onAcknowledge],
  );

  const backToList = useCallback(async () => {
    setScreen(toList(await refresh()));
  }, [refresh]);

  /**
   * 실제로 생성을 돌린다.
   *
   * **★ 저장 상태를 보지 않는다**(S1, 원칙 I). 목록에 그 하루가 이미 있어도 **언제나**
   * 실제 생성을 돈다.
   *
   * **029 — `params`는 상위가 `resolve(day)`로 정한 것.** `pipeline.run`에는
   * `character`·`vision`만 넘긴다(FR-013 — prompt.ts 불변). `geocodingEnabled`는
   * 배선(`createAppPipeline`)이 이미 파이프라인에 넣어 두었다.
   */
  const generate = useCallback(
    async (params: ResolvedParams) => {
      if (pipeline === undefined) return;

      setScreen({ kind: "writing" });
      running.current = true;
      cancelled.current = false;

      try {
        const at = now();

        let seen: VisionOutcome | undefined;
        if (captionRef.current?.day === params.day) {
          seen = await captionRef.current.promise.catch(() => undefined);
        }
        const seenVision = seen?.kind === "seen" ? seen.vision : undefined;

        const result = await pipeline.run(
          {
            day: params.day,
            now: at,
            character: params.character,
            vision: params.vision,
            ...(seenVision !== undefined ? { seen: seenVision } : {}),
          },
          (stage, branch) => {
            if (stage === "load" && branch === undefined) return;

            setScreen((s) => {
              if (s.kind !== "writing") return s;
              const characterName =
                stage === "load" ? personaOf(params.character).name : undefined;
              const line = pickMonologue(stage, branch, s.line, characterName);
              return { ...s, stage, branch, line };
            });
          },
        );

        if (cancelled.current) return;

        // 029 — 생성이 성공했으면 실제로 쓴 캐릭터를 기록한다(FR-008a). 옮겨졌으면
        // 옮겨진 쪽(params.character). 실패면 부르지 않는다(원칙 I).
        if (result.ok) onGenerated?.(params.character);

        setScreen(afterGeneration(result));
      } finally {
        running.current = false;
      }
    },
    [pipeline, now, onGenerated],
  );

  /**
   * 「일기 쓰기」를 누른다.
   *
   * **029 — 상위가 준 `resolve(day)`가 네 값을 정한다**(FR-007). `no-ready-character`
   * 면 생성하지 않고 설정 탭으로 안내한다(FR-014). `resolved`면 `movedFrom`을 안내로
   * 옮기고, 012의 덮어쓰기 확인을 거친 뒤 생성한다.
   */
  const write = useCallback(async () => {
    const items = screen.kind === "list" ? screen.items : [];
    const prompt = writePromptFor(items, now(), chosenDay);
    const outcome = resolve(prompt.day);

    if (outcome.kind === "no-ready-character") {
      setScreen(toFailed("일기 작성자를 준비해야 한다"));
      return;
    }

    // 029 — 캐릭터가 옮겨졌으면 화면에 알린다(FR-014). persona 이름으로 문장을 만든다.
    setMovedNotice(
      outcome.params.movedFrom !== undefined
        ? `${personaOf(outcome.params.movedFrom).name}을(를) 쓸 수 없어 ${
            personaOf(outcome.params.character).name
          }(으)로 바꿨다`
        : undefined,
    );

    const next = startWriting(prompt);
    if (next.kind === "confirm-overwrite") {
      setScreen(next);
      // 확인 후 생성할 때 쓸 params를 들고 있는다.
      pendingParams.current = { ...outcome.params, day: prompt.day };
      return;
    }

    await generate({ ...outcome.params, day: prompt.day });
  }, [screen, now, chosenDay, resolve, generate]);

  const cancel = useCallback(async () => {
    cancelled.current = true;
    await stop?.().catch(() => {});
    setScreen(toList(await refresh()));
  }, [stop, refresh]);

  useEffect(() => {
    if (screen.kind !== "writing") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      void cancel();
      return true;
    });
    return () => subscription.remove();
  }, [screen.kind, cancel]);

  switch (screen.kind) {
    case "build-error":
      return <BuildErrorScreen />;

    case "list":
      return (
        <DiaryListScreen
          items={screen.items}
          onOpen={(item) => void openItem(item)}
          onSelectDay={setChosenDay}
          onWrite={() => void write()}
          todayNotYetWritable={!isDayWritable(dayOf(now()), now())}
          movedNotice={movedNotice}
          deniedNotices={deniedNotices}
          write={writePromptFor(screen.items, now(), chosenDay)}
        />
      );

    case "detail":
      return (
        <Frame onBack={() => void backToList()}>
          <DiaryDetailScreen entry={screen.entry} />
        </Frame>
      );

    case "confirm-overwrite":
      return (
        <OverwriteConfirmScreen
          day={screen.day}
          onCancel={() => {
            void refresh().then((items) => setScreen(cancelOverwrite(items)));
          }}
          onConfirm={() => {
            setScreen(confirmOverwrite());
            if (pendingParams.current !== null) void generate(pendingParams.current);
          }}
        />
      );

    case "unreadable":
      return (
        <Frame onBack={() => void backToList()}>
          <View style={styles.notice}>
            <Text style={styles.day}>{screen.day}</Text>
            <Text style={styles.noticeText}>이 날의 일기를 읽을 수 없다.</Text>
            <Text style={styles.hint}>파일이 손상됐다. 그 하루를 다시 쓸 수 있다.</Text>
          </View>
        </Frame>
      );

    case "writing":
      return (
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel="쓰고 있다" size="large" />
          <Text style={styles.writing}>{screen.line ?? "쓰고 있다"}</Text>
          <Pressable accessibilityRole="button" onPress={() => void cancel()} style={styles.link}>
            <Text>그만두기</Text>
          </Pressable>
        </View>
      );

    case "written":
      return (
        <Frame onBack={() => void backToList()}>
          <DiaryDetailScreen
            entry={screen.entry}
            saved={screen.saved}
            overwrote={screen.overwrote}
          />
        </Frame>
      );

    case "failed":
      return (
        <Frame onBack={() => void backToList()}>
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{screen.message}</Text>

            {/* 029 — 작성자를 준비해야 하는 실패면 설정 탭으로 가는 길을 준다(FR-014). */}
            {onGoToSettings !== undefined && /준비/.test(screen.message) && (
              <Pressable accessibilityRole="button" onPress={onGoToSettings} style={styles.link}>
                <Text>설정에서 작성자 준비하기</Text>
              </Pressable>
            )}
          </View>
        </Frame>
      );
  }
}

/** 뒤로 갈 수 있는 화면의 껍데기. */
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
  notice: { padding: 20, gap: 12 },
  link: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  day: { fontSize: 14, opacity: 0.6 },
  noticeText: { fontSize: 16, lineHeight: 24 },
  hint: { fontSize: 14, opacity: 0.7 },
});
